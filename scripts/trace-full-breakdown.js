// Show full BV breakdown for closest undercalculated units
const report = require('../validation-output/bv-validation-report.json');

const targets = [
  'boreas-d', 'fenris-j', 'jenner-jr10-x', 'violator-vt-u1',
  'boreas-b', 'night-stalker-nsr-k1', 'raider-mk-ii-jl-2',
  'werewolf-wer-lf-005', 'hunchback-hbk-7x-4', 'kodiak-cale',
  'amarok-3', 'jupiter-3', 'battlemaster-c', 'epimetheus-prime',
  'osteon-c'
];

for (const id of targets) {
  const u = report.allResults.find(x => x.unitId === id);
  if (!u) { console.log(id + ': NOT FOUND'); continue; }
  const name = (u.chassis + ' ' + u.model).trim();
  const b = u.breakdown;
  console.log(`=== ${name} (${id}) ===`);
  console.log(`  calc=${u.calculatedBV} exp=${u.indexBV} diff=${u.difference} (${u.percentDiff.toFixed(2)}%)`);
  if (b) {
    console.log(`  DEFENSIVE: armor=${b.armorBV?.toFixed(1)} struct=${b.structureBV?.toFixed(1)} gyro=${b.gyroBV?.toFixed(1)} defEquip=${b.defEquipBV?.toFixed(1)} explosive=${b.explosivePenalty?.toFixed(1)}`);
    console.log(`    factor=${b.defensiveFactor} tmm=${b.maxTMM} total=${b.defensiveBV?.toFixed(1)}`);
    console.log(`  OFFENSIVE: weaponBV=${b.weaponBV?.toFixed(1)} raw=${b.rawWeaponBV?.toFixed(1)} halved=${b.halvedWeaponBV?.toFixed(1)}`);
    console.log(`    ammo=${b.ammoBV?.toFixed(1)} weight=${b.weightBonus} phys=${b.physicalWeaponBV} offEquip=${b.offEquipBV}`);
    console.log(`    heatEff=${b.heatEfficiency} heatDiss=${b.heatDissipation} moveHeat=${b.moveHeat}`);
    console.log(`    speed=${b.speedFactor} total=${b.offensiveBV?.toFixed(1)}`);
    console.log(`  FINAL: cockpit=${b.cockpitType} mod=${b.cockpitModifier}`);

    // Back-calculate what defensive BV should be if offensive is correct
    const neededDef = u.indexBV / (b.cockpitModifier || 1) - b.offensiveBV;
    const defGap = neededDef - b.defensiveBV;
    // And what offensive should be if defensive is correct
    const neededOff = u.indexBV / (b.cockpitModifier || 1) - b.defensiveBV;
    const offGap = neededOff - b.offensiveBV;
    console.log(`  GAP ANALYSIS: if defBV correct → offGap=${offGap.toFixed(1)} | if offBV correct → defGap=${defGap.toFixed(1)}`);
  }
  console.log();
}
