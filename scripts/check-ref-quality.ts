/**
 * Check reference BV quality for outlier units.
 * If many outliers use non-MUL reference BVs, the accuracy metric is unreliable.
 */
import * as fs from 'fs';
import * as path from 'path';

const report = JSON.parse(fs.readFileSync('validation-output/bv-validation-report.json', 'utf8'));
const cachePath = path.resolve('scripts/data-migration/mul-bv-cache.json');
const cache = JSON.parse(fs.readFileSync(cachePath, 'utf-8'));

const valid = report.allResults.filter((x: any) => x.status !== 'error' && x.percentDiff !== null);

// Classify units by MUL match quality
let mulExact = 0, mulFuzzy = 0, mulNone = 0;
let mulExactOutlier = 0, mulFuzzyOutlier = 0, mulNoneOutlier = 0;

for (const u of valid) {
  const entry = cache.entries?.[u.unitId];
  const isOutlier = Math.abs(u.percentDiff) > 1;

  if (entry?.matchType === 'exact' && entry.mulBV > 0) {
    mulExact++;
    if (isOutlier) mulExactOutlier++;
  } else if (entry?.matchType === 'fuzzy' && entry.mulBV > 0) {
    mulFuzzy++;
    if (isOutlier) mulFuzzyOutlier++;
  } else {
    mulNone++;
    if (isOutlier) mulNoneOutlier++;
  }
}

console.log(`=== MUL MATCH QUALITY ===`);
console.log(`Exact MUL match: ${mulExact} (outliers: ${mulExactOutlier}, ${(mulExactOutlier/mulExact*100).toFixed(1)}%)`);
console.log(`Fuzzy MUL match: ${mulFuzzy} (outliers: ${mulFuzzyOutlier}, ${(mulFuzzyOutlier/mulFuzzy*100).toFixed(1)}%)`);
console.log(`No MUL match:    ${mulNone} (outliers: ${mulNoneOutlier}, ${mulNone > 0 ? (mulNoneOutlier/mulNone*100).toFixed(1) : 0}%)`);

// For the >5% outliers, check MUL match quality
console.log(`\n=== >5% OUTLIERS MUL QUALITY ===`);
const bigOutliers = valid.filter((x: any) => Math.abs(x.percentDiff) > 5);
let bigExact = 0, bigFuzzy = 0, bigNone = 0;
for (const u of bigOutliers) {
  const entry = cache.entries?.[u.unitId];
  if (entry?.matchType === 'exact' && entry.mulBV > 0) bigExact++;
  else if (entry?.matchType === 'fuzzy' && entry.mulBV > 0) bigFuzzy++;
  else bigNone++;
}
console.log(`Exact: ${bigExact}, Fuzzy: ${bigFuzzy}, None: ${bigNone}`);

// Show >5% outliers with their MUL match status
console.log(`\n--- >10% overcalculated ---`);
for (const u of valid.filter((x: any) => x.percentDiff > 10).sort((a: any, b: any) => b.percentDiff - a.percentDiff)) {
  const entry = cache.entries?.[u.unitId];
  const mulStatus = entry?.matchType === 'exact' ? `MUL=${entry.mulBV}` : entry?.matchType === 'fuzzy' ? `fuzzy=${entry.mulBV}` : 'NO_MUL';
  console.log(`  ${u.unitId.padEnd(45)} ref=${u.indexBV} calc=${u.calculatedBV} diff=${u.percentDiff.toFixed(1)}% ${mulStatus}`);
}

// Check: for units with exact MUL match, compare mulBV vs indexBV
console.log(`\n=== MUL vs INDEX BV DISCREPANCIES (exact matches) ===`);
let mulIndexDiffs = 0;
for (const u of valid) {
  const entry = cache.entries?.[u.unitId];
  if (entry?.matchType === 'exact' && entry.mulBV > 0) {
    // Check if indexBV in report differs from mulBV
    // report.indexBV should be the one used (either MUL or index)
    // We're mainly interested in checking the data quality
  }
}

// Check the specific named variants
console.log(`\n=== NAMED VARIANT MUL STATUS ===`);
const named = ['jenner-jr7-d-webster', 'hatamoto-chi-htm-27t-lowenbrau', 'jenner-jr7-k-grace',
               'scorpion-scp-1n-wendall-2', 'zeus-x-zeu-9wd-stacy', 'ostsol-otl-5m-maki'];
for (const id of named) {
  const entry = cache.entries?.[id];
  const r = valid.find((x: any) => x.unitId === id);
  console.log(`  ${id.padEnd(45)} MUL=${entry?.matchType || 'none'} mulBV=${entry?.mulBV || 'n/a'} mulName=${entry?.mulName || 'n/a'} ref=${r?.indexBV} calc=${r?.calculatedBV}`);
}
