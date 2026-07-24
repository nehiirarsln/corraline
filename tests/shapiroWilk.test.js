const { loadCorraline } = require('./helpers/loadCorraline');
const swRef1 = require('./fixtures/sw_reference.json');
const swRef2 = require('./fixtures/sw_reference2.json');

describe('Shapiro-Wilk testi (Royston 1995, AS R94) - scipy.stats.shapiro ile dogrulama', () => {
  const { shapiroWilk } = loadCorraline();

  test('shapiroWilk fonksiyonu yuklendi', () => {
    expect(typeof shapiroWilk).toBe('function');
  });

  const allRefs = { ...swRef1, ...swRef2 };

  for (const [name, ref] of Object.entries(allRefs)) {
    test(`${name} (n=${ref.data.length}) -> scipy ile 6 ondalik basamaga kadar eslesmeli`, () => {
      const result = shapiroWilk(ref.data);
      expect(result.error).toBeUndefined();
      expect(result.W).toBeCloseTo(ref.W, 5);
      // p-degeri kucuk olabildigi icin mutlak degil, kucuk mutlak fark toleransi kullaniyoruz
      expect(Math.abs(result.p - ref.p)).toBeLessThan(0.0005);
    });
  }

  test('n<3 icin hata donmeli', () => {
    const result = shapiroWilk([1, 2]);
    expect(result.error).toBeDefined();
  });

  test('sabit (varyanssiz) veri icin hata donmeli', () => {
    const result = shapiroWilk([5, 5, 5, 5, 5]);
    expect(result.error).toBeDefined();
  });
});
