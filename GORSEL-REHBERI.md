# Görsel, Ses ve Animasyon Rehberi

Bu rehber şu soruların cevabı: **Hangi dosyayı hazırlayacağım? Hangi klasöre koyacağım? Adı ne olacak?
Başka bir şey yapmam gerekiyor mu?**

---

## 0. Önce 3 kural

1. **Tek klasör:** Bütün görseller, GIF'ler, sesler ve animasyon dosyaları **aynı klasöre** gider:

   ```
   Saitas Cartoon\public\images\
   ```
   (Masaüstündeki proje klasörü → `public` → `images`.) Alt klasör açma.

2. **Ad kuralı:** Dosya adını **aşağıdaki tablolarda yazdığı gibi, harfi harfine** ver.
   - Sadece **küçük harf**, rakam ve `-` kullan.
   - Türkçe karakter (ç ğ ı ö ş ü) ve **boşluk yok**.
   - Uzantı da aynı olmalı: `logo.PNG` ≠ `logo.png`, `kazandin.GIF` ≠ `kazandin.gif`.
   - Windows uzantıları gizliyorsa: Dosya Gezgini → **Görünüm → Göster → Dosya adı uzantıları**'nı aç.
     Yoksa `logo.png.png` gibi çift uzantılı ad oluşur ve site dosyayı bulamaz.

3. **Koyduktan sonra:** Tarayıcıda **Ctrl+F5** ile yenile (eski dosya önbellekte kalabilir).
   Canlı sitede görünmesi için: commit + push + cPanel'de deploy.

---

## 1. Klasör haritası (her şey hazır olduğunda böyle görünecek)

```
public\images\
│
├─ logo.png              ← Üst banner logosu
├─ kazandin.gif          ← Kazanınca çıkan görsel
├─ kaybettin.gif         ← Kaybedince çıkan görsel
│
├─ daragaci.png          ← Asılma animasyonu: sabit darağacı
├─ adam-sprite.png       ← Asılma animasyonu: adamın tüm kareleri (tek resim)
│
├─ muzik.mp3             ← Arka plan müziği
├─ dogru.mp3             ← Doğru harf sesi
├─ yanlis.mp3            ← Yanlış harf sesi
├─ kazanma.mp3           ← Kazanma sesi
├─ kaybetme.mp3          ← Kaybetme sesi
│
├─ favicon.png           ← Sekme simgesi (bkz. Bölüm 4)
├─ paylasim.png          ← WhatsApp/Google paylaşım görseli (bkz. Bölüm 4)
│
├─ (isteğe bağlı) giris-arka-plan.jpg / giris-buton.png / arka-plan-acik.webp / arka-plan-koyu.webp
│
└─ … ve şu an duran yer tutucular: logo.svg, kazandin.svg, kaybettin.svg,
     giris-arka-plan.svg, giris-buton.svg, favicon.svg, .htaccess   → BUNLARI SİLME
```

> **Yer tutucuları silme.** Kendi dosyan yokken site onları gösterir. Kendi dosyanı koyunca
> site otomatik olarak seninkini kullanır; yer tutucu orada dursa da görünmez.

---

## 2. Dosya dosya liste

Dosyalar üç gruba ayrılıyor:

| Grup | Ne yapacaksın |
|---|---|
| **A – Sadece koy** | Dosyayı verilen adla klasöre koy. **Başka hiçbir şey yapma.** |
| **B – Koy + config'te 1 satır** | Dosyayı koy, `public\js\config.js` içinde gösterilen **tek satırı** değiştir. |
| **C – Asılma animasyonu** | 2 dosyayı koy, config'te `mode` satırını değiştir (Bölüm 3). |

### A – Sadece koy (config'e dokunma)

