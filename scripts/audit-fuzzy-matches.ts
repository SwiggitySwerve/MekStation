import * as fs from 'fs';
import * as path from 'path';

const cache = JSON.parse(fs.readFileSync('scripts/data-migration/mul-bv-cache.json', 'utf8'));
const index = JSON.parse(fs.readFileSync('public/data/units/battlemechs/index.json', 'utf8'));
const report = JSON.parse(fs.readFileSync('validation-output/bv-validation-report.json', 'utf8'));

let wrongFuzzy = 0;
let correctFuzzy = 0;
let wrongFuzzyOver1pct = 0;

const wrongFuzzyList: Array<{ id: string; chassis: string; model: string; mulName: string; mulBV: number; calcBV: number | null; pctDiff: number | null }> = [];

for (const u of index.units) {
  const entry = cache.entries?.[u.id];
  if (!entry || entry.matchType !== 'fuzzy' || !entry.mulBV || entry.mulBV === 0) continue;

  const mulNameNorm = (entry.mulName || '').toLowerCase().trim();
  const modelNorm = (u.model || '').toLowerCase().trim();
  const chassisNorm = (u.chassis || '').toLowerCase().trim();

  // Check if the fuzzy match is a correct match:
  // Strip parenthetical content from MUL name, then compare with our chassis+model
  const mulStripped = mulNameNorm.replace(/\s*\([^)]*\)\s*/g, ' ').replace(/\s+/g, ' ').trim();
  const expected = (chassisNorm + ' ' + modelNorm).trim();

  // Also check: does MUL name start with our chassis AND there's nothing extra between chassis and model?
  const afterChassis = mulStripped.startsWith(chassisNorm)
    ? mulStripped.slice(chassisNorm.length).trim()
    : null;
  const isGoodMatch = mulStripped === expected || afterChassis === modelNorm;

  if (!isGoodMatch) {
    wrongFuzzy++;
    const res = report.allResults?.find((r: any) => r.unitId === u.id);
    wrongFuzzyList.push({
      id: u.id,
      chassis: u.chassis,
      model: u.model,
      mulName: entry.mulName,
      mulBV: entry.mulBV,
      calcBV: res?.calculatedBV || null,
      pctDiff: res?.percentDiff || null,
    });
    if (res && Math.abs(res.percentDiff) > 1) wrongFuzzyOver1pct++;
  } else {
    correctFuzzy++;
  }
}

console.log(`Fuzzy match audit:`);
console.log(`  Total fuzzy matches used: ${wrongFuzzy + correctFuzzy}`);
console.log(`  Correct fuzzy matches: ${correctFuzzy}`);
console.log(`  WRONG fuzzy matches: ${wrongFuzzy}`);
console.log(`  Wrong fuzzy with >1% diff: ${wrongFuzzyOver1pct}`);
console.log();

// Sort by absolute pctDiff
wrongFuzzyList.sort((a, b) => Math.abs(b.pctDiff || 0) - Math.abs(a.pctDiff || 0));

console.log(`\nWrong fuzzy matches (sorted by impact):`);
for (const item of wrongFuzzyList.slice(0, 40)) {
  const diffStr = item.pctDiff !== null ? `${item.pctDiff > 0 ? '+' : ''}${item.pctDiff.toFixed(1)}%` : 'N/A';
  console.log(`  ${item.id}: "${item.chassis} ${item.model}" → MUL "${item.mulName}" (BV=${item.mulBV}) calc=${item.calcBV} ${diffStr}`);
}
if (wrongFuzzyList.length > 40) {
  console.log(`  ... and ${wrongFuzzyList.length - 40} more`);
}
