# Adam Asmaca (Türkçe)

Kalemle çizilmiş görünümlü, framework'süz (HTML + CSS + JS) Türkçe Adam Asmaca oyunu.
Sitenin kendisi `public/` klasöründedir.

## ⚠️ Çift tıklayarak açma
`public/index.html` dosyasını çift tıklayıp (`file://`) açarsan tarayıcı `words.txt` ve `kural.txt`
dosyalarını **okuyamaz** (güvenlik kuralı). Oyun yedek kelime listesiyle açılır ve uyarı gösterir.
Yerelde bir sunucu ile aç:

```bash
py -m http.server 8080 --bind 127.0.0.1 --directory public
```

Sonra tarayıcıda `http://localhost:8080` adresine git.

## Dosyalarını değiştirmek
> Tüm ölçüler, dosya tipleri ve kendi animasyonunu ekleme adımları: **[GORSEL-REHBERI.md](GORSEL-REHBERI.md)**

Tüm görseller, GIF'ler ve sesler `public/images/` klasöründe. Dosya adları **tek bir yerde**:
`public/js/config.js`. Yeni dosyayı klasöre koy, adını config'de güncelle. Dosya adlarında Türkçe
karakter ve boşluk kullanma, küçük harf kullan.

| Dosya (config anahtarı) | Önerilen boyut / biçim | Şu an |
|---|---|---|
| `BACKGROUNDS.light` / `.dark` | 1920×1080 JPG/PNG/WebP (boş = varsayılan kâğıt / kara tahta) | boş |
| `IMAGES.logo` | 1920×120, şeffaf PNG veya SVG | yer tutucu `logo.svg` |
| `IMAGES.introBg` | 1920×1080, JPG / GIF | yer tutucu `giris-arka-plan.svg` |
| `IMAGES.introButton` | 512×512, kare PNG | yer tutucu `giris-buton.svg` |
| `IMAGES.winGif` | 800×600 GIF | yer tutucu `kazandin.svg` |
| `IMAGES.loseGif` | 800×600 GIF | yer tutucu `kaybettin.svg` |
| `SOUNDS.music` | MP3, döngüye uygun, 1–3 dk | yok → sentez melodi |
| `SOUNDS.correct` / `wrong` | MP3, < 1 sn | yok → sentez ses |
| `SOUNDS.win` / `lose` | MP3, 1–3 sn | yok → sentez ses |
| `HANGMAN.sequence` (mode `sequence`, önerilen) | Kare dizisi, 600×800 şeffaf WebP/PNG, `kare-000…` | yok → yerleşik SVG |
| `HANGMAN.frames` (mode `frames`) | 7 PNG, aynı boyut (ör. 600×800), şeffaf | yok → yerleşik SVG |
| `HANGMAN.video` (mode `video`) | MP4/WebM, 0→6 eşit aralıklı | yok → yerleşik SVG |

Ses seviyeleri `VOLUMES` içinde. Kelimeler `public/words.txt` (her satır 1 kelime, 5–10 harf),
kurallar metni `public/kural.txt` (basit markdown: `#` başlık, `**kalın**`, `*italik*`, `-` liste).

## cPanel'e yayınlama (Git ile)
1. GitHub'da boş bir repo aç, bu klasörü push et.
2. cPanel → **Git™ Version Control** → *Create* → *Clone a Repository*; repo URL'sini gir,
   klon yolu **public_html dışında** olsun (ör. `/home/KULLANICI_ADI/repositories/adam-asmaca`).
3. `.cpanel.yml` içindeki `KULLANICI_ADI` kısmını kendi cPanel kullanıcı adınla değiştir, commit + push.
4. cPanel'de repoda **Manage → Pull or Deploy → Update from Remote**, sonra **Deploy HEAD Commit**.
   Sadece `public/` içeriği `public_html`'e kopyalanır; `.git` ve `.md` dosyaları web'e çıkmaz.
5. SSL aktifse `public/.htaccess` içindeki HTTPS yönlendirme ve HSTS satırlarını aç.

Her güncellemede: değişiklik → commit → push → cPanel'de *Update from Remote* + *Deploy*.
