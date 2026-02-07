import * as fs from 'fs';
import * as path from 'path';

const report = JSON.parse(fs.readFileSync('validation-output/bv-validation-report.json', 'utf8'));
const unitsDir = path.resolve(__dirname, '../public/data/units/battlemechs');
const index = JSON.parse(fs.readFileSync(path.join(unitsDir, 'index.json'), 'utf8'));

// Find simple undercalculated energy-only DHS units (no ammo, no special equip)
const gaps = report.allResults.filter((r: any) =>
  r.percentDiff < -1.0 && r.percentDiff > -5.0 && r.breakdown && r.breakdown.ammoBV === 0
).sort((a: any, b: any) => a.percentDiff - b.percentDiff);

console.log(`Energy-only undercalculated minor-disc: ${gaps.length}\n`);
console.log('Unit'.padEnd(45) + '  idx  calc  gap   pct%  wBV   sf    def     off');

for (const r of gaps.slice(0, 25)) {
  const b = r.breakdown;
  console.log(
    `${r.unitId.padEnd(45)} ${String(r.indexBV).padStart(5)} ${String(r.calculatedBV).padStart(5)} ${String(r.difference).padStart(5)} ${r.percentDiff.toFixed(2).padStart(6)}% ${String(b.weaponBV).padStart(5)} ${b.speedFactor.toFixed(2).padStart(5)} ${b.defensiveBV.toFixed(1).padStart(7)} ${b.offensiveBV.toFixed(1).padStart(7)}`
  );
}

// Now deep trace the simplest one we can find
console.log('\n\n=== DEEP TRACE ===\n');
for (const r of gaps.slice(0, 5)) {
  const entry = index.units.find((u: any) => u.id === r.unitId);
  if (!entry?.path) continue;
  const u = JSON.parse(fs.readFileSync(path.join(unitsDir, entry.path), 'utf8'));
  const b = r.breakdown;

  console.log(`\n--- ${r.unitId} ---`);
  console.log(`  Tonnage: ${u.tonnage}  TechBase: ${u.techBase}  Engine: ${u.engine.type} ${u.engine.rating}`);
  console.log(`  Walk: ${u.movement.walk}  Jump: ${u.movement.jump || 0}  MASC: ${u.movement.masc || false}`);
  console.log(`  HS: ${u.heatSinks.count}x ${u.heatSinks.type}`);
  console.log(`  Cockpit: ${u.cockpit || 'STANDARD'}  Gyro: ${u.gyro?.type || 'STANDARD'}`);
  console.log(`  Equipment: ${u.equipment.map((e: any) => e.id + '@' + e.location).join(', ')}`);

  const walkMP = u.movement.walk;
  const runMP = u.movement.masc ? walkMP * 2 : Math.ceil(walkMP * 1.5);
  const jumpMP = u.movement.jump || 0;
  const mp = runMP + Math.round(Math.max(jumpMP, 0) / 2.0);
  const sf = Math.round(Math.pow(1 + (mp - 5) / 10, 1.2) * 100) / 100;

  console.log(`  Computed: runMP=${runMP} mp=${mp} sf=${sf}`);
  console.log(`  Report sf=${b.speedFactor} — ${sf === b.speedFactor ? 'MATCH' : 'MISMATCH!'}`);

  // Expected offensive from MUL
  const expectedOff = r.indexBV - b.defensiveBV;
  const expectedRaw = expectedOff / b.speedFactor;
  const ourRaw = b.offensiveBV / b.speedFactor;
  console.log(`  OffBV: ours=${b.offensiveBV.toFixed(1)} expected=${expectedOff.toFixed(1)} gap=${(expectedOff - b.offensiveBV).toFixed(1)}`);
  console.log(`  RawOff: ours=${ourRaw.toFixed(1)} expected=${expectedRaw.toFixed(1)} gap=${(expectedRaw - ourRaw).toFixed(1)}`);
  console.log(`  weightBonus=${u.tonnage} weaponBV=${b.weaponBV} sum=${b.weaponBV + u.tonnage}`);
  console.log(`  ourRaw should = weaponBV + weightBonus + physicalBV + offEquipBV = ${b.weaponBV} + ${u.tonnage} + 0 + 0 = ${b.weaponBV + u.tonnage}`);
  console.log(`  ourRaw actual = ${ourRaw.toFixed(1)} — delta from expected = ${(ourRaw - (b.weaponBV + u.tonnage)).toFixed(1)}`);
}
