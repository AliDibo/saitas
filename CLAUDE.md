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
`config.js → HANGMAN.mode` beş mod destekler (`sprite` 5. madde):
1. **`"svg"` (varsayılan, yer tutucu):** `js/hangman.js` içinde kalemle çizilmiş SVG (darağacı + ağaç,
   2. referans fotoğraftaki gibi). Her parça `pathLength=1` + `stroke-dashoffset` geçişiyle **çizilerek**
   gelir, hata azalınca **silinerek** geri gider. Dosya gerektirmez, her çözünürlükte keskin, temaya
   göre renk değiştirir (`currentColor`), çok hafif.
2. **`"frames"`:** Kullanıcının 7 görseli (`adam-0.png` … `adam-6.png`) üst üste konur, aktif kare
   çapraz geçişle (crossfade) gösterilir. "7 fotoğraf sistemi" isteyen için.
3. **`"sequence"` (kullanıcının kendi animasyonu için önerilen):** PNG/WebP kare dizisi
   (`images/animasyon/kare-000.webp` …). `stageFrames` her hata sayısını bir kareye eşler; hedef kareye
   `fps` hızında kare kare **ileri veya geri** gidilir (setTimeout zinciri, kareler önceden yüklenir).
   Yeni oyunda geri oynatmadan ilk kareye atlar.
4. **`"video"`:** Tek video dosyası; hata sayısına karşılık gelen zamana yumuşak "scrub" yapılır
   (ileri/geri). `videoStages` verilmezse süre 7 eşit parçaya bölünür. Akıcı geri sarma için `-g 1`.
5. **`"sprite"` (kullanıcının SEÇTİĞİ yöntem, 2026-11-03):** sabit `daragaci.png` + `adam-sprite.png` (ip + adam, tüm
   kareler tek resimde ızgara). `background-position` ile kare seçilir; sequence ile aynı kare oynatıcı (`playTo`/`jumpTo`).
   Kutu `container-type: size` + `cqw/cqh` ile bölmeye sığar. Adam `.hm-man` `pivot` etrafında rAF ile sallanır,
   genlik hata sayısıyla orantılı (zaman tabanlı yumuşatma). **Aynı sallanma yerleşik `svg` çiziminde de var:**
   ip `SCENE`'den çıkarıldı (`ROPE`), ip + adam `.hm-swing` grubunda (170,59) etrafında döner. 60 ayrı dosya indirmek istenmediği için seçildi;
   video + karıştırma modu fikri geri sarmada takılma riski yüzünden elendi.
- `invertInDark: true` → koyu temada kullanıcı görselleri `filter: invert(1) hue-rotate(180deg)`.
- Kullanıcıya yönelik tüm görsel/ses/animasyon ölçüleri: **`GORSEL-REHBERI.md`** (değişince güncelle).
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
├─ CLAUDE.md SPEC.md CHANGELOG.md CHECKLIST.md TODO.md README.md GORSEL-REHBERI.md
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
   ├─ js/hangman.js    → animasyon (svg / frames / sequence / sprite / video)
   ├─ js/game.js       → oyun mantığı ve arayüz
   └─ images/          → TÜM görseller, GIF'ler, sesler (.htaccess ile script çalıştırma kapalı)
