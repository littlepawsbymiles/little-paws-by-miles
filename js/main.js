/* ==========================================================================
   Little Paws By Miles — Main JavaScript
   
   This file powers the dynamic bits of the site:
   - Mobile navigation toggle
   - Rendering cats, kittens, litters, testimonials from data.js
   - Embedding Tally/Typeform forms, with a friendly fallback
   - Small scroll-reveal animation for cards
   
   You shouldn't need to edit this file to update site content —
   everything editable lives in js/data.js.
   ========================================================================== */


/* ---------- Mobile nav toggle ---------- */
(function initNav() {
  const toggle = document.querySelector('.nav-toggle');
  const mobileNav = document.querySelector('.mobile-nav');
  if (!toggle || !mobileNav) return;

  toggle.addEventListener('click', () => {
    const isOpen = mobileNav.classList.toggle('open');
    toggle.classList.toggle('active', isOpen);
    toggle.setAttribute('aria-expanded', String(isOpen));
  });
})();


/* ---------- Helpers ---------- */
function escapeHtml(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function getCatInitial(name) {
  if (!name) return '?';
  return name.trim().charAt(0).toUpperCase();
}

function renderStars(rating) {
  const full = Math.max(0, Math.min(5, Math.round(rating)));
  let stars = '';
  for (let i = 0; i < 5; i++) {
    stars += i < full ? '★' : '☆';
  }
  return stars;
}


/* ---------- Render: About page breeders bio ---------- */
function renderAboutBio(headingTargetId, bodyTargetId) {
  if (typeof ABOUT === 'undefined') return;
  const headingEl = headingTargetId && document.getElementById(headingTargetId);
  const bodyEl = bodyTargetId && document.getElementById(bodyTargetId);

  if (headingEl && ABOUT.breedersHeading) {
    headingEl.textContent = ABOUT.breedersHeading;
  }

  if (bodyEl && ABOUT.bio) {
    // Split on double-newline into paragraphs, escape each for safety
    const paragraphs = ABOUT.bio
      .split(/\n\n+/)
      .map(p => p.trim())
      .filter(p => p.length)
      .map(p => `<p>${escapeHtml(p)}</p>`)
      .join('');
    bodyEl.innerHTML = paragraphs;
  }
}


/* ---------- Render: Breed overview cards (home page) ---------- */
function renderBreedOverview(targetId) {
  const target = document.getElementById(targetId);
  if (!target || typeof CATS === 'undefined') return;

  const breedCounts = CATS.reduce((acc, cat) => {
    if (cat.role === 'Family Cat') return acc;
    acc[cat.breed] = (acc[cat.breed] || 0) + 1;
    return acc;
  }, {});

  const breeds = [
    { name: 'Ragdoll', icon: '✦', blurb: 'Gentle, floppy giants with striking blue eyes — famous for going limp in your arms.' },
    { name: 'Maine Coon', icon: '✦', blurb: 'Long-haired, dog-like personalities — playful, intelligent, and wonderfully sociable.' },
    { name: 'British Shorthair', icon: '✦', blurb: 'Plush, round-faced teddy bears — calm, easy-going, and beautifully traditional.' }
  ];

  target.innerHTML = breeds.map(b => `
    <div class="breed-card fade-in">
      <div class="breed-icon">${b.icon}</div>
      <h3>${b.name}</h3>
      <p>${b.blurb}</p>
    </div>
  `).join('');
  observeFadeIns(target);
}


/* ---------- Render: Cat grid (Meet the Cats page) ---------- */
function renderCatGrid(targetId) {
  const target = document.getElementById(targetId);
  if (!target || typeof CATS === 'undefined') return;

  // Group cats by breed, preserving order
  const groups = [
    { heading: 'Ragdolls',         filter: c => c.breed === 'Ragdoll' },
    { heading: 'Maine Coons',      filter: c => c.breed === 'Maine Coon' },
    { heading: 'British Shorthairs', filter: c => c.breed === 'British Shorthair' }
  ];

  target.innerHTML = groups.map(group => {
    const cats = CATS.filter(group.filter);
    if (cats.length === 0) return '';
    return `
      <div class="cat-group">
        <div class="cat-group-heading">
          <h2>${group.heading}</h2>
          <span>${cats.length} ${cats.length === 1 ? 'cat' : 'cats'}</span>
        </div>
        <div class="cat-grid">
          ${cats.map(renderCatCard).join('')}
        </div>
      </div>
    `;
  }).join('');
  observeFadeIns(target);
}

function renderCatCard(cat) {
  const hasPhoto = cat.photos && cat.photos[0];
  const img = hasPhoto
    ? `<img src="${escapeHtml(cat.photos[0])}" alt="${escapeHtml(cat.name)}, ${escapeHtml(cat.colour)} ${escapeHtml(cat.breed)} ${escapeHtml(cat.role.toLowerCase())}" loading="lazy">`
    : `<div class="cat-card-image placeholder">${getCatInitial(cat.name)}</div>`;

  const tagline = cat.tagline ? `<p class="cat-card-tagline">${escapeHtml(cat.tagline)}</p>` : '';

  return `
    <a href="cat.html?id=${encodeURIComponent(cat.id)}" class="cat-card fade-in">
      ${hasPhoto ? `<div class="cat-card-image">${img}</div>` : img}
      <div class="cat-card-body">
        <span class="cat-card-breed">${escapeHtml(cat.breed)}</span>
        <h3>${escapeHtml(cat.name)}</h3>
        ${tagline}
        <span class="cat-card-role">${escapeHtml(cat.role)}</span>
        <span class="btn btn-outline btn-small">Meet ${escapeHtml(cat.name.split(' ')[0])}</span>
      </div>
    </a>
  `;
}


/* ---------- Render: Individual cat profile ---------- */
function renderCatProfile(targetId) {
  const target = document.getElementById(targetId);
  if (!target || typeof CATS === 'undefined') return;

  const params = new URLSearchParams(window.location.search);
  const id = params.get('id');
  const cat = CATS.find(c => c.id === id);

  if (!cat) {
    target.innerHTML = `
      <div class="container container-narrow" style="padding: 4rem 1.5rem; text-align: center;">
        <h1>Cat not found</h1>
        <p>We couldn't find that cat. Please head back to the cats page.</p>
        <a href="cats.html" class="btn btn-primary mt-1">Meet the Cats</a>
      </div>
    `;
    document.title = 'Cat not found — Little Paws By Miles';
    return;
  }

  // Update page title & meta description for SEO
  document.title = `${cat.name} — ${cat.breed} ${cat.role} — Little Paws By Miles`;
  const metaDesc = document.querySelector('meta[name="description"]');
  if (metaDesc) {
    const descText = cat.tagline
      ? `${cat.name} — ${cat.colour} ${cat.breed} ${cat.role.toLowerCase()} at Little Paws By Miles. ${cat.tagline}`
      : `Meet ${cat.name}, our ${cat.colour} ${cat.breed} ${cat.role.toLowerCase()} at Little Paws By Miles.`;
    metaDesc.setAttribute('content', descText);
  }
  // Update canonical and OG tags if present
  const businessUrl = (typeof BUSINESS !== 'undefined' && BUSINESS.url) ? BUSINESS.url : '';
  const canonical = document.querySelector('link[rel="canonical"]');
  if (canonical && businessUrl) {
    canonical.setAttribute('href', `${businessUrl}cat.html?id=${encodeURIComponent(cat.id)}`);
  }
  setOgTags({
    title: `${cat.name} — ${cat.breed} ${cat.role}`,
    description: cat.tagline || `Meet ${cat.name}, our ${cat.colour} ${cat.breed}.`,
    url: businessUrl ? `${businessUrl}cat.html?id=${encodeURIComponent(cat.id)}` : ''
  });

  const photos = (cat.photos || []).filter(p => p && p.length);
  const galleryHtml = photos.length === 0
    ? Array.from({ length: 4 }).map((_, i) => `
        <div class="cat-gallery-item placeholder">${getCatInitial(cat.name)}</div>
      `).join('')
    : photos.slice(0, 5).map(p => `
        <div class="cat-gallery-item">
          <img src="${escapeHtml(p)}" alt="${escapeHtml(cat.name)}, ${escapeHtml(cat.colour)} ${escapeHtml(cat.breed)}" loading="lazy">
        </div>
      `).join('');

  // Render the personality body — supports a tiny subset of markdown so that
  // the rich stud briefs (with ## headings and - bullet lists) display properly.
  const paragraphs = renderCatPersonality(cat.personality || '');

  // Build sibling links from ids → names
  const siblingHtml = (cat.siblings && cat.siblings.length)
    ? (() => {
        const links = cat.siblings
          .map(sid => CATS.find(c => c.id === sid))
          .filter(Boolean)
          .map(s => `<a href="cat.html?id=${encodeURIComponent(s.id)}">${escapeHtml(s.name)}</a>`)
          .join(', ');
        if (!links) return '';
        const label = cat.siblings.length === 1 ? 'Sister to' : 'Sisters to';
        return `<div class="cat-details-meta cat-details-siblings"><span>${label} ${links}</span></div>`;
      })()
    : '';

  // Tagline line shown right under the name
  const taglineHtml = cat.tagline
    ? `<p class="cat-details-tagline">${escapeHtml(cat.tagline)}</p>`
    : '';

  // Registered name, date of birth, GCCF stud register button — all optional
  const registeredNameHtml = cat.registeredName
    ? `<p class="cat-details-registered">${escapeHtml(cat.registeredName)}</p>`
    : '';

  const dobHtml = cat.dob
    ? `<span class="cat-details-dob">Born ${escapeHtml(cat.dob)}</span>`
    : '';

  const studRegisterBtnHtml = cat.studRegisterUrl
    ? `<a href="${escapeHtml(cat.studRegisterUrl)}" target="_blank" rel="noopener" class="btn btn-outline btn-small" style="margin-right: 0.5rem;">View on GCCF Stud Register ↗</a>`
    : '';

  target.innerHTML = `
    <div class="container">
      <nav aria-label="Breadcrumb" class="breadcrumb">
        <a href="index.html">Home</a>
        <span aria-hidden="true">›</span>
        <a href="cats.html">Meet the Cats</a>
        <span aria-hidden="true">›</span>
        <span aria-current="page">${escapeHtml(cat.name)}</span>
      </nav>
      <div class="cat-profile">
        <div class="cat-gallery">
          ${galleryHtml}
        </div>
        <div class="cat-details">
          <span class="eyebrow">${escapeHtml(cat.breed)} · ${escapeHtml(cat.role)}</span>
          <h1>${escapeHtml(cat.name)}</h1>
          ${registeredNameHtml}
          ${taglineHtml}
          <div class="cat-details-meta">
            <span>${escapeHtml(cat.colour)}</span>
            ${cat.registration ? `<span>${escapeHtml(cat.registration)}</span>` : ''}
            ${dobHtml}
          </div>
          ${siblingHtml}
          <div class="cat-details-section" spellcheck="false">
            <h2>About ${escapeHtml(cat.name)}</h2>
            ${paragraphs}
          </div>
          <div class="cat-details-actions">
            ${studRegisterBtnHtml}
            ${cat.role === 'Stud' ? `
              <a href="stud-services.html" class="btn btn-primary">Enquire about stud services</a>
            ` : ''}
          </div>
        </div>
      </div>
      <div id="cat-testimonials-${escapeHtml(cat.id)}"></div>
    </div>
  `;

  // Render related testimonials (if any) inside the cat-testimonials placeholder
  renderRelatedTestimonialsForCat(cat);

  // Inject structured data for this cat
  injectCatStructuredData(cat, businessUrl);
}


/* Lightweight markdown-ish renderer for cat bio content.
   Supports:  ## heading,  paragraphs,  - bulleted lists
   Does NOT support: bold/italic/links (we don't need them in these bios) */
function renderCatPersonality(raw) {
  if (!raw) return '';
  // Split into blocks separated by blank lines
  const blocks = raw.split(/\n\s*\n/).map(b => b.trim()).filter(b => b.length);
  const html = blocks.map(block => {
    // Heading block — single line starting with ##
    if (/^##\s+/.test(block) && !block.includes('\n')) {
      const headingText = block.replace(/^##\s+/, '').trim();
      return `<h3 class="cat-bio-heading">${escapeHtml(headingText)}</h3>`;
    }
    // Bullet list — every line begins with "- "
    const lines = block.split(/\n/);
    if (lines.every(l => /^-\s+/.test(l))) {
      const items = lines.map(l => `<li>${escapeHtml(l.replace(/^-\s+/, ''))}</li>`).join('');
      return `<ul class="cat-bio-list">${items}</ul>`;
    }
    // Default: paragraph
    return `<p>${escapeHtml(block)}</p>`;
  });
  return html.join('\n');
}


/* Render testimonials specifically about this cat, below their profile.
   Hidden entirely when there are none, so unlinked cats get a clean page. */
function renderRelatedTestimonialsForCat(cat) {
  const target = document.getElementById(`cat-testimonials-${cat.id}`);
  if (!target || typeof TESTIMONIALS === 'undefined') return;

  const related = TESTIMONIALS.filter(t => t.relatedCat === cat.id);
  if (related.length === 0) return;  // nothing to show — leave placeholder empty

  target.innerHTML = `
    <div class="cat-testimonials-section">
      <h2>Kind words about ${escapeHtml(cat.name)}</h2>
      <div class="testimonials-grid">
        ${related.map(t => renderTestimonialCard(t, { hideRelatedCatTag: true })).join('')}
      </div>
    </div>
  `;
}


/* Helper: build or update an OpenGraph/Twitter meta tag set */
function setOgTags({ title, description, url, image }) {
  const set = (selector, attr, value) => {
    if (!value) return;
    const el = document.querySelector(selector);
    if (el) el.setAttribute(attr, value);
  };
  if (title) {
    set('meta[property="og:title"]', 'content', title);
    set('meta[name="twitter:title"]', 'content', title);
  }
  if (description) {
    set('meta[property="og:description"]', 'content', description);
    set('meta[name="twitter:description"]', 'content', description);
  }
  if (url) {
    set('meta[property="og:url"]', 'content', url);
  }
  if (image) {
    set('meta[property="og:image"]', 'content', image);
    set('meta[name="twitter:image"]', 'content', image);
  }
}


/* Helper: inject JSON-LD structured data for a cat as Product + BreadcrumbList.
   Product schema is the most useful for a breeder cat page because it supports
   offers/availability for studs, and description/images for general listing. */
function injectCatStructuredData(cat, businessUrl) {
  // Remove any previously injected per-cat schema
  document.querySelectorAll('script[data-cat-schema]').forEach(s => s.remove());

  const pageUrl = businessUrl ? `${businessUrl}cat.html?id=${encodeURIComponent(cat.id)}` : '';
  const catSchema = {
    "@context": "https://schema.org",
    "@type": "Thing",
    "name": cat.name,
    "description": (cat.tagline ? cat.tagline + ' ' : '') + (cat.personality || '').split('\n\n')[0],
    "additionalType": `https://schema.org/${cat.breed.replace(/\s+/g, '')}`,
    "url": pageUrl
  };

  const breadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      { "@type": "ListItem", "position": 1, "name": "Home", "item": businessUrl || undefined },
      { "@type": "ListItem", "position": 2, "name": "Meet the Cats", "item": businessUrl ? `${businessUrl}cats.html` : undefined },
      { "@type": "ListItem", "position": 3, "name": cat.name, "item": pageUrl || undefined }
    ]
  };

  const s1 = document.createElement('script');
  s1.type = 'application/ld+json';
  s1.setAttribute('data-cat-schema', 'thing');
  s1.textContent = JSON.stringify(catSchema);
  document.head.appendChild(s1);

  const s2 = document.createElement('script');
  s2.type = 'application/ld+json';
  s2.setAttribute('data-cat-schema', 'breadcrumb');
  s2.textContent = JSON.stringify(breadcrumb);
  document.head.appendChild(s2);
}


