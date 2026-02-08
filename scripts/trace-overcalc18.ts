import * as fs from 'fs';
import * as path from 'path';

const data = JSON.parse(fs.readFileSync('validation-output/bv-validation-report.json', 'utf8'));
const mulCache = JSON.parse(fs.readFileSync('scripts/data-migration/mul-bv-cache.json', 'utf8'));
const indexData = JSON.parse(fs.readFileSync('public/data/units/battlemechs/index.json', 'utf8'));

// Focus on units with ratio EXACTLY 1.0527 (+/- 0.001)
// These units are overcalculated by precisely 1/0.95 = 1.052631...
const exactFive = data.allResults.filter((d: any) => {
  if (d.difference <= 0) return false;
  const entry = mulCache.entries?.[d.unitId];
  if (!entry || entry.mulBV <= 0 || entry.matchType !== 'exact') return false;
  const ratio = d.calculatedBV / d.indexBV;
  return ratio >= 1.051 && ratio <= 1.054;
});

console.log('=== UNITS WITH EXACT 1.0527 RATIO ===');
console.log('Count:', exactFive.length);
console.log('');

// For each, check what they have in common
let clanCount = 0, isCount = 0, mixedCount = 0;
let fusionCount = 0, xlCount = 0, lightCount = 0, xxlCount = 0, compactCount = 0;
let stdArmorCount = 0, ferroCount = 0, reactiveCount = 0, reflectiveCount = 0, stealthCount = 0, otherArmorCount = 0;
let quadCount = 0, bipedCount = 0;
const chassisSet = new Set<string>();

for (const d of exactFive) {
  const iu = indexData.units.find((u: any) => u.id === d.unitId);
  if (!iu) continue;
  try {
    const unitPath = path.resolve('public/data/units/battlemechs', iu.path);
    const unit = JSON.parse(fs.readFileSync(unitPath, 'utf8'));

    if (unit.techBase === 'CLAN') clanCount++;
    else if (unit.techBase === 'MIXED') mixedCount++;
    else isCount++;

    const engType = unit.engine.type.toUpperCase();
    if (engType.includes('XL') && !engType.includes('XXL')) xlCount++;
    else if (engType.includes('XXL')) xxlCount++;
    else if (engType.includes('LIGHT')) lightCount++;
    else if (engType.includes('COMPACT')) compactCount++;
    else fusionCount++;

    const armorType = unit.armor.type.toUpperCase().replace(/[_\s-]+/g, '');
    if (armorType.includes('REACTIVE')) reactiveCount++;
    else if (armorType.includes('REFLECTIVE') || armorType.includes('LASERREFLECTIVE')) reflectiveCount++;
    else if (armorType.includes('FERRO')) ferroCount++;
    else if (armorType.includes('STEALTH')) stealthCount++;
    else if (armorType === 'STANDARD') stdArmorCount++;
    else otherArmorCount++;

    if (unit.configuration === 'Quad') quadCount++;
    else bipedCount++;

    chassisSet.add(unit.chassis || iu.chassis);
  } catch {}
}

console.log('Tech base: CLAN:', clanCount, 'IS:', isCount, 'MIXED:', mixedCount);
console.log('Engine: Fusion:', fusionCount, 'XL:', xlCount, 'Light:', lightCount, 'XXL:', xxlCount, 'Compact:', compactCount);
console.log('Armor: Std:', stdArmorCount, 'Ferro:', ferroCount, 'Reactive:', reactiveCount, 'Reflective:', reflectiveCount, 'Stealth:', stealthCount, 'Other:', otherArmorCount);
console.log('Config: Biped:', bipedCount, 'Quad:', quadCount);
console.log('Unique chassis:', chassisSet.size);
console.log('');

// List ALL of them with details
for (const d of exactFive.sort((a: any, b: any) => a.unitId.localeCompare(b.unitId))) {
  const ratio = (d.calculatedBV / d.indexBV).toFixed(4);
  const adj = Math.round(d.calculatedBV * 0.95);
  const adjDiff = adj - d.indexBV;
  console.log(`  ${d.unitId}: calc=${d.calculatedBV} ref=${d.indexBV} ratio=${ratio} *0.95=${adj} (diff=${adjDiff})`);
}

// Now check: for units that DON'T have this exact ratio but are still overcalculated,
// what's different about them?
console.log('\n=== UNITS NOT MATCHING 1.0527 BUT STILL OVERCALCULATED ===');
const notExactFive = data.allResults.filter((d: any) => {
  if (d.difference <= 0 || d.percentDiff < 4) return false;
  const entry = mulCache.entries?.[d.unitId];
  if (!entry || entry.mulBV <= 0 || entry.matchType !== 'exact') return false;
  const ratio = d.calculatedBV / d.indexBV;
  return ratio < 1.051 || ratio > 1.054;
});

console.log('Count:', notExactFive.length);
for (const d of notExactFive.slice(0, 30)) {
  const ratio = (d.calculatedBV / d.indexBV).toFixed(4);
  const adj = Math.round(d.calculatedBV * 0.95);
  console.log(`  ${d.unitId}: calc=${d.calculatedBV} ref=${d.indexBV} ratio=${ratio} *0.95=${adj} (diff=${adj - d.indexBV})`);
}
