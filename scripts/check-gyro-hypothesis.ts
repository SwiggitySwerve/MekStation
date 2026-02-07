import * as fs from 'fs';
import * as path from 'path';
import { STRUCTURE_POINTS_TABLE } from '../src/types/construction/InternalStructureType';
import { getArmorBVMultiplier } from '../src/types/validation/BattleValue';
import { EngineType } from '../src/types/construction/EngineType';

const report = JSON.parse(fs.readFileSync('validation-output/bv-validation-report.json', 'utf8'));
const unitsDir = path.resolve(__dirname, '../public/data/units/battlemechs');
const index = JSON.parse(fs.readFileSync(path.join(unitsDir, 'index.json'), 'utf8'));

function calcTotalArmor(a: any): number {
  let t = 0;
  for (const v of Object.values(a)) {
    if (typeof v === 'number') t += v;
    else if (v && typeof v === 'object') t += ((v as any).front || 0) + ((v as any).rear || 0);
  }
  return t;
}

function calcTotalStructure(ton: number): number {
  const t = (STRUCTURE_POINTS_TABLE as any)[ton];
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

function mapEngineMultiplier(engineType: string, techBase: string): number {
  const u = engineType.toUpperCase();
  if (u.includes('XXL')) return techBase === 'CLAN' ? 0.5 : 0.25;
  if (u.includes('CLAN') && u.includes('XL')) return 0.75;
  if (u === 'XL') return techBase === 'CLAN' ? 0.75 : 0.5;
  if (u === 'LIGHT') return 0.75;
  return 1.0;
}

// For EACH undercalculated unit with correct offensive BV,
// check if the gyro multiplier hypothesis explains the gap.

let gyroFixCount = 0;
let gyroFixTotal = 0;
let nonGyroCount = 0;
let hdGyroUnits: string[] = [];
let partialGyroUnits: string[] = [];

const undercalc = report.allResults.filter((r: any) => r.difference < -5 && r.breakdown);

for (const r of undercalc) {
  const entry = (index.units as any[]).find((e: any) => e.id === r.unitId);
  if (!entry?.path) continue;
  try {
    const data = JSON.parse(fs.readFileSync(path.join(unitsDir, entry.path), 'utf8'));
    const b = r.breakdown;

    // Check if offensive BV is correct
    const rawOff = b.offensiveBV / b.speedFactor;
    const expectedRawOff = b.weaponBV + b.ammoBV + data.tonnage;
    const offCorrect = Math.abs(rawOff - expectedRawOff) / Math.max(1, expectedRawOff) < 0.02;

    if (!offCorrect) continue;

    // Compute our baseDef
    const armorMult = getArmorBVMultiplier(data.armor.type.toLowerCase().replace(/\s+/g, '-'));
    const engineMult = mapEngineMultiplier(data.engine.type, data.techBase);
    const totalArmor = calcTotalArmor(data.armor.allocation);
    const totalIS = calcTotalStructure(data.tonnage);

    const armorBV = totalArmor * 2.5 * armorMult;
    const structBV = totalIS * 1.5 * 1.0 * engineMult; // structMult=1.0 for standard/endo
    const gyroBV_std = data.tonnage * 0.5;
    const gyroBV_hd = data.tonnage * 1.0;

    const runMP = Math.ceil(data.movement.walk * 1.5);
    const jumpMP = data.movement.jump || 0;
    const runTMM = mpToTMM(runMP);
    const jumpTMM = jumpMP > 0 ? mpToTMM(jumpMP) + 1 : 0;
    const maxTMM = Math.max(runTMM, jumpTMM);
    const defFactor = 1 + maxTMM / 10;

    // Expected baseDef from indexBV
    // cockpit mod: check for small/torso cockpit
    let cockpitMod = 1.0;
    const cockpit = (data.cockpit || 'STANDARD').toUpperCase();
    if (cockpit.includes('SMALL') || cockpit.includes('TORSO')) cockpitMod = 0.95;
    if (cockpit.includes('INTERFACE')) cockpitMod = 1.3;

    const expectedBaseBV = r.indexBV / cockpitMod;
    const expectedDefBV = expectedBaseBV - b.offensiveBV;
    const expectedBaseDef = expectedDefBV / defFactor;

    const baseDef_std = armorBV + structBV + gyroBV_std + b.defensiveEquipBV - b.explosivePenalty;
    const baseDef_hd = armorBV + structBV + gyroBV_hd + b.defensiveEquipBV - b.explosivePenalty;

    const gap_std = expectedBaseDef - baseDef_std;
    const gap_hd = expectedBaseDef - baseDef_hd;

    // Does using gyroMult=1.0 fix the gap?
    const fixedByHDGyro = Math.abs(gap_hd) < 3; // within 3 BV
    const gyroContrib = data.tonnage * 0.5; // the extra BV from HD gyro

    if (fixedByHDGyro) {
      gyroFixCount++;
      hdGyroUnits.push(r.unitId);
    } else if (Math.abs(gap_hd) < Math.abs(gap_std)) {
      partialGyroUnits.push(`${r.unitId} (gap_std=${gap_std.toFixed(1)} gap_hd=${gap_hd.toFixed(1)})`);
    } else {
      nonGyroCount++;
    }
    gyroFixTotal++;
  } catch {}
}

console.log(`Analyzed ${gyroFixTotal} undercalculated units with correct offensive BV`);
console.log(`\nGyro hypothesis (gyroMult=1.0 fixes gap within 3 BV): ${gyroFixCount} (${(gyroFixCount/gyroFixTotal*100).toFixed(1)}%)`);
console.log(`Gyro partially helps but doesn't fully fix: ${partialGyroUnits.length}`);
console.log(`Gyro hypothesis doesn't help: ${nonGyroCount}`);

console.log(`\n=== Units fixed by HD gyro (first 20) ===`);
for (const id of hdGyroUnits.slice(0, 20)) {
  const r = report.allResults.find((x: any) => x.unitId === id);
  const entry = (index.units as any[]).find((e: any) => e.id === id);
  if (!entry?.path || !r) continue;
  const data = JSON.parse(fs.readFileSync(path.join(unitsDir, entry.path), 'utf8'));
  console.log(`  ${id}: ${data.tonnage}t ${data.engine.type} gyro=${data.gyro?.type || 'STANDARD'} diff=${r.difference}`);
}

console.log(`\n=== Partial gyro fix (first 15) ===`);
for (const s of partialGyroUnits.slice(0, 15)) {
  console.log(`  ${s}`);
}
