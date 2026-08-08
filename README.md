# Corraline

**LLM'in doğal dil anlayışını, deterministik ve doğrulanmış istatistiksel
hesaplamayla birleştiren bir otomatik veri analizi sistemi.**

Bir n8n workflow'u üzerinde çalışır: kullanıcı bir veri seti (CSV/Excel)
yükler, doğal dilde bir soru sorar (*"cinsiyete göre maliyet farklı mı?"*,
*"bu 36 maddeden bir farkındalık endeksi oluştur, staj süresine göre bak"*
gibi), sistem uygun istatistiksel testi seçer, varsayımlarını (normallik,
varyans homojenliği) kontrol eder, gerçek formüllerle hesaplar ve APA
formatında akademik bir rapor olarak geri dönüt verir.

---

## İçindekiler

- [Neden Bu Projeyi Geliştirdim](#neden-bu-projeyi-geliştirdim)
- [Mimari](#mimari)
- [Desteklenen Analizler](#desteklenen-analizler)
- [Örnek Kullanım](#örnek-kullanım)
- [Geliştirme Süreci ve Karşılaşılan Zorluklar](#geliştirme-süreci-ve-karşılaşılan-zorluklar)
- [Test Paketi](#test-paketi)
- [Kaynaklar](#kaynaklar)
- [Bilinen Sınırlamalar](#bilinen-sınırlamalar)
- [Kurulum](#kurulum)

---

## Neden Bu Projeyi Geliştirdim

Gözlemlediğim kadarıyla istatistiksel analiz genellikle iki uç arasında sıkışarak sorun yaşıyor:
Ya SPSS gibi güçlü ama kullanımı deneyim gerektiren bir yazılıma hakim olmak gerekiyor,
ya da "hangi testi kullanmalıyım" sorusuna cevap bulmak için ayrı bir
kaynağa (istatistikçi, ders kitabı, yapay zeka) başvurmak gerekiyor. Buna ek olarak
 büyük dil modellerinin (LLM) yükselişiyle birlikte "AI'a sor,
o hesaplasın" yaklaşımı herkes için kolay ve hızlı görünüyor. Ama bu, ciddi bir problemi
beraberinde getiriyor. Çünkü LLM'ler istatistiksel anlamdaki hesaplamaların hiçbirinde tamamen güvenilir
değil. Bir p-değeri üretimi sağlayabilir, ancak bu değerin gerçek veriden
doğru şekilde hesaplandığının ve yorumlandığının hiçbir garantisini veremezler.

Corraline, bu ikilemi şöyle çözmeyi hedefliyor: **LLM'i sadece anlama ve
karar verme katmanında kullan, hesaplamayı asla ona bırakma.** Kullanıcının
"cinsiyete göre maliyet farklı mı" sorusunu anlayıp bunun bir grup
karşılaştırma sorusu olduğuna karar vermek LLM'in işi; ama t-testinin
gerçekte yapılıp yapılmayacağına (yoksa varsayımlar ihlal edildiği için
Mann-Whitney U'ya mı geçileceğine), ve o testin p-değerinin ne olduğuna
tamamen deterministik, veriye dayalı bir kod katmanı karar veriyor. LLM'in
önerisi her zaman gerçek varsayım testleriyle (Shapiro-Wilk, Levene) çapraz
kontrol ediliyor ve gerekirse geçersiz kılınıyor.

Bu projeyi, hem bu mimari fikri gerçek bir sistemde uygulayabilmek hem de
istatistiksel yazılım geliştirmenin (doğru formül seçimi, varsayım
kontrolü, üçüncü parti kaynaklarla doğrulama, hata ayıklama disiplini)
ne gerektirdiğini uçtan uca deneyimlemek için geliştirdim.

## Mimari

```
Kullanıcı sorusu + veri seti (CSV/XLSX)
              │
              ▼
   ┌─────────────────────┐
   │   AI Agent (LLM)    │  SADECE metin seviyesinde karar verir:
   │  (Google Gemini)    │  hangi analiz kategorisi? hangi sütunlar?
   └──────────┬───────────┘  (bir sayı, bir p-değeri ASLA üretmez)
              │  { onerilen_test, bagimli_degisken,
              │    gruplayici_degisken, gerekce, ... }
              ▼
   ┌─────────────────────────────────────────────┐
   │         corraline.js  (BU REPO)              │
   │  ───────────────────────────────────────     │
   │  1. AI'nin önerisini bir "ilk işaret" olarak  │
   │     alır, ama KÖRÜ KÖRÜNE GÜVENMEZ             │
   │  2. Değişkenlerin GERÇEK tipini (kategorik/    │
   │     sayısal) veriden bizzat tespit eder        │
   │  3. Normallik (Shapiro-Wilk) ve varyans        │
   │     homojenliği (Levene) testlerini GERÇEK     │
   │     veri üzerinde çalıştırır                   │
   │  4. AI'nin önerisi varsayımlarla çelişiyorsa    │
   │     testi otomatik değiştirir (örn. t-testi     │
   │     yerine Mann-Whitney U) ve bunu şeffaf       │
   │     şekilde raporlar                            │
   │  5. Tüm p-değerleri, istatistikler, katsayılar  │
   │     kanıtlanmış matematiksel formüllerle        │
   │     (Numerical Recipes, Royston 1995) hesaplanır│
   └──────────────────────┬────────────────────────┘
                          │  { uygulanan_test, sonuc: {...gerçek sayılar...},
                          │    grup_bazli_normallik, override_aciklamasi, ... }
                          ▼
   ┌─────────────────────┐
   │  AI Agent1 (LLM)    │  Kendisine verilen JSON'daki sayıları
   │  (Google Gemini)    │  APA formatında düz yazıya döker.
   └──────────┬───────────┘  Yeni bir sayı ASLA üretmez/uydurmaz.
              ▼
   Kullanıcıya akademik rapor (Hipotezler, Yöntem, Bulgular, Yorum, Sınırlılıklar)
```

**Bu mimarinin en kritik özelliği:** LLM'lerin iki farklı görevi var ve
ikisi de birbirinden bağımsız doğrulanabilir — biri "hangi test kategorisi
uygun", diğeri "bu sayıları düzgün
cümlelere dök" (metin üretimi). İkisi de asla ham bir istatistiksel
hesaplama yapmıyor. Bu repo'daki `corraline.js`, bu iki LLM çağrısı
arasında oturan, tamamen deterministik bir köprü.

## Desteklenen Analizler

| Kategori | Testler |
|---|---|
| Grup Karşılaştırma | Bağımsız örneklem t-testi, Welch t-testi, Mann-Whitney U, Tek Yönlü ANOVA, Welch's ANOVA, Kruskal-Wallis |
| Eşleştirilmiş Ölçüm | Eşleştirilmiş t-testi, Wilcoxon İşaretli Sıra Testi |
| İlişki | Pearson Korelasyonu, Spearman Korelasyonu |
| Kategorik İlişki | Ki-Kare Bağımsızlık Testi |
| Regresyon | Basit Doğrusal Regresyon (VIF, artık normalliği, Durbin-Watson, doğrusallık testi dahil), Çoklu Doğrusal Regresyon, Lojistik Regresyon (Newton-Raphson/IRLS) |
| Ölçek Analizi | Cronbach's Alpha, Likert metin→sayı dönüşümü, ters kodlama, çok maddeli endeks/composite skor oluşturma |
| Varsayım Testleri | **Shapiro-Wilk** (normallik), Levene Testi/Brown-Forsythe (varyans homojenliği) |

Her test seçimi, veri setindeki gerçek değişken tiplerine ve varsayım
testi sonuçlarına göre otomatik olarak yapılır. Kullanıcı ya da AI
Agent'ın "hangi testi kullanmalıyım" diye bilmesi gerekmez.

## Örnek Kullanım

Gerçek bir klinik veri setiyle (`hasta_kayitlari.csv`, 1010 hasta kaydı:
yaş, cinsiyet, bölüm, tanı, yatış günü, BMI, sistolik kan basıncı, sigorta
türü, tedavi maliyeti) sorulan bir soru:

> **Soru:** "Cinsiyete göre tedavi maliyeti farklı mı?"

**Sistemin attığı adımlar:**
1. AI Agent, bunun bir *grup karşılaştırma* sorusu olduğuna, `maliyet_tl`
   (sayısal) ve `cinsiyet` (kategorik) değişkenlerinin ilgili olduğuna karar
   verir; ilk öneri olarak t-testi önerir.
2. `corraline.js`, her iki cinsiyet grubunun maliyet dağılımına
   Shapiro-Wilk testini uygular: **her iki grupta da p < .001** —
   dağılım normal değil (sağlık/fatura verilerinde tipik sağa-çarpıklık).
3. Bu nedenle t-testi yerine otomatik olarak **Mann-Whitney U testine**
   geçilir; bu geçiş `override_aciklamasi` alanında şeffaf şekilde
   belirtilir.
4. AI Agent1, elde edilen gerçek sayıları APA formatında bir rapora döker.

**Gerçek çıktı** (tam rapor için [`docs/ornek-rapor.md`](docs/ornek-rapor.md)):

```
Mann-Whitney U Testi sonuçlarına göre, kadın hastaların tedavi maliyeti
medyanı 7213 TL, erkek hastaların medyanı 7404 TL olarak hesaplanmıştır.
Gruplar arasındaki farkın istatistiksel olarak anlamlı olmadığı
görülmüştür (U = 117299.5, z = -1.013, p = .311).
```

Bu sayılar, [`tests/integration.test.js`](tests/integration.test.js)
içinde otomatik test olarak da doğrulanıyor.

## Geliştirme Süreci ve Karşılaşılan Zorluklar

Bu proje tek seferde "doğru" yazılmadı — gerçek veriyle sürekli test edilip,
bulunan hatalar sistematik olarak düzeltildi. Bu sürecin en önemli
kilometre taşları (tam commit geçmişi için `git log` çalıştırın):

**1. Aralık-etiketli kategorik değişkenlerin sayı sanılması (kritik hata)**
`parseFloat("0-6ay")` JavaScript'te sessizce `0` döndürür — string'in
sadece başındaki rakamı okur, gerisini görmezden gelir. Bu yüzden "0-6 ay",
"18-25 yaş" gibi aralık etiketli kategorik değişkenler yanlışlıkla sayısal
sanılıyor, sistem bunları yanlış test ailesine (korelasyon/regresyon)
yönlendiriyordu. Gerçek bir anket sorusuyla ("36 maddeden bir farkındalık
endeksi oluştur, staj süresine göre bak") bu hata canlı olarak yakalandı;
`toNumber()` fonksiyonu artık bir string'in TAMAMININ geçerli bir sayı
olmasını zorunlu kılıyor.

**2. AI'nin yanlış test önerisinin sorgusuz kabul edilmesi**
Grup karşılaştırma, ki-kare ve eşleştirilmiş test dallarının hepsinde
AI'nin önerisini veriye göre doğrulayan bir tip kontrolü varken,
regresyon dalında bu kontrol unutulmuştu — AI "regresyon" dediği an,
kategorik bir değişken olsa bile kod sorgusuz regresyona giriyordu. Bu,
gerçek bir kullanıcı senaryosunda (ekran görüntüsüyle) yakalandı ve aynı
tip-kontrolü mantığı regresyon dalına da eklendi.

**3. Hata durumlarının tüm sistemi çökertmesi (en kritik bulgu)**
Lojistik regresyon, çoklu regresyon ve ki-kare fonksiyonları, geçersiz
girdi durumunda (`{error: "..."}`) bir hata objesi döndürüyordu — ama
grafik oluşturma kodu bunu hiç kontrol etmeden `result.katsayilar.filter(...)`
gibi çağrılar yapıyor, bu da **tüm n8n workflow'unun çökmesine** yol
açıyordu (kullanıcıya hiçbir anlaşılır hata mesajı gitmeden). Üç noktada
da artık `result.error` kontrolü var.

**4. Jarque-Bera'nın Shapiro-Wilk kadar güçlü olmaması**
Sistem başlangıçta normallik testi için Jarque-Bera kullanıyordu.
Kullanıcının kendi SPSS pratiğinde (Shapiro-Wilk ile) her zaman
"normal değil" bulduğu composite/Likert skorları, bizim sistemde
Jarque-Bera ile bazen "normal" çıkıyordu — istatistiksel olarak bilinen
bir güç farkı (Jarque-Bera, sınırlı/tavan-etkili dağılımlarda Shapiro-Wilk
kadar hassas değildir). "Composite skorları hep nonparametrik say" gibi
kolay bir kısayola gidilmedi (bu, gerçekten normal olan composite'leri
de yanlışlıkla nonparametrik'e iteceği için yeni bir yanlılık
yaratacaktı). Bunun yerine Shapiro-Wilk (Royston 1995, AS R94 algoritması)
sıfırdan implement edildi. İlk deneme hafızadan yapıldığı için scipy'nin
gerçek çıktısıyla uyuşmadı; web'den algoritmanın doğrulanmış bir C++
kaynağı bulunup satır satır JavaScript'e çevrildi ve `scipy.stats.shapiro`
ile 14 farklı senaryoda (n=3'ten n=1000'e, normal/çarpık/tekrarlı
değerli veri) 6 ondalık basamağa kadar birebir eşleştiği doğrulandı.

**5. SPSS ile derinlemesine çapraz doğrulama**
Gerçek bir anket verisiyle (160 katılımcı) yapılan bir Mann-Whitney U
karşılaştırmasında sistem U=419 verirken SPSS U=825 vermişti. Bu
tutarsızlık, adım adım (Frequencies tabloları, Crosstabs, kodlama sırası
testleri) izlenerek iki ayrı kök nedene indirgendi: (a) "Yorumum yok"
yanıtının SPSS'te 0 yerine sistem-eksik değeri olarak kalması, (b) daha
önceki bir kopyala-yapıştır hatasından kalma fazladan bir "hayalet" satır.
Kullanıcı bunları SPSS tarafında düzelttikçe sonuç U=404.5'e (bizim
sistemle aynı sonuca, p>.05) yaklaştı — iki sistemin de doğru
çalıştığını, farkın veri hazırlama adımlarından kaynaklandığını kanıtladı.

## Test Paketi

```bash
npm install
npm test
```

32 otomatik test, dört kategoriye ayrılıyor:

- **`shapiroWilk.test.js`** — Shapiro-Wilk implementasyonunun
  `scipy.stats.shapiro` ile 14 farklı senaryoda (n=3 → n=1000) 6 ondalık
  basamağa kadar birebir eşleştiğini doğrular.
- **`toNumber.test.js`** — Türkçe ondalık virgülünün doğru işlendiğini,
  aralık-etiketli kategorik değerlerin ("0-6ay" gibi) artık sessizce
  sayıya çevrilmediğini, kategori normalizasyonunun (whitespace/tip)
  doğru çalıştığını test eder.
- **`routing.test.js`** — AI'nin yanlış test önerisinin gerçek veri
  tipine göre nasıl geçersiz kılındığını, hata durumlarının artık
  workflow'u çökertmediğini, kategorik değişkenlerin sessizce
  elenmediğini (uyarıyla bildirildiğini) doğrular.
- **`integration.test.js`** — gerçek bir anket (n=160) ve gerçek bir
  klinik veri setiyle (n=1010), SPSS ve scipy'ye karşı doğrulanmış
  senaryoları uçtan uca çalıştırır.

## Kaynaklar

- Gamma/Beta fonksiyonları ve p-değeri hesaplamaları: *Numerical Recipes
  in C* (Press, Teukolsky, Vetterling, Flannery)
- Shapiro-Wilk normallik testi: Royston, P. (1995). *Remark AS R94: A
  remark on Algorithm AS 181: The W test for normality.* Applied
  Statistics, 44(4), 547–551.
- Tüm test istatistikleri ve p-değerleri, IBM SPSS Statistics 27 ve
  Python `scipy.stats` ile karşılaştırmalı olarak doğrulandı.

## Bilinen Sınırlamalar

Bu projeyi geliştirirken karşılaşılan ve bilinçli olarak "çözülmemiş"
bırakılan noktalar:

- **Değişken/sütun adı eşleştirmesi**, AI'nin ürettiği serbest metnin
  veri setindeki gerçek sütun adlarıyla (fuzzy substring match)
  örtüşmesine dayanır. AI bir sütunu tamamen farklı bir kelimeyle
  tarif ederse eşleşme başarısız olabilir — bu durumda sistem anlaşılır
  bir hata döner, yanlış bir sütunla sessizce devam etmez.
- **Ters kodlanan bir ölçeğin teorik min/max aralığı**, sadece
  Likert-sözlüğünden dönüştürülen sütunlar için kesin olarak bilinir;
  zaten sayısal girilmiş ölçekler için (AI `SCALE:min-max` ile
  belirtmediği sürece) gözlemlenen veri aralığına dayanır ve bu durum
  kullanıcıya açıkça uyarı olarak bildirilir.
- **Kategorik/sayısal ayrımı**, bir sütunun ilk 20 dolu satırının
  çoğunluğuna bakarak yapılır — çok küçük örneklemlerde ya da tüm veri
  setinde tutarsız formatlı sütunlarda yanlış sınıflandırma teorik
  olarak mümkündür.
- **Rapor metnini yazan LLM adımı** (AI Agent1), kendisine verilen
  sayıları olduğu gibi aktarmakla sınırlı tutulmaya çalışılsa da, bu
  adımın kendisi hâlâ bir metin üretim modelidir — sayısal hesaplama
  katmanının aksine, üretilen doğal dil metninin birebir doğruluğu
  için matematiksel bir garanti yoktur (bu yüzden proje, üretilen her
  raporun sayılarını orijinal JSON çıktısıyla karşılaştırmayı önerir).
- **Otomatik test paketi bu oturumda eklendi**, ama proje boyunca
  yapılan tüm el ile doğrulamaların (özellikle SPSS karşılaştırmaları)
  kalıcı, tekrar çalıştırılabilir testlere dönüştürülmesi devam eden
  bir süreç.

## n8n Workflow'unu İçe Aktarma

Bu sistemin çalışan tam n8n workflow'u (`docs/n8n-workflow.json`) da bu
repoda mevcut. Kendi n8n hesabınıza şu şekilde import edebilirsiniz:

1. n8n'de **Workflows → Import from File** (veya sağ üstteki ⋯ menüsü)
2. `docs/n8n-workflow.json` dosyasını seçin
3. Google Gemini node'larına kendi API anahtarınızla bir credential bağlayın
   (workflow, güvenlik nedeniyle hiçbir API anahtarı içermez)
   
## Kurulum

Bu, bağımsız bir uygulama değil — bir **n8n Code node** içinde
çalıştırılmak üzere yazılmıştır. `src/corraline.js` dosyasının tamamı,
n8n'deki "Code" node'una olduğu gibi yapıştırılır. Node, şu isimlerle
başka n8n node'larına erişim bekler:

- `$('AI Agent')` — karar veren LLM node'u, `{ output: { onerilen_test,
  bagimli_degisken, gruplayici_degisken, ikinci_degisken,
  bagimsiz_degiskenler, gerekce, endeks_maddeleri, endeks_adi } }`
  şeklinde bir yapı döndürmesi beklenir.
- `$('Extract from File')` veya `$('Extract from File1')` — yüklenen
  CSV/XLSX'in satırlarını sağlayan node.
- `$('When chat message received')` — kullanıcının orijinal sorusunu
  (`chatInput`) sağlayan tetikleyici node.

Kod, bu node'ları test/geliştirme ortamında taklit eden
[`tests/helpers/runPipeline.js`](tests/helpers/runPipeline.js)
aracılığıyla n8n dışında da (örn. otomatik testlerde) çalıştırılabilir.

```bash
git clone <bu-repo>
cd corraline
npm install
npm test
```

---

## Lisans

MIT — bkz. [`LICENSE`](LICENSE)
