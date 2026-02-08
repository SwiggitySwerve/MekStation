const fs = require('fs');
const r = JSON.parse(fs.readFileSync('validation-output/bv-validation-report.json', 'utf8'));

const outside1 = r.allResults.filter(u => Math.abs(u.percentDiff) > 1);

// Group by exact gap value
const gapGroups = {};
for (const u of outside1) {
  const gap = u.difference;
  gapGroups[gap] = gapGroups[gap] || [];
  gapGroups[gap].push(u);
}

console.log('=== Common exact BV gaps (outside 1%) ===\n');
const multiGaps = Object.entries(gapGroups)
  .filter(([, units]) => units.length >= 2)
  .sort((a, b) => b[1].length - a[1].length);

for (const [gap, units] of multiGaps) {
  console.log(`Gap = ${gap}: ${units.length} units`);
  for (const u of units) {
    const b = u.breakdown || {};
    console.log(`  ${u.chassis} ${u.model}: ${u.percentDiff.toFixed(2)}% ref=${u.indexBV} tech=${b.techBase} cockpit=${b.cockpitType || 'std'}`);
  }
}

// Also check: cluster analysis - what gap ranges are most common?
const gapRanges = { '1-10': 0, '11-20': 0, '21-30': 0, '31-50': 0, '51-100': 0, '>100': 0 };
for (const u of outside1) {
  const ag = Math.abs(u.difference);
  if (ag <= 10) gapRanges['1-10']++;
  else if (ag <= 20) gapRanges['11-20']++;
  else if (ag <= 30) gapRanges['21-30']++;
  else if (ag <= 50) gapRanges['31-50']++;
  else if (ag <= 100) gapRanges['51-100']++;
  else gapRanges['>100']++;
}
console.log('\n=== Gap magnitude distribution ===');
for (const [range, count] of Object.entries(gapRanges)) {
  console.log(`  ${range} BV: ${count} units`);
}

// Check: for overcalculated units, what is gap / speedFactor? (normalized to pre-SF value)
console.log('\n=== Overcalculated: gap / (speedFactor * cockpitMod) ===');
const normalizedGaps = {};
for (const u of outside1.filter(x => x.percentDiff > 1)) {
  const b = u.breakdown || {};
  const sf = b.speedFactor || 1;
  const cm = b.cockpitModifier || 1;
  const normalized = Math.round(u.difference / sf / cm);
  normalizedGaps[normalized] = normalizedGaps[normalized] || [];
  normalizedGaps[normalized].push(u);
}
const multiNorm = Object.entries(normalizedGaps)
  .filter(([, units]) => units.length >= 2)
  .sort((a, b) => b[1].length - a[1].length);
for (const [norm, units] of multiNorm) {
  console.log(`  Norm gap ~${norm}: ${units.length} units - ${units.map(u => u.chassis + ' ' + u.model).join(', ')}`);
}

// Similarly for undercalculated
console.log('\n=== Undercalculated: gap / (speedFactor * cockpitMod) ===');
const normUnder = {};
for (const u of outside1.filter(x => x.percentDiff < -1)) {
  const b = u.breakdown || {};
  const sf = b.speedFactor || 1;
  const cm = b.cockpitModifier || 1;
  const normalized = Math.round(u.difference / sf / cm);
  normUnder[normalized] = normUnder[normalized] || [];
  normUnder[normalized].push(u);
}
const multiNormU = Object.entries(normUnder)
  .filter(([, units]) => units.length >= 2)
  .sort((a, b) => b[1].length - a[1].length);
for (const [norm, units] of multiNormU) {
  console.log(`  Norm gap ~${norm}: ${units.length} units - ${units.map(u => u.chassis + ' ' + u.model).join(', ')}`);
}
