const r = JSON.parse(require('fs').readFileSync('validation-output/bv-validation-report.json','utf8'));
const units = r.allResults.filter(u => {
  const pct = Math.abs(u.percentDiff);
  return pct > 1 && pct <= 5;
});
console.log('Units in 1-5% range:', units.length);

// Over vs under
const over = units.filter(u => u.percentDiff > 0);
const under = units.filter(u => u.percentDiff < 0);
console.log('Overcalculated:', over.length, '| Undercalculated:', under.length);

// Tech base breakdown
const tech = {};
for (const u of units) { const t = u.breakdown?.techBase || 'unknown'; tech[t] = (tech[t]||0)+1; }
console.log('Tech base:', JSON.stringify(tech));

// Check for common patterns
const mgaCount = units.filter(u => u.breakdown?.weaponCount > 6).length;
console.log('Units with >6 weapons:', mgaCount);

// Average diff by direction
const avgOver = over.length ? over.reduce((s,u) => s+u.percentDiff, 0)/over.length : 0;
const avgUnder = under.length ? under.reduce((s,u) => s+u.percentDiff, 0)/under.length : 0;
console.log('Avg overcalc:', avgOver.toFixed(2) + '%', '| Avg undercalc:', avgUnder.toFixed(2) + '%');

// Check halved weapon counts
const halvedUnits = units.filter(u => u.breakdown?.halvedWeaponCount > 0);
console.log('Units with halved weapons:', halvedUnits.length);
console.log('  Overcalc with halved:', halvedUnits.filter(u => u.percentDiff > 0).length);
console.log('  Undercalc with halved:', halvedUnits.filter(u => u.percentDiff < 0).length);

// Speed factor analysis
const speedIssues = units.filter(u => {
  const b = u.breakdown;
  if (!b) return false;
  return Math.abs(u.percentDiff) > 3;
});
console.log('\nUnits >3% off:', speedIssues.length);

// Check cockpit modifiers
const cockpitMods = {};
for (const u of units) { const c = u.breakdown?.cockpitModifier || 1.0; const k = c.toFixed(2); cockpitMods[k] = (cockpitMods[k]||0)+1; }
console.log('Cockpit modifiers:', JSON.stringify(cockpitMods));

// Defensive factor analysis
const defFactors = {};
for (const u of units) { const f = u.breakdown?.defensiveFactor; if (f) { const k = f.toFixed(1); defFactors[k] = (defFactors[k]||0)+1; } }
console.log('Defensive factors:', JSON.stringify(defFactors));

// Look for units with ammoBV issues
const zeroAmmo = units.filter(u => u.breakdown?.ammoBV === 0 && u.breakdown?.weaponBV > 0);
console.log('\nUnits with ammoBV=0 (possible issue):', zeroAmmo.length);

// Sample some edge cases
console.log('\n--- Top 10 undercalculated in 1-5% range ---');
under.sort((a,b) => a.percentDiff - b.percentDiff).slice(0, 10).forEach(u => {
  const b = u.breakdown || {};
  console.log(u.chassis + ' ' + u.model + ' diff=' + u.difference + ' (' + u.percentDiff.toFixed(1) + '%) weapBV=' + b.weaponBV + ' ammo=' + b.ammoBV + ' speed=' + b.speedFactor + ' halved=' + b.halvedWeaponCount + ' tech=' + b.techBase);
});

console.log('\n--- Top 10 overcalculated in 1-5% range ---');
over.sort((a,b) => b.percentDiff - a.percentDiff).slice(0, 10).forEach(u => {
  const b = u.breakdown || {};
  console.log(u.chassis + ' ' + u.model + ' diff=' + u.difference + ' (' + u.percentDiff.toFixed(1) + '%) weapBV=' + b.weaponBV + ' ammo=' + b.ammoBV + ' speed=' + b.speedFactor + ' halved=' + b.halvedWeaponCount + ' tech=' + b.techBase);
});
