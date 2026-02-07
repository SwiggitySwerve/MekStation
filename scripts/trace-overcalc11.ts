import * as fs from 'fs';
import * as path from 'path';
import { STRUCTURE_POINTS_TABLE } from '../src/types/construction/InternalStructureType';
import { getArmorBVMultiplier, getStructureBVMultiplier, getGyroBVMultiplier, getEngineBVMultiplier } from '../src/types/validation/BattleValue';
import { EngineType } from '../src/types/construction/EngineType';

const data = JSON.parse(fs.readFileSync('validation-output/bv-validation-report.json', 'utf8'));
const mulCache = JSON.parse(fs.readFileSync('scripts/data-migration/mul-bv-cache.json', 'utf8'));
const indexData = JSON.parse(fs.readFileSync('public/data/units/battlemechs/index.json', 'utf8'));

// In MegaMek, armor BV is NOT calculated as one global sum * 2.5.
// Instead, MegaMek processArmor() iterates per-location:
//   for each location:
//     armorBV += getArmorOfLoc(loc) * armorBVFactor
// where armorBVFactor is the armor type multiplier.
// But crucially, the factor is 2.5 * armorTypeMultiplier * bar
// and there's no per-location rounding.
// So global sum * 2.5 * mult SHOULD equal sum(per-loc * 2.5 * mult)
// Since multiplication distributes over addition.

// BUT our formula has: Math.round(totalArmorPoints * 2.5 * armorMultiplier * bar) / 10
// The /10 at the end combined with Math.round is essentially rounding to 1 decimal place.
// This is: round(total * 2.5 * mult * 10) / 10
// = round(total * 25 * mult) / 10 (for standard armor with mult=1.0, bar=10)

// Wait, for bar=10: total * 2.5 * 1.0 * 10 = total * 25
// round(total * 25) / 10
// But total * 25 is always an integer (total is integer), so round does nothing!
// armorBV = total * 25 / 10 = total * 2.5

// So for standard armor, armorBV = totalArmorPoints * 2.5
// This IS the same as MegaMek.

// Let me check what the ACTUAL difference is for a specific unit.
// Let me trace the Archangel C-ANG-OB Infernus in detail.

function mapEngineType(s: string, techBase?: string): EngineType {
  const u = s.toUpperCase().replace(/[_\s-]+/g, '');
  if (u === 'XL' || u === 'XLENGINE') {
    return techBase === 'CLAN' ? EngineType.CLAN_XL : EngineType.XL;
  }
  if (u === 'LIGHT' || u === 'LIGHTENGINE') return EngineType.LIGHT;
  if (u === 'XXL' || u === 'XXLENGINE') return EngineType.XXL;
  if (u === 'COMPACT' || u === 'COMPACTENGINE') return EngineType.COMPACT;
  return EngineType.STANDARD;
}

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

function mpToTMM(mp: number): number {
  if (mp <= 2) return 0;
  if (mp <= 4) return 1;
  if (mp <= 6) return 2;
  if (mp <= 9) return 3;
  if (mp <= 17) return 4;
  if (mp <= 24) return 5;
  return 6;
}

function mapArmorType(s: string): string {
  const u = s.toUpperCase().replace(/[_\s-]+/g, '');
  if (u.includes('HARDENED')) return 'hardened'; if (u.includes('REACTIVE')) return 'reactive';
  if (u.includes('REFLECTIVE') || u.includes('LASERREFLECTIVE')) return 'reflective';
  if (u.includes('FERROLAMELLOR')) return 'ferro-lamellor'; if (u.includes('STEALTH')) return 'stealth';
  return 'standard';
}
function mapStructureType(s: string): string {
  const u = s.toUpperCase().replace(/[_\s-]+/g, '');
  if (u.includes('INDUSTRIAL')) return 'industrial'; if (u === 'COMPOSITE') return 'composite';
  if (u.includes('REINFORCED')) return 'reinforced'; return 'standard';
}
function mapGyroType(s: string): string {
  const u = s.toUpperCase().replace(/[_\s-]+/g, '');
  if (u.includes('HEAVYDUTY') || u.includes('HEAVY')) return 'heavy-duty';
  if (u.includes('XL')) return 'xl'; if (u.includes('COMPACT')) return 'compact';
  return 'standard';
}

// Detailed trace for Blade BLD-XR (exact 0.95 match: calc=1159, ref=1101)
console.log('=== BLADE BLD-XR DETAILED TRACE ===');
const bladeResult = data.allResults.find((d: any) => d.unitId === 'blade-bld-xr');
if (bladeResult) {
  console.log('Validation result:', JSON.stringify(bladeResult.breakdown));
  console.log('Calculated:', bladeResult.calculatedBV, 'Reference:', bladeResult.indexBV);
  console.log('Ratio:', (bladeResult.calculatedBV / bladeResult.indexBV).toFixed(4));
  console.log('');
}

