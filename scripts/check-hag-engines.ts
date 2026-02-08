/**
 * Check engine types and structure BV for HAG undercalculated units.
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

const valid = report.allResults.filter((x: any) => x.status !== 'error' && x.percentDiff !== null && x.breakdown);
// HAG outliers
const hagIds = ['amarok-3', 'boreas-a', 'boreas-b', 'boreas-d', 'thunder-stallion-3', 'marauder-iic-4', 'rifleman-iic-6', 'osteon-e', 'battlemaster-c', 'jupiter-3', 'notos-a', 'rifleman-rfl-x3-muse-wind'];

for (const unitId of hagIds) {
  const unit = loadUnit(unitId);
  const r = valid.find((x: any) => x.unitId === unitId);
  if (!unit || !r) { console.log(`${unitId}: not found`); continue; }
  const b = r.breakdown;
  const engineType = unit.engine?.type || 'STANDARD';
  const structType = unit.structure?.type || 'STANDARD';

  // Compute expected structBV
  const STRUCTURE_POINTS: Record<number, number> = {};
  // Just show the values we have
  console.log(`${unitId.padEnd(35)} ${unit.tonnage}t engine=${engineType.padEnd(10)} struct=${structType.padEnd(15)} structBV=${b?.structureBV?.toFixed(0)} diff=${r.percentDiff.toFixed(1)}% def=${b?.defensiveBV?.toFixed(0)} off=${b?.offensiveBV?.toFixed(0)}`);
}

// Check: for ALL undercalculated outliers, what are their engine types?
console.log('\n=== ENGINE TYPE IN UNDERCALCULATED OUTLIERS ===');
const underOutliers = valid.filter((x: any) => x.percentDiff < -1);
const engineCounts: Record<string, number> = {};
for (const r of underOutliers) {
  const unit = loadUnit(r.unitId);
  if (!unit) continue;
  const et = unit.engine?.type || 'STANDARD';
  engineCounts[et] = (engineCounts[et] || 0) + 1;
}
for (const [et, count] of Object.entries(engineCounts).sort((a, b) => b[1] - a[1])) {
  console.log(`  ${et}: ${count}`);
}

// Check: for C3 slave undercalculated units, what are their details?
console.log('\n=== C3 SLAVE UNDERCALCULATED DETAILS ===');
const c3Ids = ['barghest-bgs-4t', 'revenant-ubm-2r4', 'celerity-clr-03-o', 'raven-rvn-4lc', 'tessen-tsn-c3', 'tessen-tsn-1cr', 'whitworth-wth-3', 'thanatos-tns-6s', 'night-stalker-nsr-kc'];
for (const unitId of c3Ids) {
  const unit = loadUnit(unitId);
  const r = valid.find((x: any) => x.unitId === unitId);
  if (!unit || !r) continue;
  const b = r.breakdown;
  // Check for C3 equipment
  const equip = (unit.equipment || []).filter((e: any) => e.id.toLowerCase().includes('c3'));
  console.log(`  ${unitId.padEnd(35)} ${r.percentDiff.toFixed(1).padStart(5)}% ${unit.tonnage}t ${unit.techBase} equip=${equip.map((e: any) => e.id).join(',')}`);
  // Check if C3 slave adds to any BV component
  console.log(`    defEq=${b?.defEquipBV?.toFixed(0)} offEq=${b?.offEquipBV} wBV=${b?.weaponBV?.toFixed(0)} ammo=${b?.ammoBV}`);
}
