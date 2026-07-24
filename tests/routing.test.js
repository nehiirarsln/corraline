const { runPipeline } = require('./helpers/runPipeline');

describe('isRegression tip kontrolu - AI yanlis "regresyon" onerse bile kategorik degiskeni regresyona sokmamali', () => {
  test('araligi-etiketli kategorik degisken + "regresyon" onerisi -> grup karsilastirmaya (ANOVA/Kruskal-Wallis) yonlenmeli, regresyona degil', () => {
    const rows = [
      { puan: '10', sure: '0-6ay' }, { puan: '12', sure: '0-6ay' }, { puan: '11', sure: '0-6ay' },
      { puan: '15', sure: '6-12ay' }, { puan: '16', sure: '6-12ay' }, { puan: '14', sure: '6-12ay' },
      { puan: '20', sure: '12ay ve üzeri' }, { puan: '22', sure: '12ay ve üzeri' }, { puan: '21', sure: '12ay ve üzeri' }
    ];
    const decision = {
      onerilen_test: 'regresyon', gerekce: '',
      bagimli_degisken: 'puan', ikinci_degisken: 'sure', gruplayici_degisken: '',
      bagimsiz_degiskenler: [], endeks_maddeleri: []
    };
    const result = runPipeline({ rows, decision });
    expect(result.analiz_turu).toBe('grup_karsilastirma');
    expect(result.sonuc.error).toBeUndefined();
  });

  test('iki gercekten sayisal degisken + "regresyon" onerisi -> regresyon calismali (bozulma yok)', () => {
    const rows = Array.from({ length: 10 }, (_, i) => ({ x: String(i + 1), y: String(2 * i + 3) }));
    const decision = {
      onerilen_test: 'regresyon', gerekce: '',
      bagimli_degisken: 'y', ikinci_degisken: 'x', gruplayici_degisken: '',
      bagimsiz_degiskenler: [], endeks_maddeleri: []
    };
    const result = runPipeline({ rows, decision });
    expect(result.analiz_turu).toBe('regresyon');
    expect(result.sonuc.error).toBeUndefined();
    expect(result.sonuc.slope).toBeCloseTo(2, 1);
  });
});

describe('Cokme korumasi - hata objesi donen sonuclar grafik olusturmada workflow\'u cokertmemeli', () => {
  test('lojistik regresyon: bagimli degisken 2 kategorili degilse cokme yerine temiz hata donmeli', () => {
    const rows = Array.from({ length: 30 }, (_, i) => ({ yas: String(20 + i), x1: String(i), x2: String(i * 2) }));
    const decision = {
      onerilen_test: 'lojistik-regresyon', gerekce: '',
      bagimli_degisken: 'yas', ikinci_degisken: '', gruplayici_degisken: '',
      bagimsiz_degiskenler: ['x1', 'x2'], endeks_maddeleri: []
    };
    expect(() => {
      const result = runPipeline({ rows, decision });
      expect(result.sonuc.error).toBeDefined();
      expect(result.grafik_url).toBeNull();
    }).not.toThrow();
  });

  test('ki-kare: 2den az kategorili degisken cokme yerine temiz hata donmeli', () => {
    const rows = [
      { a: 'Erkek', b: 'A' }, { a: 'Kadın', b: 'A' }, { a: 'Erkek', b: 'A' }, { a: 'Kadın', b: 'A' }
    ];
    const decision = {
      onerilen_test: 'chi-square', gerekce: '',
      bagimli_degisken: 'a', ikinci_degisken: 'b', gruplayici_degisken: '',
      bagimsiz_degiskenler: [], endeks_maddeleri: []
    };
    expect(() => {
      const result = runPipeline({ rows, decision });
      expect(result.sonuc.error).toBeDefined();
      expect(result.grafik_url).toBeNull();
    }).not.toThrow();
  });
});

describe('Kategorik bagimsiz degisken sessizce elenmemeli, uyari verilmeli', () => {
  test('coklu regresyonda kategorik bir bagimsiz degisken varsa disariya alinip uyari eklenmeli', () => {
    const rows = Array.from({ length: 15 }, (_, i) => ({
      y: String(10 + i), x1: String(i), sure: i % 2 === 0 ? '0-6ay' : '6-12ay'
    }));
    const decision = {
      onerilen_test: 'coklu-regresyon', gerekce: '',
      bagimli_degisken: 'y', ikinci_degisken: '', gruplayici_degisken: '',
      bagimsiz_degiskenler: ['x1', 'sure'], endeks_maddeleri: []
    };
    const result = runPipeline({ rows, decision });
    expect(result.bagimsiz_degiskenler).toEqual(['x1']);
    expect(result.likert_uyarilari).toBeDefined();
    expect(result.likert_uyarilari.length).toBeGreaterThan(0);
  });
});
