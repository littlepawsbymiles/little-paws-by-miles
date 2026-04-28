/**
 * ==========================================================================
 *  Little Paws By Miles — Form Handler Worker
 * --------------------------------------------------------------------------
 *  Receives enquiry form submissions from the website, validates them,
 *  protects against bots (Turnstile + honeypot), then:
 *
 *    1. Sends Julia an email via Resend API
 *    2. Writes a row to a Google Sheet via Google Apps Script Web App
 *    3. Returns a friendly response to the visitor
 *
 *  Free tier limits comfortably handle 100k+ submissions/month.
 *
 *  Required secrets (set via Cloudflare dashboard → Worker → Settings → Variables):
 *    RESEND_API_KEY         — from resend.com after signing up
 *    TURNSTILE_SECRET_KEY   — from Cloudflare → Turnstile → your site
 *    GOOGLE_SHEETS_WEBHOOK  — Google Apps Script URL (see SETUP_FORMS.md)
 *    NOTIFICATION_EMAIL     — where to send notifications (Julia's email)
 *    FROM_EMAIL             — sender address (e.g. forms@littlepawsbymiles.co.uk)
 *    ALLOWED_ORIGIN         — your site URL (for CORS, e.g. https://littlepawsbymiles.co.uk)
 * ========================================================================== */

export default {
  async fetch(request, env, ctx) {
    // -------------------------------------------------------------
    //  CORS — allow only the live site (and localhost for dev)
    // -------------------------------------------------------------
    const origin = request.headers.get('Origin') || '';
    const allowedOrigins = [
      env.ALLOWED_ORIGIN,
      'https://littlepawsbymiles.co.uk',
      'https://www.littlepawsbymiles.co.uk',
      'http://localhost:8765',
      'http://localhost:3000',
    ].filter(Boolean);
    const isAllowed = allowedOrigins.some(allowed => origin === allowed);
    const corsHeaders = {
      'Access-Control-Allow-Origin': isAllowed ? origin : allowedOrigins[0],
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400',
    };

    // Preflight (browsers send OPTIONS before POST when origins differ)
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    if (request.method !== 'POST') {
      return jsonResponse({ error: 'Method not allowed' }, 405, corsHeaders);
    }

    // -------------------------------------------------------------
    //  Parse JSON body (limit to 50 KB to prevent DoS)
    // -------------------------------------------------------------
    let payload;
    try {
      const text = await request.text();
      if (text.length > 50_000) {
        return jsonResponse({ error: 'Payload too large' }, 413, corsHeaders);
      }
      payload = JSON.parse(text);
    } catch {
      return jsonResponse({ error: 'Invalid request' }, 400, corsHeaders);
    }

    // -------------------------------------------------------------
    //  Validate required fields
    // -------------------------------------------------------------
    const errors = validatePayload(payload);
    if (errors.length) {
      return jsonResponse(
        { error: errors.join(' ') },
        400,
        corsHeaders
      );
    }

    // -------------------------------------------------------------
    //  Honeypot — if the hidden 'website' field has any value, it's a bot.
    //  Return a successful-looking response without doing anything.
    // -------------------------------------------------------------
    if (payload.website) {
      return jsonResponse(
        { message: "Thanks — we'll be in touch." },
        200,
        corsHeaders
      );
    }

    // -------------------------------------------------------------
    //  Verify Turnstile token (if configured)
    // -------------------------------------------------------------
    if (env.TURNSTILE_SECRET_KEY) {
      const isHuman = await verifyTurnstile(payload.turnstileToken, env.TURNSTILE_SECRET_KEY, request);
      if (!isHuman) {
        return jsonResponse(
          { error: "We couldn't verify your submission. Please refresh the page and try again." },
          403,
          corsHeaders
        );
      }
    }

    // -------------------------------------------------------------
    //  Send email and write to Sheet, in parallel for speed
    // -------------------------------------------------------------
    const sanitised = sanitisePayload(payload);
    const emailPromise = sendEmail(sanitised, env);
    const sheetPromise = writeToSheet(sanitised, env);

    // We email first, then sheet. If email fails, return error.
    // If sheet fails, log it but still return success — the submitter shouldn't
    // be blocked by a logging failure.
    const [emailResult, sheetResult] = await Promise.allSettled([
      emailPromise,
      sheetPromise,
    ]);

    if (emailResult.status === 'rejected') {
      console.error('Email send failed:', emailResult.reason);
      return jsonResponse(
        { error: "Sorry — we couldn't send your message. Please email us directly." },
        500,
        corsHeaders
      );
    }
    if (sheetResult.status === 'rejected') {
      // Don't block the visitor — but log it so we can fix it.
      console.error('Sheets write failed:', sheetResult.reason);
    }

    return jsonResponse(
      { message: "Thanks for getting in touch — your message has reached us. We'll reply personally when we can." },
      200,
      corsHeaders
    );
  },
};


