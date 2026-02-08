import * as fs from 'fs';
import * as path from 'path';
import { STRUCTURE_POINTS_TABLE } from '../src/types/construction/InternalStructureType';
import { getArmorBVMultiplier, getStructureBVMultiplier, getGyroBVMultiplier, getEngineBVMultiplier } from '../src/types/validation/BattleValue';
import { EngineType } from '../src/types/construction/EngineType';
import { calculateDefensiveBV, calculateOffensiveBVWithHeatTracking, calculateOffensiveSpeedFactor, getCockpitModifier, calculateExplosivePenalties } from '../src/utils/construction/battleValueCalculations';
import { resolveEquipmentBV } from '../src/utils/construction/equipmentBVResolver';

// Let me pick the SIMPLEST overcalculated unit possible:
// One with no special equipment, standard armor, standard structure, standard gyro,
// standard cockpit, standard engine, no MASC, no C3, etc.

const data = JSON.parse(fs.readFileSync('validation-output/bv-validation-report.json', 'utf8'));
const mulCache = JSON.parse(fs.readFileSync('scripts/data-migration/mul-bv-cache.json', 'utf8'));
const indexData = JSON.parse(fs.readFileSync('public/data/units/battlemechs/index.json', 'utf8'));

// Find simplest overcalculated units
const overCalc = data.allResults.filter((d: any) => {
  if (d.difference <= 0 || d.percentDiff < 4 || d.percentDiff > 6.5) return false;
  const entry = mulCache.entries?.[d.unitId];
  return entry && entry.mulBV > 0 && entry.matchType === 'exact';
});

console.log('=== FINDING SIMPLEST OVERCALCULATED UNITS ===');
const simple: any[] = [];

for (const d of overCalc) {
  const iu = indexData.units.find((u: any) => u.id === d.unitId);
  if (!iu) continue;
  try {
    const unitPath = path.resolve('public/data/units/battlemechs', iu.path);
    const unit = JSON.parse(fs.readFileSync(unitPath, 'utf8'));

    const armorType = unit.armor.type.toUpperCase().replace(/[_\s-]+/g, '');
    const isStdArmor = !armorType.includes('REACTIVE') && !armorType.includes('REFLECTIVE') &&
                         !armorType.includes('HARDENED') && !armorType.includes('STEALTH') &&
                         !armorType.includes('BALLISTIC') && !armorType.includes('FERRO') &&
                         !armorType.includes('HEAT');
    const isStdStructure = unit.structure.type.toUpperCase().includes('STANDARD');
    const isStdGyro = unit.gyro.type.toUpperCase().includes('STANDARD');
    const isStdEngine = unit.engine.type.toUpperCase() === 'FUSION';
    const isStdCockpit = !unit.cockpit || unit.cockpit.toUpperCase() === 'STANDARD';

    const allCrits: string[] = Object.values(unit.criticalSlots || {}).flat().filter((s: any) => s) as string[];
    const critsLo = allCrits.map(s => (s as string).toLowerCase());
    const hasC3 = critsLo.some(s => s.includes('c3'));
    const hasMASC = critsLo.some(s => s.includes('masc'));
    const hasSC = critsLo.some(s => s.includes('supercharger'));
    const hasTSM = critsLo.some(s => s.includes('tsm'));
    const hasTC = critsLo.some(s => s.includes('targeting computer') || s.includes('istargeting') || s.includes('cltargeting'));
    const hasECM = critsLo.some(s => s.includes('ecm'));
    const hasBAP = critsLo.some(s => s.includes('beagle') || s.includes('probe') || s.includes('bloodhound'));

    const hasNoJump = (unit.movement.jump || 0) === 0;
    const techBase = unit.techBase;

    // Simplicity score (higher = simpler)
    let score = 0;
    if (isStdArmor) score += 10;
    if (isStdStructure) score += 5;
    if (isStdGyro) score += 5;
    if (isStdEngine) score += 10;
    if (isStdCockpit) score += 5;
    if (!hasC3) score += 5;
    if (!hasMASC) score += 5;
    if (!hasSC) score += 5;
    if (!hasTSM) score += 5;
    if (!hasTC) score += 5;
    if (!hasECM) score += 3;
    if (!hasBAP) score += 3;
    if (hasNoJump) score += 3;
    if (techBase === 'IS') score += 5;
    if (unit.equipment.length <= 4) score += 5;

    simple.push({
      id: d.unitId,
      score,
      calc: d.calculatedBV,
      ref: d.indexBV,
      pct: d.percentDiff,
      ratio: (d.calculatedBV / d.indexBV).toFixed(4),
      stdArmor: isStdArmor,
      stdEngine: isStdEngine,
      stdGyro: isStdGyro,
      stdStructure: isStdStructure,
      hasC3, hasMASC, hasTSM, hasTC,
      tonnage: unit.tonnage,
      walk: unit.movement.walk,
      jump: unit.movement.jump || 0,
      numEquip: unit.equipment.length,
      techBase,
      engineType: unit.engine.type,
      armorType: unit.armor.type,
    });
  } catch {}
}

simple.sort((a, b) => b.score - a.score);
console.log('\nTop 15 simplest overcalculated units:');
for (const s of simple.slice(0, 15)) {
  console.log(`  ${s.id}: score=${s.score} ${s.tonnage}t walk=${s.walk} j=${s.jump} equip=${s.numEquip} eng=${s.engineType} armor=${s.armorType} calc=${s.calc} ref=${s.ref} ratio=${s.ratio}`);
  if (s.hasC3) console.log('    has C3');
  if (s.hasMASC) console.log('    has MASC');
  if (s.hasTSM) console.log('    has TSM');
  if (s.hasTC) console.log('    has TC');
}

