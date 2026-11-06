/* ==========================================================================
   audio.js – Ses yöneticisi
   - Müzik: HTMLAudioElement (loop). Dosya yoksa sentezlenmiş yer tutucu melodi.
   - Efektler: Web Audio API buffer'ları → hızlı art arda basışta takılmaz.
     Dosya yoksa sentezlenmiş yer tutucu efekt.
   - 3 mod: 'all' (müzik + efekt), 'fx' (sadece efekt), 'mute' (sessiz).
   ========================================================================== */
'use strict';

window.AAAudio = (function () {
  const CFG = window.AA_CONFIG;
  const MODES = ['all', 'fx', 'mute'];
  const EFFECTS = ['correct', 'wrong', 'win', 'lose'];

  let ctx = null;            // AudioContext (ilk kullanıcı tıklamasında oluşur)
  let fxBus = null;          // efektlerin ana kazancı
  const buffers = {};        // decode edilmiş efekt dosyaları (yoksa null → sentez)
  let musicEl = null;        // gerçek müzik dosyası
  let musicFileOk = false;
  let synthMusic = null;     // yedek melodi zamanlayıcısı
  let musicWanted = false;   // oyun müziğin çalmasını istiyor mu
  let mode = CFG.GAME.defaultSoundMode;

  /* === Mod ============================================================== */
  function loadMode() {
    const saved = window.AAUtil.storage.get(CFG.STORAGE_KEYS.sound);
    mode = MODES.includes(saved) ? saved : CFG.GAME.defaultSoundMode;
    return mode;
  }

  function cycleMode() {
    mode = MODES[(MODES.indexOf(mode) + 1) % MODES.length];
    window.AAUtil.storage.set(CFG.STORAGE_KEYS.sound, mode);
    syncMusic();
    return mode;
  }

  const getMode = () => mode;

  /* === Başlatma (kullanıcı hareketi içinde çağrılmalı) ================== */
  function unlock() {
    if (!ctx) {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (Ctx) {
        ctx = new Ctx();
        fxBus = ctx.createGain();
        fxBus.gain.value = 1;
        fxBus.connect(ctx.destination);
        EFFECTS.forEach(loadEffect);
      }
      initMusicElement();
    }
    if (ctx && ctx.state === 'suspended') ctx.resume();
  }

  async function loadEffect(name) {
    buffers[name] = null;
    try {
      const res = await fetch(CFG.SOUNDS[name], { mode: 'same-origin', credentials: 'same-origin' });
      if (!res.ok) return;
      const data = await res.arrayBuffer();
      buffers[name] = await new Promise((ok, fail) => ctx.decodeAudioData(data, ok, fail));
    } catch (e) {
      buffers[name] = null; // sentez yedeği kullanılacak
    }
  }

  function initMusicElement() {
    musicEl = new Audio();
    musicEl.loop = true;
    musicEl.preload = 'auto';
    musicEl.volume = CFG.VOLUMES.music;
    musicEl.addEventListener('canplay', () => {
      if (musicFileOk) return;
      musicFileOk = true;
      stopSynthMusic();
      syncMusic();
    });
    musicEl.addEventListener('error', () => { musicFileOk = false; syncMusic(); });
    musicEl.src = CFG.SOUNDS.music;
  }

  /* === Müzik ============================================================ */
  function playMusic(fromStart) {
    musicWanted = true;
    if (fromStart) {
      if (musicEl && musicFileOk) musicEl.currentTime = 0;
      stopSynthMusic();
    }
    syncMusic();
  }

  function stopMusic() {
    musicWanted = false;
    syncMusic();
  }

  /** Mevcut duruma göre müziği başlatır/durdurur. */
  function syncMusic() {
    const shouldPlay = musicWanted && mode === 'all';
    if (musicFileOk && musicEl) {
      if (shouldPlay) musicEl.play().catch(() => {});
      else musicEl.pause();
      stopSynthMusic();
    } else if (shouldPlay) {
      startSynthMusic();
    } else {
      stopSynthMusic();
    }
  }

  /* === Efektler ========================================================= */
  function play(name) {
    if (mode === 'mute' || !ctx) return;
    if (ctx.state === 'suspended') ctx.resume();
    const vol = CFG.VOLUMES[name];
    if (buffers[name]) {
      const src = ctx.createBufferSource();
      const g = ctx.createGain();
      g.gain.value = vol;
      src.buffer = buffers[name];
      src.connect(g).connect(fxBus);
      src.start();
    } else {
      SYNTH_FX[name](vol);
    }
  }

  /* === Sentezlenmiş yer tutucu sesler =================================== */
  /** Tek nota: frekans, başlangıç (sn, şimdiden), süre, dalga, ses, hedef. */
  function tone(freq, at, dur, type, vol, dest, glideTo) {
    const t0 = ctx.currentTime + at;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (glideTo) osc.frequency.exponentialRampToValueAtTime(glideTo, t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol, t0 + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g).connect(dest || fxBus);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  }

  const SYNTH_FX = {
    correct: (v) => { tone(660, 0, 0.12, 'triangle', v); tone(990, 0.08, 0.18, 'triangle', v); },
    wrong:   (v) => { tone(220, 0, 0.28, 'square', v * 0.35, null, 110); },
    win:     (v) => { [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.12, 0.35, 'triangle', v)); },
    lose:    (v) => { [392, 349, 311, 262].forEach((f, i) => tone(f, i * 0.22, 0.4, 'sawtooth', v * 0.3)); }
  };

  /* Yer tutucu melodi: yumuşak, tekrarlayan pentatonik döngü */
  const MELODY = [392, 440, 523, 440, 587, 523, 440, 392, 330, 392, 440, 392, 330, 294, 330, 392];
  const STEP = 0.32; // sn

  function startSynthMusic() {
    if (synthMusic || !ctx) return;
    const bus = ctx.createGain();
    bus.gain.value = CFG.VOLUMES.music * 0.35;
    bus.connect(ctx.destination);
    let i = 0;
    let next = ctx.currentTime + 0.05;
    const timer = setInterval(() => {
      while (next < ctx.currentTime + 0.4) {
        const at = next - ctx.currentTime;
        tone(MELODY[i % MELODY.length], at, STEP * 0.9, 'triangle', 0.6, bus);
        if (i % 4 === 0) tone(MELODY[i % MELODY.length] / 2, at, STEP * 3.5, 'sine', 0.5, bus);
        i++;
        next += STEP;
      }
    }, 100);
    synthMusic = { timer, bus };
  }

  function stopSynthMusic() {
    if (!synthMusic) return;
    clearInterval(synthMusic.timer);
    const bus = synthMusic.bus;
    bus.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.05);
    setTimeout(() => bus.disconnect(), 400);
    synthMusic = null;
  }

  return { loadMode, cycleMode, getMode, unlock, playMusic, stopMusic, play };
})();