// ============================================================================
//  Helpers
// ============================================================================

function jsonResponse(data, status, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...extraHeaders },
  });
}

function validatePayload(payload) {
  const errors = [];

  if (!payload || typeof payload !== 'object') {
    return ['Invalid request body.'];
  }

  // Required fields
  if (!payload.name || String(payload.name).trim().length < 2) {
    errors.push('Please tell us your name.');
  }
  if (!payload.email || !isValidEmail(payload.email)) {
    errors.push('Please provide a valid email address.');
  }
  if (!payload.message || String(payload.message).trim().length < 10) {
    errors.push('Please write a short message (at least 10 characters).');
  }

  // Reasonable lengths to stop abuse
  if (payload.name && String(payload.name).length > 100) errors.push('Name is too long.');
  if (payload.email && String(payload.email).length > 200) errors.push('Email is too long.');
  if (payload.message && String(payload.message).length > 2000) errors.push('Message is too long.');

  return errors;
}

function isValidEmail(s) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(s).trim());
}

function sanitisePayload(payload) {
  // Trim, normalise, and strip control characters from each field.
  const clean = {};
  for (const [k, v] of Object.entries(payload)) {
    if (k === 'turnstileToken' || k === 'website') continue;
    if (typeof v === 'string') {
      clean[k] = v.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '').trim().slice(0, 2500);
    } else {
      clean[k] = v;
    }
  }
  clean.submittedAt = new Date().toISOString();
  return clean;
}

async function verifyTurnstile(token, secret, request) {
  if (!token) return false;
  const ip = request.headers.get('CF-Connecting-IP') || '';
  const body = new URLSearchParams({
    secret,
    response: token,
    ...(ip ? { remoteip: ip } : {}),
  });

  try {
    const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      body,
    });
    const data = await res.json();
    return data.success === true;
  } catch (err) {
    console.error('Turnstile verify failed:', err);
    return false;
  }
}


// ============================================================================
//  Email via Resend
// ============================================================================

