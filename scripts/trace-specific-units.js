// Deep trace specific high-gap units to find systematic issues
const fs = require('fs');
const path = require('path');
const r = require('../validation-output/bv-validation-report.json');
const idx = JSON.parse(fs.readFileSync(path.join(__dirname, '../public/data/units/battlemechs/index.json'), 'utf8'));

function loadUnit(id) {
  const entry = idx.units.find(x => x.id === id);
  if (!entry) return null;
  try { return JSON.parse(fs.readFileSync(path.join(__dirname, '../public/data/units/battlemechs', entry.path), 'utf8')); }
  catch (e) { return null; }
}

const targets = [
  'goliath-gol-4s',      // LIGHT, -181 (-9.5%)
  'zeus-x-zeu-9wd-stacy', // LIGHT, -159 (-8.3%)
  'great-turtle-gtr-1',   // FUSION+TC, -207 (-6.6%)
  'uller-c',              // CLAN_XL+BAP, -158 (-13.8%)
  'koshi-a',              // CLAN_XL+BAP, -91 (-15.0%)
  'venom-sdr-9ke',        // XL+BAP, -82 (-10.2%)
  'werewolf-wer-lf-005',  // XL+NULL_SIG, -11 (-1.02%)
  'jackalope-jlp-kb',     // CLAN_XL, +234 (+18.6%) - EXTREME overcalc
];

for (const id of targets) {
  const u = r.allResults.find(x => x.unitId === id);
  if (!u) { console.log('NOT FOUND: ' + id); continue; }
  const unit = loadUnit(id);
  if (!unit) { console.log('UNIT NOT LOADED: ' + id); continue; }
  const b = u.breakdown || {};

  console.log(`\n=== ${u.chassis} ${u.model} (${id}) ===`);
  console.log(`  MUL BV: ${u.indexBV}  Calc BV: ${u.calculatedBV}  Gap: ${u.difference} (${(u.percentDiff||0).toFixed(2)}%)`);
  console.log(`  --- DEFENSIVE ---`);
  console.log(`  armorBV=${b.armorBV} structBV=${b.structureBV} gyroBV=${b.gyroBV}`);
  console.log(`  defEquip=${b.defEquipBV} armoredComp=${b.armoredComponentBV} harjel=${b.harjelBonus} amsAmmo=${b.amsAmmoBV}`);
  console.log(`  explosive=${b.explosivePenalty} defFactor=${b.defensiveFactor} maxTMM=${b.maxTMM}`);
  console.log(`  TOTAL DEF: ${b.defensiveBV}`);
  console.log(`  --- OFFENSIVE ---`);
  console.log(`  weaponBV=${b.weaponBV} rawWeaponBV=${b.rawWeaponBV} halvedBV=${b.halvedWeaponBV} halvedCount=${b.halvedWeaponCount}`);
  console.log(`  ammoBV=${b.ammoBV} physBV=${b.physicalWeaponBV} weightBonus=${b.weightBonus} offEquip=${b.offEquipBV}`);
  console.log(`  heatEff=${b.heatEfficiency} heatDiss=${b.heatDissipation} moveHeat=${b.moveHeat}`);
  console.log(`  speedFactor=${b.speedFactor} TOTAL OFF: ${b.offensiveBV}`);
  console.log(`  --- CONTEXT ---`);
  console.log(`  cockpitMod=${b.cockpitModifier} cockpit=${b.cockpitType}`);
  console.log(`  walk=${b.walkMP} run=${b.runMP} jump=${b.jumpMP}`);
  console.log(`  Engine: ${unit.engine?.type} rating=${unit.engine?.rating}`);
  console.log(`  Tech: ${unit.techBase} Config: ${unit.configuration} Tonnage: ${unit.tonnage}`);
  console.log(`  Armor: ${unit.armorType || unit.armor?.type} Structure: ${unit.structureType || unit.structure?.type}`);
  console.log(`  Cockpit: ${unit.cockpit} HS: ${unit.heatSinks?.count}×${unit.heatSinks?.type}`);

  // Equipment list
  const eqs = (unit.equipment || []).map(e => e.id).join(', ');
  console.log(`  Equipment: ${eqs}`);

  // Crit slots - look for special equipment
  const crits = unit.criticalSlots ? Object.values(unit.criticalSlots).flat().filter(Boolean) : [];
  const specials = crits.filter(s => typeof s === 'string' && !/^(engine|endo|ferro|fusion|gyro|hip|upper|lower|hand|foot|shoulder|heat|life|sensors|cockpit)/i.test(s));
  console.log(`  Special crits: ${[...new Set(specials)].join(', ')}`);

  if (u.issues && u.issues.length > 0) {
    console.log(`  ISSUES: ${u.issues.join('; ')}`);
  }

  // Verify math
  const verifyDef = (b.armorBV + b.structureBV + b.gyroBV + (b.defEquipBV||0) + (b.armoredComponentBV||0) + (b.harjelBonus||0) - (b.explosivePenalty||0)) * b.defensiveFactor;
  const verifyOff = ((b.weaponBV||0) + (b.ammoBV||0) + (b.physicalWeaponBV||0) + (b.weightBonus||0) + (b.offEquipBV||0)) * b.speedFactor;
  const verifyTotal = Math.round((verifyDef + verifyOff) * (b.cockpitModifier||1));
  console.log(`  Verify: def=${verifyDef.toFixed(1)} off=${verifyOff.toFixed(1)} total=${verifyTotal} (calc=${u.calculatedBV})`);

  // Back-calculate: what defensive or offensive would make it match?
  const neededTotal = u.indexBV;
  const neededDefGap = (neededTotal / (b.cockpitModifier||1)) - verifyOff - verifyDef;
  console.log(`  Gap attribution: need +${neededDefGap.toFixed(1)} BV somewhere`);
}