const bladeIU = indexData.units.find((u: any) => u.id === 'blade-bld-xr');
if (bladeIU) {
  const bladePath = path.resolve('public/data/units/battlemechs', bladeIU.path);
  const blade = JSON.parse(fs.readFileSync(bladePath, 'utf8'));
  console.log('Tonnage:', blade.tonnage);
  console.log('Walk:', blade.movement.walk, 'Jump:', blade.movement.jump || 0);
  console.log('Engine:', blade.engine.type, 'Rating:', blade.engine.rating);
  console.log('Armor type:', blade.armor.type);
  console.log('Structure:', blade.structure.type);
  console.log('Gyro:', blade.gyro.type);
  console.log('Cockpit:', blade.cockpit);
  console.log('HeatSinks:', blade.heatSinks);
  console.log('Equipment:', JSON.stringify(blade.equipment));
  console.log('');

  const totalArmor = calcTotalArmor(blade.armor.allocation);
  const totalStructure = calcTotalStructure(blade.tonnage);
  const engineType = mapEngineType(blade.engine.type, blade.techBase);
  const armorType = mapArmorType(blade.armor.type);
  const structureType = mapStructureType(blade.structure.type);
  const gyroType = mapGyroType(blade.gyro.type);

  console.log('Armor points:', totalArmor);
  console.log('Structure points:', totalStructure);
  console.log('');

  // ArmorBV
  const armorMult = getArmorBVMultiplier(armorType);
  const armorBV = Math.round(totalArmor * 2.5 * armorMult * 10) / 10;
  console.log('ArmorBV:', armorBV, '(mult:', armorMult, ')');

  // StructureBV
  const structMult = getStructureBVMultiplier(structureType);
  const engMult = getEngineBVMultiplier(engineType);
  const structBV = totalStructure * 1.5 * structMult * engMult;
  console.log('StructBV:', structBV, '(structMult:', structMult, 'engMult:', engMult, ')');

  // GyroBV
  const gyroMult = getGyroBVMultiplier(gyroType);
  const gyroBV = blade.tonnage * gyroMult;
  console.log('GyroBV:', gyroBV, '(mult:', gyroMult, ')');

  // Defensive factor
  const runMP = Math.ceil(blade.movement.walk * 1.5);
  const jumpMP = blade.movement.jump || 0;
  const runTMM = mpToTMM(runMP);
  const jumpTMM = jumpMP > 0 ? mpToTMM(jumpMP) + 1 : 0;
  const maxTMM = Math.max(runTMM, jumpTMM);
  const defensiveFactor = 1 + maxTMM / 10.0;
  console.log('RunMP:', runMP, 'JumpMP:', jumpMP);
  console.log('RunTMM:', runTMM, 'JumpTMM:', jumpTMM, 'MaxTMM:', maxTMM);
  console.log('DefensiveFactor:', defensiveFactor);

  const baseDef = armorBV + structBV + gyroBV;
  const totalDef = baseDef * defensiveFactor;
  console.log('BaseDef:', baseDef, 'TotalDef:', totalDef);
  console.log('');

  // Now check: what BV does MegaMek give?
  // If ref=1101, and our calc=1159, the difference is 58.
  // 1159 * 0.95 = 1101.05 → rounds to 1101. EXACT match.
  // So our total * 0.95 = reference.
  // This means: reference = (defBV + offBV) * 0.95
  // OR: reference = defBV*0.95 + offBV*0.95
  // OR: there's some other source of the 0.95.

  // Let me check: what if defBV should be calculated differently?
  // MegaMek's processArmor():
  //   bvArmor = 0
  //   for each location:
  //     bvArmor += armor[loc] * 2.5 (for standard)
  //   Note: head armor is counted separately, and there's a special rule:
  //   Head armor beyond 3 is counted at normal rate, head armor up to 3 counts at 2.5
  //   ACTUALLY: In MegaMek MekBVCalculator line ~450-480:
  //   - For most locations: armorBV += getArmorOfLoc(loc) * armorFactor
  //   - For HEAD: armorBV += entity.getArmor(LOC_HEAD) * armorFactor
  //   - armorFactor = getBVTypeModifier() which returns the armor type multiplier
  //   - BUT WAIT: it also uses entity.getBARRating() / 10.0

  // Actually, I think the key might be simpler.
  // Let me check: In MegaMek BV 2.0, is there a modifier for OmniMechs?
  // OmniMech pod-space BV calculation includes the base chassis BV.
  // But the MUL BV should be for a specific configuration, not just the base.

  // Let me check what kind of units are in the overcalculated list.
  // Are they all OmniMechs?
}

console.log('\n=== OMNIMECH VS BATTLEMECH ANALYSIS ===');
const overCalc = data.allResults.filter((d: any) => {
  if (d.difference <= 0 || d.percentDiff < 3) return false;
  const entry = mulCache.entries?.[d.unitId];
  return entry && entry.mulBV > 0 && entry.matchType === 'exact';
});

