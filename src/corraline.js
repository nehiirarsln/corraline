// ============================================================
// KANITLANMIŞ İSTATİSTİKSEL FONKSİYONLAR
// Kaynak: Numerical Recipes in C (Press, Teukolsky, Vetterling, Flannery)
// Bu algoritmalar scipy, R gibi istatistik kütüphanelerinin de temelini oluşturur
// ============================================================

function logGamma(x) {
  const cof = [
    76.18009172947146, -86.50532032941677, 24.01409824083091,
    -1.231739572450155, 0.1208650973866179e-2, -0.5395239384953e-5
  ];
  let y = x, tmp = x + 5.5;
  tmp -= (x + 0.5) * Math.log(tmp);
  let ser = 1.000000000190015;
  for (let j = 0; j < 6; j++) {
    y += 1;
    ser += cof[j] / y;
  }
  return -tmp + Math.log(2.5066282746310005 * ser / x);
}

function gammaSeries(a, x) {
  const ITMAX = 200, EPS = 3e-9;
  if (x <= 0) return 0;
  let ap = a, sum = 1 / a, del = sum;
  for (let n = 1; n <= ITMAX; n++) {
    ap += 1;
    del *= x / ap;
    sum += del;
    if (Math.abs(del) < Math.abs(sum) * EPS) break;
  }
  return sum * Math.exp(-x + a * Math.log(x) - logGamma(a));
}

function gammaContinuedFraction(a, x) {
  const ITMAX = 200, EPS = 3e-9, FPMIN = 1e-30;
  let b = x + 1 - a, c = 1 / FPMIN, d = 1 / b, h = d;
  for (let i = 1; i <= ITMAX; i++) {
    const an = -i * (i - a);
    b += 2;
    d = an * d + b;
    if (Math.abs(d) < FPMIN) d = FPMIN;
    c = b + an / c;
    if (Math.abs(c) < FPMIN) c = FPMIN;
    d = 1 / d;
    const del = d * c;
    h *= del;
    if (Math.abs(del - 1) < EPS) break;
  }
  return Math.exp(-x + a * Math.log(x) - logGamma(a)) * h;
}

function regularizedLowerGamma(a, x) {
  if (x < 0 || a <= 0) return NaN;
  if (x === 0) return 0;
  if (x < a + 1) {
    return gammaSeries(a, x);
  } else {
    return 1 - gammaContinuedFraction(a, x);
  }
}

function chiSquarePValue(chiSq, df) {
  if (chiSq <= 0) return 1;
  return 1 - regularizedLowerGamma(df / 2, chiSq / 2);
}

function betaContinuedFraction(x, a, b) {
  const ITMAX = 200, EPS = 3e-9, FPMIN = 1e-30;
  const qab = a + b, qap = a + 1, qam = a - 1;
  let c = 1, d = 1 - qab * x / qap;
  if (Math.abs(d) < FPMIN) d = FPMIN;
  d = 1 / d;
  let h = d;

  for (let m = 1; m <= ITMAX; m++) {
    const m2 = 2 * m;
    let aa = m * (b - m) * x / ((qam + m2) * (a + m2));
    d = 1 + aa * d;
    if (Math.abs(d) < FPMIN) d = FPMIN;
    c = 1 + aa / c;
    if (Math.abs(c) < FPMIN) c = FPMIN;
    d = 1 / d;
    h *= d * c;

    aa = -(a + m) * (qab + m) * x / ((a + m2) * (qap + m2));
    d = 1 + aa * d;
    if (Math.abs(d) < FPMIN) d = FPMIN;
    c = 1 + aa / c;
    if (Math.abs(c) < FPMIN) c = FPMIN;
    d = 1 / d;
    const del = d * c;
    h *= del;
    if (Math.abs(del - 1) < EPS) break;
  }
  return h;
}

function regularizedIncompleteBeta(x, a, b) {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  const bt = Math.exp(
    logGamma(a + b) - logGamma(a) - logGamma(b) +
    a * Math.log(x) + b * Math.log(1 - x)
  );
  if (x < (a + 1) / (a + b + 2)) {
    return bt * betaContinuedFraction(x, a, b) / a;
  } else {
    return 1 - bt * betaContinuedFraction(1 - x, b, a) / b;
  }
}

function fDistributionPValue(f, df1, df2) {
  if (f <= 0) return 1;
  const x = df2 / (df2 + df1 * f);
  return regularizedIncompleteBeta(x, df2 / 2, df1 / 2);
}

// ============================================================
// YARDIMCI FONKSİYONLAR
// ============================================================

function groupByVariable(rows, depVar, groupVar) {
  const groups = {};
  for (const row of rows) {
    const groupKey = normalizeCategory(row[groupVar]);
    const value = toNumber(row[depVar]);
    if (groupKey === undefined || groupKey === null || groupKey === '' || isNaN(value)) continue;
    if (!groups[groupKey]) groups[groupKey] = [];
    groups[groupKey].push(value);
  }
  return groups;
}