/* ---------- Render: Available kittens ---------- */
function renderKittens(targetId) {
  const target = document.getElementById(targetId);
  if (!target || typeof KITTENS === 'undefined') return;

  if (!KITTENS.length) {
    target.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">🌿</div>
        <h3>No kittens available right now</h3>
        <p>We don't have any kittens ready to go just yet, but lovely ones are always on the way. Pop your name on the waitlist below and we'll be in touch when the next litter arrives.</p>
      </div>
    `;
    return;
  }

  target.innerHTML = `
    <div class="kitten-grid">
      ${KITTENS.map(renderKittenCard).join('')}
    </div>
  `;
  observeFadeIns(target);
}

function renderKittenCard(kitten) {
  const hasPhoto = kitten.photo && kitten.photo.length;
  const img = hasPhoto
    ? `<img src="${escapeHtml(kitten.photo)}" alt="${escapeHtml(kitten.name)}" loading="lazy">`
    : `<div class="kitten-card-image placeholder">${getCatInitial(kitten.name)}</div>`;

  const badgeClass = kitten.status && kitten.status.toLowerCase() === 'reserved' ? 'reserved' : '';
  const badge = kitten.status ? `<span class="kitten-badge ${badgeClass}">${escapeHtml(kitten.status)}</span>` : '';

  const isReserved = kitten.status && kitten.status.toLowerCase() === 'reserved';
  const enquiryLink = (typeof FORMS !== 'undefined' && FORMS.kittenEnquiry)
    ? FORMS.kittenEnquiry
    : 'contact.html';

  return `
    <div class="kitten-card fade-in">
      ${hasPhoto ? `<div class="kitten-card-image">${badge}${img}</div>` : `${img}${badge ? `<div style="position:relative">${badge}</div>` : ''}`}
      <div class="kitten-card-body">
        <h3>${escapeHtml(kitten.name)}</h3>
        <div class="kitten-meta">
          <span>${escapeHtml(kitten.breed)}</span>
          <span>${escapeHtml(kitten.sex)}</span>
          <span>${escapeHtml(kitten.colour)}</span>
        </div>
        <div class="kitten-price">${escapeHtml(kitten.price)}</div>
        ${isReserved
          ? `<span class="btn btn-outline">Reserved</span>`
          : `<a href="${escapeHtml(enquiryLink)}" class="btn btn-primary" ${enquiryLink.startsWith('http') ? 'target="_blank" rel="noopener"' : ''}>Reserve Me</a>`}
      </div>
    </div>
  `;
}


/* ---------- Render: Upcoming litters ---------- */
/**
 * Render a list of litters (past or upcoming).
 *
 * @param {string} targetId - id of the container element
 * @param {string} statusFilter - 'Upcoming' or 'Past' (optional — shows all if omitted)
 */
function renderLitters(targetId, statusFilter) {
  const target = document.getElementById(targetId);
  if (!target || typeof LITTERS === 'undefined') return;

  const items = statusFilter
    ? LITTERS.filter(l => l.status === statusFilter)
    : LITTERS;

  if (!items.length) {
    const isUpcoming = statusFilter === 'Upcoming';
    const isPast     = statusFilter === 'Past';
    target.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">🌸</div>
        <h3>${
          isUpcoming ? 'Nothing on the calendar right now' :
          isPast     ? 'No past litters documented yet' :
                       'No litters to show'
        }</h3>
        <p>${
          isUpcoming ? "We don't have any litters planned at the moment. Join the waitlist below and we'll let you know as soon as we do." :
          isPast     ? "When we have raised litters, we'll write about them here." :
                       "Check back soon."
        }</p>
      </div>
    `;
    return;
  }

  target.innerHTML = `
    <div class="litters-list">
      ${items.map(litter => renderLitterCard(litter)).join('')}
    </div>
  `;
  observeFadeIns(target);
}


