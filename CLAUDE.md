# CLAUDE.md – Proje Hafızası (Adam Asmaca TR)

> Her oturumun başında önce bu dosyayı, sonra `SPEC.md` ve ilgili dosyaları oku.
> Her değişiklikte: SPEC etkisini belirle → değiştir → `CHECKLIST.md` kontrol → `CHANGELOG.md` güncelle.
> İstenmeyen hiçbir özelliği kaldırma/değiştirme/"iyileştirme".

## Amaç
Türkçe, cartoon (kalemle çizilmiş) temalı Adam Asmaca web oyunu. Paylaşımlı hosting (cPanel, Linux)
üzerinde statik site olarak çalışır. Git ile commit'lenir, cPanel "Git Version Control" ile deploy edilir.

## Teknik kararlar
- **Framework / derleme adımı yok.** Düz HTML + CSS + JS (ES2017+, modül yok, `defer` ile sıralı script).
- **Harici kütüphane yok.** Lottie vb. kullanılmadı (gerek yok, saldırı yüzeyini büyütür).
- **Yazı tipleri:** Google Fonts (`Kalam` başlıklar, `Patrick Hand` gövde/tuşlar). İkisi de `latin-ext`
  destekler → Ç Ğ İ Ö Ş Ü düzgün görünür. CSP'de yalnızca `fonts.googleapis.com` ve `fonts.gstatic.com`
  izinli. İstenirse fontlar `public/fonts/` altına indirilip self-host edilebilir (CSP sadeleşir).
- **Durum saklama:** `localStorage` (tema, ses modu, kullanılmış kelimeler). Sunucu tarafı yok.
- **Kullanılmış kelime listesi kişiseldir** (cihaz + tarayıcı bazlı). Başka cihazda/tarayıcıda/gizli
  sekmede liste sıfırdan başlar. Liste bitince otomatik sıfırlanır.
