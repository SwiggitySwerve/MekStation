import * as fs from 'fs';
import * as path from 'path';

const report = JSON.parse(fs.readFileSync('validation-output/bv-validation-report.json', 'utf8'));
const unitsDir = path.resolve(__dirname, '../public/data/units/battlemechs');
const index = JSON.parse(fs.readFileSync(path.join(unitsDir, 'index.json'), 'utf8'));

// For units with cockpit modifier, the relationship is:
// indexBV = round((defBV + offBV) * cockpitMod)
// calcBV = round((ourDefBV + ourOffBV) * cockpitMod)
// We need to figure out the cockpit mod for each unit

// Get undercalculated minor-disc units, energy-only
const underCalc = report.allResults.filter((r: any) =>
  r.percentDiff < -1.0 && r.percentDiff > -5.0 &&
  r.breakdown && r.breakdown.ammoBV === 0
);

console.log(`Energy-only undercalculated units: ${underCalc.length}\n`);

// For each, determine cockpit modifier by comparing calcBV to defBV + offBV
for (const r of underCalc.slice(0, 20)) {
  const b = r.breakdown;
  const ourBase = b.defensiveBV + b.offensiveBV;

  // Infer cockpit mod: calcBV = round(ourBase * cockpitMod)
  // cockpitMod = calcBV / ourBase (approximately)
  const inferredCockpitMod = r.calculatedBV / ourBase;
  const cockpitMod = Math.abs(inferredCockpitMod - 0.95) < 0.01 ? 0.95 :
                     Math.abs(inferredCockpitMod - 1.3) < 0.01 ? 1.3 : 1.0;

  // MegaMek's expected base BV
  const expectedBase = r.indexBV / cockpitMod;

  // The gap is in the base BV
  const baseGap = expectedBase - ourBase;

  // Our raw offensive = offBV / speedFactor
  const ourRawOff = b.offensiveBV / b.speedFactor;

  // Expected raw offensive = (expectedBase - defBV) / speedFactor
  const expectedRawOff = (expectedBase - b.defensiveBV) / b.speedFactor;

  const rawGap = expectedRawOff - ourRawOff;

  const entry = index.units.find((u: any) => u.id === r.unitId);
  let tonnage = 0;
  let techBase = '';
  if (entry?.path) {
    try {
      const u = JSON.parse(fs.readFileSync(path.join(unitsDir, entry.path), 'utf8'));
      tonnage = u.tonnage;
      techBase = u.techBase;
    } catch {}
  }

  console.log(`${r.unitId} (${tonnage}t ${techBase})`);
  console.log(`  idx=${r.indexBV} calc=${r.calculatedBV} gap=${r.difference} cockpitMod=${cockpitMod}`);
  console.log(`  defBV=${b.defensiveBV.toFixed(1)} offBV=${b.offensiveBV.toFixed(1)} wBV=${b.weaponBV} sf=${b.speedFactor}`);
  console.log(`  baseGap=${baseGap.toFixed(1)} rawOffGap=${rawGap.toFixed(1)}`);
  console.log(`  rawGap/tonnage=${tonnage > 0 ? (rawGap/tonnage).toFixed(3) : 'N/A'}`);
  console.log('');
}

// Now do a statistical analysis across ALL undercalculated units (not just energy-only)
const allUnderCalc = report.allResults.filter((r: any) =>
  r.percentDiff < -1.0 && r.percentDiff > -5.0 && r.breakdown
);

console.log(`\n=== ALL UNDERCALCULATED UNITS (${allUnderCalc.length}) ===`);

const rawGaps: number[] = [];
const rawGapsPerTon: number[] = [];

for (const r of allUnderCalc) {
  const b = r.breakdown;
  const ourBase = b.defensiveBV + b.offensiveBV;
  const inferredCockpitMod = r.calculatedBV / ourBase;
  const cockpitMod = Math.abs(inferredCockpitMod - 0.95) < 0.01 ? 0.95 :
                     Math.abs(inferredCockpitMod - 1.3) < 0.01 ? 1.3 : 1.0;

  const expectedBase = r.indexBV / cockpitMod;
  const rawGap = (expectedBase - b.defensiveBV) / b.speedFactor - b.offensiveBV / b.speedFactor;
  rawGaps.push(rawGap);

  const entry = index.units.find((u: any) => u.id === r.unitId);
  if (entry?.path) {
    try {
      const u = JSON.parse(fs.readFileSync(path.join(unitsDir, entry.path), 'utf8'));
      rawGapsPerTon.push(rawGap / u.tonnage);
    } catch {}
  }
}

rawGaps.sort((a, b) => a - b);
const avgRawGap = rawGaps.reduce((s, g) => s + g, 0) / rawGaps.length;
const medianRawGap = rawGaps[Math.floor(rawGaps.length / 2)];
console.log(`Raw offensive gap: avg=${avgRawGap.toFixed(1)}, median=${medianRawGap.toFixed(1)}`);

rawGapsPerTon.sort((a, b) => a - b);
const avgRawGapPerTon = rawGapsPerTon.reduce((s, g) => s + g, 0) / rawGapsPerTon.length;
const medianRawGapPerTon = rawGapsPerTon[Math.floor(rawGapsPerTon.length / 2)];
console.log(`Raw gap/tonnage: avg=${avgRawGapPerTon.toFixed(3)}, median=${medianRawGapPerTon.toFixed(3)}`);

// Histogram of rawGap
console.log('\n=== RAW GAP HISTOGRAM ===');
const bins: Record<string, number> = {};
for (const g of rawGaps) {
  const bin = Math.round(g / 5) * 5;
  bins[String(bin)] = (bins[String(bin)] || 0) + 1;
}
for (const [bin, count] of Object.entries(bins).sort((a, b) => Number(a[0]) - Number(b[0]))) {
  if (count > 0) {
    console.log(`  ${bin.padStart(5)}: ${'█'.repeat(Math.min(count, 60))} (${count})`);
  }
}
