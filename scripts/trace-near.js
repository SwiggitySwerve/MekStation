const r = require('../validation-output/bv-validation-report.json');
const ids = ['kodiak-cale','perseus-p1e','marauder-c','epimetheus-prime','night-stalker-nsr-k1','malice-mal-xp'];
for (const id of ids) {
  const u = r.allResults.find(x => x.unitId === id);
  if (!u) continue;
  const b = u.breakdown;
  console.log(`${id}: idx=${u.indexBV} calc=${u.calculatedBV} gap=${u.difference} (${(u.percentDiff||0).toFixed(2)}%)`);
  console.log(`  weap=${b.weaponBV} ammo=${b.ammoBV} phys=${b.physicalWeaponBV} wt=${b.weightBonus} SF=${b.speedFactor}`);
  console.log(`  armor=${b.armorBV} struct=${b.structureBV} gyro=${b.gyroBV} defEq=${b.defEquipBV} expl=${b.explosivePenalty}`);
  console.log(`  def=${b.defensiveBV} off=${b.offensiveBV} cockpit=${b.cockpitModifier} defFactor=${b.defensiveFactor}`);
  console.log(`  heat: eff=${b.heatEfficiency} diss=${b.heatDissipation} move=${b.moveHeat}`);
  console.log(`  issues=${JSON.stringify(b.issues || [])}`);
  console.log();
}