async function sendEmail(data, env) {
  const subject = buildSubject(data);
  const html = buildEmailHtml(data);
  const plain = buildEmailPlain(data);

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: env.FROM_EMAIL || 'forms@littlepawsbymiles.co.uk',
      to: env.NOTIFICATION_EMAIL,
      reply_to: data.email,
      subject,
      html,
      text: plain,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Resend API error: ${res.status} ${errText}`);
  }

  return res.json();
}

function buildSubject(data) {
  const typeLabels = {
    kitten: 'Kitten enquiry',
    stud: 'Stud booking enquiry',
    waitlist: 'Waitlist signup',
    general: 'Contact form',
  };
  const label = typeLabels[data.formType] || 'Website enquiry';
  return `${label} from ${data.name}`;
}

function buildEmailHtml(data) {
  // Build a styled HTML email — readable in any inbox, including Gmail mobile.
  const fields = collectDisplayFields(data);
  const rows = fields
    .map(([label, value]) => `
      <tr>
        <td style="padding:8px 12px; background:#F5EFE6; font-weight:600; vertical-align:top; width:35%; border-bottom:1px solid #E8DFCA;">${escapeHtml(label)}</td>
        <td style="padding:8px 12px; vertical-align:top; border-bottom:1px solid #E8DFCA;">${escapeHtml(value).replace(/\n/g, '<br>')}</td>
      </tr>
    `)
    .join('');

  return `
    <!DOCTYPE html>
    <html><body style="font-family: -apple-system, system-ui, sans-serif; color:#3A3633; max-width:600px; margin:0 auto; padding:24px;">
      <h2 style="font-family: Georgia, serif; color:#926440; margin-top:0;">New ${escapeHtml(buildSubject(data))}</h2>
      <p style="color:#7A7268;">Submitted ${new Date(data.submittedAt).toLocaleString('en-GB', { timeZone: 'Europe/London', dateStyle: 'long', timeStyle: 'short' })}</p>
      <table style="width:100%; border-collapse:collapse; margin-top:16px;">
        ${rows}
      </table>
      <p style="margin-top:24px; padding-top:16px; border-top:1px solid #E8DFCA; color:#7A7268; font-size:13px;">
        Reply to this email to respond directly to ${escapeHtml(data.name)}.
      </p>
    </body></html>
  `;
}

function buildEmailPlain(data) {
  const fields = collectDisplayFields(data);
  const lines = fields.map(([label, value]) => `${label}: ${value}`);
  return [
    `New ${buildSubject(data)}`,
    `Submitted: ${data.submittedAt}`,
    '',
    ...lines,
    '',
    `Reply to this email to respond to ${data.name}.`,
  ].join('\n');
}

// Build an ordered list of [label, value] pairs from the payload, skipping
// internal fields. Order matters for the email layout.
function collectDisplayFields(data) {
  const fields = [];
  const skip = ['website', 'turnstileToken', 'submittedAt', 'pageUrl', 'pageTitle'];

  // Always show these in this order, with friendly labels
  const order = [
    ['name', 'Name'],
    ['email', 'Email'],
    ['phone', 'Phone'],
    ['formType', 'Enquiry type'],
    ['breed', 'Breed of interest'],
    ['queenBreed', "Queen's breed"],
    ['queenRegistration', "Queen's registration"],
    ['healthTested', 'Queen health tested'],
    ['timeframe', 'Timeframe'],
    ['message', 'Message'],
  ];

  for (const [key, label] of order) {
    if (data[key]) fields.push([label, data[key]]);
  }

  // Append page context at the end
  if (data.pageUrl) fields.push(['Submitted from', data.pageUrl]);

  // Catch-all for any fields we didn't anticipate
  for (const [k, v] of Object.entries(data)) {
    if (skip.includes(k)) continue;
    if (order.some(([orderedKey]) => orderedKey === k)) continue;
    if (k === 'pageUrl' || k === 'pageTitle') continue;
    if (v) fields.push([k, String(v)]);
  }

  return fields;
}

function escapeHtml(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}


// ============================================================================
//  Google Sheets logging (via Apps Script Web App)
// ============================================================================

async function writeToSheet(data, env) {
  if (!env.GOOGLE_SHEETS_WEBHOOK) {
    // Sheets is optional — silently skip if not configured.
    return { skipped: true };
  }

  const res = await fetch(env.GOOGLE_SHEETS_WEBHOOK, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      submittedAt: data.submittedAt,
      formType: data.formType || '',
      name: data.name || '',
      email: data.email || '',
      phone: data.phone || '',
      breed: data.breed || data.queenBreed || '',
      queenRegistration: data.queenRegistration || '',
      healthTested: data.healthTested || '',
      timeframe: data.timeframe || '',
      message: data.message || '',
      pageUrl: data.pageUrl || '',
    }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(`Sheets webhook returned ${res.status}: ${errText}`);
  }

  return { ok: true };
}
