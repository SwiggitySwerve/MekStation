import * as fs from 'fs';
import * as path from 'path';

const r = JSON.parse(fs.readFileSync('validation-output/bv-validation-report.json', 'utf8'));
const unitsDir = 'public/data/units/battlemechs';
const index = JSON.parse(fs.readFileSync(path.join(unitsDir, 'index.json'), 'utf8'));

// Manually compute expected defensive components for comparison
function calcTotalArmor(a: any): number {
  let t = 0;
  for (const v of Object.values(a)) {
    if (typeof v === 'number') t += v;
    else if (v && typeof v === 'object') t += ((v as any).front || 0) + ((v as any).rear || 0);
  }
  return t;
}

// Pick a mix of units: some wrong, some exact, across categories
const targets = [
  'flea-fle-14', 'koshi-a', 'uller-c', 'osteon-u', 'malice-mal-yz',
  'atlas-as7-d', 'centurion-cn9-d', 'grasshopper-ghr-7x',
  'wolverine-wvr-7d', 'commando-com-9s',
];

for (const id of targets) {
  const res = r.allResults.find((x: any) => x.unitId === id);
  if (!res || !res.breakdown) { console.log(`${id}: NOT FOUND or no breakdown`); continue; }
  const b = res.breakdown;
  const entry = index.units.find((e: any) => e.id === id);
  if (!entry || !entry.path) continue;
  const d = JSON.parse(fs.readFileSync(path.join(unitsDir, entry.path), 'utf8'));

  console.log(`\n=== ${id} ===`);
  console.log(`idx=${res.indexBV} calc=${res.calculatedBV} diff=${res.difference} (${res.percentDiff.toFixed(1)}%)`);
  console.log(`${d.tonnage}t ${d.techBase} ${d.engine.type} ER=${d.engine.rating}`);
  console.log(`armor=${d.armor.type} struct=${d.structure.type} cockpit=${d.cockpit || 'STANDARD'} gyro=${d.gyro?.type || 'STANDARD'}`);
  console.log(`walk=${d.movement.walk} jump=${d.movement.jump || 0} HS=${d.heatSinks.type}(${d.heatSinks.count})`);
  console.log(`  defBV=${b.defensiveBV.toFixed(1)} offBV=${b.offensiveBV.toFixed(1)}`);
  console.log(`  armorBV=${(b.armorBV ?? 0).toFixed(1)} structBV=${(b.structureBV ?? 0).toFixed(1)} gyroBV=${(b.gyroBV ?? 0).toFixed(1)} defFactor=${(b.defensiveFactor ?? 0).toFixed(2)}`);
  console.log(`  defEquip=${b.defensiveEquipBV} explPen=${b.explosivePenalty}`);
  console.log(`  weapBV=${b.weaponBV} ammoBV=${b.ammoBV} speedF=${b.speedFactor}`);

  // Compute baseDef from components
  const baseDef = (b.armorBV ?? 0) + (b.structureBV ?? 0) + (b.gyroBV ?? 0) + b.defensiveEquipBV - b.explosivePenalty;
  const expectedDefBV = baseDef * (b.defensiveFactor ?? 1);
  console.log(`  baseDef=${baseDef.toFixed(1)} baseDef*defFactor=${expectedDefBV.toFixed(1)} (reported defBV=${b.defensiveBV.toFixed(1)})`);

  // What should defBV be to match indexBV?
  let cockpitMod = 1.0;
  const cockpit = (d.cockpit || 'STANDARD').toUpperCase();
  if (cockpit.includes('SMALL') || cockpit.includes('TORSO')) cockpitMod = 0.95;
  if (cockpit.includes('INTERFACE')) cockpitMod = 1.3;

  const neededBaseBV = res.indexBV / cockpitMod;
  const neededDefBV = neededBaseBV - b.offensiveBV;
  const neededBaseDef = neededDefBV / (b.defensiveFactor ?? 1);
  console.log(`  neededDefBV=${neededDefBV.toFixed(1)} neededBaseDef=${neededBaseDef.toFixed(1)} baseDefGap=${(neededBaseDef - baseDef).toFixed(1)}`);

  // Compute manual armor points
  const totalArmor = calcTotalArmor(d.armor.allocation);
  console.log(`  totalArmorPts=${totalArmor}`);
}
