# Corraline — LLM Destekli, Deterministik Doğrulamalı İstatistik Motoru

Bir n8n workflow'unda çalışan, doğal dilde sorulan istatistik sorularını
(örn. *"cinsiyete göre maliyet farklı mı?"*) SPSS tarzı bir analiz raporuna
dönüştüren sistemin çekirdek hesaplama motoru.

## Mimari

```
Kullanıcı sorusu
      │
      ▼
AI Agent (LLM)  ── SADECE metin seviyesinde karar verir:
      │              hangi analiz kategorisi? hangi sütunlar?
      ▼
corraline.js (bu repo) ── TÜM sayısal hesaplama burada, deterministik:
      │                    - AI'nin önerisi gerçek varsayım testleriyle
      │                      (Shapiro-Wilk, Levene) doğrulanır/gerekirse
      │                      geçersiz kılınır
      │                    - AI'nin verdiği hiçbir sayı doğrudan kullanılmaz,
      │                      sadece sütun adı/kategori metni olarak okunur
      ▼
AI Agent1 (LLM) ── Sadece JSON'daki sayıları APA formatına döker,
                     yeni bir sayı üretmez
```

**Temel ilke:** LLM hiçbir zaman bir p-değeri, istatistik değeri veya test
sonucu *hesaplamaz* — sadece hangi testin uygun olabileceğini önerir ve bu
öneri, veri üzerinde çalışan gerçek matematiksel fonksiyonlarla (aşağıya
bakın) her seferinde çapraz kontrol edilir.

## Desteklenen Testler

- Bağımsız örneklem t-testi, Welch t-testi, Mann-Whitney U
- Tek yönlü ANOVA, Welch's ANOVA, Kruskal-Wallis
- Eşleştirilmiş t-testi, Wilcoxon İşaretli Sıra Testi
- Pearson ve Spearman korelasyonu
- Ki-kare bağımsızlık testi
- Basit ve çoklu doğrusal regresyon (VIF, artık normalliği, Durbin-Watson,
  doğrusallık testi dahil)
- Lojistik regresyon (Newton-Raphson/IRLS)
- Cronbach's Alpha
- **Shapiro-Wilk normallik testi** (Royston 1995, AS R94) — `scipy.stats.shapiro`
  ile 12 farklı örneklem büyüklüğünde (n=3'ten n=1000'e) 6 ondalık basamağa
  kadar doğrulandı
- Levene Testi (Brown-Forsythe)
- Likert ölçek dönüşümü, ters kodlama, çok maddeli endeks/composite skor oluşturma

## Kaynaklar

- Gamma/Beta fonksiyonları: *Numerical Recipes in C* (Press, Teukolsky,
  Vetterling, Flannery)
- Shapiro-Wilk: Royston, P. (1995). *Remark AS R94: A remark on Algorithm
  AS 181: The W test for normality.* Applied Statistics, 44(4), 547-551.

## Test Etme

```bash
npm install
npm test
```

Test paketi şunları kapsar:
- **Shapiro-Wilk doğruluğu** — scipy'nin gerçek çıktısıyla 14 senaryoda
  (normal, çarpık, tekrarlı değerli, n=3'ten n=1000'e) birebir karşılaştırma
- **Sayısal ayrıştırma (`toNumber`)** — Türkçe ondalık virgülü doğru işleme,
  aralık-etiketli kategorik değerlerin ("0-6ay" gibi) sessizce sayıya
  çevrilmesini engelleme
- **Test seçim mantığı (routing)** — AI'nin yanlış test önerisinin gerçek
  veri tipine göre nasıl geçersiz kılındığı
- **Çökme koruması** — hata döndüren istatistik fonksiyonlarının grafik
  oluşturma adımında tüm workflow'u çökertmediği
- **Uçtan uca entegrasyon** — gerçek bir anket (n=160) ve gerçek bir klinik
  veri setiyle (n=1010), SPSS ve scipy'ye karşı doğrulanmış tam senaryolar

## Bilinen Sınırlamalar

- Değişken/sütun adı eşleştirmesi, AI'nin ürettiği serbest metnin veri
  setindeki gerçek sütun adlarıyla (fuzzy substring match) örtüşmesine
  dayanır — AI bir sütunu tamamen farklı bir kelimeyle tarif ederse
  eşleşme başarısız olabilir.
- Ters kodlanan bir ölçeğin teorik min/max aralığı, sadece Likert-sözlüğünden
  dönüştürülen sütunlar için kesin olarak bilinir; zaten sayısal girilmiş
  ölçekler için (AI `SCALE:` ile belirtmediği sürece) gözlemlenen veri
  aralığına dayanır.
- Kategorik/sayısal ayrımı, bir sütunun ilk 20 dolu satırının çoğunluğuna
  bakarak yapılır — çok küçük örneklemlerde ya da tüm veri setinde tutarsız
  formatlı sütunlarda yanlış sınıflandırma teorik olarak mümkündür.
