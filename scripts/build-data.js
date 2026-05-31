/**
 * build-data.js — rebuilds js/data.js from content/*.md on every deploy.
 *
 * Runs automatically on Cloudflare Pages (see the build command in the
 * dashboard: `node scripts/build-data.js`). Also runs locally with the
 * same command for previewing changes.
 *
 * This script is the single source of truth for the site's content shape —
 * if you add new fields in admin/config.yml, you usually also add them here.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const CONTENT = path.join(ROOT, 'content');
const OUT = path.join(ROOT, 'js', 'data.js');

// ---------- Tiny YAML-frontmatter parser ----------
// Handles what our admin/config.yml can produce: strings, numbers, booleans,
// arrays of strings, and multiline strings. Good enough — no dependency needed.
function parseFrontmatter(raw) {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!match) return { data: {}, body: raw };
  const [, yaml, body] = match;

  const data = {};
  const lines = yaml.split(/\r?\n/);
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim() || line.trim().startsWith('#')) { i++; continue; }
    const kvMatch = line.match(/^([A-Za-z0-9_]+):\s*(.*)$/);
    if (!kvMatch) { i++; continue; }
    const key = kvMatch[1];
    let value = kvMatch[2];

    // Array on following lines: empty value + indented "- " items
    if (value === '') {
      const arr = [];
      while (i + 1 < lines.length && /^\s+-\s+/.test(lines[i + 1])) {
        i++;
        const itemRaw = lines[i].replace(/^\s+-\s+/, '');
        arr.push(parseScalar(itemRaw));
      }
      data[key] = arr;
    } else if (value === '[]') {
      data[key] = [];
    } else {
      data[key] = parseScalar(value);
    }
    i++;
  }
  return { data, body: (body || '').trim() };
}

function parseScalar(raw) {
  const v = raw.trim();
  if (v === 'true') return true;
  if (v === 'false') return false;
  if (v === 'null' || v === '~' || v === '') return '';
  if (/^-?\d+$/.test(v)) return parseInt(v, 10);
  if (/^-?\d+\.\d+$/.test(v)) return parseFloat(v);
  // Double-quoted with escape sequences
  if (v.startsWith('"') && v.endsWith('"')) {
    return v.slice(1, -1)
      .replace(/\\n/g, '\n')
      .replace(/\\"/g, '"')
      .replace(/\\\\/g, '\\');
  }
  // Single-quoted
  if (v.startsWith("'") && v.endsWith("'")) {
    return v.slice(1, -1).replace(/''/g, "'");
  }
  return v;
}

function readCollection(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir)
    .filter(f => f.endsWith('.md'))
    .map(f => {
      const raw = fs.readFileSync(path.join(dir, f), 'utf8');
      const { data, body } = parseFrontmatter(raw);
      return { _file: f, ...data, _body: body };
    })
    .sort((a, b) => (a.order ?? 999) - (b.order ?? 999));
}

// ---------- Load content ----------
console.log('Building js/data.js from content/…');

// Make image paths root-relative so they resolve correctly from any
// page depth. The pre-rendered subfolder pages (e.g. /cats/bella.html
// or /litters/dotties-litter-may.html) and the runtime JS hydration
// both use these paths verbatim, so they need to start with `/` or be
// absolute URLs. Anything that's already absolute (http://, https://)
// or already root-relative is left alone.
function rootRel(p) {
  if (!p || typeof p !== 'string') return p;
  if (/^(https?:)?\/\//.test(p)) return p;
  if (p.startsWith('/')) return p;
  return '/' + p;
}
function rootRelArray(arr) {
  return Array.isArray(arr) ? arr.map(rootRel) : arr;
}

const cats = readCollection(path.join(CONTENT, 'cats')).map(c => ({
  id: c.id || c._file.replace(/\.md$/, ''),
  name: c.name || '',
  registeredName: c.registeredName || '',
  breed: c.breed || '',
  role: c.role || 'Queen',
  colour: c.colour || '',
  registration: c.registration || '',
  dob: c.dob || '',
  studRegisterUrl: c.studRegisterUrl || '',
  tagline: c.tagline || '',
  personality: c._body || '',
  siblings: Array.isArray(c.siblings) ? c.siblings : [],
  // Optional explicit card image. Falls back to photos[0] in the renderer.
  cardImage: rootRel(c.cardImage || ''),
  photos: rootRelArray(Array.isArray(c.photos) ? c.photos : [])
}));

const kittens = readCollection(path.join(CONTENT, 'kittens'))
  // active: false hides a kitten file (e.g. the _template.md) from the site
  .filter(k => k.active !== false)
  .map(k => ({
    id: k.id || k._file.replace(/\.md$/, ''),
    name: k.name || '',
    breed: k.breed || '',
    sex: k.sex || '',
    colour: k.colour || '',
    dob: k.dob || '',
    availableFrom: k.availableFrom || '',
    price: k.price || '',
    status: k.status || 'Available',
    dam: k.dam || '',
    sireId: k.sireId || '',
    sireName: k.sireName || '',
    litterId: k.litterId || '',
    // Optional explicit card image. Falls back to photos[0] in the renderer.
    cardImage: rootRel(k.cardImage || ''),
    // photos: array preferred. Falls back to legacy single `photo` field.
    photos: rootRelArray(
      Array.isArray(k.photos) && k.photos.length
        ? k.photos
        : (k.photo ? [k.photo] : [])
    ),
    notes: k._body || ''
  }));

const litters = readCollection(path.join(CONTENT, 'litters')).map(l => ({
  id: l.id || l._file.replace(/\.md$/, ''),
  status: l.status || 'Upcoming',
  title: l.title || '',
  breed: l.breed || '',
  dam: l.dam || '',
  sire: l.sire || '',
  sireName: l.sireName || '',
  dateLabel: l.dateLabel || '',
  kittenCount: l.kittenCount || '',
  summary: l.summary || '',
  // thumbnail = small image used on the litters list cards.
  // coverImage = larger hero image at the top of the detail page.
  // If coverImage is omitted the detail page falls back to thumbnail.
  thumbnail: rootRel(l.thumbnail || ''),
  coverImage: rootRel(l.coverImage || ''),
  // Optional gallery for the per-litter detail page (litter.html?id=...)
  photos: rootRelArray(Array.isArray(l.photos) ? l.photos : []),
  body: l._body || ''
}));

const testimonials = readCollection(path.join(CONTENT, 'testimonials')).map(t => ({
  name: t.name || '',
  role: t.role || '',
  breed: t.breed || '',
  rating: typeof t.rating === 'number' ? t.rating : 5,
  relatedCat: t.relatedCat || '',
  testimonialTitle: t.testimonialTitle || '',
  comment: t._body || ''
}));

// Settings
let BUSINESS = {};
let FORMS = {};
let ABOUT = {};
const businessPath = path.join(CONTENT, 'settings', 'business.md');
const formsPath = path.join(CONTENT, 'settings', 'forms.md');
const aboutPath = path.join(CONTENT, 'settings', 'about.md');
if (fs.existsSync(businessPath)) {
  const { data } = parseFrontmatter(fs.readFileSync(businessPath, 'utf8'));
  BUSINESS = data;
}
if (fs.existsSync(formsPath)) {
  const { data } = parseFrontmatter(fs.readFileSync(formsPath, 'utf8'));
  FORMS = data;
}
if (fs.existsSync(aboutPath)) {
  const { data, body } = parseFrontmatter(fs.readFileSync(aboutPath, 'utf8'));
  // Strip HTML comments that editors leave as hints in the markdown file
  const cleanBio = body.replace(/<!--[\s\S]*?-->/g, '').trim();
  ABOUT = { ...data, bio: cleanBio };
}

// ---------- Emit js/data.js ----------
const banner = `/* =============================================================================
 *  AUTO-GENERATED FILE — DO NOT EDIT BY HAND
 * -----------------------------------------------------------------------------
 *  This file is rebuilt on every deploy from the markdown files under /content
 *  by scripts/build-data.js. If you need to change content, edit it via the
 *  CMS at yourdomain.co.uk/admin, or directly in the content/ folder.
 *
 *  If you edit this file directly, your changes will be overwritten on the
 *  next deploy.
 * ========================================================================== */
