const r = JSON.parse(require('fs').readFileSync('validation-output/bv-validation-report.json','utf8'));

// Group units by specific characteristics to find patterns
const units = r.allResults.filter(u => Math.abs(u.percentDiff) > 1 && Math.abs(u.percentDiff) <= 5);

console.log('=== Units 1-5% range:', units.length, '===\n');

// Check for units with weaponBV but no ammo (might be missing ammo)
const noAmmoWithBallistic = units.filter(u => {
  const b = u.breakdown || {};
  return b.ammoBV === 0 && b.weaponBV > 0 && u.percentDiff < -1;
});
console.log('Undercalculated, ammoBV=0 but have weapons:', noAmmoWithBallistic.length);
for (const u of noAmmoWithBallistic.slice(0, 5)) {
  console.log('  ' + u.chassis + ' ' + u.model + ' diff=' + u.percentDiff.toFixed(1) + '%');
}

// Check for MIXED tech base units (might have resolution issues)
const mixed = units.filter(u => (u.breakdown||{}).techBase === 'MIXED');
console.log('\nMIXED tech base units:', mixed.length);
for (const u of mixed.sort((a,b) => Math.abs(b.percentDiff) - Math.abs(a.percentDiff)).slice(0, 10)) {
  console.log('  ' + u.chassis + ' ' + u.model + ' diff=' + u.percentDiff.toFixed(1) + '% halved=' + (u.breakdown||{}).halvedWeaponCount);
}

// Check for units with high weaponBV relative to reference (overcalculation from wrong weapon values)
const overWeap = units.filter(u => u.percentDiff > 2).sort((a,b) => b.percentDiff - a.percentDiff);
console.log('\nOvercalculated >2%:', overWeap.length);
for (const u of overWeap.slice(0, 10)) {
  const b = u.breakdown || {};
  console.log('  ' + u.chassis + ' ' + u.model + ': diff=' + u.percentDiff.toFixed(1) + '% weap=' + b.weaponBV + ' ammo=' + b.ammoBV + ' sf=' + b.speedFactor + ' df=' + b.defensiveFactor);
}

// Check for pattern: units with exact same speedFactor and similar diffs
const sfGroups = {};
for (const u of units) {
  const sf = (u.breakdown||{}).speedFactor;
  if (!sf) continue;
  if (!sfGroups[sf]) sfGroups[sf] = [];
  sfGroups[sf].push(u);
}
console.log('\nSpeed factor groups with >5 units and avg diff > 1%:');
for (const [sf, group] of Object.entries(sfGroups).sort(([a],[b]) => Number(a)-Number(b))) {
  if (group.length < 5) continue;
  const avgDiff = group.reduce((s,u) => s + u.percentDiff, 0) / group.length;
  if (Math.abs(avgDiff) > 1) {
    console.log('  SF=' + sf + ': count=' + group.length + ' avgDiff=' + avgDiff.toFixed(2) + '%');
  }
}

// Check for units near the 1% boundary that might benefit from specific fixes
const near1pct = units.filter(u => Math.abs(u.percentDiff) <= 1.2);
console.log('\nUnits 1.0-1.2% (closest to boundary):', near1pct.length);
// What's the most common absolute BV gap in this range?
const gaps = near1pct.map(u => Math.abs(u.difference));
console.log('  Average absolute gap:', (gaps.reduce((s,g) => s+g, 0)/gaps.length).toFixed(1), 'BV');
console.log('  If we could fix these, we would gain', near1pct.length, 'more within-1% units');

// Check for OmniMech pattern
const fs = require('fs');
const path = require('path');
function findJsonFiles(dir) {
  const results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) results.push(...findJsonFiles(full));
    else if (entry.name.endsWith('.json') && entry.name !== 'index.json') results.push(full);
  }
  return results;
}
const unitDir = 'public/data/units/battlemechs';
const allFiles = findJsonFiles(unitDir);
const unitMap = new Map();
for (const f of allFiles) {
  try { const d = JSON.parse(fs.readFileSync(f, 'utf8')); unitMap.set(d.id, d); } catch {}
}

let omniCount = 0, omniOver = 0, omniUnder = 0;
for (const u of units) {
  const data = unitMap.get(u.unitId);
  if (!data) continue;
  // OmniMechs tend to have model names like "Prime", "A", "B", "C", etc.
  const crits = JSON.stringify(data.criticalSlots || {});
  if (crits.includes('OMNIPOD')) {
    omniCount++;
    if (u.percentDiff > 0) omniOver++; else omniUnder++;
  }
}
console.log('\nOmniMech units in 1-5%:', omniCount, '(over:', omniOver, 'under:', omniUnder + ')');
