/* ==========================================================================
   Partials loader — injects the shared header and footer into every page.
   
   Each page includes two empty divs:
     <div id="site-header-placeholder"></div>
     <div id="site-footer-placeholder"></div>
   
   This script fills them with the contents of partials/header.html and
   partials/footer.html so you only have to update nav links in ONE place.
   ========================================================================== */

(function () {
  // Which nav link should be marked "active" on this page?
  // Based on the data-page attribute we add to each page's <body>.
  const activePage = document.body.dataset.page || '';

  function loadPartial(id, url, after) {
    const el = document.getElementById(id);
    if (!el) { if (after) after(); return; }
    fetch(url)
      .then(r => r.ok ? r.text() : '')
      .then(html => {
        el.innerHTML = html;
        if (after) after();
      })
      .catch(() => { if (after) after(); });
  }

  // Load header first, then footer. URLs are root-relative so the
  // partials work from sub-folder pages (e.g. /cats/bella.html) too.
  loadPartial('site-header-placeholder', '/partials/header.html', () => {
    // Mark active link(s)
    if (activePage) {
      document.querySelectorAll(`[data-nav="${activePage}"]`).forEach(a => {
        a.classList.add('active');
      });
    }
    // Re-attach mobile nav behaviour now that the header has been injected
    const toggle = document.querySelector('.nav-toggle');
    const mobileNav = document.querySelector('.mobile-nav');
    if (toggle && mobileNav) {
      toggle.addEventListener('click', () => {
        const isOpen = mobileNav.classList.toggle('open');
        toggle.classList.toggle('active', isOpen);
        toggle.setAttribute('aria-expanded', String(isOpen));
      });
    }
  });

  loadPartial('site-footer-placeholder', '/partials/footer.html', () => {
    const yearEl = document.getElementById('footer-year');
    if (yearEl) yearEl.textContent = String(new Date().getFullYear());
    if (typeof BUSINESS !== 'undefined') {
      const ig = document.getElementById('footer-instagram');
      if (ig) ig.href = BUSINESS.instagram;
      const tt = document.getElementById('footer-tiktok');
      if (tt) tt.href = BUSINESS.tiktok;
    }
  });
})();
