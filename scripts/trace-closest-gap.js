// Trace the closest undercalculated units to find systematic patterns
const fs = require('fs');
const path = require('path');

const report = require('../validation-output/bv-validation-report.json');
const unitIdx = JSON.parse(fs.readFileSync(path.join(__dirname, '../public/data/units/battlemechs/index.json'), 'utf8'));

// Get units just outside 1% threshold, undercalculated
const boundary = report.allResults.filter(u => {
  const pct = Math.abs(u.percentDiff);
  return pct > 1.0 && pct <= 2.0 && u.difference < 0;
});
boundary.sort((a, b) => Math.abs(a.percentDiff) - Math.abs(b.percentDiff));

console.log(`=== ${boundary.length} undercalculated units between 1-2% off ===\n`);

for (const u of boundary.slice(0, 25)) {
  const entry = unitIdx.units.find(x => x.id === u.unitId);
  if (!entry) { console.log(u.unitId + ': NOT FOUND IN INDEX'); continue; }

  const unitPath = path.join(__dirname, '../public/data/units/battlemechs', entry.path);
  const unit = JSON.parse(fs.readFileSync(unitPath, 'utf8'));

  const name = (u.chassis + ' ' + u.model).trim();
  console.log(`--- ${name} (${u.unitId}) ---`);
  console.log(`  calc=${u.calculatedBV} exp=${u.indexBV} diff=${u.difference} (${u.percentDiff.toFixed(2)}%)`);
  console.log(`  tonnage=${unit.tonnage} tech=${unit.techBase} engine=${unit.engine?.type}`);
  console.log(`  walk=${unit.movement?.walk} run=${unit.movement?.run} jump=${unit.movement?.jump || 0}`);
  console.log(`  cockpit=${unit.cockpit} gyro=${unit.gyro}`);
  console.log(`  armor=${unit.armorType} structure=${unit.structureType}`);

  const b = u.breakdown;
  if (b) {
    console.log(`  === Breakdown ===`);
    console.log(`  defBV=${b.defensiveBV?.toFixed(1)} offBV=${b.offensiveBV?.toFixed(1)} cockpitMod=${b.cockpitModifier}`);
    console.log(`  weaponBV=${b.weaponBV?.toFixed(1)} rawWeaponBV=${b.rawWeaponBV?.toFixed(1)} halvedBV=${b.halvedWeaponBV?.toFixed(1)}`);
    console.log(`  ammoBV=${b.ammoBV?.toFixed(1)} weightBonus=${b.weightBonus} physBV=${b.physicalWeaponBV}`);
    console.log(`  heatEff=${b.heatEfficiency} heatDiss=${b.heatDissipation} moveHeat=${b.moveHeat}`);
    console.log(`  speedFactor=${b.speedFactor} defFactor=${b.defensiveFactor}`);

    // Back-calculate what the weapon BV would need to be
    if (b.speedFactor && b.cockpitModifier) {
      const neededTotal = u.indexBV / b.cockpitModifier;
      const neededOff = neededTotal - b.defensiveBV;
      const neededBase = neededOff / b.speedFactor;
      const neededWeapon = neededBase - (b.ammoBV || 0) - b.weightBonus - (b.physicalWeaponBV || 0) - (b.offEquipBV || 0);
      const weaponGap = neededWeapon - b.weaponBV;
      console.log(`  → needed weaponBV=${neededWeapon.toFixed(1)} (gap=${weaponGap.toFixed(1)})`);
    }
  }

  // Check equipment/weapons
  if (unit.equipment) {
    const weapons = unit.equipment.filter(e => e.type !== 'Ammo');
    const ammo = unit.equipment.filter(e => e.type === 'Ammo');
    console.log(`  weapons: ${weapons.map(w => w.name || w.id).join(', ')}`);
    if (ammo.length) console.log(`  ammo: ${ammo.map(a => a.name || a.id).join(', ')}`);
  }

  if (u.issues && u.issues.length) {
    console.log(`  issues: ${u.issues.join('; ')}`);
  }
  console.log();
}
