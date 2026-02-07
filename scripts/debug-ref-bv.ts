import * as fs from 'fs';
import * as path from 'path';

// Load validation report
const report = JSON.parse(fs.readFileSync('validation-output/bv-validation-report.json', 'utf-8'));

// Load MUL BV cache
const cache = JSON.parse(fs.readFileSync('scripts/data-migration/mul-bv-cache.json', 'utf-8'));

// Load index
const index = JSON.parse(fs.readFileSync('public/data/units/battlemechs/index.json', 'utf-8'));
const indexById = new Map<string, any>();
for (const u of index.units) indexById.set(u.id, u);

// Get units undercalculated by 1-5%
const undercalc = (report.allResults as any[]).filter(
  (r: any) => r.percentDiff !== null && r.percentDiff < -0.5 && r.percentDiff > -5
);

let hasMUL = 0;
let noMUL = 0;
let mulBVDiffers = 0;

for (const r of undercalc) {
  const entry = cache.entries?.[r.unitId];
  const mulBV = (entry && entry.mulBV > 0 && entry.matchType === 'exact') ? entry.mulBV : 0;
  const ixEntry = indexById.get(r.unitId);
  const indexBV = ixEntry?.bv || 0;

  if (mulBV > 0) {
    hasMUL++;
    if (mulBV !== r.indexBV) mulBVDiffers++;
  } else {
    noMUL++;
  }
}

console.log(`Undercalculated units (0.5-5%): ${undercalc.length}`);
console.log(`  With MUL BV reference: ${hasMUL}`);
console.log(`  Without MUL BV (using index): ${noMUL}`);
console.log(`  MUL BV differs from indexBV: ${mulBVDiffers}`);

// Check a few sample units with MUL BV
console.log('\n--- Sample units WITH MUL BV that are undercalculated ---');
let count = 0;
for (const r of undercalc) {
  if (count >= 10) break;
  const entry = cache.entries?.[r.unitId];
  const mulBV = (entry && entry.mulBV > 0 && entry.matchType === 'exact') ? entry.mulBV : 0;
  if (mulBV > 0) {
    console.log(`${r.chassis} ${r.model}: ref=${r.indexBV}, calc=${r.calculatedBV}, pct=${r.percentDiff?.toFixed(1)}%, mulBV=${mulBV}`);
    count++;
  }
}

console.log('\n--- Sample units WITHOUT MUL BV that are undercalculated ---');
count = 0;
for (const r of undercalc) {
  if (count >= 10) break;
  const entry = cache.entries?.[r.unitId];
  const mulBV = (entry && entry.mulBV > 0 && entry.matchType === 'exact') ? entry.mulBV : 0;
  if (mulBV === 0) {
    const ixEntry = indexById.get(r.unitId);
    console.log(`${r.chassis} ${r.model}: ref=${r.indexBV}, calc=${r.calculatedBV}, pct=${r.percentDiff?.toFixed(1)}%, indexBV=${ixEntry?.bv}`);
    count++;
  }
}
