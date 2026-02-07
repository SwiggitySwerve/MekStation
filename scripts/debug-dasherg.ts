#!/usr/bin/env npx tsx
import * as fs from 'fs';

// Load validation results
const results = JSON.parse(fs.readFileSync('validation-output/bv-all-results.json', 'utf-8'));

// Find Dasher entries in results
const dashers = results.filter((r: any) => r.name?.includes('Dasher'));
console.log(`Dasher units in results: ${dashers.length}`);
for (const d of dashers) {
  console.log(`  ${d.name} | ref=${d.ref} calc=${d.calc} diff=${d.diff} pct=${d.pct}% cause=${d.cause} sf=${d.sf}`);
}

// Also check: what's the top overcalculated?
const top20 = results.filter((r: any) => r.pct != null).sort((a: any, b: any) => Math.abs(b.pct) - Math.abs(a.pct)).slice(0, 30);
console.log(`\nTop 30 discrepancies (incl techBase context):`);
for (const d of top20) {
  console.log(`  ${d.name.padEnd(40)} ref=${String(d.ref).padStart(5)} calc=${String(d.calc).padStart(5)} ${d.pct >= 0 ? '+' : ''}${d.pct}% cause=${d.cause} sf=${d.sf} weapBV=${d.weapBV} offBV=${d.offBV} defBV=${d.defBV}`);
}
