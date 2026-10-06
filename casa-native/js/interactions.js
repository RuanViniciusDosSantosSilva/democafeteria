/* ==========================================================================
   CASA NATIVE — interactions.js
   Abas do cardápio, FAQ (accordion), ambiente com troca de imagem,
   cursor personalizado, botões magnéticos, status "aberto agora" e
   links de contato configuráveis.
   ========================================================================== */
(function () {
  'use strict';

  const CN = (window.CN = window.CN || {});
  const { $, $$ } = CN;

  /* Abas do cardápio (padrão WAI-ARIA tabs, com setas/Home/End) ------------------- */
  function initTabs() {
    $$('[data-tabs]').forEach((root) => {
      const list = $('[role="tablist"]', root);
      const tabs = $$('[role="tab"]', root);
      const indicator = $('.tabs__indicator', root);
      let current = tabs.findIndex((t) => t.getAttribute('aria-selected') === 'true');
      let busy = false;

      const moveIndicator = () => {
        const tab = tabs[current];
        indicator.style.setProperty('--ind-w', `${tab.offsetWidth}px`);
        indicator.style.setProperty('--ind-x', `${tab.offsetLeft}px`);
      };

      const staggerCards = (panel) => {
        $$('.products > li', panel).forEach((li, i) => li.style.setProperty('--i', i));
        panel.classList.remove('is-entering');
        void panel.offsetWidth;
        panel.classList.add('is-entering');
      };

      const select = (i, { focus = false } = {}) => {
        if (i === current || busy) { if (focus) tabs[i].focus(); return; }
        const oldTab = tabs[current];
        const newTab = tabs[i];
        const oldPanel = $(`#${oldTab.getAttribute('aria-controls')}`);
        const newPanel = $(`#${newTab.getAttribute('aria-controls')}`);

        tabs.forEach((t, idx) => {
          const on = idx === i;
          t.setAttribute('aria-selected', String(on));
          t.tabIndex = on ? 0 : -1;
          t.classList.toggle('is-active', on);
        });
        current = i;
        moveIndicator();
        if (focus) newTab.focus();
        newTab.scrollIntoView({ block: 'nearest', inline: 'nearest' });

        const swap = () => {
          oldPanel.hidden = true;
          oldPanel.classList.remove('is-leaving', 'is-active');
          newPanel.hidden = false;
          newPanel.classList.add('is-active');
          if (!CN.reducedMotion()) staggerCards(newPanel);
          busy = false;
        };
        if (CN.reducedMotion()) { swap(); return; }
        busy = true;
        oldPanel.classList.add('is-leaving');
        setTimeout(swap, 240);
      };

      tabs.forEach((tab, i) => tab.addEventListener('click', () => select(i)));
      list.addEventListener('keydown', (e) => {
        const keys = { ArrowRight: current + 1, ArrowLeft: current - 1, Home: 0, End: tabs.length - 1 };
        if (!(e.key in keys)) return;
        e.preventDefault();
        select((keys[e.key] + tabs.length) % tabs.length, { focus: true });
      });

      // Máscara de "tem mais à direita" no mobile some ao chegar ao fim
      const edge = () => list.classList.toggle('is-scrolled-end', list.scrollLeft + list.clientWidth >= list.scrollWidth - 2);
      list.addEventListener('scroll', edge, { passive: true });
      window.addEventListener('resize', edge);
      edge();

      moveIndicator();
      window.addEventListener('resize', moveIndicator);
      if (document.fonts && document.fonts.ready) document.fonts.ready.then(moveIndicator);
    });
  }

  /* FAQ: accordion animado ------------------------------------------------------------ */
  function initAccordion() {
    $$('[data-accordion]').forEach((root) => {
      const triggers = $$('.accordion__trigger', root);
      triggers.forEach((btn) => {
        const panel = $(`#${btn.getAttribute('aria-controls')}`);
        btn.addEventListener('click', () => {
          const open = btn.getAttribute('aria-expanded') !== 'true';
          // Mantém apenas uma resposta aberta por vez: leitura mais calma
          triggers.forEach((other) => {
            if (other === btn) return;
            other.setAttribute('aria-expanded', 'false');
            $(`#${other.getAttribute('aria-controls')}`).classList.remove('is-open');
          });
          btn.setAttribute('aria-expanded', String(open));
          panel.classList.toggle('is-open', open);
        });
      });
    });
  }

  /* Ambiente: cada experiência troca a imagem principal (hover, foco ou toque) -------- */
  function initAmbiance() {
    const items = $$('[data-ambiance]');
    const imgs = $$('.ambiance__img');
    const label = $('[data-ambiance-label]');
    if (!items.length) return;

    const activate = (i) => {
      items.forEach((item, idx) => {
        const on = idx === i;
        item.classList.toggle('is-active', on);
        item.setAttribute('aria-pressed', String(on));
      });
      imgs.forEach((img, idx) => img.classList.toggle('is-active', idx === i));
      if (label) label.textContent = $('.ambiance__name', items[i]).textContent;
    };

    items.forEach((item, i) => {
      item.addEventListener('click', () => activate(i));
      item.addEventListener('focus', () => activate(i));
      item.addEventListener('mouseenter', () => { if (CN.finePointer()) activate(i); });
    });
  }

  /* Cursor personalizado (somente ponteiro fino e sem reduced motion) ------------------ */
  function initCursor() {
    if (!CN.finePointer() || CN.reducedMotion()) return;
    const cursor = $('.cursor');
    const label = $('.cursor-label');
    if (!cursor || !label) return;
    const ring = $('.cursor__ring', cursor);
    const dot = $('.cursor__dot', cursor);
    document.documentElement.classList.add('has-cursor');

    let x = -100, y = -100, rx = -100, ry = -100, lx = -100, ly = -100;
    let raf = null;

    const loop = () => {
      rx = CN.lerp(rx, x, 0.2);
      ry = CN.lerp(ry, y, 0.2);
      lx = CN.lerp(lx, x, 0.25);
      ly = CN.lerp(ly, y, 0.25);
      ring.style.transform = `translate3d(${rx}px, ${ry}px, 0)`;
      label.style.transform = `translate3d(${lx}px, ${ly}px, 0)`;
      raf = Math.abs(rx - x) + Math.abs(ry - y) > 0.1 ? requestAnimationFrame(loop) : null;
    };

    document.addEventListener('pointermove', (e) => {
      if (e.pointerType !== 'mouse') return;
      x = e.clientX; y = e.clientY;
      dot.style.transform = `translate3d(${x}px, ${y}px, 0)`; // o ponto acompanha sem atraso
      cursor.classList.remove('is-hidden');
      if (!raf) raf = requestAnimationFrame(loop);

      const t = e.target instanceof Element ? e.target : null;
      const view = t && t.closest('[data-cursor="view"]');
      const field = t && t.closest('input, select, textarea');
      const link = !view && !field && t && t.closest('a, button, [role="tab"], label, .pillar');
      cursor.classList.toggle('is-view', !!view);
      cursor.classList.toggle('is-link', !!link);
      cursor.classList.toggle('is-hidden', !!field);
      label.classList.toggle('is-visible', !!view);
    }, { passive: true });

    document.addEventListener('mouseleave', () => { cursor.classList.add('is-hidden'); label.classList.remove('is-visible'); });
    document.addEventListener('pointerdown', () => ring.style.scale = '.85');
    document.addEventListener('pointerup', () => ring.style.scale = '');
  }

  /* Botões magnéticos ------------------------------------------------------------------- */
  function initMagnetic() {
    if (!CN.finePointer() || CN.reducedMotion()) return;
    $$('[data-magnetic]').forEach((el) => {
      const reach = { x: 10, y: 7 }; // deslocamento máximo em px — sutil
      el.addEventListener('pointermove', (e) => {
        const r = el.getBoundingClientRect();
        const nx = CN.clamp((e.clientX - (r.left + r.width / 2)) / (r.width / 2), -1, 1);
        const ny = CN.clamp((e.clientY - (r.top + r.height / 2)) / (r.height / 2), -1, 1);
        el.classList.add('is-attracted');
        el.style.setProperty('--mx', `${(nx * reach.x).toFixed(1)}px`);
        el.style.setProperty('--my', `${(ny * reach.y).toFixed(1)}px`);
      });
      el.addEventListener('pointerleave', () => {
        el.classList.remove('is-attracted');
        el.style.setProperty('--mx', '0px');
        el.style.setProperty('--my', '0px');
      });
    });
  }

  /* Status de funcionamento (fuso de São Paulo) ------------------------------------------ */
  function initOpenStatus() {
    const parts = new Intl.DateTimeFormat('en-US', { timeZone: CN.config.timeZone, weekday: 'short', hour: 'numeric', minute: 'numeric', hour12: false })
      .formatToParts(new Date()).reduce((a, p) => { a[p.type] = p.value; return a; }, {});
    const day = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(parts.weekday);
    const minutes = (parseInt(parts.hour, 10) % 24) * 60 + parseInt(parts.minute, 10);
    const [open, close] = CN.config.hours[day];
    const isOpen = minutes >= open * 60 && minutes < close * 60;
    const pad = (n) => String(n).padStart(2, '0');

    $$('[data-open-status]').forEach((el) => { el.textContent = `${pad(open)}h — ${pad(close)}h`; });

    $$('.hours__row').forEach((row) => {
      const days = row.dataset.days.includes('-')
        ? (() => { const [a, b] = row.dataset.days.split('-').map(Number); return Array.from({ length: b - a + 1 }, (_, i) => a + i); })()
        : row.dataset.days.split(',').map(Number);
      row.classList.toggle('is-today', days.includes(day));
    });

    const badge = $('[data-open-badge]');
    if (badge) {
      badge.classList.add(isOpen ? 'is-open' : 'is-closed');
      let text;
      if (isOpen) text = `Aberto agora · fecha às ${pad(close)}h`;
      else if (minutes < open * 60) text = `Fechado agora · abre hoje às ${pad(open)}h`;
      else text = `Fechado agora · abre amanhã às ${pad(CN.config.hours[(day + 1) % 7][0])}h`;
      $('[data-open-text]', badge).textContent = text;
    }
  }

  /* Links de contato configuráveis (sem perfis/números reais inventados) ----------------- */
  function initContactLinks() {
    const { instagramUrl, whatsappNumber, whatsappMessage, mapUrl } = CN.config;

    $$('[data-instagram-link]').forEach((a) => {
      if (instagramUrl) { a.href = instagramUrl; a.target = '_blank'; a.rel = 'noopener'; return; }
      a.addEventListener('click', (e) => { e.preventDefault(); CN.toast('@casanative.cafe é um perfil conceitual — projeto de portfólio.'); });
    });

    $$('[data-whatsapp-link]').forEach((a) => {
      if (whatsappNumber) {
        a.href = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(whatsappMessage)}`;
        a.target = '_blank'; a.rel = 'noopener';
        return;
      }
      a.addEventListener('click', (e) => { e.preventDefault(); CN.toast('WhatsApp ainda não configurado — projeto conceitual de portfólio.'); });
    });

    $$('[data-map-link]').forEach((a) => {
      a.href = mapUrl;
      a.setAttribute('aria-label', 'Abrir a região da Vila Madalena no mapa (endereço conceitual)');
    });
  }

  CN.interactions = {
    init() {
      initTabs();
      initAccordion();
      initAmbiance();
      initCursor();
      initMagnetic();
      initOpenStatus();
      initContactLinks();
    }
  };
})();
