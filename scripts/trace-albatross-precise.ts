import * as fs from 'fs';
import * as path from 'path';
import {
  ARMOR_BV_MULTIPLIERS,
  STRUCTURE_BV_MULTIPLIERS,
  GYRO_BV_MULTIPLIERS,
  ENGINE_BV_MULTIPLIERS,
} from '../src/types/validation/BattleValue';
import { STRUCTURE_POINTS_TABLE } from '../src/types/construction/InternalStructureType';

const unitsDir = path.resolve(__dirname, '../public/data/units/battlemechs');
const index = JSON.parse(fs.readFileSync(path.join(unitsDir, 'index.json'), 'utf8'));
const report = JSON.parse(fs.readFileSync('validation-output/bv-validation-report.json', 'utf8'));

const entry = index.units.find((u: any) => u.id === 'albatross-alb-5w');
if (!entry) { console.log('Not found'); process.exit(1); }
const unit = JSON.parse(fs.readFileSync(path.join(unitsDir, entry.path), 'utf8'));

console.log('=== ALB-5W Full BV Trace ===');
console.log(`Tonnage: ${unit.tonnage}t  TechBase: ${unit.techBase}`);
console.log(`Engine: ${unit.engine.type} ${unit.engine.rating}`);
console.log(`Gyro: ${unit.gyro?.type}`);
console.log(`Structure: ${unit.structure?.type}`);
console.log(`Armor: ${unit.armor?.type}`);

// Armor BV
const armorAlloc = unit.armor.allocation;
let totalArmor = 0;
for (const [loc, val] of Object.entries(armorAlloc)) {
  if (typeof val === 'number') totalArmor += val;
  else if (val && typeof val === 'object') totalArmor += ((val as any).front || 0) + ((val as any).rear || 0);
}
const armorMult = ARMOR_BV_MULTIPLIERS['standard'] || 1.0;
const armorBV = totalArmor * 2.5 * armorMult;
console.log(`\nArmor: total=${totalArmor} points × 2.5 × ${armorMult} = ${armorBV}`);

// Structure BV
const structPts = STRUCTURE_POINTS_TABLE[unit.tonnage];
const totalStruct = structPts.head + structPts.centerTorso + structPts.sideTorso * 2 + structPts.arm * 2 + structPts.leg * 2;
const structMult = STRUCTURE_BV_MULTIPLIERS['standard'] || 1.0;
const structBV = totalStruct * 1.5 * structMult;
console.log(`Structure: total=${totalStruct} points × 1.5 × ${structMult} = ${structBV}`);

// Gyro BV
const gyroType = (unit.gyro?.type || 'STANDARD').toLowerCase().replace(/[_\s]+/g, '-');
const gyroMult = GYRO_BV_MULTIPLIERS[gyroType] || GYRO_BV_MULTIPLIERS['standard'] || 0.5;
const gyroBV = unit.tonnage * gyroMult;
console.log(`Gyro: ${unit.tonnage}t × ${gyroMult} (${gyroType}) = ${gyroBV}`);

// Engine type
const engineType = unit.engine.type.toLowerCase().includes('xl') ? 'xl' :
  unit.engine.type.toLowerCase().includes('xxl') ? 'xxl' :
  unit.engine.type.toLowerCase().includes('light') ? 'light' :
  unit.engine.type.toLowerCase().includes('compact') ? 'compact' : 'standard';
const engineMult = ENGINE_BV_MULTIPLIERS[engineType] || ENGINE_BV_MULTIPLIERS['standard'] || 1.0;
console.log(`Engine: type=${engineType} mult=${engineMult}`);

// TMM / Defensive factor
const walkMP = unit.movement.walk;
const runMP = Math.ceil(walkMP * 1.5);
const jumpMP = unit.movement.jump || 0;
const baseMP = runMP;
const tmmTable: Record<number, number> = { 0: -4, 1: -2, 2: 0, 3: 1, 4: 2, 5: 3, 6: 4, 7: 5, 8: 6, 9: 7, 10: 8, 11: 9, 12: 10, 13: 11, 14: 11, 15: 12, 16: 12, 17: 12 };
const runTMM = tmmTable[Math.min(baseMP, 17)] || 0;
const jumpTMM = (jumpMP > 0) ? (tmmTable[Math.min(jumpMP, 17)] || 0) + 1 : 0;
const maxTMM = Math.max(runTMM, jumpTMM);
const defensiveFactor = 1 + maxTMM / 10;
console.log(`\nMovement: walk=${walkMP} run=${runMP} jump=${jumpMP}`);
console.log(`TMM: run=${runTMM} jump=${jumpTMM} max=${maxTMM}`);
console.log(`Defensive factor: 1 + ${maxTMM}/10 = ${defensiveFactor}`);

