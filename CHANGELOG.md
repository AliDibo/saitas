# CHANGELOG

En yeni kayıt en üstte. Biçim: tarih – ne değişti – neden – etkilenen dosyalar.

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
