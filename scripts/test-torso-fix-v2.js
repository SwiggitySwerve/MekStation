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

const tmUnits = r.allResults.filter(u => {
  const data = unitMap.get(u.unitId);
  return data && data.cockpit === 'TORSO_MOUNTED';
}).sort((a, b) => a.percentDiff - b.percentDiff);

// Test 3 approaches:
// A: CT armor doubling + 0.95 mod (MegaMek exact)
// B: CT armor doubling only (no 0.95 mod)
// C: Current (just +7 armor, 1.0 mod)

function getArmorMult(armorType) {
  if (!armorType) return 1.0;
  const lo = armorType.toLowerCase();
  if (lo.includes('hardened')) return 2.0;
  if (lo.includes('heavy') && lo.includes('ferro')) return 1.24;
  if (lo.includes('light') && lo.includes('ferro')) return 1.06;
  if (lo.includes('clan') && lo.includes('ferro')) return 1.2;
  if (lo.includes('ferro')) return 1.12;
  return 1.0;
}

let within1_current = 0, within1_A = 0, within1_B = 0;

console.log('Approach A: CT armor doubling + 0.95 mod');
console.log('Approach B: CT armor doubling only (1.0 mod)');
console.log('Approach C: Current (+7 armor, 1.0 mod)\n');

for (const u of tmUnits) {
  const data = unitMap.get(u.unitId);
  if (!data) continue;

  const ctAlloc = data.armor?.allocation?.CENTER_TORSO || data.armor?.allocation?.CT;
  let ctFront = 0, ctRear = 0;
  if (typeof ctAlloc === 'number') ctFront = ctAlloc;
  else if (ctAlloc) { ctFront = ctAlloc.front || 0; ctRear = ctAlloc.rear || 0; }
  const ctTotal = ctFront + ctRear;
  const extraArmorPoints = ctTotal - 7;
  const armorMult = getArmorMult(data.armor?.type);
  const df = (u.breakdown || {}).defensiveFactor || 1.0;
  const extraArmorBV = extraArmorPoints * 2.5 * armorMult * df;

  const currentBaseBV = u.calculatedBV;
  const newCalcA = Math.round((currentBaseBV + extraArmorBV) * 0.95);
  const newCalcB = Math.round(currentBaseBV + extraArmorBV);

  const diffA = ((newCalcA - u.indexBV) / u.indexBV) * 100;
  const diffB = ((newCalcB - u.indexBV) / u.indexBV) * 100;

  if (Math.abs(u.percentDiff) <= 1) within1_current++;
  if (Math.abs(diffA) <= 1) within1_A++;
  if (Math.abs(diffB) <= 1) within1_B++;

  const best = Math.abs(diffA) < Math.abs(diffB) ? 'A' : (Math.abs(diffB) < Math.abs(u.percentDiff) ? 'B' : 'C');
  if (Math.abs(u.percentDiff) > 1 || Math.abs(diffA) > 1 || Math.abs(diffB) > 1) {
    console.log(`${u.chassis} ${u.model}: CT=${ctTotal} armorM=${armorMult} df=${df}`);
    console.log(`  C=${u.percentDiff.toFixed(2)}% A=${diffA.toFixed(2)}% B=${diffB.toFixed(2)}% best=${best}`);
  }
}

console.log(`\nWithin 1% comparison (torso-mounted only, ${tmUnits.length} units):`);
console.log(`  Current (C): ${within1_current}/${tmUnits.length}`);
console.log(`  CT+0.95 (A): ${within1_A}/${tmUnits.length}`);
console.log(`  CT only (B): ${within1_B}/${tmUnits.length}`);
