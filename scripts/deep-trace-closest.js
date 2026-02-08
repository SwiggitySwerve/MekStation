// Deep trace the closest undercalculated units to find exact BV gap source
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

// IS table for structure verification
const IS_TABLE = {
  10:{head:3,ct:4,st:3,arm:1,leg:2},15:{head:3,ct:5,st:4,arm:2,leg:3},20:{head:3,ct:6,st:5,arm:3,leg:4},
  25:{head:3,ct:8,st:6,arm:4,leg:6},30:{head:3,ct:10,st:7,arm:5,leg:7},35:{head:3,ct:11,st:8,arm:6,leg:8},
  40:{head:3,ct:12,st:10,arm:6,leg:10},45:{head:3,ct:14,st:11,arm:7,leg:11},50:{head:3,ct:16,st:12,arm:8,leg:12},
  55:{head:3,ct:18,st:13,arm:9,leg:13},60:{head:3,ct:20,st:14,arm:10,leg:14},65:{head:3,ct:21,st:15,arm:10,leg:15},
  70:{head:3,ct:22,st:15,arm:11,leg:15},75:{head:3,ct:23,st:16,arm:12,leg:16},80:{head:3,ct:25,st:17,arm:13,leg:17},
  85:{head:3,ct:27,st:18,arm:14,leg:18},90:{head:3,ct:29,st:19,arm:15,leg:19},95:{head:3,ct:30,st:20,arm:16,leg:20},
  100:{head:3,ct:31,st:21,arm:17,leg:21}
};

function totalIS(ton, isQuad) {
  const t = IS_TABLE[ton]; if (!t) return 0;
  return t.head + t.ct + t.st*2 + (isQuad ? t.leg*4 : t.arm*2 + t.leg*2);
}

function calcTotalArmor(alloc) {
  let t = 0;
  for (const v of Object.values(alloc)) {
    if (typeof v === 'number') t += v;
    else if (v && typeof v === 'object') t += (v.front||0) + (v.rear||0);
  }
  return t;
}

const targets = ['werewolf-wer-lf-005', 'violator-vt-u1', 'valkyrie-vlk-qw5', 'raider-mk-ii-jl-2', 'night-stalker-nsr-k1', 'hunchback-hbk-7x-4', 'perseus-p1e', 'sarath-srth-1ob'];

for (const id of targets) {
  const u = r.allResults.find(x => x.unitId === id);
  if (!u) { console.log('NOT FOUND:', id); continue; }
  const unit = loadUnit(id);
  if (!unit) { console.log('NOT LOADED:', id); continue; }
  const b = u.breakdown;

  console.log('\n========================================');
  console.log(`${u.chassis} ${u.model} (${id})`);
  console.log(`MUL=${u.indexBV} Calc=${u.calculatedBV} Gap=${u.difference} (${(u.percentDiff||0).toFixed(2)}%)`);

  // Verify defensive components
  const isQuad = (unit.configuration||'').toLowerCase() === 'quad';
  const tIS = totalIS(unit.tonnage, isQuad);
  const totalArmorPts = calcTotalArmor(unit.armor?.allocation || {});
  console.log(`\n--- DEFENSIVE VERIFICATION ---`);
  console.log(`  totalIS=${tIS} armorPts=${totalArmorPts} tonnage=${unit.tonnage}`);
  console.log(`  Reported: armorBV=${b.armorBV} structBV=${b.structureBV} gyroBV=${b.gyroBV} defEq=${b.defEquipBV}`);
  console.log(`  explosive=${b.explosivePenalty} armoredComp=${b.armoredComponentBV} harjel=${b.harjelBonus} amsAmmo=${b.amsAmmoBV}`);
  console.log(`  defFactor=${b.defensiveFactor} TMM=${b.maxTMM}`);

  // Recompute defensive total
  const defBase = b.armorBV + b.structureBV + b.gyroBV + (b.defEquipBV||0) + (b.armoredComponentBV||0) + (b.harjelBonus||0) + (b.amsAmmoBV||0) - (b.explosivePenalty||0);
  const defTotal = defBase * b.defensiveFactor;
  console.log(`  Recomputed defTotal=${defTotal.toFixed(1)} (reported=${b.defensiveBV})`);

  // Verify offensive components
  console.log(`\n--- OFFENSIVE VERIFICATION ---`);
  console.log(`  weaponBV=${b.weaponBV} (raw=${b.rawWeaponBV} halved=${b.halvedWeaponBV} count=${b.halvedWeaponCount})`);
  console.log(`  ammoBV=${b.ammoBV} physBV=${b.physicalWeaponBV} weightBonus=${b.weightBonus} offEq=${b.offEquipBV}`);
  console.log(`  heatEff=${b.heatEfficiency} heatDiss=${b.heatDissipation} moveHeat=${b.moveHeat}`);
  console.log(`  SF=${b.speedFactor} walk=${b.walkMP} run=${b.runMP} jump=${b.jumpMP}`);

  const offBase = (b.weaponBV||0) + (b.ammoBV||0) + (b.physicalWeaponBV||0) + (b.weightBonus||0) + (b.offEquipBV||0);
  const offTotal = offBase * b.speedFactor;
  console.log(`  Recomputed offTotal=${offTotal.toFixed(1)} (reported=${b.offensiveBV})`);

  const recomputedBV = Math.round((defTotal + offTotal) * (b.cockpitModifier||1));
  console.log(`\n  Recomputed total=${recomputedBV} (reported=${u.calculatedBV}) cockpit=${b.cockpitModifier}`);

  // Equipment list
  const eqs = (unit.equipment || []).map(e => `${e.id}(${e.location||'?'})`);
  console.log(`  Equipment: ${eqs.join(', ')}`);

  // Crits
  const crits = unit.criticalSlots ? Object.values(unit.criticalSlots).flat().filter(s => s && typeof s === 'string') : [];
  const special = crits.filter(s => !/^(engine|endo|ferro|fusion|gyro|hip|upper|lower|hand|foot|shoulder|heat|life|sensors|cockpit|double|standard|xl|compact)/i.test(s.replace(/ /g,'')));
  console.log(`  Special crits: ${[...new Set(special)].join(', ')}`);
}
