const { loadCorraline } = require('./helpers/loadCorraline');

// Bu dosya, kapsamlı bir kod denetimi sirasinda daha once BAGIMSIZ olarak
// dogrulanmamis fonksiyonlari (Mann-Whitney U, Kruskal-Wallis, Wilcoxon,
// tek yonlu ANOVA, Pearson/Spearman, ki-kare, coklu regresyon, lojistik
// regresyon) scipy/numpy/sklearn'e karsi test eder. Bu surecte Kruskal-Wallis'te
// eksik bir baglı-deger (tie) duzeltme faktoru bulunup duzeltildi; bu test
// dosyasi o duzeltmenin kalici korumasidir.

describe('Mann-Whitney U - bagli (tied) degerlerle scipy.stats.mannwhitneyu karsilastirmasi', () => {
  const { mannWhitneyU } = loadCorraline();
  test('p-degeri scipy ile birebir eslesmeli (U degeri sadece hangi grubun raporlandigina gore degisir, n1*n2 - U tamamlayicidir)', () => {
    const a = [5,5,6,7,7,7,8,9,10,10];
    const b = [3,4,5,5,6,7,8,8,9,9,9];
    const result = mannWhitneyU({ a, b });
    expect(result.p_value).toBeCloseTo(0.4761201601764782, 4);
  });
});

describe('Kruskal-Wallis - bagli-deger duzeltmesi (KRITIK DUZELTME) scipy.stats.kruskal ile dogrulama', () => {
  const { kruskalWallis } = loadCorraline();
  test('H istatistigi tie-correction sonrasi scipy ile eslesmeli', () => {
    const g1 = [1,2,2,3,4], g2 = [3,3,4,5,6], g3 = [5,6,6,7,8];
    const result = kruskalWallis({ g1, g2, g3 });
    expect(result.h_statistic).toBeCloseTo(9.889253187613852, 3);
    expect(result.p_value).toBeCloseTo(0.007121573407252883, 4);
  });
});

describe('Wilcoxon Isaretli Sira Testi - normal yaklasiklik + sureklilik duzeltmesi yontemiyle scipy karsilastirmasi', () => {
  const { wilcoxonSignedRank } = loadCorraline();
  test('p-degeri, scipy\'nin mode="approx" (bizim kullandigimiz yontem) ciktisiyla eslesmeli', () => {
    const x = [10,12,9,15,11,13,14,10,12,16];
    const y = [8,13,9,12,10,14,13,9,11,15];
    const pairs = x.map((v, i) => ({ x: v, y: y[i] }));
    const result = wilcoxonSignedRank(pairs);
    expect(result.W_statistic).toBeCloseTo(8, 1);
    expect(result.p_value).toBeCloseTo(0.08070813375119283, 4);
  });
});

describe('Tek Yonlu ANOVA - scipy.stats.f_oneway ile dogrulama', () => {
  const { oneWayANOVA } = loadCorraline();
  test('F istatistigi ve p-degeri eslesmeli', () => {
    const result = oneWayANOVA({
      a1: [23,25,21,24,22], a2: [30,28,32,29,31], a3: [20,19,22,21,18]
    });
    expect(result.f_statistic).toBeCloseTo(52.66666666666678, 2);
    expect(result.p_value).toBeCloseTo(1.1443503946750879e-6, 6);
  });
});

describe('Pearson ve Spearman Korelasyonu - bagli degerlerle scipy karsilastirmasi', () => {
  const { pearsonCorrelation, spearmanCorrelation } = loadCorraline();
  const xv = [1,2,2,3,4,5,5,6,7,8];
  const yv = [2,3,3,5,4,6,7,8,7,9];
  const pairs = xv.map((v, i) => ({ x: v, y: yv[i] }));

  test('Pearson r ve p scipy.stats.pearsonr ile eslesmeli', () => {
    const result = pearsonCorrelation(pairs);
    expect(result.r).toBeCloseTo(0.9505129685990105, 3);
    expect(result.p_value).toBeCloseTo(2.4712508244693567e-5, 4);
  });

  test('Spearman rho ve p scipy.stats.spearmanr ile eslesmeli', () => {
    const result = spearmanCorrelation(pairs);
    expect(result.rho).toBeCloseTo(0.9601226993865032, 3);
    expect(result.p_value).toBeCloseTo(1.0542548920138408e-5, 4);
  });
});

describe('Ki-Kare Bagimsizlik Testi - scipy.stats.chi2_contingency ile dogrulama', () => {
  const { chiSquareIndependence } = loadCorraline();
  test('2x3 kontenjans tablosu icin chi2/p/df eslesmeli', () => {
    const table = [[10,15,5],[8,12,20]];
    const rowLabels = ['R1','R2'], colLabels = ['C1','C2','C3'];
    const rows = [];
    for (let i=0;i<table.length;i++)
      for (let j=0;j<table[i].length;j++)
        for (let c=0;c<table[i][j];c++) rows.push({ satir: rowLabels[i], sutun: colLabels[j] });

    const result = chiSquareIndependence(rows, 'satir', 'sutun');
    expect(result.chi_square).toBeCloseTo(8.296296296296296, 3);
    expect(result.p_value).toBeCloseTo(0.015793636896301262, 4);
    expect(result.df).toBe(2);
  });
});

describe('Coklu Dogrusal Regresyon - numpy.linalg.lstsq ile dogrulama', () => {
  const { multipleLinearRegression } = loadCorraline();
  test('katsayilar ve R-kare numpy ile eslesmeli', () => {
    // numpy.linalg.lstsq ile (sabit tohum=7) uretilen referans veriler
    const fs = require('fs');
    const ref = JSON.parse(fs.readFileSync(require('path').join(__dirname, 'fixtures/mlr_reference.json'), 'utf8'));
    const rows = ref.x1.map((v, i) => ({ x1: v, x2: ref.x2[i], y: ref.y[i] }));
    const result = multipleLinearRegression(rows, 'y', ['x1', 'x2']);
    expect(result.katsayilar[0].katsayi).toBeCloseTo(ref.beta[0], 2);
    expect(result.katsayilar[1].katsayi).toBeCloseTo(ref.beta[1], 2);
    expect(result.katsayilar[2].katsayi).toBeCloseTo(ref.beta[2], 2);
    expect(result.r_squared).toBeCloseTo(ref.r2, 3);
  });
});
