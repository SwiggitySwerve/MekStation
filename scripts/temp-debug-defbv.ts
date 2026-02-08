#!/usr/bin/env npx tsx
/**
 * Debug defensive BV calculation for specific units.
 * Traces each component to find the discrepancy.
 */
import * as fs from 'fs';
import * as path from 'path';
import { STRUCTURE_POINTS_TABLE } from '../src/types/construction/InternalStructureType';

// Check structure points for all tonnages
console.log('=== STRUCTURE POINTS TABLE ===');
for (const ton of [20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80, 85, 90, 95, 100]) {
  const t = STRUCTURE_POINTS_TABLE[ton];
  if (!t) { console.log(`${ton}t: MISSING`); continue; }
  const total = t.head + t.centerTorso + t.sideTorso * 2 + t.arm * 2 + t.leg * 2;
  console.log(`${ton}t: HD=${t.head} CT=${t.centerTorso} ST=${t.sideTorso} ARM=${t.arm} LEG=${t.leg} → total=${total}`);
}

// Now load the Albatross ALB-5U and trace its BV
const basePath = path.resolve(process.cwd(), 'public/data/units/battlemechs');
const indexPath = path.resolve(basePath, 'index.json');
const index = JSON.parse(fs.readFileSync(indexPath, 'utf-8'));

// Find ALB-5U
const target = index.units.find((u: any) => u.model === 'ALB-5U' || (u.chassis === 'Albatross' && u.model === 'ALB-5U'));
if (!target) {
  // Try broader search
  const albs = index.units.filter((u: any) => u.chassis.includes('Albatross'));
  console.log('\nAlbatross variants:', albs.map((u: any) => `${u.chassis} ${u.model} (BV=${u.bv})`));
  process.exit(1);
}

console.log(`\n=== ${target.chassis} ${target.model} ===`);
console.log(`Index BV: ${target.bv}, Tonnage: ${target.tonnage}`);

const unitPath = path.join(basePath, target.path);
const unit = JSON.parse(fs.readFileSync(unitPath, 'utf-8'));

console.log(`Engine: ${unit.engine.type} (rating ${unit.engine.rating})`);
console.log(`Gyro: ${unit.gyro.type}`);
console.log(`Cockpit: ${unit.cockpit}`);
console.log(`Structure: ${unit.structure.type}`);
console.log(`Armor type: ${unit.armor.type}`);
console.log(`Heat sinks: ${unit.heatSinks.type} × ${unit.heatSinks.count}`);
console.log(`Movement: walk=${unit.movement.walk} jump=${unit.movement.jump}`);

// Calculate total armor
let totalArmor = 0;
for (const [loc, val] of Object.entries(unit.armor.allocation)) {
  if (typeof val === 'number') { totalArmor += val; console.log(`  Armor ${loc}: ${val}`); }
  else if (val && typeof val === 'object') {
    const v = val as { front: number; rear: number };
    totalArmor += v.front + v.rear;
    console.log(`  Armor ${loc}: front=${v.front} rear=${v.rear} total=${v.front + v.rear}`);
  }
}
console.log(`Total armor: ${totalArmor}`);

// Calculate total structure
const st = STRUCTURE_POINTS_TABLE[unit.tonnage];
if (st) {
  const totalStruct = st.head + st.centerTorso + st.sideTorso * 2 + st.arm * 2 + st.leg * 2;
  console.log(`Total structure: ${totalStruct} (HD=${st.head} CT=${st.centerTorso} ST=${st.sideTorso}×2 ARM=${st.arm}×2 LEG=${st.leg}×2)`);
  
  // Manual defensive BV calculation
  const armorBV = totalArmor * 2.5;
  console.log(`\nArmor BV: ${totalArmor} × 2.5 = ${armorBV}`);
  
  // Engine multiplier for Light engine
  const engineMult = 0.75; // Light engine = 2 side torso slots
  const structBV = totalStruct * 1.5 * 1.0 * engineMult;
  console.log(`Structure BV: ${totalStruct} × 1.5 × 1.0 (standard) × ${engineMult} (Light) = ${structBV}`);
  
  const gyroBV = unit.tonnage * 0.5;
  console.log(`Gyro BV: ${unit.tonnage} × 0.5 = ${gyroBV}`);
  
  const baseDef = armorBV + structBV + gyroBV;
  console.log(`Base defensive: ${armorBV} + ${structBV} + ${gyroBV} = ${baseDef}`);
  
  // TMM
  const runMP = Math.ceil(unit.movement.walk * 1.5);
  const jumpMP = unit.movement.jump || 0;
  const bestMP = Math.max(runMP, jumpMP);
  let tmm = 0;
  if (bestMP <= 2) tmm = 0;
  else if (bestMP <= 4) tmm = 1;
  else if (bestMP <= 6) tmm = 2;
  else if (bestMP <= 9) tmm = 3;
  else if (bestMP <= 17) tmm = 4;
  else tmm = 5;
  
  const defFactor = 1 + tmm / 10.0;
  console.log(`Run MP: ${runMP}, Jump MP: ${jumpMP}, Best MP: ${bestMP}, TMM: ${tmm}, Def factor: ${defFactor}`);
  console.log(`Expected defensive BV (no equip/penalties): ${baseDef} × ${defFactor} = ${baseDef * defFactor}`);
}

