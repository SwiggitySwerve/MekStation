const r = JSON.parse(require('fs').readFileSync('validation-output/bv-validation-report.json','utf8'));
const units = r.allResults.filter(u => {
  const pct = Math.abs(u.percentDiff);
  return pct > 1 && pct <= 5 && u.breakdown?.ammoBV === 0;
});
console.log('Units in 1-5% with ammoBV=0:', units.length);
units.sort((a,b) => a.percentDiff - b.percentDiff);
for (const u of units) {
  const b = u.breakdown || {};
  console.log(u.chassis + ' ' + u.model + ' diff=' + u.difference + ' (' + u.percentDiff.toFixed(1) + '%) weapBV=' + b.weaponBV + ' weapCount=' + b.weaponCount + ' tech=' + b.techBase + ' config=' + (b.configuration || 'Biped'));
}
