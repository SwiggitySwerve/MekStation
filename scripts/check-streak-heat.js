const r = require('../validation-output/bv-validation-report.json');
const idx = require('../public/data/units/battlemechs/index.json');
const fs = require('fs');
const path = require('path');

function loadUnit(id) {
  const ie = idx.units.find(e => e.id === id);
  if (!ie || !ie.path) return null;
  try { return JSON.parse(fs.readFileSync(path.join(__dirname, '../public/data/units/battlemechs', ie.path), 'utf8')); } catch { return null; }
}

// Focus on the 14 overcalculated Streak boundary units
const valid = r.allResults.filter(x => x.status !== 'error' && x.percentDiff !== null && x.breakdown);
const streakOver = valid.filter(x => x.percentDiff > 1 && x.percentDiff <= 2).filter(x => {
  const unit = loadUnit(x.unitId);
  if (!unit) return false;
  return JSON.stringify(unit.criticalSlots || {}).toLowerCase().includes('streak');
});

console.log('=== STREAK OVERCALCULATED DETAILS ===');
for (const u of streakOver) {
  const b = u.breakdown;
  console.log('\n--- ' + u.unitId + ' ---');
  console.log('Ref:', u.referenceBV, 'Calc:', u.calculatedBV, 'Diff:', u.difference, '(' + u.percentDiff.toFixed(2) + '%)');
  
  // Show weapons including streak
  if (b.weapons) {
    const streakWeapons = b.weapons.filter(w => (w.id||'').toLowerCase().includes('streak'));
    const otherWeapons = b.weapons.filter(w => !(w.id||'').toLowerCase().includes('streak'));
    console.log('Streak weapons:');
    for (const w of streakWeapons) {
      console.log('  ' + (w.id||'?').padEnd(35) + ' bv=' + (w.bv||0).toString().padStart(4) + ' heat=' + (w.heat||0).toString().padStart(2) + ' mod=' + (w.modifier||1).toFixed(2));
    }
    console.log('Other weapons:');
    for (const w of otherWeapons) {
      console.log('  ' + (w.id||'?').padEnd(35) + ' bv=' + (w.bv||0).toString().padStart(4) + ' heat=' + (w.heat||0).toString().padStart(2) + ' mod=' + (w.modifier||1).toFixed(2));
    }
    console.log('Total weapon BV (heat-adj):', b.weaponBV);
    console.log('Heat efficiency:', b.heatEfficiency);
    console.log('Total weapon heat:', b.weapons.reduce((s, w) => s + (w.heat||0), 0));
    console.log('Streak weapon heat:', streakWeapons.reduce((s, w) => s + (w.heat||0), 0));
  }
}