function mean(arr) {
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function median(arr) {
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}
function toNumber(v) {
  if (v === undefined || v === null || v === '') return NaN;
  if (typeof v === 'number') return v;
  let s = String(v).trim();
  if (s.includes(',') && s.includes('.')) {
    // Hem nokta hem virgül varsa: nokta binlik ayracı, virgül ondalık ayracı (örn. "1.250,75")
    s = s.replace(/\./g, '').replace(',', '.');
  } else if (s.includes(',')) {
    // Sadece virgül varsa: ondalık ayracı (örn. "5,5")
    s = s.replace(',', '.');
  }
  // KRİTİK: parseFloat bir string'in SADECE başındaki rakamları okuyup gerisini
  // sessizce görmezden gelir (örn. parseFloat("0-6ay") === 0). Bu, "0-6 ay",
  // "18-25 yaş" gibi ARALIK ETİKETLİ KATEGORİK değişkenlerin yanlışlıkla sayısal
  // sanılmasına yol açar. Bunu önlemek için string'in TAMAMININ geçerli bir sayı
  // biçiminde olmasını zorunlu kılıyoruz; aksi halde NaN dönüyoruz.
  if (!/^-?\d+(\.\d+)?$/.test(s)) return NaN;
  return parseFloat(s);
}
function normalizeCategory(v) {
  // Kategori değerlerini karşılaştırmadan önce standardize eder:
  // (a) baş/son boşlukları temizler (örn. "Erkek " ile "Erkek" aynı kategori sayılsın),
  // (b) sayı/string tip farkını giderir (örn. XLSX'ten gelen 1 ile CSV'den gelen "1" aynı kategori sayılsın).
  if (v === undefined || v === null || v === '') return v;
  return typeof v === 'string' ? v.trim() : String(v);
}
function isColumnMostlyNumeric(rows, colName, sampleSize = 20) {
  // Bir sütunun kategorik mi sayısal mı olduğuna, sadece ilk dolu satıra değil,
  // birden fazla örneğe (en fazla sampleSize kadar) bakarak karar verir. Tek bir
  // anormal satır (örn. "Bilinmiyor" gibi metinsel bir yer tutucu) yüzünden
  // sayısal bir sütunun tamamen kategorik sanılmasını önler.
  let sampleCount = 0, numericCount = 0;
  for (const row of rows) {
    const v = row[colName];
    if (v === undefined || v === null || v === '') continue;
    sampleCount++;
    if (!isNaN(toNumber(v))) numericCount++;
    if (sampleCount >= sampleSize) break;
  }
  if (sampleCount === 0) return null;
  return (numericCount / sampleCount) >= 0.5;
}
// ============================================================
// TEK YÖNLÜ ANOVA (TAM p-değeri ile)
// ============================================================

function oneWayANOVA(groups) {
  const groupArrays = Object.values(groups);
  if (groupArrays.some(g => g.length < 2)) return { error: "Her grupta en az 2 gözlem olmalı" };
  const allValues = groupArrays.flat();
  const grandMean = mean(allValues);
  const k = groupArrays.length;
  const N = allValues.length;

  let ssBetween = 0, ssWithin = 0;

  for (const g of groupArrays) {
    const groupMean = mean(g);
    ssBetween += g.length * Math.pow(groupMean - grandMean, 2);
    for (const v of g) ssWithin += Math.pow(v - groupMean, 2);
  }

  const dfBetween = k - 1;
  const dfWithin = N - k;
  const msBetween = ssBetween / dfBetween;
  const msWithin = ssWithin / dfWithin;
  const fStatistic = msBetween / msWithin;

  const pValue = fDistributionPValue(fStatistic, dfBetween, dfWithin);

  return {
    test: "Tek Yönlü ANOVA",
    f_statistic: Number(fStatistic.toFixed(4)),
    df_between: dfBetween,
    df_within: dfWithin,
    p_value: Number(pValue.toFixed(6)),
    is_significant: pValue < 0.05,
    group_means: Object.fromEntries(
      Object.entries(groups).map(([k, v]) => [k, Number(mean(v).toFixed(2))])
    )
  };
}

// ============================================================
// KRUSKAL-WALLIS TESTİ (TAM p-değeri ile)
// ============================================================

function kruskalWallis(groups) {
  const groupArrays = Object.entries(groups);
  const allValues = [];
  for (const [key, values] of groupArrays) {
    for (const v of values) allValues.push({ value: v, group: key });
  }

  allValues.sort((a, b) => a.value - b.value);
  let rank = 1;
  const ranks = [];
  let i = 0;
  while (i < allValues.length) {
    let j = i;
    while (j < allValues.length && allValues[j].value === allValues[i].value) j++;
    const avgRank = (rank + (rank + (j - i) - 1)) / 2;
    for (let m = i; m < j; m++) ranks.push({ ...allValues[m], rank: avgRank });
    rank += (j - i);
    i = j;
  }

  const N = ranks.length;
  const k = groupArrays.length;
  let H = 0;

  for (const [key] of groupArrays) {
    const groupRanks = ranks.filter(r => r.group === key).map(r => r.rank);
    const nGroup = groupRanks.length;
    const rankSum = groupRanks.reduce((a, b) => a + b, 0);
    H += Math.pow(rankSum, 2) / nGroup;
  }

  H = (12 / (N * (N + 1))) * H - 3 * (N + 1);
  const df = k - 1;
  const pValue = chiSquarePValue(H, df);

  return {
    test: "Kruskal-Wallis",
    h_statistic: Number(H.toFixed(4)),
    df: df,
    p_value: Number(pValue.toFixed(6)),
    is_significant: pValue < 0.05,
    group_medians: Object.fromEntries(
      Object.entries(groups).map(([k, v]) => [k, Number(median(v).toFixed(2))])
    )
  };
}

// ============================================================
// STANDART NORMAL CDF
// ============================================================

function normalCDF(z) {
  if (z === 0) return 0.5;
  const x = Math.abs(z) / Math.sqrt(2);
  const erf = regularizedLowerGamma(0.5, x * x);
  return z > 0 ? 0.5 * (1 + erf) : 0.5 * (1 - erf);
}

// ============================================================
// BAĞIMSIZ ÖRNEKLEM T-TESTİ
// ============================================================

function studentTTest(groups) {
  const entries = Object.entries(groups);
  if (entries.length !== 2) return { error: "t-testi sadece 2 grup için geçerlidir" };
  const [[chk1, chkv1], [chk2, chkv2]] = entries;
  if (chkv1.length < 2 || chkv2.length < 2) return { error: "Her grupta en az 2 gözlem olmalı" };
  const [[key1, v1], [key2, v2]] = entries;
  const n1 = v1.length, n2 = v2.length;
  const m1 = mean(v1), m2 = mean(v2);
  const var1 = v1.reduce((s, v) => s + Math.pow(v - m1, 2), 0) / (n1 - 1);
  const var2 = v2.reduce((s, v) => s + Math.pow(v - m2, 2), 0) / (n2 - 1);
  const pooledVar = ((n1 - 1) * var1 + (n2 - 1) * var2) / (n1 + n2 - 2);
  const se = Math.sqrt(pooledVar * (1 / n1 + 1 / n2));
  const t = (m1 - m2) / se;
  const df = n1 + n2 - 2;
  const pValue = fDistributionPValue(t * t, 1, df);

  return {
    test: "Bağımsız Örneklem T-Testi (Student's t-test)",
    t_statistic: Number(t.toFixed(4)),
    df: df,
    p_value: Number(pValue.toFixed(6)),
    is_significant: pValue < 0.05,
    group_means: { [key1]: Number(m1.toFixed(2)), [key2]: Number(m2.toFixed(2)) }
  };
}

// ============================================================
// WELCH T-TESTİ
// ============================================================

function welchTTest(groups) {
  const entries = Object.entries(groups);
  if (entries.length !== 2) return { error: "Welch t-testi sadece 2 grup için geçerlidir" };
  const [[chk1, chkv1], [chk2, chkv2]] = entries;
  if (chkv1.length < 2 || chkv2.length < 2) return { error: "Her grupta en az 2 gözlem olmalı" };
  const [[key1, v1], [key2, v2]] = entries;
  const n1 = v1.length, n2 = v2.length;
  const m1 = mean(v1), m2 = mean(v2);
  const var1 = v1.reduce((s, v) => s + Math.pow(v - m1, 2), 0) / (n1 - 1);
  const var2 = v2.reduce((s, v) => s + Math.pow(v - m2, 2), 0) / (n2 - 1);
  const se = Math.sqrt(var1 / n1 + var2 / n2);
  const t = (m1 - m2) / se;
  const df = Math.pow(var1 / n1 + var2 / n2, 2) /
    (Math.pow(var1 / n1, 2) / (n1 - 1) + Math.pow(var2 / n2, 2) / (n2 - 1));
  const pValue = fDistributionPValue(t * t, 1, df);

  return {
    test: "Welch T-Testi",
    t_statistic: Number(t.toFixed(4)),
    df: Number(df.toFixed(4)),
    p_value: Number(pValue.toFixed(6)),
    is_significant: pValue < 0.05,
    group_means: { [key1]: Number(m1.toFixed(2)), [key2]: Number(m2.toFixed(2)) }
  };
}

// ============================================================
// MANN-WHITNEY U TESTİ
// ============================================================

function mannWhitneyU(groups) {
  const entries = Object.entries(groups);
  if (entries.length !== 2) return { error: "Mann-Whitney U testi sadece 2 grup için geçerlidir" };
  const [[key1, v1], [key2, v2]] = entries;
  const n1 = v1.length, n2 = v2.length;

  const combined = [
    ...v1.map(v => ({ value: v, group: 1 })),
    ...v2.map(v => ({ value: v, group: 2 }))
  ];
  combined.sort((a, b) => a.value - b.value);

  let rank = 1;
  const ranks = [];
  let i = 0;
  while (i < combined.length) {
    let j = i;
    while (j < combined.length && combined[j].value === combined[i].value) j++;
    const avgRank = (rank + (rank + (j - i) - 1)) / 2;
    for (let m = i; m < j; m++) ranks.push({ ...combined[m], rank: avgRank });
    rank += (j - i);
    i = j;
  }

  const R1 = ranks.filter(r => r.group === 1).reduce((s, r) => s + r.rank, 0);
  const U1 = R1 - (n1 * (n1 + 1)) / 2;
  const U2 = n1 * n2 - U1;
  const U = Math.min(U1, U2);

  const tieGroups = {};
  for (const r of ranks) tieGroups[r.value] = (tieGroups[r.value] || 0) + 1;
  const N = n1 + n2;
  let tieSum = 0;
  for (const t of Object.values(tieGroups)) tieSum += (Math.pow(t, 3) - t);

  const meanU = (n1 * n2) / 2;
  const varU = (n1 * n2 / 12) * ((N + 1) - tieSum / (N * (N - 1)));
  const stdU = Math.sqrt(varU);

  const zCorrected = stdU === 0 ? 0 : (U < meanU ? (U - meanU + 0.5) / stdU : (U - meanU - 0.5) / stdU);
  const pValue = Math.min(2 * (1 - normalCDF(Math.abs(zCorrected))), 1);

  return {
    test: "Mann-Whitney U Testi",
    U_statistic: Number(U.toFixed(4)),
    z: Number(zCorrected.toFixed(4)),
    p_value: Number(pValue.toFixed(6)),
    is_significant: pValue < 0.05,
    group_medians: {
      [key1]: Number(median(v1).toFixed(2)),
      [key2]: Number(median(v2).toFixed(2))
    }
  };
}

// ============================================================
// PEARSON KORELASYONU
// ============================================================

function pearsonCorrelation(pairs) {
  const n = pairs.length;
  if (n < 3) return { error: "Korelasyon için en az 3 gözlem gerekli" };
  const xValsCheck = pairs.map(p => p.x);
  const yValsCheck = pairs.map(p => p.y);
  if (new Set(xValsCheck).size === 1 || new Set(yValsCheck).size === 1) {
    return { error: "Değişkenlerden biri sabit (hiç değişkenlik göstermiyor), korelasyon hesaplanamaz" };
  }

  const xVals = pairs.map(p => p.x);
  const yVals = pairs.map(p => p.y);
  const xMean = mean(xVals);
  const yMean = mean(yVals);

  let numerator = 0, sumX2 = 0, sumY2 = 0;
  for (let i = 0; i < n; i++) {
    const dx = xVals[i] - xMean;
    const dy = yVals[i] - yMean;
    numerator += dx * dy;
    sumX2 += dx * dx;
    sumY2 += dy * dy;
  }

  const r = numerator / Math.sqrt(sumX2 * sumY2);
  const df = n - 2;
  const t = r * Math.sqrt(df / (1 - r * r));
  const pValue = fDistributionPValue(t * t, 1, df);

  return {
    test: "Pearson Korelasyonu",
    r: Number(r.toFixed(4)),
    t_statistic: Number(t.toFixed(4)),
    df: df,
    p_value: Number(pValue.toFixed(6)),
    is_significant: pValue < 0.05,
    n: n
  };
}

// ============================================================
// SPEARMAN KORELASYONU
// ============================================================

function rankArray(values) {
  const indexed = values.map((v, i) => ({ value: v, index: i }));
  indexed.sort((a, b) => a.value - b.value);

  const ranks = new Array(values.length);
  let i = 0;
  let rank = 1;
  while (i < indexed.length) {
    let j = i;
    while (j < indexed.length && indexed[j].value === indexed[i].value) j++;
    const avgRank = (rank + (rank + (j - i) - 1)) / 2;
    for (let m = i; m < j; m++) ranks[indexed[m].index] = avgRank;
    rank += (j - i);
    i = j;
  }
  return ranks;
}

function spearmanCorrelation(pairs) {
  const n = pairs.length;
  if (n < 3) return { error: "Korelasyon için en az 3 gözlem gerekli" };

  const xRanks = rankArray(pairs.map(p => p.x));
  const yRanks = rankArray(pairs.map(p => p.y));

  const rankedPairs = xRanks.map((x, i) => ({ x, y: yRanks[i] }));
  const pearsonOnRanks = pearsonCorrelation(rankedPairs);

  return {
    test: "Spearman Korelasyonu",
    rho: pearsonOnRanks.r,
    t_statistic: pearsonOnRanks.t_statistic,
    df: pearsonOnRanks.df,
    p_value: pearsonOnRanks.p_value,
    is_significant: pearsonOnRanks.is_significant,
    n: n
  };
}

// ============================================================
// Kİ-KARE BAĞIMSIZLIK TESTİ
// ============================================================

function chiSquareIndependence(rawRows, col1, col2) {
  const table = {};
  const rowCategories = new Set();
  const colCategories = new Set();

  for (const row of rawRows) {
    const r = normalizeCategory(row[col1]);
    const c = normalizeCategory(row[col2]);
    if (r === undefined || r === null || r === '' || c === undefined || c === null || c === '') continue;
    rowCategories.add(r);
    colCategories.add(c);
    const key = `${r}|||${c}`;
    table[key] = (table[key] || 0) + 1;
  }

  const rows = [...rowCategories];
  const cols = [...colCategories];
  if (rows.length < 2 || cols.length < 2) {
  return { error: `"${col1}" veya "${col2}" değişkeninde en az 2 farklı kategori olması gerekiyor (bulunan: ${rows.length} ve ${cols.length} kategori).` };
}

  const observed = rows.map(r => cols.map(c => table[`${r}|||${c}`] || 0));

  const rowTotals = observed.map(row => row.reduce((a, b) => a + b, 0));
  const colTotals = cols.map((_, j) => observed.reduce((s, row) => s + row[j], 0));
  const grandTotal = rowTotals.reduce((a, b) => a + b, 0);

  let chiSquare = 0;
  const expected = [];
  for (let i = 0; i < rows.length; i++) {
    const expRow = [];
    for (let j = 0; j < cols.length; j++) {
      const exp = (rowTotals[i] * colTotals[j]) / grandTotal;
      expRow.push(Number(exp.toFixed(3)));
      if (exp > 0) {
        chiSquare += Math.pow(observed[i][j] - exp, 2) / exp;
      }
    }
    expected.push(expRow);
  }

  const df = (rows.length - 1) * (cols.length - 1);
  const pValue = chiSquarePValue(chiSquare, df);

  const lowExpectedCount = expected.flat().filter(v => v < 5).length;
  const totalCells = expected.flat().length;
  const lowExpectedWarning = (lowExpectedCount / totalCells) > 0.20;

  return {
    test: "Ki-Kare Bağımsızlık Testi",
    chi_square: Number(chiSquare.toFixed(4)),
    df: df,
    p_value: Number(pValue.toFixed(6)),
    is_significant: pValue < 0.05,
    n: grandTotal,
    row_categories: rows,
    col_categories: cols,
    observed_frequencies: observed,
    expected_frequencies: expected,
    low_expected_count_warning: lowExpectedWarning
      ? `Hücrelerin %${((lowExpectedCount/totalCells)*100).toFixed(0)}'i beklenen frekansı 5'in altında - sonuç ihtiyatlı yorumlanmalı (Cochran kuralı)`
      : null
  };
}

// ============================================================
// BASİT DOĞRUSAL REGRESYON
// ============================================================

function simpleLinearRegression(pairs) {
  const n = pairs.length;
  if (n < 3) return { error: "Regresyon için en az 3 gözlem gerekli" };
  const xValsCheck = pairs.map(p => p.x);
  if (new Set(xValsCheck).size === 1) {
    return { error: "Bağımsız değişken sabit (hiç değişkenlik göstermiyor), regresyon hesaplanamaz" };
  }

  const xVals = pairs.map(p => p.x);
  const yVals = pairs.map(p => p.y);
  const xMean = mean(xVals);
  const yMean = mean(yVals);

  let sXY = 0, sXX = 0, sYY = 0;
  for (let i = 0; i < n; i++) {
    const dx = xVals[i] - xMean;
    const dy = yVals[i] - yMean;
    sXY += dx * dy;
    sXX += dx * dx;
    sYY += dy * dy;
  }

  const slope = sXY / sXX;
  const intercept = yMean - slope * xMean;

  let ssRes = 0;
  for (let i = 0; i < n; i++) {
    const predicted = intercept + slope * xVals[i];
    ssRes += Math.pow(yVals[i] - predicted, 2);
  }
  const ssTot = sYY;
  const rSquared = 1 - (ssRes / ssTot);

  const df = n - 2;
  const mse = ssRes / df;
  const seSlope = Math.sqrt(mse / sXX);
  const tStatistic = slope / seSlope;
  const pValue = fDistributionPValue(tStatistic * tStatistic, 1, df);

  const seIntercept = Math.sqrt(mse * (1 / n + Math.pow(xMean, 2) / sXX));
  const tIntercept = intercept / seIntercept;
  const pIntercept = fDistributionPValue(tIntercept * tIntercept, 1, df);

  const residuals = xVals.map((x, i) => yVals[i] - (intercept + slope * x));
  const residualNormality = groupNormality(residuals);

  const xMedian = median(xVals);
  const lowGroup = [];
  const highGroup = [];
  for (let i = 0; i < n; i++) {
    if (xVals[i] <= xMedian) lowGroup.push(residuals[i]);
    else highGroup.push(residuals[i]);
  }
  const homoscedasticityTest = (lowGroup.length >= 2 && highGroup.length >= 2)
    ? leveneTest({ dusuk_X: lowGroup, yuksek_X: highGroup })
    : { note: "Gruplardan biri çok küçük, varyans homojenliği test edilemedi" };
  const linearity = linearityTest(pairs);
  const durbinWatson = durbinWatsonTest(residuals);

  return {
    test: "Basit Doğrusal Regresyon (OLS)",
    equation: `y = ${intercept.toFixed(4)} + ${slope.toFixed(4)} * x`,
    intercept: Number(intercept.toFixed(4)),
    slope: Number(slope.toFixed(4)),
    r_squared: Number(rSquared.toFixed(4)),
    slope_t_statistic: Number(tStatistic.toFixed(4)),
    slope_p_value: Number(pValue.toFixed(6)),
    slope_is_significant: pValue < 0.05,
    intercept_t_statistic: Number(tIntercept.toFixed(4)),
    intercept_p_value: Number(pIntercept.toFixed(6)),
    df: df,
    n: n,
    varsayim_kontrolleri: {
      artik_normalligi: residualNormality,
      varyans_homojenligi: homoscedasticityTest,
      dogrusallik: linearity,
      bagimsizlik: durbinWatson
    }
  };
}

// ============================================================
// İKİ SÜTUNU EŞLEŞTİRME
// ============================================================

function pairColumns(rawRows, col1, col2) {
  const pairs = [];
  for (const row of rawRows) {
    const x = toNumber(row[col1]);
    const y = toNumber(row[col2]);
    if (!isNaN(x) && !isNaN(y)) {
      pairs.push({ x, y });
    }
  }
  return pairs;
}

// ============================================================
// 3x3 MATRİS TERS ALMA
// ============================================================

function determinant3x3(m) {
  return (
    m[0][0] * (m[1][1] * m[2][2] - m[1][2] * m[2][1]) -
    m[0][1] * (m[1][0] * m[2][2] - m[1][2] * m[2][0]) +
    m[0][2] * (m[1][0] * m[2][1] - m[1][1] * m[2][0])
  );
}

function invert3x3(m) {
  const det = determinant3x3(m);
  if (Math.abs(det) < 1e-12) return null;

  const cof = [
    [
      (m[1][1] * m[2][2] - m[1][2] * m[2][1]),
      -(m[1][0] * m[2][2] - m[1][2] * m[2][0]),
      (m[1][0] * m[2][1] - m[1][1] * m[2][0])
    ],
    [
      -(m[0][1] * m[2][2] - m[0][2] * m[2][1]),
      (m[0][0] * m[2][2] - m[0][2] * m[2][0]),
      -(m[0][0] * m[2][1] - m[0][1] * m[2][0])
    ],
    [
      (m[0][1] * m[1][2] - m[0][2] * m[1][1]),
      -(m[0][0] * m[1][2] - m[0][2] * m[1][0]),
      (m[0][0] * m[1][1] - m[0][1] * m[1][0])
    ]
  ];

  const inv = [[0,0,0],[0,0,0],[0,0,0]];
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      inv[i][j] = cof[j][i] / det;
    }
  }
  return inv;
}

