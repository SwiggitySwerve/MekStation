// Analyze exact BV delta for near-threshold units to find fixable patterns
const fs = require('fs');
const path = require('path');
const r = require('../validation-output/bv-validation-report.json');
const idx = JSON.parse(fs.readFileSync(path.join(__dirname, '../public/data/units/battlemechs/index.json'), 'utf8'));
function loadUnit(id) {
  const e = idx.units.find(x => x.id === id);
  if (!e) return null;
  try { return JSON.parse(fs.readFileSync(path.join(__dirname, '../public/data/units/battlemechs', e.path), 'utf8')); }
  catch (err) { return null; }
}

const near = r.allResults.filter(u => Math.abs(u.percentDiff) >= 1.0 && Math.abs(u.percentDiff) < 2.0 && u.breakdown);
const under = near.filter(u => u.difference < 0);
const over = near.filter(u => u.difference > 0);

console.log('=== UNDERCALCULATED (need to ADD BV) ===');
console.log('Count:', under.length, '— Need avg', (under.reduce((s,u) => s - u.difference, 0) / under.length).toFixed(1), 'more BV per unit');
console.log('\nLet me check what happens if we reverse-engineer the gap per component:');

// For each undercalculated unit, figure out what BV contribution is needed
// gap = MUL_BV - Calc_BV = positive number (we need to add this)
// total_BV = (defensiveBV + offensiveBV) × cockpitModifier
// offensiveBV = (weaponBV + ammoBV + physBV + weightBonus + offEquip) × speedFactor
// If gap is in offensive: needed_wepBV_delta = gap / (cockpitMod × speedFactor)
// If gap is in defensive: needed_defBV_delta = gap / (cockpitMod × defensiveFactor)
for (const u of under.sort((a,b) => a.percentDiff - b.percentDiff)) {
  const b = u.breakdown;
  const ck = b.cockpitModifier || 1;
  const sf = b.speedFactor;
  const df = b.defensiveFactor;
  const needed = -u.difference; // positive: how much BV we need to add
  const offDelta = needed / (ck * sf); // if all gap is in offensive
  const defDelta = needed / (ck * df); // if all gap is in defensive

  const unit = loadUnit(u.unitId);
  if (!unit) continue;
  const crits = unit.criticalSlots ? Object.values(unit.criticalSlots).flat().filter(s => s && typeof s === 'string') : [];
  const lo = crits.map(s => s.toLowerCase());

  // Check for unreolved weapons (equipment not matching any catalog entry)
  const eqs = (unit.equipment || []).map(e => e.id);

  console.log(u.unitId.padEnd(40) + ' need+' + String(needed).padStart(3) + 'BV offDelta=+' + offDelta.toFixed(1).padStart(5) + ' defDelta=+' + defDelta.toFixed(1).padStart(5) + ' SF=' + sf + ' DF=' + df);
}

console.log('\n=== OVERCALCULATED (need to REMOVE BV) ===');
console.log('Count:', over.length, '— Need avg', (over.reduce((s,u) => s + u.difference, 0) / over.length).toFixed(1), 'less BV per unit');
for (const u of over.sort((a,b) => b.percentDiff - a.percentDiff)) {
  const b = u.breakdown;
  const ck = b.cockpitModifier || 1;
  const sf = b.speedFactor;
  const df = b.defensiveFactor;
  const excess = u.difference; // positive: how much BV we need to remove
  const offDelta = excess / (ck * sf);
  const defDelta = excess / (ck * df);
  console.log(u.unitId.padEnd(40) + ' need-' + String(excess).padStart(3) + 'BV offDelta=-' + offDelta.toFixed(1).padStart(5) + ' defDelta=-' + defDelta.toFixed(1).padStart(5) + ' SF=' + sf + ' DF=' + df);
}

// Check: are there any unresolved weapons?
console.log('\n=== ISSUES FIELD ANALYSIS ===');
const withIssues = near.filter(u => u.issues && u.issues.length > 0);
console.log('Units with issues:', withIssues.length, 'of', near.length);
for (const u of withIssues.slice(0, 20)) {
  console.log('  ' + u.unitId.padEnd(40) + u.issues.join('; '));
}