/* Build a single rich litter card. */
function renderLitterCard(litter) {
  const hasThumbnail = litter.thumbnail && litter.thumbnail.length;

  // Dam — if it matches a cat id, make it a link; otherwise show as text
  const dam = (typeof CATS !== 'undefined' && litter.dam)
    ? CATS.find(c => c.id === litter.dam)
    : null;
  const damHtml = dam
    ? `<a href="cat.html?id=${encodeURIComponent(dam.id)}">${escapeHtml(dam.name)}</a>`
    : (litter.dam ? escapeHtml(litter.dam) : '');

  // Sire — prefer internal cat link if sire id is set, else use sireName free text
  let sireHtml = '';
  if (litter.sire && typeof CATS !== 'undefined') {
    const sire = CATS.find(c => c.id === litter.sire);
    if (sire) {
      sireHtml = `<a href="cat.html?id=${encodeURIComponent(sire.id)}">${escapeHtml(sire.name)}</a>`;
    }
  }
  if (!sireHtml && litter.sireName) sireHtml = escapeHtml(litter.sireName);

  // Parents line (combines dam and sire)
  const parentsBits = [];
  if (damHtml)  parentsBits.push(`<span><strong>Dam:</strong> ${damHtml}</span>`);
  if (sireHtml) parentsBits.push(`<span><strong>Sire:</strong> ${sireHtml}</span>`);
  const parentsHtml = parentsBits.length
    ? `<div class="litter-parents">${parentsBits.join('')}</div>`
    : '';

  // Body paragraphs (supports ## headings + basic markdown)
  const bodyHtml = renderCatPersonality(litter.body || '');

  const statusClass = litter.status === 'Past' ? 'litter-past' : 'litter-upcoming';

  // Thumbnail — real image if provided, or initial placeholder
  const thumbHtml = hasThumbnail
    ? `<img src="${escapeHtml(litter.thumbnail)}" alt="${escapeHtml(litter.title)}" loading="lazy">`
    : `<span class="litter-thumb-placeholder">${
        escapeHtml(((dam && dam.name) || litter.title || 'L').charAt(0).toUpperCase())
      }</span>`;

  // Waitlist CTA shows only for upcoming litters
  const waitlistLink = (typeof FORMS !== 'undefined' && FORMS.waitlist)
    ? FORMS.waitlist
    : 'contact.html';
  const ctaHtml = litter.status === 'Upcoming'
    ? `<a href="${escapeHtml(waitlistLink)}" class="btn btn-primary btn-small" ${waitlistLink.startsWith('http') ? 'target="_blank" rel="noopener"' : ''}>Join the waitlist</a>`
    : '';

  return `
    <article class="litter-card ${statusClass} fade-in">
      <div class="litter-thumb">${thumbHtml}</div>
      <div class="litter-body">
        <div class="litter-header">
          <span class="eyebrow">${escapeHtml(litter.status)} · ${escapeHtml(litter.breed)}</span>
          <h3>${escapeHtml(litter.title)}</h3>
          ${litter.dateLabel ? `<p class="litter-date">${escapeHtml(litter.dateLabel)}${litter.kittenCount ? ' · ' + escapeHtml(litter.kittenCount) : ''}</p>` : ''}
        </div>
        ${parentsHtml}
        ${litter.summary ? `<p class="litter-summary">${escapeHtml(litter.summary)}</p>` : ''}
        <div class="litter-body-content" spellcheck="false">
          ${bodyHtml}
        </div>
        ${ctaHtml}
      </div>
    </article>
  `;
}


