import * as fs from 'fs';
import * as path from 'path';

const data = JSON.parse(fs.readFileSync('validation-output/bv-validation-report.json', 'utf8'));
const mulCache = JSON.parse(fs.readFileSync('scripts/data-migration/mul-bv-cache.json', 'utf8'));
const indexData = JSON.parse(fs.readFileSync('public/data/units/battlemechs/index.json', 'utf8'));

// Check ALL overcalculated units for Drone OS
const overCalc = data.allResults.filter((d: any) => {
  if (d.difference <= 0 || d.percentDiff < 4) return false;
  const entry = mulCache.entries?.[d.unitId];
  return entry && entry.mulBV > 0 && entry.matchType === 'exact';
});

let droneOSCount = 0;
let noDroneOSCount = 0;
const droneOSUnits: any[] = [];
const noDroneOSUnits: any[] = [];

for (const d of overCalc) {
  const iu = indexData.units.find((u: any) => u.id === d.unitId);
  if (!iu) continue;
  try {
    const unitPath = path.resolve('public/data/units/battlemechs', iu.path);
    const unit = JSON.parse(fs.readFileSync(unitPath, 'utf8'));
    const allCrits: string[] = Object.values(unit.criticalSlots || {}).flat().filter((s: any) => s) as string[];
    const critsLo = allCrits.map(s => (s as string).toLowerCase());
    const hasDroneOS = critsLo.some(s => s.includes('droneoperatingsystem') || s.includes('drone operating system'));

    if (hasDroneOS) {
      droneOSCount++;
      droneOSUnits.push({ ...d, cockpit: unit.cockpit, config: unit.configuration });
    } else {
      noDroneOSCount++;
      noDroneOSUnits.push({ ...d, cockpit: unit.cockpit, config: unit.configuration });
    }
  } catch {}
}

console.log('=== DRONE OS ANALYSIS ===');
console.log('Total overcalculated (MUL-exact, 4%+):', overCalc.length);
console.log('With Drone OS:', droneOSCount);
console.log('Without Drone OS:', noDroneOSCount);
console.log('');

if (droneOSUnits.length > 0) {
  const avgDroneOS = droneOSUnits.reduce((s: number, d: any) => s + d.percentDiff, 0) / droneOSUnits.length;
  console.log('Drone OS avg overcalc:', avgDroneOS.toFixed(1) + '%');
}

if (noDroneOSUnits.length > 0) {
  const avgNoDrone = noDroneOSUnits.reduce((s: number, d: any) => s + d.percentDiff, 0) / noDroneOSUnits.length;
  console.log('Non-Drone OS avg overcalc:', avgNoDrone.toFixed(1) + '%');
}

// Check: for non-Drone OS units, does 0.95 still fix them?
console.log('\n=== NON-DRONE-OS UNITS ===');
let fixed = 0;
for (const d of noDroneOSUnits) {
  const adjusted = Math.round(d.calculatedBV * 0.95);
  const pct = Math.abs(adjusted - d.indexBV) / d.indexBV * 100;
  if (pct <= 1) fixed++;
}
console.log('Fixed by 0.95:', fixed, 'of', noDroneOSUnits.length);

// Show some non-drone-OS units that are overcalculated
console.log('\nSample non-Drone-OS overcalculated units:');
for (const d of noDroneOSUnits.slice(0, 20)) {
  const ratio = (d.calculatedBV / d.indexBV).toFixed(4);
  const adj = Math.round(d.calculatedBV * 0.95);
  console.log(`  ${d.unitId}: calc=${d.calculatedBV} ref=${d.indexBV} ratio=${ratio} *0.95=${adj} adj-diff=${adj - d.indexBV} cockpit=${d.cockpit} config=${d.config}`);
}

// Now check: do non-drone-OS overcalculated units have ANY cockpit-related features?
// Check for torso-mounted cockpit, small cockpit, interface cockpit
console.log('\n=== COCKPIT TYPES FOR NON-DRONE-OS OVERCALCULATED ===');
const cockpitStats: Record<string, number> = {};
for (const d of noDroneOSUnits) {
  const cp = d.cockpit || 'STANDARD';
  cockpitStats[cp] = (cockpitStats[cp] || 0) + 1;
}
for (const [type, count] of Object.entries(cockpitStats)) {
  console.log(`  ${type}: ${count}`);
}

// Configuration (Biped vs Quad)
console.log('\nConfigurations:');
const configStats: Record<string, number> = {};
for (const d of noDroneOSUnits) {
  const cfg = d.config || 'unknown';
  configStats[cfg] = (configStats[cfg] || 0) + 1;
}
for (const [type, count] of Object.entries(configStats)) {
  console.log(`  ${type}: ${count}`);
}

// Check: what cockpit types do ACCURATE units have?
console.log('\n=== ACCURATE UNITS COCKPIT CHECK ===');
const accurate = data.allResults.filter((d: any) => {
  if (Math.abs(d.percentDiff) > 1) return false;
  const entry = mulCache.entries?.[d.unitId];
  return entry && entry.mulBV > 0 && entry.matchType === 'exact';
});

let accurateDroneOS = 0;
for (const d of accurate.slice(0, 500)) {
  const iu = indexData.units.find((u: any) => u.id === d.unitId);
  if (!iu) continue;
  try {
    const unitPath = path.resolve('public/data/units/battlemechs', iu.path);
    const unit = JSON.parse(fs.readFileSync(unitPath, 'utf8'));
    const allCrits: string[] = Object.values(unit.criticalSlots || {}).flat().filter((s: any) => s) as string[];
    const critsLo = allCrits.map(s => (s as string).toLowerCase());
    if (critsLo.some(s => s.includes('droneoperatingsystem'))) accurateDroneOS++;
  } catch {}
}
console.log('Accurate units with Drone OS (checked first 500):', accurateDroneOS);
