/* theme-init.js – Kayıtlı temayı sayfa çizilmeden uygular (varsayılan: koyu).
   Anahtar adı config.js → STORAGE_KEYS.theme ile aynı olmalı. */
'use strict';
(function () {
  try {
    var t = window.localStorage.getItem('aa_theme');
    if (t === 'light' || t === 'dark') document.documentElement.setAttribute('data-theme', t);
  } catch (e) { /* depolama kapalı → varsayılan */ }
})();
