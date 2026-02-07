import * as fs from 'fs';
import * as path from 'path';

const report = JSON.parse(fs.readFileSync('validation-output/bv-validation-report.json', 'utf8'));
const unitsDir = path.resolve(__dirname, '../public/data/units/battlemechs');
const index = JSON.parse(fs.readFileSync(path.join(unitsDir, 'index.json'), 'utf8'));

// Find all Boreas variants
const boreas = report.allResults.filter((r: any) => r.unitId.startsWith('boreas'));
console.log('=== ALL BOREAS VARIANTS ===');
for (const r of boreas) {
  const b = r.breakdown;
  console.log(`\n${r.unitId}: idx=${r.indexBV} calc=${r.calculatedBV} gap=${r.difference} (${r.percentDiff?.toFixed(2)}%)`);
  if (b) {
    console.log(`  defBV=${b.defensiveBV?.toFixed(2)} offBV=${b.offensiveBV?.toFixed(2)}`);
    console.log(`  weaponBV=${b.weaponBV?.toFixed(2)} ammoBV=${b.ammoBV?.toFixed(2)}`);
    console.log(`  speedFactor=${b.speedFactor?.toFixed(4)} defEquipBV=${b.defensiveEquipBV} explosivePen=${b.explosivePenalty}`);
  }
}

// Load a specific Boreas unit for detailed analysis
const boreId = 'boreas-d';
const boreEntry = index.units.find((u: any) => u.id === boreId);
if (!boreEntry) { console.log('Boreas-D not found'); process.exit(1); }
const unit = JSON.parse(fs.readFileSync(path.join(unitsDir, boreEntry.path), 'utf8'));

console.log('\n\n=== BOREAS-D DETAILED TRACE ===');
console.log(`Tonnage: ${unit.tonnage}t  TechBase: ${unit.techBase}`);
console.log(`Engine: ${unit.engine.type} ${unit.engine.rating}`);
console.log(`Gyro: ${unit.gyro?.type}`);
console.log(`Structure: ${unit.structure?.type}`);
console.log(`Armor: ${unit.armor?.type}`);
console.log(`HeatSinks: ${unit.heatSinks?.type} ${unit.heatSinks?.count}`);
console.log(`Movement: walk=${unit.movement.walk} jump=${unit.movement.jump || 0}`);

// Armor points
const armorAlloc = unit.armor.allocation;
let totalArmor = 0;
for (const [loc, val] of Object.entries(armorAlloc)) {
  if (typeof val === 'number') totalArmor += val;
  else if (val && typeof val === 'object') totalArmor += ((val as any).front || 0) + ((val as any).rear || 0);
}
console.log(`\nTotal armor points: ${totalArmor}`);

// Structure
const STRUCTURE_POINTS: Record<number, any> = {
  20: { head: 3, centerTorso: 6, sideTorso: 5, arm: 3, leg: 4 },
  25: { head: 3, centerTorso: 8, sideTorso: 6, arm: 4, leg: 6 },
  30: { head: 3, centerTorso: 10, sideTorso: 7, arm: 5, leg: 7 },
  35: { head: 3, centerTorso: 11, sideTorso: 8, arm: 6, leg: 8 },
  40: { head: 3, centerTorso: 12, sideTorso: 10, arm: 6, leg: 10 },
  45: { head: 3, centerTorso: 14, sideTorso: 11, arm: 7, leg: 11 },
  50: { head: 3, centerTorso: 16, sideTorso: 12, arm: 8, leg: 12 },
  55: { head: 3, centerTorso: 18, sideTorso: 13, arm: 9, leg: 13 },
  60: { head: 3, centerTorso: 20, sideTorso: 14, arm: 10, leg: 14 },
  65: { head: 3, centerTorso: 21, sideTorso: 15, arm: 10, leg: 15 },
  70: { head: 3, centerTorso: 22, sideTorso: 15, arm: 11, leg: 15 },
  75: { head: 3, centerTorso: 23, sideTorso: 16, arm: 12, leg: 16 },
  80: { head: 3, centerTorso: 25, sideTorso: 17, arm: 13, leg: 17 },
  85: { head: 3, centerTorso: 27, sideTorso: 18, arm: 14, leg: 18 },
  90: { head: 3, centerTorso: 29, sideTorso: 19, arm: 15, leg: 19 },
  95: { head: 3, centerTorso: 30, sideTorso: 20, arm: 16, leg: 20 },
  100: { head: 3, centerTorso: 31, sideTorso: 21, arm: 17, leg: 21 },
};
const sp = STRUCTURE_POINTS[unit.tonnage];
const totalStructure = sp.head + sp.centerTorso + sp.sideTorso * 2 + sp.arm * 2 + sp.leg * 2;
console.log(`Total structure points: ${totalStructure}`);