/* ---------- Render: Testimonials ---------- */
function renderTestimonials(targetId, limit, options) {
  const target = document.getElementById(targetId);
  if (!target || typeof TESTIMONIALS === 'undefined') return;

  const opts = options || {};
  // Optional filter: show only testimonials tied to a given cat id
  const filtered = opts.relatedCatId
    ? TESTIMONIALS.filter(t => t.relatedCat === opts.relatedCatId)
    : TESTIMONIALS;

  const items = typeof limit === 'number' ? filtered.slice(0, limit) : filtered;

  target.innerHTML = items.map(t => renderTestimonialCard(t, opts)).join('');
  observeFadeIns(target);
  return items.length;  // so callers can hide the section if empty
}

function renderTestimonialCard(t, opts) {
  opts = opts || {};
  const subtitleParts = [];
  if (t.role) subtitleParts.push(t.role);
  if (t.breed) subtitleParts.push(`${t.breed} Owner`);
  const subtitle = subtitleParts.join(' · ');

  // "About [cat]" tag — hidden when we're already on that cat's page
  let relatedCatHtml = '';
  if (t.relatedCat && typeof CATS !== 'undefined' && !opts.hideRelatedCatTag) {
    const cat = CATS.find(c => c.id === t.relatedCat);
    if (cat) {
      relatedCatHtml = `
        <a class="testimonial-related" href="cat.html?id=${encodeURIComponent(cat.id)}">
          About ${escapeHtml(cat.name)} →
        </a>`;
    }
  }

  return `
    <div class="testimonial-card fade-in">
    <div class="testimonial-stars" aria-label="${t.rating} out of 5 stars">${renderStars(t.rating)}</div>
    ${t.testimonialTitle ? `<h3 class="testimonial-title">${escapeHtml(t.testimonialTitle)}</h3>` : ''}
    <p class="testimonial-text">${escapeHtml(t.comment)}</p>
      <div class="testimonial-author">
        <strong>${escapeHtml(t.name)}</strong>
        ${subtitle ? `<span>${escapeHtml(subtitle)}</span>` : ''}
        ${relatedCatHtml}
      </div>
    </div>
  `;
}


