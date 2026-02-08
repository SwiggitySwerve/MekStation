#!/usr/bin/env npx tsx
// Precise BV trace for Blitzkrieg BTZ-4F
import * as fs from 'fs';
import * as path from 'path';

const idx = JSON.parse(fs.readFileSync('public/data/units/battlemechs/index.json', 'utf-8'));
const report = JSON.parse(fs.readFileSync('validation-output/bv-validation-report.json', 'utf-8'));

const target = 'Blitzkrieg BTZ-4F';
const iu = idx.units.find((u: any) => `${u.chassis} ${u.model}` === target);
if (!iu) { console.log('NOT FOUND'); process.exit(1); }
const fp = path.resolve('public/data/units/battlemechs', iu.path);
const ud = JSON.parse(fs.readFileSync(fp, 'utf-8'));
const rr = report.allResults.find((r: any) => `${r.chassis} ${r.model}` === target);

console.log(`=== ${target} ===`);
console.log(`Tonnage: ${ud.tonnage}, TechBase: ${ud.techBase}`);
console.log(`Engine: ${ud.engine.type} ${ud.engine.rating}`);
console.log(`Movement: Walk=${ud.movement.walk} Jump=${ud.movement.jump || 0}`);
console.log(`Heat Sinks: ${ud.heatSinks.count} ${ud.heatSinks.type}`);
console.log(`Armor: ${ud.armor.type}, Structure: ${ud.structure.type}`);
console.log(`Cockpit: ${ud.cockpit}, Gyro: ${ud.gyro.type}`);

// Ref BV info
console.log(`\nReference BV: ${rr.indexBV}`);
console.log(`Calculated BV: ${rr.calculatedBV}`);
console.log(`Difference: ${rr.difference} (${rr.percentDiff.toFixed(2)}%)`);

if (rr.breakdown) {
  const bd = rr.breakdown;
  console.log(`\nBreakdown:`);
  console.log(`  DefensiveBV: ${bd.defensiveBV.toFixed(2)}`);
  console.log(`  OffensiveBV: ${bd.offensiveBV.toFixed(2)}`);
  console.log(`  WeaponBV: ${bd.weaponBV.toFixed(2)}`);
  console.log(`  AmmoBV: ${bd.ammoBV.toFixed(2)}`);
  console.log(`  SpeedFactor: ${bd.speedFactor.toFixed(4)}`);
  console.log(`  ExplosivePenalty: ${bd.explosivePenalty}`);
  console.log(`  DefEquipBV: ${bd.defensiveEquipBV || 0}`);
}

console.log(`\nAll Equipment:`);
for (const eq of ud.equipment) {
  console.log(`  ${JSON.stringify(eq)}`);
}

console.log(`\nCritical Slots:`);
if (ud.criticalSlots) {
  for (const [loc, slots] of Object.entries(ud.criticalSlots)) {
    const filled = (slots as any[]).filter((s: any) => s !== null && s !== '');
    if (filled.length > 0) {
      console.log(`  ${loc}: ${filled.join(', ')}`);
    }
  }
}

// Manual offensive BV calculation
const weapBV = rr.breakdown.weaponBV;
const ammoBV = rr.breakdown.ammoBV;
const weight = ud.tonnage;
const sf = rr.breakdown.speedFactor;
const baseOff = weapBV + ammoBV + weight;
console.log(`\nManual offensive calc:`);
console.log(`  baseOff = ${weapBV} + ${ammoBV} + ${weight} = ${baseOff}`);
console.log(`  offBV = ${baseOff} * ${sf} = ${(baseOff * sf).toFixed(2)}`);
console.log(`  Reported offBV: ${rr.breakdown.offensiveBV.toFixed(2)}`);

// What's the gap?
const expectedBV = rr.indexBV;
const cockpitMod = 1.0; // standard
const impliedTotal = rr.breakdown.defensiveBV + rr.breakdown.offensiveBV;
console.log(`\nTotal before cockpit: ${impliedTotal.toFixed(2)}`);
console.log(`Total after cockpit (×${cockpitMod}): ${Math.round(impliedTotal * cockpitMod)}`);
console.log(`Expected: ${expectedBV}`);
console.log(`Gap: ${expectedBV - Math.round(impliedTotal * cockpitMod)}`);

// Check: is there a physical weapon we might be missing?
console.log(`\nArmor allocation:`);
const aa = ud.armor.allocation;
let totalArmor = 0;
for (const [loc, val] of Object.entries(aa)) {
  if (typeof val === 'number') { totalArmor += val; console.log(`  ${loc}: ${val}`); }
  else if (typeof val === 'object' && val !== null) {
    const obj = val as any;
    const sum = (obj.front || 0) + (obj.rear || 0);
    totalArmor += sum;
    console.log(`  ${loc}: front=${obj.front || 0} rear=${obj.rear || 0}`);
  }
}
console.log(`  Total: ${totalArmor}`);
