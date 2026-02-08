const r = JSON.parse(require('fs').readFileSync('validation-output/bv-validation-report.json','utf8'));
const targets = ['jade-phoenix-d', 'great-turtle-gtr-1', 'revenant-ubm-1a', 'mauler-mal-1x', 'merlin-mln-sx', 'shogun-c-2'];
for (const t of targets) {
  const u = r.allResults.find(x => x.unitId && x.unitId.includes(t));
  if (!u) { console.log('NOT FOUND:', t); continue; }
  const b = u.breakdown || {};
  console.log('\n=== ' + u.chassis + ' ' + u.model + ' (' + u.unitId + ') ===');
  console.log('ref=' + u.indexBV + ' calc=' + u.calculatedBV + ' diff=' + u.difference + ' (' + u.percentDiff.toFixed(1) + '%)');
  console.log('DEF: armor=' + b.armorBV + ' struct=' + b.structureBV + ' gyro=' + b.gyroBV + ' defEq=' + b.defEquipBV + ' expl=' + b.explosivePenalty + ' factor=' + b.defensiveFactor + ' total=' + b.defensiveBV);
  console.log('OFF: weapBV=' + b.weaponBV + ' rawWeap=' + b.rawWeaponBV + ' ammo=' + b.ammoBV + ' phys=' + b.physicalWeaponBV + ' wt=' + b.weightBonus + ' offEq=' + b.offensiveEquipBV);
  console.log('     speed=' + b.speedFactor + ' heatEff=' + b.heatEfficiency + ' offTotal=' + b.offensiveBV + ' halved=' + b.halvedWeaponCount);
  console.log('     walk=' + b.walkMP + ' run=' + b.runMP + ' jump=' + b.jumpMP + ' cockpit=' + b.cockpitModifier);
  console.log('     heatDiss=' + b.heatDissipation + ' moveHeat=' + b.moveHeat + ' weapCount=' + b.weaponCount);
  console.log('     TC=' + b.hasTargetingComputer + ' config=' + b.configuration + ' tech=' + b.techBase);
  if (b.unresolvedWeapons && b.unresolvedWeapons.length > 0) console.log('     UNRESOLVED:', b.unresolvedWeapons);
}
