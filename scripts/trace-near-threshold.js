// Deep trace of units closest to the 1% threshold to find fixable patterns
const fs = require('fs');
const path = require('path');
const report = require('../validation-output/bv-validation-report.json');
const idx = JSON.parse(fs.readFileSync(path.join(__dirname, '../public/data/units/battlemechs/index.json'), 'utf8'));

function loadUnit(id) {
  const entry = idx.units.find(x => x.id === id);
  if (!entry) return null;
  try { return JSON.parse(fs.readFileSync(path.join(__dirname, '../public/data/units/battlemechs', entry.path), 'utf8')); }
  catch(e) { return null; }
}

// Get all units just outside 1% threshold (undercalculated side: diff < 0, |pct| between 1 and 3)
const nearThreshold = report.allResults.filter(x => {
  return x.status !== 'exact' && x.status !== 'within1' && x.breakdown
    && x.difference < 0 && Math.abs(x.percentDiff) < 3.0;
}).sort((a, b) => Math.abs(a.percentDiff) - Math.abs(b.percentDiff));

console.log(`Found ${nearThreshold.length} undercalculated units within 3% of expected\n`);

for (const u of nearThreshold.slice(0, 15)) {
  const unit = loadUnit(u.unitId);
  if (!unit) continue;
  const b = u.breakdown;

  // Compute what the MUL BV implies for each side
  const calcTotal = Math.round(b.defensiveBV + b.offensiveBV);
  const mulBV = u.indexBV;
  const gap = u.difference; // calc - mul (negative = undercalc)

  // If cockpitMod=1.0, gap must come from defensive or offensive side
  // Try to attribute: is the gap closer to defBV error or offBV error?
  // For cockpitMod=1.0: total = def + off, so gap = defGap + offGap
  // Without knowing exact MegaMek sub-totals, we can check ratios

  const defPct = b.defensiveBV / calcTotal * 100;
  const offPct = b.offensiveBV / calcTotal * 100;

  // Check specific equipment
  const crits = unit.criticalSlots ? Object.values(unit.criticalSlots).flat().filter(Boolean) : [];
  const critStr = crits.filter(s => typeof s === 'string').map(s => s.toLowerCase());

  const hasCommandConsole = critStr.some(s => s.includes('command console'));
  const hasDroneOS = critStr.some(s => s.includes('drone'));
  const hasC3 = critStr.some(s => s.includes('c3'));
  const hasTAG = critStr.some(s => s.includes('tag') && !s.includes('targeting'));
  const hasNARC = critStr.some(s => s.includes('narc'));
  const hasCASE = critStr.some(s => s.includes('case') && !s.includes('case ii'));
  const hasCASEII = critStr.some(s => s.includes('case ii'));
  const hasBlueShield = critStr.some(s => s.includes('blue shield'));
  const hasChameleon = critStr.some(s => s.includes('chameleon'));
  const hasNullSig = critStr.some(s => s.includes('null sig'));
  const hasVoidSig = critStr.some(s => s.includes('void sig'));

  // Heat analysis
  const engine = unit.engine || {};
  const hs = unit.heatSinks || {};

  // Movement analysis - check for jump jets
  const mov = unit.movement || {};
  const hasJump = (mov.jump || 0) > 0;
  const hasUMU = critStr.some(s => s.includes('umu') || s.includes('underwater'));

  const flags = [];
  if (hasCommandConsole) flags.push('CMD_CONSOLE');
  if (hasC3) flags.push('C3');
  if (hasTAG) flags.push('TAG');
  if (hasNARC) flags.push('NARC');
  if (hasCASE) flags.push('CASE');
  if (hasCASEII) flags.push('CASE_II');
  if (hasBlueShield) flags.push('BLUE_SHIELD');
  if (hasChameleon) flags.push('CHAMELEON');
  if (hasNullSig) flags.push('NULL_SIG');
  if (hasVoidSig) flags.push('VOID_SIG');
  if (hasJump) flags.push(`JJ=${mov.jump}`);
  if (hasUMU) flags.push('UMU');

  console.log(`--- ${u.chassis} ${u.model} (${u.unitId}) ---`);
  console.log(`  MUL BV: ${mulBV}  Calc BV: ${calcTotal}  Gap: ${gap} (${u.percentDiff.toFixed(2)}%)`);
  console.log(`  Def: ${Math.round(b.defensiveBV)} (${defPct.toFixed(0)}%)  Off: ${Math.round(b.offensiveBV)} (${offPct.toFixed(0)}%)`);
  console.log(`  armorBV=${b.armorBV} structBV=${b.structureBV} gyroBV=${b.gyroBV} defEquip=${b.defEquipBV||0} explosive=${b.explosivePenalty||0}`);
  console.log(`  defFactor=${b.defensiveFactor} (TMM-based)`);
  console.log(`  weaponBV=${Math.round(b.weaponBV)} ammoBV=${b.ammoBV||0} physBV=${b.physicalWeaponBV||0} weightBonus=${b.weightBonus||0}`);
  console.log(`  speedFactor=${b.speedFactor} heatEff=${b.heatEfficiency} heatDiss=${b.heatDissipation} moveHeat=${b.moveHeat}`);
  console.log(`  Engine: ${engine.type} rating=${engine.rating}  HS: ${hs.count}×${hs.type}`);
  console.log(`  Movement: walk=${mov.walk} run=${mov.run} jump=${mov.jump||0}`);
  console.log(`  cockpitMod=${b.cockpitModifier} cockpit=${b.cockpitType || unit.cockpit || 'standard'}`);
  console.log(`  Flags: ${flags.join(', ') || 'none'}`);
  console.log(`  armorType=${unit.armorType} structType=${unit.structureType}`);
  console.log('');
}
