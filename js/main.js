/* ==========================================================================
   CASA NATIVE — main.js
   Configuração, utilitários compartilhados e inicialização dos módulos.
   Cada arquivo registra seu módulo em window.CN; este arquivo os inicia
   na ordem correta quando o DOM está pronto.
   ========================================================================== */
(function () {
  'use strict';

  const CN = (window.CN = window.CN || {});

  /* ------------------------------------------------------------------------
     CONFIGURAÇÃO — edite aqui os dados de contato quando existirem.
     Como a Casa Native é fictícia, nenhum perfil/número real é usado.
     ------------------------------------------------------------------------ */
  CN.config = {
    instagramUrl: '',            // ex.: 'https://instagram.com/seu.perfil'
    whatsappNumber: '',          // ex.: '5511999999999' (somente dígitos)
    whatsappMessage: 'Olá, Casa Native! Gostaria de mais informações.',
    mapUrl: 'https://www.google.com/maps/search/?api=1&query=Vila+Madalena,+S%C3%A3o+Paulo',
    timeZone: 'America/Sao_Paulo',
    // Horário de funcionamento (0 = domingo). Usado no status "aberto agora"
    hours: {
      0: [8, 22], 1: [8, 20], 2: [8, 20], 3: [8, 20], 4: [8, 20], 5: [8, 20], 6: [8, 22]
    },
  };

  /* Utilitários --------------------------------------------------------------- */
  CN.$ = (sel, ctx = document) => ctx.querySelector(sel);
  CN.$$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));
  CN.clamp = (v, min, max) => Math.min(max, Math.max(min, v));
  CN.lerp = (a, b, t) => a + (b - a) * t;

  const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  CN.reducedMotion = () => motionQuery.matches;
  CN.finePointer = () => window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  /* Barramento de scroll: um único requestAnimationFrame por frame,
     compartilhado por parallax, navbar, scroll horizontal etc. */
  CN.scroll = (function () {
    const subscribers = new Set();
    let ticking = false;
    const run = () => {
      ticking = false;
      const y = window.scrollY;
      const vh = window.innerHeight;
      subscribers.forEach((fn) => fn(y, vh));
    };
    const request = () => {
      if (!ticking) { ticking = true; requestAnimationFrame(run); }
    };
    window.addEventListener('scroll', request, { passive: true });
    window.addEventListener('resize', request, { passive: true });
    return {
      subscribe(fn) { subscribers.add(fn); request(); return () => subscribers.delete(fn); },
      update: request
    };
  })();

  /* Trava de rolagem (menu e modais) — com contagem para modais aninhados */
  let lockCount = 0;
  CN.lockScroll = (lock) => {
    lockCount = CN.clamp(lockCount + (lock ? 1 : -1), 0, 99);
    document.documentElement.classList.toggle('is-locked', lockCount > 0);
  };

  /* Toast de feedback (substitui alert()) */
  let toastTimer;
  CN.toast = (message) => {
    const toast = CN.$('.toast');
    if (!toast) return;
    CN.$('.toast__text', toast).textContent = message;
    toast.hidden = false;
    requestAnimationFrame(() => toast.classList.add('is-visible'));
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toast.classList.remove('is-visible');
      setTimeout(() => { toast.hidden = true; }, 500);
    }, 3600);
  };

  /* Imagens ausentes: esconde o <img> quebrado e deixa o fallback do bloco
     (cor + símbolo da marca) ocupando o mesmo espaço. */
  function handleBrokenImages() {
    const markBroken = (img) => img.classList.add('is-broken');
    document.addEventListener('error', (e) => {
      if (e.target.tagName === 'IMG') markBroken(e.target);
    }, true);
    CN.$$('img').forEach((img) => {
      if (img.complete && img.naturalWidth === 0 && img.getAttribute('src')) markBroken(img);
    });
  }

  /* Inicialização --------------------------------------------------------------- */
  const ORDER = ['animations', 'navigation', 'modal', 'gallery', 'interactions'];

  function boot() {
    handleBrokenImages();
    ORDER.forEach((name) => {
      const mod = CN[name];
      if (mod && typeof mod.init === 'function') {
        try { mod.init(); } catch (err) { console.error(`[Casa Native] falha ao iniciar "${name}"`, err); }
      }
    });
  }

  // Scripts com "defer" rodam antes do DOMContentLoaded: aguardamos o evento
  // para garantir que todos os módulos já se registraram em window.CN.
  if (document.readyState === 'complete') boot();
  else document.addEventListener('DOMContentLoaded', boot, { once: true });
})();
