// Component-level BV validation — verify each building block independently
// Layer 1: Structure (IS points, engine mult, struct type mult)
// Layer 2: Armor (total points, type mult)
// Layer 3: Gyro (tonnage × gyro mult)
// Layer 4: Movement (walk/run/jump MP, TMM, speed factor, defensive factor)
// Layer 5: Heat Sinks (count, type, dissipation)
// Layer 6: Weight bonus (tonnage × TSM mult × AES mult)
// Then flag which layer has errors for each unit

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

// Structure table
const IS_TABLE = {
  10: { head: 3, ct: 4, st: 3, arm: 1, leg: 2 },
  15: { head: 3, ct: 5, st: 4, arm: 2, leg: 3 },
  20: { head: 3, ct: 6, st: 5, arm: 3, leg: 4 },
  25: { head: 3, ct: 8, st: 6, arm: 4, leg: 6 },
  30: { head: 3, ct: 10, st: 7, arm: 5, leg: 7 },
  35: { head: 3, ct: 11, st: 8, arm: 6, leg: 8 },
  40: { head: 3, ct: 12, st: 10, arm: 6, leg: 10 },
  45: { head: 3, ct: 14, st: 11, arm: 7, leg: 11 },
  50: { head: 3, ct: 16, st: 12, arm: 8, leg: 12 },
  55: { head: 3, ct: 18, st: 13, arm: 9, leg: 13 },
  60: { head: 3, ct: 20, st: 14, arm: 10, leg: 14 },
  65: { head: 3, ct: 21, st: 15, arm: 10, leg: 15 },
  70: { head: 3, ct: 22, st: 15, arm: 11, leg: 15 },
  75: { head: 3, ct: 23, st: 16, arm: 12, leg: 16 },
  80: { head: 3, ct: 25, st: 17, arm: 13, leg: 17 },
  85: { head: 3, ct: 27, st: 18, arm: 14, leg: 18 },
  90: { head: 3, ct: 29, st: 19, arm: 15, leg: 19 },
  95: { head: 3, ct: 30, st: 20, arm: 16, leg: 20 },
  100: { head: 3, ct: 31, st: 21, arm: 17, leg: 21 },
};

function totalIS(ton, isQuad) {
  const t = IS_TABLE[ton];
  if (!t) return -1;
  return t.head + t.ct + t.st * 2 + (isQuad ? t.leg * 4 : t.arm * 2 + t.leg * 2);
}

// Engine multipliers (per MegaMek, based on side torso crits)
function getEngineMultFromCrits(engineType, techBase) {
  const u = (engineType || '').toUpperCase();
  if (u === 'CLAN_XL' || u === 'XLCLAN' || u === 'CLANXL') return 0.75;  // 2 crits
  if (u === 'XL' || u === 'XLENGINE') {
    return techBase === 'CLAN' ? 0.75 : 0.5;
  }
  if (u === 'LIGHT' || u === 'LIGHTENGINE') return 0.75;
  if (u === 'XXL' || u === 'XXLENGINE') {
    return techBase === 'CLAN' ? 0.5 : 0.25;
  }
  return 1.0; // Standard, Compact, ICE, etc.
}

// Structure type multiplier
function getStructMult(structType) {
  const u = (structType || '').toUpperCase().replace(/[_\s-]+/g, '');
  if (u.includes('REINFORCED')) return 2.0;
  if (u.includes('COMPOSITE')) return 0.5;
  if (u.includes('INDUSTRIAL')) return 0.5;
  return 1.0;
}

// Armor type multiplier
// BV 2.0: armor BV = totalPoints × 2.5 × armorMult
// Most armor types use 1.0 (ferro-fibrous just saves weight, giving MORE points per ton)
// Only special armor types have different multipliers (per TechManual/TactOps BV rules)
const ARMOR_MULTS = {
  'standard': 1.0,
  'ferro-fibrous': 1.0, 'ferro_fibrous': 1.0,
  'ferro-fibrous-clan': 1.0, 'ferro_fibrous_clan': 1.0,
  'light-ferro-fibrous': 1.0, 'light_ferro_fibrous': 1.0,
  'heavy-ferro-fibrous': 1.0, 'heavy_ferro_fibrous': 1.0,
  'stealth': 1.0,
  'endo-steel': 1.0, 'endo_steel': 1.0,
  'endo-steel-clan': 1.0, 'endo_steel_clan': 1.0,
  // Special multipliers per ARMOR_BV_MULTIPLIERS in BattleValue.ts
  'hardened': 2.0,
  'reactive': 1.5, 'reflective': 1.5, 'laser-reflective': 1.5,
  'ballistic-reinforced': 1.5,
  'ferro-lamellor': 1.2, 'ferro_lamellor': 1.2,
  'anti-penetrative': 1.2,
  'heat-dissipating': 1.1,
};

function getArmorMult(armorType) {
  const lo = (armorType || 'standard').toLowerCase().replace(/[_\s]+/g, '-');
  return ARMOR_MULTS[lo] ?? 1.0;
}

