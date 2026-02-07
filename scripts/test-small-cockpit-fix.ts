import * as fs from 'fs';
import * as path from 'path';

const report = JSON.parse(fs.readFileSync('validation-output/bv-validation-report.json', 'utf8'));
const unitsDir = path.resolve(__dirname, '../public/data/units/battlemechs');
const index = JSON.parse(fs.readFileSync(path.join(unitsDir, 'index.json'), 'utf8'));

// Find all units where applying 0.95 cockpit modifier would bring them within 1%
const candidates: Array<{ id: string; indexBV: number; calcBV: number; adjustedBV: number; origPct: number; newPct: number; headPattern: string }> = [];

for (const r of report.allResults) {
  if (r.difference <= 0) continue; // only overcalculated
  const ratio = r.calculatedBV / r.indexBV;
  // Would applying 0.95 help?
  const adjustedBV = Math.round(r.calculatedBV * 0.95);
  const newDiff = adjustedBV - r.indexBV;
  const newPct = (newDiff / r.indexBV) * 100;

  // Check if it brings within 1%
  if (Math.abs(newPct) < 1.0 && r.percentDiff > 3.0) {
    const entry = index.units.find((u: any) => u.id === r.unitId);
    let headPattern = '';
    if (entry?.path) {
      try {
        const u = JSON.parse(fs.readFileSync(path.join(unitsDir, entry.path), 'utf8'));
        const head = u.criticalSlots?.HEAD;
        if (Array.isArray(head)) {
          headPattern = head.map((s: any) => s || 'empty').join(' | ');
        }
      } catch {}
    }

    candidates.push({
      id: r.unitId,
      indexBV: r.indexBV,
      calcBV: r.calculatedBV,
      adjustedBV,
      origPct: r.percentDiff,
      newPct,
      headPattern,
    });
  }
}

console.log(`Units where 0.95x brings within 1% (from >3% overcalc): ${candidates.length}`);
console.log(`\nThese would move from overcalculation → exact/within1%`);

// Check HEAD patterns
const patterns: Record<string, number> = {};
for (const c of candidates) {
  // Count Life Support slots
  const lsCount = c.headPattern.split('|').filter(s => s.trim().includes('Life Support')).length;
  patterns[`LS=${lsCount}`] = (patterns[`LS=${lsCount}`] || 0) + 1;
}
console.log('\nLife Support count in HEAD:');
for (const [p, n] of Object.entries(patterns).sort((a, b) => b[1] - a[1])) {
  console.log(`  ${p}: ${n} units`);
}

// Show some examples
console.log('\nSample units:');
for (const c of candidates.slice(0, 20)) {
  const lsCount = c.headPattern.split('|').filter(s => s.trim().includes('Life Support')).length;
  console.log(`  ${c.id.padEnd(45)} idx=${c.indexBV} calc=${c.calcBV} adj=${c.adjustedBV} ${c.origPct.toFixed(2)}%→${c.newPct.toFixed(2)}% LS=${lsCount}`);
}

// Impact on accuracy: if we fix these, how many units would be within 1%?
const currentWithin1 = report.allResults.filter((r: any) => Math.abs(r.percentDiff) <= 1.0).length;
const newWithin1 = currentWithin1 + candidates.filter(c => Math.abs(c.newPct) <= 1.0).length;
console.log(`\nCurrent within 1%: ${currentWithin1} (${(currentWithin1 / report.allResults.length * 100).toFixed(1)}%)`);
console.log(`After fix within 1%: ${newWithin1} (${(newWithin1 / report.allResults.length * 100).toFixed(1)}%)`);

// But also check: would this cause any units to become worse?
// Some overcalculated units at <5.26% would be pushed negative
const wouldWorsen = report.allResults.filter((r: any) => {
  if (r.difference <= 0) return false;
  const adjustedBV = Math.round(r.calculatedBV * 0.95);
  const newDiff = adjustedBV - r.indexBV;
  const newPct = (newDiff / r.indexBV) * 100;
  return Math.abs(newPct) > Math.abs(r.percentDiff); // got worse
});
// This is wrong - we'd only apply 0.95 to units we detect as small cockpit, not all overcalculated units
