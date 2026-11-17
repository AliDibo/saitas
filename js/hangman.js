/* ==========================================================================
   hangman.js – Adam asmaca animasyonu (hata sayısı 0–6)
   Mod config.js → HANGMAN.mode ile seçilir:
     'svg'      : yerleşik renkli çizim (darağacı + sarıklı adam); parçalar önce
                  çizilir sonra boyanır, doğru harfte tersine silinir
     'frames'   : 7 görsel arasında yumuşak çapraz geçiş
     'sequence' : ayrı ayrı kare dosyaları, kare kare ileri/geri
     'sprite'   : sabit darağacı + tek resimde tüm kareler (sprite sheet),
                  kare kare ileri/geri, hata sayısıyla artan sallanma
     'video'    : tek videoda ilgili zamana yumuşak ileri/geri sarma
   ========================================================================== */
'use strict';

window.AAHangman = (function () {
  const CFG = window.AA_CONFIG.HANGMAN;
  const MAX = window.AA_CONFIG.GAME.maxErrors;
  const SVG_NS = 'http://www.w3.org/2000/svg';

  /* === SVG çizimi (viewBox 0 0 320 430) ================================
     Renkli çizgi film sahnesi: ahşap darağacı, urgan, sarıklı yaşlı adam.
     Her öğe ya dolgulu bir şekil (S: önce dış çizgisi çizilir, sonra içi
     boyanır) ya da sadece çizgi (L: damar, kıvrım, yüz detayı).
     Sahne ve urgan hep görünür; adamın parçaları hata sayısına göre gelir.
     Dizi sırası = çizim (katman) sırası: sonra gelen öndedir. */
  const INK = '#2a1d14';
  const C = {
    wood: '#8b5a2b', woodLight: '#a9733d', woodDark: '#5c3a1a',
    grass: '#6fa64a', soil: '#8a6a40',
    rope: '#c49a5c', ropeDark: '#5b3d1e',
    skin: '#c98a5e', skinDark: '#7a4a2c',
    turban: '#ece3cc', turbanFold: '#b3a483',
    beard: '#f1f0ea', beardLine: '#a8a8a0',
    shirt: '#e9dfc5', shirtFold: '#b9ab8c', grime: '#b8a07a',
    sash: '#3f3a2d', sashDark: '#1f1c15',
    pants: '#e6dcc2', shoe: '#6b4a2e',
    eyeWhite: '#fbf8f1', pupil: '#1d140e', mouth: '#4a2318'
  };
  const S = (d, fill) => ({ k: 's', d, fill });
  const L = (d, color, w) => ({ k: 'l', d, color, w: w || 1.4 });
  // F: çizgisiz renk (leke, göz akı, düğme); o = saydamlık
  const F = (d, fill, o) => ({ k: 'f', d, fill, o: o || 1 });
  const circle = (x, y, r) =>
    'M' + (x - r) + ' ' + y + ' a' + r + ' ' + r + ' 0 1 0 ' + (2 * r) + ' 0 a' + r + ' ' + r + ' 0 1 0 ' + (-2 * r) + ' 0 Z';
  const dot = (x, y, r, fill) => S(circle(x, y, r), fill);
  const spot = (x, y, r, fill, o) => F(circle(x, y, r), fill, o);
  const smudge = (x, y, s) => F('M' + x + ' ' + y + ' c ' + 3 * s + ' ' + -2 * s + ', ' + 7 * s + ' ' + 1 * s + ', ' +
    5 * s + ' ' + 4 * s + ' c ' + -2 * s + ' ' + 3 * s + ', ' + -7 * s + ' ' + 2 * s + ', ' + -5 * s + ' ' + -4 * s + ' Z', C.grime, 0.55);
  // Kafa, boyun (228,140) etrafında bu oranda büyütülür
  const HEAD_SCALE = 1.3;

  // Darağacı + zemin (sabit, oyun başında çizilir)
  const SCENE = [
    S('M8 420 C 24 410, 70 410, 96 418 C 74 426, 26 427, 8 420 Z', C.soil),
    S('M34 44 L60 43 C 61 160, 62 290, 63 414 L36 416 C 36 300, 35 170, 34 44 Z', C.wood),
    S('M34 44 L41 44 C 41 170, 42 300, 43 416 L36 416 C 36 300, 35 170, 34 44 Z', C.woodLight),
    S('M60 112 L104 44 L122 43 L61 134 Z', C.wood),
    S('M20 20 C 100 17, 200 16, 312 14 L313 40 C 200 42, 100 43, 21 46 Z', C.wood),
    S('M20 20 C 100 17, 200 16, 312 14 L312 21 C 200 23, 100 24, 20 27 Z', C.woodLight),
    L('M30 34 C 70 32, 110 35, 150 32', C.woodDark), L('M160 30 C 200 28, 240 31, 302 27', C.woodDark),
    L('M90 40 c 14 -2, 30 -1, 44 -3', C.woodDark), L('M250 36 c 16 -1, 30 -1, 50 -3', C.woodDark),
    L('M49 70 C 47 130, 52 190, 48 250', C.woodDark), L('M55 280 C 53 320, 57 360, 54 400', C.woodDark),
    L('M46 300 c -4 6, -2 14, 4 16 c 4 -3, 4 -12, -4 -16', C.woodDark),
    L('M72 118 L108 52', C.woodDark),
    dot(48, 32, 2.6, C.woodDark), dot(84, 30, 2.6, C.woodDark), dot(47, 126, 2.6, C.woodDark),
    dot(70, 118, 2.2, C.woodDark), dot(290, 28, 2.4, C.woodDark),
    S('M12 419 l5 -11 l3 8 l4 -14 l4 12 l5 -9 l2 9 l6 -15 l3 14 l5 -8 l2 8 l7 -12 l2 12 l5 -7 l2 7 l6 -10 l1 11 l5 -6 l3 6 Z', C.grass)
  ];

  // Urgan: kirişe dolanır, adamla birlikte sallanır (tepesi 228,16 → sallanma noktası)
  const ROPE_PATHS = [
    'M220 12 C 216 22, 220 38, 228 40 C 236 38, 240 24, 234 13',
    'M228 40 C 230 64, 230 92, 240 118',
    'M240 118 C 250 116, 255 126, 252 135 C 249 143, 240 145, 235 140'
  ];
  const ROPE_TICKS = ['M226 54 l5 2', 'M227 68 l5 2', 'M227 82 l5 2', 'M228 96 l5 2'];

  /* Adamın parçaları. st: kaçıncı hatada gelir (1 kafa, 2 gövde, 3 sol kol,
     4 sağ kol, 5 sol bacak, 6 sağ bacak). Katman sırası arkadan öne. */
  const legL = [
    S('M198 284 L226 284 L224 340 C 222 360, 220 372, 222 384 L204 384 C 202 370, 198 356, 197 336 C 196 316, 196 300, 198 284 Z', C.pants),
    L('M203 318 c 6 4, 12 4, 17 0', C.shirtFold), smudge(205, 336, 1.2), L('M205 352 c 5 3, 10 3, 15 0', C.shirtFold),
    S('M204 382 L222 382 C 224 392, 226 402, 222 408 C 214 411, 202 410, 199 404 C 198 396, 201 388, 204 382 Z', C.shoe)
  ];
  const legR = [
    S('M258 284 L230 284 L232 340 C 234 360, 236 372, 234 384 L252 384 C 254 370, 258 356, 259 336 C 260 316, 260 300, 258 284 Z', C.pants),
    L('M253 318 c -6 4, -12 4, -17 0', C.shirtFold), smudge(244, 362, 1.1), L('M251 352 c -5 3, -10 3, -15 0', C.shirtFold),
    S('M252 382 L234 382 C 232 392, 230 402, 234 408 C 242 411, 254 410, 257 404 C 258 396, 255 388, 252 382 Z', C.shoe)
  ];
  const torso = [
    S('M210 140 C 200 142, 192 144, 188 150 L186 210 C 186 245, 188 272, 190 296 L212 291 L228 299 L244 291 L266 296 C 268 272, 270 245, 270 210 L268 150 C 264 144, 256 142, 246 140 C 240 148, 216 148, 210 140 Z', C.shirt),
    L('M216 143 L228 160 L240 143', INK, 1.2), L('M228 160 L228 194', C.shirtFold),
    spot(228, 168, 1.7, C.shirtFold), spot(228, 180, 1.7, C.shirtFold),
    L('M196 240 c 2 18, 4 34, 6 48', C.shirtFold), L('M260 240 c -2 18, -4 34, -6 48', C.shirtFold),
    smudge(198, 168, 1.4), smudge(250, 178, 1.2), smudge(242, 244, 1.6), smudge(214, 186, 0.9),
    smudge(205, 256, 1.5), smudge(250, 266, 1.3), smudge(228, 282, 1.1),
    S('M187 198 C 210 194, 246 194, 270 198 L270 226 C 246 230, 210 230, 187 226 Z', C.sash),
    L('M190 206 C 212 202, 244 202, 268 207', C.sashDark), L('M190 216 C 214 220, 242 214, 268 218', C.sashDark),
    L('M200 224 c 10 -8, 30 -10, 50 -4', C.sashDark)
  ];
  const armL = [
    S('M190 146 C 180 150, 176 160, 175 172 L172 250 C 172 258, 186 260, 190 254 L192 186 C 192 170, 192 156, 190 146 Z', C.shirt),
    L('M172 247 C 178 251, 186 251, 190 249', INK, 1.2), L('M181 170 c -2 20, -3 40, -3 60', C.shirtFold),
    smudge(177, 212, 1.3), smudge(181, 160, 0.9),
    S('M174 256 C 172 266, 174 276, 180 280 C 186 282, 190 276, 190 268 L189 255 Z', C.skin),
    L('M180 269 l1 9', C.skinDark, 1.1), L('M184 267 l1 10', C.skinDark, 1.1)
  ];
  const armR = [
    S('M266 146 C 276 150, 280 160, 281 172 L284 250 C 284 258, 270 260, 266 254 L264 186 C 264 170, 264 156, 266 146 Z', C.shirt),
    L('M284 247 C 278 251, 270 251, 266 249', INK, 1.2), L('M275 170 c 2 20, 3 40, 3 60', C.shirtFold),
    smudge(275, 224, 1.3),
    S('M282 256 C 284 266, 282 276, 276 280 C 270 282, 266 276, 266 268 L267 255 Z', C.skin),
    L('M276 269 l-1 9', C.skinDark, 1.1), L('M272 267 l-1 10', C.skinDark, 1.1)
  ];
  const head = [
    S('M220 128 L236 128 L238 145 L218 145 Z', C.skin),
    S('M216 112 c -6 -1, -8 9, -1 11 Z', C.skin), S('M240 112 c 6 -1, 8 9, 1 11 Z', C.skin),
    S('M215 110 C 214 124, 218 136, 228 138 C 238 136, 242 124, 241 110 C 240 102, 216 102, 215 110 Z', C.skin),
    S('M211 113 C 206 98, 214 86, 228 86 C 243 86, 250 98, 245 113 C 236 108, 220 108, 211 113 Z', C.turban),
    L('M213 104 C 222 98, 236 98, 243 104', C.turbanFold), L('M215 96 C 224 92, 234 92, 241 97', C.turbanFold),
    L('M219 90 c 6 -2, 13 -2, 19 1', C.turbanFold),
    S('M216 122 C 213 140, 215 160, 221 172 C 225 178, 232 178, 236 170 C 242 158, 244 140, 240 122 C 236 132, 220 132, 216 122 Z', C.beard),
    L('M222 145 c 2 8, 1 14, 3 20', C.beardLine), L('M229 142 c 0 10, 1 18, 0 26', C.beardLine),
    L('M235 145 c -1 8, -2 14, -4 19', C.beardLine),
    S('M219 133 C 223 129, 233 129, 237 133 C 233 135, 229 134, 228 133 C 227 134, 223 135, 219 133 Z', C.beard),
    L('M228 115 c -1 5, -3 9, 0 11 c 2 1, 4 0, 4 -1', C.skinDark, 1.2)
  ];
  // Yüz ifadeleri (kafa ile gelir; hangisinin görüneceğini hata sayısı seçer)
  const MOODS = {
    worried: [
      spot(222, 117, 3, C.eyeWhite), spot(234, 117, 3, C.eyeWhite),
      spot(222, 117.6, 1.4, C.pupil), spot(234, 117.6, 1.4, C.pupil),
      L('M217 112 L225 109', INK, 1.3), L('M239 112 L231 109', INK, 1.3),
      L('M223 137 c 2 -2, 3 0, 5 -1 c 2 -1, 3 1, 5 0', C.mouth, 1.5)
    ],
    scared: [
      spot(222, 117, 3.8, C.eyeWhite), spot(234, 117, 3.8, C.eyeWhite),
      spot(222, 117, 1.1, C.pupil), spot(234, 117, 1.1, C.pupil),
      L('M218.5 117 a 3.8 3.8 0 0 1 7 0', INK, 0.9), L('M230.5 117 a 3.8 3.8 0 0 1 7 0', INK, 0.9),
      L('M216 110 L225 105', INK, 1.4), L('M240 110 L231 105', INK, 1.4),
      S('M224 136 c 0 -4, 9 -4, 9 0 c 0 6, -9 6, -9 0 Z', C.mouth)
    ],
    dead: [
      L('M219 118 q 3 2.5 6 0', INK, 1.4), L('M231 118 q 3 2.5 6 0', INK, 1.4),
      L('M218 112 L225 113', INK, 1.3), L('M238 112 L231 113', INK, 1.3),
      L('M223 138 c 3 -1.5, 7 -1.5, 10 0', C.mouth, 1.5)
    ]
  };
  /** Hata sayısına göre yüz ifadesi */
  const moodFor = (n) => (n >= MAX ? 'dead' : n >= 4 ? 'scared' : 'worried');

  let mode = 'svg';
  let root = null;
  let current = 0;
  let stageEls = [];   // svg: her aşamanın <path> listesi | frames: <img> listesi
  let video = null;
  let videoAnim = 0;
  let swayEl = null;   // sallanan öğe: svg'de ip+adam grubu, sprite'ta adam katmanı

  /* === Ortak ============================================================ */
  function mount(container) {
    root = container;
    root.textContent = '';
    mode = ['svg', 'frames', 'sequence', 'sprite', 'video'].includes(CFG.mode) ? CFG.mode : 'svg';
    if ((mode === 'sequence' && !sequenceValid()) || (mode === 'sprite' && !spriteValid())) {
      console.warn('[Adam Asmaca] HANGMAN.' + mode + ' ayarları hatalı, yerleşik çizime dönüldü.');
      mode = 'svg';
    }
    root.style.setProperty('--hm-ms', CFG.transitionMs + 'ms');
    root.dataset.mode = mode;
    root.classList.toggle('hm-invert', mode !== 'svg' && CFG.invertInDark === true);
    if (mode === 'frames') buildFrames();
    else if (mode === 'sequence') buildSequence();
    else if (mode === 'sprite') buildSprite();
    else if (mode === 'video') buildVideo();
    else buildSvg();
  }

  /** Kare tabanlı modların ayarları (sequence / sprite) */
  const frameCfg = () => (mode === 'sprite' ? CFG.sprite : CFG.sequence);

  function setStage(n) {
    const target = Math.max(0, Math.min(MAX, n | 0));
    if (mode === 'frames') showFrame(target);
    else if (mode === 'sequence' || mode === 'sprite') playTo(frameCfg().stageFrames[target]);
    else if (mode === 'video') seekVideo(target);
    else drawSvg(target);
    if (mode === 'sprite' || mode === 'svg') setSwayLevel(target);
    current = target;
  }

  /** Yeni oyun: her şeyi 0'a döndür (svg'de sahneyi yeniden çiz). */
  function reset() {
    if (mode === 'svg') {
      drawSvg(0);
      redrawScene();
    }
    if (mode === 'sequence' || mode === 'sprite') {
      // Yeni oyunda başa geri oynatmak yerine doğrudan ilk kareye atla
      jumpTo(frameCfg().stageFrames[0]);
    }
    stopSway();
    setStage(0);
  }

  /* === SVG modu ========================================================= */
  function el(name, attrs) {
    const n = document.createElementNS(SVG_NS, name);
    Object.keys(attrs || {}).forEach((k) => n.setAttribute(k, attrs[k]));
    return n;
  }

  /** Tanımdan <path> üretir: S → dolgulu şekil, L → sadece çizgi. */
  function makeArt(item, delayMs) {
    const p = el('path', { d: item.d, pathLength: '1' });
    if (item.k === 's') {
      p.setAttribute('class', 'hm-shape');
      p.setAttribute('fill', item.fill);
      p.setAttribute('stroke', INK);
    } else if (item.k === 'f') {
      p.setAttribute('class', 'hm-fill');
      p.setAttribute('fill', item.fill);
      p.style.setProperty('--hm-fo', item.o);
    } else {
      p.setAttribute('class', 'hm-line');
      p.setAttribute('stroke', item.color);
      p.style.setProperty('stroke-width', item.w);
    }
    p.style.setProperty('--hm-delay', delayMs + 'ms');
    return p;
  }

  /** Bir parçanın öğelerini gruba ekler ve aşama listesine kaydeder. */
  function addPart(group, items, stage) {
    items.forEach((item, j) => {
      const p = makeArt(item, Math.min(j * 35, 300));
      group.appendChild(p);
      stageEls[stage].push(p);
    });
  }

  function buildSvg() {
    const svg = el('svg', {
      viewBox: '0 0 320 430', class: 'hm-svg', role: 'img',
      'aria-label': 'Adam asmaca çizimi', preserveAspectRatio: 'xMidYMax meet'
    });

    // Hafif kalem titremesi (çizgileri el çizimi gibi pürüzlü yapar)
    const defs = el('defs');
    const filter = el('filter', { id: 'hm-rough' });
    filter.append(
      el('feTurbulence', { type: 'fractalNoise', baseFrequency: '0.04', numOctaves: '2', seed: '3' }),
      el('feDisplacementMap', { in: 'SourceGraphic', scale: '1.6' })
    );
    defs.appendChild(filter);
    svg.appendChild(defs);

    const art = el('g', { filter: 'url(#hm-rough)' });

    // Sabit sahne: darağacı + zemin
    const scene = el('g', { class: 'hm-scene' });
    SCENE.forEach((item, i) => scene.appendChild(makeArt(item, i * 25)));
    art.appendChild(scene);

    // Sallanan grup: urgan + adam (urganın kirişe bağlandığı yerden döner)
    const swing = el('g', { class: 'hm-swing' });
    const rope = el('g', { class: 'hm-rope' });
    ROPE_PATHS.forEach((d, i) => {
      const delay = SCENE.length * 25 + i * 120;
      rope.appendChild(makeArt(L(d, C.ropeDark, 6.5), delay));
      rope.appendChild(makeArt(L(d, C.rope, 4), delay));
    });
    ROPE_TICKS.forEach((d) => rope.appendChild(makeArt(L(d, C.ropeDark, 1), SCENE.length * 25 + 300)));
    swing.appendChild(rope);

    stageEls = Array.from({ length: MAX + 1 }, () => []);
    const figure = el('g', { class: 'hm-figure' });
    const back = el('g');            // bacaklar gövdenin arkasında
    addPart(back, legL, 5);
    addPart(back, legR, 6);
    figure.appendChild(back);
    const body = el('g');
    addPart(body, torso, 2);
    addPart(body, armL, 3);
    addPart(body, armR, 4);
    figure.appendChild(body);

    // Kafa ayrı grupta: 6. hatada boyun etrafında yana düşer
    const headG = el('g', { class: 'hm-head' });
    const headScaled = el('g', {
      transform: 'translate(228 140) scale(' + HEAD_SCALE + ') translate(-228 -140)'
    });
    addPart(headScaled, head, 1);
    Object.keys(MOODS).forEach((mood) => {
      const g = el('g', { class: 'hm-mood hm-mood-' + mood });
      addPart(g, MOODS[mood], 1);
      headScaled.appendChild(g);
    });
    headG.appendChild(headScaled);
    figure.appendChild(headG);

    swing.appendChild(figure);
    art.appendChild(swing);
    swayEl = swing;
    svg.appendChild(art);
    root.appendChild(svg);
    root.dataset.mood = moodFor(0);
    redrawScene();
  }

  /** Sahneyi ve urganı baştan çizerek gösterir (yeni oyun efekti). */
  function redrawScene() {
    const groups = root.querySelectorAll('.hm-scene, .hm-rope');
    if (!groups.length) return;
    groups.forEach((g) => g.classList.remove('is-drawn'));
    void root.getBoundingClientRect(); // reflow → animasyon yeniden başlasın
    requestAnimationFrame(() => groups.forEach((g) => g.classList.add('is-drawn')));
  }

  function drawSvg(n) {
    stageEls.forEach((paths, i) => {
      paths.forEach((p) => p.classList.toggle('is-drawn', i > 0 && i <= n));
    });
    root.dataset.mood = moodFor(n);
    root.classList.toggle('is-dead', n >= MAX);
  }

  /* === Frames modu (7 görsel) =========================================== */
  function buildFrames() {
    stageEls = CFG.frames.slice(0, MAX + 1).map((src, i) => {
      const img = document.createElement('img');
      img.src = src;
      img.alt = 'Adam asmaca, ' + i + ' hata';
      img.className = 'hm-frame';
      img.decoding = 'async';
      root.appendChild(img);
      return img;
    });
    showFrame(0);
  }

  function showFrame(n) {
    stageEls.forEach((img, i) => img.classList.toggle('is-active', i === n));
  }

  /* === Ortak kare oynatıcı (sequence + sprite) ==========================
     Hedef kareye fps hızında ileri ya da geri kare kare gidilir.
     renderFrame(i): o modun i. kareyi ekrana basma yöntemi. */
  let renderFrame = () => {};
  let curFrame = 0;
  let targetFrame = 0;
  let frameTimer = 0;

  function playTo(frame) {
    targetFrame = frame;
    if (frameTimer) return; // zaten oynuyor; yeni hedefe doğru devam eder
    const stepMs = 1000 / Math.max(1, frameCfg().fps);
    const tick = () => {
      if (curFrame === targetFrame) { frameTimer = 0; return; }
      curFrame += curFrame < targetFrame ? 1 : -1;
      renderFrame(curFrame);
      frameTimer = window.setTimeout(tick, stepMs);
    };
    frameTimer = window.setTimeout(tick, 0);
  }

  function jumpTo(frame) {
    clearTimeout(frameTimer);
    frameTimer = 0;
    curFrame = targetFrame = frame;
    renderFrame(frame);
  }

  /** stageFrames: 7 değer, artan sırada, 0..count-1 aralığında */
  function stageFramesValid(st, count) {
    return Array.isArray(st) && st.length === MAX + 1 &&
      st.every((f, i) => Number.isInteger(f) && f >= 0 && f < count && (i === 0 || f >= st[i - 1]));
  }

  const SAFE_IMG = /^images\/[a-z0-9_\-/]+\.(png|apng|webp|avif|jpe?g|gif|svg)$/;
  const safeImg = (p) => typeof p === 'string' && SAFE_IMG.test(p) && !p.includes('..');

  /* === Sequence modu (ayrı kare dosyaları) ============================== */
  let seqImg = null;
  let seqUrls = [];
  const seqCache = [];

  function sequenceValid() {
    const s = CFG.sequence;
    if (!s || !/^images\/[a-z0-9_\-/]*$/.test(s.folder) || s.folder.includes('..')) return false;
    if (!/^[a-z0-9_\-]*$/.test(s.prefix) || !/^(png|apng|webp|avif|jpe?g|gif|svg)$/.test(s.ext)) return false;
    if (!(s.count > 1 && s.count <= 1000) || !(s.digits >= 0 && s.digits <= 6)) return false;
    return stageFramesValid(s.stageFrames, s.count);
  }

  function buildSequence() {
    const s = CFG.sequence;
    seqUrls = [];
    for (let i = 0; i < s.count; i++) {
      seqUrls.push(s.folder + s.prefix + String(i).padStart(s.digits, '0') + '.' + s.ext);
    }
    // Önbelleğe al (geçişte takılma olmasın)
    seqUrls.forEach((url, i) => {
      const im = new Image();
      im.decoding = 'async';
      im.src = url;
      seqCache[i] = im;
    });
    seqImg = document.createElement('img');
    seqImg.className = 'hm-seq';
    seqImg.alt = 'Adam asmaca animasyonu';
    root.appendChild(seqImg);
    renderFrame = (i) => { seqImg.src = seqUrls[i]; };
    jumpTo(s.stageFrames[0]);
  }

  /* === Sprite modu (sabit darağacı + tek resimde tüm kareler) ===========
     Sprite sheet: kareler soldan sağa, satır satır dizilir (columns sütun).
     Tek karenin boyutu resmin boyutundan hesaplanır. Darağacı ve kare aynı
     en-boy oranında olmalı; ikisi üst üste aynı kutuya oturtulur. */
  let spriteMan = null;
  let spriteRows = 1;

  function spriteValid() {
    const s = CFG.sprite;
    if (!s || !safeImg(s.sheet) || (s.gallows && !safeImg(s.gallows))) return false;
    if (!(Number.isInteger(s.columns) && s.columns >= 1)) return false;
    if (!(Number.isInteger(s.count) && s.count > 1 && s.count <= 400)) return false;
    if (!s.pivot || !(s.pivot.x >= 0 && s.pivot.x <= 100 && s.pivot.y >= 0 && s.pivot.y <= 100)) return false;
    return stageFramesValid(s.stageFrames, s.count);
  }

  function buildSprite() {
    const s = CFG.sprite;
    spriteRows = Math.ceil(s.count / s.columns);

    const stage = document.createElement('div');
    stage.className = 'hm-stage';
    stage.setAttribute('role', 'img');
    stage.setAttribute('aria-label', 'Adam asmaca animasyonu');

    if (s.gallows) {
      const gallows = document.createElement('img');
      gallows.className = 'hm-gallows';
      gallows.alt = '';
      gallows.src = s.gallows;
      gallows.addEventListener('error', () => {
        console.warn('[Adam Asmaca] Darağacı görseli bulunamadı:', s.gallows);
        gallows.hidden = true;
      }, { once: true });
      stage.appendChild(gallows);
    }

    spriteMan = document.createElement('div');
    spriteMan.className = 'hm-man';
    spriteMan.style.setProperty('transform-origin', s.pivot.x + '% ' + s.pivot.y + '%');
    stage.appendChild(spriteMan);
    swayEl = spriteMan;
    root.appendChild(stage);

    // Sheet'i önce yükle: kare oranını hesapla; yoksa yerleşik çizime dön
    const sheet = new Image();
    sheet.onload = () => {
      const ratio = (sheet.naturalWidth / s.columns) / (sheet.naturalHeight / spriteRows);
      root.style.setProperty('--hm-ratio', String(ratio));
      spriteMan.style.setProperty('background-image', 'url("' + new URL(s.sheet, document.baseURI).href + '")');
      spriteMan.style.setProperty('background-size', (s.columns * 100) + '% ' + (spriteRows * 100) + '%');
      renderFrame(curFrame);
    };
    sheet.onerror = () => {
      console.warn('[Adam Asmaca] Sprite sheet bulunamadı, yerleşik çizime dönüldü:', s.sheet);
      stopSway();
      root.textContent = '';
      mode = 'svg';
      root.dataset.mode = mode;
      root.classList.remove('hm-invert');
      buildSvg();
      drawSvg(current);
      setSwayLevel(current);
    };
    sheet.src = s.sheet;

    renderFrame = (i) => {
      const col = i % s.columns;
      const row = Math.floor(i / s.columns);
      const x = s.columns > 1 ? (col / (s.columns - 1)) * 100 : 0;
      const y = spriteRows > 1 ? (row / (spriteRows - 1)) * 100 : 0;
      spriteMan.style.setProperty('background-position', x + '% ' + y + '%');
    };
    jumpTo(s.stageFrames[0]);
  }

  /* === Sallanma (svg + sprite): açı hata sayısıyla orantılı ============
     0 hatada durur, 6 hatada ±maxDeg. Oyun animasyonu sayılır; hareket
     azaltma ayarında da çalışır (kullanıcı isteği). */
  let swayAmp = 0;        // şu anki genlik (derece), hedefe yumuşakça yaklaşır
  let swayTarget = 0;
  let swayRaf = 0;
  let swayLast = 0;

  function setSwayLevel(errors) {
    const sw = CFG.sway || {};
    swayTarget = (Number(sw.maxDeg) || 0) * (errors / MAX);
    if (!swayRaf && swayTarget > 0) {
      swayLast = 0;
      swayRaf = requestAnimationFrame(swayTick);
    }
  }

  function swayTick(now) {
    const period = Math.max(600, Number((CFG.sway || {}).periodMs) || 2800);
    // Genlik ~0,5 sn'de yeni hedefe yaklaşır (kare hızından bağımsız)
    const dt = swayLast ? Math.min(100, now - swayLast) : 16;
    swayLast = now;
    swayAmp += (swayTarget - swayAmp) * (1 - Math.exp(-dt / 250));
    const angle = swayAmp * Math.sin((now / period) * Math.PI * 2);
    swayEl.style.setProperty('transform', 'rotate(' + angle.toFixed(2) + 'deg)');
    if (swayTarget === 0 && swayAmp < 0.05) {
      stopSway();
      return;
    }
    swayRaf = requestAnimationFrame(swayTick);
  }

  function stopSway() {
    cancelAnimationFrame(swayRaf);
    swayRaf = 0;
    swayAmp = 0;
    if (swayEl) swayEl.style.setProperty('transform', 'rotate(0deg)');
  }

  /* === Video modu (scrub) =============================================== */
  function buildVideo() {
    video = document.createElement('video');
    video.className = 'hm-video';
    video.src = CFG.video;
    video.muted = true;
    video.playsInline = true;
    video.preload = 'auto';
    video.setAttribute('aria-label', 'Adam asmaca animasyonu');
    root.appendChild(video);
  }

  function seekVideo(n) {
    if (!video) return;
    const go = () => {
      const dur = video.duration;
      if (!isFinite(dur) || dur <= 0) return;
      const from = video.currentTime;
      const stages = CFG.videoStages;
      const custom = Array.isArray(stages) && stages.length === MAX + 1 && stages.every((t) => typeof t === 'number' && t >= 0);
      const to = Math.min(dur - 0.01, custom ? stages[n] : (n / MAX) * dur);
      const start = performance.now();
      cancelAnimationFrame(videoAnim);
      const step = (now) => {
        const k = Math.min(1, (now - start) / CFG.transitionMs);
        const ease = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
        video.currentTime = from + (to - from) * ease;
        if (k < 1) videoAnim = requestAnimationFrame(step);
      };
      videoAnim = requestAnimationFrame(step);
    };
    if (video.readyState >= 1) go();
    else video.addEventListener('loadedmetadata', go, { once: true });
  }

  return { mount, setStage, reset, get stage() { return current; } };
})();
