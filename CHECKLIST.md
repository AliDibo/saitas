# CHECKLIST – Regresyon Kontrol Listesi

Her değişiklikten sonra ilgili satırları kontrol et. Son tam kontrol: **2026-10-28** (v1.0.0, tarayıcı önizlemesi).
Durum: ✅ test edildi · ⬜ henüz test edilmedi (gerçek cihaz / ses dosyası gerektirir)

## Test boyutları
| Boyut | Durum | Not |
|---|---|---|
| Masaüstü 800×600 ve üzeri | ✅ | İki sütun, alt butonlar çakışmıyor |
| 360×640 dikey | ✅ | Tek sütun; ~10 px kaydırma payı var, butonlar içerikle çakışmıyor |
| 390×844 dikey | ✅ | Tamamı tek ekranda |
| 412×915 dikey | ⬜ | 390×844 ile aynı kurallar |
| 640×360 yatay | ✅ | İki sütun; ~20 px kaydırma payı |
| 844×390 yatay | ✅ | İki sütun, tamamı sığıyor |
| 915×412 yatay | ⬜ | |
| 768×1024 tablet | ✅ | Dikey tek sütun düzeni |
| Gerçek iOS / Android cihaz | ⬜ | |

## Özellikler (SPEC ile eşleşir)
- [x] F-01/02 Kelime 5–10 harf, `words.txt` temizleniyor (Türkçe büyük harf)
- [x] F-03 El çizimi alt çizgiler, harf sayısı kadar
- [x] F-04 29 harf alfabetik
- [x] F-05 Doğru harf: yeşil daire, tüm yerlerde açılıyor, tuş devre dışı
- [x] F-06 Doğru harf hatayı 1 azaltıyor (2 yanlış + 1 doğru = 1 hata)
- [x] F-07 Yanlış harf: kırmızı çarpı, hata +1
- [x] F-08 6 hatada kayıp, tüm harfler açılınca kazanç
- [x] F-09 Tahmin Et butonu + Enter, doğru kelime = kazanç
- [x] F-10 Yanlış tahmin +1 hata, kırmızı etiket, tekrar sayılmıyor
- [x] F-11 Girişte HTML/simge temizleniyor (`<img src=x>` → `İMGSRC`), uzunluk uyarısı
- [x] F-12 Kullanılmış kelime localStorage'da
- [x] F-13 Yeniden Başlat her şeyi sıfırlıyor
- [x] F-20/21 Animasyon ileri / geri yumuşak
- [ ] F-22 `frames` ve `video` modları (kullanıcı dosyası gelince test et)
- [x] F-30 Banner 10vh, üst kenarlık, logo ortada
- [x] F-31 İki sütun düzen
- [x] F-32 Ses + tema sağ üstte, hover'da hiza korunuyor
- [x] F-33 Kurallar / Yeniden Başlat eşit boyut, aynı çizgi
- [x] F-40/41 Giriş ekranı, "AS" yazısı butonun altında
- [x] F-42/43/44 Sonuç ekranı, sıralı geçiş, diğer her şey gizli
- [ ] F-50–54 Gerçek ses dosyalarıyla seviye / takılma testi
- [x] F-52 Ses modu döngüsü ve kaydı
- [x] F-55 Ses butonu temanın tersi, sessizde soluk
- [x] F-56 Dosya yokken sentez sesler
- [x] F-60/61 Tema geçişi ve kaydı, iki temada okunaklılık
- [x] F-70/71 Kurallar penceresi, Esc ile kapanma, markdown
- [x] F-80/81/82/83 Mobil düzenler
- [x] F-90 `words.txt` yoksa yedek liste + uyarı (kod yolu mevcut)
- [x] F-91 Fiziksel klavye (küçük harf `ş` → `Ş` çalışıyor)
- [x] F-92 alt / aria-label / aria-live
- [x] F-93 CSP ve güvenlik başlıkları (`.htaccess` canlı sunucuda doğrulanmalı)

## Tema × mod
- [x] Koyu tema – masaüstü · [x] Açık tema – masaüstü
- [x] Açık tema – mobil dikey · [ ] Koyu tema – mobil yatay (gerçek cihaz)
