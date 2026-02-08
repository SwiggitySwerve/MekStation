import * as fs from 'fs';
import * as path from 'path';

const report = JSON.parse(fs.readFileSync('validation-output/bv-validation-report.json', 'utf-8'));

interface Result {
  unitId: string; chassis: string; model: string; tonnage: number;
  indexBV: number; calculatedBV: number; difference: number; percentDiff: number;
  breakdown: any; issues: string[];
}

const outside5: Result[] = [];
const outside10: Result[] = [];

for (const r of report.allResults as Result[]) {
  const absPct = Math.abs(r.percentDiff);
  if (absPct > 10) outside10.push(r);
  if (absPct > 5) outside5.push(r);
}

outside5.sort((a, b) => Math.abs(b.percentDiff) - Math.abs(a.percentDiff));

console.log(`=== UNITS OUTSIDE 10% (${outside10.length}) ===`);
for (const r of outside10.sort((a, b) => Math.abs(b.percentDiff) - Math.abs(a.percentDiff))) {
  const bd = r.breakdown;
  console.log(`  ${r.chassis} ${r.model} (${r.tonnage}t): ref=${r.indexBV} calc=${r.calculatedBV} (${r.percentDiff > 0 ? '+' : ''}${r.percentDiff.toFixed(1)}%)`);
  console.log(`    cockpit=${bd.cockpitType} sf=${bd.speedFactor} explPen=${bd.explosivePenalty} defBV=${bd.defensiveBV?.toFixed(0)} offBV=${bd.offensiveBV?.toFixed(0)}`);
  console.log(`    weapBV=${bd.weaponBV?.toFixed(0)} ammoBV=${bd.ammoBV?.toFixed(0)} walkMP=${bd.walkMP} runMP=${bd.runMP} jumpMP=${bd.jumpMP}`);
  if (r.issues.length > 0) console.log(`    issues: ${r.issues.join('; ')}`);
}

console.log(`\n=== UNITS OUTSIDE 5% BUT WITHIN 10% (${outside5.length - outside10.length}) ===`);
for (const r of outside5.filter(r => Math.abs(r.percentDiff) <= 10)) {
  const bd = r.breakdown;
  const dir = r.percentDiff > 0 ? 'OVER' : 'UNDER';
  console.log(`  ${r.chassis} ${r.model} (${r.tonnage}t): ref=${r.indexBV} calc=${r.calculatedBV} (${r.percentDiff > 0 ? '+' : ''}${r.percentDiff.toFixed(1)}%) ${dir}`);
  console.log(`    cockpit=${bd.cockpitType} sf=${bd.speedFactor} explPen=${bd.explosivePenalty} defBV=${bd.defensiveBV?.toFixed(0)} offBV=${bd.offensiveBV?.toFixed(0)}`);
}

// Pattern analysis
const patterns: Record<string, number> = {};
for (const r of outside5) {
  const bd = r.breakdown;
  if (bd.cockpitType !== 'standard') patterns[`cockpit:${bd.cockpitType}`] = (patterns[`cockpit:${bd.cockpitType}`] || 0) + 1;
  if (bd.explosivePenalty > 0) patterns['has-explosive-penalty'] = (patterns['has-explosive-penalty'] || 0) + 1;
  if (r.percentDiff < 0) patterns['undercalc'] = (patterns['undercalc'] || 0) + 1;
  if (r.percentDiff > 0) patterns['overcalc'] = (patterns['overcalc'] || 0) + 1;

  // Load unit to check tech base and special equipment
  const idx = JSON.parse(fs.readFileSync('public/data/units/battlemechs/index.json', 'utf-8'));
  const entry = idx.units.find((u: any) => u.id === r.unitId);
  if (entry?.path) {
    const unit = JSON.parse(fs.readFileSync(path.resolve('public/data/units/battlemechs', entry.path), 'utf-8'));
    if (unit.techBase === 'CLAN') patterns['clan'] = (patterns['clan'] || 0) + 1;
    if (unit.techBase === 'MIXED') patterns['mixed'] = (patterns['mixed'] || 0) + 1;

    // Check for torso-mounted cockpit
    if (unit.cockpit === 'TORSO_MOUNTED') patterns['torso-mounted'] = (patterns['torso-mounted'] || 0) + 1;

    // Check for shield
    const allSlots = Object.values(unit.criticalSlots || {}).flat();
    if (allSlots.some((s: any) => s && typeof s === 'string' && s.toLowerCase().includes('shield') && !s.toLowerCase().includes('blue-shield') && !s.toLowerCase().includes('chameleon'))) {
      patterns['has-shield'] = (patterns['has-shield'] || 0) + 1;
    }
  }
}

console.log(`\n=== PATTERN ANALYSIS (${outside5.length} units outside 5%) ===`);
for (const [k, v] of Object.entries(patterns).sort((a, b) => b[1] - a[1])) {
  console.log(`  ${k}: ${v}/${outside5.length} (${(v/outside5.length*100).toFixed(0)}%)`);
}
