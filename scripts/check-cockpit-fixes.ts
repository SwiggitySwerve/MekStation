/**
 * Find overcalculated units that would be fixed by 0.95 cockpit modifier.
 * Analyze their HEAD crit layout to find a reliable detection pattern.
 */
import * as fs from 'fs';
import * as path from 'path';

const report = JSON.parse(fs.readFileSync('validation-output/bv-validation-report.json', 'utf8'));
const idx = JSON.parse(fs.readFileSync('public/data/units/battlemechs/index.json', 'utf8'));

function loadUnit(unitId: string): any {
  const ie = idx.units.find((e: any) => e.id === unitId);
  if (!ie?.path) return null;
  try { return JSON.parse(fs.readFileSync(path.join('public/data/units/battlemechs', ie.path), 'utf8')); } catch { return null; }
}

const valid = report.allResults.filter((x: any) => x.status !== 'error' && x.percentDiff !== null);
const outside1 = valid.filter((x: any) => Math.abs(x.percentDiff) > 1);

// Find overcalculated units fixed by 0.95 cockpit
console.log('=== OVERCALCULATED UNITS FIXED BY 0.95 COCKPIT ===\n');
const fixableUnits: any[] = [];
for (const u of outside1) {
  const b = u.breakdown;
  if (!b || b.cockpitModifier !== 1.0) continue;
  if (u.percentDiff < 1) continue;
  const recalcBV = Math.round((b.defensiveBV + b.offensiveBV) * 0.95);
  const recalcPct = ((recalcBV - u.indexBV) / u.indexBV) * 100;
  if (Math.abs(recalcPct) <= 1) {
    fixableUnits.push({ ...u, recalcBV, recalcPct });
  }
}

for (const u of fixableUnits) {
  const unit = loadUnit(u.unitId);
  if (!unit) continue;
  const headSlots = unit.criticalSlots?.HEAD;
  const lsCount = headSlots?.filter((s: string | null) => s && s.includes('Life Support')).length ?? 0;
  const sensorCount = headSlots?.filter((s: string | null) => s && s.includes('Sensors')).length ?? 0;
  const cockpitStr = headSlots?.filter((s: string | null) => s && s.toLowerCase().includes('cockpit')).length ?? 0;
  const slot4 = headSlots?.[3];

  console.log(`  ${u.unitId.padEnd(40)} diff=+${u.difference} (${u.percentDiff.toFixed(1)}%) cockpit=${unit.cockpit || 'STANDARD'}`);
  console.log(`    HEAD: [${headSlots?.join(', ')}]`);
  console.log(`    LS=${lsCount} Sensors=${sensorCount} CockpitSlots=${cockpitStr} slot4=${slot4}`);
  console.log(`    Would become: ${u.recalcBV} (${u.recalcPct.toFixed(1)}%)`);
  console.log('');
}

// Now check: what patterns distinguish these from standard cockpit units?
console.log('\n=== HEAD PATTERNS OF FIXABLE UNITS ===');
let allHaveLsCount1 = true;
let allHaveSlot4Sensors = true;
for (const u of fixableUnits) {
  const unit = loadUnit(u.unitId);
  if (!unit) continue;
  const headSlots = unit.criticalSlots?.HEAD;
  const lsCount = headSlots?.filter((s: string | null) => s && s.includes('Life Support')).length ?? 0;
  const slot4 = headSlots?.[3];
  if (lsCount !== 1) allHaveLsCount1 = false;
  if (!slot4 || typeof slot4 !== 'string' || !slot4.includes('Sensors')) allHaveSlot4Sensors = false;
}
console.log(`  All have lsCount=1: ${allHaveLsCount1}`);
console.log(`  All have slot4=Sensors: ${allHaveSlot4Sensors}`);

// Check what happens if we use lsCount=1 only (no slot4 check)
// Count how many new false positives this would create
console.log('\n=== IMPACT OF lsCount=1 ONLY HEURISTIC ===');
let newSmallCockpit = 0;
let wouldFixMore = 0;
let wouldBreak = 0;
for (const u of valid) {
  const unit = loadUnit(u.unitId);
  if (!unit) continue;
  const headSlots = unit.criticalSlots?.HEAD;
  const lsCount = headSlots?.filter((s: string | null) => s && s.includes('Life Support')).length ?? 0;
  const b = u.breakdown;
  if (!b) continue;

  // Currently detected as small?
  const currentlySmall = b.cockpitModifier < 1;
  // Would be detected as small with lsCount=1?
  const wouldBeSmall = lsCount === 1 && (unit.cockpit || 'STANDARD').toUpperCase() === 'STANDARD';

  if (wouldBeSmall && !currentlySmall) {
    // New detection
    newSmallCockpit++;
    const recalcBV = Math.round((b.defensiveBV + b.offensiveBV) * 0.95);
    const recalcPct = ((recalcBV - u.indexBV) / u.indexBV) * 100;
    const currentPct = u.percentDiff;

    // Would this improve or worsen the result?
    if (Math.abs(recalcPct) <= 1 && Math.abs(currentPct) > 1) wouldFixMore++;
    else if (Math.abs(recalcPct) > 1 && Math.abs(currentPct) <= 1) wouldBreak++;
  }
}
console.log(`  New units detected as small cockpit: ${newSmallCockpit}`);
console.log(`  Would fix (move to within 1%): ${wouldFixMore}`);
console.log(`  Would break (move out of within 1%): ${wouldBreak}`);
console.log(`  Net improvement: ${wouldFixMore - wouldBreak}`);

// Also check: what if we REMOVE the small cockpit heuristic entirely and only use unit.cockpit field?
console.log('\n=== IMPACT OF REMOVING HEURISTIC (unit.cockpit only) ===');
let noHeuristicFix = 0;
let noHeuristicBreak = 0;
for (const u of valid) {
  const unit = loadUnit(u.unitId);
  if (!unit) continue;
  const b = u.breakdown;
  if (!b) continue;

  const currentlySmall = b.cockpitModifier < 1;
  const unitCockpit = (unit.cockpit || 'STANDARD').toUpperCase();
  const wouldBeSmall = unitCockpit.includes('SMALL') || unitCockpit.includes('TORSO') || unitCockpit.includes('DRONE') || unitCockpit.includes('INTERFACE');

  if (currentlySmall && !wouldBeSmall) {
    // Removing heuristic: would set this to 1.0 instead of 0.95
    const recalcBV = Math.round((b.defensiveBV + b.offensiveBV) * 1.0);
    const recalcPct = ((recalcBV - u.indexBV) / u.indexBV) * 100;
    if (Math.abs(recalcPct) <= 1 && Math.abs(u.percentDiff) > 1) noHeuristicFix++;
    if (Math.abs(recalcPct) > 1 && Math.abs(u.percentDiff) <= 1) noHeuristicBreak++;
  }
}
console.log(`  Would fix: ${noHeuristicFix}`);
console.log(`  Would break: ${noHeuristicBreak}`);
console.log(`  Net: ${noHeuristicFix - noHeuristicBreak}`);