function multiplyMatVec3(m, v) {
  return [
    m[0][0]*v[0] + m[0][1]*v[1] + m[0][2]*v[2],
    m[1][0]*v[0] + m[1][1]*v[1] + m[1][2]*v[2],
    m[2][0]*v[0] + m[2][1]*v[1] + m[2][2]*v[2]
  ];
}

// ============================================================
// GENEL N×N MATRİS TERS ALMA
// ============================================================

function invertMatrix(matrix) {
  const n = matrix.length;
  const augmented = matrix.map((row, i) => {
    const identityRow = new Array(n).fill(0);
    identityRow[i] = 1;
    return [...row, ...identityRow];
  });

  for (let col = 0; col < n; col++) {
    let pivotRow = col;
    let maxVal = Math.abs(augmented[col][col]);
    for (let r = col + 1; r < n; r++) {
      if (Math.abs(augmented[r][col]) > maxVal) {
        maxVal = Math.abs(augmented[r][col]);
        pivotRow = r;
      }
    }
    if (maxVal < 1e-12) return null;

    [augmented[col], augmented[pivotRow]] = [augmented[pivotRow], augmented[col]];

    const pivotVal = augmented[col][col];
    for (let j = 0; j < 2 * n; j++) augmented[col][j] /= pivotVal;

    for (let r = 0; r < n; r++) {
      if (r === col) continue;
      const factor = augmented[r][col];
      for (let j = 0; j < 2 * n; j++) {
        augmented[r][j] -= factor * augmented[col][j];
      }
    }
  }

  return augmented.map(row => row.slice(n));
}

function multiplyMatVec(m, v) {
  return m.map(row => row.reduce((s, val, i) => s + val * v[i], 0));
}

function transpose(m) {
  return m[0].map((_, colIdx) => m.map(row => row[colIdx]));
}

function multiplyMat(a, b) {
  const result = [];
  for (let i = 0; i < a.length; i++) {
    result.push([]);
    for (let j = 0; j < b[0].length; j++) {
      let sum = 0;
      for (let k = 0; k < b.length; k++) sum += a[i][k] * b[k][j];
      result[i].push(sum);
    }
  }
  return result;
}

// ============================================================
// ÇOKLU DOĞRUSAL REGRESYON
// ============================================================

function multipleLinearRegression(rawRows, depVar, indepVars) {
  const rows = [];
  for (const row of rawRows) {
    const y = toNumber(row[depVar]);
    const xs = indepVars.map(v => toNumber(row[v]));
    if (!isNaN(y) && xs.every(x => !isNaN(x))) {
      rows.push({ y, xs });
    }
  }

  const n = rows.length;
  const k = indepVars.length;
  if (n < k + 2) return { error: `Yetersiz gözlem (n=${n}), en az ${k + 2} gözlem gerekli` };

  const X = rows.map(r => [1, ...r.xs]);
  const Y = rows.map(r => r.y);

  const Xt = transpose(X);
  const XtX = multiplyMat(Xt, X);
  const XtXinv = invertMatrix(XtX);
  if (!XtXinv) return { error: "Matris tekil (bağımsız değişkenler arasında tam çoklu doğrusallık var) - regresyon hesaplanamadı" };

  const XtY = X[0].map((_, j) => Xt[j].reduce((s, val, i) => s + val * Y[i], 0));
  const beta = multiplyMatVec(XtXinv, XtY);

  const predicted = X.map(row => row.reduce((s, v, i) => s + v * beta[i], 0));
  const residuals = Y.map((y, i) => y - predicted[i]);

  const yMean = mean(Y);
  const ssTot = Y.reduce((s, y) => s + Math.pow(y - yMean, 2), 0);
  const ssRes = residuals.reduce((s, r) => s + r * r, 0);
  const rSquared = 1 - ssRes / ssTot;
  const adjRSquared = 1 - (1 - rSquared) * (n - 1) / (n - k - 1);

  const df = n - k - 1;
  const mse = ssRes / df;

  const coefficients = beta.map((b, i) => {
    const se = Math.sqrt(mse * XtXinv[i][i]);
    const t = b / se;
    const p = fDistributionPValue(t * t, 1, df);
    return {
      degisken: i === 0 ? "(Sabit)" : indepVars[i - 1],
      katsayi: Number(b.toFixed(4)),
      standart_hata: Number(se.toFixed(4)),
      t_statistic: Number(t.toFixed(4)),
      p_value: Number(p.toFixed(6)),
      is_significant: p < 0.05
    };
  });

  const msReg = (ssTot - ssRes) / k;
  const fStatistic = msReg / mse;
  const fPValue = fDistributionPValue(fStatistic, k, df);

  const vifResults = {};
  for (let i = 0; i < k; i++) {
    if (k === 1) {
      vifResults[indepVars[i]] = { vif: 1, note: "Tek bağımsız değişken, VIF hesaplanmaz" };
      continue;
    }
    const otherVars = indepVars.filter((_, idx) => idx !== i);
    const subPairsX = rows.map(r => [1, ...otherVars.map(v => r.xs[indepVars.indexOf(v)])]);
    const subY = rows.map(r => r.xs[i]);
    const subXt = transpose(subPairsX);
    const subXtX = multiplyMat(subXt, subPairsX);
    const subXtXinv = invertMatrix(subXtX);
    if (!subXtXinv) {
      vifResults[indepVars[i]] = { vif: null, note: "Hesaplanamadı (tekil matris)" };
      continue;
    }
    const subXtY = subPairsX[0].map((_, j) => subXt[j].reduce((s, val, idx) => s + val * subY[idx], 0));
    const subBeta = multiplyMatVec(subXtXinv, subXtY);
    const subPredicted = subPairsX.map(row => row.reduce((s, v, idx) => s + v * subBeta[idx], 0));
    const subYMean = mean(subY);
    const subSsTot = subY.reduce((s, y) => s + Math.pow(y - subYMean, 2), 0);
    const subSsRes = subY.reduce((s, y, idx) => s + Math.pow(y - subPredicted[idx], 2), 0);
    const subRSquared = 1 - subSsRes / subSsTot;
    const vif = 1 / (1 - subRSquared);
    vifResults[indepVars[i]] = {
      vif: Number(vif.toFixed(3)),
      note: vif > 10 ? "YÜKSEK - ciddi çoklu doğrusallık riski" : vif > 5 ? "ORTA - dikkat edilmeli" : "Düşük - sorun yok"
    };
  }

  const residualNormality = groupNormality(residuals);

  const predMedian = median(predicted);
  const lowGroup = [], highGroup = [];
  for (let i = 0; i < n; i++) {
    (predicted[i] <= predMedian ? lowGroup : highGroup).push(residuals[i]);
  }
  const homoscedasticityTest = (lowGroup.length >= 2 && highGroup.length >= 2)
    ? leveneTest({ dusuk_tahmin: lowGroup, yuksek_tahmin: highGroup })
    : { note: "Gruplardan biri çok küçük" };

  const durbinWatson = durbinWatsonTest(residuals);

  return {
    test: "Çoklu Doğrusal Regresyon (OLS)",
    r_squared: Number(rSquared.toFixed(4)),
    adjusted_r_squared: Number(adjRSquared.toFixed(4)),
    model_f_statistic: Number(fStatistic.toFixed(4)),
    model_df1: k,
    model_df2: df,
    model_p_value: Number(fPValue.toFixed(6)),
    model_is_significant: fPValue < 0.05,
    katsayilar: coefficients,
    n: n,
    varsayim_kontrolleri: {
      cok_boyutlu_dogrusallik_VIF: vifResults,
      artik_normalligi: residualNormality,
      varyans_homojenligi: homoscedasticityTest,
      bagimsizlik: durbinWatson
    }
  };
}

