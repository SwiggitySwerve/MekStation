const r = JSON.parse(require('fs').readFileSync('./validation-output/bv-validation-report.json','utf8'));
const targets = ['prey-seeker', 'revenant-ubm', 'jade-phoenix-d', 'fox-cs-1', 'great-turtle-gtr-1', 'merlin-mln-sx', 'shogun-c-2', 'mauler-mal-1x'];
for (const t of targets) {
  const u = r.allResults.find(x => x.unitId && x.unitId.includes(t));
  if (!u) { console.log('NOT FOUND: ' + t); continue; }
  const b = u.breakdown || {};
  console.log('\n=== ' + u.chassis + ' ' + u.model + ' ===');
  console.log('ref=' + u.indexBV + ' calc=' + u.calculatedBV + ' diff=' + u.difference + ' (' + u.percentDiff.toFixed(1) + '%)');
  console.log('tech=' + b.techBase + ' tonnage=' + u.tonnage + ' config=' + (b.configuration||'Biped'));
  console.log('DEF: armor=' + b.armorBV + ' struct=' + b.structureBV + ' gyro=' + b.gyroBV + ' defEq=' + b.defEquipBV + ' expl=' + b.explosivePenalty + ' factor=' + b.defensiveFactor + ' total=' + b.defensiveBV);
  console.log('OFF: weapBV=' + b.weaponBV + ' rawWeap=' + b.rawWeaponBV + ' ammo=' + b.ammoBV + ' phys=' + b.physicalWeaponBV + ' wt=' + b.weightBonus + ' offEq=' + b.offensiveEquipBV);
  console.log('     speed=' + b.speedFactor + ' heatEff=' + b.heatEfficiency + ' offTotal=' + b.offensiveBV);
  console.log('     walk=' + b.walkMP + ' run=' + b.runMP + ' jump=' + b.jumpMP + ' cockpit=' + b.cockpitModifier);
  console.log('     heatDiss=' + b.heatDissipation + ' weapCount=' + b.weaponCount + ' halved=' + b.halvedWeaponCount);
  if (u.issues && u.issues.length > 0) console.log('issues: ' + u.issues.join('; '));
}
