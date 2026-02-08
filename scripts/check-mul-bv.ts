#!/usr/bin/env npx tsx
import * as fs from 'fs';

const cache = JSON.parse(fs.readFileSync('scripts/data-migration/mul-bv-cache.json', 'utf-8'));
const index = JSON.parse(fs.readFileSync('public/data/units/battlemechs/index.json', 'utf-8'));

// Check specific mechs
const targets = [
  'Wolverine WVR-6R',
  'Hunchback HBK-4G',
  'Catapult CPLT-C1',
  'Atlas AS7-D',
  'Rifleman RFL-3N',
  'Marauder MAD-3R',
  'Warhammer WHM-6R',
];

for (const name of targets) {
  const iu = index.units.find((u: any) => `${u.chassis} ${u.model}` === name);
  if (!iu) { console.log(`${name}: not in index`); continue; }
  const mulEntry = cache.entries?.[iu.id];
  console.log(`${name}: indexBV=${iu.bv}, MUL_BV=${mulEntry?.mulBV ?? 'N/A'}, match=${mulEntry?.matchType ?? 'N/A'}`);
}

// Stats: how many units have MUL BV, and how different are they from index BV?
let exact = 0, within5 = 0, within10 = 0, over10 = 0, noMul = 0, mulDiffers = 0;
let mulTotal = 0;
for (const u of index.units) {
  const e = cache.entries?.[u.id];
  if (!e || !e.mulBV || e.mulBV === 0 || e.matchType === 'not-found' || e.matchType === 'error') {
    noMul++;
    continue;
  }
  mulTotal++;
  const diff = Math.abs(u.bv - e.mulBV);
  const pct = u.bv > 0 ? (diff / u.bv) * 100 : 0;
  if (diff === 0) exact++;
  else if (pct <= 5) within5++;
  else if (pct <= 10) within10++;
  else over10++;
  if (diff > 0) mulDiffers++;
}
console.log(`\n=== INDEX vs MUL BV COMPARISON ===`);
console.log(`Total units: ${index.units.length}`);
console.log(`No MUL match: ${noMul}`);
console.log(`Have MUL BV: ${mulTotal}`);
console.log(`  Exact match: ${exact}`);
console.log(`  Within 5%: ${within5}`);
console.log(`  Within 10%: ${within10}`);
console.log(`  Over 10%: ${over10}`);
console.log(`  MUL differs from index: ${mulDiffers}`);

// Show some where MUL differs most from index
console.log('\n=== BIGGEST INDEX/MUL DIFFS ===');
const diffs: Array<{ name: string; indexBV: number; mulBV: number; diff: number; pct: number }> = [];
for (const u of index.units) {
  const e = cache.entries?.[u.id];
  if (!e || !e.mulBV || e.mulBV === 0 || e.matchType !== 'exact') continue;
  const diff = u.bv - e.mulBV;
  const pct = u.bv > 0 ? (diff / u.bv) * 100 : 0;
  if (Math.abs(pct) > 5) {
    diffs.push({ name: `${u.chassis} ${u.model}`, indexBV: u.bv, mulBV: e.mulBV, diff, pct });
  }
}
diffs.sort((a, b) => Math.abs(b.pct) - Math.abs(a.pct));
for (const d of diffs.slice(0, 20)) {
  console.log(`  ${d.name.padEnd(42)} index=${String(d.indexBV).padStart(5)} mul=${String(d.mulBV).padStart(5)} diff=${(d.diff >= 0 ? '+' : '') + d.diff}`);
}