// ============================================================
// EŞLEŞTİRİLMİŞ T-TESTİ
// ============================================================

function pairedTTest(pairs) {
  const n = pairs.length;
  if (n < 2) return { error: "Eşleştirilmiş t-testi için en az 2 gözlem gerekli" };

  const diffs = pairs.map(p => p.x - p.y);
  const dMean = mean(diffs);
  const variance = diffs.reduce((s, d) => s + Math.pow(d - dMean, 2), 0) / (n - 1);
  if (variance === 0) return { error: "Tüm katılımcıların farkı birebir aynı (varyans sıfır), t-testi hesaplanamaz" };
  const sd = Math.sqrt(variance);
  const se = sd / Math.sqrt(n);
  const t = dMean / se;
  const df = n - 1;
  const pValue = fDistributionPValue(t * t, 1, df);

  return {
    test: "Eşleştirilmiş Örneklem T-Testi (Paired t-test)",
    mean_difference: Number(dMean.toFixed(4)),
    t_statistic: Number(t.toFixed(4)),
    df: df,
    p_value: Number(pValue.toFixed(6)),
    is_significant: pValue < 0.05,
    n: n
  };
}

// ============================================================
// WILCOXON İŞARETLİ SIRA TESTİ
// ============================================================

function wilcoxonSignedRank(pairs) {
  const rawDiffs = pairs.map(p => p.x - p.y);
  const diffs = rawDiffs.filter(d => d !== 0);
  const n = diffs.length;
  if (n < 1) return { error: "Tüm farklar sıfır, Wilcoxon testi hesaplanamadı" };

  const absDiffs = diffs.map(d => Math.abs(d));
  const indexed = absDiffs.map((v, i) => ({ value: v, index: i }));
  indexed.sort((a, b) => a.value - b.value);

  const ranks = new Array(n);
  let i = 0, rank = 1;
  while (i < indexed.length) {
    let j = i;
    while (j < indexed.length && indexed[j].value === indexed[i].value) j++;
    const avgRank = (rank + (rank + (j - i) - 1)) / 2;
    for (let m = i; m < j; m++) ranks[indexed[m].index] = avgRank;
    rank += (j - i);
    i = j;
  }

  let wPlus = 0, wMinus = 0;
  for (let k = 0; k < n; k++) {
    if (diffs[k] > 0) wPlus += ranks[k];
    else wMinus += ranks[k];
  }
  const W = Math.min(wPlus, wMinus);
  const meanW = n * (n + 1) / 4;

  const tieGroups = {};
  for (const v of absDiffs) tieGroups[v] = (tieGroups[v] || 0) + 1;
  let tieSum = 0;
  for (const t of Object.values(tieGroups)) tieSum += (Math.pow(t, 3) - t);

  const varW = (n * (n + 1) * (2 * n + 1)) / 24 - tieSum / 48;
  const stdW = Math.sqrt(varW);
  const zCorrected = stdW === 0 ? 0 : (W < meanW ? (W - meanW + 0.5) / stdW : (W - meanW - 0.5) / stdW);
  const pValue = Math.min(2 * (1 - normalCDF(Math.abs(zCorrected))), 1);

  return {
    test: "Wilcoxon İşaretli Sıra Testi",
    W_statistic: Number(W.toFixed(4)),
    z: Number(zCorrected.toFixed(4)),
    p_value: Number(pValue.toFixed(6)),
    is_significant: pValue < 0.05,
    n: n,
    excluded_zero_diffs: rawDiffs.length - n
  };
}

// ============================================================
// LOJİSTİK REGRESYON
// ============================================================

function sigmoid(z) {
  if (z > 100) return 1;
  if (z < -100) return 0;
  return 1 / (1 + Math.exp(-z));
}

function logisticRegression(rawRows, depVar, indepVars) {
  const rawCategories = [];
  for (const row of rawRows) {
    const v = row[depVar];
    if (v !== undefined && v !== null && v !== '' && !rawCategories.includes(v)) {
      rawCategories.push(v);
    }
  }
  if (rawCategories.length !== 2) {
    return { error: `Bağımlı değişken (${depVar}) 2 kategorili olmalı, ${rawCategories.length} kategori bulundu: ${rawCategories.join(', ')}` };
  }
  const [cat0, cat1] = rawCategories;

  const rows = [];
  for (const row of rawRows) {
    const yRaw = row[depVar];
    if (yRaw !== cat0 && yRaw !== cat1) continue;
    const xs = indepVars.map(v => toNumber(row[v]));
    if (xs.every(x => !isNaN(x))) {
      rows.push({ y: yRaw === cat1 ? 1 : 0, xs });
    }
  }

  const n = rows.length;
  const k = indepVars.length;
  const p = k + 1;
  if (n < p + 10) return { error: `Yetersiz gözlem (n=${n})` };

  const X = rows.map(r => [1, ...r.xs]);
  const Y = rows.map(r => r.y);

  let beta = new Array(p).fill(0);
  const maxIter = 50;
  const tol = 1e-8;
  let converged = false;

  for (let iter = 0; iter < maxIter; iter++) {
    const eta = X.map(row => row.reduce((s, v, j) => s + v * beta[j], 0));
    const mu = eta.map(sigmoid);
    const w = mu.map(m => Math.max(m * (1 - m), 1e-10));

    const gradient = new Array(p).fill(0);
    for (let j = 0; j < p; j++) {
      for (let i = 0; i < n; i++) {
        gradient[j] += X[i][j] * (Y[i] - mu[i]);
      }
    }

    const XtWX = [];
    for (let j1 = 0; j1 < p; j1++) {
      XtWX.push(new Array(p).fill(0));
      for (let j2 = 0; j2 < p; j2++) {
        for (let i = 0; i < n; i++) {
          XtWX[j1][j2] += X[i][j1] * w[i] * X[i][j2];
        }
      }
    }

    const XtWXinv = invertMatrix(XtWX);
    if (!XtWXinv) return { error: "Hessian matrisi tekil - model yakınsamadı (değişkenler arasında mükemmel ayrışma/çoklu doğrusallık olabilir)" };

    const delta = multiplyMatVec(XtWXinv, gradient);
    const newBeta = beta.map((b, j) => b + delta[j]);

    const maxChange = Math.max(...newBeta.map((b, j) => Math.abs(b - beta[j])));
    beta = newBeta;

    if (maxChange < tol) {
      converged = true;
      break;
    }
  }

  if (!converged) return { error: "Model belirlenen iterasyon sayısında yakınsamadı" };

  const finalEta = X.map(row => row.reduce((s, v, j) => s + v * beta[j], 0));
  const finalMu = finalEta.map(sigmoid);
  const finalW = finalMu.map(m => Math.max(m * (1 - m), 1e-10));

  const finalXtWX = [];
  for (let j1 = 0; j1 < p; j1++) {
    finalXtWX.push(new Array(p).fill(0));
    for (let j2 = 0; j2 < p; j2++) {
      for (let i = 0; i < n; i++) {
        finalXtWX[j1][j2] += X[i][j1] * finalW[i] * X[i][j2];
      }
    }
  }
  const covMatrix = invertMatrix(finalXtWX);
  if (!covMatrix) return { error: "Standart hatalar hesaplanamadı" };

  const coefficients = beta.map((b, j) => {
    const se = Math.sqrt(covMatrix[j][j]);
    const z = b / se;
    const pValue = 2 * (1 - normalCDF(Math.abs(z)));
    return {
      degisken: j === 0 ? "(Sabit)" : indepVars[j - 1],
      katsayi: Number(b.toFixed(4)),
      standart_hata: Number(se.toFixed(4)),
      z_statistic: Number(z.toFixed(4)),
      p_value: Number(pValue.toFixed(6)),
      odds_ratio: Number(Math.exp(b).toFixed(4)),
      is_significant: pValue < 0.05
    };
  });

  let logLikFull = 0;
  for (let i = 0; i < n; i++) {
    const m = Math.min(Math.max(finalMu[i], 1e-10), 1 - 1e-10);
    logLikFull += Y[i] * Math.log(m) + (1 - Y[i]) * Math.log(1 - m);
  }

  const p1 = mean(Y);
  let logLikNull = 0;
  for (let i = 0; i < n; i++) {
    logLikNull += Y[i] * Math.log(p1) + (1 - Y[i]) * Math.log(1 - p1);
  }

  const lrStatistic = -2 * (logLikNull - logLikFull);
  const lrDf = k;
  const lrPValue = chiSquarePValue(lrStatistic, lrDf);

  const mcFaddenR2 = 1 - (logLikFull / logLikNull);

  let correct = 0;
  for (let i = 0; i < n; i++) {
    const predicted = finalMu[i] >= 0.5 ? 1 : 0;
    if (predicted === Y[i]) correct++;
  }
  const accuracy = correct / n;

  return {
    test: "Lojistik Regresyon (Maksimum Olabilirlik Tahmini)",
    bagimli_degisken_kategoriler: { referans_0: cat0, hedef_1: cat1 },
    katsayilar: coefficients,
    mcfadden_r_squared: Number(mcFaddenR2.toFixed(4)),
    likelihood_ratio_chi_square: Number(lrStatistic.toFixed(4)),
    likelihood_ratio_df: lrDf,
    likelihood_ratio_p_value: Number(lrPValue.toFixed(6)),
    model_is_significant: lrPValue < 0.05,
    classification_accuracy: Number(accuracy.toFixed(4)),
    n: n,
    not: "odds_ratio > 1: değişken artışı hedef kategori (1) olasılığını artırır; odds_ratio < 1: azaltır"
  };
}

// ============================================================
// DOĞRUSALLIK TESTİ
// ============================================================

function linearityTest(pairs) {
  const n = pairs.length;
  if (n < 5) return { note: "Doğrusallık testi için yetersiz gözlem (n<5)" };

  const xVals = pairs.map(p => p.x);
  const yVals = pairs.map(p => p.y);

  let sumX=0, sumX2=0, sumX3=0, sumX4=0, sumY=0, sumXY=0, sumX2Y=0;
  for (let i = 0; i < n; i++) {
    const x = xVals[i], y = yVals[i];
    const x2 = x*x;
    sumX += x; sumX2 += x2; sumX3 += x2*x; sumX4 += x2*x2;
    sumY += y; sumXY += x*y; sumX2Y += x2*y;
  }

  const XtX = [
    [n, sumX, sumX2],
    [sumX, sumX2, sumX3],
    [sumX2, sumX3, sumX4]
  ];
  const XtY = [sumY, sumXY, sumX2Y];

  const XtXinv = invert3x3(XtX);
  if (!XtXinv) return { note: "Matris tekil, doğrusallık testi hesaplanamadı" };

  const b = multiplyMatVec3(XtXinv, XtY);

  let rss = 0;
  for (let i = 0; i < n; i++) {
    const predicted = b[0] + b[1]*xVals[i] + b[2]*xVals[i]*xVals[i];
    rss += Math.pow(yVals[i] - predicted, 2);
  }

  const df = n - 3;
  const sigma2 = rss / df;
  const varB2 = sigma2 * XtXinv[2][2];
  const seB2 = Math.sqrt(varB2);
  const tB2 = b[2] / seB2;
  const pValue = fDistributionPValue(tB2 * tB2, 1, df);

  return {
    test: "Doğrusallık Testi (Kareli Terim Ekleme)",
    quadratic_coefficient: Number(b[2].toFixed(8)),
    t_statistic: Number(tB2.toFixed(4)),
    df: df,
    p_value: Number(pValue.toFixed(6)),
    is_nonlinear: pValue < 0.05,
    yorum: pValue < 0.05
      ? "Kareli terim istatistiksel olarak anlamlı - ilişki doğrusal olmayabilir, doğrusal regresyon sonuçları ihtiyatlı yorumlanmalı"
      : "Kareli terim anlamlı değil - doğrusallık varsayımı reddedilemiyor"
  };
}