`;

const out = [
  banner,
  `const CATS = ${JSON.stringify(cats, null, 2)};`,
  '',
  `const KITTENS = ${JSON.stringify(kittens, null, 2)};`,
  '',
  `const LITTERS = ${JSON.stringify(litters, null, 2)};`,
  '',
  `const TESTIMONIALS = ${JSON.stringify(testimonials, null, 2)};`,
  '',
  `const BUSINESS = ${JSON.stringify(BUSINESS, null, 2)};`,
  '',
  `const FORMS = ${JSON.stringify(FORMS, null, 2)};`,
  '',
  `const ABOUT = ${JSON.stringify(ABOUT, null, 2)};`,
  ''
].join('\n');

fs.writeFileSync(OUT, out);

console.log(`✓ Wrote ${path.relative(ROOT, OUT)}`);
console.log(`  ${cats.length} cats, ${kittens.length} kittens, ${litters.length} litters, ${testimonials.length} testimonials`);


// ---------- Pre-render content pages ----------
// Each cat and litter gets a real HTML file at cats/<id>.html and
// litters/<id>.html with the title, meta tags, OG tags, canonical URL,
// and the full body content inlined. Crawlers without JS execution
// (Semrush, Ahrefs first pass, social link previewers) see real per-
// page HTML; users get instant first paint; JS hydrates the dynamic
// features (lightbox, gallery aspect detection, related testimonials)
// on top by detecting the data-cat-id / data-litter-id attributes.
console.log('Pre-rendering content pages...');

const SITE_URL = (BUSINESS && BUSINESS.url) ? BUSINESS.url : 'https://littlepawsbymiles.co.uk/';

function htmlEscape(s) {
  if (s == null) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Build an absolute URL for og:image style fields. Handles already-absolute
// URLs, root-relative paths (now the default after rootRel normalisation
// in the data step) and bare paths.
function absoluteUrl(p) {
  if (!p) return '';
  if (/^https?:\/\//.test(p)) return p;
  const base = SITE_URL.replace(/\/$/, '');
  return base + (p.startsWith('/') ? p : '/' + p);
}

// Trim a meta description to the recommended length (~155 chars).
// Cuts at the last word boundary before the limit and adds an ellipsis.
function trimDescription(s, max) {
  max = max || 155;
  if (!s || s.length <= max) return s;
  const cut = s.slice(0, max - 1);
  const lastSpace = cut.lastIndexOf(' ');
  return (lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).trim() + '…';
}

// Read the header and footer partials once. We inline them into every
// generated HTML page at build time so non-JS crawlers (Ahrefs, Semrush,
// social previewers, plus Google's first crawl pass) see real navigation
// links instead of empty <div id="site-header-placeholder"></div> shells.
// The fetch in js/partials.js becomes a no-op once placeholders are gone.
const HEADER_PARTIAL_RAW = fs.existsSync(path.join(ROOT, 'partials', 'header.html'))
  ? fs.readFileSync(path.join(ROOT, 'partials', 'header.html'), 'utf8')
  : '';
const FOOTER_PARTIAL_RAW = fs.existsSync(path.join(ROOT, 'partials', 'footer.html'))
  ? fs.readFileSync(path.join(ROOT, 'partials', 'footer.html'), 'utf8')
  : '';

// Substitute the site header and footer into the placeholder divs in `html`.
// activeNavKey marks the matching <a data-nav="X"> with class="active" so
// the current page is highlighted in the nav. Footer year and social URLs
// are also filled in so the JS callback in partials.js becomes redundant.
function inlinePartials(html, activeNavKey) {
  if (!HEADER_PARTIAL_RAW || !FOOTER_PARTIAL_RAW) return html;

  let header = HEADER_PARTIAL_RAW;
  let footer = FOOTER_PARTIAL_RAW;

  // Mark active nav link(s) — both desktop nav and mobile nav have a
  // matching data-nav attribute, so a global match covers both.
  if (activeNavKey) {
    const navRe = new RegExp(`(<a\\b[^>]*data-nav="${activeNavKey}"[^>]*)`, 'g');
    header = header.replace(navRe, '$1 class="active"');
  }

  // Bake in the footer year and the social URLs from BUSINESS so the
  // footer is fully rendered without JS.
  footer = footer
    .replace(
      /<span id="footer-year">[^<]*<\/span>/,
      `<span id="footer-year">${new Date().getFullYear()}</span>`
    );
  if (BUSINESS && BUSINESS.instagram) {
    footer = footer.replace(
      /(<a\b[^>]*id="footer-instagram"[^>]*)href="[^"]*"/,
      `$1href="${htmlEscape(BUSINESS.instagram)}"`
    );
  }
  if (BUSINESS && BUSINESS.tiktok) {
    footer = footer.replace(
      /(<a\b[^>]*id="footer-tiktok"[^>]*)href="[^"]*"/,
      `$1href="${htmlEscape(BUSINESS.tiktok)}"`
    );
  }

  return html
    .replace('<div id="site-header-placeholder"></div>', header)
    .replace('<div id="site-footer-placeholder"></div>', footer);
}


// Mirror of renderCatPersonality in main.js — handles ## headings,
// bullet lists, and paragraphs. Used to render cat bio + litter body.
function renderMarkdownish(raw) {
  if (!raw) return '';
  const blocks = raw.split(/\n\s*\n/).map(b => b.trim()).filter(Boolean);
  return blocks.map(block => {
    if (/^##\s+/.test(block) && !block.includes('\n')) {
      return `<h3 class="cat-bio-heading">${htmlEscape(block.replace(/^##\s+/, ''))}</h3>`;
    }
    const lines = block.split('\n');
    if (lines.every(l => /^-\s+/.test(l))) {
      const items = lines.map(l => `<li>${htmlEscape(l.replace(/^-\s+/, ''))}</li>`).join('');
      return `<ul class="cat-bio-list">${items}</ul>`;
    }
    return `<p>${htmlEscape(block)}</p>`;
  }).join('\n');
}

