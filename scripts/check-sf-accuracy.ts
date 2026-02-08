/**
 * Check speed factor accuracy by looking at overcalculated vs exact units
 * with the same speed factor.
 */
import * as fs from 'fs';

const report = JSON.parse(fs.readFileSync('validation-output/bv-validation-report.json', 'utf8'));
const valid = report.allResults.filter((x: any) => x.status !== 'error' && x.percentDiff !== null && x.breakdown);

// Group by speed factor
const sfBuckets = new Map<string, { exact: number; under: number; over: number; total: number; avgDiff: number }>();

for (const u of valid) {
  const sf = u.breakdown?.speedFactor?.toFixed(2) || '?';
  let bucket = sfBuckets.get(sf);
  if (!bucket) { bucket = { exact: 0, under: 0, over: 0, total: 0, avgDiff: 0 }; sfBuckets.set(sf, bucket); }
  bucket.total++;
  bucket.avgDiff += u.percentDiff;
  if (Math.abs(u.percentDiff) <= 1) bucket.exact++;
  else if (u.percentDiff < -1) bucket.under++;
  else bucket.over++;
}

console.log('=== SPEED FACTOR ACCURACY ===');
console.log(`${'SF'.padStart(6)} ${'Total'.padStart(6)} ${'In1%'.padStart(6)} ${'Under'.padStart(6)} ${'Over'.padStart(6)} ${'AvgDiff'.padStart(8)} ${'OverRate'.padStart(10)}`);
for (const [sf, b] of [...sfBuckets.entries()].sort((a, b) => parseFloat(a[0]) - parseFloat(b[0]))) {
  const overRate = b.total > 5 ? (b.over / b.total * 100).toFixed(0) + '%' : 'n/a';
  console.log(`${sf.padStart(6)} ${String(b.total).padStart(6)} ${String(b.exact).padStart(6)} ${String(b.under).padStart(6)} ${String(b.over).padStart(6)} ${(b.avgDiff / b.total).toFixed(2).padStart(8)} ${overRate.padStart(10)}`);
}

// Also check: defensive factor distribution
console.log('\n=== DEFENSIVE FACTOR ACCURACY ===');
const dfBuckets = new Map<string, { exact: number; under: number; over: number; total: number; avgDiff: number }>();
for (const u of valid) {
  const df = u.breakdown?.defensiveFactor?.toFixed(1) || '?';
  let bucket = dfBuckets.get(df);
  if (!bucket) { bucket = { exact: 0, under: 0, over: 0, total: 0, avgDiff: 0 }; dfBuckets.set(df, bucket); }
  bucket.total++;
  bucket.avgDiff += u.percentDiff;
  if (Math.abs(u.percentDiff) <= 1) bucket.exact++;
  else if (u.percentDiff < -1) bucket.under++;
  else bucket.over++;
}

console.log(`${'DF'.padStart(6)} ${'Total'.padStart(6)} ${'In1%'.padStart(6)} ${'Under'.padStart(6)} ${'Over'.padStart(6)} ${'AvgDiff'.padStart(8)} ${'OverRate'.padStart(10)}`);
for (const [df, b] of [...dfBuckets.entries()].sort((a, b) => parseFloat(a[0]) - parseFloat(b[0]))) {
  const overRate = b.total > 5 ? (b.over / b.total * 100).toFixed(0) + '%' : 'n/a';
  console.log(`${df.padStart(6)} ${String(b.total).padStart(6)} ${String(b.exact).padStart(6)} ${String(b.under).padStart(6)} ${String(b.over).padStart(6)} ${(b.avgDiff / b.total).toFixed(2).padStart(8)} ${overRate.padStart(10)}`);
}

// Check heat efficiency vs accuracy
console.log('\n=== HEAT EFFICIENCY VS ACCURACY ===');
const heBuckets: Record<string, { total: number; avgDiff: number; exact: number }> = {};
for (const u of valid) {
  const he = u.breakdown?.heatEfficiency || 0;
  const band = he < 10 ? '<10' : he < 15 ? '10-14' : he < 20 ? '15-19' : he < 25 ? '20-24' : he < 30 ? '25-29' : he < 40 ? '30-39' : '40+';
  if (!heBuckets[band]) heBuckets[band] = { total: 0, avgDiff: 0, exact: 0 };
  heBuckets[band].total++;
  heBuckets[band].avgDiff += u.percentDiff;
  if (Math.abs(u.percentDiff) <= 1) heBuckets[band].exact++;
}
for (const [band, b] of Object.entries(heBuckets).sort((a, b) => parseInt(a[0]) - parseInt(b[0]))) {
  console.log(`  HE ${band.padEnd(6)}: ${String(b.total).padStart(5)} units, avgDiff=${(b.avgDiff / b.total).toFixed(2).padStart(6)}%, in1%=${(b.exact / b.total * 100).toFixed(0)}%`);
}