// Now let me do a FULL manual calculation for the simplest unit
const simplest = simple[0];
console.log('\n\n=== DETAILED TRACE:', simplest.id, '===');
const iu = indexData.units.find((u: any) => u.id === simplest.id);
const unitPath = path.resolve('public/data/units/battlemechs', iu!.path);
const unit = JSON.parse(fs.readFileSync(unitPath, 'utf8'));

console.log(JSON.stringify({
  tonnage: unit.tonnage,
  walk: unit.movement.walk,
  jump: unit.movement.jump,
  engine: unit.engine,
  armor: unit.armor,
  structure: unit.structure,
  gyro: unit.gyro,
  cockpit: unit.cockpit,
  heatSinks: unit.heatSinks,
  equipment: unit.equipment,
  techBase: unit.techBase,
}, null, 2));

// Calculate all components manually
function calcTotalArmor(a: any): number {
  let t = 0;
  for (const v of Object.values(a)) {
    if (typeof v === 'number') t += v;
    else if (v && typeof v === 'object') t += ((v as any).front || 0) + ((v as any).rear || 0);
  }
  return t;
}

function calcTotalStructure(ton: number): number {
  const t = STRUCTURE_POINTS_TABLE[ton];
  if (!t) return 0;
  return t.head + t.centerTorso + t.sideTorso * 2 + t.arm * 2 + t.leg * 2;
}

const totalArmor = calcTotalArmor(unit.armor.allocation);
const totalStructure = calcTotalStructure(unit.tonnage);
const walkMP = unit.movement.walk;
const runMP = Math.ceil(walkMP * 1.5);
const jumpMP = unit.movement.jump || 0;

console.log('\nManual calculation:');
console.log('Total armor:', totalArmor);
console.log('Total structure:', totalStructure);
console.log('Walk:', walkMP, 'Run:', runMP, 'Jump:', jumpMP);

const armorBV = totalArmor * 2.5;  // Standard armor, BAR 10
console.log('ArmorBV:', armorBV);

const structBV = totalStructure * 1.5 * 1.0 * 1.0;  // Standard struct, standard engine
console.log('StructBV:', structBV);

const gyroBV = unit.tonnage * 0.5;  // Standard gyro
console.log('GyroBV:', gyroBV);

function mpToTMM(mp: number): number {
  if (mp <= 2) return 0;
  if (mp <= 4) return 1;
  if (mp <= 6) return 2;
  if (mp <= 9) return 3;
  if (mp <= 17) return 4;
  if (mp <= 24) return 5;
  return 6;
}

const runTMM = mpToTMM(runMP);
const jumpTMM = jumpMP > 0 ? mpToTMM(jumpMP) + 1 : 0;
const maxTMM = Math.max(runTMM, jumpTMM);
const defFactor = 1 + maxTMM / 10.0;
console.log('RunTMM:', runTMM, 'JumpTMM:', jumpTMM, 'DefFactor:', defFactor);

// Explosive penalties from report
const reportResult = data.allResults.find((d: any) => d.unitId === simplest.id);
const explPen = reportResult.breakdown.explosivePenalty;
const defEquipBV = reportResult.breakdown.defensiveEquipBV;
console.log('Explosive penalty:', explPen);
console.log('Defensive equip BV:', defEquipBV);

const baseDef = armorBV + structBV + gyroBV + defEquipBV - explPen;
const totalDef = baseDef * defFactor;
console.log('BaseDef:', baseDef, 'TotalDef:', totalDef);

// Weapons
console.log('\nWeapons from equipment:');
for (const eq of unit.equipment) {
  const resolved = resolveEquipmentBV(eq.id);
  console.log(`  ${eq.id} @ ${eq.location}: BV=${resolved.battleValue} heat=${resolved.heat}`);
}

const sf = calculateOffensiveSpeedFactor(runMP, jumpMP);
console.log('\nSpeedFactor:', sf);
console.log('WeaponBV (from report):', reportResult.breakdown.weaponBV);
console.log('AmmoBV (from report):', reportResult.breakdown.ammoBV);
console.log('WeightBonus:', unit.tonnage);

const baseOff = reportResult.breakdown.weaponBV + reportResult.breakdown.ammoBV + unit.tonnage;
const totalOff = baseOff * sf;
console.log('BaseOff:', baseOff, 'TotalOff:', totalOff);

const total = totalDef + totalOff;
console.log('\nTotal = DefBV + OffBV =', totalDef, '+', totalOff, '=', total);
console.log('Rounded:', Math.round(total));
console.log('Reference:', simplest.ref);
console.log('calc * 0.95:', Math.round(total * 0.95));
console.log('Difference:', Math.round(total) - simplest.ref);
console.log('Ratio:', (total / simplest.ref).toFixed(6));

// Check: 1/ratio gives us the "missing multiplier"
console.log('Missing multiplier:', (simplest.ref / total).toFixed(6));

// Check with actual validation calc
console.log('\nFrom validation:');
console.log('  DefBV:', reportResult.breakdown.defensiveBV);
console.log('  OffBV:', reportResult.breakdown.offensiveBV);
console.log('  Total:', reportResult.calculatedBV);
console.log('  DefBV match:', totalDef.toFixed(2), 'vs', reportResult.breakdown.defensiveBV);
console.log('  OffBV match:', totalOff.toFixed(2), 'vs', reportResult.breakdown.offensiveBV);
