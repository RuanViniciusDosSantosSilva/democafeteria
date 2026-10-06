/* ==========================================================================
   CASA NATIVE — menu.js
   Navbar dinâmica (fundo, tema por seção, link ativo) e menu mobile
   acessível (aria-expanded, ESC, foco preso no painel).
   ========================================================================== */
(function () {
  'use strict';

  const CN = (window.CN = window.CN || {});
  const { $, $$ } = CN;

  function initNavbar() {
    const header = $('#site-header');
    if (!header) return;
    const themed = $$('[data-nav-theme]');
    const links = $$('.nav__link');
    const targets = links
      .map((link) => ({ link, section: $(link.getAttribute('href')) }))
      .filter((t) => t.section);
    const fab = $('.whatsapp-fab');
    const footer = $('.footer');

    CN.scroll.subscribe((y, vh) => {
      header.classList.toggle('is-scrolled', y > 40);
      if (fab) {
        // O botão some no rodapé, para não cobrir ações
        const atFooter = footer && footer.getBoundingClientRect().top < vh - 40;
        fab.classList.toggle('is-visible', y > vh * 0.8 && !atFooter);
      }

      // Tema: seção que está logo abaixo da navbar
      const probe = header.offsetHeight / 2;
      let theme = 'dark';
      for (const el of themed) {
        const r = el.getBoundingClientRect();
        if (r.top <= probe && r.bottom > probe) { theme = el.dataset.navTheme; break; }
      }
      if (header.dataset.theme !== theme) header.dataset.theme = theme;

      // Link ativo: última seção cujo topo passou do meio da tela
      let activeLink = null;
      targets.forEach(({ link, section }) => {
        const r = section.getBoundingClientRect();
        if (r.top <= vh * 0.45 && r.bottom > vh * 0.2) activeLink = link;
      });
      links.forEach((l) => {
        const on = l === activeLink;
        l.classList.toggle('is-active', on);
        if (on) l.setAttribute('aria-current', 'location'); else l.removeAttribute('aria-current');
      });
    });
  }

  function initMobileMenu() {
    const toggle = $('.nav__toggle');
    const menu = $('#mobile-menu');
    const header = $('#site-header');
    if (!toggle || !menu) return;
    let open = false;
    let closeTimer;

    const focusables = () => [toggle, ...$$('a, button', menu)];

    const setOpen = (state, { restoreFocus = true } = {}) => {
      if (state === open) return;
      open = state;
      clearTimeout(closeTimer);
      toggle.setAttribute('aria-expanded', String(open));
      toggle.setAttribute('aria-label', open ? 'Fechar menu' : 'Abrir menu');
      header.classList.toggle('is-menu-open', open);
      CN.lockScroll(open);
      if (open) {
        menu.hidden = false;
        requestAnimationFrame(() => requestAnimationFrame(() => menu.classList.add('is-open')));
        setTimeout(() => { const first = $('a', menu); if (first) first.focus(); }, 250);
      } else {
        menu.classList.remove('is-open');
        closeTimer = setTimeout(() => { menu.hidden = true; }, CN.reducedMotion() ? 0 : 700);
        if (restoreFocus) toggle.focus();
      }
    };

    toggle.addEventListener('click', () => setOpen(!open));

    // Fecha ao escolher um destino (a rolagem acontece normalmente pela âncora)
    $$('a', menu).forEach((a) => a.addEventListener('click', () => setOpen(false, { restoreFocus: false })));

    document.addEventListener('keydown', (e) => {
      if (!open) return;
      if (e.key === 'Escape') { setOpen(false); return; }
      if (e.key === 'Tab') {
        const list = focusables();
        const first = list[0];
        const last = list[list.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    });

    // Se a tela crescer para desktop com o menu aberto, fecha
    window.matchMedia('(min-width: 901px)').addEventListener('change', (e) => { if (e.matches) setOpen(false, { restoreFocus: false }); });
  }

  CN.navigation = {
    init() {
      initNavbar();
      initMobileMenu();
    }
  };
})();
