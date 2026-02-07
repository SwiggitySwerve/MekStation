/**
 * Exact weapon trace for specific IS units in the 1-2% undercalculated band.
 * Compare raw weapon BV sum vs validation weapBV.
 */
import * as fs from 'fs';
import * as path from 'path';

const report = JSON.parse(fs.readFileSync('validation-output/bv-validation-report.json', 'utf8'));
const idx = JSON.parse(fs.readFileSync('public/data/units/battlemechs/index.json', 'utf8'));

function loadUnit(unitId: string): any {
  const ie = idx.units.find((e: any) => e.id === unitId);
  if (!ie?.path) return null;
  try { return JSON.parse(fs.readFileSync(path.join('public/data/units/battlemechs', ie.path), 'utf8')); } catch { return null; }
}

// Check specific IS units
const targets = [
  'flashman-fls-c',       // IS, 75t, diff=-31, weapBV=542
  'goliath-gol-7k',       // IS, 80t, diff=-31, weapBV=508
  'thanatos-tns-6s',      // IS, 75t, diff=-35, weapBV=578
  'hachiwara-hca-3t',     // IS, 70t
  'commando-com-9s',      // IS, 25t
  'enforcer-iii-enf-7d',  // IS, 50t
];

for (const uid of targets) {
  const r = report.allResults.find((x: any) => x.unitId === uid);
  const unit = loadUnit(uid);
  if (!r || !unit) { console.log(`${uid}: NOT FOUND`); continue; }

  const b = r.breakdown;
  console.log(`\n${'='.repeat(70)}`);
  console.log(`${uid} (${unit.techBase}, ${unit.tonnage}t) ref=${r.indexBV} calc=${r.calculatedBV} diff=${r.difference}`);
  console.log(`  weapBV=${b.weaponBV?.toFixed(1)} rawWeapBV=${b.rawWeaponBV?.toFixed(1)} halvedBV=${b.halvedWeaponBV?.toFixed(1)} halvedCt=${b.halvedWeaponCount}/${b.weaponCount}`);
  console.log(`  ammoBV=${b.ammoBV} weightBonus=${b.weightBonus?.toFixed(1)} physBV=${b.physicalWeaponBV?.toFixed(1)} offEquip=${b.offEquipBV}`);
  console.log(`  HE=${b.heatEfficiency} heatDiss=${b.heatDissipation} moveHeat=${b.moveHeat}`);
  console.log(`  SF=${b.speedFactor} defBV=${b.defensiveBV?.toFixed(1)} offBV=${b.offensiveBV?.toFixed(1)}`);
  console.log(`  HS: count=${unit.heatSinks?.count} type=${unit.heatSinks?.type}`);
  console.log(`  Movement: walk=${unit.movement?.walk} jump=${unit.movement?.jump || 0}`);

  // List ALL equipment entries
  console.log(`  EQUIPMENT LIST (${unit.equipment?.length || 0} entries):`);
  for (const eq of unit.equipment || []) {
    console.log(`    ${eq.id.padEnd(40)} @${eq.location}`);
  }

  // List all crit slot items
  if (unit.criticalSlots) {
    console.log(`  CRIT SLOTS:`);
    for (const [loc, slots] of Object.entries(unit.criticalSlots)) {
      if (!Array.isArray(slots)) continue;
      const items = (slots as any[]).filter(s => s && typeof s === 'string');
      if (items.length > 0) {
        console.log(`    ${loc}: ${items.join(', ')}`);
      }
    }
  }

  // Compute expected baseOff = weapBV + ammoBV + weightBonus + physBV + offEquip
  const baseOff = (b.weaponBV ?? 0) + (b.ammoBV ?? 0) + (b.weightBonus ?? 0) + (b.physicalWeaponBV ?? 0) + (b.offEquipBV ?? 0);
  const expectedOffBV = baseOff * b.speedFactor;
  console.log(`  CHECK: baseOff=${baseOff.toFixed(1)} × SF=${b.speedFactor} = ${expectedOffBV.toFixed(1)} (reported offBV=${b.offensiveBV?.toFixed(1)})`);

  // What offBV would be needed?
  const cockpit = b.cockpitModifier ?? 1;
  const neededOffBV = r.indexBV / cockpit - b.defensiveBV;
  console.log(`  NEEDED offBV=${neededOffBV.toFixed(1)} (gap=${(neededOffBV - b.offensiveBV).toFixed(1)})`);
  console.log(`  NEEDED baseOff=${(neededOffBV / b.speedFactor).toFixed(1)} (current=${baseOff.toFixed(1)}, gap=${(neededOffBV / b.speedFactor - baseOff).toFixed(1)})`);
}
