/* ==========================================================================
   hangman.js – Adam asmaca animasyonu (hata sayısı 0–6)
   Mod config.js → HANGMAN.mode ile seçilir:
     'svg'      : yerleşik kalem çizimi; parçalar çizilerek gelir, silinerek gider
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
     Her eleman bir kalem darbesi. SCENE hep görünür (oyun başında çizilir),
     STAGES[n] hata sayısı n'ye ulaşınca çizilir. */
  const SCENE = [
    // zemin
    'M4 402 C 60 397, 120 405, 180 400 S 270 397, 316 402',
    // çimen
    'M38 401 l-3 -11', 'M88 401 l4 -8 l4 9', 'M226 401 l4 -9 l4 9', 'M300 401 l2 -9',
    // darağacı direği, kirişi, payandası
    'M70 401 C 68 300, 73 190, 69 58',
    'M60 60 C 110 57, 160 62, 206 58',
    'M70 104 C 82 90, 94 76, 106 61',
    // ağaç gövdesi
    'M238 401 C 236 360, 242 320, 236 272',
    'M264 401 C 266 360, 259 320, 265 272',
    // ağaç tepesi (bulut)
    'M236 272 C 212 274, 202 256, 212 243 C 196 232, 202 208, 220 205 C 214 186, 232 172, 249 180 ' +
      'C 257 162, 284 165, 287 183 C 305 184, 310 206, 298 216 C 312 231, 302 254, 284 253 ' +
      'C 287 268, 272 277, 265 272',
    // dallar ve yaprak izleri
    'M250 272 C 250 256, 246 246, 239 236', 'M256 262 C 262 250, 270 244, 278 236',
    'M224 226 c 3 -6, 7 -10, 12 -12', 'M286 202 c -2 -5, -5 -8, -10 -10'
  ];

  // İp sahneyle birlikte çizilir ama adamla birlikte sallanır (tepesi kirişte, 170,59)
  const ROPE = 'M170 59 C 172 72, 168 86, 170 100';

  const STAGES = [
    [], // 0 hata: sadece sahne
    ['M171 100 C 185 100, 194 110, 193 123 C 192 137, 182 146, 169 145 C 156 145, 147 135, 148 122 C 148 109, 157 100, 173 102'], // kafa
    ['M170 145 C 172 170, 168 196, 170 222'],                // gövde
    ['M170 162 C 160 172, 151 182, 141 195'],                // sol kol
    ['M170 162 C 180 172, 189 182, 199 195'],                // sağ kol
    ['M170 222 C 163 237, 155 250, 145 266'],                // sol bacak
    ['M170 222 C 177 237, 185 250, 195 266',                 // sağ bacak
     'M159 115 l7 7', 'M166 115 l-7 7', 'M174 115 l7 7', 'M181 115 l-7 7', // çarpı gözler
     'M160 136 q 10 -7 20 0']                                // üzgün ağız
  ];

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
  function makePath(d, cls) {
    const p = document.createElementNS(SVG_NS, 'path');
    p.setAttribute('d', d);
    p.setAttribute('pathLength', '1');
    p.setAttribute('class', cls);
    return p;
  }

  function buildSvg() {
    const svg = document.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('viewBox', '0 0 320 430');
    svg.setAttribute('class', 'hm-svg');
    svg.setAttribute('role', 'img');
    svg.setAttribute('aria-label', 'Adam asmaca çizimi');
    svg.setAttribute('preserveAspectRatio', 'xMidYMax meet');

    // Kalem titremesi filtresi (çizgileri el çizimi gibi pürüzlü yapar)
    const defs = document.createElementNS(SVG_NS, 'defs');
    const filter = document.createElementNS(SVG_NS, 'filter');
    filter.setAttribute('id', 'hm-rough');
    const turb = document.createElementNS(SVG_NS, 'feTurbulence');
    turb.setAttribute('type', 'fractalNoise');
    turb.setAttribute('baseFrequency', '0.04');
    turb.setAttribute('numOctaves', '2');
    turb.setAttribute('seed', '3');
    const disp = document.createElementNS(SVG_NS, 'feDisplacementMap');
    disp.setAttribute('in', 'SourceGraphic');
    disp.setAttribute('scale', '2.2');
    filter.append(turb, disp);
    defs.appendChild(filter);
    svg.appendChild(defs);

    const art = document.createElementNS(SVG_NS, 'g');
    art.setAttribute('filter', 'url(#hm-rough)');

    const scene = document.createElementNS(SVG_NS, 'g');
    scene.setAttribute('class', 'hm-scene');
    SCENE.forEach((d, i) => {
      const p = makePath(d, 'hm-stroke');
      p.style.setProperty('--hm-delay', (i * 45) + 'ms');
      scene.appendChild(p);
    });
    art.appendChild(scene);

    // Sallanan grup: ip + adam
    const swing = document.createElementNS(SVG_NS, 'g');
    swing.setAttribute('class', 'hm-swing');
    const rope = makePath(ROPE, 'hm-stroke hm-rope');
    rope.style.setProperty('--hm-delay', (SCENE.length * 45) + 'ms');
    swing.appendChild(rope);

    const figure = document.createElementNS(SVG_NS, 'g');
    figure.setAttribute('class', 'hm-figure');
    stageEls = STAGES.map((paths) => paths.map((d, j) => {
      const p = makePath(d, 'hm-stroke hm-part');
      p.style.setProperty('--hm-delay', (j * 90) + 'ms');
      figure.appendChild(p);
      return p;
    }));
    swing.appendChild(figure);
    art.appendChild(swing);
    swayEl = swing;
    svg.appendChild(art);
    root.appendChild(svg);
    redrawScene();
  }

  /** Sahneyi baştan çizerek gösterir (yeni oyun efekti). */
  function redrawScene() {
    const scene = root.querySelector('.hm-scene');
    const rope = root.querySelector('.hm-rope');
    if (!scene) return;
    scene.classList.remove('is-drawn');
    rope.classList.remove('is-drawn');
    void scene.getBoundingClientRect(); // reflow → animasyon yeniden başlasın
    requestAnimationFrame(() => {
      scene.classList.add('is-drawn');
      rope.classList.add('is-drawn');
    });
  }

  function drawSvg(n) {
    stageEls.forEach((paths, i) => {
      paths.forEach((p) => p.classList.toggle('is-drawn', i > 0 && i <= n));
    });
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
