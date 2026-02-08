const fs = require('fs');
const path = require('path');
const r = JSON.parse(fs.readFileSync('validation-output/bv-validation-report.json', 'utf8'));

function findJsonFiles(dir) {
  const results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) results.push(...findJsonFiles(full));
    else if (entry.name.endsWith('.json') && entry.name !== 'index.json') results.push(full);
  }
  return results;
}

const files = findJsonFiles('public/data/units/battlemechs');
const unitMap = new Map();
for (const f of files) {
  try { const d = JSON.parse(fs.readFileSync(f, 'utf8')); unitMap.set(d.id, d); } catch {}
}

// For each torso-mounted unit, compute what the fix would do
const tmUnits = r.allResults.filter(u => {
  const data = unitMap.get(u.unitId);
  return data && data.cockpit === 'TORSO_MOUNTED';
}).sort((a, b) => a.percentDiff - b.percentDiff);

console.log('=== Torso-mounted cockpit fix simulation ===');
console.log('Fix: Replace +7 fixed armor with CT front+rear armor doubling, apply 0.95 modifier\n');

let fixedCount = 0;
let currentWithin1 = 0;

for (const u of tmUnits) {
  const data = unitMap.get(u.unitId);
  if (!data) continue;

  // Get CT armor
  const ctAlloc = data.armor?.allocation?.CENTER_TORSO || data.armor?.allocation?.CT;
  let ctFront = 0, ctRear = 0;
  if (typeof ctAlloc === 'number') {
    ctFront = ctAlloc;
  } else if (ctAlloc) {
    ctFront = ctAlloc.front || 0;
    ctRear = ctAlloc.rear || 0;
  }
  const ctTotal = ctFront + ctRear;

  // Current: adds +7 to armor, cockpit mod = 1.0
  // Fix: adds ctTotal to armor, cockpit mod = 0.95
  // Extra armor points: ctTotal - 7
  const extraArmorPoints = ctTotal - 7;

  // Armor BV multiplier depends on armor type
  const armorType = data.armor?.type?.toLowerCase() || 'standard';
  let armorMult = 1.0;
  if (armorType.includes('ferro-fibrous') || armorType.includes('ferro_fibrous')) {
    armorMult = armorType.includes('clan') ? 1.2 : 1.12;
  } else if (armorType.includes('light-ferro') || armorType.includes('light_ferro')) {
    armorMult = 1.06;
  } else if (armorType.includes('heavy-ferro') || armorType.includes('heavy_ferro')) {
    armorMult = 1.24;
  } else if (armorType.includes('hardened')) {
    armorMult = 2.0;
  } else if (armorType.includes('reactive')) {
    armorMult = 1.0; // reactive is actually 1.0 for BV
  } else if (armorType.includes('reflective') || armorType.includes('laser-reflective')) {
    armorMult = 1.0;
  }

  const b = u.breakdown || {};
  const df = b.defensiveFactor || 1.0;

  // Extra BV from armor doubling
  const extraArmorBV = extraArmorPoints * 2.5 * armorMult * df;

  // Current baseBV = calc / cockpitMod (cockpitMod = 1.0 currently)
  const currentBaseBV = u.calculatedBV; // since cockpit mod is 1.0
  const newBaseBV = currentBaseBV + extraArmorBV;
  const newCalc = Math.round(newBaseBV * 0.95);

  const newDiff = ((newCalc - u.indexBV) / u.indexBV) * 100;
  const improved = Math.abs(newDiff) < Math.abs(u.percentDiff);

  if (Math.abs(u.percentDiff) <= 1) currentWithin1++;
  if (Math.abs(newDiff) <= 1) fixedCount++;

  const marker = Math.abs(newDiff) <= 1 ? ' [WITHIN 1%]' : '';
  if (Math.abs(u.percentDiff) > 1 || Math.abs(newDiff) > 1) {
    console.log(`${u.chassis} ${u.model}: CT=${ctTotal} (f=${ctFront} r=${ctRear}) extra=${extraArmorPoints} armorMult=${armorMult} df=${df}`);
    console.log(`  Old: calc=${u.calculatedBV} ref=${u.indexBV} diff=${u.percentDiff.toFixed(2)}%`);
    console.log(`  New: calc=${newCalc} diff=${newDiff.toFixed(2)}%${marker} ${improved ? 'IMPROVED' : 'WORSENED'}`);
  }
}

console.log(`\nSummary: ${currentWithin1}/${tmUnits.length} currently within 1% → ${fixedCount}/${tmUnits.length} with fix`);
