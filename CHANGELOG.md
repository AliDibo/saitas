# CHANGELOG

En yeni kayıt en üstte. Biçim: tarih – ne değişti – neden – etkilenen dosyalar.

## 2026-11-04 – v1.4.0 Giriş ekranı, sonuç ekranı, logo, sekme/Google ayarları
**Ne:**
- Giriş ekranı: karartma katmanı ve buton görselindeki %60 soldurma kaldırıldı; görsel daireyi tamamen kaplıyor (köşeler kırpılıyor); "AS" yazısı kaldırıldı; buton büyütüldü ve ekranın tam ortasına alındı.
- Sonuç ekranı arka planı tamamen siyah.
- Logo, banner'da butonlar için ayrılan alan dışındaki boşluğu tamamen dolduruyor; önerilen logo oranı 720×120 (telefonda ~3 kat büyük). Yer tutucu `logo.svg` 720×120 yapıldı.
- `index.html` başına düzenlenebilir "SEKME / GOOGLE / PAYLAŞIM AYARLARI" bloğu: başlık, açıklama, favicon, Open Graph / X kartı, canonical (alan adı yer tutucusu `ALAN-ADI.com`). Yeni yer tutucu `images/favicon.svg`.
- Giriş arka planı ve giriş butonu görselleri bulunamazsa yerleşik `.svg` yer tutucuya düşüyor.

**Neden:** Kullanıcı isteği (6 madde).

**Dosyalar:** `public/index.html`, `public/css/style.css`, `public/js/game.js`, `public/js/config.js`, `public/images/logo.svg`, `public/images/favicon.svg`, `GORSEL-REHBERI.md`, `README.md`, `SPEC.md`, `CLAUDE.md`, `CHECKLIST.md`, `TODO.md`.

