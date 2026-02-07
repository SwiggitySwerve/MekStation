const fs = require('fs');
const path = require('path');
const r = JSON.parse(fs.readFileSync('validation-output/bv-validation-report.json', 'utf8'));

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

const targets = ['mauler-mal-1x-affc', 'merlin-mln-sx', 'shogun-c-2'];
for (const id of targets) {
  const u = r.allResults.find(x => x.unitId === id);
  const data = unitMap.get(id);
  if (!u || !data) { console.log(id + ': NOT FOUND'); continue; }

  const b = u.breakdown || {};
  console.log('=== ' + u.chassis + ' ' + u.model + ' ===');
  console.log('calc=' + u.calculatedBV + ' mul=' + u.indexBV + ' diff=' + u.difference + ' (' + u.percentDiff.toFixed(2) + '%)');
  console.log('Tonnage:', data.tonnage, 'Type:', data.type, 'TechBase:', data.techBase);
  console.log('Engine:', JSON.stringify(data.engine));
  console.log('Movement:', JSON.stringify(data.movement));
  console.log('Armor:', JSON.stringify(data.armor));
  console.log('HeatSinks:', JSON.stringify(data.heatSinks));
  console.log('Gyro:', JSON.stringify(data.gyro));
  console.log('Cockpit:', JSON.stringify(data.cockpit));

  console.log('\nDefensive BV:', b.defensiveBV);
  console.log('  armorBV=' + b.armorBV + ' structureBV=' + b.structureBV + ' gyroBV=' + b.gyroBV);
  console.log('  defEquipBV=' + b.defEquipBV + ' explosivePenalty=' + b.explosivePenalty);
  console.log('  defensiveFactor=' + b.defensiveFactor + ' maxTMM=' + b.maxTMM);

  console.log('\nOffensive BV:', b.offensiveBV);
  console.log('  weaponBV=' + b.weaponBV + ' rawWeaponBV=' + b.rawWeaponBV + ' halvedWeaponBV=' + b.halvedWeaponBV);
  console.log('  ammoBV=' + b.ammoBV + ' weightBonus=' + b.weightBonus + ' physicalBV=' + b.physicalWeaponBV);
  console.log('  offEquipBV=' + b.offEquipBV);
  console.log('  heatEff=' + b.heatEfficiency + ' heatDiss=' + b.heatDissipation + ' moveHeat=' + b.moveHeat);
  console.log('  speedFactor=' + b.speedFactor + ' walkMP=' + b.walkMP + ' runMP=' + b.runMP + ' jumpMP=' + b.jumpMP);

  console.log('\nCockpitModifier:', b.cockpitModifier, 'cockpitType:', b.cockpitType);
  console.log('Issues:', u.issues);
  console.log('Equipment:', data.equipment.map(e => e.id).join(', '));

  const crits = Object.values(data.criticalSlots || {}).flat().filter(Boolean);
  console.log('Notable crits:', crits.filter(s => {
    const lo = s.toLowerCase();
    return !lo.includes('heat sink') && !lo.includes('endo') && !lo.includes('ferro') &&
           !lo.includes('jump jet') && !lo.includes('engine') && !lo.includes('gyro') &&
           !lo.includes('life support') && !lo.includes('sensors') && !lo.includes('cockpit') &&
           !lo.includes('shoulder') && !lo.includes('upper') && !lo.includes('lower') &&
           !lo.includes('hand') && !lo.includes('hip') && !lo.includes('foot') && !lo.includes('actuator');
  }).filter((v,i,a) => a.indexOf(v) === i).join(', '));

  // Verify speed factor
  const mp = Math.max(b.runMP, b.jumpMP > 0 ? b.runMP : 0);
  const mpAdj = b.jumpMP > 0 ? b.runMP + Math.round(b.jumpMP / 2) : b.runMP;
  console.log('Effective MP for speed factor:', mpAdj);
  const rawSF = Math.pow(1 + ((mpAdj < 5 ? mpAdj - 5 : mpAdj - 5) / 10), 1.2);
  const sf = Math.round(rawSF * 100) / 100;
  console.log('Computed SF:', sf, 'vs breakdown:', b.speedFactor);

  console.log('');
}