let omniCount = 0;
let btmCount = 0;
const omniUnits: any[] = [];
const btmUnits: any[] = [];

for (const d of overCalc) {
  const iu = indexData.units.find((u: any) => u.id === d.unitId);
  if (!iu) continue;
  try {
    const unitPath = path.resolve('public/data/units/battlemechs', iu.path);
    const unit = JSON.parse(fs.readFileSync(unitPath, 'utf8'));
    const isOmni = unit.configuration === 'Omni' || (unit.omnimech === true);
    if (isOmni) {
      omniCount++;
      omniUnits.push(d);
    } else {
      btmCount++;
      btmUnits.push(d);
    }
  } catch { /* skip */ }
}

console.log('OmniMechs:', omniCount, '  avg overcalc:', omniUnits.length > 0 ? (omniUnits.reduce((s: number, d: any) => s + d.percentDiff, 0) / omniUnits.length).toFixed(1) + '%' : 'N/A');
console.log('BattleMechs:', btmCount, '  avg overcalc:', btmUnits.length > 0 ? (btmUnits.reduce((s: number, d: any) => s + d.percentDiff, 0) / btmUnits.length).toFixed(1) + '%' : 'N/A');

// Check 0.95 fix rate for each group
const omniFixed = omniUnits.filter(d => Math.abs(Math.round(d.calculatedBV * 0.95) - d.indexBV) / d.indexBV * 100 <= 1);
const btmFixed = btmUnits.filter(d => Math.abs(Math.round(d.calculatedBV * 0.95) - d.indexBV) / d.indexBV * 100 <= 1);
console.log('OmniMechs fixed by 0.95:', omniFixed.length, 'of', omniUnits.length);
console.log('BattleMechs fixed by 0.95:', btmFixed.length, 'of', btmUnits.length);

// Now check: what are the UNIQUE characteristics shared by overcalculated units?
// Maybe the overcalculated units all have CLAN tech base?
let clanCount = 0;
let isCount = 0;
let mixedCount = 0;

for (const d of overCalc) {
  const iu = indexData.units.find((u: any) => u.id === d.unitId);
  if (!iu) continue;
  try {
    const unitPath = path.resolve('public/data/units/battlemechs', iu.path);
    const unit = JSON.parse(fs.readFileSync(unitPath, 'utf8'));
    if (unit.techBase === 'CLAN') clanCount++;
    else if (unit.techBase === 'MIXED') mixedCount++;
    else isCount++;
  } catch { /* skip */ }
}

console.log('\nTech base:');
console.log('  CLAN:', clanCount);
console.log('  IS:', isCount);
console.log('  MIXED:', mixedCount);

// Check engine types
const engineTypes: Record<string, number> = {};
for (const d of overCalc) {
  const iu = indexData.units.find((u: any) => u.id === d.unitId);
  if (!iu) continue;
  try {
    const unitPath = path.resolve('public/data/units/battlemechs', iu.path);
    const unit = JSON.parse(fs.readFileSync(unitPath, 'utf8'));
    const eng = unit.engine.type;
    engineTypes[eng] = (engineTypes[eng] || 0) + 1;
  } catch { /* skip */ }
}
console.log('\nEngine types:');
for (const [type, count] of Object.entries(engineTypes).sort((a, b) => b[1] - a[1])) {
  console.log(`  ${type}: ${count}`);
}

// Let's also check if there are any units NOT overcalculated that have same characteristics
// to see if the overcalculation is truly universal
console.log('\n=== ACCURATE UNITS COMPARISON ===');
const accurate = data.allResults.filter((d: any) => {
  if (Math.abs(d.percentDiff) > 1) return false;
  const entry = mulCache.entries?.[d.unitId];
  return entry && entry.mulBV > 0 && entry.matchType === 'exact';
});
console.log('Accurate MUL-exact units (within 1%):', accurate.length);

let accClan = 0, accIS = 0, accMixed = 0;
let accOmni = 0, accBtm = 0;
for (const d of accurate) {
  const iu = indexData.units.find((u: any) => u.id === d.unitId);
  if (!iu) continue;
  try {
    const unitPath = path.resolve('public/data/units/battlemechs', iu.path);
    const unit = JSON.parse(fs.readFileSync(unitPath, 'utf8'));
    if (unit.techBase === 'CLAN') accClan++;
    else if (unit.techBase === 'MIXED') accMixed++;
    else accIS++;
    if (unit.configuration === 'Omni' || unit.omnimech) accOmni++;
    else accBtm++;
  } catch { /* skip */ }
}
console.log('  CLAN:', accClan, 'IS:', accIS, 'MIXED:', accMixed);
console.log('  OmniMech:', accOmni, 'BattleMech:', accBtm);