## 2026-11-04 – Doküman: GORSEL-REHBERI yeniden yazıldı
**Ne:** Rehber "hangi dosya → hangi klasör → hangi ad → config'te ne yapılır → yoksa ne görünür" düzeninde baştan yazıldı: klasör haritası, A (sadece koy) / B (koy + config'te 1 satır) / C (animasyon) grupları, config satırlarının önce/sonra hâli, Windows uzantı uyarısı, sorun giderme listesi.

**Neden:** Kullanıcı dosyaların nereye hangi adla konacağının daha açık yazılmasını istedi.

**Dosyalar:** `GORSEL-REHBERI.md`, `CHANGELOG.md`, `TODO.md`. Kod değişmedi.

## 2026-11-03 – v1.3.0 Sprite modu ve sallanma (henüz commit'lenmedi)
**Ne:**
- Yeni `HANGMAN.mode = 'sprite'`: sabit darağacı resmi + adamın tüm kareleri tek resimde (sprite sheet). Kare kare ileri/geri, sequence ile ortak oynatıcı.
- Adam ipin tepesi (`pivot`) etrafında sallanır; genlik hata sayısıyla artar (6 hatada ±10°, `sway.maxDeg`).
- Sprite sheet bulunamazsa yerleşik SVG çizimine dönülür.
- Aynı artan sallanma yerleşik çizime de eklendi: ip sahneden ayrılıp adamla aynı gruba alındı, kirişteki bağlantı noktası etrafında döner. Eski "sadece kaybedince ±2°" CSS sallanması ve onu hareket azaltma ayarında durduran kural kaldırıldı.
- `GORSEL-REHBERI.md`: sprite sheet hazırlama adımları, ölçüler (37 kare, 360×480, 8 sütun), pivot hesaplama.

**Neden:** Kullanıcı 60 ayrı kare dosyası indirmeyi istemedi; sabit darağacı + hareketli adam ve hata arttıkça artan sallanma istedi. Video + karıştırma modu yerine sprite seçildi (geri sarma ve şeffaflık sorunsuz).

**Dosyalar:** `public/js/hangman.js`, `public/js/config.js`, `public/css/style.css`, `GORSEL-REHBERI.md`, `README.md`, `SPEC.md`, `CLAUDE.md`, `CHECKLIST.md`, `TODO.md`.

## 2026-11-03 – v1.2.2 Dosya türleri (henüz commit'lenmedi)
**Ne:**
- `.htaccess`: PNG, APNG, JPG, GIF, WebP, AVIF, SVG, ICO için açık MIME tipleri ve önbellek süreleri.
- Arka plan ve kare dizisi yol kontrolü AVIF ve APNG'yi de kabul ediyor.
- Config: logo `images/logo.png`, kazanma/kaybetme `images/kazandin.gif` / `kaybettin.gif`; kare dizisi varsayılanı `png`.
- `game.js → setImage()`: dosya bulunamazsa yerleşik `.svg` yer tutucuya geçer (logo için son çare yazı).
- `GORSEL-REHBERI.md`: desteklenen türler, seçilen dosya adları, asılma animasyonunun PNG kare dizisi olarak nasıl üretileceği.

**Neden:** Kullanıcı "hepsi görünsün" dedi; kazanma/kaybetme GIF, banner PNG olacak; animasyon türü soruldu.

**Dosyalar:** `public/.htaccess`, `public/js/config.js`, `public/js/game.js`, `public/js/hangman.js`, `GORSEL-REHBERI.md`, `README.md`, `SPEC.md`, `CLAUDE.md`, `CHECKLIST.md`, `TODO.md`.

## 2026-11-03 – v1.2.1 Laptopta animasyon düzeltmesi, üst çizgi kaldırıldı
**Ne:**
- Windows'ta "Animasyon efektleri" kapalıyken tarayıcının bildirdiği `prefers-reduced-motion` artık oyun animasyonlarını kapatmıyor; sadece sürekli süs hareketleri (giriş butonu zıplaması, sallanma) duruyor. JS'teki kısaltılmış süreler kaldırıldı (`util.reducedMotion` silindi).
- Banner'ın üstündeki tema renginde çizgi (`border-top`) kaldırıldı.
- `GORSEL-REHBERI.md`: kazanma/kaybetme görseli için SVG / GIF / WebP karşılaştırması ve SVG oluşturma notu.

**Neden:** Kullanıcının laptopunda animasyonlar görünmüyordu (Windows animasyon efektleri kapalı: `MinAnimate=0`); üst çizginin kaldırılması istendi.

**Dosyalar:** `public/css/style.css`, `public/js/game.js`, `public/js/util.js`, `SPEC.md`, `CLAUDE.md`, `CHECKLIST.md`, `GORSEL-REHBERI.md`.

## 2026-10-28 – v1.2.0 Kendi animasyonu için kare dizisi modu
**Ne:**
- Yeni `HANGMAN.mode = 'sequence'`: PNG/WebP kare dizisi, `stageFrames` ile hata→kare eşlemesi, `fps` hızında ileri/geri kare kare oynatma.
- `video` modunda `videoStages` ile her aşamanın saniyesi ayarlanabiliyor.
- `invertInDark`: koyu temada kullanıcı animasyonu otomatik ters çevrilir.
- Yeni `GORSEL-REHBERI.md`: tüm görsel/ses/animasyon ölçüleri ve dosya tipleri.

**Neden:** Kullanıcı asılma animasyonunu kendisi tasarlayacak; görsellerin nasıl değiştirileceğini listeleme isteği.

**Dosyalar:** `public/js/config.js`, `public/js/hangman.js`, `public/css/style.css`, `GORSEL-REHBERI.md`, `README.md`, `SPEC.md`, `CLAUDE.md`, `CHECKLIST.md`, `TODO.md`.

## 2026-10-28 – v1.1.1 Arka plan ve çarpı boyutu
**Ne:**
- Özel arka plan görseli varken bölmelerin opaklaşması kaldırıldı; bölmeler her durumda şeffaf.
- Kırmızı çarpı küçültüldü (harfin ~%110–120'si), çizgi kalınlığı orana göre biraz inceltildi.

**Neden:** Kullanıcı geri bildirimi (arka plan görselleri düz fon olacak; çarpı çok büyüktü).

**Dosyalar:** `public/css/style.css`, `public/js/game.js`, `SPEC.md`, `CLAUDE.md`, `CHECKLIST.md`.

## 2026-10-28 – v1.1.0 Görsel düzeltmeler
**Ne:**
- Animasyon bölmesindeki "Hata: n / 6" yazısı kaldırıldı (ekran okuyucu için gizli metin kaldı).
- "KLAVYE" ve "HARF SAYISINA GÖRE BÖLME" başlıkları kaldırıldı.
- Bölmelerin arkasındaki soluk ikinci çerçeve kaldırıldı.
- Ses ve tema butonları Kurallar/Yeniden Başlat tarzında el çizimi buton oldu; emoji yerine el çizimi SVG ikonlar.
- Sonuç ekranındaki kelime küçültüldü, satır aralığı artırıldı (İ/Ö/Ü noktaları GIF'e binmiyor).
- Doğru/yanlış işaretleri kalın, titrek, hafif taşkın marker darbesi oldu.
- Yeni: `config.js → BACKGROUNDS` ile açık ve koyu tema arka planı ayrı ayrı değiştirilebilir.

**Neden:** Kullanıcı geri bildirimi.

**Dosyalar:** `public/index.html`, `public/css/style.css`, `public/js/game.js`, `public/js/config.js`, `SPEC.md`, `CLAUDE.md`, `CHECKLIST.md`, `README.md`.

## 2026-10-28 – v1.0.0 İlk sürüm
**Ne:** Türkçe Adam Asmaca oyunu sıfırdan kuruldu.
- Kara tahta (koyu, varsayılan) ve buruşuk kâğıt (açık) temaları, kalemle çizilmiş görünüm.
- Kalemle çizilen SVG adam asmaca animasyonu (ileri/geri), `frames` (7 görsel) ve `video` modları.
- 29 harfli klavye: doğru = yeşil daire, yanlış = kırmızı çarpı (çizim animasyonlu).
- El çizimi alt çizgili kelime yerleri, kelime tahmini, yanlış tahmin etiketleri.
- Giriş ekranı, sonuç ekranı (sıralı fade-in), Kurallar penceresi (`kural.txt`, mini markdown).
- 3 modlu ses sistemi; dosya yoksa sentezlenmiş yer tutucu sesler.
- Mobil dikey / yatay / tablet düzenleri.
- Güvenlik: CSP, `.htaccess` başlıkları, güvenli fetch, giriş temizleme, `innerHTML` yok.
- Proje hafızası dosyaları, cPanel deploy (`.cpanel.yml`), git deposu.

**Neden:** `adam-asmaca-prompt.md` gereksinimleri + kullanıcı tercihleri (bkz. CLAUDE.md).

**Dosyalar:** tümü (ilk kurulum).
