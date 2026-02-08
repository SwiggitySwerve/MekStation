import * as fs from 'fs';
import * as path from 'path';

const r = JSON.parse(fs.readFileSync('validation-output/bv-validation-report.json', 'utf8'));
const index = JSON.parse(fs.readFileSync('public/data/units/battlemechs/index.json', 'utf8'));

// Check if overcalculated units have named variants
const over = r.allResults.filter((x: any) => x.percentDiff > 1 && x.breakdown);
const under = r.allResults.filter((x: any) => x.percentDiff < -1 && x.breakdown);
const correct = r.allResults.filter((x: any) => Math.abs(x.percentDiff) <= 1);

function hasNamedPilot(model: string): boolean {
  return /\([A-Z][a-z]/.test(model) || /\([A-Z][a-z]/.test(model);
}

function countNamed(results: any[]): { named: number; total: number } {
  let named = 0;
  for (const res of results) {
    const entry = index.units.find((e: any) => e.id === res.unitId);
    if (entry && hasNamedPilot(entry.model)) named++;
  }
  return { named, total: results.length };
}

const overNamed = countNamed(over);
const underNamed = countNamed(under);
const correctNamed = countNamed(correct);

console.log('Named pilot variants distribution:');
console.log(`  Overcalculated (>1%): ${overNamed.named}/${overNamed.total} (${(overNamed.named/overNamed.total*100).toFixed(1)}%)`);
console.log(`  Undercalculated (<-1%): ${underNamed.named}/${underNamed.total} (${(underNamed.named/underNamed.total*100).toFixed(1)}%)`);
console.log(`  Correct (<=1%): ${correctNamed.named}/${correctNamed.total} (${(correctNamed.named/correctNamed.total*100).toFixed(1)}%)`);

// Show the named overcalculated units
console.log('\nNamed overcalculated units:');
for (const res of over) {
  const entry = index.units.find((e: any) => e.id === res.unitId);
  if (entry && hasNamedPilot(entry.model)) {
    console.log(`  ${entry.chassis} ${entry.model}: diff=+${res.difference} (${res.percentDiff.toFixed(1)}%)`);
  }
}

// Now let's check: for overcalculated units, is the BASE variant correct?
console.log('\n\n=== OVERCALCULATED: checking base variant accuracy ===');
for (const res of over.slice(0, 20)) {
  const entry = index.units.find((e: any) => e.id === res.unitId);
  if (!entry) continue;

  // Find base variant (same chassis, model without suffix)
  const chassis = entry.chassis;
  const model = entry.model;

  // Find all other variants of same chassis
  const sameChassisResults = r.allResults.filter((x: any) => {
    const e = index.units.find((u: any) => u.id === x.unitId);
    return e && e.chassis === chassis && x.unitId !== res.unitId && Math.abs(x.percentDiff) <= 1;
  });

  const correctCount = sameChassisResults.length;
  const allVariants = r.allResults.filter((x: any) => {
    const e = index.units.find((u: any) => u.id === x.unitId);
    return e && e.chassis === chassis;
  });

  console.log(`  ${chassis} ${model}: diff=+${res.difference} (${res.percentDiff.toFixed(1)}%) [${correctCount}/${allVariants.length} variants within 1%]`);
}
