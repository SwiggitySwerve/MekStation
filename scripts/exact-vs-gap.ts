import * as fs from 'fs';
import * as path from 'path';

const report = JSON.parse(fs.readFileSync('validation-output/bv-validation-report.json', 'utf8'));
const unitsDir = path.resolve(__dirname, '../public/data/units/battlemechs');
const index = JSON.parse(fs.readFileSync(path.join(unitsDir, 'index.json'), 'utf8'));

// Check: units with exact match (gap=0) vs undercalculated (-1% to -5%)
// What distinguishes them?

const exactUnits = report.allResults.filter((r: any) => r.difference === 0);
const gapUnits = report.allResults.filter((r: any) => r.percentDiff < -1.0 && r.percentDiff > -5.0);

console.log(`Exact match: ${exactUnits.length} units`);
console.log(`Gap (-1% to -5%): ${gapUnits.length} units\n`);

// Compare heat sink types
function getHSType(unitId: string): string {
  const entry = index.units.find((u: any) => u.id === unitId);
  if (!entry?.path) return 'unknown';
  try {
    const u = JSON.parse(fs.readFileSync(path.join(unitsDir, entry.path), 'utf8'));
    return u.heatSinks?.type || 'unknown';
  } catch { return 'unknown'; }
}

// Compare: fraction of units with DHS vs SHS in each group
const exactDHS = exactUnits.filter((r: any) => {
  const hs = getHSType(r.unitId).toUpperCase();
  return hs.includes('DOUBLE') || hs.includes('LASER');
}).length;
const gapDHS = gapUnits.filter((r: any) => {
  const hs = getHSType(r.unitId).toUpperCase();
  return hs.includes('DOUBLE') || hs.includes('LASER');
}).length;

console.log('Heat sink type:');
console.log(`  Exact: ${exactDHS}/${exactUnits.length} DHS (${(exactDHS/exactUnits.length*100).toFixed(1)}%)`);
console.log(`  Gap:   ${gapDHS}/${gapUnits.length} DHS (${(gapDHS/gapUnits.length*100).toFixed(1)}%)\n`);

// Check: does the gap scale with the number of heat-using weapons?
// For exact match units that have DHS, what are they doing right?
console.log('=== SAMPLING EXACT MATCH DHS UNITS (energy only, no ammo) ===');
let count = 0;
for (const r of exactUnits) {
  if (count >= 10) break;
  const b = r.breakdown;
  if (!b || b.ammoBV > 0) continue;

  const entry = index.units.find((u: any) => u.id === r.unitId);
  if (!entry?.path) continue;
  try {
    const u = JSON.parse(fs.readFileSync(path.join(unitsDir, entry.path), 'utf8'));
    const hs = (u.heatSinks?.type || '').toUpperCase();
    if (!hs.includes('DOUBLE') && !hs.includes('LASER')) continue;

    console.log(`${r.unitId}: idx=${r.indexBV} calc=${r.calculatedBV} wBV=${b.weaponBV} sf=${b.speedFactor}`);
    console.log(`  ${u.tonnage}t ${u.techBase} walk=${u.movement.walk} jump=${u.movement.jump || 0} engine=${u.engine.type} HS=${u.heatSinks.count}x${u.heatSinks.type}`);
    console.log(`  Equipment: ${u.equipment.map((e: any) => e.id).join(', ')}`);
    console.log('');
    count++;
  } catch {}
}

// Check something specific: maybe the issue is in how we handle weapons
// with BV that get BOTH TC and heat-halving applied.
// In MegaMek, the order is: AES → rear → Artemis → TC → heat halving
// The weapon that crosses the threshold gets FULL BV, next ones get halved.
// Is our implementation getting this right?

console.log('=== SAMPLING GAP DHS UNITS (energy only, no ammo) ===');
count = 0;
for (const r of gapUnits) {
  if (count >= 10) break;
  const b = r.breakdown;
  if (!b || b.ammoBV > 0) continue;

  const entry = index.units.find((u: any) => u.id === r.unitId);
  if (!entry?.path) continue;
  try {
    const u = JSON.parse(fs.readFileSync(path.join(unitsDir, entry.path), 'utf8'));
    const hs = (u.heatSinks?.type || '').toUpperCase();
    if (!hs.includes('DOUBLE') && !hs.includes('LASER')) continue;

    // Compute what MegaMek's raw offensive would be
    const neededOff = r.indexBV - b.defensiveBV;
    const neededRaw = neededOff / b.speedFactor;
    const ourRaw = b.offensiveBV / b.speedFactor;

    console.log(`${r.unitId}: idx=${r.indexBV} calc=${r.calculatedBV} gap=${r.difference} (${r.percentDiff.toFixed(2)}%)`);
    console.log(`  ${u.tonnage}t ${u.techBase} walk=${u.movement.walk} jump=${u.movement.jump || 0} engine=${u.engine.type} HS=${u.heatSinks.count}x${u.heatSinks.type}`);
    console.log(`  wBV=${b.weaponBV} sf=${b.speedFactor} rawOff=${ourRaw.toFixed(1)} needed=${neededRaw.toFixed(1)} rawGap=${(neededRaw - ourRaw).toFixed(1)}`);
    console.log(`  Equipment: ${u.equipment.map((e: any) => e.id).join(', ')}`);

    // Compute heat efficiency
    const jumpMP = u.movement.jump || 0;
    const walkMP = u.movement.walk;
    const runMP = Math.ceil(walkMP * 1.5);
    const engType = u.engine.type.toUpperCase();
    let runHeat = 2;
    if (engType.includes('ICE') || engType.includes('FUEL')) runHeat = 0;
    else if (engType.includes('XXL')) runHeat = 6;
    let jumpHeat = jumpMP > 0 ? Math.max(3, jumpMP) : 0;
    if (engType.includes('XXL') && jumpMP > 0) jumpHeat = Math.max(6, jumpMP * 2);
    const moveHeat = Math.max(runHeat, jumpHeat);
    const isDHS = hs.includes('DOUBLE') || hs.includes('LASER');
    const heatDiss = u.heatSinks.count * (isDHS ? 2 : 1);
    const heatEfficiency = 6 + heatDiss - moveHeat;

    // Count total weapon heat
    let totalWeaponHeat = 0;
    for (const eq of u.equipment) {
      // rough estimate - just check if we're likely exceeding heat efficiency
    }

    console.log(`  heatEff: 6 + ${heatDiss} - ${moveHeat} = ${heatEfficiency}`);
    console.log('');
    count++;
  } catch {}
}
