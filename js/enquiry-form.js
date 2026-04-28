/* =============================================================================
 *  enquiry-form.js — Smart form rendering & submission
 *  ---------------------------------------------------------------------------
 *  Renders the enquiry form into a target element, adapts the field set to
 *  the form type, injects Cloudflare Turnstile, and POSTs submissions to the
 *  Worker endpoint.
 *
 *  Configuration is sourced from window.BUSINESS in data.js — the editor
 *  controls everything from the CMS without touching this file.
 *
 *  Form types:  kitten | stud | waitlist | general
 * ========================================================================= */

(function () {
  // -------------------------------------------------------------------------
  //  Config — fields that change between form types
  // -------------------------------------------------------------------------
  const FORM_TYPES = {
    kitten: {
      heading: "Enquire about a kitten",
      submitLabel: "Send kitten enquiry",
      messagePrompt: "Tell us a little about your home and what you're looking for in a kitten.",
      conditionalFields: `
        <div class="form-row form-row-half">
          <div class="form-field">
            <label for="ef-breed">Which breed?</label>
            <select id="ef-breed" name="breed">
              <option value="">No preference yet</option>
              <option value="Ragdoll">Ragdoll</option>
              <option value="Maine Coon">Maine Coon</option>
              <option value="British Shorthair">British Shorthair</option>
            </select>
          </div>
          <div class="form-field">
            <label for="ef-timeframe">When are you hoping to bring a kitten home?</label>
            <select id="ef-timeframe" name="timeframe">
              <option value="">Not sure yet</option>
              <option value="Asap">As soon as one is available</option>
              <option value="3-6 months">In the next 3–6 months</option>
              <option value="6-12 months">In the next 6–12 months</option>
              <option value="Just exploring">Just exploring for now</option>
            </select>
          </div>
        </div>
      `
    },
    stud: {
      heading: "Stud booking enquiry",
      submitLabel: "Send stud enquiry",
      messagePrompt: "Please tell us about your queen — her breed, lines, and health testing — and your preferred timeframe.",
      conditionalFields: `
        <div class="form-row form-row-half">
          <div class="form-field">
            <label for="ef-queenBreed">Your queen's breed <span class="required">*</span></label>
            <select id="ef-queenBreed" name="queenBreed" required>
              <option value="">Please select</option>
              <option value="Ragdoll">Ragdoll</option>
              <option value="Maine Coon">Maine Coon</option>
              <option value="Other">Other</option>
            </select>
          </div>
          <div class="form-field">
            <label for="ef-queenRegistration">Registration</label>
            <select id="ef-queenRegistration" name="queenRegistration">
              <option value="">Please select</option>
              <option value="GCCF">GCCF Registered</option>
              <option value="TICA">TICA Registered</option>
              <option value="Both">GCCF & TICA Dual</option>
              <option value="Non-registered">Non-registered</option>
            </select>
          </div>
        </div>
        <div class="form-field">
          <label class="checkbox-label">
            <input type="checkbox" name="healthTested" value="yes">
            <span>My queen is fully health tested (HCM/PKD as appropriate, FIV/FeLV negative)</span>
          </label>
        </div>
      `
    },
    waitlist: {
      heading: "Join our waitlist",
      submitLabel: "Join the waitlist",
      messagePrompt: "Tell us a bit about yourself and what you're hoping for. We'll be in touch when something matches.",
      conditionalFields: `
        <div class="form-field">
          <label for="ef-breed">Which breed are you most interested in?</label>
          <select id="ef-breed" name="breed">
            <option value="">No preference yet</option>
            <option value="Ragdoll">Ragdoll</option>
            <option value="Maine Coon">Maine Coon</option>
            <option value="British Shorthair">British Shorthair</option>
            <option value="Any">Open to any of the three</option>
          </select>
        </div>
      `
    },
    general: {
      heading: "Get in touch",
      submitLabel: "Send message",
      messagePrompt: "What can we help with? Don't worry about getting it perfect — we'll always reply personally.",
      conditionalFields: ""
    }
  };

  // -------------------------------------------------------------------------
  //  Public API — called from each page's bootstrap
  // -------------------------------------------------------------------------
  window.renderEnquiryForm = function (targetId) {
    const target = document.getElementById(targetId);
    if (!target) return;

    const type = (target.dataset.formType || 'general').toLowerCase();
    const config = FORM_TYPES[type] || FORM_TYPES.general;

    // Fetch the partial's HTML once and cache it
    fetch('partials/enquiry-form.html', { cache: 'no-cache' })
      .then(r => r.text())
      .then(html => {
        target.innerHTML = html;
        configureForm(target, type, config);
      })
      .catch(err => {
        console.error('Could not load enquiry form partial:', err);
        target.innerHTML = `<p class="form-error">Sorry — the enquiry form couldn't load. Please email us directly.</p>`;
      });
  };

  // -------------------------------------------------------------------------
  //  Configure the loaded form based on its type
  // -------------------------------------------------------------------------
  function configureForm(target, type, config) {
    const form = target.querySelector('form');
    if (!form) return;

    // Set the form type and page context (these go in the email subject + body)
    form.dataset.formType = type;
    form.querySelector('[name="formType"]').value = type;
    form.querySelector('[name="pageUrl"]').value = window.location.href;
    form.querySelector('[name="pageTitle"]').value = document.title;

    // Inject any conditional fields (breed selector, queen details, etc.)
    const conditionalSlot = form.querySelector('.form-conditional-fields');
    if (conditionalSlot) conditionalSlot.innerHTML = config.conditionalFields;

    // Update the submit button + message prompt
    const submitBtn = form.querySelector('.btn-label');
    if (submitBtn) submitBtn.textContent = config.submitLabel;
    const msgHint = form.querySelector('.msg-hint');
    if (msgHint) msgHint.textContent = config.messagePrompt;

    // Wire up the Turnstile widget. Site key lives in BUSINESS.turnstileSiteKey
    // — set in the CMS once you've created your Turnstile site.
    const turnstileEl = form.querySelector('.cf-turnstile');
    const siteKey = (typeof BUSINESS !== 'undefined') && BUSINESS.turnstileSiteKey;
    if (siteKey && turnstileEl) {
      turnstileEl.dataset.sitekey = siteKey;
      ensureTurnstileLoaded();
    } else if (turnstileEl) {
      // No site key configured — hide the placeholder rather than show an empty box.
      turnstileEl.style.display = 'none';
    }

    // Submission handling
    form.addEventListener('submit', (e) => handleSubmit(e, form));
  }

  // -------------------------------------------------------------------------
  //  Submission handler
  // -------------------------------------------------------------------------
  async function handleSubmit(e, form) {
    e.preventDefault();

    const status = form.querySelector('.form-status');
    const submitBtn = form.querySelector('button[type="submit"]');
    const endpoint = (typeof BUSINESS !== 'undefined') && BUSINESS.formEndpoint;

    if (!endpoint) {
      showStatus(status, 'error',
        "We're sorry — the form isn't configured yet. Please email us directly at " +
        ((typeof BUSINESS !== 'undefined' && BUSINESS.email) || 'hello@littlepawsbymiles.co.uk') + ".");
      return;
    }

    // Honeypot check — if filled, it's a bot. Fail silently so the bot
    // thinks it succeeded and doesn't retry.
    if (form.elements.website && form.elements.website.value) {
      showStatus(status, 'success', "Thanks — we'll be in touch.");
      form.reset();
      return;
    }

    // Build payload from form fields
    const formData = new FormData(form);
    const payload = {};
    for (const [key, value] of formData.entries()) {
      if (key === 'website') continue;  // never send honeypot to server
      payload[key] = value;
    }

    // Attach Turnstile token if present
    if (window.turnstile) {
      const token = formData.get('cf-turnstile-response');
      if (token) payload.turnstileToken = token;
    }

    // Disable the form during submission
    setLoading(submitBtn, true);
    status.textContent = '';
    status.className = 'form-status';

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await response.json().catch(() => ({}));

      if (response.ok) {
        showStatus(status, 'success',
          data.message ||
          "Thanks for getting in touch — your message has reached us. We'll reply personally when we can. (Just check your spam folder in case our reply lands there.)"
        );
        form.reset();
        if (window.turnstile) window.turnstile.reset();
      } else {
        showStatus(status, 'error',
          data.error ||
          "Sorry — something went wrong sending your message. Please try again, or email us directly."
        );
      }
    } catch (err) {
      console.error('Form submission failed:', err);
      showStatus(status, 'error',
        "Sorry — we couldn't send your message right now. Please check your internet connection and try again."
      );
    } finally {
      setLoading(submitBtn, false);
    }
  }

  // -------------------------------------------------------------------------
  //  Helpers
  // -------------------------------------------------------------------------
  function setLoading(btn, isLoading) {
    if (!btn) return;
    btn.disabled = isLoading;
    btn.classList.toggle('is-loading', isLoading);
  }

  function showStatus(el, type, msg) {
    if (!el) return;
    el.textContent = msg;
    el.className = `form-status form-status-${type}`;
    // Scroll the message into view on small screens
    el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  // Lazy-load the Turnstile script only on pages with a form
  let turnstileScriptInjected = false;
  function ensureTurnstileLoaded() {
    if (turnstileScriptInjected || window.turnstile) return;
    turnstileScriptInjected = true;
    const s = document.createElement('script');
    s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js';
    s.async = true;
    s.defer = true;
    document.head.appendChild(s);
  }
})();
