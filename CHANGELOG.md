# CHANGELOG

En yeni kayıt en üstte. Biçim: tarih – ne değişti – neden – etkilenen dosyalar.

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
