# Görsel, Ses ve Animasyon Rehberi

Tüm dosyalar **`public/images/`** klasörüne konur. Dosya adları **tek bir yerde** tanımlıdır:
**`public/js/config.js`**. Yeni dosyayı klasöre koy → config'de adını yaz → kaydet → (sitede) commit + push + deploy.

**Dosya adı kuralları** (hosting Linux, büyük/küçük harf duyarlı):
- Sadece küçük harf, rakam, `-` ve `_`. Türkçe karakter (ç ğ ı ö ş ü) ve boşluk **yok**.
- Uzantı config'te yazdığınla birebir aynı olmalı (`.PNG` ≠ `.png`).
- Doğru: `arka-plan-koyu.webp` · Yanlış: `Arka Plan Koyu.PNG`

## 1. Görseller

| Ne | config.js anahtarı | Çözünürlük | Dosya tipi | Not |
|---|---|---|---|---|
| Açık tema arka planı | `BACKGROUNDS.light` | **1920×1080** (en az), mümkünse 2560×1440 | WebP (önerilen), JPG, PNG | Ekranı kaplar (`cover`): kenarları telefonda kırpılabilir, önemli öğe koyma. Boş `''` = kâğıt dokusu |
| Koyu tema arka planı | `BACKGROUNDS.dark` | 1920×1080 (en az) | WebP, JPG, PNG | Boş `''` = kara tahta |
| Üst banner logosu | `IMAGES.logo` | **1920×120** (16:1) | PNG (şeffaf) veya SVG | İki temada da görünmeli (koyu kenarlı renkli yazı en güvenlisi). Telefonda çok küçülür, uzun-ince olmalı |
| Giriş ekranı arka planı | `IMAGES.introBg` | **1920×1080** | JPG, WebP, GIF (hareketli olabilir) | `cover`; üstüne %38 karartma uygulanır |
| Giriş butonu görseli | `IMAGES.introButton` | **512×512** (kare) | PNG (şeffaf) veya SVG | Beyaz yuvarlak butonun ortasında %60 opaklıkla durur; kenarlarda boşluk bırak |
| Kazanma görseli | `IMAGES.winGif` | **800×600** (4:3) | GIF, WebP (hareketli), SVG | Ekran yüksekliğinin en fazla %55'i kadar gösterilir |
| Kaybetme görseli | `IMAGES.loseGif` | 800×600 | GIF, WebP, SVG | |

**Arka plan ipucu:** Açık temada beyaz üstüne çok açık gri, koyu temada siyah üstüne çok koyu gri gibi düz
fonlar en iyi sonucu verir. Bölmeler şeffaftır; görsel karartılmaz. 1920×1080 bir WebP genelde 100–300 KB olur.

**GIF yerine hareketli WebP:** Aynı kalitede 3–5 kat küçüktür, tüm modern tarayıcılarda çalışır.

## 2. Sesler

| Ne | config.js anahtarı | Süre | Tip | Ses seviyesi (`VOLUMES`) |
|---|---|---|---|---|
| Arka plan müziği | `SOUNDS.music` | 1–3 dk, döngüye uygun (başı-sonu kesintisiz) | MP3 128 kbps | 0.3 |
| Doğru harf | `SOUNDS.correct` | < 0,5 sn | MP3 | 0.4 |
| Yanlış harf | `SOUNDS.wrong` | < 0,5 sn | MP3 | 0.4 |
| Kazanma | `SOUNDS.win` | 1–3 sn | MP3 | 0.5 |
| Kaybetme | `SOUNDS.lose` | 1–3 sn | MP3 | 0.5 |

Efektlerin başında sessizlik olmasın (gecikme gibi hissettirir). Dosya yoksa oyun sentez ses çalar.

## 3. Adam asmaca animasyonu (kendi tasarımın)

`config.js → HANGMAN.mode` ile seçilir. 4 seçenek var:

| Mod | Ne zaman | Geçiş |
|---|---|---|
| `'svg'` | Varsayılan yerleşik çizim | Çizilerek gelir, silinerek gider |
| `'frames'` | Sadece 7 sabit resim çizeceksen | Resimler arası yumuşak geçiş (crossfade) |
| **`'sequence'`** | **Gerçek animasyon tasarlıyorsan — ÖNERİLEN** | Kare kare ileri **ve geri** oynar |
| `'video'` | Elinde tek video varsa | Videoda ilgili saniyeye yumuşak sarma |

