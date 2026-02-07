import * as fs from 'fs';
import * as path from 'path';
import { calculateDefensiveBV } from '../src/utils/construction/battleValueCalculations';
import { EngineType } from '../src/types/construction/EngineType';

const unitsDir = path.resolve(__dirname, '../public/data/units/battlemechs');
const index = JSON.parse(fs.readFileSync(path.join(unitsDir, 'index.json'), 'utf8'));

const entry = index.units.find((u: any) => u.id === 'albatross-alb-5w');
if (!entry) { console.log('Not found'); process.exit(1); }
const unit = JSON.parse(fs.readFileSync(path.join(unitsDir, entry.path), 'utf8'));

// Compute inputs manually
const armorAlloc = unit.armor.allocation;
let totalArmor = 0;
for (const [, val] of Object.entries(armorAlloc)) {
  if (typeof val === 'number') totalArmor += val;
  else if (val && typeof val === 'object') totalArmor += ((val as any).front || 0) + ((val as any).rear || 0);
}

// Structure
const STRUCTURE_POINTS: Record<number, any> = {
  20: { head: 3, centerTorso: 6, sideTorso: 5, arm: 3, leg: 4 },
  25: { head: 3, centerTorso: 8, sideTorso: 6, arm: 4, leg: 6 },
  30: { head: 3, centerTorso: 10, sideTorso: 7, arm: 5, leg: 7 },
  35: { head: 3, centerTorso: 11, sideTorso: 8, arm: 6, leg: 8 },
  40: { head: 3, centerTorso: 12, sideTorso: 10, arm: 6, leg: 10 },
  45: { head: 3, centerTorso: 14, sideTorso: 11, arm: 7, leg: 11 },
  50: { head: 3, centerTorso: 16, sideTorso: 12, arm: 8, leg: 12 },
  55: { head: 3, centerTorso: 18, sideTorso: 13, arm: 9, leg: 13 },
  60: { head: 3, centerTorso: 20, sideTorso: 14, arm: 10, leg: 14 },
  65: { head: 3, centerTorso: 21, sideTorso: 15, arm: 10, leg: 15 },
  70: { head: 3, centerTorso: 22, sideTorso: 15, arm: 11, leg: 15 },
  75: { head: 3, centerTorso: 23, sideTorso: 16, arm: 12, leg: 16 },
  80: { head: 3, centerTorso: 25, sideTorso: 17, arm: 13, leg: 17 },
  85: { head: 3, centerTorso: 27, sideTorso: 18, arm: 14, leg: 18 },
  90: { head: 3, centerTorso: 29, sideTorso: 19, arm: 15, leg: 19 },
  95: { head: 3, centerTorso: 30, sideTorso: 20, arm: 16, leg: 20 },
  100: { head: 3, centerTorso: 31, sideTorso: 21, arm: 17, leg: 21 },
};
const sp = STRUCTURE_POINTS[unit.tonnage];
const totalStructure = sp.head + sp.centerTorso + sp.sideTorso * 2 + sp.arm * 2 + sp.leg * 2;

const walkMP = unit.movement.walk;
const runMP = Math.ceil(walkMP * 1.5);
const jumpMP = unit.movement.jump || 0;

console.log(`totalArmor: ${totalArmor}`);
console.log(`totalStructure: ${totalStructure}`);
console.log(`walkMP: ${walkMP}, runMP: ${runMP}, jumpMP: ${jumpMP}`);

// Call the actual function
const result = calculateDefensiveBV({
  totalArmorPoints: totalArmor,
  totalStructurePoints: totalStructure,
  tonnage: unit.tonnage,
  runMP,
  jumpMP,
  umuMP: 0,
  armorType: 'standard', // heavy ferro maps to standard
  structureType: 'standard',
  gyroType: 'standard',
  engineType: EngineType.LIGHT,
  defensiveEquipmentBV: 61, // Guardian ECM
  explosivePenalties: 0,
});

console.log('\nDefensive BV result:');
console.log(`  armorBV: ${result.armorBV}`);
console.log(`  structureBV: ${result.structureBV}`);
console.log(`  gyroBV: ${result.gyroBV}`);
console.log(`  defensiveFactor: ${result.defensiveFactor}`);
console.log(`  totalDefensiveBV: ${result.totalDefensiveBV}`);
console.log(`  Expected from report: 1305.3625`);
console.log(`  Difference: ${result.totalDefensiveBV - 1305.3625}`);

// Also try without defEquipBV to see raw
const result2 = calculateDefensiveBV({
  totalArmorPoints: totalArmor,
  totalStructurePoints: totalStructure,
  tonnage: unit.tonnage,
  runMP,
  jumpMP,
  umuMP: 0,
  armorType: 'standard',
  structureType: 'standard',
  gyroType: 'standard',
  engineType: EngineType.LIGHT,
  defensiveEquipmentBV: 0,
  explosivePenalties: 0,
});
console.log(`\nWithout defEquipBV: ${result2.totalDefensiveBV}`);
console.log(`  armorBV: ${result2.armorBV}`);
console.log(`  structureBV: ${result2.structureBV}`);
console.log(`  gyroBV: ${result2.gyroBV}`);
