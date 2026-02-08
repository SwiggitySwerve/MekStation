import * as fs from 'fs';
import * as path from 'path';
const r = JSON.parse(fs.readFileSync('validation-output/bv-validation-report.json', 'utf8'));
const idx = JSON.parse(fs.readFileSync('public/data/units/battlemechs/index.json', 'utf8'));

// Import production functions
const { calculateDefensiveBV, calculateOffensiveBVWithHeatTracking, calculateTMM } = require('../src/utils/construction/battleValueCalculations');
const { resolveEquipmentBV } = require('../src/utils/construction/equipmentBVResolver');
const { getArmorBVMultiplier, getCockpitModifier } = require('../src/types/validation/BattleValue');
const { EngineType } = require('../src/types/construction/EngineType');

// Trace a simpler unit: Cougar T (35t Clan, straightforward)
const uid = 'cougar-t';
const ie = idx.units.find((u: any) => u.id === uid);
const d = JSON.parse(fs.readFileSync(path.join('public/data/units/battlemechs', ie.path), 'utf8'));

console.log('=== COUGAR T MANUAL BV TRACE ===');
console.log(`Tonnage: ${d.tonnage}, Walk: ${d.movement.walk}, Jump: ${d.movement.jump || 0}`);
console.log(`Engine: ${d.engine.type}, HS: ${d.heatSinks.type} × ${d.heatSinks.count}`);
console.log(`Armor: ${d.armor.type}, Structure: ${d.structure.type}`);

// Count armor
let totalArmor = 0;
for (const [loc, val] of Object.entries(d.armor.allocation)) {
  if (typeof val === 'number') totalArmor += val;
  else { const v = val as any; totalArmor += (v.front || 0) + (v.rear || 0); }
}
console.log(`Total armor: ${totalArmor}`);

// Count IS points
const { STRUCTURE_POINTS_TABLE } = require('../src/types/construction/InternalStructureType');
const isTable = STRUCTURE_POINTS_TABLE[d.tonnage];
if (isTable) {
  const totalIS = isTable.head + isTable.centerTorso + isTable.sideTorso * 2 + isTable.arm * 2 + isTable.leg * 2;
  console.log(`Standard IS points: ${totalIS}`);
}

// Check all crit slots for relevant equipment
const allSlots: string[] = [];
let hsCount = 0;
for (const [loc, slots] of Object.entries(d.criticalSlots || {})) {
  for (const s of (slots as string[])) {
    if (!s) continue;
    allSlots.push(s);
    if (s.toLowerCase().includes('heatsink') || s.toLowerCase().includes('heat sink')) hsCount++;
  }
}

// Count DHS from crits (each Clan DHS = 2 slots, IS DHS = 3 slots)
const dhsSlots = allSlots.filter(s => s.toLowerCase().includes('doubleheatsink') || s.toLowerCase().includes('double heat sink'));
const isClanDHS = d.techBase === 'CLAN' || d.heatSinks.type === 'DOUBLE_CLAN';
const slotsPerDHS = isClanDHS ? 2 : 3;
const externalDHS = Math.floor(dhsSlots.length / slotsPerDHS);
const engineRating = d.engine.rating;
const integralHS = Math.min(10, Math.floor(engineRating / 25));
const totalHS = integralHS + externalDHS;
console.log(`DHS crit slots: ${dhsSlots.length}, external DHS: ${externalDHS}, integral: ${integralHS}, total: ${totalHS}`);
console.log(`Unit JSON HS count: ${d.heatSinks.count}`);
console.log(`Heat dissipation: ${totalHS * 2}`);

// Equipment
console.log(`\nEquipment: ${d.equipment.map((e: any) => `${e.id}@${e.location}`).join(', ')}`);

// Check what BV the weapons resolve to
const { resolveWeaponForUnit } = require('../scripts/validate-bv');
// Actually, we can't import from validate-bv easily. Let me just manually resolve.

// Check weapon BV
for (const eq of d.equipment) {
  const result = resolveEquipmentBV(eq.id);
  const clanResult = resolveEquipmentBV('clan-' + eq.id);
  console.log(`  ${eq.id}: IS_BV=${result.battleValue} Clan_BV=${clanResult.battleValue}`);
}

// Check crit slots for TC, ECM, etc.
const critTC = allSlots.some(s => s.toLowerCase().includes('targeting'));
const critECM = allSlots.some(s => s.toLowerCase().includes('ecm'));
const critProbe = allSlots.some(s => s.toLowerCase().includes('probe') || s.toLowerCase().includes('active'));
console.log(`\nCrit TC: ${critTC}, ECM: ${critECM}, Probe: ${critProbe}`);

// Manual BV calculation
const armorMult = getArmorBVMultiplier(d.armor.type.toLowerCase().replace(/_/g, '-').replace('clan', '').trim() || 'ferro-fibrous-clan');
console.log(`\nArmor mult lookup: ${armorMult}`);

// Try common armor type names
for (const name of ['ferro-fibrous-clan', 'ferro_fibrous_clan', 'clan-ferro-fibrous', 'ferro-fibrous', 'FERRO_FIBROUS_CLAN']) {
  console.log(`  getArmorBVMultiplier('${name}'): ${getArmorBVMultiplier(name)}`);
}

// Get validation result
const res = r.allResults.find((x: any) => x.unitId === uid);
console.log(`\nValidation result:`);
console.log(`  calc=${res.calculatedBV}, ref=${res.indexBV}, diff=${res.difference}`);
console.log(`  def=${res.breakdown.defensiveBV}, off=${res.breakdown.offensiveBV}`);
console.log(`  armorBV=${res.breakdown.armorBV}, structBV=${res.breakdown.structureBV}, gyroBV=${res.breakdown.gyroBV}`);
console.log(`  defEquipBV=${res.breakdown.defensiveEquipBV}, pen=${res.breakdown.explosivePenalty}`);
console.log(`  defFactor=${res.breakdown.defensiveFactor}`);
console.log(`  weaponBV=${res.breakdown.weaponBV}, ammoBV=${res.breakdown.ammoBV}, sf=${res.breakdown.speedFactor}`);

// Try computing what the gap components are
// If defensive is correct, off gap = total gap
// If offensive is correct, def gap = total gap
const defBV = res.breakdown.defensiveBV;
const offBV = res.breakdown.offensiveBV;
const totalCalc = defBV + offBV;
const expectedTotal = res.indexBV;
const totalGap = expectedTotal - totalCalc;
console.log(`\nGap analysis: total=${totalGap}`);
console.log(`  If gap is in def: defBV should be ${defBV + totalGap}`);
console.log(`  If gap is in off: offBV should be ${offBV + totalGap}`);
// What defensive factor would close the gap?
const baseDef = (res.breakdown.armorBV + res.breakdown.structureBV + res.breakdown.gyroBV + res.breakdown.defensiveEquipBV - res.breakdown.explosivePenalty);
const neededDefFactor = (defBV + totalGap) / baseDef;
console.log(`  Needed defFactor for def gap: ${neededDefFactor.toFixed(4)} (current: ${res.breakdown.defensiveFactor})`);
// What speedFactor would close the gap?
const rawOff = offBV / res.breakdown.speedFactor;
const neededSF = (offBV + totalGap) / rawOff;
console.log(`  Needed speedFactor for off gap: ${neededSF.toFixed(4)} (current: ${res.breakdown.speedFactor})`);
