const fs = require('fs');
const path = require('path');
const r = JSON.parse(require('fs').readFileSync('validation-output/bv-validation-report.json', 'utf8'));

function findJsonFiles(dir) {
  const results = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const f = path.join(dir, e.name);
    if (e.isDirectory()) results.push(...findJsonFiles(f));
    else if (e.name.endsWith('.json') && e.name !== 'index.json') results.push(f);
  }
  return results;
}
const files = findJsonFiles('public/data/units/battlemechs');
const unitMap = new Map();
for (const f of files) { try { const d = JSON.parse(fs.readFileSync(f, 'utf8')); unitMap.set(d.id, d); } catch {} }

const id = 'centurion-cn11-o';
const data = unitMap.get(id);
const u = r.allResults.find(x => x.unitId === id);
const b = u.breakdown;

console.log('=== Centurion CN11-O ===');
console.log('calc=' + u.calculatedBV + ' mul=' + u.indexBV + ' diff=' + u.difference);
console.log('Tonnage:', data.tonnage, 'TechBase:', data.techBase);
console.log('Engine:', JSON.stringify(data.engine));
console.log('Movement:', JSON.stringify(data.movement));
console.log('Armor:', JSON.stringify(data.armor));
console.log('HeatSinks:', JSON.stringify(data.heatSinks));
console.log('Gyro:', JSON.stringify(data.gyro));
console.log('Cockpit:', JSON.stringify(data.cockpit));
console.log('Equipment:', data.equipment.map(e => e.id + '@' + e.location).join(', '));
console.log('');
console.log('Defensive BV:', b.defensiveBV);
console.log('  armorBV=' + b.armorBV + ' structureBV=' + b.structureBV + ' gyroBV=' + b.gyroBV);
console.log('  defEquipBV=' + b.defEquipBV + ' explosivePenalty=' + b.explosivePenalty);
console.log('  defensiveFactor=' + b.defensiveFactor + ' maxTMM=' + b.maxTMM);
console.log('');
console.log('Offensive BV:', b.offensiveBV);
console.log('  weaponBV=' + b.weaponBV + ' rawWeaponBV=' + b.rawWeaponBV + ' halvedWeaponBV=' + b.halvedWeaponBV);
console.log('  ammoBV=' + b.ammoBV + ' weightBonus=' + b.weightBonus);
console.log('  offEquipBV=' + b.offEquipBV);
console.log('  heatEff=' + b.heatEfficiency + ' heatDiss=' + b.heatDissipation + ' moveHeat=' + b.moveHeat);
console.log('  speedFactor=' + b.speedFactor + ' walk=' + b.walkMP + ' run=' + b.runMP + ' jump=' + b.jumpMP);
console.log('');
console.log('Cockpit:', b.cockpitModifier, b.cockpitType);
console.log('Issues:', u.issues);

// Check crits
const crits = Object.values(data.criticalSlots || {}).flat().filter(Boolean);
console.log('\nCritical slots:');
const uniqueCrits = [...new Set(crits)];
for (const c of uniqueCrits) {
  const count = crits.filter(x => x === c).length;
  console.log('  ' + c + ' x' + count);
}
