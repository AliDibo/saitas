/* ==========================================================================
   game.js – Oyun mantığı ve arayüz
   Bölümler: Durum · DOM · Kelime listesi · Klavye · Oyun akışı · Tahmin ·
   Sonuç ekranı · Kurallar · Öneri kutusu · Tema ve ses · Giriş ekranı ·
   Fiziksel klavye · Başlat
   ========================================================================== */
'use strict';

(function () {
  const CFG = window.AA_CONFIG;
  const U = window.AAUtil;
  const Sound = window.AAAudio;
  const Hangman = window.AAHangman;
  const Tour = window.AATour;
  const G = CFG.GAME;
  const SVG_NS = 'http://www.w3.org/2000/svg';

  /* === Durum =========================================================== */
  const state = {
    words: [],
    word: '',
    errors: 0,
    guessed: new Set(),      // basılmış harfler
    wrongGuesses: new Set(), // yanlış tahmin edilen kelimeler
    over: true,
    started: false           // giriş ekranı geçildi mi
  };
  let rulesCache = null;
  let toastTimer = 0;

  /* === DOM ============================================================== */
  const $ = (id) => document.getElementById(id);
  const el = {
    logo: $('logo'),
    hangman: $('hangman'),
    errorCount: $('error-count'),
    keyboard: $('keyboard'),
    word: $('word'),
    guessForm: $('guess-form'),
    guessInput: $('guess-input'),
    guessHint: $('guess-hint'),
    wrongList: $('wrong-list'),
    btnRules: $('btn-rules'),
    btnRestart: $('btn-restart'),
    btnSound: $('btn-sound'),
    btnTheme: $('btn-theme'),
    toast: $('toast'),
    toastText: $('toast-text'),
    toastClose: $('toast-close'),
    intro: $('intro'),
    introBg: $('intro-bg'),
    introBtn: $('intro-btn'),
    introBtnImg: $('intro-btn-img'),
    result: $('result'),
    resultGif: $('result-gif'),
    resultWord: $('result-word'),
    resultRestart: $('result-restart'),
    modal: $('rules-modal'),
    rulesContent: $('rules-content'),
    rulesClose: $('rules-close'),
    rulesTour: $('rules-tour'),
    btnFeedback: $('btn-feedback'),
    fbModal: $('feedback-modal'),
    fbForm: $('feedback-form'),
    fbCategory: $('feedback-category'),
    fbMessage: $('feedback-message'),
    fbCount: $('feedback-count'),
    fbWebsite: $('feedback-website'),
    fbStatus: $('feedback-status'),
    fbSend: $('feedback-send'),
    fbClose: $('feedback-close')
  };
  const keyButtons = new Map(); // harf → buton

  /** Gizli bir öğeyi gösterip bir sonraki karede sınıf ekler (CSS geçişi için). */
  function showWithTransition(node, cls) {
    node.hidden = false;
    void node.offsetWidth; // reflow
    node.classList.add(cls);
  }

  /** Sınıfı kaldırır, geçiş bitince öğeyi gizler. */
  function hideWithTransition(node, cls, ms) {
    node.classList.remove(cls);
    window.setTimeout(() => {
      if (!node.classList.contains(cls)) node.hidden = true;
    }, ms);
  }

  function showToast(message) {
    el.toastText.textContent = message;
    el.toast.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => { el.toast.hidden = true; }, 9000);
  }

  /* === Kelime listesi ================================================== */
  function parseWords(text) {
    const out = new Set();
    for (const line of text.split(/\r?\n/)) {
      const w = U.upperTR(line.trim());
      if (w.length >= G.minLength && w.length <= G.maxLength && U.isTurkishWord(w)) out.add(w);
    }
    return Array.from(out);
  }

  async function loadWords() {
    try {
      const words = parseWords(await U.fetchText(CFG.FILES.words));
      if (!words.length) throw new Error('words.txt içinde uygun kelime yok');
      state.words = words;
    } catch (err) {
      state.words = parseWords(CFG.FALLBACK_WORDS.join('\n'));
      const reason = location.protocol === 'file:'
        ? 'Sayfa doğrudan dosyadan açıldı.'
        : 'words.txt okunamadı.';
      showToast('⚠️ ' + reason + ' Yedek kelime listesi kullanılıyor (README\'ye bak).');
      console.warn('[Adam Asmaca]', err.message);
    }
  }

  /** Kullanılmamış rastgele kelime seçer; liste bitince sıfırlar. */
  function pickWord() {
    const key = CFG.STORAGE_KEYS.used;
    const isValid = (v) => Array.isArray(v) && v.every((x) => typeof x === 'string');
    const all = new Set(state.words);
    // Listede artık olmayan eski kayıtları ayıkla
    let used = (U.storage.getJSON(key, isValid) || []).filter((w) => all.has(w));
    let pool = state.words.filter((w) => !used.includes(w));

    if (!pool.length) {
      // Tüm liste kullanıldı → sıfırla (az önceki kelime hemen tekrar gelmesin)
      const last = used[used.length - 1];
      used = [];
      pool = state.words.length > 1 ? state.words.filter((w) => w !== last) : state.words.slice();
    }
    const word = pool[U.randomInt(pool.length)];
    used.push(word);
    U.storage.setJSON(key, used);
    return word;
  }

  /* === Klavye ========================================================== */
  function svgPath(d, cls) {
    const p = document.createElementNS(SVG_NS, 'path');
    p.setAttribute('d', d);
    p.setAttribute('pathLength', '1');
    p.setAttribute('class', cls);
    return p;
  }

  function buildKeyboard() {
    const frag = document.createDocumentFragment();
    for (const letter of G.alphabet) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'key';
      btn.dataset.letter = letter;
      btn.setAttribute('aria-label', 'Harf ' + letter);

      const span = document.createElement('span');
      span.className = 'key-letter';
      span.textContent = letter;

      // Doğru → yeşil daire, yanlış → kırmızı çarpı (çizilerek gelir)
      const mark = document.createElementNS(SVG_NS, 'svg');
      mark.setAttribute('class', 'key-mark');
      mark.setAttribute('viewBox', '-6 -6 112 112');
      mark.setAttribute('aria-hidden', 'true');
      // Marker darbeleri: daire başlangıcını geçip hafif dışarı taşar, çarpı kolları eğri
      const ink = document.createElementNS(SVG_NS, 'g');
      ink.setAttribute('filter', 'url(#mk-rough)');
      ink.append(
        svgPath('M66 12 C 40 2, 10 16, 6 46 C 2 76, 24 98, 52 97 C 84 96, 101 72, 97 44 C 94 20, 74 4, 46 8 C 34 10, 24 15, 18 22', 'mk-circle'),
        // Çarpı harf boyunun ~%115'i kadar (dairenin aksine harfin üstünde durur)
        svgPath('M29 27 C 39 38, 52 54, 72 75', 'mk-x'),
        svgPath('M72 26 C 60 38, 47 54, 28 76', 'mk-x mk-x2')
      );
      mark.appendChild(ink);

      btn.append(span, mark);
      btn.addEventListener('click', () => guessLetter(letter));
      keyButtons.set(letter, btn);
      frag.appendChild(btn);
    }
    el.keyboard.appendChild(frag);
  }

  function resetKeyboard() {
    keyButtons.forEach((btn) => {
      btn.disabled = false;
      btn.classList.remove('is-used', 'is-correct', 'is-wrong');
      btn.removeAttribute('aria-pressed');
    });
  }

  /* === Oyun akışı ====================================================== */
  function buildSlots() {
    el.word.textContent = '';
    const frag = document.createDocumentFragment();
    for (let i = 0; i < state.word.length; i++) {
      const slot = document.createElement('span');
      slot.className = 'slot';
      const letter = document.createElement('span');
      letter.className = 'slot-letter';
      slot.appendChild(letter);
      frag.appendChild(slot);
    }
    el.word.appendChild(frag);
    el.word.setAttribute('aria-label', 'Gizli kelime, ' + state.word.length + ' harf');
  }

  /** Belirtilen harfi (ya da hepsini) kelime yerlerinde açar. */
  function revealLetters(letter) {
    const slots = el.word.children;
    for (let i = 0; i < state.word.length; i++) {
      if (letter && state.word[i] !== letter) continue;
      slots[i].firstChild.textContent = state.word[i];
      slots[i].classList.add('is-open');
    }
  }

  function updateErrors() {
    Hangman.setStage(state.errors);
    el.errorCount.textContent = 'Hata: ' + state.errors + ' / ' + G.maxErrors; // ekran okuyucu
  }

  function isSolved() {
    for (const ch of state.word) if (!state.guessed.has(ch)) return false;
    return true;
  }

  function newGame() {
    state.word = pickWord();
    state.errors = 0;
    state.guessed.clear();
    state.wrongGuesses.clear();
    state.over = false;

    buildSlots();
    resetKeyboard();
    el.wrongList.textContent = '';
    el.guessInput.value = '';
    setHint('');
    Hangman.reset();
    updateErrors();
  }

  function guessLetter(letter) {
    if (state.over || !state.started || state.guessed.has(letter)) return;
    const btn = keyButtons.get(letter);
    state.guessed.add(letter);
    btn.disabled = true;
    btn.classList.add('is-used');

    if (state.word.includes(letter)) {
      btn.classList.add('is-correct');
      btn.setAttribute('aria-label', 'Harf ' + letter + ', doğru');
      revealLetters(letter);
      Sound.play('correct');
      if (state.errors > 0) state.errors--;   // doğru harf animasyonu bir adım geri alır
      updateErrors();
      if (isSolved()) endGame(true);
    } else {
      btn.classList.add('is-wrong');
      btn.setAttribute('aria-label', 'Harf ' + letter + ', yanlış');
      addError();
    }
  }

  /** Yanlış harf / yanlış kelime ortak işlemi. */
  function addError() {
    state.errors++;
    Sound.play('wrong');
    updateErrors();
    if (state.errors >= G.maxErrors) endGame(false);
  }

  /* === Kelime tahmini ================================================== */
  function onGuessInput() {
    // Sadece Türk harfleri, büyük harf, en fazla maxLength
    const clean = U.sanitizeGuess(el.guessInput.value, G.maxLength);
    if (clean !== el.guessInput.value) el.guessInput.value = clean;
    setHint('');
  }

  /** Tahmin altındaki uyarı; lucky = yeşil (şanslı kurtuluş). */
  function setHint(text, lucky) {
    el.guessHint.textContent = text;
    el.guessHint.classList.toggle('is-lucky', !!lucky);
  }

  function penaltyChance() {
    return Math.min(1, Math.max(0, Number(G.guessPenaltyChance) || 0));
  }

  /** Yanlış kelime tahmini can götürsün mü? (config: guessPenaltyChance, ör. 0.3) */
  function guessCostsLife() {
    return U.randomInt(1000) < Math.round(penaltyChance() * 1000);
  }

  function submitGuess(e) {
    e.preventDefault();
    if (state.over || !state.started) return;
    const guess = U.sanitizeGuess(el.guessInput.value, G.maxLength);

    if (!guess) {
      setHint('Bir kelime yaz (sadece harf).');
      return;
    }
    if (guess.length !== state.word.length) {
      setHint('Kelime ' + state.word.length + ' harfli, tekrar dene.');
      return;
    }
    el.guessInput.value = '';
    setHint('');

    if (guess === state.word) {
      for (const ch of state.word) state.guessed.add(ch);
      revealLetters(null);
      Sound.play('correct');
      endGame(true);
      return;
    }
    if (state.wrongGuesses.has(guess)) {
      setHint('Bu kelimeyi zaten denedin.');
      return;
    }
    state.wrongGuesses.add(guess);
    const li = document.createElement('li');
    li.textContent = guess; // textContent → XSS imkânsız
    el.wrongList.appendChild(li);
    // Yanlış tahmin her zaman can götürmez: %30 (config) ihtimalle 1 hata
    if (guessCostsLife()) {
      setHint('Yanlış! Bu sefer 1 can gitti.');
      addError();
    } else {
      li.classList.add('is-lucky');
      li.title = 'Şanslıydın, can gitmedi';
      setHint('Yanlış ama şanslısın, can gitmedi! 🍀', true);
    }
  }

  /* === Sonuç ekranı ==================================================== */
  function endGame(won) {
    state.over = true;
    keyButtons.forEach((btn) => { btn.disabled = true; });
    el.guessInput.blur();
    if (!won) revealLetters(null);
    // Ters oyunda kazanınca adam önce tamamen asılır; son animasyon görünsün, sonra sonuç ekranı
    const finale = won ? Hangman.hangFully() : 0;
    window.setTimeout(() => showResult(won), finale || 900);
  }

  function showResult(won) {
    closeRules(true);
    closeFeedback(true);
    Sound.stopMusic();
    Sound.play(won ? 'win' : 'lose');

    setImage(el.resultGif, won ? CFG.IMAGES.winGif : CFG.IMAGES.loseGif,
      won ? PLACEHOLDERS.winGif : PLACEHOLDERS.loseGif);
    el.resultGif.alt = won ? 'Kazandın!' : 'Kaybettin!';
    el.resultWord.textContent = state.word;
    el.resultWord.className = 'result-word ' + (won ? 'is-win' : 'is-lose');
    el.resultWord.setAttribute('aria-label', (won ? 'Kazandın! Kelime: ' : 'Kaybettin! Kelime: ') + state.word);

    document.body.classList.add('is-over');
    showWithTransition(el.result, 'is-visible');
    el.resultRestart.focus({ preventScroll: true });
  }

  function restart() {
    if (!el.result.hidden) {
      hideWithTransition(el.result, 'is-visible', 450);
      document.body.classList.remove('is-over');
    }
    newGame();
    Sound.playMusic(true);
  }

  /* === Kurallar penceresi ============================================== */
  async function openRules() {
    if (state.over && !el.result.hidden) return;
    showWithTransition(el.modal, 'is-open');
    el.rulesClose.focus({ preventScroll: true });

    if (rulesCache !== null) return;
    try {
      const text = await U.fetchText(CFG.FILES.rules);
      rulesCache = text;
      U.renderMarkdown(text, el.rulesContent);
    } catch (err) {
      el.rulesContent.textContent = '';
      const p = document.createElement('p');
      p.className = 'rules-error';
      p.textContent = '😕 Kurallar şu an yüklenemedi. Sayfayı bir sunucu üzerinden açtığından ve '
        + 'kural.txt dosyasının yerinde olduğundan emin ol.';
      el.rulesContent.appendChild(p);
      console.warn('[Adam Asmaca]', err.message);
    }
  }

  function closeRules(silent) {
    if (el.modal.hidden) return;
    hideWithTransition(el.modal, 'is-open', 350);
    if (!silent) el.btnRules.focus({ preventScroll: true });
  }

  /* === Öneri kutusu ==================================================== */
  const FB = CFG.FEEDBACK;
  const fb = { token: '', tokenAt: 0, sending: false, closeTimer: 0 };

  function setFbStatus(text, kind) {
    el.fbStatus.textContent = text;
    el.fbStatus.className = 'feedback-status' + (kind ? ' is-' + kind : '');
  }

  function updateFbCount() {
    // Fazlası kesilir (maxlength'e ek güvence)
    if (el.fbMessage.value.length > FB.maxLength) {
      el.fbMessage.value = el.fbMessage.value.slice(0, FB.maxLength);
    }
    const n = el.fbMessage.value.trim().length;
    el.fbCount.textContent = n + ' / ' + FB.maxLength;
    el.fbCount.classList.toggle('is-over', n > 0 && n < FB.minLength);
  }

  /** Sunucudan imzalı form jetonu alır (bot ve başka siteden gönderime karşı). */
  async function fetchFbToken() {
    fb.token = '';
    try {
      const { data } = await U.requestJSON(CFG.FILES.feedback);
      if (data.ok && typeof data.token === 'string' && data.token.length < 200) {
        fb.token = data.token;
        fb.tokenAt = Date.now();
      }
    } catch (err) {
      console.warn('[Adam Asmaca] Öneri kutusu:', err.message);
    }
  }

  function openFeedback() {
    if (state.over && !el.result.hidden) return;
    clearTimeout(fb.closeTimer);
    closeRules(true);
    setFbStatus('');
    updateFbCount();
    showWithTransition(el.fbModal, 'is-open');
    el.fbMessage.focus({ preventScroll: true });
    fetchFbToken();
  }

  function closeFeedback(silent) {
    if (el.fbModal.hidden) return;
    clearTimeout(fb.closeTimer);
    hideWithTransition(el.fbModal, 'is-open', 350);
    if (!silent) el.btnFeedback.focus({ preventScroll: true });
  }

  const wait = (ms) => new Promise((resolve) => window.setTimeout(resolve, ms));

  async function submitFeedback(e) {
    e.preventDefault();
    if (fb.sending) return;
    const message = el.fbMessage.value.trim();
    if (message.length < FB.minLength) {
      setFbStatus('Mesajın en az ' + FB.minLength + ' karakter olmalı.', 'error');
      el.fbMessage.focus();
      return;
    }
    if (message.length > FB.maxLength) {
      setFbStatus('Mesajın en fazla ' + FB.maxLength + ' karakter olabilir.', 'error');
      return;
    }
    fb.sending = true;
    el.fbSend.disabled = true;
    setFbStatus('Gönderiliyor…');
    try {
      if (!fb.token) await fetchFbToken();
      if (!fb.token) throw new Error('jeton alınamadı');
      // Sunucu 3 sn'den hızlı doldurulan formu bot sayar
      const age = Date.now() - fb.tokenAt;
      if (age < 3500) await wait(3500 - age);

      const { status, data } = await U.requestJSON(CFG.FILES.feedback, {
        token: fb.token,
        category: el.fbCategory.value,
        message: message,
        website: el.fbWebsite.value
      });
      const text = typeof data.message === 'string' ? data.message.slice(0, 200) : '';
      if (status === 200 && data.ok) {
        setFbStatus(text || 'Teşekkürler!', 'ok');
        el.fbMessage.value = '';
        updateFbCount();
        fb.closeTimer = window.setTimeout(() => closeFeedback(false), 2200);
      } else {
        setFbStatus(text || 'Gönderilemedi, biraz sonra tekrar dene.', 'error');
      }
      fetchFbToken();       // her gönderim için yeni jeton
    } catch (err) {
      console.warn('[Adam Asmaca] Öneri gönderilemedi:', err.message);
      setFbStatus('Şu an gönderilemedi, biraz sonra tekrar dene.', 'error');
    } finally {
      fb.sending = false;
      el.fbSend.disabled = false;
    }
  }

  /** Açık penceredeki odağı pencere içinde tutar (Tab / Shift+Tab). */
  function trapFocus(e, container) {
    const items = Array.from(container.querySelectorAll('button, select, textarea, input:not([tabindex="-1"])'))
      .filter((n) => !n.disabled && n.offsetParent !== null);
    if (!items.length) return;
    const first = items[0];
    const last = items[items.length - 1];
    if (!container.contains(document.activeElement)) { e.preventDefault(); first.focus(); }
    else if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }

  /* === Tema ve ses ===================================================== */
  function currentTheme() {
    return document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
  }

  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    el.btnTheme.setAttribute('aria-label', theme === 'dark' ? 'Açık temaya geç' : 'Koyu temaya geç');
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', theme === 'dark' ? '#25352f' : '#efeee9');
  }

  function initTheme() {
    // Koyu tema renk paleti (config.js → GAME.darkPalette)
    document.documentElement.setAttribute('data-palette', G.darkPalette === 'tebesir' ? 'tebesir' : 'sepya');
    const saved = U.storage.get(CFG.STORAGE_KEYS.theme);
    applyTheme(saved === 'light' || saved === 'dark' ? saved : G.defaultTheme);
    el.btnTheme.addEventListener('click', () => {
      const next = currentTheme() === 'dark' ? 'light' : 'dark';
      applyTheme(next);
      U.storage.set(CFG.STORAGE_KEYS.theme, next);
    });
  }

  const SOUND_LABELS = {
    all:  'Ses: hepsi açık (müzik + efektler). Değiştirmek için tıkla.',
    fx:   'Ses: sadece efektler. Değiştirmek için tıkla.',
    mute: 'Ses: sessiz. Değiştirmek için tıkla.'
  };

  /** İkon seçimi CSS'te: data-mode="all|fx|mute" */
  function renderSoundButton(mode) {
    el.btnSound.dataset.mode = mode;
    el.btnSound.setAttribute('aria-label', SOUND_LABELS[mode]);
    el.btnSound.title = SOUND_LABELS[mode];
    el.btnSound.classList.toggle('is-mute', mode === 'mute');
  }

  function initSound() {
    renderSoundButton(Sound.loadMode());
    el.btnSound.addEventListener('click', () => {
      Sound.unlock();
      renderSoundButton(Sound.cycleMode());
    });
  }

  /* === Giriş ekranı ==================================================== */
  function startFromIntro() {
    if (state.started) return;
    state.started = true;
    Sound.unlock();               // tarayıcı otomatik oynatma kuralı: tıklama içinde
    Sound.playMusic(true);
    el.intro.classList.add('is-leaving');
    window.setTimeout(() => { el.intro.hidden = true; }, 500);
    Tour.maybeStart(650);         // ilk ziyarette hızlı gezgin (giriş ekranı kapandıktan sonra)
  }

  /* === Fiziksel klavye ================================================= */
  function onKeyDown(e) {
    if (Tour.isActive()) return;  // tur kendi tuşlarını yönetir
    if (!el.fbModal.hidden) {
      if (e.key === 'Escape') closeFeedback(false);
      if (e.key === 'Tab') trapFocus(e, el.fbModal);
      return; // yazarken oyun klavyesi tetiklenmez
    }
    if (!el.modal.hidden) {
      if (e.key === 'Escape') closeRules(false);
      if (e.key === 'Tab') trapFocus(e, el.modal); // odak pencerede kalsın
      return;
    }
    if (!state.started || state.over) return;
    if (e.ctrlKey || e.metaKey || e.altKey || e.repeat) return;
    if (document.activeElement === el.guessInput) return; // tahmin yazarken harf tetiklenmez
    const key = U.upperTR(e.key || '');
    if (key.length === 1 && keyButtons.has(key)) {
      e.preventDefault();
      guessLetter(key);
    }
  }

  /* === Görseller ======================================================= */
  /* Kullanıcının dosyası henüz yoksa gösterilen yerleşik yer tutucular */
  const PLACEHOLDERS = {
    logo: 'images/logo.svg',
    // Önce eski GIF denenir (WebP'ye geçiş sırasında boş kalmasın), o da yoksa yer tutucu
    introBg: ['images/giris-arka-plan.gif', 'images/giris-arka-plan.svg'],
    introButton: 'images/giris-buton.svg',
    winGif: 'images/kazandin.svg',
    loseGif: 'images/kaybettin.svg'
  };

  /**
   * Görseli yükler; dosya bulunamazsa sırayla yedeklere geçer (tek yol veya liste).
   * Hiçbiri yüklenemezse onLastError çağrılır.
   */
  function setImage(img, src, fallbacks, onLastError) {
    const queue = [].concat(fallbacks || []).filter((f) => f && f !== src);
    img.onerror = () => {
      const next = queue.shift();
      if (next) {
        img.src = next;
      } else {
        img.onerror = null;
        if (onLastError) onLastError();
      }
    };
    img.src = src;
  }

  function initImages() {
    setImage(el.logo, CFG.IMAGES.logo, PLACEHOLDERS.logo, () => {
      // Logo hiç yoksa yazı ile göster
      const span = document.createElement('span');
      span.className = 'banner-fallback';
      span.textContent = 'ADAM ASMACA';
      el.logo.replaceWith(span);
    });
    setImage(el.introBg, CFG.IMAGES.introBg, PLACEHOLDERS.introBg);
    setImage(el.introBtnImg, CFG.IMAGES.introButton, PLACEHOLDERS.introButton);
    initBackgrounds();
  }

  /**
   * config.js → BACKGROUNDS: boş değilse o temanın varsayılan dokusu yerine görsel kullanılır.
   * Sadece ad yazılmışsa ('arka-plan-acik.webp') başına 'images/' eklenir.
   * Görsel önce yüklenir; bulunamazsa o temada varsayılan doku kalır.
   */
  function initBackgrounds() {
    const root = document.documentElement;
    const safePath = /^images\/[a-z0-9_\-.]+\.(png|apng|jpe?g|gif|webp|avif|svg)$/;
    ['light', 'dark'].forEach((theme) => {
      let path = CFG.BACKGROUNDS[theme];
      if (!path) return;
      if (!path.startsWith('images/')) path = 'images/' + path;
      if (!safePath.test(path) || path.includes('..')) {
        console.warn('[Adam Asmaca] Geçersiz arka plan yolu:', path);
        return;
      }
      // Tam adres: değişken CSS içinde kullanıldığında yol css/ klasörüne göre çözülmesin
      const abs = new URL(path, document.baseURI).href;
      const probe = new Image();
      probe.onload = () => {
        root.style.setProperty('--bg-img-' + theme, 'url("' + abs + '")');
        root.setAttribute('data-bg-' + theme, '');
      };
      probe.onerror = () => console.warn('[Adam Asmaca] Arka plan görseli bulunamadı:', path);
      probe.src = abs;
    });
  }

  /* === Başlat ========================================================== */
  async function init() {
    initImages();
    initTheme();
    initSound();
    buildKeyboard();
    Hangman.mount(el.hangman);

    el.introBtn.addEventListener('click', startFromIntro);
    el.btnRestart.addEventListener('click', restart);
    el.resultRestart.addEventListener('click', restart);
    el.btnRules.addEventListener('click', openRules);
    el.rulesClose.addEventListener('click', () => closeRules(false));
    el.rulesTour.addEventListener('click', () => {
      closeRules(true);
      window.setTimeout(Tour.start, 360); // pencere kapanınca tur başlar
    });
    el.modal.addEventListener('click', (e) => { if (e.target === el.modal) closeRules(false); });
    el.toastClose.addEventListener('click', () => { el.toast.hidden = true; });
    el.btnFeedback.addEventListener('click', openFeedback);
    el.fbClose.addEventListener('click', () => closeFeedback(false));
    el.fbModal.addEventListener('click', (e) => { if (e.target === el.fbModal) closeFeedback(false); });
    el.fbForm.addEventListener('submit', submitFeedback);
    el.fbMessage.addEventListener('input', updateFbCount);
    el.fbMessage.setAttribute('maxlength', String(FB.maxLength));
    el.guessForm.addEventListener('submit', submitGuess);
    el.guessInput.addEventListener('input', onGuessInput);
    document.addEventListener('keydown', onKeyDown);

    await loadWords();
    newGame();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