function pageShell({title, description, canonicalUrl, ogImage, dataPage, body, scriptInit}) {
  const __out = `<!DOCTYPE html>
<html lang="en-GB">
<head>
  <meta charset="UTF-8">
  <meta name="format-detection" content="telephone=no,date=no,address=no,email=no,url=no">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${htmlEscape(title)}</title>
  <meta name="description" content="${htmlEscape(description)}">
  <meta name="author" content="Little Paws By Miles">
  <meta name="robots" content="index, follow, max-image-preview:large">
  <link rel="canonical" href="${htmlEscape(canonicalUrl)}">
  <meta property="og:type" content="article">
  <meta property="og:site_name" content="Little Paws By Miles">
  <meta property="og:title" content="${htmlEscape(title)}">
  <meta property="og:description" content="${htmlEscape(description)}">
  <meta property="og:url" content="${htmlEscape(canonicalUrl)}">
  <meta property="og:image" content="${htmlEscape(ogImage)}">
  <meta property="og:locale" content="en_GB">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${htmlEscape(title)}">
  <meta name="twitter:description" content="${htmlEscape(description)}">
  <meta name="twitter:image" content="${htmlEscape(ogImage)}">
  <link rel="icon" type="image/svg+xml" href="/images/favicon.svg">
  <link rel="apple-touch-icon" href="/images/logo.png">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300..600;1,9..144,400&family=DM+Sans:wght@400;500;600&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="/css/style.css">
</head>
<body data-page="${htmlEscape(dataPage)}">
  <div id="site-header-placeholder"></div>
  <main>
${body}
  </main>
  <div id="site-footer-placeholder"></div>
  <script src="/js/data.js"></script>
  <script src="/js/main.js"></script>
  <script src="/js/partials.js"></script>
  <script src="/js/enquiry-form.js"></script>
  <script>${scriptInit}</script>
</body>
</html>
`;
  return inlinePartials(__out, dataPage);
}

