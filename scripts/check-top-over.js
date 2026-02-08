const r = JSON.parse(require('fs').readFileSync('validation-output/bv-validation-report.json', 'utf8'));
const ids = ['seraph-c-srp-or-ravana', 'seraph-c-srp-oe-eminus', 'orochi-or-2i', 'thunder-hawk-tdk-7z', 'centurion-cn11-o', 'balius-e'];
for (const id of ids) {
  const u = r.allResults.find(x => x.unitId === id);
  if (!u) { console.log(id + ': NOT FOUND'); continue; }
  const b = u.breakdown || {};
  console.log(u.chassis + ' ' + u.model + ': ' + u.percentDiff.toFixed(2) + '% diff=' + u.difference);
  console.log('  def=' + b.defensiveBV + ' off=' + b.offensiveBV + ' cockpit=' + b.cockpitModifier + '(' + b.cockpitType + ')');
  console.log('  wpnBV=' + b.weaponBV + ' raw=' + b.rawWeaponBV + ' halved=' + b.halvedWeaponBV);
  console.log('  heatEff=' + b.heatEfficiency + ' sf=' + b.speedFactor + ' walk=' + b.walkMP + ' run=' + b.runMP + ' jump=' + b.jumpMP);
  console.log('  issues: ' + JSON.stringify(u.issues));
  console.log('');
}
