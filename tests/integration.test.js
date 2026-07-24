const { runPipeline } = require('./helpers/runPipeline');
const anketRows = require('./fixtures/anket_verisi.json');
const anketMaddeleri = require('./fixtures/anket_maddeleri.json');
const hastaRows = require('./fixtures/hasta_kayitlari.json');

// Bu testler, gercek bir anket (n=160, 36 maddelik farkindalik olcegi) ve gercek bir
// klinik/hasta veri setiyle (n=1010) SPSS ve/veya scipy'ye karsi bizzat dogrulanmis
// senaryolari otomatik hale getirir. Sayilar bu konuya adanan gelistirme sureci
// sirasinda scipy.stats ve SPSS ciktilariyla birebir karsilastirilarak elde edilmistir.

describe('Farkindalik endeksi (36 madde composite) - cinsiyete gore karsilastirma', () => {
  test('Shapiro-Wilk normal buluyor -> Student t-testi, p=.383898 (scipy ile dogrulandi)', () => {
    const decision = {
      onerilen_test: 't-test', gerekce: '',
      bagimli_degisken: 'farkindalik_endeksi', ikinci_degisken: '', gruplayici_degisken: '3.Cinsiyetiniz',
      bagimsiz_degiskenler: [], endeks_maddeleri: anketMaddeleri, endeks_adi: 'farkindalik_endeksi'
    };
    const result = runPipeline({ rows: anketRows, decision });
    expect(result.uygulanan_test).toBe('t-test');
    expect(result.sonuc.p_value).toBeCloseTo(0.383898, 5);
  });
});

describe('Farkindalik endeksi - staj suresine gore karsilastirma (Shapiro-Wilk kritik duzeltmesi)', () => {
  test('"12ay ve üzeri" grubu normal degil -> Kruskal-Wallis, p=.006302', () => {
    const decision = {
      onerilen_test: 'spearman', gerekce: '', // AI yanlis onerse bile deterministik katman duzeltmeli
      bagimli_degisken: 'farkindalik_endeksi', ikinci_degisken: '7.Klinik Staj Deneyimi Süresi', gruplayici_degisken: '',
      bagimsiz_degiskenler: [], endeks_maddeleri: anketMaddeleri, endeks_adi: 'farkindalik_endeksi'
    };
    const result = runPipeline({ rows: anketRows, decision });
    expect(result.uygulanan_test).toBe('kruskal-wallis');
    expect(result.sonuc.p_value).toBeCloseTo(0.006302, 5);
    expect(result.grup_bazli_normallik['12ay ve üzeri'].is_normal).toBe(false);
  });
});

describe('Cinsiyete gore tedavi maliyeti (hasta_kayitlari.csv, n=1010)', () => {
  test('her iki grupta da carpik dagilim -> Mann-Whitney U, p=.311', () => {
    const decision = {
      onerilen_test: 't-test', gerekce: '',
      bagimli_degisken: 'maliyet_tl', ikinci_degisken: '', gruplayici_degisken: 'cinsiyet',
      bagimsiz_degiskenler: [], endeks_maddeleri: []
    };
    const result = runPipeline({ rows: hastaRows, decision });
    expect(result.uygulanan_test).toBe('mann-whitney');
    expect(result.sonuc.p_value).toBeCloseTo(0.311289, 4);
    expect(result.grup_bazli_normallik['Kadın'].is_normal).toBe(false);
    expect(result.grup_bazli_normallik['Erkek'].is_normal).toBe(false);
  });
});