function renderCatPage(cat) {
  const url = `${SITE_URL}cats/${encodeURIComponent(cat.id)}`;
  const cover = cat.cardImage || (cat.photos && cat.photos[0]) || '/images/logo.png';
  const ogImage = absoluteUrl(cover);

  const titleStr = `${cat.name} — ${cat.breed} ${cat.role} — Little Paws By Miles`;
  // Description capped at 155 chars to satisfy SEO recommendations
  // (Ahrefs flags anything longer). Tagline appended only if it fits.
  const descBase = `Meet ${cat.name}, our ${cat.colour} ${cat.breed} ${cat.role.toLowerCase()} at Little Paws By Miles.`;
  const descWithTagline = cat.tagline ? `${descBase} ${cat.tagline}` : descBase;
  const descriptionStr = trimDescription(descWithTagline, 155);

  const personalityHtml = renderMarkdownish(cat.personality);

  // Sibling links — resolve from ids to names, link to their pre-rendered pages
  const siblingsHtml = (cat.siblings && cat.siblings.length) ? (() => {
    const links = cat.siblings
      .map(sid => cats.find(c => c.id === sid))
      .filter(Boolean)
      .map(s => `<a href="/cats/${encodeURIComponent(s.id)}">${htmlEscape(s.name)}</a>`)
      .join(', ');
    if (!links) return '';
    const label = cat.siblings.length === 1 ? 'Sister to' : 'Sisters to';
    return `<div class="cat-details-meta cat-details-siblings"><span>${label} ${links}</span></div>`;
  })() : '';

  const photos = (cat.photos || []).filter(p => p && p.length).slice(0, 5);
  const galleryHtml = photos.length === 0
    ? Array.from({ length: 4 }).map(() =>
        `<div class="cat-gallery-item placeholder">${htmlEscape((cat.name || '?').charAt(0).toUpperCase())}</div>`
      ).join('')
    : photos.map(p =>
        `<div class="cat-gallery-item"><img src="${htmlEscape(p)}" alt="${htmlEscape(cat.name + ', ' + cat.colour + ' ' + cat.breed)}" loading="lazy"></div>`
      ).join('');

  const body = `
    <div id="cat-profile-root" data-cat-id="${htmlEscape(cat.id)}" style="padding-top: 2rem;">
      <div class="container">
        <nav aria-label="Breadcrumb" class="breadcrumb">
          <a href="/">Home</a>
          <span aria-hidden="true">›</span>
          <a href="/cats">Meet the Cats</a>
          <span aria-hidden="true">›</span>
          <span aria-current="page">${htmlEscape(cat.name)}</span>
        </nav>
        <div class="cat-profile">
          <div class="cat-gallery">
${galleryHtml}
          </div>
          <div class="cat-details">
            <div class="cat-details-header">
              <span class="eyebrow">${htmlEscape(cat.breed)} · ${htmlEscape(cat.role)}</span>
              <h1>${htmlEscape(cat.name)}</h1>
              ${cat.registeredName ? `<p class="cat-details-registered">${htmlEscape(cat.registeredName)}</p>` : ''}
              ${cat.tagline ? `<p class="cat-details-tagline">${htmlEscape(cat.tagline)}</p>` : ''}
              <div class="cat-details-meta">
                <span>${htmlEscape(cat.colour)}</span>
                ${cat.registration ? `<span>${htmlEscape(cat.registration)}</span>` : ''}
                ${cat.dob ? `<span>Born ${htmlEscape(cat.dob)}</span>` : ''}
              </div>
              ${siblingsHtml}
            </div>
            <div class="cat-details-body">
              <div class="cat-details-section" spellcheck="false">
                <h2>About ${htmlEscape(cat.name)}</h2>
                ${personalityHtml}
              </div>
              <div class="cat-details-actions">
                ${cat.studRegisterUrl ? `<a href="${htmlEscape(cat.studRegisterUrl)}" target="_blank" rel="noopener" class="btn btn-outline btn-small" style="margin-right: 0.5rem;">View on GCCF Stud Register ↗</a>` : ''}
                ${cat.role === 'Stud' ? `<a href="/stud-services" class="btn btn-primary">Enquire about stud services</a>` : ''}
              </div>
            </div>
          </div>
        </div>
        <div id="cat-testimonials-${htmlEscape(cat.id)}"></div>
      </div>
    </div>
`;

  // After DOM is ready, JS calls renderCatProfile which detects the
  // data-cat-id attribute and re-renders to attach lightbox triggers,
  // gallery aspect classes, related testimonials, and structured data.
  const scriptInit = `document.addEventListener('DOMContentLoaded',function(){if(typeof renderCatProfile==='function'){renderCatProfile('cat-profile-root');}});`;

  return pageShell({
    title: titleStr,
    description: descriptionStr,
    canonicalUrl: url,
    ogImage,
    dataPage: 'cats',
    body,
    scriptInit
  });
}

