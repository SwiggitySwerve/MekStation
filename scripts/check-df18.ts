/**
 * Check the 8 units with DF=1.8 to understand overcalculation.
 */
import * as fs from 'fs';
import * as path from 'path';

const report = JSON.parse(fs.readFileSync('validation-output/bv-validation-report.json', 'utf8'));
const idx = JSON.parse(fs.readFileSync('public/data/units/battlemechs/index.json', 'utf8'));

function loadUnit(unitId: string): any {
  const ie = idx.units.find((e: any) => e.id === unitId);
  if (!ie?.path) return null;
  try { return JSON.parse(fs.readFileSync(path.join('public/data/units/battlemechs', ie.path), 'utf8')); } catch { return null; }
}

const valid = report.allResults.filter((x: any) => x.status !== 'error' && x.percentDiff !== null && x.breakdown);
const df18 = valid.filter((x: any) => x.breakdown?.defensiveFactor >= 1.75 && x.breakdown?.defensiveFactor <= 1.85);

console.log(`=== UNITS WITH DF=1.8 (${df18.length} total) ===\n`);

for (const u of df18) {
  const b = u.breakdown;
  const unit = loadUnit(u.unitId);
  console.log(`${u.unitId}`);
  console.log(`  ref=${u.indexBV} calc=${u.calculatedBV} diff=${u.difference} (${u.percentDiff.toFixed(1)}%)`);
  console.log(`  DEF=${b.defensiveBV?.toFixed(0)} OFF=${b.offensiveBV?.toFixed(0)} cockpit=${b.cockpitModifier}`);
  console.log(`  DF=${b.defensiveFactor} SF=${b.speedFactor}`);
  console.log(`  run=${b.runMP} jump=${b.jumpMP} walk=${unit?.movement?.walk} jump_mp=${unit?.movement?.jump}`);
  console.log(`  engine=${unit?.engine?.type} tonnage=${unit?.tonnage}`);
  // Check if there are special movement features
  const eqs = (unit?.equipment || []).map((e: any) => e.id.toLowerCase());
  const hasJJ = eqs.some((e: string) => e.includes('jump-jet') || e.includes('jump jet'));
  const hasMASC = eqs.some((e: string) => e.includes('masc'));
  const hasSC = eqs.some((e: string) => e.includes('supercharger'));
  const hasPartialWing = eqs.some((e: string) => e.includes('partial-wing') || e.includes('partialwing'));
  const hasUMU = eqs.some((e: string) => e.includes('umu'));
  console.log(`  JJ=${hasJJ} MASC=${hasMASC} SC=${hasSC} PW=${hasPartialWing} UMU=${hasUMU}`);
  console.log('');
}

// Also check DF=1.6 and DF=1.7 for comparison
for (const targetDF of [1.6, 1.7]) {
  const group = valid.filter((x: any) => x.breakdown?.defensiveFactor >= targetDF - 0.05 && x.breakdown?.defensiveFactor <= targetDF + 0.05);
  const over = group.filter((x: any) => x.percentDiff > 1);
  console.log(`DF=${targetDF}: ${group.length} units, ${over.length} overcalculated`);
  for (const u of over.slice(0, 3)) {
    const b = u.breakdown;
    const unit = loadUnit(u.unitId);
    console.log(`  ${u.unitId}: diff=${u.percentDiff.toFixed(1)}% run=${b.runMP} jump=${b.jumpMP} walk=${unit?.movement?.walk}`);
  }
}
