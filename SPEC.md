# SPEC.md – Özellik Listesi (test edilebilir)

Her madde `CHECKLIST.md` içinde kontrol satırına sahiptir. Değişiklikte ilgili maddeyi güncelle.

## Oyun kuralları
- **F-01:** Kelime `words.txt` içinden, 5–10 harf arası olanlardan rastgele seçilir.
- **F-02:** `words.txt` okunurken boşluklar temizlenir, boş satırlar atılır, `tr-TR` büyük harfe çevrilir, 5–10 dışı ve Türk alfabesi dışı karakter içerenler elenir.
- **F-03:** Kelimenin her harfi için el çizimi alt çizgi (kelime yeri) gösterilir.
- **F-04:** Klavye: 29 Türk harfi alfabetik sırada (`A B C Ç D E F G Ğ H I İ J K L M N O Ö P R S Ş T U Ü V Y Z`), her biri buton.
- **F-05:** Doğru harf: ilgili tüm yerlerde görünür, tuşa yeşil daire çizilir, tuş devre dışı kalır, doğru sesi çalar.
- **F-06:** Doğru harf, hata sayısı > 0 ise hatayı 1 azaltır (animasyon bir adım geri).
- **F-07:** Yanlış harf: tuşa kırmızı çarpı çizilir, tuş devre dışı, hata +1 (animasyon bir adım ileri), yanlış sesi.
- **F-08:** 6 hatada oyun kaybedilir; tüm harfler açılınca kazanılır.
- **F-09:** Kelime tahmini: giriş + "Tahmin Et" butonu, Enter ile de çalışır. Doğruysa doğrudan kazanılır.
- **F-10:** Yanlış tahmin hata +1 sayılır, kırmızı etiket olarak "Yanlış Tahminler" listesine eklenir; aynı yanlış kelime tekrar sayılmaz. Karşılaştırma `tr-TR` büyük harfle.
- **F-11:** Tahmin girişi yalnızca Türk harflerini kabul eder (maks. 10), boş giriş veya gizli kelimeyle aynı uzunlukta olmayan tahmin hata sayılmaz, "Kelime N harfli" uyarısı verir (yazım kazalarında can kaybını önlemek için).
- **F-12:** Kullanılmış kelimeler `localStorage`'da tutulur, tekrar gelmez; liste bitince otomatik sıfırlanır.
- **F-13:** "Yeniden Başlat": yeni kelime, hata 0, klavye aktif, yanlış tahminler temiz, müzik baştan.

## Animasyon
- **F-20:** Animasyon hata sayısına (0–6) bağlı; 0 = başlangıç, 6 = kayıp.
- **F-21:** Hata artınca ileri, azalınca geri oynar; geçişler yumuşak.
- **F-22:** `config.js → HANGMAN.mode`: `svg` (yer tutucu), `frames` (7 görsel), `video` (scrub). Kullanıcı dosyayı `images/`'e koyup adı config'de değiştirerek animasyonu değiştirir.
- **F-23:** Animasyon alanı solda büyük dikey bölmede, üstünde başlık yok.

## Ekran düzeni
- **F-30:** Üst banner: `10vh`, tam genişlik, sadece üst kenarlık, ortada sığdırılmış logo (`config.js → IMAGES.logo`).
- **F-31:** Ana alan iki sütun: sol animasyon; sağ üst "KLAVYE" (tuşlar yatay ortalı, flex-wrap); sağ alt "HARF SAYISINA GÖRE BÖLME" (kelime yerleri + tahmin + yanlış tahminler).
- **F-32:** Sağ üst sabit: ses ve tema butonları yan yana, banner'ın dikey ortasında; hover büyümesi hizayı bozmaz.
- **F-33:** Sol alt "Kurallar", sağ alt "Yeniden Başlat": eşit boyut/font, aynı yatay çizgi, kenarlardan eşit uzaklık, içerikle çakışmaz.

## Ekranlar ve akış
- **F-40:** Giriş ekranı: tam ekran arka plan (cover) + hafif karartma; ortada beyaz yuvarlak buton, içinde %60 opak görsel, butonun altında "AS" yazısı.
- **F-41:** Giriş butonuna basınca giriş ekranı kapanır, oyun açılır, müzik başlar.
- **F-42:** Sonuç ekranı: koyu perde, ortada GIF (kazanma/kaybetme), altında kelime (kazanınca yeşil, kaybedince kırmızı), altında "Yeniden Başlat".
- **F-43:** Sonuç ekranı fade-in; görsel hafif büyüyerek, kelime ve buton sırayla aşağıdan yukarı belirir.
- **F-44:** Sonuç ekranında müzik durur, kazanma/kaybetme sesi çalar; sabit butonlar ve oyun gizli/etkisiz.

## Ses
- **F-50:** Arka plan müziği döngülü, giriş sonrası oyun boyunca.
- **F-51:** Efektler: doğru, yanlış, kazanma, kaybetme.
- **F-52:** Ses butonu 3 mod: 🔊 Hepsi → 🔔 Sadece efektler → 🔇 Sessiz → … ; mod `localStorage`'da.
- **F-53:** Seviyeler config'den: müzik 0.3, doğru/yanlış 0.4, kazanma/kaybetme 0.5.
- **F-54:** Efektler hızlı art arda basışta takılmaz (Web Audio).
- **F-55:** Ses butonu rengi temanın tersi; sessiz modda soluk.
- **F-56:** Ses dosyası yoksa sentezlenmiş yer tutucu ses çalar.

## Tema
- **F-60:** Varsayılan koyu (kara tahta). Tema butonu açık ↔ koyu; tercih `localStorage`'da.
- **F-61:** Tüm öğeler iki temada okunaklı; geçişler ≈0.3 sn.

## Kurallar penceresi
- **F-70:** "Kurallar" butonu tam ekran perde üzerinde modal açar; yumuşak açılma/kapanma, "Kapat" butonu, Esc ve perdeye tıklama ile kapanır, taşarsa kaydırılır.
- **F-71:** İçerik `kural.txt`'den okunur; basit markdown (`#` başlık, `**kalın**`, `*italik*`, `-` liste), satır sonları korunur. Okunamazsa anlaşılır hata metni.

## Mobil
- **F-80:** Telefon yatay: iki sütun korunur, her şey ekrana sığar, banner incelir.
- **F-81:** Telefon dikey: üstte animasyon (yüksekliği sınırlı), altında klavye, kelime yerleri, tahmin; mümkün olduğunca tek ekranda.
- **F-82:** Klavye tuşları taşmaz, flex-wrap ile satırlara bölünür; dokunma hedefi ≥ 40px.
- **F-83:** Sabit butonlar küçük ekranda eşit boyutlu, hizalı, çakışmasız.

## Teknik
- **F-90:** `words.txt` okunamazsa yedek liste + görünür uyarı; oyun çökmez.
- **F-91:** Fiziksel klavyede harfe basınca ilgili tuş tetiklenir; tahmin girişi odaktayken veya bir pencere açıkken tetiklenmez.
- **F-92:** Erişilebilirlik: görsellerde `alt`, butonlarda `aria-label`, durum değişiklikleri `aria-live` ile duyurulur.
- **F-93:** Güvenlik: CSP, güvenlik başlıkları, `innerHTML` ile dış veri basılmaz, fetch MIME/köken kontrolü.
