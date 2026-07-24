# Örnek Rapor: "Cinsiyete göre tedavi maliyeti farklı mı?"

Bu rapor, `tests/fixtures/hasta_kayitlari.json` içindeki gerçek veri
(1010 hasta kaydı) üzerinden, sistemin ürettiği JSON çıktısından
oluşturulmuştur. Aşağıdaki tüm sayılar `tests/integration.test.js`
içinde otomatik olarak doğrulanmaktadır.

---

## Hipotezler

**H0:** Cinsiyet gruplarına göre tedavi maliyeti medyanları arasında
istatistiksel olarak anlamlı bir fark yoktur.

**H1:** Cinsiyet gruplarına göre tedavi maliyeti medyanları arasında
istatistiksel olarak anlamlı bir fark vardır.

## Yöntem

Katılımcıların cinsiyet grupları arasındaki tedavi maliyeti puanlarının
karşılaştırılmasında öncelikle bağımsız örneklem t-testi düşünülmüştür.
Analiz öncesinde verilerin normal dağılım gösterip göstermediği
Shapiro-Wilk Testi ile incelenmiş; hem kadın (n=513, p < .001) hem erkek
(n=475, p < .001) gruplarının normal dağılım varsayımını sağlamadığı
görülmüştür. Bu nedenle parametrik test varsayımları sağlanamadığından,
non-parametrik bir alternatif olan Mann-Whitney U Testi tercih edilmiştir.

## Bulgular

Mann-Whitney U Testi sonuçlarına göre, kadın hastaların tedavi maliyeti
medyanı 7213 TL iken, erkek hastaların medyanı 7404 TL olarak
hesaplanmıştır. Gruplar arasındaki farkın istatistiksel olarak anlamlı
olmadığı görülmüştür (U = 117299.5, z = -1.013, p = .311).

## Yorum

Elde edilen bulgular, hastaların tedavi maliyetinin cinsiyet
değişkeninden bağımsız olduğunu ortaya koymaktadır. İstatistiksel olarak
anlamlı bir fark bulunamaması, cinsiyetin tedavi maliyeti üzerinde
belirleyici bir faktör olmadığını göstermektedir.

## Sınırlılıklar

Maliyet değişkeninin her iki grupta da normal dağılım göstermemesi
(sağlık/fatura verilerinde tipik olan sağa-çarpıklık), sonuçların
yorumlanmasında dikkate alınmalıdır. Parametrik olmayan bir test
kullanılmış olması, sonuçların medyan bazlı karşılaştırmaya dayandığı
anlamına gelir.

---

## Ham JSON Çıktısı (Referans)

```json
{
  "analiz_turu": "grup_karsilastirma",
  "onerilen_test_ai": "t-test",
  "uygulanan_test": "mann-whitney",
  "override_aciklamasi": null,
  "bagimli_degisken": "maliyet_tl",
  "gruplayici_degisken": "cinsiyet",
  "grup_bazli_normallik": {
    "Kadın": { "n": 513, "W_statistic": 0.839109, "p_value": 0, "is_normal": false },
    "Erkek": { "n": 475, "W_statistic": 0.846812, "p_value": 0, "is_normal": false }
  },
  "sonuc": {
    "test": "Mann-Whitney U Testi",
    "U_statistic": 117299.5,
    "z": -1.0125,
    "p_value": 0.311289,
    "is_significant": false,
    "group_medians": { "Kadın": 7213, "Erkek": 7404 }
  }
}
```