// Gyro multipliers
function getGyroMult(gyroType) {
  const u = (gyroType || 'standard').toUpperCase().replace(/[_\s-]+/g, '');
  if (u.includes('HEAVYDUTY') || u === 'HEAVY') return 1.0;
  if (u.includes('COMPACT')) return 0.5;
  if (u.includes('XL')) return 0.5;
  return 0.5; // standard = 0.5
}

// TMM from MP
function tmmFromMP(mp) {
  if (mp <= 2) return 0;
  if (mp <= 4) return 1;
  if (mp <= 6) return 2;
  if (mp <= 9) return 3;
  if (mp <= 17) return 4;
  if (mp <= 24) return 5;
  return 6;
}

// Speed factor
function speedFactor(runMP, jumpMP, umuMP) {
  const mp = runMP + Math.round(Math.max(jumpMP || 0, umuMP || 0) / 2.0);
  return Math.round(Math.pow(1 + (mp - 5) / 10.0, 1.2) * 100.0) / 100.0;
}

// Detect quad from armor locations
function isQuadFromArmor(unit) {
  const armorKeys = Object.keys(unit.armor?.allocation || {}).map(k => k.toUpperCase());
  return armorKeys.some(k => ['FLL', 'FRL', 'RLL', 'RRL', 'FRONT_LEFT_LEG', 'FRONT_RIGHT_LEG', 'REAR_LEFT_LEG', 'REAR_RIGHT_LEG'].includes(k));
}

// Calculate total armor points
function calcTotalArmor(allocation) {
  let total = 0;
  for (const v of Object.values(allocation)) {
    if (typeof v === 'number') total += v;
    else if (v && typeof v === 'object') total += (v.front || 0) + (v.rear || 0);
  }
  return total;
}

// Detect crits
function scanSpecialCrits(unit) {
  const crits = unit.criticalSlots ? Object.values(unit.criticalSlots).flat().filter(s => s && typeof s === 'string') : [];
  const lo = crits.map(s => s.toLowerCase());
  return {
    hasTSM: lo.some(s => s === 'tsm' || s.includes('triple strength') || s.includes('triplestrength')),
    hasMASC: lo.some(s => s.includes('masc') && !s.includes('ammo')),
    hasSC: lo.some(s => s.includes('supercharger')),
    hasTC: lo.some(s => s.includes('targeting computer') || s.includes('targetingcomputer')),
    hasPartialWing: lo.some(s => s.includes('partial') && s.includes('wing')),
    hasImprovedJJ: lo.some(s => s.includes('improvedjumpjet') || (s.includes('improved') && s.includes('jump'))),
    hasNullSig: lo.some(s => s.includes('null') && s.includes('sig')),
    hasVoidSig: lo.some(s => s.includes('void') && s.includes('sig')),
    hasChameleon: lo.some(s => s.includes('chameleon') && (s.includes('shield') || s.includes('lps') || s.includes('polariz'))),
    hasStealth: (unit.armorType || unit.armor?.type || '').toLowerCase().includes('stealth'),
    hasLargeShield: lo.some(s => s.includes('shield') && s.includes('large') && !s.includes('blue')),
    hasHardened: (unit.armorType || unit.armor?.type || '').toLowerCase().includes('hardened'),
    aesCount: lo.filter(s => s.includes('aes') || s.includes('actuator enhancement')).length,
  };
}

// === MAIN ANALYSIS ===
const all = r.allResults.filter(x => x.breakdown);
const componentErrors = { structure: 0, gyro: 0, armorPoints: 0, armorMult: 0, defFactor: 0, speedFactor: 0, weightBonus: 0, heatDiss: 0 };
const errorsByLayer = {};
const unitErrors = [];

