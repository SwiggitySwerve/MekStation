import * as fs from 'fs';
import * as path from 'path';

const report = JSON.parse(fs.readFileSync('validation-output/bv-validation-report.json', 'utf8'));
const unitsDir = path.resolve(__dirname, '../public/data/units/battlemechs');
const index = JSON.parse(fs.readFileSync(path.join(unitsDir, 'index.json'), 'utf8'));

// Find ALL units with speed factor mismatches
let sfMismatchCount = 0;
const mismatches: any[] = [];

for (const r of report.allResults) {
  if (!r.breakdown || r.status === 'error') continue;
  const entry = index.units.find((u: any) => u.id === r.unitId);
  if (!entry?.path) continue;
  try {
    const u = JSON.parse(fs.readFileSync(path.join(unitsDir, entry.path), 'utf8'));
    const walkMP = u.movement.walk;
    const hasMASC = u.movement.masc === true;
    const runMP = hasMASC ? walkMP * 2 : Math.ceil(walkMP * 1.5);
    const jumpMP = u.movement.jump || 0;
    const mp = runMP + Math.round(Math.max(jumpMP, 0) / 2.0);
    const sf = Math.round(Math.pow(1 + (mp - 5) / 10, 1.2) * 100) / 100;

    if (Math.abs(sf - r.breakdown.speedFactor) > 0.005) {
      sfMismatchCount++;
      if (mismatches.length < 30) {
        mismatches.push({
          id: r.unitId,
          walk: walkMP,
          masc: hasMASC,
          computed: { runMP, mp, sf },
          reported: { sf: r.breakdown.speedFactor },
          tonnage: u.tonnage,
          techBase: u.techBase,
          engine: u.engine.type + ' ' + u.engine.rating,
          jump: jumpMP,
          gap: r.difference,
          pctDiff: r.percentDiff,
          equipment: u.equipment.map((e: any) => e.id).join(', '),
        });
      }
    }
  } catch {}
}

console.log(`Speed factor mismatches: ${sfMismatchCount} out of ${report.allResults.length}\n`);

for (const m of mismatches) {
  console.log(`${m.id}`);
  console.log(`  ${m.tonnage}t ${m.techBase} ${m.engine} walk=${m.walk} jump=${m.jump} masc=${m.masc}`);
  console.log(`  Computed: runMP=${m.computed.runMP} mp=${m.computed.mp} sf=${m.computed.sf}`);
  console.log(`  Reported: sf=${m.reported.sf}`);
  // Reverse-engineer reported mp
  // sf = round(pow(1+(mp-5)/10, 1.2)*100)/100
  // We need to find mp such that the formula gives the reported sf
  for (let testMP = 0; testMP <= 30; testMP++) {
    const testSF = Math.round(Math.pow(1 + (testMP - 5) / 10, 1.2) * 100) / 100;
    if (Math.abs(testSF - m.reported.sf) < 0.005) {
      console.log(`  Reported sf implies mp=${testMP} → runMP=${testMP - Math.round(m.jump / 2)} (diff from computed: ${testMP - m.computed.mp})`);
      break;
    }
  }
  console.log(`  Gap: ${m.gap} (${m.pctDiff.toFixed(2)}%)`);
  console.log(`  Equip: ${m.equipment.substring(0, 120)}`);
  console.log('');
}
