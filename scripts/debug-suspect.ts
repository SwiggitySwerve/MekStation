#!/usr/bin/env npx tsx
import * as fs from 'fs';

const index = JSON.parse(fs.readFileSync('public/data/units/battlemechs/index.json', 'utf-8'));
const units = index.units;

// Replicate suspect BV logic
const byChassis = new Map<string, any[]>();
for (const u of units) {
  if (!byChassis.has(u.chassis)) byChassis.set(u.chassis, []);
  byChassis.get(u.chassis)!.push(u);
}

const suspectBVIds = new Set<string>();
for (const [chassis, variants] of Array.from(byChassis.entries())) {
  if (variants.length < 3) continue;
  const bvCounts = new Map<number, string[]>();
  for (const v of variants) {
    if (!bvCounts.has(v.bv)) bvCounts.set(v.bv, []);
    bvCounts.get(v.bv)!.push(v.id);
  }
  for (const [bv, ids] of Array.from(bvCounts.entries())) {
    if (ids.length >= 3) {
      console.log(`Suspect: ${chassis} BV=${bv} -> ${ids.length} variants: ${ids.join(', ')}`);
      for (const id of ids) suspectBVIds.add(id);
    }
  }
}

console.log(`\nTotal suspect IDs: ${suspectBVIds.size}`);

// Check Dasher specifically
const dashers = units.filter((u: any) => u.chassis === 'Dasher');
console.log(`\nDasher variants: ${dashers.length}`);
for (const d of dashers) {
  console.log(`  ${d.id}: BV=${d.bv}, suspect=${suspectBVIds.has(d.id)}`);
}

// Also check MUL exact matches
const mulCache = JSON.parse(fs.readFileSync('scripts/data-migration/mul-bv-cache.json', 'utf-8'));
const mulBVMap = new Map<string, number>();
for (const u of units) {
  const entry = mulCache.entries?.[u.id];
  if (entry && entry.mulBV > 0 && entry.matchType === 'exact') {
    mulBVMap.set(u.id, entry.mulBV);
  }
}

console.log(`\nMUL exact matches: ${mulBVMap.size}`);

// Check how many suspect units have MUL exact match
let suspectWithMul = 0;
for (const id of suspectBVIds) {
  if (mulBVMap.has(id)) suspectWithMul++;
}
console.log(`Suspect with MUL exact: ${suspectWithMul}`);
console.log(`Suspect without MUL exact (would be excluded): ${suspectBVIds.size - suspectWithMul}`);