// ============================================================
// DURBIN-WATSON TESTİ
// ============================================================

function durbinWatsonTest(residuals) {
  const n = residuals.length;
  if (n < 3) return { note: "Durbin-Watson testi için yetersiz gözlem" };

  let numerator = 0;
  for (let i = 1; i < n; i++) {
    numerator += Math.pow(residuals[i] - residuals[i - 1], 2);
  }

  let denominator = 0;
  for (let i = 0; i < n; i++) {
    denominator += Math.pow(residuals[i], 2);
  }

  const dw = numerator / denominator;

  let yorum;
  if (dw < 1.5) yorum = "Pozitif otokorelasyon olabilir - bağımsızlık varsayımı şüpheli";
  else if (dw > 2.5) yorum = "Negatif otokorelasyon olabilir - bağımsızlık varsayımı şüpheli";
  else yorum = "Otokorelasyon belirtisi yok - bağımsızlık varsayımı makul";

  return {
    test: "Durbin-Watson Testi",
    statistic: Number(dw.toFixed(4)),
    yorum: yorum,
    not: "DW ideal olarak 2'ye yakın olmalı (0-4 arası değişir). Bu veri satır sırasına duyarlıdır; veri zaman serisi değilse yorumlayıcı niteliktedir."
  };
}

// ============================================================
// GRUP-BAZLI NORMALLİK TESTİ
// ============================================================

function groupNormality(values) {
  const n = values.length;
  if (n < 8) {
    return { p_value: null, is_normal: null, note: "Grup çok küçük (n<8), normallik güvenilir test edilemedi" };
  }

  const groupMean = mean(values);
  const variance = values.reduce((sum, v) => sum + Math.pow(v - groupMean, 2), 0) / n;
  const std = Math.sqrt(variance);
  if (std === 0) return { p_value: null, is_normal: null, note: "Varyans sıfır" };

  const skewness = values.reduce((sum, v) => sum + Math.pow((v - groupMean) / std, 3), 0) / n;
  const kurtosis = values.reduce((sum, v) => sum + Math.pow((v - groupMean) / std, 4), 0) / n;
  const excessKurtosis = kurtosis - 3;
  const jbStatistic = (n / 6) * (Math.pow(skewness, 2) + (Math.pow(excessKurtosis, 2) / 4));
  const pValue = chiSquarePValue(jbStatistic, 2);

  return {
    n: n,
    skewness: Number(skewness.toFixed(3)),
    excess_kurtosis: Number(excessKurtosis.toFixed(3)),
    p_value: Number(pValue.toFixed(4)),
    is_normal: pValue > 0.05
  };
}

function leveneTest(groups) {
  const zGroups = {};
  for (const [key, values] of Object.entries(groups)) {
    const med = median(values);
    zGroups[key] = values.map(v => Math.abs(v - med));
  }
  const anovaOnZ = oneWayANOVA(zGroups);
  return {
    test: "Levene Testi (Brown-Forsythe, medyan tabanlı)",
    statistic: anovaOnZ.f_statistic,
    df_between: anovaOnZ.df_between,
    df_within: anovaOnZ.df_within,
    p_value: anovaOnZ.p_value,
    is_homogeneous: anovaOnZ.p_value > 0.05
  };
}

function welchANOVA(groups) {
  const groupArrays = Object.entries(groups);
  const k = groupArrays.length;
  if (groupArrays.some(([key, values]) => values.length < 2)) return { error: "Her grupta en az 2 gözlem olmalı" };

  const stats = groupArrays.map(([key, values]) => {
    const n = values.length;
    const m = mean(values);
    const variance = values.reduce((s, v) => s + Math.pow(v - m, 2), 0) / (n - 1);
    const w = n / variance;
    return { key, n, mean: m, variance, w };
  });

  const sumW = stats.reduce((s, g) => s + g.w, 0);
  const weightedMean = stats.reduce((s, g) => s + g.w * g.mean, 0) / sumW;
  const numerator = stats.reduce((s, g) => s + g.w * Math.pow(g.mean - weightedMean, 2), 0) / (k - 1);
  const sumTerm = stats.reduce((s, g) => s + Math.pow(1 - g.w / sumW, 2) / (g.n - 1), 0);
  const denominator = 1 + (2 * (k - 2) / (k * k - 1)) * sumTerm;
  const fStatistic = numerator / denominator;
  const df1 = k - 1;
  const df2 = (k * k - 1) / (3 * sumTerm);
  const pValue = fDistributionPValue(fStatistic, df1, df2);

  return {
    test: "Welch's ANOVA",
    f_statistic: Number(fStatistic.toFixed(4)),
    df1: Number(df1.toFixed(4)),
    df2: Number(df2.toFixed(4)),
    p_value: Number(pValue.toFixed(6)),
    is_significant: pValue < 0.05,
    group_means: Object.fromEntries(stats.map(g => [g.key, Number(g.mean.toFixed(2))]))
  };
}
// ============================================================
// GRAFİK URL'Sİ ÜRETME (QuickChart.io, profesyonel/akademik stil)
// ============================================================

function generateBarChartUrl(labels, values, title, yAxisLabel) {
  const chartConfig = {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [{
        label: yAxisLabel || 'Değer',
        data: values,
        backgroundColor: '#2c5f8a',
        borderColor: '#1a3c5e',
        borderWidth: 1
      }]
    },
    options: {
      plugins: {
        title: { display: true, text: title, font: { size: 18, family: 'Georgia' } },
        legend: { display: false }
      },
      scales: {
        y: { title: { display: true, text: yAxisLabel || 'Değer' }, grid: { color: '#e0e0e0' } },
        x: { grid: { display: false } }
      }
    }
  };
  const encodedConfig = encodeURIComponent(JSON.stringify(chartConfig));
 return `https://quickchart.io/chart?width=600&height=400&backgroundColor=white&c=${encodedConfig}`;
}

  function generateScatterPlotUrl(pairs, xLabel, yLabel, title, regressionLine) {
  
  const maxPoints = 100;
  const sampledPairs = pairs.length > maxPoints
    ? pairs.filter((_, i) => i % Math.ceil(pairs.length / maxPoints) === 0)
    : pairs;
  

const points = sampledPairs.map(p => ({ x: p.x, y: p.y }));
  const datasets = [{
    label: 'Veri Noktaları',
    data: points,
    backgroundColor: '#2c5f8a',
    pointRadius: 3
  }];

  if (regressionLine) {
    const xMin = Math.min(...pairs.map(p => p.x));
    const xMax = Math.max(...pairs.map(p => p.x));
    datasets.push({
      label: 'Regresyon Çizgisi',
      data: [
        { x: xMin, y: regressionLine.intercept + regressionLine.slope * xMin },
        { x: xMax, y: regressionLine.intercept + regressionLine.slope * xMax }
      ],
      type: 'line',
      borderColor: '#c0392b',
      backgroundColor: 'transparent',
      pointRadius: 0,
      borderWidth: 2
    });
  }

  const chartConfig = {
    type: 'scatter',
    data: { datasets: datasets },
    options: {
      plugins: {
        title: { display: true, text: title, font: { size: 18, family: 'Georgia' } }
      },
      scales: {
        x: { title: { display: true, text: xLabel }, grid: { color: '#e0e0e0' } },
        y: { title: { display: true, text: yLabel }, grid: { color: '#e0e0e0' } }
      }
    }
  };
  const encodedConfig = encodeURIComponent(JSON.stringify(chartConfig));
return `https://quickchart.io/chart?width=600&height=400&backgroundColor=white&c=${encodedConfig}`;
}
// ============================================================
// GRUPLANDIRILMIŞ BAR GRAFİK (Ki-Kare kontenjans tablosu için)
// ============================================================

function generateGroupedBarChartUrl(rowCategories, colCategories, observedMatrix, title) {
  const colors = ['#2c5f8a', '#c0392b', '#27ae60', '#f39c12', '#8e44ad', '#16a085'];
  const datasets = colCategories.map((col, colIdx) => ({
    label: String(col),
    data: rowCategories.map((row, rowIdx) => observedMatrix[rowIdx][colIdx]),
    backgroundColor: colors[colIdx % colors.length]
  }));

  const chartConfig = {
    type: 'bar',
    data: {
      labels: rowCategories.map(String),
      datasets: datasets
    },
    options: {
      plugins: {
        title: { display: true, text: title, font: { size: 18, family: 'Georgia' } }
      },
      scales: {
        y: { title: { display: true, text: 'Frekans (Sayı)' }, grid: { color: '#e0e0e0' } },
        x: { grid: { display: false } }
      }
    }
  };
  const encodedConfig = encodeURIComponent(JSON.stringify(chartConfig));
  return `https://quickchart.io/chart?width=600&height=400&backgroundColor=white&c=${encodedConfig}`;
}
// ============================================================
// ÖNCESİ/SONRASI KARŞILAŞTIRMA GRAFİĞİ (Eşleştirilmiş test için)
// ============================================================

function generatePairedComparisonChartUrl(pairs, label1, label2, title) {
  const mean1 = mean(pairs.map(p => p.x));
  const mean2 = mean(pairs.map(p => p.y));

  const chartConfig = {
    type: 'bar',
    data: {
      labels: [label1, label2],
      datasets: [{
        label: 'Ortalama Değer',
        data: [Number(mean1.toFixed(2)), Number(mean2.toFixed(2))],
        backgroundColor: ['#2c5f8a', '#c0392b']
      }]
    },
    options: {
      plugins: {
        title: { display: true, text: title, font: { size: 18, family: 'Georgia' } },
        legend: { display: false }
      },
      scales: {
        y: { title: { display: true, text: 'Ortalama Değer' }, grid: { color: '#e0e0e0' } },
        x: { grid: { display: false } }
      }
    }
  };
  const encodedConfig = encodeURIComponent(JSON.stringify(chartConfig));
  return `https://quickchart.io/chart?width=500&height=350&backgroundColor=white&c=${encodedConfig}`;
}
// ============================================================
// KATSAYI GRAFİĞİ (Çoklu Regresyon ve Lojistik Regresyon için)
// ============================================================

function generateCoefficientChartUrl(coefficients, title, yLabel) {
  const filtered = coefficients.filter(c => c.degisken !== "(Sabit)");
  const labels = filtered.map(c => c.degisken);
  const values = filtered.map(c => c.katsayi);
  const colors = values.map(v => v >= 0 ? '#2c5f8a' : '#c0392b');

  const chartConfig = {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [{
        label: yLabel || 'Katsayı',
        data: values,
        backgroundColor: colors
      }]
    },
    options: {
      plugins: {
        title: { display: true, text: title, font: { size: 18, family: 'Georgia' } },
        legend: { display: false }
      },
      scales: {
        y: { title: { display: true, text: yLabel || 'Katsayı' }, grid: { color: '#e0e0e0' } },
        x: { grid: { display: false } }
      }
    }
  };
  const encodedConfig = encodeURIComponent(JSON.stringify(chartConfig));
  return `https://quickchart.io/chart?width=600&height=400&backgroundColor=white&c=${encodedConfig}`;
}

