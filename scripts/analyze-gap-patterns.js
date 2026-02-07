const r = JSON.parse(require('fs').readFileSync('validation-output/bv-validation-report.json','utf8'));

// Get units in the 1-5% range
const units = r.allResults.filter(u => Math.abs(u.percentDiff) > 1 && Math.abs(u.percentDiff) <= 5);

console.log('Units in 1-5% range:', units.length);

// Separate over vs under
const over = units.filter(u => u.percentDiff > 0);
const under = units.filter(u => u.percentDiff < 0);
console.log('  Overcalculated:', over.length, 'avg', (over.reduce((s,u) => s+u.percentDiff, 0)/over.length).toFixed(1) + '%');
console.log('  Undercalculated:', under.length, 'avg', (under.reduce((s,u) => s+u.percentDiff, 0)/under.length).toFixed(1) + '%');

// Check TC pattern
const tcOver = over.filter(u => {
  const b = u.breakdown || {};
  return b.hasTargetingComputer;
});
const tcUnder = under.filter(u => {
  const b = u.breakdown || {};
  return b.hasTargetingComputer;
});
console.log('\nTC units: over=' + tcOver.length + ', under=' + tcUnder.length);

// Check halving pattern
const halvOver = over.filter(u => (u.breakdown||{}).halvedWeaponCount > 0);
const halvUnder = under.filter(u => (u.breakdown||{}).halvedWeaponCount > 0);
console.log('Halved weapons: over=' + halvOver.length + ', under=' + halvUnder.length);

// Check ammo=0 pattern
const ammo0Over = over.filter(u => (u.breakdown||{}).ammoBV === 0);
const ammo0Under = under.filter(u => (u.breakdown||{}).ammoBV === 0);
console.log('ammoBV=0: over=' + ammo0Over.length + ', under=' + ammo0Under.length);

// Check tech base
const clanOver = over.filter(u => (u.breakdown||{}).techBase === 'CLAN');
const clanUnder = under.filter(u => (u.breakdown||{}).techBase === 'CLAN');
const isOver = over.filter(u => (u.breakdown||{}).techBase === 'INNER_SPHERE');
const isUnder = under.filter(u => (u.breakdown||{}).techBase === 'INNER_SPHERE');
console.log('Clan: over=' + clanOver.length + ', under=' + clanUnder.length);
console.log('IS: over=' + isOver.length + ', under=' + isUnder.length);

// Check cockpit modifier
const cockpitNon1Over = over.filter(u => (u.breakdown||{}).cockpitModifier && (u.breakdown||{}).cockpitModifier !== 1);
const cockpitNon1Under = under.filter(u => (u.breakdown||{}).cockpitModifier && (u.breakdown||{}).cockpitModifier !== 1);
console.log('Non-standard cockpit: over=' + cockpitNon1Over.length + ', under=' + cockpitNon1Under.length);

// Check unresolved weapons
const unresolvedOver = over.filter(u => (u.breakdown||{}).unresolvedWeapons && (u.breakdown||{}).unresolvedWeapons.length > 0);
const unresolvedUnder = under.filter(u => (u.breakdown||{}).unresolvedWeapons && (u.breakdown||{}).unresolvedWeapons.length > 0);
console.log('Unresolved weapons: over=' + unresolvedOver.length + ', under=' + unresolvedUnder.length);
if (unresolvedUnder.length > 0) {
  console.log('  Undercalc with unresolved:');
  for (const u of unresolvedUnder.slice(0, 10)) {
    console.log('    ' + u.chassis + ' ' + u.model + ' (' + u.percentDiff.toFixed(1) + '%): ' + (u.breakdown||{}).unresolvedWeapons.join(', '));
  }
}

// Check for issues
const issueOver = over.filter(u => u.issues && u.issues.length > 0);
const issueUnder = under.filter(u => u.issues && u.issues.length > 0);
console.log('Has issues: over=' + issueOver.length + ', under=' + issueUnder.length);

// Bin the abs percent diff
const bins = {};
for (const u of units) {
  const bin = Math.floor(Math.abs(u.percentDiff));
  bins[bin] = (bins[bin] || 0) + 1;
}
console.log('\nDistribution by integer %:');
for (const b of Object.keys(bins).sort((a,c) => Number(a)-Number(c))) {
  console.log('  ' + b + '-' + (Number(b)+1) + '%: ' + bins[b] + ' units');
}

// Look at absolute BV difference distribution
const absGaps = units.map(u => Math.abs(u.difference)).sort((a,b) => a - b);
console.log('\nAbsolute BV gap distribution:');
console.log('  min:', absGaps[0], 'max:', absGaps[absGaps.length-1], 'median:', absGaps[Math.floor(absGaps.length/2)]);

// Find units very close to 1% that we might be able to fix
const nearBorder = units.filter(u => Math.abs(u.percentDiff) <= 1.5).sort((a,b) => Math.abs(a.percentDiff) - Math.abs(b.percentDiff));
console.log('\nUnits between 1.0-1.5% (easiest to fix):');
for (const u of nearBorder) {
  const b = u.breakdown || {};
  console.log('  ' + u.chassis + ' ' + u.model + ': ' + u.percentDiff.toFixed(2) + '% diff=' + u.difference + ' tech=' + b.techBase + ' TC=' + !!b.hasTargetingComputer + ' halved=' + b.halvedWeaponCount);
}
