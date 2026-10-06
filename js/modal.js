/* ==========================================================================
   CASA NATIVE — modal.js
   Controlador genérico de <dialog> (abrir/fechar animado, ESC, clique
   fora, trava de rolagem, devolução de foco) + modal de produto.
   ========================================================================== */
(function () {
  'use strict';

  const CN = (window.CN = window.CN || {});
  const { $, $$ } = CN;

  /* Controlador genérico -------------------------------------------------------- */
  const lastTrigger = new WeakMap();

  function open(dialog, trigger) {
    if (!dialog || dialog.open) return;
    lastTrigger.set(dialog, trigger || document.activeElement);
    dialog.classList.remove('is-closing');
    dialog.showModal();
    CN.lockScroll(true);
    // Foco no primeiro controle útil (o botão fechar fica por último na leitura visual)
    const focusTarget = $('[data-autofocus]', dialog) || $('.btn, [data-close]', dialog);
    if (focusTarget) focusTarget.focus({ preventScroll: true });
    dialog.dispatchEvent(new CustomEvent('cn:open'));
  }

  function close(dialog) {
    if (!dialog || !dialog.open || dialog.classList.contains('is-closing')) return;
    const done = () => {
      dialog.classList.remove('is-closing');
      dialog.close();
      CN.lockScroll(false);
      const trigger = lastTrigger.get(dialog);
      if (trigger && typeof trigger.focus === 'function' && document.contains(trigger)) trigger.focus({ preventScroll: true });
      dialog.dispatchEvent(new CustomEvent('cn:close'));
    };
    if (CN.reducedMotion()) { done(); return; }
    dialog.classList.add('is-closing');
    setTimeout(done, 300);
  }

  function wire(dialog) {
    // ESC: intercepta o cancel nativo para animar o fechamento
    dialog.addEventListener('cancel', (e) => { e.preventDefault(); close(dialog); });
    // Clique fora do painel (no backdrop) fecha
    dialog.addEventListener('click', (e) => {
      if (e.target === dialog) close(dialog);
    });
    $$('[data-close]', dialog).forEach((btn) => btn.addEventListener('click', () => close(dialog)));
  }

  /* Modal de produto ---------------------------------------------------------------- */
  function initProductModal() {
    const dialog = $('#product-modal');
    if (!dialog) return;
    const img = $('#pm-img', dialog);
    const fields = {
      category: $('#pm-category', dialog),
      name: $('#pm-name', dialog),
      desc: $('#pm-desc', dialog),
      price: $('#pm-price', dialog)
    };

    $$('[data-product]').forEach((card) => {
      card.addEventListener('click', () => {
        const d = card.dataset;
        img.classList.remove('is-broken');
        img.src = d.img;
        img.alt = d.name;
        fields.category.textContent = d.category;
        fields.name.textContent = d.name;
        fields.desc.textContent = d.desc;
        fields.price.textContent = d.price;
        open(dialog, card);
      });
    });
  }

  CN.dialog = { open, close };

  CN.modal = {
    init() {
      $$('dialog').forEach(wire);
      initProductModal();
    }
  };
})();
