const r = require('../validation-output/bv-validation-report.json');
const fs = require('fs');
const path = require('path');

const unitIdx = JSON.parse(fs.readFileSync(path.join(__dirname, '../public/data/units/battlemechs/index.json'), 'utf8'));
const unitMap = {};
for (const u of unitIdx.units) unitMap[u.id] = u;

// Closest undercalculated units
const targets = [
  'boreas-d', 'werewolf-wer-lf-005', 'sarath-srth-1ob', 'perseus-p1e',
  'kodiak-cale', 'marauder-c', 'epimetheus-prime', 'violator-vt-u1',
  'amarok-3', 'boreas-b', 'night-stalker-nsr-k1', 'raider-mk-ii-jl-2',
  'malice-mal-xp', 'hunchback-hbk-7x-4', 'jupiter-3', 'battlemaster-c',
  // Also trace some overcalculated
  'valkyrie-vlk-qt2', 'doloire-dlr-od', 'goshawk-ii-2', 'kabuto-kbo-7a',
];

for (const tid of targets) {
  const result = r.allResults.find(x => x.unitId === tid);
  const unit = unitMap[tid];
  if (!result || !unit) continue;

  const sign = result.difference > 0 ? '+' : '';
  console.log(`\n=== ${tid} === ${sign}${result.percentDiff.toFixed(2)}% (diff=${sign}${result.difference}) exp=${result.indexBV} calc=${result.calculatedBV}`);
  console.log(`  Tech: ${unit.techBase}  Tonnage: ${unit.mass}t  Motive: ${unit.motiveType}`);

  if (result.breakdown) {
    const b = result.breakdown;
    console.log(`  Breakdown:`);
    for (const [k, v] of Object.entries(b)) {
      if (v !== undefined && v !== null && v !== 0) {
        console.log(`    ${k}: ${typeof v === 'number' ? v : JSON.stringify(v)}`);
      }
    }
  }

  if (result.issues && result.issues.length > 0) {
    console.log(`  Issues: ${result.issues.join('; ')}`);
  }
  if (result.rootCause) {
    console.log(`  Root cause: ${result.rootCause}`);
  }

  // Show critical equipment
  if (unit.criticalSlots) {
    const weapons = new Set();
    const equipment = new Set();
    for (const [loc, slots] of Object.entries(unit.criticalSlots)) {
      for (const s of slots) {
        if (!s || s === '-Empty-') continue;
        const lo = s.toLowerCase();
        if (lo.includes('ammo') || lo.includes('endo') || lo.includes('ferro') || lo === 'heat sink' || lo === 'double heat sink') continue;
        if (lo.includes('laser') || lo.includes('ppc') || lo.includes('gauss') || lo.includes('ac/') || lo.includes('autocannon') ||
            lo.includes('srm') || lo.includes('lrm') || lo.includes('mrm') || lo.includes('atm') || lo.includes('streak') ||
            lo.includes('ultra') || lo.includes('rotary') || lo.includes('machine gun') || lo.includes('flamer') ||
            lo.includes('thunderbolt') || lo.includes('mml') || lo.includes('narc') || lo.includes('tag')) {
          weapons.add(s);
        } else if (lo.includes('case') || lo.includes('artemis') || lo.includes('targeting') || lo.includes('ecm') ||
                   lo.includes('bap') || lo.includes('probe') || lo.includes('ams') || lo.includes('tsm') ||
                   lo.includes('masc') || lo.includes('supercharger') || lo.includes('c3')) {
          equipment.add(s);
        }
      }
    }
    if (weapons.size > 0) console.log(`  Weapons: ${[...weapons].join(', ')}`);
    if (equipment.size > 0) console.log(`  Equipment: ${[...equipment].join(', ')}`);
  }

  // Show cockpit, engine, armor
  console.log(`  Cockpit: ${unit.cockpit || 'Standard'}  Engine: ${unit.engineType || '?'}  Armor: ${unit.armorType || '?'}`);
  if (unit.myomerType) console.log(`  Myomer: ${unit.myomerType}`);
}
