#!/usr/bin/env npx tsx
import * as fs from 'fs';

const results: any[] = JSON.parse(fs.readFileSync('./validation-output/bv-all-results.json', 'utf-8'));

// Distribution analysis
const pcts = results.map(r => r.pct).sort((a, b) => a - b);
const buckets: Record<string, number> = {};
for (const p of pcts) {
  const bucket = `${Math.floor(p)}%`;
  buckets[bucket] = (buckets[bucket] || 0) + 1;
}

console.log('Distribution of errors (% bucket -> count):');
for (const [b, c] of Object.entries(buckets).sort((a, b) => parseInt(a[0]) - parseInt(b[0]))) {
  const bar = '#'.repeat(Math.min(c, 80));
  console.log(`  ${b.padStart(5)}: ${String(c).padStart(4)} ${bar}`);
}

// How many units are in -1% to -3% range?
const minus1to3 = pcts.filter(p => p >= -3 && p < -1).length;
const minus3to5 = pcts.filter(p => p >= -5 && p < -3).length;
const minus5to10 = pcts.filter(p => p >= -10 && p < -5).length;
const minus10plus = pcts.filter(p => p < -10).length;
const plus1to3 = pcts.filter(p => p > 1 && p <= 3).length;
const plus3to5 = pcts.filter(p => p > 3 && p <= 5).length;
const plus5to10 = pcts.filter(p => p > 5 && p <= 10).length;
const plus10 = pcts.filter(p => p > 10).length;
const within1 = pcts.filter(p => Math.abs(p) <= 1).length;

console.log(`\nError buckets:`);
console.log(`  Exact (0%): ${pcts.filter(p => p === 0).length}`);
console.log(`  Within 1%: ${within1}`);
console.log(`  -1% to -3%: ${minus1to3} (could move to within-1% with small fix)`);
console.log(`  -3% to -5%: ${minus3to5}`);
console.log(`  -5% to -10%: ${minus5to10}`);
console.log(`  <-10%: ${minus10plus}`);
console.log(`  +1% to +3%: ${plus1to3}`);
console.log(`  +3% to +5%: ${plus3to5}`);
console.log(`  +5% to +10%: ${plus5to10}`);
console.log(`  >+10%: ${plus10}`);

console.log(`\n  Total: ${pcts.length}`);
console.log(`  Would need to fix ${pcts.length - within1 - (pcts.filter(p => Math.abs(p) <= 1).length)} to reach 95% within-1%`);
const target95 = Math.ceil(pcts.length * 0.95);
console.log(`  Need ${target95} within 1% for 95% target (have ${within1}, need ${target95 - within1} more)`);
const target99 = Math.ceil(pcts.length * 0.99);
const within5 = pcts.filter(p => Math.abs(p) <= 5).length;
console.log(`  Need ${target99} within 5% for 99% target (have ${within5}, need ${target99 - within5} more)`);
