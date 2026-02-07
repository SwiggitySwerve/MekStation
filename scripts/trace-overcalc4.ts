import * as fs from 'fs';
import * as path from 'path';

const data = JSON.parse(fs.readFileSync('validation-output/bv-validation-report.json', 'utf8'));
const overCalc = data.allResults.filter((d: any) => d.difference > 0 && d.percentDiff > 1 && d.rootCause === 'overcalculation');

console.log('=== Overcalculation Pattern Analysis (163 units) ===\n');

// Load unit files to check their properties
const index = JSON.parse(fs.readFileSync('public/data/units/battlemechs/index.json', 'utf8'));

// Categorize by what might be causing the issue
let mascCount = 0;
let superchargerCount = 0;
let tsmCount = 0;
let tcCount = 0;
let ecmCount = 0;
let stealthCount = 0;
let nullSigCount = 0;
let mixedTechCount = 0;
let clanCount = 0;
let isCount = 0;
let jumpCount = 0;
let noJumpCount = 0;
let highSpeedCount = 0; // SF > 1.5
let lowSpeedCount = 0;  // SF <= 1.2
const defOvershoot: number[] = [];
const offOvershoot: number[] = [];

for (const d of overCalc) {
  const iu = index.units.find((u: any) => u.id === d.unitId);
  if (!iu) continue;
  try {
    const unitPath = path.resolve('public/data/units/battlemechs', iu.path);
    const unit = JSON.parse(fs.readFileSync(unitPath, 'utf8'));
    const allCrits: string[] = Object.values(unit.criticalSlots || {}).flat().filter((s: any) => s) as string[];
    const allCritsLo = allCrits.map((s: string) => s.toLowerCase());

    if (allCritsLo.some(s => s.includes('masc'))) mascCount++;
    if (allCritsLo.some(s => s.includes('supercharger'))) superchargerCount++;
    if (allCritsLo.some(s => s.includes('tsm') || s.includes('triple strength'))) tsmCount++;
    if (allCritsLo.some(s => s.includes('targeting computer'))) tcCount++;
    if (allCritsLo.some(s => s.includes('ecm'))) ecmCount++;
    if (unit.armor?.type?.toUpperCase()?.includes('STEALTH')) stealthCount++;
    if (allCritsLo.some(s => s.includes('null') && s.includes('sig'))) nullSigCount++;
    if (unit.techBase === 'MIXED') mixedTechCount++;
    if (unit.techBase === 'CLAN') clanCount++;
    if (unit.techBase === 'INNER_SPHERE') isCount++;
    if ((unit.movement.jump || 0) > 0) jumpCount++;
    else noJumpCount++;
    if (d.breakdown.speedFactor > 1.5) highSpeedCount++;
    if (d.breakdown.speedFactor <= 1.2) lowSpeedCount++;

    // Estimate what the "expected" def/off split would be to match reference
    const expectedOff = d.indexBV - d.breakdown.defensiveBV;
    const expectedDef = d.indexBV - d.breakdown.offensiveBV;
    defOvershoot.push(d.breakdown.defensiveBV - expectedDef);
    offOvershoot.push(d.breakdown.offensiveBV - expectedOff);
  } catch { /* skip */ }
}

console.log('Equipment frequency:');
console.log('  MASC:', mascCount);
console.log('  Supercharger:', superchargerCount);
console.log('  TSM:', tsmCount);
console.log('  Targeting Computer:', tcCount);
console.log('  ECM:', ecmCount);
console.log('  Stealth Armor:', stealthCount);
console.log('  Null Sig:', nullSigCount);
console.log('');

console.log('Tech base:');
console.log('  Clan:', clanCount);
console.log('  IS:', isCount);
console.log('  Mixed:', mixedTechCount);
console.log('');

console.log('Movement:');
console.log('  With jump:', jumpCount);
console.log('  No jump:', noJumpCount);
console.log('  High speed (SF>1.5):', highSpeedCount);
console.log('  Low speed (SF<=1.2):', lowSpeedCount);
console.log('');

// Now check: for units WITHOUT any special equipment, what's the overcalculation pattern?
console.log('=== Units WITHOUT MASC/SC/TSM/TC/ECM/Stealth/NullSig ===');
let plainCount = 0;
const plainUnits: any[] = [];
for (const d of overCalc) {
  const iu = index.units.find((u: any) => u.id === d.unitId);
  if (!iu) continue;
  try {
    const unitPath = path.resolve('public/data/units/battlemechs', iu.path);
    const unit = JSON.parse(fs.readFileSync(unitPath, 'utf8'));
    const allCrits: string[] = Object.values(unit.criticalSlots || {}).flat().filter((s: any) => s) as string[];
    const allCritsLo = allCrits.map((s: string) => s.toLowerCase());

    const hasMASC = allCritsLo.some(s => s.includes('masc'));
    const hasSC = allCritsLo.some(s => s.includes('supercharger'));
    const hasTSM = allCritsLo.some(s => s.includes('tsm') || s.includes('triple strength'));
    const hasTC = allCritsLo.some(s => s.includes('targeting computer'));
    const hasECM = allCritsLo.some(s => s.includes('ecm'));
    const hasStealth = unit.armor?.type?.toUpperCase()?.includes('STEALTH');
    const hasNullSig = allCritsLo.some(s => s.includes('null') && s.includes('sig'));

    if (!hasMASC && !hasSC && !hasTSM && !hasTC && !hasECM && !hasStealth && !hasNullSig) {
      plainCount++;
      plainUnits.push({ ...d, unit });
    }
  } catch { /* skip */ }
}

console.log('Plain (no special equip) overcalculated:', plainCount, 'of', overCalc.length);
plainUnits.sort((a: any, b: any) => b.percentDiff - a.percentDiff);

console.log('\nTop 20 plain overcalculated:');
for (const d of plainUnits.slice(0, 20)) {
  const unit = d.unit;
  const eqs = unit.equipment.map((e: any) => e.id).join(', ');
  console.log(`  ${d.unitId} (${unit.techBase}, ${unit.tonnage}t) +${d.percentDiff.toFixed(1)}% diff=${d.difference}`);
  console.log(`    weapons: ${eqs}`);
  console.log(`    def=${d.breakdown.defensiveBV.toFixed(0)} off=${d.breakdown.offensiveBV.toFixed(0)} SF=${d.breakdown.speedFactor} weapBV=${d.breakdown.weaponBV} ammoBV=${d.breakdown.ammoBV} explPen=${d.breakdown.explosivePenalty}`);
}
