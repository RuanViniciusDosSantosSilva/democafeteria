/* ==========================================================================
   CASA NATIVE — gallery.js
   Lightbox da galeria (teclado, swipe, contador) e carrossel de depoimentos.
   ========================================================================== */
(function () {
  'use strict';

  const CN = (window.CN = window.CN || {});
  const { $, $$ } = CN;

  /* Lightbox ---------------------------------------------------------------------- */
  function initLightbox() {
    const dialog = $('#lightbox');
    const triggers = $$('[data-lightbox]');
    if (!dialog || !triggers.length) return;

    const img = $('.lightbox__img', dialog);
    const caption = $('.lightbox__caption', dialog);
    const idxEl = $('[data-lb-index]', dialog);
    $('[data-lb-total]', dialog).textContent = triggers.length;

    const items = triggers.map((btn) => {
      const source = $('img', btn);
      return { src: source.getAttribute('src'), alt: source.alt, title: $('.gallery__caption span', btn).textContent };
    });
    let index = 0;

    const show = (i, dir = 0) => {
      index = (i + items.length) % items.length;
      const item = items[index];
      const apply = () => {
        img.classList.remove('is-broken');
        img.src = item.src;
        img.alt = item.alt;
        caption.textContent = item.title;
        idxEl.textContent = index + 1;
        img.classList.remove('is-swapping');
      };
      if (dir && !CN.reducedMotion()) {
        img.style.setProperty('--dir', dir);
        img.classList.add('is-swapping');
        setTimeout(apply, 220);
      } else apply();
    };

    triggers.forEach((btn, i) => btn.addEventListener('click', () => { show(i); CN.dialog.open(dialog, btn); }));
    $('[data-lb-prev]', dialog).addEventListener('click', () => show(index - 1, -1));
    $('[data-lb-next]', dialog).addEventListener('click', () => show(index + 1, 1));

    dialog.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight') { e.preventDefault(); show(index + 1, 1); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); show(index - 1, -1); }
    });

    // Fechar ao clicar na área vazia em volta da imagem
    $('.lightbox__figure', dialog).addEventListener('click', (e) => { if (e.target === e.currentTarget) CN.dialog.close(dialog); });

    // Swipe no touch
    let startX = null;
    dialog.addEventListener('touchstart', (e) => { startX = e.touches[0].clientX; }, { passive: true });
    dialog.addEventListener('touchend', (e) => {
      if (startX === null) return;
      const dx = e.changedTouches[0].clientX - startX;
      if (Math.abs(dx) > 50) show(index + (dx < 0 ? 1 : -1), dx < 0 ? 1 : -1);
      startX = null;
    });
  }

  /* Carrossel de depoimentos -----------------------------------------------------------
     Usa scroll-snap nativo (swipe no mobile) + setas, pontos e avanço lento
     automático que pausa em hover/foco e não roda com reduced motion. */
  function initCarousel() {
    const root = $('[data-carousel]');
    if (!root) return;
    const track = $('.carousel__track', root);
    const cards = $$('.quote-card', track);
    const dotsWrap = $('.carousel__dots', root);
    const prev = $('[data-carousel-prev]');
    const next = $('[data-carousel-next]');

    const dots = cards.map((_, i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'carousel__dot';
      b.setAttribute('aria-label', `Depoimento ${i + 1}`);
      b.addEventListener('click', () => goTo(i));
      dotsWrap.appendChild(b);
      return b;
    });

    const maxScroll = () => track.scrollWidth - track.clientWidth;
    const step = () => cards[1] ? cards[1].offsetLeft - cards[0].offsetLeft : track.clientWidth;
    const currentIndex = () => Math.round(track.scrollLeft / step());

    function goTo(i) {
      const target = CN.clamp(i, 0, cards.length - 1);
      track.scrollTo({ left: Math.min(target * step(), maxScroll()), behavior: CN.reducedMotion() ? 'auto' : 'smooth' });
    }

    const update = () => {
      const atEnd = track.scrollLeft >= maxScroll() - 4;
      const idx = atEnd ? cards.length - 1 : currentIndex();
      dots.forEach((d, i) => d.setAttribute('aria-current', String(i === idx)));
      if (prev) prev.disabled = track.scrollLeft <= 4;
      if (next) next.disabled = atEnd;
    };

    prev && prev.addEventListener('click', () => goTo(currentIndex() - 1));
    next && next.addEventListener('click', () => goTo(currentIndex() + 1));
    track.addEventListener('scroll', () => requestAnimationFrame(update), { passive: true });
    window.addEventListener('resize', update);
    update();

    // Avanço automático suave
    if (CN.reducedMotion()) return;
    let paused = false;
    let visible = false;
    ['mouseenter', 'focusin', 'touchstart'].forEach((ev) => root.addEventListener(ev, () => { paused = true; }, { passive: true }));
    ['mouseleave', 'focusout'].forEach((ev) => root.addEventListener(ev, () => { paused = false; }));
    new IntersectionObserver(([e]) => { visible = e.isIntersecting; }, { threshold: 0.4 }).observe(root);
    setInterval(() => {
      if (paused || !visible || document.hidden) return;
      const atEnd = track.scrollLeft >= maxScroll() - 4;
      goTo(atEnd ? 0 : currentIndex() + 1);
    }, 6000);
  }

  CN.gallery = {
    init() {
      initLightbox();
      initCarousel();
    }
  };
})();
