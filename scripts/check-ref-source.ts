/**
 * Check whether overcalculated/undercalculated units use MUL BV or index BV.
 * If they don't have MUL BV, the reference might be wrong.
 */
import * as fs from 'fs';
import * as path from 'path';

const report = JSON.parse(fs.readFileSync('validation-output/bv-validation-report.json', 'utf8'));
const idx = JSON.parse(fs.readFileSync('public/data/units/battlemechs/index.json', 'utf8'));

// Load MUL cache
let mulBVMap = new Map<string, number>();
let mulMatchTypes = new Map<string, string>();
const cachePath = 'scripts/data-migration/mul-bv-cache.json';
if (fs.existsSync(cachePath)) {
  const cache = JSON.parse(fs.readFileSync(cachePath, 'utf8'));
  for (const u of idx.units) {
    const entry = cache.entries?.[u.id];
    if (entry) {
      mulMatchTypes.set(u.id, entry.matchType || 'unknown');
      if (entry.mulBV > 0 && (entry.matchType === 'exact' || entry.matchType === 'fuzzy')) {
        mulBVMap.set(u.id, entry.mulBV);
      }
    }
  }
}

const valid = report.allResults.filter((x: any) => x.status !== 'error' && x.percentDiff !== null);

// Categorize
const exact = valid.filter((x: any) => x.status === 'exact');
const within1 = valid.filter((x: any) => Math.abs(x.percentDiff) <= 1 && x.status !== 'exact');
const over5 = valid.filter((x: any) => x.percentDiff > 5);
const over2to5 = valid.filter((x: any) => x.percentDiff > 2 && x.percentDiff <= 5);
const over1to2 = valid.filter((x: any) => x.percentDiff > 1 && x.percentDiff <= 2);
const under5 = valid.filter((x: any) => x.percentDiff < -5);
const under2to5 = valid.filter((x: any) => x.percentDiff < -2 && x.percentDiff >= -5);
const under1to2 = valid.filter((x: any) => x.percentDiff < -1 && x.percentDiff >= -2);

function refSource(units: any[]): { mul: number; idx: number; mulPct: string } {
  let mul = 0, idxOnly = 0;
  for (const u of units) {
    if (mulBVMap.has(u.unitId)) mul++;
    else idxOnly++;
  }
  return { mul, idx: idxOnly, mulPct: (mul / units.length * 100).toFixed(0) + '%' };
}

console.log('=== REFERENCE BV SOURCE BY CATEGORY ===\n');
console.log(`Exact match (${exact.length}): ${JSON.stringify(refSource(exact))}`);
console.log(`Within 1% (${within1.length}): ${JSON.stringify(refSource(within1))}`);
console.log(`Over 1-2% (${over1to2.length}): ${JSON.stringify(refSource(over1to2))}`);
console.log(`Over 2-5% (${over2to5.length}): ${JSON.stringify(refSource(over2to5))}`);
console.log(`Over 5%+ (${over5.length}): ${JSON.stringify(refSource(over5))}`);
console.log(`Under 1-2% (${under1to2.length}): ${JSON.stringify(refSource(under1to2))}`);
console.log(`Under 2-5% (${under2to5.length}): ${JSON.stringify(refSource(under2to5))}`);
console.log(`Under 5%+ (${under5.length}): ${JSON.stringify(refSource(under5))}`);

// For the overcalculated 5%+, show which have MUL vs index-only
console.log('\n=== OVERCALCULATED 5%+ DETAIL ===');
for (const u of over5.sort((a: any, b: any) => b.percentDiff - a.percentDiff)) {
  const hasMUL = mulBVMap.has(u.unitId);
  const mulBV = mulBVMap.get(u.unitId);
  const iu = idx.units.find((e: any) => e.id === u.unitId);
  const indexBV = iu?.bv || 0;
  console.log(`  ${u.unitId.padEnd(42)} ref=${u.indexBV} calc=${u.calculatedBV} +${u.percentDiff.toFixed(1)}% ` +
    `source=${hasMUL ? 'MUL(' + mulBV + ')' : 'INDEX(' + indexBV + ')'}`);
}

// For the undercalculated 5%+, show which have MUL vs index-only
console.log('\n=== UNDERCALCULATED 5%+ DETAIL ===');
for (const u of under5.sort((a: any, b: any) => a.percentDiff - b.percentDiff).slice(0, 30)) {
  const hasMUL = mulBVMap.has(u.unitId);
  const mulBV = mulBVMap.get(u.unitId);
  const iu = idx.units.find((e: any) => e.id === u.unitId);
  const indexBV = iu?.bv || 0;
  console.log(`  ${u.unitId.padEnd(42)} ref=${u.indexBV} calc=${u.calculatedBV} ${u.percentDiff.toFixed(1)}% ` +
    `source=${hasMUL ? 'MUL(' + mulBV + ')' : 'INDEX(' + indexBV + ')'}`);
}

// For units with MUL BV that don't match index BV
console.log('\n=== MUL vs INDEX BV DISAGREEMENT (in overcalculated) ===');
for (const u of [...over5, ...over2to5]) {
  const mulBV = mulBVMap.get(u.unitId);
  const iu = idx.units.find((e: any) => e.id === u.unitId);
  if (mulBV && iu && mulBV !== iu.bv) {
    console.log(`  ${u.unitId.padEnd(42)} indexBV=${iu.bv} mulBV=${mulBV} refUsed=${u.indexBV} calc=${u.calculatedBV}`);
  }
}
