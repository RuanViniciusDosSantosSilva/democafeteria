/* ==========================================================================
   CASA NATIVE — animations.js
   Loader, text reveal, scroll reveal, hero, parallax, manifesto e o
   scroll horizontal da "experiência Native".
   ========================================================================== */
(function () {
  'use strict';

  const CN = (window.CN = window.CN || {});
  const { $, $$, clamp } = CN;

  /* Loader -------------------------------------------------------------------
     Primeira visita: ~1.5s. Visitas seguintes na mesma sessão: ~0.4s.
     Nunca espera mais do que 3s, mesmo que algum recurso demore. */
  function initLoader() {
    const loader = $('#loader');
    const body = document.body;
    const finish = () => {
      if (loader) loader.classList.add('is-done');
      body.classList.add('is-loaded');
      setTimeout(() => loader && loader.classList.add('is-gone'), 1100);
      setTimeout(() => { body.classList.add('is-settled'); CN.scroll.update(); }, 2600);
    };

    if (!loader || CN.reducedMotion()) {
      if (loader) loader.classList.add('is-gone');
      body.classList.add('is-loaded', 'is-settled');
      return;
    }

    let returning = false;
    try { returning = sessionStorage.getItem('cn-visited') === '1'; sessionStorage.setItem('cn-visited', '1'); } catch (e) { /* storage indisponível */ }
    if (returning) document.documentElement.classList.add('is-returning');

    const minTime = new Promise((r) => setTimeout(r, returning ? 350 : 1550));
    const loaded = new Promise((r) => {
      if (document.readyState === 'complete') r();
      else window.addEventListener('load', r, { once: true });
    });
    const cap = new Promise((r) => setTimeout(r, 3000));
    Promise.race([Promise.all([minTime, loaded]), cap]).then(finish);
  }

  /* Text reveal: quebra o texto em palavras preservando <em>, <br> etc. */
  function splitText() {
    $$('[data-split]').forEach((el) => {
      let index = 0;
      const walk = (node) => {
        Array.from(node.childNodes).forEach((child) => {
          if (child.nodeType === Node.TEXT_NODE) {
            const parts = child.textContent.split(/(\s+)/);
            const frag = document.createDocumentFragment();
            parts.forEach((part) => {
              if (!part) return;
              if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(' ')); return; }
              const word = document.createElement('span');
              word.className = 'word';
              const inner = document.createElement('span');
              inner.className = 'word__inner';
              inner.style.setProperty('--i', index++);
              inner.textContent = part;
              word.appendChild(inner);
              frag.appendChild(word);
            });
            child.replaceWith(frag);
          } else if (child.nodeType === Node.ELEMENT_NODE && child.tagName !== 'BR') {
            walk(child);
          }
        });
      };
      walk(el);
    });
  }

  /* Scroll reveal ---------------------------------------------------------------
     Elementos irmãos recebem atraso crescente (--d) para criar ritmo. */
  function initReveal() {
    const items = $$('[data-reveal], [data-split]');
    if (!('IntersectionObserver' in window) || CN.reducedMotion()) {
      items.forEach((el) => el.classList.add('is-revealed'));
      return;
    }

    const groups = new Map();
    $$('[data-reveal]').forEach((el) => {
      const parent = el.parentElement;
      const i = groups.get(parent) || 0;
      groups.set(parent, i + 1);
      el.style.setProperty('--d', Math.min(i, 6) * 90);
    });

    // Elementos com clip-path começam com área visível zero, então observamos
    // o elemento pai (sem máscara) e revelamos o filho.
    const proxies = new Map();
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        (proxies.get(entry.target) || [entry.target]).forEach((el) => el.classList.add('is-revealed'));
        io.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0 });

    items.forEach((el) => {
      if (el.dataset.reveal === 'clip') {
        const parent = el.parentElement;
        if (!proxies.has(parent)) proxies.set(parent, []);
        proxies.get(parent).push(el);
        io.observe(parent);
      } else io.observe(el);
    });
  }

  /* Hero: o texto se dissolve e a imagem aproxima durante o scroll ------------- */
  function initHero() {
    const hero = $('.hero');
    if (!hero || CN.reducedMotion()) return;
    const content = $('.hero__content', hero);
    const image = $('.hero__image', hero);
    const body = document.body;

    CN.scroll.subscribe((y, vh) => {
      if (y > vh * 1.2) return;
      const p = clamp(y / vh, 0, 1);
      content.style.setProperty('--hero-fade', (1 - p * 1.5).toFixed(3));
      content.style.setProperty('--hero-shift', `${(p * 80).toFixed(1)}px`);
      if (body.classList.contains('is-settled')) {
        image.style.setProperty('--hero-scale', (1 + p * 0.08).toFixed(4));
        image.style.translate = `0 ${(y * 0.28).toFixed(1)}px`;
      }
    });
  }

  /* Parallax ----------------------------------------------------------------------
     data-parallax="0.1" → velocidade relativa. Mede o elemento PAI (que não se
     move) para evitar realimentação. Desligado em telas pequenas. */
  function initParallax() {
    if (CN.reducedMotion()) return;
    const els = $$('[data-parallax]');
    const zooms = $$('[data-zoom]');
    const active = new Set();
    const mq = window.matchMedia('(min-width: 721px)');

    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => (e.isIntersecting ? active.add(e.target) : active.delete(e.target)));
    }, { rootMargin: '20% 0px 20% 0px' });
    els.forEach((el) => io.observe(el));
    zooms.forEach((el) => io.observe(el));

    CN.scroll.subscribe((y, vh) => {
      if (!mq.matches) {
        els.forEach((el) => el.style.removeProperty('--py'));
        return;
      }
      active.forEach((el) => {
        const ref = el.parentElement.getBoundingClientRect();
        const center = ref.top + ref.height / 2 - vh / 2;
        if (el.hasAttribute('data-parallax')) {
          const speed = parseFloat(el.dataset.parallax) || 0;
          el.style.setProperty('--py', `${(-center * speed).toFixed(1)}px`);
        }
        if (el.hasAttribute('data-zoom')) {
          const prog = clamp(1 - (ref.top + ref.height) / (vh + ref.height), 0, 1);
          el.style.scale = (1.12 - prog * 0.12).toFixed(4);
        }
      });
    });
  }

  /* Manifesto: cada frase acende ao chegar à área de leitura e permanece acesa. */
  function initManifesto() {
    const items = $$('[data-manifesto]');
    if (!items.length) return;
    if (CN.reducedMotion()) { items.forEach((el) => el.classList.add('is-lit')); return; }

    CN.scroll.subscribe((y, vh) => {
      items.forEach((el) => {
        const top = el.getBoundingClientRect().top;
        const p = clamp((vh * 0.92 - top) / (vh * 0.42), 0, 1);
        el.style.setProperty('--p', p.toFixed(3));
        el.classList.toggle('is-lit', p >= 0.98);
      });
    });
  }

  /* Experiência Native: scroll vertical → deslocamento horizontal (desktop).
     No mobile (ou com reduced motion) vira um carrossel com swipe nativo. */
  function initExperience() {
    const section = $('.experience');
    if (!section) return;
    const viewport = $('.experience__viewport', section);
    const track = $('.experience__track', section);
    const fill = $('.experience__bar-fill', section);
    const current = $('[data-exp-current]', section);
    const cards = $$('.exp-card', section);
    const mq = window.matchMedia('(min-width: 901px) and (min-height: 560px)');

    let distance = 0;
    let start = 0;
    let pinned = false;

    const setCounter = (p) => {
      const idx = clamp(Math.floor(p * cards.length * 0.999), 0, cards.length - 1);
      current.textContent = String(idx + 1).padStart(2, '0');
      section.style.setProperty('--exp-progress', Math.max(0.06, p).toFixed(3));
    };

    const measure = () => {
      pinned = mq.matches && !CN.reducedMotion();
      section.classList.toggle('experience--pinned', pinned);
      if (!pinned) {
        section.style.height = '';
        track.style.removeProperty('--exp-x');
        return;
      }
      distance = Math.max(0, track.scrollWidth - viewport.clientWidth);
      section.style.height = `${window.innerHeight + distance}px`;
      start = section.getBoundingClientRect().top + window.scrollY;
      CN.scroll.update();
    };

    CN.scroll.subscribe((y) => {
      if (!pinned) return;
      const p = distance ? clamp((y - start) / distance, 0, 1) : 0;
      track.style.setProperty('--exp-x', `${(-p * distance).toFixed(1)}px`);
      setCounter(p);
    });

    // Modo swipe: progresso pelo scroll horizontal do próprio carrossel
    viewport.addEventListener('scroll', () => {
      if (pinned) return;
      const max = viewport.scrollWidth - viewport.clientWidth;
      setCounter(max ? viewport.scrollLeft / max : 0);
    }, { passive: true });

    let resizeTimer;
    window.addEventListener('resize', () => { clearTimeout(resizeTimer); resizeTimer = setTimeout(measure, 150); });
    mq.addEventListener('change', measure);
    window.addEventListener('load', measure);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(measure);
    measure();

    CN.experience = { measure };
  }

  CN.animations = {
    init() {
      splitText();
      initLoader();
      initReveal();
      initHero();
      initParallax();
      initManifesto();
      initExperience();
    }
  };
})();
