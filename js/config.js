/* ==========================================================================
   config.js – TÜM AYARLAR BURADA
   Görsel / ses / animasyon dosyası değiştirdiğinde sadece bu dosyayı düzenle.
   Tüm dosyalar "images/" klasöründe durur. Dosya adlarında Türkçe karakter
   ve boşluk KULLANMA, küçük harf kullan (hosting büyük/küçük harf duyarlı).
   ========================================================================== */
'use strict';

window.AA_CONFIG = Object.freeze({

  /* === Görseller =======================================================
     Desteklenen türler: png, apng, jpg, gif, webp, avif, svg.
     logo / winGif / loseGif dosyası bulunamazsa yerleşik yer tutucu (.svg) gösterilir. */
  IMAGES: Object.freeze({
    logo:        'images/logo.png',            // Üst banner logosu (720×120, şeffaf PNG; telefonda da okunur)
    introBg:     'images/giris-arka-plan.gif', // Giriş ekranı arka planı (önerilen 1920×1080, GIF olabilir)
    introButton: 'images/giris-buton.png',     // Yuvarlak giriş butonundaki görsel (önerilen 512×512)
    winGif:      'images/kazandin.webp',       // Kazanma görseli (hareketli WebP / GIF, 800×600)
    loseGif:     'images/kaybettin.webp'       // Kaybetme görseli (hareketli WebP / GIF, 800×600)
  }),

  /* === Sayfa arka planı =================================================
     Boş ('') bırakılırsa varsayılan kullanılır: açıkta kâğıt, koyuda kara tahta.
     Kendi görselini kullanmak için images/ klasörüne koy ve adını yaz,
     ör. light: 'images/arka-plan-acik.jpg' (önerilen 1920×1080, ekranı kaplar). */
  BACKGROUNDS: Object.freeze({
    light: 'images/arka-plan-acik.webp',
    dark:  'images/arka-plan-koyu.webp'   // dosya yoksa kara tahta görünümü kalır
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
     mode: 'svg'      → yerleşik kalem çizimi (dosya gerekmez, varsayılan)
           'frames'   → 7 görsel, aralarında yumuşak geçiş (0 hata … 6 hata)
           'sprite'   → ÖNERİLEN: sabit darağacı + tüm kareler TEK resimde,
                        ileri/geri oynar, hata arttıkça adam daha çok sallanır
           'sequence' → aynı şey ama her kare ayrı dosya
           'video'    → tek video, ilgili ana yumuşak sarma (ileri/geri)
     Ayrıntılı rehber: proje kökündeki GORSEL-REHBERI.md */
  HANGMAN: Object.freeze({
    mode: 'svg',

    /* --- 'frames' modu --- */
    frames: Object.freeze([
      'images/adam-0.png', 'images/adam-1.png', 'images/adam-2.png',
      'images/adam-3.png', 'images/adam-4.png', 'images/adam-5.png',
      'images/adam-6.png'
    ]),

    /* --- 'sequence' modu ---
       Dosyalar: images/animasyon/kare-000.png, kare-001.png, … kare-060.png
       stageFrames: her hata sayısının (0..6) denk geldiği kare numarası.
       Örn. 6 hata = kare 60. Hata artınca aradaki kareler ileri,
       azalınca geri oynatılır. */
    sequence: Object.freeze({
      folder: 'images/animasyon/',
      prefix: 'kare-',
      digits: 3,               // 3 → kare-000, kare-001 …
      ext: 'png',              // png (önerilen) | webp | avif | jpg | gif | svg
      count: 61,               // toplam kare sayısı (0'dan başlar)
      stageFrames: Object.freeze([0, 10, 20, 30, 40, 50, 60]),
      fps: 30                  // geçişte saniyedeki kare
    }),

    /* --- 'sprite' modu (ÖNERİLEN: tek indirme) ---
       gallows: sadece darağacı, hep sabit duran resim.
       sheet:   adamın TÜM kareleri tek resimde, soldan sağa / satır satır.
       Darağacı ile tek kare AYNI en-boy oranında olmalı (ör. ikisi de 3:4)
       ve ipin tepesi her ikisinde de aynı noktada durmalı.
       pivot:   ipin tepesinin karedeki yeri, yüzde (x soldan, y üstten).
                Adam bu noktanın etrafında sallanır. */
    sprite: Object.freeze({
      gallows: 'images/daragaci.png',
      sheet: 'images/adam-sprite.png',
      columns: 8,              // sheet'te bir satırdaki kare sayısı
      count: 37,               // toplam kare (0'dan başlar)
      stageFrames: Object.freeze([0, 6, 12, 18, 24, 30, 36]),
      fps: 12,                 // el çizimi animasyonda 12 doğal durur
      pivot: Object.freeze({ x: 50, y: 2 })
    }),

    /* Sallanma (yerleşik çizim ve 'sprite'): 0 hatada durur, her hatada artar,
       6 hatada ±maxDeg olur. periodMs: bir tam gidip gelme süresi. */
    sway: Object.freeze({
      maxDeg: 10,
      periodMs: 2800
    }),

    /* --- 'video' modu ---
       videoStages: her hata sayısının (0..6) videodaki saniyesi.
       null bırakılırsa video süresi 7 eşit parçaya bölünür. */
    video: 'images/adam-animasyon.mp4',
    videoStages: null,         // örn. [0, 1.2, 2.4, 3.5, 4.6, 5.8, 7.0]

    /* Koyu temada görselleri ters çevir (siyah kalem → beyaz tebeşir).
       Kendi görsellerin siyah çizgi + şeffaf zeminse true bırak. */
    invertInDark: true,

    transitionMs: 550          // 'svg', 'frames' ve 'video' geçiş süresi (ms)
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
