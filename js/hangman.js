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
  /* 1920'ler havası: soluk, sararmış, sepyaya kaçan renkler.
     (Ayrıca filtre ile eskitme lekesi ve kâğıt dokusu eklenir.) */
  const INK = '#2b2018';
  const C = {
    wood: '#7d5a3a', woodLight: '#9b7650', woodDark: '#4e3622',
    grass: '#7f9a5a', soil: '#7e6545',
    rope: '#b9975f', ropeDark: '#5a4128',
    skin: '#bf8f6a', skinDark: '#6e4a32',
    turban: '#e3d8bf', turbanFold: '#a8987a',
    beard: '#e9e5da', beardLine: '#a09a8e',
    shirt: '#ddd0b2', shirtFold: '#ab9c7c', grime: '#a88d63',
    sash: '#3d3729', sashDark: '#221e16',
    pants: '#d9ccae', shoe: '#5e4530',
    eyeWhite: '#f4ecdc', pupil: '#1f1610', mouth: '#4a2a1c', sweat: '#a9c4c2'
  };
  // S: dolgulu şekil (w verilirse dış çizgi kalınlığı sabit, yoksa elde çizilmiş gibi değişken)
  const S = (d, fill, w) => ({ k: 's', d, fill, w });
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

  // Urgan çizgisi: koyu kalın alt çizgi + açık renkli üst çizgi (sapma uygulanmaz ki üst üste otursun)
  const R = (d) => [
    { k: 'l', d, color: C.ropeDark, w: 6.5, nj: true },
    { k: 'l', d, color: C.rope, w: 4, nj: true }
  ];
  // Kirişe iki tur sarılı urgan (sabit, sahnenin parçası)
  const ROPE_WRAP = [...R('M221 15 C 223 24, 224 33, 226 42'), ...R('M230 14 C 232 23, 233 32, 235 41')];

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
    ...ROPE_WRAP,
    S('M12 419 l5 -11 l3 8 l4 -14 l4 12 l5 -9 l2 9 l6 -15 l3 14 l5 -8 l2 8 l7 -12 l2 12 l5 -7 l2 7 l6 -10 l1 11 l5 -6 l3 6 Z', C.grass)
  ];

  /* Sallanan urgan (bağlantı noktası 229,40): aşağı iner, sarmal düğüm, altında KAPALI ilmek.
     Kafa çizilince düğüm ve ilmek başın arkasında kalır → kafa ilmeğe girmiş görünür. */
  const ROPE = [
    ...R('M228 108 C 215 111, 214 135, 228 141 C 242 135, 241 111, 228 108 Z'),
    ...R('M229 40 C 231 58, 227 76, 229 92'),
    L('M227 50 l5 2', C.ropeDark, 1), L('M227 62 l5 2', C.ropeDark, 1), L('M227 74 l5 2', C.ropeDark, 1),
    S('M223 91 L234 90 L235 108 L222 109 Z', C.rope, 1.6),
    L('M223 95 L235 94', C.ropeDark, 1.1), L('M222 99.5 L235 98.5', C.ropeDark, 1.1), L('M222 104 L235 103', C.ropeDark, 1.1)
  ];

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
    // boynun sağında görünen düğüm ve başın arkasına giden urgan parçası
    ...R('M246 121 C 246 110, 241 102, 236 97'),
    S('M242 121 L248 120 L249 134 L243 135 Z', C.rope, 1.4),
    L('M242 125 L249 124', C.ropeDark, 1), L('M242.5 129.5 L249 128.5', C.ropeDark, 1),
    S('M220 128 L236 128 L238 145 L218 145 Z', C.skin),
    S('M216 112 c -6 -1, -8 9, -1 11 Z', C.skin), S('M240 112 c 6 -1, 8 9, 1 11 Z', C.skin),
    S('M215 110 C 214 124, 218 136, 228 138 C 238 136, 242 124, 241 110 C 240 102, 216 102, 215 110 Z', C.skin),
    S('M211 113 C 206 98, 214 86, 228 86 C 243 86, 250 98, 245 113 C 236 108, 220 108, 211 113 Z', C.turban),
    L('M213 104 C 222 98, 236 98, 243 104', C.turbanFold), L('M215 96 C 224 92, 234 92, 241 97', C.turbanFold),
    L('M219 90 c 6 -2, 13 -2, 19 1', C.turbanFold),
    S('M216 122 C 213 140, 214 158, 219 167 l 2 6 l 2 -4 l 3 8 l 3 -6 l 2 5 l 3 -8 C 241 158, 244 140, 240 122 C 236 132, 220 132, 216 122 Z', C.beard),
    L('M222 145 c 2 8, 1 14, 3 20', C.beardLine), L('M229 142 c 0 10, 1 18, 0 26', C.beardLine),
    L('M235 145 c -1 8, -2 14, -4 19', C.beardLine),
    S('M219 133 C 223 129, 233 129, 237 133 C 233 135, 229 134, 228 133 C 227 134, 223 135, 219 133 Z', C.beard),
    L('M228 115 c -1 5, -3 9, 0 11 c 2 1, 4 0, 4 -1', C.skinDark, 1.2)
  ];
  /* Yüz ifadeleri (kafa ile gelir; hangisinin görüneceğini hata sayısı seçer).
     Hata arttıkça: kaşlar kalkar, gözler büyür, bebekler küçülür, ağız açılır,
     ter damlaları çıkar; 5. hatada adam titrer, 6. hatada gözler kapanır. */
  const eye = (x, r) => S(circle(x, 117, r), C.eyeWhite, 0.9);
  const pupil = (x, r, dx) => F(circle(x + (dx || 0), 117.4, r), C.pupil);
  const brows = (yo, yi) => [L('M216.5 ' + yo + ' L225 ' + yi, INK, 1.5), L('M239.5 ' + yo + ' L231 ' + yi, INK, 1.5)];
  const drop = (x, y) => S('M' + x + ' ' + y + ' c -2 3, -3 5, -1.2 6.6 c 1.8 1.2, 4 -0.4, 3.2 -2.8 c -0.5 -1.5, -1.4 -2.6, -2 -3.8 Z', C.sweat, 0.8);
  const MOODS = {
    m1: [eye(222, 2.8), eye(234, 2.8), pupil(222, 1.4), pupil(234, 1.4),
      ...brows(111.5, 110.5),
      L('M224 137 q 4 -0.8 8 0', C.mouth, 1.5)],
    m2: [eye(222, 3.1), eye(234, 3.1), pupil(222, 1.3), pupil(234, 1.3),
      ...brows(112, 108.5),
      L('M223 137 c 2 -2, 3 0, 5 -1 c 2 -1, 3 1, 5 0', C.mouth, 1.5)],
    m3: [eye(222, 3.5), eye(234, 3.5), pupil(222, 1.1, 0.9), pupil(234, 1.1, 0.9),
      ...brows(111, 106.5),
      S('M225 136 c 0 -2.5, 6 -2.5, 6 0 c 0 3.5, -6 3.5, -6 0 Z', C.mouth, 1),
      drop(246, 106)],
    m4: [eye(222, 3.9), eye(234, 3.9), pupil(222, 0.95), pupil(234, 0.95),
      ...brows(109.5, 104.5),
      L('M218.5 122.5 q 3.5 1.5 7 0', C.skinDark, 0.8), L('M230.5 122.5 q 3.5 1.5 7 0', C.skinDark, 0.8),
      S('M224 135.5 c 0 -4, 9 -4, 9 0 c 0 6, -9 6, -9 0 Z', C.mouth, 1),
      drop(246, 104), drop(210, 110)],
    m5: [eye(222, 4.3), eye(234, 4.3), pupil(222, 0.8), pupil(234, 0.8),
      ...brows(108, 102.5),
      L('M218 123 q 4 2 8 0', C.skinDark, 0.9), L('M230 123 q 4 2 8 0', C.skinDark, 0.9),
      S('M223.5 134.5 c 0 -5, 10 -5, 10 0 c 0 9, -10 9, -10 0 Z', C.mouth, 1),
      F('M225.5 141 c 2 -1.5, 4 -1.5, 6 0 c -1 1.5, -5 1.5, -6 0 Z', '#9a4a3a'),
      drop(247, 103), drop(209, 108), drop(244, 124)],
    // rahatlamış: kurtulmak üzere (ters oyunda 5. yanlışta)
    m0: [eye(222, 2.7), eye(234, 2.7), pupil(222, 1.4), pupil(234, 1.4),
      ...brows(110.5, 111),
      L('M222.5 136 q 5.5 4 11 0', C.mouth, 1.6)],
    dead: [L('M219 118 q 3 2.5 6 0', INK, 1.5), L('M231 118 q 3 2.5 6 0', INK, 1.5),
      ...brows(112, 113),
      L('M223 138 c 3 -1.5, 7 -1.5, 10 0', C.mouth, 1.6)]
  };
  /** Ters oyun mu? (config.js → HANGMAN.reverse) */
  const REVERSE = CFG.reverse === true;

  /**
   * Hata sayısına göre yüz ifadesi.
   * Klasik: 1..5 → m1..m5 (korku artar), 6 → baygın.
   * Ters: 0 hata = tam asılı ve dehşette (m5); her yanlışta korku azalır
   *       (m4, m3, m2, m1), 5. yanlışta rahatlamış (m0); 6'da kafa da gitmiştir.
   */
  const moodFor = (errors) => {
    if (REVERSE) return 'm' + Math.max(0, MAX - 1 - errors);
    return errors >= MAX ? 'dead' : 'm' + Math.max(1, errors);
  };

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

  /** Hata sayısı → gösterilecek aşama (ters oyunda 0 hata = tam adam). */
  const shownFor = (errors) => (REVERSE ? MAX - errors : errors);

  function setStage(n) {
    const errors = Math.max(0, Math.min(MAX, n | 0));
    const shown = shownFor(errors);
    if (mode === 'frames') showFrame(shown);
    else if (mode === 'sequence' || mode === 'sprite') playTo(frameCfg().stageFrames[shown]);
    else if (mode === 'video') seekVideo(shown);
    else drawSvg(shown, errors);
    if (mode === 'sprite' || mode === 'svg') setSwayLevel(errors);
    current = errors;
  }

  /** Yeni oyun: her şeyi 0'a döndür (svg'de sahneyi yeniden çiz). */
  function reset() {
    if (mode === 'svg') {
      drawSvg(0, 0);   // önce her şeyi sil; setStage(0) aşağıda başlangıç hâlini çizer
      redrawScene();
    }
    if (mode === 'sequence' || mode === 'sprite') {
      // Yeni oyunda başa geri oynatmak yerine doğrudan başlangıç karesine atla
      jumpTo(frameCfg().stageFrames[shownFor(0)]);
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

  let artCount = 0;   // değişken çizgi kalınlığı için sayaç (her seferinde aynı sonuç)

  /* Sabit tohumlu rastgele sayı: çizim her açılışta aynı "kusurlarla" çıkar. */
  let seed = 20261117;
  function rand() {
    seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /**
   * Elde çizilmiş gibi: yoldaki her koordinatı ±amp kadar oynatır. Küçük sayılar
   * (göreli adımlar) daha az oynar ki şekil bozulmasın. Yay (a/A) içeren yollara
   * (daire) dokunulmaz.
   */
  function jitter(d, amp) {
    if (!amp || /[aA]/.test(d)) return d;
    return d.replace(/-?\d*\.?\d+/g, (num) => {
      const n = parseFloat(num);
      const a = Math.abs(n) > 20 ? amp : amp * 0.35;
      return (n + (rand() * 2 - 1) * a).toFixed(1);
    });
  }

  /**
   * Tanımdan öğe(ler) üretir: S → dolgulu şekil (+ üstünden ikinci kez geçilmiş
   * gibi hafif kaymış ince kalem çizgisi), L → sadece çizgi, F → çizgisiz renk.
   * Her zaman dizi döner.
   */
  function makeArt(item, delayMs, amp) {
    artCount++;
    const wobble = item.nj ? 0 : (amp || 0);
    const p = el('path', { d: jitter(item.d, wobble), pathLength: '1' });
    if (item.k === 's') {
      p.setAttribute('class', 'hm-shape');
      p.setAttribute('fill', item.fill);
      p.setAttribute('stroke', INK);
      // El çizimi: kalınlık şekilden şekle değişir (1.6–2.8)
      p.style.setProperty('stroke-width', item.w || (1.6 + ((artCount * 37) % 13) / 10));
      p.style.setProperty('--hm-delay', delayMs + 'ms');
      if (item.w) return [p];
      // İkinci kalem geçişi ilkinden farklı sapar (üst üste tam oturmaz)
      const sketch = el('path', {
        d: jitter(item.d, wobble * 1.3), pathLength: '1', class: 'hm-line hm-sketch', stroke: INK,
        transform: 'translate(' + (0.6 + (artCount % 3) * 0.3) + ' ' + (0.4 + (artCount % 2) * 0.5) + ')'
      });
      sketch.style.setProperty('stroke-width', '0.8');
      sketch.style.setProperty('--hm-delay', (delayMs + 90) + 'ms');
      return [p, sketch];
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
    return [p];
  }

  /** Bir parçanın öğelerini gruba ekler ve aşama listesine kaydeder. */
  function addPart(group, items, stage, amp) {
    items.forEach((item, j) => {
      const parts = makeArt(item, Math.min(j * 35, 300), amp);
      group.append(...parts);
      stageEls[stage].push(...parts);
    });
  }

  function buildSvg() {
    seed = 20261117;   // her kurulumda aynı kusurlar
    artCount = 0;
    const svg = el('svg', {
      viewBox: '0 0 320 430', class: 'hm-svg', role: 'img',
      'aria-label': 'Adam asmaca çizimi', preserveAspectRatio: 'xMidYMax meet'
    });

    /* Eskitme filtresi:
       1) titreme: çizgiler kusursuz değil, elde çizilmiş gibi dalgalı
       2) sepya: renkler sararmış / solmuş
       3) leke: büyük, düzensiz koyulaşmalar (eski baskı)
       4) doku: ince kâğıt tanesi
       Leke ve doku sadece çizimin üstüne biner (arka plan temiz kalır). */
    const defs = el('defs');
    const filter = el('filter', { id: 'hm-rough', x: '-4%', y: '-4%', width: '108%', height: '108%' });
    filter.append(
      el('feTurbulence', { type: 'fractalNoise', baseFrequency: '0.035', numOctaves: '2', seed: '3', result: 'warp' }),
      el('feDisplacementMap', { in: 'SourceGraphic', in2: 'warp', scale: '2.6', xChannelSelector: 'R', yChannelSelector: 'G', result: 'drawn' }),
      el('feColorMatrix', { in: 'drawn', type: 'matrix', result: 'aged',
        values: '0.78 0.22 0.06 0 0.03  0.16 0.76 0.08 0 0.02  0.12 0.18 0.58 0 0.01  0 0 0 1 0' }),
      el('feTurbulence', { type: 'fractalNoise', baseFrequency: '0.014', numOctaves: '2', seed: '11', result: 'blot' }),
      el('feColorMatrix', { in: 'blot', type: 'matrix', result: 'blotCol',
        values: '0 0 0 0 0.42  0 0 0 0 0.3  0 0 0 0 0.18  1 0 0 0 -0.45' }),
      el('feComposite', { in: 'blotCol', in2: 'drawn', operator: 'in', result: 'blotIn' }),
      el('feTurbulence', { type: 'fractalNoise', baseFrequency: '0.85', numOctaves: '1', seed: '7', result: 'grain' }),
      el('feColorMatrix', { in: 'grain', type: 'matrix', result: 'grainCol',
        values: '0 0 0 0 0.3  0 0 0 0 0.22  0 0 0 0 0.12  0.7 0 0 0 -0.32' }),
      el('feComposite', { in: 'grainCol', in2: 'drawn', operator: 'in', result: 'grainIn' })
    );
    const merge = el('feMerge');
    ['aged', 'blotIn', 'grainIn'].forEach((name) => merge.appendChild(el('feMergeNode', { in: name })));
    filter.appendChild(merge);
    defs.appendChild(filter);
    svg.appendChild(defs);

    const art = el('g', { filter: 'url(#hm-rough)' });

    // Sabit sahne: darağacı + zemin
    const scene = el('g', { class: 'hm-scene' });
    SCENE.forEach((item, i) => scene.append(...makeArt(item, i * 25, 1.1)));
    art.appendChild(scene);

    // Sallanan grup: urgan + adam (urganın kirişe bağlandığı yerden döner)
    const swing = el('g', { class: 'hm-swing' });
    const rope = el('g', { class: 'hm-rope' });
    ROPE.forEach((item, i) => rope.append(...makeArt(item, SCENE.length * 25 + i * 40, 0.6)));
    swing.appendChild(rope);

    stageEls = Array.from({ length: MAX + 1 }, () => []);
    /* Her uzuv kendi grubunda: sallanırken gövde urgandan, kollar ve bacaklar
       gövdeden biraz geriden gelir (bkz. applyLimbSway). Katman sırası:
       bacaklar → gövde → kollar → kafa. */
    const figure = el('g', { class: 'hm-figure' });
    const part = (items, stage, amp) => {
      const g = el('g');
      addPart(g, items, stage, amp);
      figure.appendChild(g);
      return g;
    };
    limbEls = { figure };
    limbEls.legL = part(legL, 5, 1.4);
    limbEls.legR = part(legR, 6, 1.4);
    part(torso, 2, 1.4);
    limbEls.armL = part(armL, 3, 1.4);
    limbEls.armR = part(armR, 4, 1.4);

    // Kafa ayrı grupta: 6. hatada boyun etrafında yana düşer; dış grup sallanma gecikmesi için
    limbEls.head = el('g');
    const headG = el('g', { class: 'hm-head' });
    const headScaled = el('g', {
      transform: 'translate(228 140) scale(' + HEAD_SCALE + ') translate(-228 -140)'
    });
    addPart(headScaled, head, 1, 0.8);
    Object.keys(MOODS).forEach((mood) => {
      const g = el('g', { class: 'hm-mood hm-mood-' + mood });
      addPart(g, MOODS[mood], 1, 0.3);
      headScaled.appendChild(g);
    });
    headG.appendChild(headScaled);
    limbEls.head.appendChild(headG);
    figure.appendChild(limbEls.head);

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

  /** shown: kaç parça görünsün (1 kafa … 6 sağ bacak); errors: yüz ifadesi için hata sayısı. */
  function drawSvg(shown, errors) {
    stageEls.forEach((paths, i) => {
      paths.forEach((p) => p.classList.toggle('is-drawn', i > 0 && i <= shown));
    });
    root.dataset.mood = moodFor(errors);
    // Baş yana düşmesi sadece klasik oyunda (6. hatada baygın)
    root.classList.toggle('is-dead', !REVERSE && errors >= MAX);
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

  /* === Sallanma (svg + sprite) ===========================================
     Ters oyunda: adam tam asılıyken en güçlü (±maxDeg), her yanlışta azalır.
     Klasik oyunda: 0 hatada durur, 6 hatada ±maxDeg.
     Yerleşik çizimde beden tek blok gibi dönmez: urgan önden gider, gövde
     boyundan, kollar omuzdan, bacaklar kalçadan gecikmeyle takip eder (doğal
     bükülme); sarkaç hafif düzensizdir ve beden yavaşça kendi etrafında döner.
     Oyun animasyonu sayılır; hareket azaltma ayarında da çalışır (kullanıcı isteği). */
  let swayAmp = 0;        // şu anki genlik (derece), hedefe yumuşakça yaklaşır
  let swayTarget = 0;
  let swayRaf = 0;
  let swayLast = 0;
  let limbEls = null;     // svg: { figure, armL, armR, legL, legR, head } grupları

  function setSwayLevel(errors) {
    const sw = CFG.sway || {};
    const level = REVERSE ? 1 - 0.8 * (errors / MAX) : errors / MAX;
    swayTarget = (Number(sw.maxDeg) || 0) * level;
    if (!swayRaf && swayTarget > 0) {
      swayLast = 0;
      swayRaf = requestAnimationFrame(swayTick);
    }
  }

  /** Sarkaç biçimi: ana salınım + yavaş, uyumsuz ikinci bir dalga (tekdüze olmasın) */
  const pendulum = (ph) => Math.sin(ph) + 0.12 * Math.sin(0.43 * ph + 1.3);

  /* Menteşe noktaları (viewBox birimi) ve ne kadar geriden geldikleri:
     lag: gecikme (ms), follow: urganı ne kadar takip ettiği (1 = hiç bükülmez) */
  const HINGES = {
    figure: { x: 230, y: 128, lag: 240, follow: 0.55 },  // boyun / ilmek
    head:   { x: 228, y: 140, lag: 140, follow: 0.75 },
    armL:   { x: 189, y: 150, lag: 420, follow: 0.25 },  // omuzlar
    armR:   { x: 267, y: 150, lag: 460, follow: 0.25 },
    legL:   { x: 212, y: 286, lag: 380, follow: 0.35 },  // kalça
    legR:   { x: 244, y: 286, lag: 410, follow: 0.35 }
  };

  /** Uzuvlara gecikmeli dönüş uygular. Mutlak açı = urgan + (geciken açı − urgan) × (1 − follow). */
  function applyLimbSway(now, period, rope) {
    const w = (Math.PI * 2) / period;
    const abs = (h) => {
      const lagged = swayAmp * pendulum((now - h.lag) * w);
      return rope + (lagged - rope) * (1 - h.follow);
    };
    const body = abs(HINGES.figure);
    // Beden yavaşça kendi ekseninde döner gibi: yatayda çok hafif daralıp genişler
    const twist = 1 - 0.035 * (swayAmp / ((CFG.sway || {}).maxDeg || 10)) * (0.5 + 0.5 * Math.sin(now * w * 0.37 + 0.8));
    const f = HINGES.figure;
    limbEls.figure.setAttribute('transform',
      'rotate(' + (body - rope).toFixed(2) + ' ' + f.x + ' ' + f.y + ') ' +
      'translate(228 0) scale(' + twist.toFixed(4) + ' 1) translate(-228 0)');
    ['head', 'armL', 'armR', 'legL', 'legR'].forEach((name) => {
      const h = HINGES[name];
      limbEls[name].setAttribute('transform', 'rotate(' + (abs(h) - body).toFixed(2) + ' ' + h.x + ' ' + h.y + ')');
    });
  }

  function swayTick(now) {
    const period = Math.max(600, Number((CFG.sway || {}).periodMs) || 2800);
    const dt = swayLast ? Math.min(100, now - swayLast) : 16;
    swayLast = now;
    // Genlik artarken ~0,4 sn'de, azalırken sönümlenen bir sarkaç gibi ~1,2 sn'de yeni hedefe varır
    const tau = swayTarget > swayAmp ? 400 : 1200;
    swayAmp += (swayTarget - swayAmp) * (1 - Math.exp(-dt / tau));
    const angle = swayAmp * pendulum((now / period) * Math.PI * 2);
    swayEl.style.setProperty('transform', 'rotate(' + angle.toFixed(2) + 'deg)');
    if (mode === 'svg' && limbEls) applyLimbSway(now, period, angle);
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
    if (limbEls) Object.values(limbEls).forEach((g) => g.removeAttribute('transform'));
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
