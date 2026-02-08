import * as fs from 'fs';
import * as path from 'path';

const report = JSON.parse(fs.readFileSync('validation-output/bv-validation-report.json', 'utf8'));
const unitsDir = path.resolve(__dirname, '../public/data/units/battlemechs');
const index = JSON.parse(fs.readFileSync(path.join(unitsDir, 'index.json'), 'utf8'));

// Find chassis with both exact and undercalculated variants
const byChassis: Record<string, any[]> = {};
for (const r of report.allResults) {
  if (!r.breakdown) continue;
  const chassis = r.chassis;
  if (!byChassis[chassis]) byChassis[chassis] = [];
  byChassis[chassis].push(r);
}

console.log('=== Chassis with BOTH exact AND undercalculated variants ===\n');
const interesting: Array<{ chassis: string; exact: any[]; wrong: any[] }> = [];
for (const [chassis, units] of Object.entries(byChassis)) {
  const exact = units.filter(u => Math.abs(u.difference) <= 1);
  const wrong = units.filter(u => u.difference < -5); // undercalculated by > 5 BV
  if (exact.length > 0 && wrong.length > 0) {
    interesting.push({ chassis, exact, wrong });
  }
}

interesting.sort((a, b) => b.wrong.length - a.wrong.length);

for (const { chassis, exact, wrong } of interesting.slice(0, 15)) {
  console.log(`${chassis}: ${exact.length} exact, ${wrong.length} undercalculated`);
  // Show one exact and one wrong
  const ex = exact[0];
  const wr = wrong.sort((a: any, b: any) => a.difference - b.difference)[0];

  // Load unit data for comparison
  for (const r of [ex, wr]) {
    const entry = (index.units as any[]).find((e: any) => e.id === r.unitId);
    if (!entry?.path) continue;
    try {
      const data = JSON.parse(fs.readFileSync(path.join(unitsDir, entry.path), 'utf8'));
      const tag = r === ex ? 'EXACT' : 'WRONG';
      const b = r.breakdown;
      console.log(`  [${tag}] ${r.unitId}: idx=${r.indexBV} calc=${r.calculatedBV} diff=${r.difference}`);
      console.log(`    engine=${data.engine.type} struct=${data.structure.type} armor=${data.armor.type} hs=${data.heatSinks.type}(${data.heatSinks.count})`);
      console.log(`    walk=${data.movement.walk} jump=${data.movement.jump || 0}`);
      console.log(`    defBV=${b.defensiveBV.toFixed(1)} offBV=${b.offensiveBV.toFixed(1)} sf=${b.speedFactor} wBV=${b.weaponBV} ammoBV=${b.ammoBV} defEq=${b.defensiveEquipBV} expl=${b.explosivePenalty}`);
      console.log(`    equip: ${data.equipment.map((e: any) => e.id).join(', ')}`);
    } catch {}
  }
  console.log('');
}