// ============================================================
// ANA MANTIK
// ============================================================

const decision = $('AI Agent').item.json.output;
const testType = decision.onerilen_test.toLowerCase();
// ============================================================
// LIKERT METİN → SAYI DÖNÜŞÜMÜ (Sabit sözlük, deterministik)
// ============================================================
const likertMap = {
  'kesinlikle katılmıyorum': 1, 'hiç katılmıyorum': 1,
  'katılmıyorum': 2,
  'kararsızım': 3, 'ne katılıyorum ne katılmıyorum': 3, 'fikrim yok': 3,
  'katılıyorum': 4,
  'kesinlikle katılıyorum': 5, 'tamamen katılıyorum': 5,
  'hiç memnun değilim': 1, 'kesinlikle memnun değilim': 1,
  'memnun değilim': 2,
  'memnunum': 4,
  'çok memnunum': 5, 'kesinlikle memnunum': 5,
  'hiçbir zaman': 1, 'nadiren': 2, 'bazen': 3, 'sık sık': 4, 'her zaman': 5,
  'çok kötü': 1, 'kötü': 2, 'orta': 3, 'iyi': 4, 'çok iyi': 5,
  'biliyorum': 2, 'bilmiyorum': 1, 'yorumum yok': 0
};
// Her likertMap anahtarının ait olduğu ölçeğin TEORİK (gözlemlenen değil, sözlüğün
// kendisinden bilinen) min/max sınırı. reverseScaleColumn bu sınırları kullanabildiğinde
// veri setinde skalanın uç noktalarının hiç seçilmemiş olması gibi bir durumdan
// etkilenmeden doğru ters kodlama yapabilir.
const likertScaleBounds = {
  'kesinlikle katılmıyorum': [1, 5], 'hiç katılmıyorum': [1, 5],
  'katılmıyorum': [1, 5],
  'kararsızım': [1, 5], 'ne katılıyorum ne katılmıyorum': [1, 5], 'fikrim yok': [1, 5],
  'katılıyorum': [1, 5],
  'kesinlikle katılıyorum': [1, 5], 'tamamen katılıyorum': [1, 5],
  'hiç memnun değilim': [1, 5], 'kesinlikle memnun değilim': [1, 5],
  'memnun değilim': [1, 5],
  'memnunum': [1, 5],
  'çok memnunum': [1, 5], 'kesinlikle memnunum': [1, 5],
  'hiçbir zaman': [1, 5], 'nadiren': [1, 5], 'bazen': [1, 5], 'sık sık': [1, 5], 'her zaman': [1, 5],
  'çok kötü': [1, 5], 'kötü': [1, 5], 'orta': [1, 5], 'iyi': [1, 5], 'çok iyi': [1, 5],
  'biliyorum': [0, 2], 'bilmiyorum': [0, 2], 'yorumum yok': [0, 2]
};
function convertLikertColumns(rawRows) {
  if (rawRows.length === 0) return { rows: rawRows, warnings: [], scaleBounds: {} };
  const columns = Object.keys(rawRows[0]);
  const convertedRows = rawRows.map(r => ({ ...r }));
  const warnings = [];
  const scaleBounds = {};

  for (const col of columns) {
    const values = rawRows.map(r => r[col]).filter(v => v !== undefined && v !== null && v !== '');
    if (values.length === 0) continue;

    const alreadyNumeric = values.every(v => !isNaN(toNumber(v)));
    if (alreadyNumeric) continue;

    const matchCount = values.filter(v => likertMap[String(v).toLowerCase().trim()] !== undefined).length;
    if (matchCount / values.length >= 0.8) {
      let unmatchedCount = 0;
      let colMin = null, colMax = null;
      for (const row of convertedRows) {
        const val = row[col];
        if (val !== undefined && val !== null && val !== '') {
          const key = String(val).toLowerCase().trim();
          const mapped = likertMap[key];
          if (mapped !== undefined) {
            row[col] = mapped;
            const bounds = likertScaleBounds[key];
            if (bounds) {
              colMin = colMin === null ? bounds[0] : Math.min(colMin, bounds[0]);
              colMax = colMax === null ? bounds[1] : Math.max(colMax, bounds[1]);
            }
          } else {
            row[col] = null;
            unmatchedCount++;
          }
        }
      }
      if (colMin !== null && colMax !== null) {
        scaleBounds[col] = [colMin, colMax];
      }
      if (unmatchedCount > 0) {
        warnings.push(`"${col}" sütununda ${unmatchedCount} değer tanınan Likert ifadeleriyle eşleşmedi, bu satırlar bu sütun için analiz dışı bırakıldı.`);
      }
    }
  }
  return { rows: convertedRows, warnings, scaleBounds };
}
function reverseScaleColumn(rawRows, colName, theoreticalBounds) {
  let scaleMin, scaleMax, usedTheoretical;
  if (theoreticalBounds && theoreticalBounds[colName]) {
    // Likert sözlüğünden dönüştürülmüş bir sütun: gerçek/teorik skala sınırı biliniyor,
    // veri setinde uç noktaların gözlemlenip gözlemlenmediğinden bağımsız olarak doğru.
    [scaleMin, scaleMax] = theoreticalBounds[colName];
    usedTheoretical = true;
  } else {
    // Teorik sınır bilinmiyor (sütun zaten sayısal girilmiş, Likert sözlüğünden geçmemiş):
    // veri setindeki gözlemlenen min/max kullanılıyor. Katılımcılar skalanın bir ucunu
    // (örn. en düşük puanı) hiç seçmemişse bu yanlış ters kodlamaya yol açabilir.
    const values = rawRows.map(r => toNumber(r[colName])).filter(v => !isNaN(v));
    if (values.length === 0) return { rows: rawRows, usedTheoretical: false, warning: null };
    scaleMin = Math.min(...values);
    scaleMax = Math.max(...values);
    usedTheoretical = false;
  }

  const rows = rawRows.map(row => {
    const newRow = { ...row };
    const val = toNumber(row[colName]);
    if (!isNaN(val)) {
      newRow[colName] = (scaleMax + scaleMin) - val;
    }
    return newRow;
  });

  const warning = usedTheoretical
    ? null
    : `"${colName}" sütunu ters kodlanırken skalanın teorik sınırı bilinmediği için veri setindeki gözlemlenen min (${scaleMin}) - maks (${scaleMax}) değerleri kullanıldı. Katılımcılar skalanın gerçek uç noktalarından birini hiç seçmemişse bu ters kodlama hatalı olabilir.`;

  return { rows, usedTheoretical, warning };
}
function createCompositeScore(rawRows, items, newColName) {
  let excludedCount = 0;
  const rows = rawRows.map(row => {
    const newRow = { ...row };
    const values = items.map(item => toNumber(row[item])).filter(v => !isNaN(v));
    if (values.length === items.length) {
      newRow[newColName] = (values.reduce((a, b) => a + b, 0) / values.length).toFixed(4);
    } else {
      excludedCount++;
    }
    return newRow;
  });
  return { rows, excludedCount };
}
let rawRows;
try {
  rawRows = $('Extract from File').all().map(item => item.json);
} catch (e) {
  rawRows = $('Extract from File1').all().map(item => item.json);
}
const likertResult = convertLikertColumns(rawRows);
rawRows = likertResult.rows;
const likertWarnings = likertResult.warnings;
const likertScaleBoundsMap = likertResult.scaleBounds;

const columnNames = rawRows.length > 0 ? Object.keys(rawRows[0]) : [];

// AI Agent, zaten sayısal girilmiş (metin-Likert sözlüğünden geçmemiş) bir sütunun
// gerçek teorik skalasını "SCALE:sütun_adı:min-max" şeklinde belirtebilir (örn. "SCALE:puan:1-7").
// Bu bilgi köre güvenilmiyor: veri setindeki gerçek değerler bu aralığın dışına taşıyorsa
// (AI'nin belirttiği skala veriyle çelişiyorsa) kullanılmıyor, bunun yerine ne olduğu açıkça
// uyarı olarak raporlanıyor ve gözlemlenen min/max'a düşülüyor.
const scaleMatches = decision.gerekce ? [...decision.gerekce.matchAll(/SCALE:\s*([^,;\n:]+):\s*(-?\d+(?:\.\d+)?)\s*-\s*(-?\d+(?:\.\d+)?)/g)] : [];
const aiScaleBoundsMap = {};
for (const m of scaleMatches) {
  const claimedMin = parseFloat(m[2]);
  const claimedMax = parseFloat(m[3]);
  const col = extractColumnNames(m[1].trim(), columnNames)[0];
  if (!col || isNaN(claimedMin) || isNaN(claimedMax) || claimedMin >= claimedMax) continue;
  const observedValues = rawRows.map(r => toNumber(r[col])).filter(v => !isNaN(v));
  const observedMin = observedValues.length ? Math.min(...observedValues) : null;
  const observedMax = observedValues.length ? Math.max(...observedValues) : null;
  if (observedMin !== null && (observedMin < claimedMin || observedMax > claimedMax)) {
    likertWarnings.push(`AI Agent "${col}" sütunu için ${claimedMin}-${claimedMax} arası bir ölçek belirtti, ama veri setinde bu aralığın dışında değerler bulundu (gözlemlenen: ${observedMin}-${observedMax}). Belirtilen skala sınırı güvenilir bulunmadığı için ters kodlamada kullanılmadı, bunun yerine gözlemlenen min/max değerleri kullanıldı.`);
    continue;
  }
  aiScaleBoundsMap[col] = [claimedMin, claimedMax];
}
// Öncelik sırası: Likert sözlüğünden (metinden) çıkan sınır her zaman en güvenilir olduğu
// için AI'nin belirttiği sınırın üzerine yazılır; AI'nin sınırı sadece sözlükten bilgi
// gelmeyen (zaten sayısal) sütunlar için kullanılır.
const combinedScaleBounds = { ...aiScaleBoundsMap, ...likertScaleBoundsMap };

// REVERSE:iki nokta üst üsteden sonra boşluk olsa da olmasa da yakalar; sütun adını
// sadece bir sonraki virgül/noktalı virgül/satır sonuna kadar keser (tek kelimede
// durup çok kelimeli sütun adlarını kaçırmaz), extractColumnNames zaten bu metin
// içinde substring araması yapıyor.
const reverseMatches = decision.gerekce ? [...decision.gerekce.matchAll(/REVERSE:\s*([^,;\n]+)/g)] : [];
for (const match of reverseMatches) {
  const reverseCol = extractColumnNames(match[1], columnNames)[0];
  if (reverseCol) {
    const reverseResult = reverseScaleColumn(rawRows, reverseCol, combinedScaleBounds);
    rawRows = reverseResult.rows;
    if (reverseResult.warning) {
      likertWarnings.push(reverseResult.warning);
    }
  }
}
const endeksMaddeleriRaw = decision.endeks_maddeleri || [];
const endeksMaddeleri = endeksMaddeleriRaw.map(item => extractColumnNames(String(item), columnNames)[0] || item).filter(v => v && columnNames.includes(v));
if (endeksMaddeleri.length >= 2 && decision.endeks_adi) {
  let finalEndeksAdi = decision.endeks_adi.trim();
  if (columnNames.includes(finalEndeksAdi)) {
    finalEndeksAdi = finalEndeksAdi + '_endeks';
  }
  const compositeResult = createCompositeScore(rawRows, endeksMaddeleri, finalEndeksAdi);
  rawRows = compositeResult.rows;
  if (compositeResult.excludedCount > 0) {
    likertWarnings.push(`"${finalEndeksAdi}" endeksi oluşturulurken ${compositeResult.excludedCount} katılımcının bir veya daha fazla maddesi eksik/dönüştürülemez olduğu için o katılımcılar için endeks hesaplanamadı.`);
  }
}