function renderLitterPage(litter) {
  const url = `${SITE_URL}litters/${encodeURIComponent(litter.id)}`;
  const coverPath = litter.coverImage || litter.thumbnail || '/images/logo.png';
  const ogImage = absoluteUrl(coverPath);

  const titleStr = `${litter.title} — ${litter.breed} ${litter.status === 'Past' ? 'litter' : 'litter (upcoming)'} — Little Paws By Miles`;
  const descRaw = litter.summary || `${litter.title} at Little Paws By Miles. ${litter.dateLabel || ''}`.trim();
  const descriptionStr = trimDescription(descRaw, 155);

  // Dam / sire as on the card
  const dam = litter.dam ? cats.find(c => c.id === litter.dam) : null;
  const damHtml = dam
    ? `<a href="/cats/${encodeURIComponent(dam.id)}">${htmlEscape(dam.name)}</a>`
    : (litter.dam ? htmlEscape(litter.dam) : '');
  let sireHtml = '';
  if (litter.sire) {
    const sire = cats.find(c => c.id === litter.sire);
    if (sire) sireHtml = `<a href="/cats/${encodeURIComponent(sire.id)}">${htmlEscape(sire.name)}</a>`;
  }
  if (!sireHtml && litter.sireName) sireHtml = htmlEscape(litter.sireName);
  const parentsBits = [];
  if (damHtml)  parentsBits.push(`<span><strong>Dam:</strong> ${damHtml}</span>`);
  if (sireHtml) parentsBits.push(`<span><strong>Sire:</strong> ${sireHtml}</span>`);
  const parentsHtml = parentsBits.length ? `<div class="litter-parents">${parentsBits.join('')}</div>` : '';

  // Cover (uses coverImage if provided, else thumbnail)
  const coverHtml = coverPath
    ? `<img src="/${htmlEscape(coverPath)}" alt="${htmlEscape(litter.title)}" loading="lazy">`
    : `<span class="litter-thumb-placeholder">${htmlEscape(((dam && dam.name) || litter.title || 'L').charAt(0).toUpperCase())}</span>`;

  const galleryPhotos = (litter.photos || []).filter(p => p && p.length);
  const galleryHtml = galleryPhotos.length
    ? `<div class="litter-gallery">${galleryPhotos.map(p => `<div class="litter-gallery-item"><img src="${htmlEscape(p)}" alt="${htmlEscape(litter.title)}" loading="lazy"></div>`).join('')}</div>`
    : '';

  const bodyHtml = renderMarkdownish(litter.body);

  const waitlistCta = litter.status === 'Upcoming'
    ? `<a href="/contact" class="btn btn-primary">Join the waitlist</a>`
    : '';

  const body = `
    <div id="litter-profile-root" data-litter-id="${htmlEscape(litter.id)}" style="padding-top: 2rem;">
      <div class="container">
        <nav aria-label="Breadcrumb" class="breadcrumb">
          <a href="/">Home</a>
          <span aria-hidden="true">›</span>
          <a href="/litters">Litters</a>
          <span aria-hidden="true">›</span>
          <span aria-current="page">${htmlEscape(litter.title)}</span>
        </nav>
        <article class="litter-profile">
          <header class="litter-profile-header">
            <span class="eyebrow">${htmlEscape(litter.status)} · ${htmlEscape(litter.breed)}</span>
            <h1>${htmlEscape(litter.title)}</h1>
            ${litter.dateLabel ? `<p class="litter-date">${htmlEscape(litter.dateLabel)}${litter.kittenCount ? ' · ' + htmlEscape(litter.kittenCount) : ''}</p>` : ''}
            ${parentsHtml}
          </header>
          <div class="litter-profile-cover">${coverHtml}</div>
          ${litter.summary ? `<p class="litter-summary litter-summary--lead">${htmlEscape(litter.summary)}</p>` : ''}
          <div class="litter-profile-body" spellcheck="false">${bodyHtml}</div>
          ${galleryHtml}
          ${waitlistCta ? `<div class="litter-profile-cta">${waitlistCta}</div>` : ''}
        </article>
      </div>
    </div>
`;

  const scriptInit = `document.addEventListener('DOMContentLoaded',function(){if(typeof renderLitterProfile==='function'){renderLitterProfile('litter-profile-root');}});`;

  return pageShell({
    title: titleStr,
    description: descriptionStr,
    canonicalUrl: url,
    ogImage,
    dataPage: 'litters',
    body,
    scriptInit
  });
}