// Explosive penalties
console.log(`\nExplosive penalties: (checking crits...)`);
const crits = unit.criticalSlots;
let explosiveSlots = 0;
for (const [loc, slots] of Object.entries(crits)) {
  if (!Array.isArray(slots)) continue;
  for (const s of slots) {
    if (!s || typeof s !== 'string') continue;
    const lo = s.toLowerCase();
    if (lo.includes('ammo') && !lo.includes('gauss') && !lo.includes('plasma')) explosiveSlots++;
  }
}
console.log(`  Explosive ammo slots: ${explosiveSlots}`);

// Defensive BV
const defEquipBV = 0; // ALB-5W likely has no ECM/AMS/BAP
const explosivePenalty = 0; // No ammo
const preDef = armorBV + structBV + gyroBV + defEquipBV - explosivePenalty;
const totalDefBV = preDef * defensiveFactor * engineMult;
console.log(`\nDefensive BV:`);
console.log(`  armorBV (${armorBV}) + structBV (${structBV}) + gyroBV (${gyroBV}) + defEquipBV (${defEquipBV}) - explosive (${explosivePenalty})`);
console.log(`  = ${preDef}`);
console.log(`  × defensiveFactor (${defensiveFactor}) × engineMult (${engineMult})`);
console.log(`  = ${totalDefBV}`);
console.log(`  Report says: ${report.allResults.find((r: any) => r.unitId === 'albatross-alb-5w')?.breakdown?.defensiveBV}`);

// Check what report's offensive breakdown looks like
const result = report.allResults.find((r: any) => r.unitId === 'albatross-alb-5w');
if (result) {
  const off = result.breakdown;
  console.log(`\nOffensive BV breakdown:`);
  console.log(`  weaponBV: ${off.weaponBV}`);
  console.log(`  ammoBV: ${off.ammoBV}`);
  console.log(`  speedFactor: ${off.speedFactor}`);
  console.log(`  offensiveBV: ${off.offensiveBV}`);
  console.log(`  defensiveBV: ${off.defensiveBV}`);
  console.log(`  totalBV = def + off = ${off.defensiveBV + off.offensiveBV} → cockpit mod → ${result.calculatedBV}`);
  console.log(`  Expected: ${result.indexBV}`);
  console.log(`  Gap: ${result.difference}`);

  // Reverse engineer: what defensive BV would we need to match?
  const neededTotal = result.indexBV;
  const neededBase = neededTotal; // standard cockpit = 1.0 modifier
  const neededDef = neededBase - off.offensiveBV;
  console.log(`\n  To match index BV ${neededTotal}:`);
  console.log(`  Need defensiveBV = ${neededTotal} - ${off.offensiveBV.toFixed(2)} = ${neededDef.toFixed(2)}`);
  console.log(`  Current defensiveBV = ${off.defensiveBV.toFixed(2)}`);
  console.log(`  Missing: ${(neededDef - off.defensiveBV).toFixed(2)}`);
}

// Now look at armor allocation
console.log(`\nArmor allocation:`);
for (const [loc, val] of Object.entries(armorAlloc)) {
  if (typeof val === 'number') console.log(`  ${loc}: ${val}`);
  else if (val && typeof val === 'object') console.log(`  ${loc}: front=${(val as any).front} rear=${(val as any).rear}`);
}

// List all crits to check for defensive equipment
console.log(`\nAll crit slots:`);
for (const [loc, slots] of Object.entries(crits)) {
  if (!Array.isArray(slots)) continue;
  const filled = (slots as any[]).filter((s: any) => s && typeof s === 'string');
  if (filled.length > 0) {
    console.log(`  ${loc}: ${filled.join(' | ')}`);
  }
}