| # | Ne | Dosya adı (tam olarak bu) | Tür | Boyut / süre | Şu an yoksa ne görünüyor |
|---|---|---|---|---|---|
| 1 | Üst banner logosu | **`logo.png`** | Şeffaf PNG | **720×120** px | Yer tutucu "ADAM ASMACA" yazısı |
| 2 | Kazanma görseli | **`kazandin.gif`** | GIF | **800×600** px | Zıplayan çöp adam (yer tutucu) |
| 3 | Kaybetme görseli | **`kaybettin.gif`** | GIF | **800×600** px | Asılı çöp adam (yer tutucu) |
| 4 | Arka plan müziği | **`muzik.mp3`** | MP3 | 1–3 dk, başı-sonu birleşebilen | Bilgisayarın çaldığı basit melodi |
| 5 | Doğru harf sesi | **`dogru.mp3`** | MP3 | 0,5 sn'den kısa | Bilgisayar "bip"i |
| 6 | Yanlış harf sesi | **`yanlis.mp3`** | MP3 | 0,5 sn'den kısa | Bilgisayar "bzzt"i |
| 7 | Kazanma sesi | **`kazanma.mp3`** | MP3 | 1–3 sn | Bilgisayar melodisi |
| 8 | Kaybetme sesi | **`kaybetme.mp3`** | MP3 | 1–3 sn | Bilgisayar melodisi |

