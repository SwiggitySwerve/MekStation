#!/usr/bin/env npx tsx
import * as fs from 'fs';

const results = JSON.parse(fs.readFileSync('validation-output/bv-all-results.json', 'utf-8'));
const mulCache = JSON.parse(fs.readFileSync('scripts/data-migration/mul-bv-cache.json', 'utf-8'));
const index = JSON.parse(fs.readFileSync('public/data/units/battlemechs/index.json', 'utf-8'));

// Map unit ID -> index BV
const indexBVMap = new Map<string, number>();
for (const u of index.units) indexBVMap.set(u.id, u.bv);

// All possible-missing-penalty units
const pmp = results.filter((r: any) => r.cause === 'possible-missing-penalty');
console.log(`Total possible-missing-penalty: ${pmp.length}`);

// Categorize by MUL match quality
let exactMatch = 0, fuzzyMatch = 0, notFound = 0;
let fuzzyZeroBV = 0, fuzzyWrongName = 0;
let exactMatchWithDiffBV = 0;

for (const r of pmp) {
  const mulEntry = mulCache.entries?.[r.id];
  if (!mulEntry || mulEntry.matchType === 'not-found') {
    notFound++;
  } else if (mulEntry.matchType === 'fuzzy') {
    fuzzyMatch++;
    if (mulEntry.mulBV === 0) fuzzyZeroBV++;
    // Check if fuzzy name doesn't match our name
    const ourName = `${r.name}`;
    if (mulEntry.mulName && !mulEntry.mulName.toLowerCase().includes(r.name.split(' ').pop()?.toLowerCase() || '')) {
      fuzzyWrongName++;
    }
  } else if (mulEntry.matchType === 'exact') {
    exactMatch++;
    if (mulEntry.mulBV !== r.ref) exactMatchWithDiffBV++;
  }
}

console.log(`\nMUL match quality for possible-missing-penalty units:`);
console.log(`  Exact match: ${exactMatch} (diff BV from ref: ${exactMatchWithDiffBV})`);
console.log(`  Fuzzy match: ${fuzzyMatch} (zero BV: ${fuzzyZeroBV})`);
console.log(`  Not found: ${notFound}`);
console.log(`  Total unreliable ref BV (fuzzy+not-found): ${fuzzyMatch + notFound}`);
console.log(`  % unreliable: ${((fuzzyMatch + notFound) / pmp.length * 100).toFixed(1)}%`);

// Show examples of exact-match possible-missing-penalty
console.log(`\n=== EXACT MATCH possible-missing-penalty (genuine overcalculations) ===`);
const exactPMP = pmp.filter((r: any) => {
  const mulEntry = mulCache.entries?.[r.id];
  return mulEntry?.matchType === 'exact' && mulEntry.mulBV > 0;
}).sort((a: any, b: any) => Math.abs(b.pct) - Math.abs(a.pct)).slice(0, 15);

for (const r of exactPMP) {
  const mulEntry = mulCache.entries?.[r.id];
  console.log(`  ${r.name.padEnd(40)} ref=${r.ref} calc=${r.calc} ${r.pct >= 0 ? '+' : ''}${r.pct}% mulBV=${mulEntry.mulBV} mulName=${mulEntry.mulName}`);
}

// Also count all categories with exact MUL matches
console.log(`\n=== EXACT MUL MATCH breakdown by cause ===`);
const causeCounts: Record<string, { total: number; exactMul: number; fuzzy: number; notFound: number }> = {};
for (const r of results) {
  const cause = r.cause || 'none';
  if (!causeCounts[cause]) causeCounts[cause] = { total: 0, exactMul: 0, fuzzy: 0, notFound: 0 };
  causeCounts[cause].total++;
  const mulEntry = mulCache.entries?.[r.id];
  if (mulEntry?.matchType === 'exact' && mulEntry.mulBV > 0) causeCounts[cause].exactMul++;
  else if (mulEntry?.matchType === 'fuzzy') causeCounts[cause].fuzzy++;
  else causeCounts[cause].notFound++;
}
for (const [cause, counts] of Object.entries(causeCounts).sort((a, b) => b[1].total - a[1].total)) {
  console.log(`  ${cause.padEnd(30)} total=${String(counts.total).padStart(5)} exactMul=${String(counts.exactMul).padStart(5)} fuzzy=${String(counts.fuzzy).padStart(5)} notFound=${String(counts.notFound).padStart(5)}`);
}
