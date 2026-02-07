const r = JSON.parse(require('fs').readFileSync('validation-output/bv-validation-report.json','utf8'));

// Check if defensive factor distribution correlates with error direction
const units = r.allResults.filter(u => Math.abs(u.percentDiff) > 0.1 && u.breakdown);

// Group by defensive factor
const byFactor = {};
for (const u of units) {
  const f = u.breakdown.defensiveFactor;
  if (!f) continue;
  if (!byFactor[f]) byFactor[f] = { over: 0, under: 0, total: 0 };
  byFactor[f].total++;
  if (u.percentDiff > 0) byFactor[f].over++;
  else byFactor[f].under++;
}
console.log('Defensive factor distribution:');
for (const [f, v] of Object.entries(byFactor).sort(([a],[b]) => Number(a)-Number(b))) {
  console.log('  factor=' + f + ': total=' + v.total + ' over=' + v.over + ' under=' + v.under + ' bias=' + (v.over > v.under ? '+OVER' : v.under > v.over ? '-UNDER' : 'EVEN'));
}

// Check speed factor distribution
const bySF = {};
for (const u of units) {
  const sf = u.breakdown.speedFactor;
  if (!sf) continue;
  const sfBin = Math.round(sf * 10) / 10;
  if (!bySF[sfBin]) bySF[sfBin] = { over: 0, under: 0, total: 0 };
  bySF[sfBin].total++;
  if (u.percentDiff > 0) bySF[sfBin].over++;
  else bySF[sfBin].under++;
}
console.log('\nSpeed factor distribution (binned):');
for (const [f, v] of Object.entries(bySF).sort(([a],[b]) => Number(a)-Number(b))) {
  if (v.total < 3) continue;
  console.log('  sf~' + f + ': total=' + v.total + ' over=' + v.over + ' under=' + v.under);
}

// Check weight bonus - is it always = tonnage?
let weightMismatch = 0;
for (const u of units) {
  const b = u.breakdown;
  if (!b || !b.weightBonus) continue;
  // Find unit tonnage from unitId
  const entry = r.allResults.find(x => x.unitId === u.unitId);
  if (!entry) continue;
  // Weight bonus should equal tonnage
  // But we need tonnage from somewhere... check if it's in the breakdown
}

// Check explosive penalty patterns
console.log('\nExplosive penalty analysis:');
const withExpl = units.filter(u => u.breakdown.explosivePenalty > 0);
const explOver = withExpl.filter(u => u.percentDiff > 0);
const explUnder = withExpl.filter(u => u.percentDiff < 0);
console.log('  Units with explosive penalty:', withExpl.length);
console.log('  Over:', explOver.length, 'Under:', explUnder.length);

// Check for units with very high explosive penalty relative to defensive BV
const highExpl = withExpl.filter(u => {
  const b = u.breakdown;
  const baseDef = b.armorBV + b.structureBV + b.gyroBV + b.defEquipBV;
  return b.explosivePenalty > baseDef * 0.1; // penalty > 10% of base
}).sort((a,b) => Math.abs(b.percentDiff) - Math.abs(a.percentDiff));
console.log('  High explosive penalty (>10% of base):', highExpl.length);
for (const u of highExpl.slice(0, 10)) {
  const b = u.breakdown;
  console.log('    ' + u.chassis + ' ' + u.model + ': penalty=' + b.explosivePenalty + ' base=' + (b.armorBV+b.structureBV+b.gyroBV) + ' diff=' + u.percentDiff.toFixed(1) + '%');
}

// Check cockpit modifier distribution
console.log('\nCockpit modifier analysis:');
const byCockpit = {};
for (const u of units) {
  const cm = u.breakdown.cockpitModifier || 1;
  if (!byCockpit[cm]) byCockpit[cm] = { over: 0, under: 0, total: 0, avgDiff: 0 };
  byCockpit[cm].total++;
  byCockpit[cm].avgDiff += u.percentDiff;
  if (u.percentDiff > 0) byCockpit[cm].over++;
  else byCockpit[cm].under++;
}
for (const [cm, v] of Object.entries(byCockpit).sort(([a],[b]) => Number(a)-Number(b))) {
  console.log('  cockpit=' + cm + ': total=' + v.total + ' over=' + v.over + ' under=' + v.under + ' avgDiff=' + (v.avgDiff/v.total).toFixed(2) + '%');
}