// Emit the files
const CATS_DIR = path.join(ROOT, 'cats');
const LITTERS_DIR = path.join(ROOT, 'litters');
if (!fs.existsSync(CATS_DIR)) fs.mkdirSync(CATS_DIR, { recursive: true });
if (!fs.existsSync(LITTERS_DIR)) fs.mkdirSync(LITTERS_DIR, { recursive: true });

cats.forEach(cat => {
  const html = renderCatPage(cat);
  fs.writeFileSync(path.join(CATS_DIR, `${cat.id}.html`), html);
});
console.log(`✓ Wrote ${cats.length} per-cat pages to cats/`);

litters.forEach(litter => {
  const html = renderLitterPage(litter);
  fs.writeFileSync(path.join(LITTERS_DIR, `${litter.id}.html`), html);
});
console.log(`✓ Wrote ${litters.length} per-litter pages to litters/`);


// ---------- Inline partials into static listing pages ----------
// The hand-written listing pages (index, cats, available-kittens, etc.)
// currently have <div id="site-header-placeholder"></div> and
// <div id="site-footer-placeholder"></div> that get filled by JS at
// runtime. Non-JS crawlers see empty divs — which is why Ahrefs flags
// "page has no outgoing links" on every listing page. We rewrite those
// files in place at build time so the header (with all nav links) and
// footer (with the social links and brand copy) are baked into the
// static HTML.
//
// Env-gated so local builds don't mutate source files. Cloudflare builds
// in a fresh git checkout, so the on-disk repo is never affected.
if (process.env.CF_PAGES === '1' && HEADER_PARTIAL_RAW && FOOTER_PARTIAL_RAW) {
  console.log('Production build — inlining header/footer into static pages...');
  const rootFiles = fs.readdirSync(ROOT).filter(f => f.endsWith('.html'));
  let inlinedCount = 0;
  for (const f of rootFiles) {
    const fp = path.join(ROOT, f);
    const original = fs.readFileSync(fp, 'utf8');
    // Skip pages that don't use the partial placeholder pattern —
    // legacy redirect pages (cat.html, litter.html, upcoming-litters.html)
    // are minimal redirect-only markup and have no placeholders.
    if (!original.includes('id="site-header-placeholder"')) continue;
    // Active nav key — pulled from <body data-page="..."> on each page.
    const m = original.match(/<body[^>]*data-page="([^"]+)"/);
    const activeNavKey = m ? m[1] : '';
    const updated = inlinePartials(original, activeNavKey);
    if (updated !== original) {
      fs.writeFileSync(fp, updated);
      inlinedCount++;
      console.log(`  ✓ ${f}${activeNavKey ? ' (nav: ' + activeNavKey + ')' : ''}`);
    }
  }
  console.log(`✓ Inlined partials into ${inlinedCount} static pages`);
} else if (!HEADER_PARTIAL_RAW || !FOOTER_PARTIAL_RAW) {
  console.warn('Partials missing — skipping inline pass');
} else {
  console.log('Local build — skipping static-page partial inlining (CF_PAGES not set).');
}