### Ortak kurallar (tüm modlar)
- **Boyut:** Dikey kompozisyon, **600×800** (3:4) önerilir; tüm kareler **aynı boyutta** olmalı.
  Bölmeye oranı korunarak sığdırılır (masaüstünde ~300×450 px, telefonda daha küçük görünür; 600×800 retina ekranda keskin kalır).
- **Zemin:** **Şeffaf** (PNG / WebP alfa). Düz beyaz zemin koyarsan koyu temada beyaz kutu görünür.
- **Renk:** Siyah çizgi + şeffaf zemin çiz. `invertInDark: true` (varsayılan) koyu temada çizgileri otomatik
  beyaza çevirir (renkli kısımlar da tersine döner — renk kullanıyorsan `false` yap ve iki temada da
  okunacak renkler seç).
- **Aşamalar:** 0 = başlangıç (darağacı vs.), 1–6 = her hatada eklenen parça, 6 = kayıp anı.

### A) `'sequence'` – kare dizisi (önerilen)
Animasyonu istediğin programda yap (After Effects, Procreate Dreams, Rive, Krita, Photoshop…) ve
**PNG/WebP kare dizisi** olarak dışa aktar.

1. Kareleri `public/images/animasyon/` klasörüne koy: `kare-000.webp`, `kare-001.webp`, … (numara 0'dan, aynı basamak sayısı).
2. Hangi karenin hangi hata sayısına denk geldiğini not al. Örnek: 30 fps, her aşama arası 10 kare:

   | Hata | 0 | 1 | 2 | 3 | 4 | 5 | 6 |
   |---|---|---|---|---|---|---|---|
   | Kare | 0 | 10 | 20 | 30 | 40 | 50 | 60 |

3. `config.js`:
   ```js
   mode: 'sequence',
   sequence: {
     folder: 'images/animasyon/',
     prefix: 'kare-',
     digits: 3,          // kare-000 → 3 basamak
     ext: 'webp',
     count: 61,          // toplam kare (0–60)
     stageFrames: [0, 10, 20, 30, 40, 50, 60],
     fps: 30
   },
   ```
- Aşamalar arası kare sayısı eşit olmak zorunda değil (ör. `[0, 8, 20, 26, 34, 42, 70]`).
- Toplam boyut: 600×800 WebP kare ~15–40 KB → 61 kare ≈ 1–2,5 MB. Kare sayısını 100'ün altında tut.
- Doğru harfte animasyon bir önceki aşamaya **geri oynar**, yeni oyunda doğrudan ilk kareye döner.

### B) `'frames'` – 7 resim
`adam-0.png` … `adam-6.png` (600×800, şeffaf PNG/WebP). `frames` listesindeki adları güncelle, `mode: 'frames'`.

### C) `'video'` – tek video
- **MP4 (H.264)**, 600×800 veya 720×960. Şeffaflık gerekiyorsa video yerine `sequence` kullan
  (şeffaf video Safari'de çalışmaz).
- Geri sarmanın akıcı olması için her kare anahtar kare olmalı. Dışa aktarırken "keyframe interval = 1"
  seç, ya da: `ffmpeg -i girdi.mov -c:v libx264 -g 1 -pix_fmt yuv420p -an images/adam-animasyon.mp4`
- `videoStages`: her hata sayısının saniyesi, ör. `[0, 1.2, 2.4, 3.5, 4.6, 5.8, 7.0]`. `null` = eşit böl.
- Video sessiz oynatılır; sesler ayrıca `SOUNDS` ile gelir.

## 4. Kontrol listesi (dosya değiştirdikten sonra)
- [ ] Dosya adı küçük harf, Türkçe karakter/boşluk yok, uzantı config ile aynı
- [ ] Sayfayı **Ctrl+F5** ile yenile (tarayıcı eski dosyayı önbellekte tutabilir)
- [ ] Açık ve koyu temada bak; telefonda dikey ve yatay bak
- [ ] Görsel görünmüyorsa: F12 → Console'da 404 hatası var mı (yanlış ad/yol)
