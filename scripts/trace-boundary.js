const r = require('../validation-output/bv-validation-report.json');
const idx = require('../public/data/units/battlemechs/index.json');
const fs = require('fs');
const path = require('path');

function loadUnit(id) {
  const ie = idx.units.find(e => e.id === id);
  if (!ie || !ie.path) return null;
  try { return JSON.parse(fs.readFileSync(path.join(__dirname, '../public/data/units/battlemechs', ie.path), 'utf8')); } catch { return null; }
}

const targets = ['morpheus-mrp-3s', 'valkyrie-vlk-qw5', 'gladiator-gld-9sf', 'enforcer-iii-enf-7d', 'doloire-dlr-od', 'wolfhound-wlf-2x', 'fenris-j', 'boreas-a'];
for (const tid of targets) {
  const res = r.allResults.find(x => x.unitId === tid);
  if (!res || !res.breakdown) continue;
  const b = res.breakdown;
  const unit = loadUnit(tid);
  console.log('\n=== ' + tid + ' ===');
  console.log('Ref BV:', res.referenceBV, 'Calc:', res.calculatedBV, 'Diff:', res.difference, '(' + res.percentDiff.toFixed(2) + '%)');
  console.log('Def: armorBV=' + (b.armorBV||0).toFixed(0) + ' structBV=' + (b.structureBV||0).toFixed(0) + ' gyroBV=' + (b.gyroBV||0).toFixed(0) + ' defEquip=' + (b.defensiveEquipBV||0).toFixed(0) + ' exp=-' + (b.explosivePenalty||0));
  console.log('DefFactor=' + (b.defensiveFactor||0).toFixed(3) + ' => totalDef=' + (b.totalDefensiveBV||0).toFixed(0));
  console.log('Off: weapBV=' + (b.weaponBV||0).toFixed(0) + ' ammoBV=' + (b.ammoBV||0).toFixed(0) + ' physBV=' + (b.physicalWeaponBV||0).toFixed(0) + ' wtBonus=' + (b.weightBonus||0).toFixed(0) + ' offEquip=' + (b.offensiveEquipBV||0).toFixed(0));
  console.log('SpeedFactor=' + (b.speedFactor||0).toFixed(3) + ' => totalOff=' + (b.totalOffensiveBV||0).toFixed(0));
  console.log('Cockpit=' + (b.cockpitMod||1.0) + ' Final=' + (b.totalBV||0).toFixed(0));
  console.log('Tech:', unit ? unit.techBase : '?', 'Tons:', unit ? unit.tonnage : '?', 'Engine:', unit && unit.engine ? unit.engine.type : '?');
  if (b.unresolvedWeapons && b.unresolvedWeapons.length) console.log('UNRESOLVED:', b.unresolvedWeapons.join(', '));
  // weapons list
  if (b.weapons) {
    console.log('Weapons (' + b.weapons.length + '):');
    for (const w of b.weapons) console.log('  ' + (w.id || w.name || 'unknown').substring(0,35).padEnd(37) + ' bv=' + (w.bv||0).toString().padStart(4) + ' heat=' + (w.heat||0).toString().padStart(2) + ' mod=' + (w.modifier||1).toFixed(2));
  }
  if (b.ammo) {
    console.log('Ammo (' + b.ammo.length + '):');
    for (const a of b.ammo) console.log('  ' + (a.id || 'unknown').substring(0,35).padEnd(37) + ' bv=' + (a.bv||0).toString().padStart(4) + ' wtype=' + (a.weaponType||'?'));
  }
}
