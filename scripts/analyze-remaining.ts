#!/usr/bin/env npx tsx
import * as fs from 'fs';

const report = JSON.parse(fs.readFileSync('validation-output/bv-validation-report.json', 'utf-8'));
const results = report.allResults;

// Check field names
const sample = results[0];
console.log('Fields:', Object.keys(sample).join(', '));

// Use correct field names
const getPctDiff = (r: any) => r.percentDiff ?? r.pctDiff ?? 0;
const getRef = (r: any) => r.indexBV ?? r.referenceBV ?? 0;
const getCalc = (r: any) => r.calculatedBV ?? r.calcBV ?? 0;
const getName = (r: any) => `${r.chassis} ${r.model}`;

// Classify results
const exact = results.filter((r: any) => r.status === 'exact');
const within1 = results.filter((r: any) => Math.abs(getPctDiff(r)) <= 1);
const within5 = results.filter((r: any) => Math.abs(getPctDiff(r)) <= 5);
const over5 = results.filter((r: any) => Math.abs(getPctDiff(r)) > 5);
const over10 = results.filter((r: any) => Math.abs(getPctDiff(r)) > 10);

console.log(`\nTotal: ${results.length}`);
console.log(`Exact: ${exact.length}, Within 1%: ${within1.length}, Within 5%: ${within5.length}`);
console.log(`Over 5%: ${over5.length}, Over 10%: ${over10.length}`);

// Analyze >1% but ≤5% discrepancies (the biggest group to fix for accuracy)
const between1and5 = results.filter((r: any) => {
  const abs = Math.abs(getPctDiff(r));
  return abs > 1 && abs <= 5;
});
console.log(`\n=== BETWEEN 1-5% (${between1and5.length} units — target for improvement) ===`);

// Direction bias
const b1to5Over = between1and5.filter((r: any) => getPctDiff(r) > 0);
const b1to5Under = between1and5.filter((r: any) => getPctDiff(r) < 0);
console.log(`  Overcalculated: ${b1to5Over.length} (avg +${(b1to5Over.reduce((s: number, r: any) => s + getPctDiff(r), 0) / b1to5Over.length).toFixed(2)}%)`);
console.log(`  Undercalculated: ${b1to5Under.length} (avg ${(b1to5Under.reduce((s: number, r: any) => s + getPctDiff(r), 0) / b1to5Under.length).toFixed(2)}%)`);

// Breakdown analysis for >5% discrepancies
console.log(`\n=== OVER 5% DISCREPANCIES (${over5.length} units) ===`);
const over5Sorted = over5.sort((a: any, b: any) => Math.abs(getPctDiff(b)) - Math.abs(getPctDiff(a)));
for (const r of over5Sorted.slice(0, 25)) {
  const bd = r.breakdown || {};
  const diff = getCalc(r) - getRef(r);
  const direction = diff > 0 ? 'OVER' : 'UNDER';
  console.log(`  ${getName(r).padEnd(35)} ref=${getRef(r)} calc=${getCalc(r)} ${direction} ${getPctDiff(r).toFixed(1)}%`);
  if (bd.weaponBV !== undefined) {
    console.log(`    defBV=${bd.defensiveBV?.toFixed(0)||'?'} offBV=${bd.offensiveBV?.toFixed(0)||'?'} weapBV=${bd.weaponBV?.toFixed(0)||'?'} ammoBV=${bd.ammoBV?.toFixed(0)||'?'} sf=${bd.speedFactor?.toFixed(3)||'?'}`);
  }
  if (r.issues?.length > 0) console.log(`    issues: ${r.issues.slice(0,3).join('; ')}`);
}

// Analyze techBase distribution for over 5%
const over5ByTech: Record<string, {count: number; over: number; under: number}> = {};
for (const r of over5) {
  const tb = r.techBase || sample.breakdown?.techBase || 'unknown';
  if (!over5ByTech[tb]) over5ByTech[tb] = {count: 0, over: 0, under: 0};
  over5ByTech[tb].count++;
  if (getPctDiff(r) > 0) over5ByTech[tb].over++;
  else over5ByTech[tb].under++;
}
console.log('\n  By techBase:', JSON.stringify(over5ByTech));

// Check for unresolved weapons
let unresolvedCount = 0;
const unresolvedWeapons: Record<string, number> = {};
for (const r of results) {
  if (r.issues) {
    for (const issue of r.issues) {
      if (issue.includes('nresolved') || issue.includes('BV=0')) {
        unresolvedCount++;
        unresolvedWeapons[issue] = (unresolvedWeapons[issue] || 0) + 1;
      }
    }
  }
}
console.log(`\n=== UNRESOLVED/BV=0 ISSUES (${unresolvedCount} total) ===`);
const sortedUnresolved = Object.entries(unresolvedWeapons).sort((a, b) => b[1] - a[1]);
for (const [issue, count] of sortedUnresolved.slice(0, 20)) {
  console.log(`  ${count}x ${issue}`);
}
