import * as fs from 'fs';
import * as path from 'path';

const report = JSON.parse(fs.readFileSync('validation-output/bv-validation-report.json', 'utf8'));
const unitsDir = path.resolve(__dirname, '../public/data/units/battlemechs');
const index = JSON.parse(fs.readFileSync(path.join(unitsDir, 'index.json'), 'utf8'));

// Get all minor-discrepancy units (within 5% but not within 1%)
const minorDisc = report.allResults.filter((r: any) =>
  Math.abs(r.percentDiff) > 1.0 && Math.abs(r.percentDiff) <= 5.0
);

console.log(`Minor discrepancy units: ${minorDisc.length}`);
const underCalc = minorDisc.filter((r: any) => r.difference < 0);
const overCalc = minorDisc.filter((r: any) => r.difference > 0);
console.log(`  Undercalculated: ${underCalc.length} (avg ${(underCalc.reduce((s: number, r: any) => s + r.percentDiff, 0) / underCalc.length).toFixed(2)}%)`);
console.log(`  Overcalculated: ${overCalc.length} (avg ${(overCalc.reduce((s: number, r: any) => s + r.percentDiff, 0) / overCalc.length).toFixed(2)}%)`);

// Distribution by gap size
const bands = [
  { label: '-5% to -3%', min: -5, max: -3 },
  { label: '-3% to -2%', min: -3, max: -2 },
  { label: '-2% to -1%', min: -2, max: -1 },
  { label: '+1% to +2%', min: 1, max: 2 },
  { label: '+2% to +3%', min: 2, max: 3 },
  { label: '+3% to +5%', min: 3, max: 5 },
];
console.log('\nGap distribution:');
for (const b of bands) {
  const count = minorDisc.filter((r: any) => r.percentDiff >= b.min && r.percentDiff < b.max).length;
  console.log(`  ${b.label}: ${count} units`);
}

// Analysis by tech base
const byTechBase: Record<string, { count: number; totalGap: number }> = {};
for (const r of minorDisc) {
  const entry = index.units.find((u: any) => u.id === r.unitId);
  if (!entry?.path) continue;
  try {
    const u = JSON.parse(fs.readFileSync(path.join(unitsDir, entry.path), 'utf8'));
    const tb = u.techBase || 'UNKNOWN';
    if (!byTechBase[tb]) byTechBase[tb] = { count: 0, totalGap: 0 };
    byTechBase[tb].count++;
    byTechBase[tb].totalGap += r.percentDiff;
  } catch {}
}
console.log('\nBy tech base:');
for (const [tb, data] of Object.entries(byTechBase)) {
  console.log(`  ${tb}: ${data.count} units, avg ${(data.totalGap / data.count).toFixed(2)}%`);
}

// Check ammoBV vs gap
console.log('\n=== AMMO BV CORRELATION (minor-disc only) ===');
const ammoBins: Record<string, { count: number; totalPct: number }> = {
  'ammoBV=0': { count: 0, totalPct: 0 },
  'ammoBV=1-50': { count: 0, totalPct: 0 },
  'ammoBV=51-100': { count: 0, totalPct: 0 },
  'ammoBV=100+': { count: 0, totalPct: 0 },
};
for (const r of minorDisc) {
  const abv = r.breakdown?.ammoBV || 0;
  let bin = 'ammoBV=0';
  if (abv > 100) bin = 'ammoBV=100+';
  else if (abv > 50) bin = 'ammoBV=51-100';
  else if (abv > 0) bin = 'ammoBV=1-50';
  ammoBins[bin].count++;
  ammoBins[bin].totalPct += r.percentDiff;
}
for (const [bin, data] of Object.entries(ammoBins)) {
  if (data.count > 0) console.log(`  ${bin.padEnd(18)} n=${String(data.count).padStart(4)} avgPct=${(data.totalPct / data.count).toFixed(2).padStart(7)}%`);
}

// Check tonnage vs gap
console.log('\n=== TONNAGE CORRELATION ===');
const tonBins: Record<string, { count: number; totalPct: number }> = {};
for (const r of minorDisc) {
  const ton = r.tonnage;
  const bin = ton <= 35 ? 'Light (20-35t)' : ton <= 55 ? 'Medium (40-55t)' : ton <= 75 ? 'Heavy (60-75t)' : 'Assault (80-100t)';
  if (!tonBins[bin]) tonBins[bin] = { count: 0, totalPct: 0 };
  tonBins[bin].count++;
  tonBins[bin].totalPct += r.percentDiff;
}
for (const [bin, data] of Object.entries(tonBins).sort()) {
  console.log(`  ${bin.padEnd(20)} n=${String(data.count).padStart(4)} avgPct=${(data.totalPct / data.count).toFixed(2).padStart(7)}%`);
}

// Check speed factor vs gap (higher SF amplifies offensive gap)
console.log('\n=== SPEED FACTOR CORRELATION ===');
const sfBins: Record<string, { count: number; totalPct: number }> = {};
for (const r of minorDisc) {
  const sf = r.breakdown?.speedFactor || 1;
  const bin = sf <= 1.0 ? 'SF≤1.0' : sf <= 1.2 ? 'SF 1.0-1.2' : sf <= 1.5 ? 'SF 1.2-1.5' : 'SF>1.5';
  if (!sfBins[bin]) sfBins[bin] = { count: 0, totalPct: 0 };
  sfBins[bin].count++;
  sfBins[bin].totalPct += r.percentDiff;
}
for (const [bin, data] of Object.entries(sfBins).sort()) {
  console.log(`  ${bin.padEnd(18)} n=${String(data.count).padStart(4)} avgPct=${(data.totalPct / data.count).toFixed(2).padStart(7)}%`);
}

// Sample the -2% to -3% band for manual inspection
console.log('\n=== SAMPLE UNITS (-2% to -3%) ===');
const sample = underCalc.filter((r: any) => r.percentDiff < -2 && r.percentDiff > -3).slice(0, 10);
for (const r of sample) {
  console.log(`${r.unitId.padEnd(45)} idx=${r.indexBV} calc=${r.calculatedBV} gap=${r.difference} (${r.percentDiff.toFixed(2)}%) ammoBV=${r.breakdown?.ammoBV} wBV=${r.breakdown?.weaponBV} defBV=${r.breakdown?.defensiveBV.toFixed(0)} sf=${r.breakdown?.speedFactor}`);
}
