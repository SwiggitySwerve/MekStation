// Linear regression analysis to isolate which BV components correlate with the gap
// For each unit outside 1%, decompose: gap = f(armorBV, structBV, gyroBV, defEquip, defFactor, weaponBV, ammoBV, weight, speedFactor, ...)
const report = require('../validation-output/bv-validation-report.json');

const all = report.allResults.filter(x => x.breakdown);

// Build feature matrix for all units (not just outliers)
const features = [];
for (const u of all) {
  const b = u.breakdown;
  if (!b || !b.armorBV) continue;

  features.push({
    id: u.unitId,
    gap: u.difference, // calc - expected (negative = undercalc)
    pctGap: u.percentDiff,
    status: u.status,
    // Defensive components
    armorBV: b.armorBV || 0,
    structBV: b.structureBV || 0,
    gyroBV: b.gyroBV || 0,
    defEquip: b.defEquipBV || 0,
    amsAmmo: b.amsAmmoBV || 0,
    armoredComp: b.armoredComponentBV || 0,
    harjel: b.harjelBonus || 0,
    explosive: b.explosivePenalty || 0,
    defFactor: b.defensiveFactor || 1,
    defBV: b.defensiveBV || 0,
    // Offensive components
    weaponBV: b.weaponBV || 0,
    rawWeaponBV: b.rawWeaponBV || 0,
    halvedBV: b.halvedWeaponBV || 0,
    ammoBV: b.ammoBV || 0,
    weightBonus: b.weightBonus || 0,
    physBV: b.physicalWeaponBV || 0,
    offEquip: b.offEquipBV || 0,
    speedFactor: b.speedFactor || 1,
    offBV: b.offensiveBV || 0,
    heatEff: b.heatEfficiency || 0,
    heatDiss: b.heatDissipation || 0,
    moveHeat: b.moveHeat || 0,
    cockpitMod: b.cockpitModifier || 1,
    cockpitType: b.cockpitType || 'standard',
  });
}

console.log(`Total units with breakdowns: ${features.length}`);

// --- Correlation analysis ---
// For each numeric feature, compute Pearson correlation with the gap
const numericKeys = ['armorBV', 'structBV', 'gyroBV', 'defEquip', 'explosive', 'defFactor',
  'defBV', 'weaponBV', 'rawWeaponBV', 'halvedBV', 'ammoBV', 'weightBonus',
  'physBV', 'speedFactor', 'offBV', 'heatEff', 'heatDiss', 'moveHeat', 'cockpitMod',
  'amsAmmo', 'armoredComp', 'harjel'];

function pearson(xs, ys) {
  const n = xs.length;
  const mx = xs.reduce((s, x) => s + x, 0) / n;
  const my = ys.reduce((s, y) => s + y, 0) / n;
  let num = 0, dx2 = 0, dy2 = 0;
  for (let i = 0; i < n; i++) {
    const dx = xs[i] - mx;
    const dy = ys[i] - my;
    num += dx * dy;
    dx2 += dx * dx;
    dy2 += dy * dy;
  }
  if (dx2 === 0 || dy2 === 0) return 0;
  return num / Math.sqrt(dx2 * dy2);
}

const gaps = features.map(f => f.gap);

console.log('\n=== Correlation of each component with BV gap (all units) ===');
console.log('(Positive = feature increases when gap increases, i.e., overcalc when feature is high)');
const corrs = [];
for (const key of numericKeys) {
  const vals = features.map(f => f[key]);
  const r = pearson(vals, gaps);
  corrs.push({ key, r });
}
corrs.sort((a, b) => Math.abs(b.r) - Math.abs(a.r));
for (const c of corrs) {
  const bar = '█'.repeat(Math.round(Math.abs(c.r) * 50));
  const sign = c.r > 0 ? '+' : '-';
  console.log(`  ${c.key.padEnd(20)} r=${c.r.toFixed(4).padStart(8)} ${sign}${bar}`);
}

// --- Focus on outliers only (outside 1%) ---
const outliers = features.filter(f => f.status !== 'exact' && f.status !== 'within1');
const outGaps = outliers.map(f => f.gap);
console.log(`\n=== Correlation with BV gap (${outliers.length} outlier units only) ===`);
const outcorrs = [];
for (const key of numericKeys) {
  const vals = outliers.map(f => f[key]);
  const r = pearson(vals, outGaps);
  outcorrs.push({ key, r });
}
outcorrs.sort((a, b) => Math.abs(b.r) - Math.abs(a.r));
for (const c of outcorrs) {
  const bar = '█'.repeat(Math.round(Math.abs(c.r) * 50));
  const sign = c.r > 0 ? '+' : '-';
  console.log(`  ${c.key.padEnd(20)} r=${c.r.toFixed(4).padStart(8)} ${sign}${bar}`);
}

