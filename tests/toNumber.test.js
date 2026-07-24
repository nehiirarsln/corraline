const { loadCorraline } = require('./helpers/loadCorraline');

describe('toNumber() - Turkce ondalik virgulu ve aralik-etiketli kategorik hatasi duzeltmesi', () => {
  const { toNumber } = loadCorraline();

  test('virgullu ondalik dogru parse edilmeli (5,5 -> 5.5)', () => {
    expect(toNumber('5,5')).toBeCloseTo(5.5);
    expect(toNumber('120,5')).toBeCloseTo(120.5);
  });

  test('nokta binlik + virgul ondalik dogru parse edilmeli (1.250,75 -> 1250.75)', () => {
    expect(toNumber('1.250,75')).toBeCloseTo(1250.75);
  });

  test('zaten dogru formatli sayilar bozulmamali', () => {
    expect(toNumber('5.5')).toBeCloseTo(5.5);
    expect(toNumber(1250)).toBe(1250);
  });

  test('KRITIK: aralik-etiketli kategorik degerler NaN donmeli, sessizce sayiya cevrilmemeli', () => {
    // Bu, parseFloat("0-6ay") === 0 seklindeki gercek prod hatasinin regresyon testi
    expect(toNumber('0-6ay')).toBeNaN();
    expect(toNumber('6-12ay')).toBeNaN();
    expect(toNumber('12ay ve üzeri')).toBeNaN();
    expect(toNumber('18-25 yaş')).toBeNaN();
  });

  test('bos/null/undefined NaN donmeli', () => {
    expect(toNumber('')).toBeNaN();
    expect(toNumber(null)).toBeNaN();
    expect(toNumber(undefined)).toBeNaN();
  });
});

describe('normalizeCategory() - kategori whitespace ve tip tutarsizligi duzeltmesi', () => {
  const { normalizeCategory } = loadCorraline();

  test('bas/son bosluklar temizlenmeli', () => {
    expect(normalizeCategory('Erkek ')).toBe('Erkek');
    expect(normalizeCategory(' Kadın')).toBe('Kadın');
  });

  test('sayi ve string ayni kategoriye normalize olmali', () => {
    expect(normalizeCategory(1)).toBe(normalizeCategory('1'));
  });
});

describe('isColumnMostlyNumeric() - cok-satirli tip cikarimi (tek satir anomalisine dayanikli)', () => {
  const { isColumnMostlyNumeric } = loadCorraline();

  test('ilk satirda anomali olsa bile sutun sayisal tespit edilmeli', () => {
    const rows = [
      { yas: 'Belirtilmedi' },
      { yas: '25' }, { yas: '30' }, { yas: '22' }, { yas: '41' }
    ];
    expect(isColumnMostlyNumeric(rows, 'yas')).toBe(true);
  });

  test('aralik-etiketli kategorik sutun kategorik tespit edilmeli', () => {
    const rows = [
      { sure: '0-6ay' }, { sure: '6-12ay' }, { sure: '12ay ve üzeri' }, { sure: '0-6ay' }
    ];
    expect(isColumnMostlyNumeric(rows, 'sure')).toBe(false);
  });
});
