#!/usr/bin/env npx tsx
import * as fs from 'fs';

const report = JSON.parse(fs.readFileSync('validation-output/bv-validation-report.json', 'utf8'));

// Undercalculated minor discrepancy units
const minor = report.allResults.filter((r: any) => {
  const pct = Math.abs(r.percentDiff);
  return pct > 1 && pct <= 5 && r.difference < 0;
});
console.log('Undercalculated minor disc:', minor.length);
const avgGap = minor.reduce((s: number, r: any) => s + Math.abs(r.difference), 0) / minor.length;
console.log('Avg absolute gap:', avgGap.toFixed(1));

// Show first 20
for (const s of minor.slice(0, 20)) {
  console.log(
    s.unitId.substring(0, 35).padEnd(36) +
    ' idx=' + String(s.indexBV).padStart(5) +
    ' calc=' + String(s.calculatedBV).padStart(5) +
    ' diff=' + String(s.difference).padStart(5) +
    ' def=' + String(s.breakdown?.defensiveBV?.toFixed(0)).padStart(6) +
    ' off=' + String(s.breakdown?.offensiveBV?.toFixed(0)).padStart(6) +
    ' wBV=' + String(s.breakdown?.weaponBV?.toFixed(0)).padStart(5) +
    ' dEq=' + String(s.breakdown?.defensiveEquipBV?.toFixed(0)).padStart(4)
  );
}

// Overcalculated minor discrepancy
const overMinor = report.allResults.filter((r: any) => {
  const pct = Math.abs(r.percentDiff);
  return pct > 1 && pct <= 5 && r.difference > 0;
});
console.log('\nOvercalculated minor disc:', overMinor.length);
const avgOverGap = overMinor.reduce((s: number, r: any) => s + Math.abs(r.difference), 0) / overMinor.length;
console.log('Avg absolute gap:', avgOverGap.toFixed(1));

for (const s of overMinor.slice(0, 20)) {
  console.log(
    s.unitId.substring(0, 35).padEnd(36) +
    ' idx=' + String(s.indexBV).padStart(5) +
    ' calc=' + String(s.calculatedBV).padStart(5) +
    ' diff=' + String(s.difference).padStart(5) +
    ' def=' + String(s.breakdown?.defensiveBV?.toFixed(0)).padStart(6) +
    ' off=' + String(s.breakdown?.offensiveBV?.toFixed(0)).padStart(6) +
    ' wBV=' + String(s.breakdown?.weaponBV?.toFixed(0)).padStart(5) +
    ' dEq=' + String(s.breakdown?.defensiveEquipBV?.toFixed(0)).padStart(4)
  );
}