- **`fetch` ile `words.txt` ve `kural.txt` okunur.** Bu yüzden `file://` (çift tıklama) ile açılırsa
  tarayıcı dosyaları okuyamaz. Yerelde mutlaka sunucu ile aç (README'ye bak). `words.txt` okunamazsa
  `config.js` içindeki yedek liste kullanılır ve ekranda uyarı çıkar.

### Animasyon tekniği (gerekçeli)
`config.js → HANGMAN.mode` üç mod destekler:
1. **`"svg"` (varsayılan, yer tutucu):** `js/hangman.js` içinde kalemle çizilmiş SVG (darağacı + ağaç,
   2. referans fotoğraftaki gibi). Her parça `pathLength=1` + `stroke-dashoffset` geçişiyle **çizilerek**
   gelir, hata azalınca **silinerek** geri gider. Dosya gerektirmez, her çözünürlükte keskin, temaya
   göre renk değiştirir (`currentColor`), çok hafif.
2. **`"frames"`:** Kullanıcının 7 görseli (`adam-0.png` … `adam-6.png`) üst üste konur, aktif kare
   çapraz geçişle (crossfade) gösterilir. "7 fotoğraf sistemi" isteyen için.
3. **`"video"`:** Tek video dosyası; hata sayısına karşılık gelen zamana yumuşak "scrub" yapılır
   (ileri/geri). Video 0→6 sırasını eşit aralıklarla içermeli.
Seçim gerekçesi: SVG dosyasız çalışır, geri oynatma doğal; diğer iki mod kullanıcının kendi
animasyonunu sadece `config.js` düzenleyerek takmasını sağlar. Lottie için harici kütüphane gerekirdi.

### Ses
- Müzik: `HTMLAudioElement` (loop). Efektler: Web Audio API (önceden decode edilmiş buffer) → hızlı art
  arda basışta takılma olmaz, müzik içinde net duyulur.
- Ses dosyası yoksa/çözülemezse **sentezlenmiş yer tutucu** sesler (Web Audio osilatör) çalar; oyun hemen
  sesli çalışır. Kullanıcı kendi dosyasını koyunca otomatik o kullanılır.
- Otomatik oynatma kısıtı: müzik ancak giriş butonuna tıklanınca başlar.

## Dosya yapısı
```
/                      → repo kökü (web'e AÇILMAZ)
├─ CLAUDE.md SPEC.md CHANGELOG.md CHECKLIST.md TODO.md README.md
├─ .cpanel.yml         → cPanel deploy: public/ içeriğini public_html'e kopyalar
├─ .claude/launch.json → yerel önizleme sunucusu (py -m http.server)
└─ public/             → SİTENİN KENDİSİ (sadece bu klasör yayınlanır)
   ├─ index.html
   ├─ .htaccess        → güvenlik başlıkları, CSP, MIME, dizin listeleme kapalı
   ├─ words.txt        → kelime listesi (her satır 1 kelime, 5–10 harf)
   ├─ kural.txt        → Kurallar penceresi metni (basit markdown)
   ├─ css/style.css    → tüm stiller (tema değişkenleri en üstte)
   ├─ js/config.js     → TÜM dosya adları, ses seviyeleri, sabitler (kullanıcı sadece burayı düzenler)
   ├─ js/util.js       → güvenli fetch, depolama, Türkçe metin yardımcıları, mini markdown
   ├─ js/audio.js      → ses yöneticisi (3 mod, sentez yedek)
   ├─ js/hangman.js    → animasyon (svg / frames / video)
   ├─ js/game.js       → oyun mantığı ve arayüz
   └─ images/          → TÜM görseller, GIF'ler, sesler (.htaccess ile script çalıştırma kapalı)
```

## Kod yazım kuralları
- Türkçe arayüz metinleri, kodda İngilizce değişken adları + Türkçe yorumlar; bölümler `/* === ... === */`.
- Kullanıcı/dosya kaynaklı veri **asla** `innerHTML` ile basılmaz → `textContent` / DOM API.
- Büyük harf dönüşümü her zaman `toLocaleUpperCase('tr-TR')`.
- Dosya adlarında Türkçe karakter ve boşluk yok, hepsi küçük harf (Linux büyük/küçük harf duyarlı).
- Renkler sadece CSS değişkenlerinden (`:root` / `[data-theme="dark"]`).
- Tekrarlanan kod yerine yardımcı fonksiyon.

## Güvenlik notları
- CSP (meta + .htaccess), `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `frame-ancestors 'none'`,
  `Referrer-Policy`, `Permissions-Policy`, dizin listeleme kapalı, `.md`/nokta dosyaları erişime kapalı.
- `fetch`: sadece aynı köken (`same-origin`), `credentials: 'same-origin'`, `Content-Type` `text/plain`
  kontrolü, boyut sınırı, her kelime Türk alfabesi regex'iyle doğrulanır.
- Tahmin girişi: `maxlength`, sadece Türk harfleri kabul, `textContent` ile gösterim.
- `localStorage` verisi JSON parse + şema doğrulamasıyla okunur, bozuksa sıfırlanır.
- CSRF: sunucuya durum değiştiren istek yok → CSRF yüzeyi yok. İleride form/PHP eklenirse token gerekir.
- `.git` klasörü web köküne hiç girmez (repo public_html dışında, deploy sadece `public/` kopyalar).

## Kullanıcı tercihleri (2026-10-28)
- Varsayılan tema **koyu = kara tahta** (koyu yeşil-gri zemin, beyaz tebeşir). Açık tema = buruşuk kâğıt + siyah kalem.
- Kelime yerleri: **el çizimi alt çizgi** (kutu değil).
- Klavye tuşları: **çerçevesiz el yazısı harf**; doğru = yeşil daire çizilir, yanlış = kırmızı çarpı çizilir.
- 29 harfli Türk alfabesi (Q, W, X yok).
- Git: yerel repo kuruldu; kullanıcı GitHub repo URL'sini verecek (bkz. TODO.md).
- Ton: samimi, eğlenceli Türkçe.

## Bilinen kısıtlar
- `file://` ile `fetch` çalışmaz → yedek kelime listesi + uyarı.
- iOS Safari sessiz modda (fiziksel anahtar) Web Audio sesi çalmayabilir.
- Google Fonts yüklenemezse sistem el yazısı fontlarına düşer (Comic Sans MS vb.).
