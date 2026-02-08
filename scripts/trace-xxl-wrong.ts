import * as fs from 'fs';
import * as path from 'path';

const r = JSON.parse(fs.readFileSync('validation-output/bv-validation-report.json', 'utf8'));
const unitsDir = 'public/data/units/battlemechs';
const index = JSON.parse(fs.readFileSync(path.join(unitsDir, 'index.json'), 'utf8'));

// Trace XXL engine units that are wrong
const wrong = r.allResults.filter((x: any) => Math.abs(x.percentDiff) > 1 && x.breakdown);

let xxlWrong: any[] = [];
let xxlCorrect: any[] = [];

for (const res of r.allResults) {
  if (!res.breakdown) continue;
  const entry = index.units.find((e: any) => e.id === res.unitId);
  if (!entry?.path) continue;
  try {
    const d = JSON.parse(fs.readFileSync(path.join(unitsDir, entry.path), 'utf8'));
    if (!d.engine?.type?.toUpperCase().includes('XXL')) continue;
    if (Math.abs(res.percentDiff) > 1) {
      xxlWrong.push({ ...res, unit: d, entry });
    } else {
      xxlCorrect.push({ ...res, unit: d, entry });
    }
  } catch {}
}

console.log(`XXL engine units: ${xxlWrong.length} wrong, ${xxlCorrect.length} correct`);
console.log(`\nWrong XXL units:`);

xxlWrong.sort((a: any, b: any) => Math.abs(b.percentDiff) - Math.abs(a.percentDiff));

for (const res of xxlWrong.slice(0, 20)) {
  const b = res.breakdown;
  const d = res.unit;
  const diffStr = res.percentDiff > 0 ? `+${res.percentDiff.toFixed(1)}%` : `${res.percentDiff.toFixed(1)}%`;
  console.log(`\n  ${res.unitId}: ${d.tonnage}t ${d.techBase} ${d.engine.type} ${diffStr} (diff=${res.difference})`);
  console.log(`    idx=${res.indexBV} calc=${res.calculatedBV}`);
  console.log(`    defBV: armor=${b.armorBV?.toFixed(1)} struct=${b.structureBV?.toFixed(1)} gyro=${b.gyroBV?.toFixed(1)} defEq=${b.defensiveEquipBV?.toFixed(1)} pen=${b.explosivePenalty} defF=${b.defensiveFactor?.toFixed(2)}`);
  console.log(`    offBV: wep=${b.weaponBV?.toFixed(1)} ammo=${b.ammoBV?.toFixed(1)} speed=${b.speedFactor?.toFixed(3)}`);
  console.log(`    engine: ${d.engine.type} rating=${d.engine.rating}`);
  console.log(`    armor: ${d.armor?.type} struct: ${d.structure?.type}`);

  // Check IS XXL engine multiplier
  // IS XXL should have engineBV mult = 0.25, Clan XXL = 0.5
  const isISXXL = d.techBase === 'INNER_SPHERE' || (d.techBase === 'MIXED' && !d.engine.type.toUpperCase().includes('CLAN'));
  const expectedMult = isISXXL ? 0.25 : 0.5;
  const totalIS = calcIS(d.tonnage);
  const structMult = getStructMult(d.structure?.type);
  const expectedStructBV = totalIS * 1.5 * structMult * expectedMult;
  console.log(`    expectedStructBV=${expectedStructBV.toFixed(1)} (IS=${totalIS} * 1.5 * structM=${structMult} * engM=${expectedMult})`);
  if (Math.abs(expectedStructBV - (b.structureBV || 0)) > 1) {
    console.log(`    *** STRUCT BV MISMATCH: expected ${expectedStructBV.toFixed(1)} vs actual ${b.structureBV?.toFixed(1)}`);
  }
}

// Check if correct XXL units have IS vs Clan patterns
console.log(`\n\nCorrect XXL units (first 10):`);
for (const res of xxlCorrect.slice(0, 10)) {
  const d = res.unit;
  console.log(`  ${res.unitId}: ${d.tonnage}t ${d.techBase} ${d.engine.type} diff=${res.difference} (${res.percentDiff?.toFixed(1)}%)`);
}

function calcIS(tonnage: number): number {
  // Standard internal structure points by tonnage
  const isMap: Record<number, number> = {
    20: 33, 25: 42, 30: 51, 35: 60, 40: 68, 45: 75, 50: 83, 55: 90,
    60: 99, 65: 105, 70: 114, 75: 120, 80: 130, 85: 136, 90: 145, 95: 150,
    100: 157, 105: 162, 110: 168, 115: 173, 120: 179, 125: 184, 130: 190, 135: 195, 200: 308
  };
  return isMap[tonnage] || Math.round(tonnage * 1.57);
}

function getStructMult(structType?: string): number {
  if (!structType) return 1.0;
  const lo = structType.toUpperCase();
  if (lo.includes('ENDO')) return 1.0;
  if (lo.includes('COMPOSITE')) return 0.5;
  if (lo.includes('REINFORCED')) return 2.0;
  return 1.0; // standard
}