function extractColumnNames(text, availableColumns) {
  if (!text) return [];
  const sorted = [...availableColumns].sort((a, b) => b.length - a.length);
  let remaining = text;
  const positions = [];
  for (const col of sorted) {
    let idx = remaining.indexOf(col);
    while (idx !== -1) {
      positions.push({ col, idx });
      remaining = remaining.slice(0, idx) + ' '.repeat(col.length) + remaining.slice(idx + col.length);
      idx = remaining.indexOf(col);
    }
  }
  positions.sort((a, b) => a.idx - b.idx);
  const found = [];
  const seen = new Set();
  for (const p of positions) {
    if (!seen.has(p.col)) {
      found.push(p.col);
      seen.add(p.col);
    }
  }
  return found;
}

function checkTooManyCategories(rows, colName, maxCategories = 20) {
  const uniqueValues = new Set(
    rows.map(r => normalizeCategory(r[colName])).filter(v => v !== undefined && v !== null && v !== '')
  );
  return uniqueValues.size > maxCategories;
}
// ============================================================
// CRONBACH'S ALPHA (Ölçek Güvenilirlik Analizi)
// ============================================================

function cronbachAlpha(rawRows, items) {
  const k = items.length;
  if (k < 2) return { error: "Cronbach's Alpha için en az 2 madde (sütun) gerekli" };

  const validRows = rawRows.filter(row =>
    items.every(item => row[item] !== undefined && row[item] !== null && row[item] !== '' && !isNaN(toNumber(row[item])))
  );

  const n = validRows.length;
  if (n < 3) return { error: "Yetersiz gözlem sayısı (tüm maddelerde eksiksiz veri gereken en az 3 satır bulunamadı)" };

  const itemValues = items.map(item => validRows.map(row => toNumber(row[item])));

  const itemVariances = itemValues.map(values => {
    const m = mean(values);
    return values.reduce((s, v) => s + Math.pow(v - m, 2), 0) / (n - 1);
  });

  const totalScores = validRows.map((_, rowIdx) =>
    itemValues.reduce((sum, itemArr) => sum + itemArr[rowIdx], 0)
  );
  const totalMean = mean(totalScores);
  const totalVariance = totalScores.reduce((s, v) => s + Math.pow(v - totalMean, 2), 0) / (n - 1);

  const sumItemVariances = itemVariances.reduce((a, b) => a + b, 0);
  const alpha = (k / (k - 1)) * (1 - sumItemVariances / totalVariance);

  let interpretation;
  if (alpha >= 0.9) interpretation = "Mükemmel iç tutarlılık";
  else if (alpha >= 0.8) interpretation = "İyi iç tutarlılık";
  else if (alpha >= 0.7) interpretation = "Kabul edilebilir iç tutarlılık";
  else if (alpha >= 0.6) interpretation = "Şüpheli iç tutarlılık";
  else if (alpha >= 0.5) interpretation = "Zayıf iç tutarlılık";
  else interpretation = "Kabul edilemez iç tutarlılık";

  const itemTotalCorrelations = items.map((item, idx) => {
    const itemVals = itemValues[idx];
    const restTotal = validRows.map((_, rowIdx) =>
      totalScores[rowIdx] - itemVals[rowIdx]
    );
    const pairs = itemVals.map((v, i) => ({ x: v, y: restTotal[i] }));
    const corr = pearsonCorrelation(pairs);
    return {
      madde: item,
      madde_toplam_korelasyonu: corr.r !== undefined ? corr.r : null
    };
  });

  return {
    test: "Cronbach's Alpha (Ölçek Güvenilirlik Analizi)",
    alpha: Number(alpha.toFixed(4)),
    madde_sayisi: k,
    n: n,
    yorum: interpretation,
    madde_analizi: itemTotalCorrelations,
    toplam_varyans: Number(totalVariance.toFixed(4)),
    madde_varyanslari_toplami: Number(sumItemVariances.toFixed(4))
  };
}


const bagimliRaw = (decision.bagimli_degisken || '').trim();
const ikinciRaw = (decision.ikinci_degisken || '').trim();
const gruplayiciRaw = (decision.gruplayici_degisken || '').trim();
const bagimliMatches = extractColumnNames(bagimliRaw, columnNames);
const ikinciMatches = extractColumnNames(ikinciRaw, columnNames);
const gruplayiciMatches = extractColumnNames(gruplayiciRaw, columnNames);

const depVar = bagimliMatches[0] || bagimliRaw;
const groupVar = gruplayiciMatches[0] || gruplayiciRaw;

let secondVar;
if (ikinciMatches.length > 0) {
  secondVar = ikinciMatches[0];
} else if (bagimliMatches.length >= 2) {
  secondVar = bagimliMatches[1];
} else if (gruplayiciMatches.length > 0) {
  secondVar = gruplayiciMatches[0];
} else {
  secondVar = decision.gruplayici_degisken;
}
const isChitchat = testType.includes('sohbet') || testType.includes('chitchat');
const isDataSummary = testType.includes('veri-ozeti') || testType.includes('ozet') || testType.includes('summary');
const isCronbachAlpha = testType.includes('cronbach') || testType.includes('guvenilirlik') || testType.includes('güvenilirlik');
const depVarSample = rawRows.find(r => r[depVar] !== undefined && r[depVar] !== null && r[depVar] !== '');
const depVarIsCategorical = depVarSample ? !isColumnMostlyNumeric(rawRows, depVar) : false;
const secondVarSample = secondVar ? rawRows.find(r => r[secondVar] !== undefined && r[secondVar] !== null && r[secondVar] !== '') : null;
const secondVarIsCategorical = secondVarSample ? !isColumnMostlyNumeric(rawRows, secondVar) : false;
const isChiSquare = (depVarIsCategorical === true && secondVarIsCategorical === true && secondVar && secondVar.trim() !== '');

const userQuestion = ($('When chat message received').item.json.chatInput || '').toLowerCase();
const regressionKeywords = ['etkiliyor', 'etkisi', 'ne kadar etki', 'tahmin ed', 'artırıyor', 'azaltıyor', 'nasıl değişir', 'etkili mi'];
const questionSuggestsRegression = regressionKeywords.some(kw => userQuestion.includes(kw));

const isRegression = !isChiSquare && (testType.includes('regresyon') || testType.includes('regression') || (questionSuggestsRegression && secondVar && secondVar.trim() !== '' && depVarIsCategorical === secondVarIsCategorical));
const bagimsizDegiskenlerRaw = decision.bagimsiz_degiskenler || [];
const bagimsizDegiskenler = bagimsizDegiskenlerRaw
  .map(item => {
    const matches = extractColumnNames(String(item), columnNames);
    return matches[0] || item;
  })
  .filter(v => {
    if (!v || !columnNames.includes(v)) return false;
    const sample = rawRows.find(r => r[v] !== undefined && r[v] !== null && r[v] !== '');
    return sample && isColumnMostlyNumeric(rawRows, v) === true;
  });
const isMultipleRegression = testType.includes('coklu-regresyon') || testType.includes('multiple-regression') || bagimsizDegiskenler.length >= 2;

const pairedKeywords = ['öncesi', 'oncesi', 'sonrası', 'sonrasi', 'öncesinde', 'sonrasında', 'değişti mi', 'degisti mi', 'fark var mı', 'fark var mi'];
const questionSuggestsPaired = pairedKeywords.some(kw => userQuestion.includes(kw));
const isPaired = (testType.includes('esleştirilmiş') || testType.includes('eslestirilmis') || testType.includes('paired')) ||
  (questionSuggestsPaired && secondVar && secondVar.trim() !== '' && depVarIsCategorical === false && secondVarIsCategorical === false);


const isLogistic = (testType.includes('lojistik') || testType.includes('logistic')) ||
  (depVarIsCategorical && bagimsizDegiskenler.length >= 1);


const isActuallyGroupComparison = !isChiSquare && !isRegression && !isPaired && !isLogistic && !isMultipleRegression &&
  secondVar && secondVar.trim() !== '' && depVarSample && secondVarSample &&
  (depVarIsCategorical !== secondVarIsCategorical);

const isCorrelation = !isChiSquare && !isRegression && !isPaired && !isActuallyGroupComparison &&
  (testType.includes('pearson') || testType.includes('spearman') || (secondVar && secondVar.trim() !== ''));