// BV calc components
const armorBV = totalArmor * 2.5 * 1.0; // standard armor mult = 1.0
const structBV = totalStructure * 1.5 * 1.0 * 1.0; // standard structure, standard engine
const gyroBV = unit.tonnage * 0.5; // standard gyro
console.log(`\narmorBV = ${totalArmor} × 2.5 × 1.0 = ${armorBV}`);
console.log(`structBV = ${totalStructure} × 1.5 × 1.0 × 1.0 = ${structBV}`);
console.log(`gyroBV = ${unit.tonnage} × 0.5 = ${gyroBV}`);

// Movement
const walkMP = unit.movement.walk;
const runMP = Math.ceil(walkMP * 1.5);
const jumpMP = unit.movement.jump || 0;

// TMM
const tmmTable: Record<number, number> = { 0: -4, 1: -2, 2: 0, 3: 1, 4: 2, 5: 3, 6: 4, 7: 5, 8: 6, 9: 7, 10: 8, 11: 9, 12: 10, 13: 11, 14: 11, 15: 12, 16: 12, 17: 12 };
const runTMM = tmmTable[Math.min(runMP, 17)] || 0;
const jumpTMM = jumpMP > 0 ? (tmmTable[Math.min(jumpMP, 17)] || 0) + 1 : 0;
const maxTMM = Math.max(runTMM, jumpTMM);
const defensiveFactor = 1 + maxTMM / 10;
console.log(`\nwalk=${walkMP} run=${runMP} jump=${jumpMP}`);
console.log(`runTMM=${runTMM} jumpTMM=${jumpTMM} maxTMM=${maxTMM}`);
console.log(`defensiveFactor=${defensiveFactor}`);

const defBV = (armorBV + structBV + gyroBV + 0 - 0) * defensiveFactor * 1.0;
console.log(`\ndefBV = (${armorBV} + ${structBV} + ${gyroBV}) × ${defensiveFactor} = ${defBV}`);

// Crits
console.log(`\nAll crit slots:`);
for (const [loc, slots] of Object.entries(unit.criticalSlots || {})) {
  if (!Array.isArray(slots)) continue;
  const filled = (slots as any[]).filter((s: any) => s && typeof s === 'string');
  if (filled.length > 0) {
    console.log(`  ${loc}: ${filled.join(' | ')}`);
  }
}

// Weapons
console.log(`\nEquipment list:`);
for (const eq of (unit.equipment || [])) {
  console.log(`  ${eq.id} @ ${eq.location}`);
}