/* ---------- Render: Form embed (Tally / Typeform / placeholder) ---------- */
function renderFormEmbed(targetId, formKey, placeholderMessage) {
  const target = document.getElementById(targetId);
  if (!target) return;

  const url = (typeof FORMS !== 'undefined' && FORMS[formKey]) ? FORMS[formKey] : '';

  if (url) {
    target.innerHTML = `
      <div class="form-embed">
        <iframe src="${escapeHtml(url)}" height="600" title="Form" loading="lazy"></iframe>
      </div>
    `;
  } else {
    target.innerHTML = `
      <div class="embed-placeholder">
        <div class="icon">✉︎</div>
        <div>
          <strong>${escapeHtml(placeholderMessage || 'Form coming soon')}</strong>
          <p style="margin: 0.5rem 0 0; font-size: 0.9rem;">
            To embed your form, open <code>js/data.js</code> and paste your
            Tally or Typeform embed URL for <code>${escapeHtml(formKey)}</code>.
          </p>
        </div>
      </div>
    `;
  }
}


/* ---------- Render: Stud overview (stud services page) ---------- */
function renderStuds(targetId) {
  const target = document.getElementById(targetId);
  if (!target || typeof CATS === 'undefined') return;

  const studs = CATS.filter(c => c.role === 'Stud');
  if (!studs.length) {
    target.innerHTML = '<p class="text-centre">No studs listed at the moment.</p>';
    return;
  }

  target.innerHTML = studs.map(stud => {
    const hasPhoto = stud.photos && stud.photos[0];
    const img = hasPhoto
      ? `<img src="${escapeHtml(stud.photos[0])}" alt="${escapeHtml(stud.name)}" loading="lazy">`
      : `<div class="stud-card-image placeholder">${getCatInitial(stud.name)}</div>`;

    return `
      <div class="stud-card fade-in">
        ${hasPhoto ? `<div class="stud-card-image">${img}</div>` : img}
        <div class="stud-card-body">
          <span class="stud-card-breed">${escapeHtml(stud.breed)} Stud</span>
          <h3>${escapeHtml(stud.name)}</h3>
          <p style="color: var(--grey); margin-bottom: 0.5rem;">${escapeHtml(stud.colour)}</p>
          <p>${escapeHtml(stud.personality)}</p>
          ${stud.registration ? `<p style="font-size: 0.85rem; color: var(--grey);">${escapeHtml(stud.registration)}</p>` : ''}
          <a href="cat.html?id=${encodeURIComponent(stud.id)}" class="btn btn-outline btn-small mt-1">Full profile</a>
        </div>
      </div>
    `;
  }).join('');
  observeFadeIns(target);
}


