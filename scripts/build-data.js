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
  cardImage: c.cardImage || '',
  photos: Array.isArray(c.photos) ? c.photos : []
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
    cardImage: k.cardImage || '',
    // photos: array preferred. Falls back to legacy single `photo` field.
    photos: Array.isArray(k.photos) && k.photos.length
      ? k.photos
      : (k.photo ? [k.photo] : []),
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
  thumbnail: l.thumbnail || '',
  coverImage: l.coverImage || '',
  // Optional gallery for the per-litter detail page (litter.html?id=...)
  photos: Array.isArray(l.photos) ? l.photos : [],
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