```

## Kod yazım kuralları
- Türkçe arayüz metinleri, kodda İngilizce değişken adları + Türkçe yorumlar; bölümler `/* === ... === */`.
- Kullanıcı/dosya kaynaklı veri **asla** `innerHTML` ile basılmaz → `textContent` / DOM API.
- Büyük harf dönüşümü her zaman `toLocaleUpperCase('tr-TR')`.
- Dosya adlarında Türkçe karakter ve boşluk yok, hepsi küçük harf (Linux büyük/küçük harf duyarlı).
- Renkler sadece CSS değişkenlerinden (`:root` / `[data-theme="dark"]`).
- CSP nedeniyle HTML'de `style=""` niteliği kullanılmaz; dinamik stil JS'den `element.style.setProperty` ile verilir.
- CSS değişkeniyle verilen `url()` yolları JS'de tam adrese çevrilir (yoksa `css/` klasörüne göre çözülür).
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
- Doğru/yanlış işaretleri **kalın marker** gibi (SVG filtre `#mk-rough`, `index.html` başındaki ortak `<svg class="svg-defs">`).
- Bölmelerde **başlık yazısı yok** (KLAVYE / HARF SAYISINA GÖRE BÖLME kaldırıldı), animasyon bölmesinde **hata sayısı yazısı yok**.
- Bölmelerde **tek çerçeve**; arkada ikinci soluk çerçeve istenmiyor.
- Ses/tema butonları Kurallar/Yeniden Başlat ile **aynı el çizimi buton dilinde**, emoji yok, el çizimi SVG ikon.
- Arka plan her tema için `config.js → BACKGROUNDS` ile değiştirilebilir; varsayılan doku korunur. Görsel arka planda bölmeler **karartılmaz/opaklaşmaz** (kullanıcının görselleri düz açık gri / koyu gri fon olacak).
- Kırmızı çarpı harfin **~%110–120'si** boyunda (büyük olmasın).
- Asılma animasyonunu **kullanıcı kendisi tasarlayacak** → **`sprite` modu**: sabit darağacı + tek sprite sheet, hata arttıkça artan sallanma **±10°** (`sway.maxDeg`).
- Dosya türü seçimi (2026-11-03): logo **`logo.png`**, kazanma/kaybetme **`kazandin.gif` / `kaybettin.gif`**. Dosya yoksa `game.js → PLACEHOLDERS` içindeki `.svg` yer tutucular gösterilir (yer tutucu svg'leri silme).
- Git: https://github.com/AliDibo/saitas (`origin/main`). Değişiklikten sonra commit + push.
- Banner'da üst çizgi **yok** (2026-11-03).
- (2026-11-04) Giriş ekranında **karartma ve soldurma yok**, **"AS" yazısı yok**; buton büyük ve ekranın tam ortasında, görsel daireyi **tamamen kaplar** (cover). Sonuç ekranı arka planı **tam siyah**.
- Logo oranı **720×120** önerilir; ses/tema butonlarının yeri **değiştirilmeyecek**. Logo dar ekranda **küçülmez, sola kayar** (soldaki ölü alanı kullanır), yer varsa tam ortada (2026-11-04).
- Giriş butonu çapı arka plan görseline bağlı (`style.css → --intro-btn-ratio: 0.22`): kullanıcının `giris-arka-plan.gif`'inde boş bant görsel yüksekliğinin ~%36–%62'si arası (üstte "Asa'n Kazanır!", altta "saitas.com.tr" yazısı). Arka plan değişirse bu oran yeniden ayarlanmalı.
- `blog/` klasörü yanlışlıkla repoya girmişti, kullanıcı sildi; geçmişten temizlenmesine gerek yok (kullanıcı onayı).
- Sekme/Google/paylaşım bilgileri `index.html` başındaki işaretli blokta (JS ile değil: tarayıcı dışı botlar JS çalıştırmaz). Alan adı: **saitas.com.tr** (index.html'de 3 yerde).
- (2026-11-06) Kullanıcının görselleri commit'lendi: `logo.png`, `kazandin.gif` (18 MB), `kaybettin.gif` (21 MB), `giris-arka-plan.gif` (23 MB), `giris-buton.png`. GIF'ler büyük; hareketli WebP'ye çevrilirse sayfa çok daha hızlı açılır (öneri, zorunlu değil). Artık `git add -A` serbest.
- Ton: samimi, eğlenceli Türkçe.

## Bilinen kısıtlar
- `file://` ile `fetch` çalışmaz → yedek kelime listesi + uyarı.
- iOS Safari sessiz modda (fiziksel anahtar) Web Audio sesi çalmayabilir.
- Google Fonts yüklenemezse sistem el yazısı fontlarına düşer (Comic Sans MS vb.).
- **Hareket azaltma:** Kullanıcının laptopunda Windows "Animasyon efektleri" kapalı → tarayıcı `prefers-reduced-motion: reduce` bildirir. Bu yüzden oyun animasyonları bu sorguyla **kapatılmaz** (önceki sürümde kapatılıyordu, laptopta animasyon görünmüyordu). Sadece giriş butonunun zıplaması durur; adamın sallanması kullanıcı isteği olduğu için durmaz.
- Dosya güncellemesinden sonra tarayıcı eski CSS/JS'i önbellekten gösterebilir → Ctrl+F5.
- Önizleme paneli arka plandayken CSS geçişleri ilerlemez; test ederken panel görünür olmalı.