// --- Ratio analysis: gap / component for outliers ---
console.log('\n=== Gap as % of each component (median across outliers) ===');
for (const key of ['defBV', 'offBV', 'weaponBV', 'rawWeaponBV', 'ammoBV', 'weightBonus', 'structBV', 'armorBV', 'gyroBV']) {
  const ratios = outliers.filter(f => f[key] > 10).map(f => f.gap / f[key] * 100);
  ratios.sort((a, b) => a - b);
  const median = ratios[Math.floor(ratios.length / 2)];
  const mean = ratios.reduce((s, v) => s + v, 0) / ratios.length;
  const std = Math.sqrt(ratios.reduce((s, v) => s + (v - mean) ** 2, 0) / ratios.length);
  console.log(`  gap/${key.padEnd(15)} median=${median?.toFixed(3)}%  mean=${mean?.toFixed(3)}%  std=${std?.toFixed(3)}%  n=${ratios.length}`);
}

// --- Multivariate: simple OLS regression of gap on [defBV, offBV] ---
// gap = a * defBV + b * offBV + c
console.log('\n=== OLS Regression: gap = a*defBV + b*offBV + c ===');
// Using normal equations: (X'X)^-1 X'y
const X = outliers.map(f => [f.defBV, f.offBV, 1]);
const y = outGaps;
// X'X
const n = X.length;
const k = 3;
const XtX = Array.from({length: k}, () => Array(k).fill(0));
const Xty = Array(k).fill(0);
for (let i = 0; i < n; i++) {
  for (let j = 0; j < k; j++) {
    for (let l = 0; l < k; l++) {
      XtX[j][l] += X[i][j] * X[i][l];
    }
    Xty[j] += X[i][j] * y[i];
  }
}
// Solve 3x3 system using Cramer's rule
function det3(m) {
  return m[0][0]*(m[1][1]*m[2][2]-m[1][2]*m[2][1])
       - m[0][1]*(m[1][0]*m[2][2]-m[1][2]*m[2][0])
       + m[0][2]*(m[1][0]*m[2][1]-m[1][1]*m[2][0]);
}
function replace(m, col, v) {
  return m.map((row, i) => row.map((val, j) => j === col ? v[i] : val));
}
const D = det3(XtX);
const a = det3(replace(XtX, 0, Xty)) / D;
const b = det3(replace(XtX, 1, Xty)) / D;
const c = det3(replace(XtX, 2, Xty)) / D;
console.log(`  a (defBV coeff) = ${a.toFixed(6)}`);
console.log(`  b (offBV coeff) = ${b.toFixed(6)}`);
console.log(`  c (intercept)   = ${c.toFixed(6)}`);
// R-squared
const yMean = y.reduce((s, v) => s + v, 0) / n;
let ssTot = 0, ssRes = 0;
for (let i = 0; i < n; i++) {
  const pred = a * X[i][0] + b * X[i][1] + c;
  ssRes += (y[i] - pred) ** 2;
  ssTot += (y[i] - yMean) ** 2;
}
console.log(`  R² = ${(1 - ssRes / ssTot).toFixed(4)}`);
console.log(`  Interpretation: gap ≈ ${(a*100).toFixed(2)}% of defBV + ${(b*100).toFixed(2)}% of offBV + ${c.toFixed(1)}`);

// --- Subgroup analysis: under vs over ---
const under = outliers.filter(f => f.gap < 0);
const over = outliers.filter(f => f.gap > 0);

console.log(`\n=== Subgroup: Undercalculated (${under.length} units) ===`);
for (const key of ['defBV', 'offBV', 'weaponBV', 'rawWeaponBV', 'ammoBV', 'speedFactor', 'defFactor']) {
  const vals = under.map(f => f[key]);
  const r = pearson(vals, under.map(f => f.gap));
  console.log(`  gap~${key.padEnd(15)} r=${r.toFixed(4)}`);
}

console.log(`\n=== Subgroup: Overcalculated (${over.length} units) ===`);
for (const key of ['defBV', 'offBV', 'weaponBV', 'rawWeaponBV', 'ammoBV', 'speedFactor', 'defFactor']) {
  const vals = over.map(f => f[key]);
  const r = pearson(vals, over.map(f => f.gap));
  console.log(`  gap~${key.padEnd(15)} r=${r.toFixed(4)}`);
}
