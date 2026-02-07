#!/usr/bin/env npx tsx
import * as fs from 'fs';

const cache = JSON.parse(fs.readFileSync('scripts/data-migration/mul-bv-cache.json', 'utf-8'));

// Show a few entries to understand structure
const entries = Object.entries(cache.entries || {});
console.log(`Total MUL entries: ${entries.length}`);
for (const [k, v] of entries.slice(0, 3)) {
  console.log(k, JSON.stringify(v));
}
console.log('---');

// Show Dasher entries
for (const id of ['dasher-g', 'dasher-d', 'dasher-r', 'dasher-t', 'dasher-prime']) {
  console.log(id, JSON.stringify((cache.entries as any)?.[id]));
}
console.log('---');

// Count match types
const types: Record<string, number> = {};
for (const [, v] of entries) {
  const t = (v as any).matchType || 'unknown';
  types[t] = (types[t] || 0) + 1;
}
console.log('Match types:', JSON.stringify(types));

// Count how many fuzzy-matched entries have BV that matches exactly the index BV
const index = JSON.parse(fs.readFileSync('public/data/units/battlemechs/index.json', 'utf-8'));
let fuzzyExact = 0, fuzzyDiff = 0;
for (const u of index.units) {
  const e = (cache.entries as any)?.[u.id];
  if (e?.matchType === 'fuzzy') {
    if (e.mulBV === u.bv) fuzzyExact++;
    else fuzzyDiff++;
  }
}
console.log(`Fuzzy matches: ${fuzzyExact} same as index BV, ${fuzzyDiff} different from index BV`);