let output;
if (isChitchat) {
  output = {
    analiz_turu: "sohbet",
    onerilen_test_ai: decision.onerilen_test,
    uygulanan_test: "sohbet",
    gerekce: decision.gerekce,
    sonuc: {
      mesaj: decision.gerekce
    }
  };
} else if (isCronbachAlpha) {
  const items = bagimsizDegiskenler.length > 0 ? bagimsizDegiskenler : (decision.bagimsiz_degiskenler || []);
  const result = cronbachAlpha(rawRows, items);
  output = {
    analiz_turu: "cronbach_alpha",
    onerilen_test_ai: decision.onerilen_test,
    uygulanan_test: "cronbach-alpha",
    override_aciklamasi: null,
    maddeler: items,
    gerekce: decision.gerekce,
    sonuc: result
  };
  } else if (isDataSummary) {
  const profileData = $('Code in JavaScript').first().json;
  output = {
    analiz_turu: "veri_ozeti",
    onerilen_test_ai: decision.onerilen_test,
    uygulanan_test: "veri-ozeti",
    gerekce: decision.gerekce,
    sonuc: profileData
  };
} else if (isActuallyGroupComparison) {
  const categoricalVarCandidate = depVarIsCategorical ? depVar : secondVar;
  const tooManyCategories = checkTooManyCategories(rawRows, categoricalVarCandidate);

  if (tooManyCategories) {
    output = {
      analiz_turu: "hata",
      onerilen_test_ai: decision.onerilen_test,
      gerekce: decision.gerekce,
      sonuc: {
        error: `"${categoricalVarCandidate}" değişkeni ${new Set(rawRows.map(r => normalizeCategory(r[categoricalVarCandidate])).filter(v => v !== undefined && v !== null && v !== '')).size} farklı benzersiz değer içeriyor, bu bir gruplama/kategori değişkeni olarak kullanılamayacak kadar fazla. Bu değişken muhtemelen sürekli sayısal bir değişken — belki korelasyon veya regresyon analizi düşünmelisiniz.`
      }
    };
  } else {
  
  const numericVar = depVarIsCategorical ? secondVar : depVar;
  const categoricalVar = depVarIsCategorical ? depVar : secondVar;
  const groups = groupByVariable(rawRows, numericVar, categoricalVar);
  const groupCount = Object.keys(groups).length;
    

  const perGroupNormality = {};
  for (const [key, values] of Object.entries(groups)) {
    perGroupNormality[key] = groupNormality(values);
  }
  const validNormality = Object.values(perGroupNormality).filter(r => r.is_normal !== null);
  const allGroupsNormal = validNormality.length > 0 && validNormality.every(r => r.is_normal === true);
  const leveneResult = groupCount >= 2 ? leveneTest(groups) : null;

  let finalTestType;
  if (!allGroupsNormal) {
    finalTestType = groupCount === 2 ? 'mann-whitney' : 'kruskal-wallis';
  } else if (leveneResult && !leveneResult.is_homogeneous) {
    finalTestType = groupCount === 2 ? 'welch-t-test' : 'welch-anova';
  } else {
    finalTestType = groupCount === 2 ? 't-test' : 'anova';
  }

  let result;
    if (groupCount < 2) {
  result = { error: `"${categoricalVar}" değişkeninde karşılaştırılabilecek yeterli grup yok (${groupCount} grup bulundu, en az 2 gerekli).` };
} else if (finalTestType === 'anova') result = oneWayANOVA(groups);
  else if (finalTestType === 'welch-anova') result = welchANOVA(groups);
  else if (finalTestType === 'kruskal-wallis') result = kruskalWallis(groups);
  else if (finalTestType === 't-test') result = studentTTest(groups);
  else if (finalTestType === 'welch-t-test') result = welchTTest(groups);
  else if (finalTestType === 'mann-whitney') result = mannWhitneyU(groups);
  const chartLabels = Object.keys(groups);
const chartValues = (finalTestType.includes('anova') || finalTestType === 't-test' || finalTestType === 'welch-t-test')
  ? chartLabels.map(k => Number(mean(groups[k]).toFixed(2)))
  : chartLabels.map(k => Number(median(groups[k]).toFixed(2)));
const grafikUrl = generateBarChartUrl(chartLabels, chartValues, `${categoricalVar}'a göre ${numericVar}`, numericVar);

  output = {
    analiz_turu: "grup_karsilastirma",
    onerilen_test_ai: decision.onerilen_test,
    uygulanan_test: finalTestType,
    grup_sayisi: groupCount,
    override_aciklamasi: (decision.onerilen_test.toLowerCase().includes('pearson') || decision.onerilen_test.toLowerCase().includes('spearman'))
  ? `AI Agent "${decision.onerilen_test}" (korelasyon) önermişti, ancak "${categoricalVar}" kategorik bir değişken olduğu için grup karşılaştırma testi (${finalTestType}) uygulandı.`
  : null,
    bagimli_degisken: numericVar,
    gruplayici_degisken: categoricalVar,
    gerekce: decision.gerekce,
    grup_bazli_normallik: perGroupNormality,
    varyans_homojenligi: leveneResult,
    sonuc: result,
    grafik_url: grafikUrl
  };
  }

} else if (isLogistic) {
  const result = logisticRegression(rawRows, depVar, bagimsizDegiskenler);
  const grafikUrl = generateCoefficientChartUrl(result.katsayilar, `${depVar} için Lojistik Regresyon Katsayıları`, 'Katsayı (B)');
  output = {
    analiz_turu: "lojistik_regresyon",
    onerilen_test_ai: decision.onerilen_test,
    uygulanan_test: "lojistik-regresyon",
    override_aciklamasi: null,
    bagimli_degisken: depVar,
    bagimsiz_degiskenler: bagimsizDegiskenler,
    gerekce: decision.gerekce,
    sonuc: result,
    grafik_url: grafikUrl
  };
} else if (isMultipleRegression) {
  const result = multipleLinearRegression(rawRows, depVar, bagimsizDegiskenler);
  const grafikUrl = generateCoefficientChartUrl(result.katsayilar, `${depVar} için Regresyon Katsayıları`, 'Katsayı Değeri');
  output = {
    analiz_turu: "coklu_regresyon",
    onerilen_test_ai: decision.onerilen_test,
    uygulanan_test: "coklu-dogrusal-regresyon",
    override_aciklamasi: null,
    bagimli_degisken: depVar,
    bagimsiz_degiskenler: bagimsizDegiskenler,
    gerekce: decision.gerekce,
    sonuc: result,
    grafik_url: grafikUrl
  };
} else if (isPaired) {
  const pairs = pairColumns(rawRows, depVar, secondVar);
  const diffs = pairs.map(p => p.x - p.y);
  const diffNormality = groupNormality(diffs);

  const finalTestType = diffNormality.is_normal === true ? 'paired-t-test' : 'wilcoxon';
  let overrideNote = null;
  if (diffNormality.is_normal === null) {
    overrideNote = `Fark sayısı çok az olduğu için normallik güvenilir test edilemedi, ihtiyatlı olarak Wilcoxon testi uygulandı.`;
  } else if (finalTestType === 'wilcoxon') {
    overrideNote = `Farkların normallik testi (Jarque-Bera p=${diffNormality.p_value}) normal dağılımı reddetti, bu yüzden Wilcoxon İşaretli Sıra Testi uygulandı.`;
  }

  const result = finalTestType === 'paired-t-test' ? pairedTTest(pairs) : wilcoxonSignedRank(pairs);
  const grafikUrl = generatePairedComparisonChartUrl(pairs, depVar, secondVar, `${depVar} ve ${secondVar} Karşılaştırması`);

  output = {
    analiz_turu: "esleştirilmiş_test",
    onerilen_test_ai: decision.onerilen_test,
    uygulanan_test: finalTestType,
    override_aciklamasi: overrideNote,
    degisken_1: depVar,
    degisken_2: secondVar,
    gerekce: decision.gerekce,
    fark_normalligi: diffNormality,
    sonuc: result,
    grafik_url: grafikUrl,
  };
} else if (isChiSquare) {
  const result = chiSquareIndependence(rawRows, depVar, secondVar);
  const grafikUrl = generateGroupedBarChartUrl(result.row_categories, result.col_categories, result.observed_frequencies, `${depVar} ve ${secondVar} Dağılımı`);

  output = {
    analiz_turu: "ki-kare",
    onerilen_test_ai: decision.onerilen_test,
    uygulanan_test: "chi-square",
    override_aciklamasi: null,
    degisken_1: depVar,
    degisken_2: secondVar,
    gerekce: decision.gerekce,
    sonuc: result,
    grafik_url: grafikUrl
  };
} else if (isRegression) {
 const secondVarFinal = secondVar;
  const pairs = pairColumns(rawRows, secondVarFinal, depVar);
  const result = simpleLinearRegression(pairs);
  const grafikUrl = generateScatterPlotUrl(pairs, secondVarFinal, depVar, `${secondVarFinal} ile ${depVar} İlişkisi`, { intercept: result.intercept, slope: result.slope });

  output = {
    analiz_turu: "regresyon",
    onerilen_test_ai: decision.onerilen_test,
    uygulanan_test: "basit-dogrusal-regresyon",
    override_aciklamasi: null,
    bagimli_degisken: depVar,
    bagimsiz_degisken: secondVarFinal,
    gerekce: decision.gerekce,
    sonuc: result,
    grafik_url: grafikUrl
  };

} else if (isCorrelation) {
  const pairs = pairColumns(rawRows, depVar, secondVar);
  const xValues = pairs.map(p => p.x);
  const yValues = pairs.map(p => p.y);

  const xNormality = groupNormality(xValues);
  const yNormality = groupNormality(yValues);
  const bothNormal = xNormality.is_normal === true && yNormality.is_normal === true;

  const finalTestType = bothNormal ? 'pearson' : 'spearman';
  let overrideNote = null;
  if (finalTestType !== testType) {
    overrideNote = `AI Agent "${decision.onerilen_test}" önermişti. Her iki değişkenin gerçek normallik testi sonucuna göre (${depVar}: p=${xNormality.p_value}, ${secondVar}: p=${yNormality.p_value}), en uygun yöntem "${finalTestType}" olarak belirlendi.`;
  }

  const result = finalTestType === 'pearson' ? pearsonCorrelation(pairs) : spearmanCorrelation(pairs);
  const grafikUrl = generateScatterPlotUrl(pairs, depVar, secondVar, `${depVar} ile ${secondVar} İlişkisi`, null);

  output = {
    analiz_turu: "korelasyon",
    onerilen_test_ai: decision.onerilen_test,
    uygulanan_test: finalTestType,
    override_aciklamasi: overrideNote,
    degisken_1: depVar,
    degisken_2: secondVar,
    gerekce: decision.gerekce,
    degisken_1_normallik: xNormality,
    degisken_2_normallik: yNormality,
    sonuc: result,
    grafik_url: grafikUrl
  };

  } else {
  const tooManyCategories = checkTooManyCategories(rawRows, groupVar);

  if (tooManyCategories) {
    output = {
      analiz_turu: "hata",
      onerilen_test_ai: decision.onerilen_test,
      gerekce: decision.gerekce,
      sonuc: {
        error: `"${groupVar}" değişkeni ${new Set(rawRows.map(r => normalizeCategory(r[groupVar])).filter(v => v !== undefined && v !== null && v !== '')).size} farklı benzersiz değer içeriyor, gruplama değişkeni olarak kullanılamaz. Muhtemelen sürekli sayısal bir değişken.`
      }
    };
  } else {

  const groups = groupByVariable(rawRows, depVar, groupVar);
  const groupCount = Object.keys(groups).length;

  const perGroupNormality = {};
  for (const [key, values] of Object.entries(groups)) {
    perGroupNormality[key] = groupNormality(values);
  }
  const validNormality = Object.values(perGroupNormality).filter(r => r.is_normal !== null);
  const allGroupsNormal = validNormality.length > 0 && validNormality.every(r => r.is_normal === true);

  const leveneResult = groupCount >= 2 ? leveneTest(groups) : null;

  let finalTestType;
  let overrideNote = null;

  if (!allGroupsNormal) {
    finalTestType = groupCount === 2 ? 'mann-whitney' : 'kruskal-wallis';
  } else if (leveneResult && !leveneResult.is_homogeneous) {
    finalTestType = groupCount === 2 ? 'welch-t-test' : 'welch-anova';
  } else {
    finalTestType = groupCount === 2 ? 't-test' : 'anova';
  }

  if (finalTestType !== testType && !testType.includes(finalTestType.split('-')[0])) {
    overrideNote = `AI Agent "${decision.onerilen_test}" önermişti. Gerçek varsayım testleri sonucunda, ${groupCount} grup için en uygun test "${finalTestType}" olarak belirlendi.`;
  }

  let result;
if (groupCount < 2) {
  result = { error: `"${groupVar}" değişkeninde karşılaştırılabilecek yeterli grup yok (${groupCount} grup bulundu, en az 2 gerekli).` };
} else if (finalTestType === 'anova') result = oneWayANOVA(groups);
  else if (finalTestType === 'welch-anova') result = welchANOVA(groups);
  else if (finalTestType === 'kruskal-wallis') result = kruskalWallis(groups);
  else if (finalTestType === 't-test') result = studentTTest(groups);
  else if (finalTestType === 'welch-t-test') result = welchTTest(groups);
  else if (finalTestType === 'mann-whitney') result = mannWhitneyU(groups); 
  else result = { error: `'${finalTestType}' testi henüz desteklenmiyor.` };
  const chartLabels = Object.keys(groups);
const chartValues = (finalTestType.includes('anova') || finalTestType === 't-test' || finalTestType === 'welch-t-test')
  ? chartLabels.map(k => Number(mean(groups[k]).toFixed(2)))
  : chartLabels.map(k => Number(median(groups[k]).toFixed(2)));
const grafikUrl = generateBarChartUrl(chartLabels, chartValues, `${groupVar}'a göre ${depVar}`, depVar);

  output = {
    analiz_turu: "grup_karsilastirma",
    onerilen_test_ai: decision.onerilen_test,
    uygulanan_test: finalTestType,
    grup_sayisi: groupCount,
    override_aciklamasi: overrideNote,
    bagimli_degisken: depVar,
    gruplayici_degisken: groupVar,
    gerekce: decision.gerekce,
    grup_bazli_normallik: perGroupNormality,
    varyans_homojenligi: leveneResult,
    sonuc: result,
    grafik_url: grafikUrl
  };
}
}
if (likertWarnings.length > 0) {
  output.likert_uyarilari = likertWarnings;
}
return [{ json: output }];