// Figure out what our offensive BV should be
const boreResult = boreas.find((r: any) => r.unitId === boreId);
if (boreResult) {
  const b = boreResult.breakdown;
  const offBV = b.offensiveBV;
  const sf = b.speedFactor;
  const rawOff = offBV / sf;
  const neededTotal = boreResult.indexBV;
  const neededOff = neededTotal - b.defensiveBV;
  const neededRawOff = neededOff / sf;
  console.log(`\n=== OFFENSIVE BV ANALYSIS ===`);
  console.log(`Our offBV: ${offBV.toFixed(2)} (raw: ${rawOff.toFixed(2)} × SF ${sf})`);
  console.log(`Expected offBV: ${neededOff.toFixed(2)} (raw: ${neededRawOff.toFixed(2)} × SF ${sf})`);
  console.log(`Raw offensive gap: ${(neededRawOff - rawOff).toFixed(2)}`);
  console.log(`  weaponBV: ${b.weaponBV}`);
  console.log(`  ammoBV: ${b.ammoBV}`);
  console.log(`  weightBonus should be: ${unit.tonnage} (standard)`);
  console.log(`  known raw = weaponBV + ammoBV + physicalBV + weightBonus + offEquipBV`);
  console.log(`  ${rawOff.toFixed(2)} = ${b.weaponBV} + ${b.ammoBV} + physBV + ${unit.tonnage} + offEquipBV`);
  console.log(`  physBV + offEquipBV = ${(rawOff - b.weaponBV - b.ammoBV - unit.tonnage).toFixed(2)}`);
  console.log(`  needed physBV + offEquipBV = ${(neededRawOff - b.weaponBV - b.ammoBV - unit.tonnage).toFixed(2)}`);
}

// Also check: do we handle Laser Heat Sinks differently?
console.log(`\n=== HEAT SINK CHECK ===`);
console.log(`HeatSink type: ${unit.heatSinks?.type}`);
console.log(`HeatSink count: ${unit.heatSinks?.count}`);
// Laser heat sinks dissipate 2 per HS
// Base 10 HS built into engine
// A 240 engine has 9 built-in HS (rating / 25, min 10 for DHS)
const engineRating = unit.engine.rating;
const builtInHS = Math.floor(engineRating / 25);
console.log(`Engine rating: ${engineRating} → ${builtInHS} built-in HS capacity`);
console.log(`Total HS: ${unit.heatSinks?.count}`);
// Laser HS dissipate 2 each
const hsType = (unit.heatSinks?.type || '').toUpperCase();
const isDouble = hsType.includes('DOUBLE') || hsType.includes('LASER');
const dissPerHS = isDouble ? 2 : 1;
const totalDiss = unit.heatSinks.count * dissPerHS;
console.log(`HS type: ${hsType} → ${dissPerHS} dissipation each → total ${totalDiss}`);

// Heat efficiency for weapon BV
const runHeat = 2; // standard fusion engine
const jumpHeat = jumpMP > 0 ? Math.max(3, jumpMP) : 0;
const moveHeat = Math.max(runHeat, jumpHeat);
const heatEfficiency = 6 + totalDiss - moveHeat;
console.log(`moveHeat: max(${runHeat}, ${jumpHeat}) = ${moveHeat}`);
console.log(`heatEfficiency: 6 + ${totalDiss} - ${moveHeat} = ${heatEfficiency}`);
console.log(`\nBUT WAIT - base dissipation is already 10 for mechs with 10+ built-in HS`);
console.log(`Our code uses: 6 + heatDissipation - moveHeat`);
console.log(`If heatDissipation = totalDiss = ${totalDiss}, then 6 + ${totalDiss} - ${moveHeat} = ${6 + totalDiss - moveHeat}`);
console.log(`MegaMek uses: heatEfficiency = 6 + entity.getHeatCapacity() - movementHeat`);
console.log(`getHeatCapacity() for ${unit.heatSinks.count} ${hsType} HS = ?`);

// What is entity.getHeatCapacity()?
// For mechs: getHeatCapacity() = number of heat sinks × dissipation factor
// DHS/Laser in engine: 2 each
// DHS/Laser outside engine: 2 each
// SHS: 1 each
// So total dissipation = count * factor
// But there's a subtlety: MegaMek's getHeatCapacity() returns the TOTAL dissipation
// So heatEfficiency = 6 + getHeatCapacity() - moveHeat
// And our code passes `heatDissipation` as what should be getHeatCapacity()
// Let's check what we pass...