for (const u of all) {
  const unit = loadUnit(u.unitId);
  if (!unit) continue;
  const b = u.breakdown;
  const ton = unit.tonnage;
  const isQuad = (unit.configuration || '').toLowerCase() === 'quad' || isQuadFromArmor(unit);
  const engineType = (unit.engine?.type || 'FUSION');
  const structType = unit.structureType || unit.structure?.type || 'standard';
  const armorType = unit.armorType || unit.armor?.type || 'standard';
  const gyroType = unit.gyro?.type || 'standard';
  const spec = scanSpecialCrits(unit);

  const errors = [];

  // Layer 1: Structure BV
  const expectedTotalIS = totalIS(ton, isQuad);
  const engineMult = getEngineMultFromCrits(engineType, unit.techBase);
  const structMult = getStructMult(structType);
  const expectedStructBV = expectedTotalIS * 1.5 * structMult * engineMult;
  if (Math.abs(expectedStructBV - b.structureBV) > 1.0) {
    errors.push(`struct: expected=${expectedStructBV.toFixed(1)} got=${b.structureBV} (engineMult=${engineMult} structMult=${structMult} totalIS=${expectedTotalIS})`);
    componentErrors.structure++;
  }

  // Layer 2: Gyro BV
  const expectedGyro = ton * getGyroMult(gyroType);
  if (Math.abs(expectedGyro - b.gyroBV) > 0.5) {
    errors.push(`gyro: expected=${expectedGyro} got=${b.gyroBV} (gyroType=${gyroType})`);
    componentErrors.gyro++;
  }

  // Layer 3: Total Armor Points
  const totalArmorPts = calcTotalArmor(unit.armor?.allocation || {});
  const expectedArmorBV = Math.round(totalArmorPts * 2.5 * getArmorMult(armorType) * 10) / 10;
  if (Math.abs(expectedArmorBV - b.armorBV) > 2.0) {
    errors.push(`armor: expected=${expectedArmorBV.toFixed(1)} got=${b.armorBV} (pts=${totalArmorPts} mult=${getArmorMult(armorType)} type=${armorType})`);
    componentErrors.armorPoints++;
  }

  // Layer 4: Movement / TMM / Defensive Factor
  let bvWalk = (unit.movement?.walk || 0);
  if (spec.hasTSM) bvWalk++;
  let runMP = spec.hasMASC && spec.hasSC ? Math.ceil(bvWalk * 2.5) :
    (spec.hasMASC || spec.hasSC ? bvWalk * 2 : Math.ceil(bvWalk * 1.5));
  if (spec.hasHardened) runMP = Math.max(0, runMP - 1);
  if (spec.hasLargeShield) runMP = Math.max(0, runMP - 1);
  let jumpMP = (unit.movement?.jump || 0);
  if (spec.hasPartialWing) jumpMP += (ton <= 55 ? 2 : 1);

  // TMM
  const runTMM = tmmFromMP(runMP);
  const jumpTMM = jumpMP > 0 ? tmmFromMP(jumpMP) + 1 : 0;
  let expectedTMM = Math.max(runTMM, jumpTMM);
  if (spec.hasStealth || spec.hasNullSig) expectedTMM += 2;
  if (spec.hasChameleon) expectedTMM += 2;
  if (spec.hasVoidSig) { if (expectedTMM < 3) expectedTMM = 3; else if (expectedTMM === 3) expectedTMM++; }
  const expectedDefFactor = 1 + expectedTMM / 10.0;
  if (Math.abs(expectedDefFactor - b.defensiveFactor) > 0.01) {
    errors.push(`defFactor: expected=${expectedDefFactor.toFixed(2)} got=${b.defensiveFactor} (runMP=${runMP} jumpMP=${jumpMP} TMM=${expectedTMM})`);
    componentErrors.defFactor++;
  }

  // Layer 5: Speed Factor
  const expectedSF = speedFactor(runMP, jumpMP);
  if (Math.abs(expectedSF - b.speedFactor) > 0.01) {
    errors.push(`speedFactor: expected=${expectedSF.toFixed(2)} got=${b.speedFactor} (runMP=${runMP} jumpMP=${jumpMP})`);
    componentErrors.speedFactor++;
  }

  // Layer 6: Weight Bonus
  const expectedWeight = ton; // base weight bonus (without TSM/AES)
  if (spec.hasTSM && b.weightBonus !== ton * 1.5) {
    errors.push(`weightBonus: expected=${ton * 1.5} (TSM) got=${b.weightBonus}`);
    componentErrors.weightBonus++;
  } else if (!spec.hasTSM && spec.aesCount === 0 && Math.abs(b.weightBonus - expectedWeight) > 0.5) {
    errors.push(`weightBonus: expected=${expectedWeight} got=${b.weightBonus}`);
    componentErrors.weightBonus++;
  }

  // Layer 7: Heat Dissipation
  const hsCount = unit.heatSinks?.count || 0;
  const hsType = (unit.heatSinks?.type || 'single').toUpperCase();
  const isDHS = hsType.includes('DOUBLE') || hsType.includes('LASER');
  let expectedHeatDiss = hsCount * (isDHS ? 2 : 1);
  if (spec.hasPartialWing) expectedHeatDiss += 3;
  if (Math.abs(expectedHeatDiss - b.heatDissipation) > 1) {
    errors.push(`heatDiss: expected=${expectedHeatDiss} got=${b.heatDissipation} (hs=${hsCount}×${isDHS ? 'DHS' : 'SHS'})`);
    componentErrors.heatDiss++;
  }

  if (errors.length > 0 && u.status !== 'exact' && u.status !== 'within1') {
    unitErrors.push({ id: u.unitId, diff: u.difference, pct: u.percentDiff, errors, status: u.status });
  }
}

console.log('=== Component Error Summary ===');
console.log(`Total units checked: ${all.length}`);
for (const [comp, count] of Object.entries(componentErrors).sort((a, b) => b[1] - a[1])) {
  console.log(`  ${comp.padEnd(20)} ${count} errors (${(count / all.length * 100).toFixed(1)}%)`);
}

// Show outlier units with specific component errors
console.log(`\n=== Outlier Units with Component Errors (${unitErrors.length} total) ===`);
unitErrors.sort((a, b) => Math.abs(a.pct) - Math.abs(b.pct));
for (const u of unitErrors.slice(0, 40)) {
  console.log(`\n  ${u.id.padEnd(40)} diff=${String(u.diff).padStart(5)} (${(u.pct).toFixed(2)}%)`);
  for (const e of u.errors) {
    console.log(`    ${e}`);
  }
}