Notlar:
- **Logo:** **720×120** (6'ya 1). Logo, barda sağdaki ses/tema butonları için iki yandan ayrılan boşluğun
  arasını doldurur ve tam ortada durur. Telefonda bu alan dar olduğu için kısa bir logo büyük görünür:
  360 px telefonda 720×120 logo ~132×22 px, 1920×120 logo ise sadece ~132×8 px olurdu.
  Daha da büyük görünsün istersen 480×120 (4'e 1) yapabilirsin. İki temada da okunsun diye koyu kenarlı
  renkli yazı en güvenlisi.
- **Kazanma / kaybetme:** ekran yüksekliğinin en fazla yarısı kadar gösterilir, altında kelime yazar.
- **Sesler:** efektlerin başında sessizlik bırakma, gecikmiş gibi duyulur. Ses seviyeleri `config.js → VOLUMES`.

### B – Koy + config'te 1 satır değiştir

`public\js\config.js` dosyasını Not Defteri veya VS Code ile aç, aşağıdaki satırı bul (Ctrl+F ile
`giris-arka-plan`, `giris-buton`, `light:` ya da `dark:` ara) ve **sadece tırnak içindeki adı** değiştir.
Tırnakları ve satır sonundaki virgülü silme.

| # | Ne | Önerilen ad | Tür | Boyut | config.js'te ŞU AN | Şöyle yap |
|---|---|---|---|---|---|---|
| 9 | Giriş ekranı arka planı | `giris-arka-plan.jpg` | JPG, WebP veya hareketli GIF | **1920×1080** | `introBg:     'images/giris-arka-plan.svg',` | `introBg:     'images/giris-arka-plan.jpg',` |
| 10 | Giriş butonundaki resim | `giris-buton.png` | Şeffaf PNG | **512×512** (kare) | `introButton: 'images/giris-buton.svg',` | `introButton: 'images/giris-buton.png',` |
| 11 | Açık tema sayfa arka planı | `arka-plan-acik.webp` | WebP, JPG veya PNG | **1920×1080** (en az) | `light: '',` | `light: 'images/arka-plan-acik.webp',` |
| 12 | Koyu tema sayfa arka planı | `arka-plan-koyu.webp` | WebP, JPG veya PNG | **1920×1080** (en az) | `dark:  ''` | `dark:  'images/arka-plan-koyu.webp'` |

Notlar:
- **9 – Giriş arka planı:** ekranı tamamen kaplar, telefonda kenarları kesilir; kenarlara önemli şey koyma.
  Site **hiç karartma uygulamaz**; daha soluk olsun istersen görseli kendin soldur.
- **9 + 10 – Buton boyutu:** buton, giriş arka planındaki iki yazının ("Asa'n Kazanır!" ve "saitas.com.tr")
  arasındaki boşluğa sığacak şekilde ayarlı: arka plan görselinin ekrandaki yüksekliğinin **%22'si**.
  Arka planı değiştirir ve buton büyük/küçük gelirse `public\css\style.css` içinde `--intro-btn-ratio: 0.22;`
  satırındaki sayıyı değiştir (0.18 = daha küçük, 0.28 = daha büyük).
- **10 – Giriş butonu:** resim yuvarlak butonu **tamamen kaplar**, kare resmin köşeleri daire dışında kalıp
  kırpılır; önemli kısmı ortada tut. Soldurma yok. Buton büyük olduğu için **512×512** kullan
  (193×193 gibi küçük resim bulanık görünür).
- **Dosya boyutu:** giriş arka planı her açılışta iner. 23 MB'lık GIF telefonda çok yavaş açılır;
  hareketli **WebP**'ye çevirip 1–3 MB'a indir.
- **11 / 12 – Sayfa arka planı:** düz fon en iyisi (açıkta beyaz üstüne çok açık gri, koyuda siyah üstüne çok
  koyu gri). Bölmeler şeffaf kalır. Geri almak için adı silip `''` bırak → kâğıt / kara tahta geri gelir.
- Önerilen adı kullanmak zorunda değilsin; hangi adı verirsen config'e de **aynısını** yaz.

### C – Asılma animasyonu (2 dosya + 1 satır)

| # | Ne | Dosya adı (tam olarak bu) | Tür | Boyut |
|---|---|---|---|---|
| 13 | Sabit darağacı | **`daragaci.png`** | Şeffaf PNG, siyah çizgi | **360×480** (veya 720×960) |
| 14 | Adamın tüm kareleri | **`adam-sprite.png`** | Şeffaf PNG, siyah çizgi | **2880×2400** (37 kare × 360×480, 8 sütun) |

İkisini de koyduktan sonra `config.js`'te şu satırı değiştir:

```
ŞU AN:      mode: 'svg',
ŞÖYLE YAP:  mode: 'sprite',
```

Nasıl çizileceği adım adım **Bölüm 3**'te. Dosyalardan biri eksikse site çökmez, şimdiki yerleşik
çizime döner.

---

## 3. Asılma animasyonunu hazırlama (sprite)

**Fikir:** Darağacı tek bir sabit resim. Adam ise kare kare çizilmiş bir animasyon; ama 37 ayrı dosya yerine
**hepsi tek bir resimde ızgara gibi dizili**. Site her an bu resmin sadece bir karesini gösterir. Hata artınca
ileri, doğru harfte geri oynar; hata arttıkça adam ipin bağlandığı yerden daha çok sallanır (6 hatada ±10°).

### Adım 1 – Aynı tuvalde iki katman aç
- Tuval: **360×480** px (dikey, 3'e 4). Daha keskin istersen 720×960; oran aynı kalsın.
- **Katman 1 – Darağacı:** direk, kiriş, payanda, zemin. **İp çizme.** Bu katman hiç değişmez.
- **Katman 2 – Adam:** ip + adam. Animasyonu bu katmanda yap.
- Zemin **şeffaf**, çizgiler **siyah**. (Koyu temada site çizgileri otomatik beyaza çevirir.)

### Adım 2 – İpi doğru yere çiz
- İpin **tepesi**, kirişteki bağlanma noktasına **tam denk** gelsin (adam bu noktadan sallanacak).
- Tepeyi tuvalin en üst kenarına yapıştırma, **5–10 px** boşluk bırak.

### Adım 3 – Kareleri çiz (37 kare)
Her aşama için 6 kare (kalemin o uzvu çizme hareketi), saniyede 12 kare:

| Kare no. | Görünen |
|---|---|
| 0 | Sadece ip |
| 1–6 | Kafa çiziliyor → kare 6'da kafa tamam |
| 7–12 | Gövde → kare 12'de tamam |
| 13–18 | Sol kol → 18'de tamam |
| 19–24 | Sağ kol → 24'te tamam |
| 25–30 | Sol bacak → 30'da tamam |
| 31–36 | Sağ bacak (+ istersen çarpı gözler) → kare 36 = son hâl |

### Adım 4 – Dışa aktar
- **Darağacı katmanı** → tek PNG → adı **`daragaci.png`**.
- **Adam katmanı** → **"Sprite Sheet"** olarak dışa aktar → adı **`adam-sprite.png`**.
  - Ayarlar: **8 sütun**, kareler arası boşluk **0**, kenar payı **0**, kırpma **kapalı**.
  - Kareler soldan sağa, satır satır dizilir:
    ```
    [ 0][ 1][ 2][ 3][ 4][ 5][ 6][ 7]
    [ 8][ 9][10][11][12][13][14][15]
    [16][17][18][19][20][21][22][23]
    [24][25][26][27][28][29][30][31]
    [32][33][34][35][36][  ][  ][  ]   ← son satırın boş kalması normal
    ```
  - Sonuç resim: **2880×2400** px. Daha büyük yapma; telefonlar çok büyük resimleri yavaş açar.
  - Programında "Sprite Sheet" yoksa: kareleri tek tek PNG olarak dışa aktar, ücretsiz bir
    "sprite sheet packer" aracıyla aynı ayarlarla birleştir.

### Adım 5 – Klasöre koy, config'i değiştir
1. `daragaci.png` ve `adam-sprite.png` → `public\images\`
2. `config.js` → `mode: 'svg',` satırını `mode: 'sprite',` yap.
3. **Ctrl+F5.**

### Kareleri ya da sütunları farklı yaptıysan
`config.js` → `sprite` bölümünde şu değerleri kendi dosyana göre değiştir:

```js
sprite: {
  gallows: 'images/daragaci.png',
  sheet: 'images/adam-sprite.png',
  columns: 8,                              // sprite'ta bir satırdaki kare sayısı
  count: 37,                               // toplam kare sayısı
  stageFrames: [0, 6, 12, 18, 24, 30, 36], // 0,1,2…6 hatada hangi kare görünsün
  fps: 12,                                 // saniyede kaç kare oynasın
  pivot: { x: 50, y: 2 }                   // ipin tepesinin karedeki yeri (yüzde)
},
sway: { maxDeg: 10, periodMs: 2800 },      // 6 hatada ±10°; kapatmak için maxDeg: 0
```

**`pivot` hesabı:** ipin tepesi 360×480 karede (180, 10) pikseldeyse → `x = 180 ÷ 360 × 100 = 50`,
`y = 10 ÷ 480 × 100 ≈ 2`.

---

## 4. Sekme ve Google (başlık, açıklama, simge, paylaşım görseli)

Bunlar `config.js`'te **değil**, **`public\index.html`** dosyasının en başındaki
`SEKME / GOOGLE / PAYLAŞIM AYARLARI` yazan blokta. (Google ve WhatsApp sayfadaki JavaScript'i
çalıştırmaz, bu yüzden bilgilerin HTML'de yazılı durması gerekiyor.)
Dosyayı Not Defteri veya VS Code ile aç, sadece tırnak içindeki metinleri değiştir.

| # | Nerede görünür | index.html'de neyi değiştirirsin | Dosya (`public\images\`) |
|---|---|---|---|
| 1 | Sekmedeki yazı ve Google sonucunun başlığı | `<title>Adam Asmaca</title>` arasındaki yazı (en fazla ~60 karakter) | — |
| 2 | Google'da başlığın altındaki açıklama | `<meta name="description" content="...">` (en fazla ~155 karakter) | — |
| 3 | Sekmedeki küçük simge (favicon), telefonda ana ekran simgesi | Dosyayı koy, sonra bloktaki `favicon.svg` yazan **iki satırı sil**, altındaki `<!-- ... favicon.png ... -->` **iki satırın başındaki `<!--` ve sonundaki `-->`'yi sil** | **`favicon.png`** – 512×512, kare, şeffaf PNG |
| 4 | WhatsApp / Facebook / X'te link paylaşınca çıkan kart | `og:title` ve `og:description` metinleri | **`paylasim.png`** – **1200×630** PNG veya JPG |
| 5 | Kartın ve Google'ın sitenin adresini bilmesi | Şu an **`saitas.com.tr`** yazılı (3 yerde). Alan adı değişirse üçünü de değiştir (`https://` kalsın) | — |

Notlar:
- Google değişiklikleri hemen göstermez; sitenin yeniden taranması günler sürebilir.
- WhatsApp önizlemeyi önbellekte tutar; eski kart çıkarsa birkaç gün bekle ya da linkin sonuna `?v=2` ekleyip paylaş.
- `paylasim.png`'de önemli yazıyı ortada tut; bazı uygulamalar kenarlarını kırpar.

## 5. Desteklenen dosya türleri

Site tek bir türe bağlı değil; adını ne yazdıysan o dosyayı açar.

| Tür | Hareketli olabilir mi? | Not |
|---|---|---|
| PNG | Hayır (APNG ise evet) | Şeffaflık için en kolayı |
| GIF | Evet | Her yerde çalışır; 256 renk, dosya büyük |
| WebP | Evet | GIF'ten 3–5 kat küçük, şeffaflık var — mümkünse bunu tercih et |
| JPG | Hayır | Şeffaflık yok; sadece arka planlar için |
| AVIF | Evet | Çok küçük, bazı eski tarayıcılar açmaz |
| SVG | Evet (sadece CSS animasyonu) | İçinde JavaScript varsa hareket etmez |

Türü değiştirirsen (ör. `kazandin.gif` yerine `kazandin.webp`), `config.js`'teki adı da değiştirmelisin
(A grubu dosyalar için de geçerli: `winGif: 'images/kazandin.webp',`).

**Kazanma/kaybetme için SVG yapmak istersen:** Figma / Inkscape / Illustrator'da çiz, SVGator gibi bir
araçla hareketlendir ve **"CSS animasyonu"** olarak dışa aktar. Dosyayı tarayıcıda tek başına açınca
hareket ediyorsa ve içinde `<script>` yoksa uygundur.

---

## 6. İleri seviye: diğer animasyon modları

Sprite yerine bunları kullanmak istersen `mode` satırını değiştir:

| `mode` | Dosyalar (hepsi `public\images\` içinde) | Ne zaman |
|---|---|---|
| `'svg'` | Dosya gerekmez | Şu anki yerleşik çizim |
| `'sequence'` | `animasyon\kare-000.png`, `kare-001.png` … (bu modda alt klasör **gerekir**) | Her kare ayrı dosya |
| `'frames'` | `adam-0.png` … `adam-6.png` (7 resim) | Animasyon yok, sadece 7 durum |
| `'video'` | `adam-animasyon.mp4` | Tek video; geri sararken takılmaması için `ffmpeg -i girdi.mov -c:v libx264 -g 1 -pix_fmt yuv420p -an adam-animasyon.mp4` |

Her modun ayarları `config.js → HANGMAN` içinde, yanlarında açıklamalarıyla duruyor.
Hepsinde: zemin şeffaf, çizgi siyah, dikey oran.

---

## 7. Görünmüyorsa kontrol et

- [ ] Dosya `public\images\` içinde mi? (Alt klasörde değil.)
- [ ] Ad **birebir** tablodaki gibi mi? Küçük harf, Türkçe karakter yok, boşluk yok.
- [ ] Uzantı doğru mu? `logo.png.png` olmuş olabilir (Kural 0.2'deki uzantı ayarını aç).
- [ ] B grubu dosyaysa `config.js`'teki ad dosyanın adıyla aynı mı? Tırnaklar ve virgül yerinde mi?
- [ ] Tarayıcıda **Ctrl+F5** yaptın mı?
- [ ] Hâlâ yoksa: **F12 → Console** sekmesi. `404` yazan satır, sitenin aradığı adı gösterir; dosyanın
      adını ona göre düzelt.