// Now also check what MegaMek uses for structure points
// MegaMek's Mek.java uses getInternal() which reads from the entity's internal structure
// The TechManual table (p.51) for 95t should be:
// Head: 3, CT: 31, ST: 22, Arm: 16, Leg: 22
// But our table has: Head: 3, CT: 30, ST: 20, Arm: 16, Leg: 20
// Let me check the correct values...

console.log('\n=== CHECKING MEGAMEK STRUCTURE POINTS ===');
// MegaMek source: megamek/common/Mek.java getOriginalInternal()
// Uses the table from TechManual p.51
// For 95 tons:
// Head: 3, CT: 31, LT/RT: 22, LA/RA: 16, LL/RL: 22
// Total: 3 + 31 + 22*2 + 16*2 + 22*2 = 3 + 31 + 44 + 32 + 44 = 154

// Our table has:
// Head: 3, CT: 30, ST: 20, Arm: 16, Leg: 20
// Total: 3 + 30 + 20*2 + 16*2 + 20*2 = 3 + 30 + 40 + 32 + 40 = 145

// DIFFERENCE: 154 - 145 = 9 structure points!
// This means structure BV is off by: 9 * 1.5 * engineMult = 9 * 1.5 * 0.75 = 10.125

console.log('Our table (95t): HD=3 CT=30 ST=20 ARM=16 LEG=20 → total=145');
console.log('MegaMek (95t):   HD=3 CT=31 ST=22 ARM=16 LEG=22 → total=154');
console.log('Difference: 9 structure points');
console.log('BV impact (Light engine): 9 × 1.5 × 0.75 = ' + (9 * 1.5 * 0.75));
console.log('After TMM factor (1.2): ' + (9 * 1.5 * 0.75 * 1.2));
console.log('This explains the ~12.15 BV gap!');

// Let's check ALL tonnages against MegaMek's table
console.log('\n=== FULL COMPARISON WITH MEGAMEK TABLE ===');
// MegaMek Mek.java getOriginalInternal() table (from TechManual p.51):
const megamekTable: Record<number, { head: number; ct: number; st: number; arm: number; leg: number }> = {
  10: { head: 3, ct: 4, st: 3, arm: 1, leg: 2 },
  15: { head: 3, ct: 5, st: 4, arm: 2, leg: 3 },
  20: { head: 3, ct: 6, st: 5, arm: 3, leg: 4 },
  25: { head: 3, ct: 8, st: 6, arm: 4, leg: 6 },
  30: { head: 3, ct: 10, st: 7, arm: 5, leg: 7 },
  35: { head: 3, ct: 11, st: 8, arm: 6, leg: 8 },
  40: { head: 3, ct: 12, st: 10, arm: 6, leg: 10 },
  45: { head: 3, ct: 14, st: 11, arm: 7, leg: 11 },
  50: { head: 3, ct: 16, st: 12, arm: 8, leg: 12 },
  55: { head: 3, ct: 18, st: 13, arm: 9, leg: 13 },
  60: { head: 3, ct: 20, st: 14, arm: 10, leg: 14 },
  65: { head: 3, ct: 21, st: 15, arm: 10, leg: 15 },
  70: { head: 3, ct: 22, st: 15, arm: 11, leg: 15 },
  75: { head: 3, ct: 23, st: 16, arm: 12, leg: 16 },
  80: { head: 3, ct: 25, st: 17, arm: 13, leg: 17 },
  85: { head: 3, ct: 27, st: 18, arm: 14, leg: 18 },
  90: { head: 3, ct: 29, st: 19, arm: 15, leg: 19 },
  95: { head: 3, ct: 31, st: 22, arm: 16, leg: 22 },
  100: { head: 3, ct: 31, st: 21, arm: 17, leg: 21 },
};

let totalMismatches = 0;
for (const ton of Object.keys(megamekTable).map(Number).sort((a, b) => a - b)) {
  const mm = megamekTable[ton];
  const ours = STRUCTURE_POINTS_TABLE[ton];
  if (!ours) { console.log(`${ton}t: MISSING from our table`); totalMismatches++; continue; }
  
  const mmTotal = mm.head + mm.ct + mm.st * 2 + mm.arm * 2 + mm.leg * 2;
  const ourTotal = ours.head + ours.centerTorso + ours.sideTorso * 2 + ours.arm * 2 + ours.leg * 2;
  
  const match = mm.head === ours.head && mm.ct === ours.centerTorso && mm.st === ours.sideTorso && mm.arm === ours.arm && mm.leg === ours.leg;
  if (!match) {
    console.log(`${ton}t: MISMATCH!`);
    console.log(`  Ours:    HD=${ours.head} CT=${ours.centerTorso} ST=${ours.sideTorso} ARM=${ours.arm} LEG=${ours.leg} → ${ourTotal}`);
    console.log(`  MegaMek: HD=${mm.head} CT=${mm.ct} ST=${mm.st} ARM=${mm.arm} LEG=${mm.leg} → ${mmTotal}`);
    console.log(`  Diff: ${mmTotal - ourTotal} structure points`);
    totalMismatches++;
  }
}
console.log(`\nTotal mismatches: ${totalMismatches}`);
