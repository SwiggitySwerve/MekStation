/**
 * Deep trace of Great Turtle GTR-1 BV calculation.
 */
import * as fs from 'fs';
import * as path from 'path';
import { resolveEquipmentBV, normalizeEquipmentId } from '../src/utils/construction/equipmentBVResolver';

const report = JSON.parse(fs.readFileSync('validation-output/bv-validation-report.json', 'utf8'));
const idx = JSON.parse(fs.readFileSync('public/data/units/battlemechs/index.json', 'utf8'));

function loadUnit(unitId: string): any {
  const ie = idx.units.find((e: any) => e.id === unitId);
  if (!ie?.path) return null;
  try { return JSON.parse(fs.readFileSync(path.join('public/data/units/battlemechs', ie.path), 'utf8')); } catch { return null; }
}

const uid = 'great-turtle-gtr-1';
const r = report.allResults.find((x: any) => x.unitId === uid);
const unit = loadUnit(uid);
const b = r.breakdown;

console.log(`${uid}: ref=${r.indexBV} calc=${r.calculatedBV} diff=${r.difference}`);
console.log(`\nBREAKDOWN:`);
console.log(`  Defensive: armorBV=${b.armorBV?.toFixed(1)} structBV=${b.structureBV?.toFixed(1)} gyroBV=${b.gyroBV?.toFixed(1)}`);
console.log(`  defEquipBV=${b.defEquipBV} amsAmmoBV=${b.amsAmmoBV} armoredBV=${b.armoredComponentBV} harjelBonus=${b.harjelBonus}`);
console.log(`  explosivePenalty=${b.explosivePenalty} defensiveFactor=${b.defensiveFactor} maxTMM=${b.maxTMM}`);
console.log(`  defensiveBV=${b.defensiveBV?.toFixed(1)}`);
console.log(`\n  Offensive: weapBV=${b.weaponBV?.toFixed(1)} rawWeapBV=${b.rawWeaponBV?.toFixed(1)}`);
console.log(`  halvedBV=${b.halvedWeaponBV} ammoBV=${b.ammoBV} weightBonus=${b.weightBonus?.toFixed(1)}`);
console.log(`  physBV=${b.physicalWeaponBV} offEquipBV=${b.offEquipBV}`);
console.log(`  heatEfficiency=${b.heatEfficiency} heatDissipation=${b.heatDissipation} moveHeat=${b.moveHeat}`);
console.log(`  speedFactor=${b.speedFactor} offensiveBV=${b.offensiveBV?.toFixed(1)}`);
console.log(`  cockpitMod=${b.cockpitModifier} cockpitType=${b.cockpitType}`);
console.log(`  walkMP=${b.walkMP} runMP=${b.runMP} jumpMP=${b.jumpMP}`);

console.log(`\nUNIT DATA:`);
console.log(`  tonnage=${unit.tonnage} techBase=${unit.techBase}`);
console.log(`  engine: ${JSON.stringify(unit.engine)}`);
console.log(`  structure: ${JSON.stringify(unit.structure)}`);
console.log(`  armor: type=${unit.armor?.type}`);
console.log(`  movement: walk=${unit.movement?.walk} run=${unit.movement?.run} jump=${unit.movement?.jump || 0}`);
console.log(`  heatSinks: count=${unit.heatSinks?.count} type=${unit.heatSinks?.type}`);
console.log(`  gyro: ${JSON.stringify(unit.gyro)}`);
console.log(`  cockpit: ${unit.cockpit}`);

// Equipment resolution
console.log(`\nEQUIPMENT RESOLUTION:`);
for (const eq of unit.equipment || []) {
  const res = resolveEquipmentBV(eq.id);
  const norm = normalizeEquipmentId(eq.id);
  console.log(`  ${eq.id.padEnd(35)} @${eq.location.padEnd(12)} → bv=${res.battleValue} heat=${res.heat} norm=${norm}`);
}

// All crit slots
console.log(`\nCRIT SLOTS:`);
for (const [loc, slots] of Object.entries(unit.criticalSlots || {})) {
  if (!Array.isArray(slots)) continue;
  const items = (slots as any[]).filter(s => s && typeof s === 'string');
  if (items.length > 0) {
    console.log(`  ${loc}: ${items.join(', ')}`);
  }
}

// Armor allocation
console.log(`\nARMOR ALLOCATION:`);
console.log(`  ${JSON.stringify(unit.armor?.allocation)}`);

// Compute what ref implies
const cockpitMod = b.cockpitModifier ?? 1;
const refBase = r.indexBV / cockpitMod;
const neededOff = refBase - b.defensiveBV;
console.log(`\nIMPLIED REFERENCE:`);
console.log(`  refBase = ${refBase.toFixed(1)}`);
console.log(`  neededOff = ${neededOff.toFixed(1)} (actual ${b.offensiveBV?.toFixed(1)})`);
console.log(`  offGap = ${(neededOff - b.offensiveBV).toFixed(1)}`);
console.log(`  neededBaseOff = ${(neededOff / b.speedFactor).toFixed(1)}`);
console.log(`  actualBaseOff = ${((b.weaponBV + b.ammoBV + (b.weightBonus || 0) + (b.physicalWeaponBV || 0) + (b.offEquipBV || 0))).toFixed(1)}`);
