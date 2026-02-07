import * as fs from 'fs';
import * as path from 'path';
import {
  calculateDefensiveBV,
  calculateOffensiveBVWithHeatTracking,
} from '../src/utils/construction/battleValueCalculations';
import { resolveEquipmentBV } from '../src/utils/construction/equipmentBVResolver';

const report = JSON.parse(fs.readFileSync('validation-output/bv-validation-report.json', 'utf8'));
const unitsDir = path.resolve(__dirname, '../public/data/units/battlemechs');
const index = JSON.parse(fs.readFileSync(path.join(unitsDir, 'index.json'), 'utf8'));

// Pick specific simple units to trace
const traceIds = [
  'ostroc-osr-4k',           // 60t IS, no ammo, diff=-39
  'grasshopper-ghr-7x',      // 70t IS, no ammo, diff=-59
  'locust-lct-7v',           // 20t IS, no ammo, diff=-20
  'marauder-mad-9w',         // 75t IS(?), no ammo, diff=-48
  'boreas-d',                // 60t Clan, no ammo, diff=-14
];

for (const unitId of traceIds) {
  const entry = (index.units as any[]).find((e: any) => e.id === unitId);
  if (!entry?.path) { console.log(`${unitId}: NOT FOUND`); continue; }
  const data = JSON.parse(fs.readFileSync(path.join(unitsDir, entry.path), 'utf8'));
  const r = report.allResults.find((x: any) => x.unitId === unitId);
  if (!r) { console.log(`${unitId}: NOT IN REPORT`); continue; }

  const b = r.breakdown;
  console.log(`\n=== ${unitId} (${data.tonnage}t ${data.techBase} ${data.engine.type} ${data.engine.rating}) ===`);
  console.log(`  idx=${r.indexBV} calc=${r.calculatedBV} diff=${r.difference} (${r.percentDiff.toFixed(1)}%)`);
  console.log(`  defBV=${b.defensiveBV.toFixed(1)} offBV=${b.offensiveBV.toFixed(1)} wBV=${b.weaponBV} ammoBV=${b.ammoBV}`);
  console.log(`  sf=${b.speedFactor} explP=${b.explosivePenalty} defEqBV=${b.defensiveEquipBV}`);

  // Trace weapons
  console.log(`\n  Equipment:`);
  for (const eq of data.equipment) {
    const res = resolveEquipmentBV(eq.id);
    const clanRes = resolveEquipmentBV('clan-' + eq.id);
    const usedBV = data.techBase === 'CLAN' ? (clanRes.resolved ? clanRes.battleValue : res.battleValue) : res.battleValue;
    console.log(`    ${eq.id.padEnd(30)} @${eq.location.padEnd(15)} bv=${usedBV} h=${data.techBase === 'CLAN' ? (clanRes.resolved ? clanRes.heat : res.heat) : res.heat}`);
  }

  // Compute expected rawOff gap
  const expectedOff = r.indexBV - b.defensiveBV;
  const expectedRawOff = expectedOff / b.speedFactor;
  const ourRawOff = b.offensiveBV / b.speedFactor;
  const rawGap = expectedRawOff - ourRawOff;

  console.log(`\n  Expected offBV = ${expectedOff.toFixed(1)}, rawOff = ${expectedRawOff.toFixed(1)}`);
  console.log(`  Our offBV = ${b.offensiveBV.toFixed(1)}, rawOff = ${ourRawOff.toFixed(1)}`);
  console.log(`  Raw gap = ${rawGap.toFixed(1)}`);
  console.log(`  Weight bonus = ${data.tonnage}`);
  console.log(`  Expected raw = wBV + weight + physBV + offEqBV = ${b.weaponBV} + ${data.tonnage} + 0 + 0 = ${b.weaponBV + data.tonnage}`);
  console.log(`  ourRawOff = ${ourRawOff.toFixed(1)}, expected sum = ${b.weaponBV + data.tonnage}`);

  // Check if rawGap corresponds to defensive being wrong
  // If our defBV were higher by X, the offBV gap would increase by X (since expectedOff = indexBV - defBV)
  // So let's compute: for the gap to be 0, what defBV would we need?
  const defBVForMatch = r.indexBV - b.offensiveBV;
  console.log(`\n  If offBV correct: defBV should be ${defBVForMatch.toFixed(1)} (ours: ${b.defensiveBV.toFixed(1)}, delta: ${(b.defensiveBV - defBVForMatch).toFixed(1)})`);

  // If offBV correct but defBV is too high, we overcalculate
  // If offBV is too low, same symptom
  // For gap>0 (undercalc): either defBV too high OR offBV too low

  // Movement
  console.log(`\n  Movement: walk=${data.movement.walk} jump=${data.movement.jump || 0}`);
  console.log(`  HS: ${data.heatSinks.count}x ${data.heatSinks.type}`);
  console.log(`  Cockpit: ${data.cockpit || 'STANDARD'} Gyro: ${data.gyro?.type || 'STANDARD'}`);
  console.log(`  Armor: ${data.armor.type} Structure: ${data.structure.type}`);
}
