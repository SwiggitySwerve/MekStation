const r = require('../validation-output/bv-validation-report.json');
const fs = require('fs');
const path = require('path');

// Boundary outliers: within5 (1-5% off) - these are closest to being "within 1%"
const boundary = r.allResults.filter(x => x.status === 'within5');
const under = boundary.filter(x => x.difference < 0).sort((a,b) => a.percentDiff - b.percentDiff);
const over = boundary.filter(x => x.difference > 0).sort((a,b) => b.percentDiff - a.percentDiff);

console.log(`=== BOUNDARY OUTLIERS (1-5%): ${boundary.length} total (${under.length} under, ${over.length} over) ===`);

// Show those closest to 1% threshold (smallest absolute pctDiff)
const closest = boundary.slice().sort((a,b) => Math.abs(a.percentDiff) - Math.abs(b.percentDiff));
console.log(`\n--- 30 CLOSEST TO 1% THRESHOLD (easiest to fix) ---`);
closest.slice(0, 30).forEach(x => {
  const sign = x.difference > 0 ? '+' : '';
  console.log(`  ${x.unitId.padEnd(45)} ${sign}${x.percentDiff.toFixed(2)}%  diff=${sign}${x.difference}  exp=${x.indexBV}  calc=${x.calculatedBV}`);
});

// Load unit data
const unitIdx = JSON.parse(fs.readFileSync(path.join(__dirname, '../public/data/units/battlemechs/index.json'), 'utf8'));
const unitMap = {};
for (const u of unitIdx.units) unitMap[u.id] = u;

// Analyze equipment in closest-to-threshold units
console.log(`\n--- EQUIPMENT IN 30 CLOSEST UNITS ---`);
const equipSeen = {};
for (const b of closest.slice(0, 30)) {
  const unit = unitMap[b.unitId];
  if (!unit || !unit.criticalSlots) continue;
  const side = b.difference < 0 ? 'under' : 'over';
  const seen = new Set();
  for (const [loc, slots] of Object.entries(unit.criticalSlots)) {
    for (const s of slots) {
      if (!s || s === '-Empty-') continue;
      const lo = s.toLowerCase();
      // Group similar items
      let key = lo;
      if (lo.includes('streak')) key = 'streak-weapon';
      else if (lo.includes('ultra')) key = 'ultra-ac';
      else if (lo.includes('rotary')) key = 'rotary-ac';
      else if (lo.includes('artemis')) key = 'artemis-iv/v';
      else if (lo.includes('ammo')) key = 'ammo-bin';
      else if (lo.includes('endo')) key = 'endo-steel';
      else if (lo.includes('ferro')) key = 'ferro-fibrous';
      else if (lo.includes('double heat sink')) key = 'dhs';
      else if (lo.includes('heat sink')) key = 'heat-sink';
      else if (lo.includes('case')) key = 'case';
      else if (lo.includes('ppc')) key = 'ppc-variant';
      else if (lo.includes('pulse')) key = 'pulse-laser';
      else if (lo.includes('er ') || lo.includes('er-')) key = 'er-weapon';
      else if (lo.includes('lrm') || lo.includes('srm') || lo.includes('mrm')) key = 'missile-weapon';
      else if (lo.includes('laser')) key = 'laser';
      else if (lo.includes('gauss')) key = 'gauss';
      else if (lo.includes('autocannon') || lo.includes(' ac/')) key = 'autocannon';
      if (!seen.has(key)) {
        seen.add(key);
        if (!equipSeen[key]) equipSeen[key] = { under: 0, over: 0 };
        equipSeen[key][side]++;
      }
    }
  }
}

const sorted = Object.entries(equipSeen).sort((a,b) => (b[1].under + b[1].over) - (a[1].under + a[1].over));
console.log('Equipment'.padEnd(25) + 'Under  Over  Total');
for (const [k, v] of sorted.slice(0, 20)) {
  console.log(`  ${k.padEnd(23)} ${String(v.under).padStart(5)} ${String(v.over).padStart(5)} ${String(v.under + v.over).padStart(6)}`);
}

// Look for patterns: what tech base, tonnage ranges
console.log('\n--- TECH BASE & TONNAGE IN CLOSEST 30 ---');
const stats = { IS: { under: 0, over: 0 }, CLAN: { under: 0, over: 0 }, MIXED: { under: 0, over: 0 } };
for (const b of closest.slice(0, 30)) {
  const unit = unitMap[b.unitId];
  if (!unit) continue;
  const side = b.difference < 0 ? 'under' : 'over';
  const tb = unit.techBase || 'IS';
  if (!stats[tb]) stats[tb] = { under: 0, over: 0 };
  stats[tb][side]++;
}
for (const [tb, v] of Object.entries(stats)) {
  if (v.under + v.over > 0) console.log(`  ${tb}: ${v.under} under, ${v.over} over`);
}

// Show all within5 units grouped by side, sorted by absolute pctDiff
console.log('\n--- ALL UNDERCALCULATED (closest first, might be fixable) ---');
const underClosest = under.slice().sort((a,b) => Math.abs(a.percentDiff) - Math.abs(b.percentDiff));
underClosest.slice(0, 40).forEach(x => {
  console.log(`  ${x.unitId.padEnd(45)} ${x.percentDiff.toFixed(2)}%  diff=${x.difference}  exp=${x.indexBV}  calc=${x.calculatedBV}`);
});

console.log('\n--- ALL OVERCALCULATED (closest first, might be fixable) ---');
const overClosest = over.slice().sort((a,b) => Math.abs(a.percentDiff) - Math.abs(b.percentDiff));
overClosest.slice(0, 40).forEach(x => {
  console.log(`  ${x.unitId.padEnd(45)} +${x.percentDiff.toFixed(2)}%  diff=${x.difference}  exp=${x.indexBV}  calc=${x.calculatedBV}`);
});
