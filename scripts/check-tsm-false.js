const fs = require('fs');
const path = require('path');
const r = JSON.parse(fs.readFileSync('validation-output/bv-validation-report.json', 'utf8'));

function findJsonFiles(dir) {
  const results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) results.push(...findJsonFiles(full));
    else if (entry.name.endsWith('.json') && entry.name !== 'index.json') results.push(full);
  }
  return results;
}
const files = findJsonFiles('public/data/units/battlemechs');
const unitMap = new Map();
for (const f of files) { try { const d = JSON.parse(fs.readFileSync(f, 'utf8')); unitMap.set(d.id, d); } catch {} }

// Find all units where weight bonus suggests TSM (wt = tonnage * 1.5)
// but verify from critical slots
console.log('=== TSM verification for overcalculated units ===\n');
const overcalc = r.allResults.filter(u => u.percentDiff > 1);

for (const u of overcalc) {
  const data = unitMap.get(u.unitId);
  if (!data) continue;
  const b = u.breakdown || {};
  const tonnage = data.tonnage;
  const wt = b.weightBonus;

  // Check if wt suggests TSM
  const expectedTSM = tonnage * 1.5;
  const expectedNoTSM = tonnage;
  const hasTSMWeight = Math.abs(wt - expectedTSM) < 0.1;
  const hasNoTSMWeight = Math.abs(wt - expectedNoTSM) < 0.1;

  if (!hasTSMWeight) continue; // Only check units with TSM-like weight

  // Check actual crits for TSM
  const crits = JSON.stringify(data.criticalSlots || {}).toLowerCase();
  const hasTSMCrit = crits.includes('tsm') || crits.includes('triple strength') || crits.includes('triplestrength');

  // Also check if unit has partial wing (sometimes confused?)
  const hasPartialWing = crits.includes('partial wing') || crits.includes('partialwing');
  const hasMASC = crits.includes('masc');

  const flag = hasTSMCrit ? '' : ' [FALSE TSM?]';
  if (!hasTSMCrit) {
    console.log(`${u.chassis} ${u.model}: +${u.percentDiff.toFixed(2)}% wt=${wt} tonnage=${tonnage} ratio=${(wt/tonnage).toFixed(2)}${flag}`);
    console.log(`  Has TSM in crits: ${hasTSMCrit}`);
    console.log(`  Has Partial Wing: ${hasPartialWing}`);
    console.log(`  Has MASC: ${hasMASC}`);
    console.log(`  Equipment: ${data.equipment.map(e => e.id).join(', ')}`);

    // What would BV be without TSM?
    const wtDiff = wt - tonnage;
    const sf = b.speedFactor || 1;
    const cm = b.cockpitModifier || 1;
    const estimatedFix = u.calculatedBV - Math.round(wtDiff * sf * cm);
    const newPct = ((estimatedFix - u.indexBV) / u.indexBV * 100);
    console.log(`  Without TSM: est=${estimatedFix} newDiff=${newPct.toFixed(2)}%`);
    console.log('');
  }
}

// Also check ALL TSM-detected units for accuracy
console.log('\n=== All units where hasTSM=true in breakdown ===');
const tsmUnits = r.allResults.filter(u => u.breakdown?.hasTSM);
console.log(`Total TSM units: ${tsmUnits.length}`);
console.log(`Within 1%: ${tsmUnits.filter(u => Math.abs(u.percentDiff) <= 1).length}`);
console.log(`Over 1%: ${tsmUnits.filter(u => u.percentDiff > 1).length}`);
console.log(`Under 1%: ${tsmUnits.filter(u => u.percentDiff < -1).length}`);
console.log(`Avg diff: ${(tsmUnits.reduce((s,u)=>s+u.percentDiff,0)/tsmUnits.length).toFixed(3)}%`);
