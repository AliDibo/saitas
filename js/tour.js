/* ==========================================================================
   tour.js – İlk ziyarette hızlı gezgin (tur)
   Sırayla bölmeleri ve butonları vurgular, her birini tek cümleyle anlatır.
   Bir kez bitince / geçilince tekrar çıkmaz (localStorage). Kurallar
   penceresindeki "Turu İzle" ile yeniden açılır.
   Bölümler: Adımlar · DOM · Yerleşim · Akış · Klavye · Dışa açılan
   ========================================================================== */
'use strict';

window.AATour = (function () {
  const CFG = window.AA_CONFIG;
  const U = window.AAUtil;
  const KEY = CFG.STORAGE_KEYS.tour;
  const GAP = 14;     // vurgu ile kart arası
  const EDGE = 12;    // ekran kenarı payı
  const PAD = 8;      // vurgunun öğeden taşması

  /* === Adımlar ========================================================= */
  function steps() {
    const pct = Math.round(Math.min(1, Math.max(0, Number(CFG.GAME.guessPenaltyChance) || 0)) * 100);
    return [
      { sel: '.panel-keys', title: 'Harf seç', text: 'Bir harfe bas. Kelimede varsa yeşil daire, yoksa kırmızı çarpı ve 1 can gider.' },
      { sel: '.panel-anim', title: 'saİT darağacında', text: 'Her yanlışta bir parçası kurtulur; 6 can biterse kaybedersin. Doğru harf bir canı geri getirir.' },
      { sel: '.panel-word', title: 'Kelimeyi tahmin et', text: 'Biliyorsan yaz, Tahmin Et\'e bas. Yanlış tahmin %' + pct + ' ihtimalle 1 can götürür.' },
      { sel: '#btn-sound', title: 'Ses', text: 'Müzik + efekt, sadece efekt ya da sessiz.' },
      { sel: '#btn-theme', title: 'Tema', text: 'Açık ya da koyu tema, gözüne hangisi hoş gelirse.' },
      { sel: '#btn-feedback', title: 'Öneri kutusu', text: 'Bir fikrin ya da isteğin mi var? Buradan bize yaz.' },
      { sel: '#btn-rules', title: 'Kurallar', text: 'Tüm ayrıntılar burada. Bu turu da oradan tekrar izleyebilirsin.' },
      { sel: '#btn-restart', title: 'Yeniden Başlat', text: 'İstediğin an yeni kelimeye geç. Hadi, iyi eğlenceler!' }
    ];
  }

  /* === DOM ============================================================= */
  const $ = (id) => document.getElementById(id);
  let el = null;
  function dom() {
    if (el) return el;
    el = {
      root: $('tour'), spot: $('tour-spot'), card: $('tour-card'), step: $('tour-step'),
      title: $('tour-title'), text: $('tour-text'), prev: $('tour-prev'), next: $('tour-next'), skip: $('tour-skip')
    };
    el.prev.addEventListener('click', () => go(index - 1));
    el.next.addEventListener('click', () => go(index + 1));
    el.skip.addEventListener('click', () => finish());
    return el;
  }

  let list = [];
  let index = 0;
  let active = false;
  let raf = 0;
  let lastFocus = null;
  let startScroll = 0;

  /* === Yerleşim ======================================================== */
  const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
  const px = (node, prop, v) => node.style.setProperty(prop, Math.round(v) + 'px'); // CSP: style="" yok

  function target() {
    const node = document.querySelector(list[index].sel);
    return node && node.getClientRects().length ? node : null;
  }

  /** Vurguyu öğenin üstüne, kartı sığan ilk yere koyar: alt → üst → sağ → sol → ekran altı. */
  function place() {
    raf = 0;
    if (!active) return;
    const node = target();
    if (!node) return;
    const vw = document.documentElement.clientWidth;
    const vh = window.innerHeight;
    const r = node.getBoundingClientRect();
    const s = {
      left: clamp(r.left - PAD, 4, vw - 8), top: clamp(r.top - PAD, 4, vh - 8),
      right: clamp(r.right + PAD, 8, vw - 4), bottom: clamp(r.bottom + PAD, 8, vh - 4)
    };
    px(el.spot, 'left', s.left);
    px(el.spot, 'top', s.top);
    px(el.spot, 'width', s.right - s.left);
    px(el.spot, 'height', s.bottom - s.top);

    const cw = el.card.offsetWidth;
    const ch = el.card.offsetHeight;
    const centerX = clamp((s.left + s.right) / 2 - cw / 2, EDGE, vw - cw - EDGE);
    const centerY = clamp((s.top + s.bottom) / 2 - ch / 2, EDGE, vh - ch - EDGE);
    let left;
    let top;
    if (s.bottom + GAP + ch <= vh - EDGE) { left = centerX; top = s.bottom + GAP; }
    else if (s.top - GAP - ch >= EDGE) { left = centerX; top = s.top - GAP - ch; }
    else if (s.right + GAP + cw <= vw - EDGE) { left = s.right + GAP; top = centerY; }
    else if (s.left - GAP - cw >= EDGE) { left = s.left - GAP - cw; top = centerY; }
    else { // hiçbir yere tam sığmıyor (büyük öğe / küçük ekran): boşluğu çok olan tarafa, en az örtecek şekilde
      left = centerX;
      top = (vh - s.bottom) >= s.top ? vh - ch - EDGE : EDGE;
    }
    px(el.card, 'left', left);
    px(el.card, 'top', top);
  }

  function schedule() {
    if (!raf) raf = window.requestAnimationFrame(place);
  }

  /* === Akış ============================================================ */
  function go(i) {
    if (!active) return;
    if (i >= list.length) { finish(); return; }
    index = Math.max(0, i);
    if (!target()) { // öğe yoksa (ör. gizli) sonraki adıma geç
      if (index < list.length - 1) go(index + 1); else finish();
      return;
    }
    const step = list[index];
    el.step.textContent = (index + 1) + ' / ' + list.length;
    el.title.textContent = step.title;
    el.text.textContent = step.text;
    el.prev.classList.toggle('is-hidden', index === 0);
    el.prev.disabled = index === 0;
    el.next.textContent = index === list.length - 1 ? 'Başla!' : 'İleri';

    // Kart her adımda hafifçe yeniden "çizilir"
    el.card.classList.remove('is-pop');
    void el.card.offsetWidth;
    el.card.classList.add('is-pop');

    const node = target();
    const r = node.getBoundingClientRect();
    if (r.top < 0 || r.bottom > window.innerHeight) node.scrollIntoView({ block: 'center' });
    place();
    el.next.focus({ preventScroll: true });
  }

  function start() {
    dom();
    if (active) return;
    list = steps();
    active = true;
    lastFocus = document.activeElement;
    startScroll = window.scrollY;
    el.root.hidden = false;
    void el.root.offsetWidth;
    el.root.classList.add('is-open');
    window.addEventListener('resize', schedule);
    window.addEventListener('scroll', schedule, true);
    document.addEventListener('keydown', onKey, true);
    go(0);
  }

  function finish() {
    if (!active) return;
    active = false;
    U.storage.set(KEY, '1');
    window.removeEventListener('resize', schedule);
    window.removeEventListener('scroll', schedule, true);
    document.removeEventListener('keydown', onKey, true);
    el.root.classList.remove('is-open');
    window.setTimeout(() => { if (!active) el.root.hidden = true; }, 320);
    if (lastFocus && document.contains(lastFocus) && lastFocus.focus) lastFocus.focus({ preventScroll: true });
    window.scrollTo(0, startScroll); // küçük ekranda tur sayfayı kaydırdıysa eski yere dön
  }

  /** İlk ziyaret mi? (bayrak sadece '1' olabilir; başka değer yok sayılır) */
  function maybeStart(delayMs) {
    if (U.storage.get(KEY) === '1') return;
    window.setTimeout(start, delayMs || 0);
  }

  /* === Klavye ========================================================== */
  /* Yakalama aşamasında: tur açıkken oyun klavyesine hiçbir tuş ulaşmaz */
  function onKey(e) {
    if (!active) return;
    if (e.key === 'Escape') { e.preventDefault(); finish(); }
    else if (e.key === 'ArrowRight') { e.preventDefault(); go(index + 1); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); go(index - 1); }
    else if (e.key === 'Tab') {
      const items = [el.skip, el.prev, el.next].filter((b) => !b.disabled);
      const pos = items.indexOf(document.activeElement);
      e.preventDefault();
      const next = pos === -1 ? 0 : (pos + (e.shiftKey ? -1 : 1) + items.length) % items.length;
      items[next].focus();
      return;
    } else if (e.key === 'Enter' || e.key === ' ') {
      return; // odaktaki butonun kendi tıklaması çalışsın
    }
    e.stopPropagation();
  }

  /* === Dışa açılan ===================================================== */
  return { start, maybeStart, isActive: () => active };
})();
