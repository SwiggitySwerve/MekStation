// Check if structureBV includes engine multiplier
const fs = require('fs');
const path = require('path');
const r = require('../validation-output/bv-validation-report.json');
const idx = JSON.parse(fs.readFileSync(path.join(__dirname, '../public/data/units/battlemechs/index.json'), 'utf8'));

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
  if (!t) return 0;
  return t.head + t.ct + t.st * 2 + (isQuad ? t.leg * 4 : t.arm * 2 + t.leg * 2);
}

function loadUnit(id) {
  const entry = idx.units.find(x => x.id === id);
  if (!entry) return null;
  try { return JSON.parse(fs.readFileSync(path.join(__dirname, '../public/data/units/battlemechs', entry.path), 'utf8')); }
  catch (e) { return null; }
}

const ENGINE_MULTS = { FUSION: 1.0, XL: 0.5, CLAN_XL: 0.75, LIGHT: 0.75, XXL: 0.25, COMPACT: 1.0, ICE: 1.0 };

// Check structure BV for outlier units
const outliers = r.allResults.filter(x => x.breakdown && x.status !== 'exact' && x.status !== 'within1');
const correct = r.allResults.filter(x => x.breakdown && (x.status === 'exact' || x.status === 'within1'));

function checkGroup(units, label) {
  let mismatches = 0;
  let total = 0;
  for (const u of units.slice(0, 200)) {
    const unit = loadUnit(u.unitId);
    if (!unit) continue;
    const ton = unit.tonnage;
    const engineType = (unit.engine?.type || 'FUSION').toUpperCase();
    const isQuad = (unit.configuration || '').toLowerCase() === 'quad';
    const tis = totalIS(ton, isQuad);
    const eMult = ENGINE_MULTS[engineType] || 1.0;

    // Handle Clan XXL override
    let effectiveMult = eMult;
    if (engineType === 'XXL' && unit.techBase === 'CLAN') effectiveMult = 0.5;

    const expectedStruct = tis * 1.5 * effectiveMult;
    const reportedStruct = u.breakdown.structureBV;

    if (Math.abs(expectedStruct - reportedStruct) > 0.5) {
      mismatches++;
      const inferredMult = reportedStruct / (tis * 1.5);
      console.log(`  ${label} MISMATCH: ${u.unitId.padEnd(40)} expected=${expectedStruct.toFixed(2)} reported=${reportedStruct} engine=${engineType} inferredMult=${inferredMult.toFixed(3)} ton=${ton}`);
    }
    total++;
  }
  console.log(`${label}: ${mismatches} mismatches out of ${total} checked\n`);
}

console.log('=== Checking OUTLIER units ===');
checkGroup(outliers, 'OUTLIER');
console.log('=== Checking CORRECT units ===');
checkGroup(correct, 'CORRECT');