/* ---------- Render: Social links (home) ---------- */
function renderSocialLinks(targetId) {
  const target = document.getElementById(targetId);
  if (!target || typeof BUSINESS === 'undefined') return;

  target.innerHTML = `
    <a href="${escapeHtml(BUSINESS.instagram)}" class="social-link" target="_blank" rel="noopener">
      <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 1.366.062 2.633.334 3.608 1.308.975.975 1.246 2.242 1.308 3.608.058 1.266.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.062 1.366-.334 2.633-1.308 3.608-.975.975-2.242 1.246-3.608 1.308-1.266.058-1.645.069-4.85.069-3.204 0-3.584-.012-4.849-.069-1.366-.062-2.633-.334-3.608-1.308-.975-.975-1.246-2.242-1.308-3.608C2.175 15.647 2.163 15.268 2.163 12s.012-3.584.07-4.849c.062-1.366.333-2.633 1.308-3.608.975-.975 2.242-1.246 3.608-1.308C8.416 2.175 8.796 2.163 12 2.163zm0 1.802c-3.15 0-3.516.012-4.77.069-.957.044-1.504.207-1.857.344-.466.181-.8.398-1.15.748-.35.35-.566.684-.748 1.15-.137.353-.3.9-.344 1.857C3.035 9.335 3 9.7 3 12s.035 2.665.131 3.867c.044.957.207 1.504.344 1.857.181.466.398.8.748 1.15.35.35.684.566 1.15.748.353.137.9.3 1.857.344C8.484 19.99 8.85 20 12 20s3.516-.012 4.77-.069c.957-.044 1.504-.207 1.857-.344.466-.181.8-.398 1.15-.748.35-.35.566-.684.748-1.15.137-.353.3-.9.344-1.857.057-1.254.069-1.62.069-4.77s-.012-3.516-.069-4.77c-.044-.957-.207-1.504-.344-1.857-.181-.466-.398-.8-.748-1.15-.35-.35-.684-.566-1.15-.748-.353-.137-.9-.3-1.857-.344C15.516 3.977 15.15 3.965 12 3.965zm0 3.063a4.972 4.972 0 110 9.944 4.972 4.972 0 010-9.944zm0 8.2a3.228 3.228 0 100-6.456 3.228 3.228 0 000 6.456zm5.18-8.428a1.162 1.162 0 11-2.324 0 1.162 1.162 0 012.324 0z"/>
      </svg>
      Instagram <span style="color: var(--grey); margin-left: 0.25rem;">${escapeHtml(BUSINESS.instagramHandle)}</span>
    </a>
    <a href="${escapeHtml(BUSINESS.tiktok)}" class="social-link" target="_blank" rel="noopener">
      <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M19.321 5.562a5.122 5.122 0 01-3.414-1.267 5.127 5.127 0 01-1.687-3.296H10.89v13.23c0 1.41-1.149 2.556-2.56 2.556a2.56 2.56 0 01-2.56-2.56 2.56 2.56 0 012.56-2.56c.266 0 .518.04.758.116V7.678a6.84 6.84 0 00-.758-.046c-3.77 0-6.832 3.062-6.832 6.832 0 3.77 3.062 6.832 6.832 6.832 3.77 0 6.832-3.062 6.832-6.832V9.402a9.112 9.112 0 005.33 1.71V7.78s-1.938.113-3.171-.933a5.127 5.127 0 01-1.502-2.22l.562.935z"/>
      </svg>
      TikTok <span style="color: var(--grey); margin-left: 0.25rem;">${escapeHtml(BUSINESS.tiktokHandle)}</span>
    </a>
  `;
}


/* ---------- Footer setup (social icons + copyright year) ---------- */
function setupFooter() {
  const yearEl = document.getElementById('footer-year');
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());

  if (typeof BUSINESS !== 'undefined') {
    const ig = document.getElementById('footer-instagram');
    if (ig) ig.href = BUSINESS.instagram;
    const tt = document.getElementById('footer-tiktok');
    if (tt) tt.href = BUSINESS.tiktok;
  }
}


/* ---------- observeFadeIns: kept as a no-op for compatibility ----------
   The .fade-in class is now visible by default (see css/style.css).
   This stub is retained so existing render functions can keep calling it
   without errors. If you want to add scroll animations later, this is
   where to wire them up. */
function observeFadeIns(_root) { /* intentionally empty */ }


/* ---------- Boot: run setup after DOM ready ---------- */
document.addEventListener('DOMContentLoaded', () => {
  setupFooter();
});
