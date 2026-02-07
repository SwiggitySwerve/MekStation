// Analyze boundary units to find patterns for closing BV gap to 95%
const r = require('../validation-output/bv-validation-report.json');
const all = r.allResults;

// Check status values
const statuses = {};
for (const u of all) {
  statuses[u.status] = (statuses[u.status] || 0) + 1;
}
console.log('Status distribution:', JSON.stringify(statuses, null, 2));

// Find units that are NOT within 1%
const outside = all.filter(x => x.status !== 'exact' && x.status !== 'within1');
console.log('\nUnits outside 1%: ' + outside.length);

// Sort by absolute percentage difference
outside.sort((a, b) => {
  const pctA = Math.abs(a.percentDiff);
  const pctB = Math.abs(b.percentDiff);
  return pctA - pctB;
});

// Show the closest 60 (these are easiest to flip)
console.log('\n=== 60 Closest to within-1% threshold (easiest wins) ===');
const overCount = outside.filter(x => x.difference > 0).length;
const underCount = outside.filter(x => x.difference < 0).length;
console.log('Overcalculated: ' + overCount + ', Undercalculated: ' + underCount);

const name = u => (u.chassis + ' ' + u.model).trim();
for (const u of outside.slice(0, 60)) {
  const diff = u.difference;
  const pct = u.percentDiff.toFixed(2);
  const dir = diff > 0 ? 'OVER ' : 'UNDER';
  console.log(
    name(u).padEnd(44) +
    ' calc=' + String(u.calculatedBV).padStart(5) +
    ' exp=' + String(u.indexBV).padStart(5) +
    ' diff=' + String(diff).padStart(5) +
    ' (' + pct.padStart(6) + '%) ' + dir
  );
}

// Pattern analysis: root cause distribution
console.log('\n=== Root Cause Distribution (outside 1%) ===');
const rcDist = {};
for (const u of outside) {
  const rc = u.rootCause || 'unknown';
  if (!rcDist[rc]) rcDist[rc] = { count: 0, over: 0, under: 0 };
  rcDist[rc].count++;
  if (u.difference > 0) rcDist[rc].over++;
  else rcDist[rc].under++;
}
const rcSorted = Object.entries(rcDist).sort((a, b) => b[1].count - a[1].count);
for (const [rc, counts] of rcSorted) {
  console.log('  ' + rc.padEnd(30) + ' total=' + counts.count + ' over=' + counts.over + ' under=' + counts.under);
}

// Show issues for the closest 20
console.log('\n=== Issues for 20 closest ===');
for (const u of outside.slice(0, 20)) {
  const diff = u.difference;
  const pct = u.percentDiff.toFixed(2);
  console.log(name(u) + ' (diff=' + diff + ', ' + pct + '%):');
  if (u.issues && u.issues.length) {
    for (const issue of u.issues) console.log('  - ' + issue);
  }
  if (u.breakdown) {
    const b = u.breakdown;
    console.log('  defensive=' + b.defensiveBV + ' offensive=' + b.offensiveBV + ' cockpit=' + b.cockpitMod);
  }
}