// ---------- Minification (production builds only) ----------
// Cloudflare Pages sets CF_PAGES=1 during its build. We only minify in
// that environment so local builds leave the source files readable for
// editing. Files are minified in place — Cloudflare publishes from the
// working directory after this runs, then the next build starts from a
// fresh git checkout, so source on disk in the repo is never modified.
if (process.env.CF_PAGES === '1') {
  (async () => {
    const CleanCSS = require('clean-css');
    const Terser = require('terser');

    console.log('Production build — minifying CSS and JS...');

    // CSS — clean-css is synchronous and very fast
    const cssDir = path.join(ROOT, 'css');
    const cssFiles = fs.readdirSync(cssDir)
      .filter(f => f.endsWith('.css') && !f.endsWith('.min.css'));
    for (const f of cssFiles) {
      const p = path.join(cssDir, f);
      const input = fs.readFileSync(p, 'utf8');
      const result = new CleanCSS({ returnPromise: false }).minify(input);
      if (result.errors.length) {
        console.error(`  ✗ CSS errors in ${f}:`, result.errors);
        continue;
      }
      fs.writeFileSync(p, result.styles);
      const saved = ((1 - result.styles.length / input.length) * 100).toFixed(1);
      console.log(`  ✓ ${f}: ${input.length} → ${result.styles.length} bytes (-${saved}%)`);
    }

    // JS — terser is async. Default mangle settings preserve top-level
    // names, which is what we need: HTML inline scripts call functions
    // like renderCatProfile() and renderEnquiryForm() by name.
    const jsDir = path.join(ROOT, 'js');
    const jsFiles = fs.readdirSync(jsDir)
      .filter(f => f.endsWith('.js') && !f.endsWith('.min.js'));
    for (const f of jsFiles) {
      const p = path.join(jsDir, f);
      const input = fs.readFileSync(p, 'utf8');
      try {
        const result = await Terser.minify(input, {
          compress: { passes: 2 },
          format: { comments: false }
        });
        if (!result.code) {
          console.error(`  ✗ Terser returned no output for ${f}`);
          continue;
        }
        fs.writeFileSync(p, result.code);
        const saved = ((1 - result.code.length / input.length) * 100).toFixed(1);
        console.log(`  ✓ ${f}: ${input.length} → ${result.code.length} bytes (-${saved}%)`);
      } catch (e) {
        console.error(`  ✗ Terser failed on ${f}:`, e.message);
      }
    }
  })().catch(e => {
    console.error('Minification failed:', e);
    process.exit(1);
  });
} else {
  console.log('Local build — skipping minification (CF_PAGES not set).');
}
