/* ==========================================================================
   config.js – TÜM AYARLAR BURADA
   Görsel / ses / animasyon dosyası değiştirdiğinde sadece bu dosyayı düzenle.
   Tüm dosyalar "images/" klasöründe durur. Dosya adlarında Türkçe karakter
   ve boşluk KULLANMA, küçük harf kullan (hosting büyük/küçük harf duyarlı).
   ========================================================================== */
'use strict';

window.AA_CONFIG = Object.freeze({

  /* === Görseller ======================================================= */
  IMAGES: Object.freeze({
    logo:        'images/logo.svg',            // Üst banner logosu (önerilen 1920×120, şeffaf PNG olabilir)
    introBg:     'images/giris-arka-plan.svg', // Giriş ekranı arka planı (önerilen 1920×1080, GIF olabilir)
    introButton: 'images/giris-buton.svg',     // Yuvarlak giriş butonundaki görsel (önerilen 512×512)
    winGif:      'images/kazandin.svg',        // Kazanma GIF'i (önerilen 800×600)
    loseGif:     'images/kaybettin.svg'        // Kaybetme GIF'i (önerilen 800×600)
  }),

  /* === Sesler ===========================================================
     Dosya yoksa oyun otomatik olarak sentezlenmiş yer tutucu ses çalar. */
  SOUNDS: Object.freeze({
    music:   'images/muzik.mp3',
    correct: 'images/dogru.mp3',
    wrong:   'images/yanlis.mp3',
    win:     'images/kazanma.mp3',
    lose:    'images/kaybetme.mp3'
  }),

  /* Ses seviyeleri (0.0 – 1.0) */
  VOLUMES: Object.freeze({
    music:   0.3,
    correct: 0.4,
    wrong:   0.4,
    win:     0.5,
    lose:    0.5
  }),

  /* === Adam asmaca animasyonu ===========================================
     mode: 'svg'    → yerleşik kalem çizimi (dosya gerekmez, varsayılan)
           'frames' → 7 görsel: frames[0] = 0 hata ... frames[6] = 6 hata
           'video'  → tek video; 0→6 durumları eşit aralıklarla sıralı olmalı */
  HANGMAN: Object.freeze({
    mode: 'svg',
    frames: Object.freeze([
      'images/adam-0.png', 'images/adam-1.png', 'images/adam-2.png',
      'images/adam-3.png', 'images/adam-4.png', 'images/adam-5.png',
      'images/adam-6.png'
    ]),
    video: 'images/adam-animasyon.mp4',
    transitionMs: 550 // geçiş süresi (ms)
  }),

  /* === Metin dosyaları ================================================= */
  FILES: Object.freeze({
    words: 'words.txt',
    rules: 'kural.txt'
  }),

  /* === Oyun kuralları ================================================== */
  GAME: Object.freeze({
    maxErrors: 6,
    minLength: 5,
    maxLength: 10,
    alphabet: 'ABCÇDEFGĞHIİJKLMNOÖPRSŞTUÜVYZ', // 29 harf, alfabetik
    defaultTheme: 'dark',                    // 'dark' (kara tahta) | 'light' (kâğıt)
    defaultSoundMode: 'all'                  // 'all' | 'fx' | 'mute'
  }),

  /* words.txt okunamazsa kullanılan küçük yedek liste */
  FALLBACK_WORDS: Object.freeze([
    'KALEM', 'DEFTER', 'BİSİKLET', 'KELEBEK', 'GÖKKUŞAĞI', 'PENCERE',
    'ÇİKOLATA', 'KAPLUMBAĞA', 'ŞEMSİYE', 'ÖĞRETMEN', 'YILDIZ', 'ORMAN'
  ]),

  /* localStorage anahtarları (değiştirirsen eski kayıtlar okunmaz) */
  STORAGE_KEYS: Object.freeze({
    theme: 'aa_theme',
    sound: 'aa_sound_mode',
    used:  'aa_used_words'
  })
});
