#!/usr/bin/env npx tsx
// Analyze the 582 minor discrepancy units to find systematic patterns
import * as fs from 'fs';
import * as path from 'path';

const report = JSON.parse(fs.readFileSync('validation-output/bv-validation-report.json', 'utf-8'));
const idx = JSON.parse(fs.readFileSync('public/data/units/battlemechs/index.json', 'utf-8'));

// Minor discrepancies: 1-5% off
const minor = report.allResults.filter((r: any) =>
  r.percentDiff !== null && Math.abs(r.percentDiff) > 1 && Math.abs(r.percentDiff) <= 5
);

const underCalc = minor.filter((r: any) => r.percentDiff < 0);
const overCalc = minor.filter((r: any) => r.percentDiff > 0);

console.log(`Minor discrepancies: ${minor.length} total`);
console.log(`  Under-calculated: ${underCalc.length} (avg ${(underCalc.reduce((s: number, r: any) => s + r.percentDiff, 0) / underCalc.length).toFixed(2)}%)`);
console.log(`  Over-calculated: ${overCalc.length} (avg ${(overCalc.reduce((s: number, r: any) => s + r.percentDiff, 0) / overCalc.length).toFixed(2)}%)`);

// Group by root cause
const rootCauses: Record<string, number> = {};
for (const r of minor) {
  const rc = r.rootCause || 'unknown';
  rootCauses[rc] = (rootCauses[rc] || 0) + 1;
}
console.log('\nRoot causes:', JSON.stringify(rootCauses, null, 2));

// Analyze breakdown diffs for undercalculated units
console.log('\n=== UNDERCALCULATED ANALYSIS (sampling 20) ===');

interface BreakdownAnalysis {
  techBase: Record<string, number>;
  avgDiff: number;
  hasUnresolvedWeapons: number;
  hasAmmoIssues: number;
  hasExplosivePenalty: number;
  hasDefEquip: number;
}

const techBases: Record<string, number> = {};
let unresolvedCount = 0;
let noBreakdown = 0;

// Analyze the diff amounts by looking at the breakdown
const breakdownDiffs: { unit: string; percentDiff: number; techBase: string; issues: string[]; diff: number; weaponBV: number; ammoBV: number; defEquipBV: number; explosivePen: number; offBV: number; defBV: number; sf: number }[] = [];

for (const r of underCalc.slice(0, 100)) {
  const iu = idx.units.find((u: any) => `${u.chassis} ${u.model}` === `${r.chassis} ${r.model}`);
  if (!iu) continue;
  try {
    const fp = path.resolve('public/data/units/battlemechs', iu.path);
    const ud = JSON.parse(fs.readFileSync(fp, 'utf-8'));
    techBases[ud.techBase] = (techBases[ud.techBase] || 0) + 1;

    if (r.issues && r.issues.length > 0) unresolvedCount++;
    if (!r.breakdown) { noBreakdown++; continue; }

    breakdownDiffs.push({
      unit: `${r.chassis} ${r.model}`,
      percentDiff: r.percentDiff,
      techBase: ud.techBase,
      issues: r.issues || [],
      diff: r.difference,
      weaponBV: r.breakdown.weaponBV,
      ammoBV: r.breakdown.ammoBV,
      defEquipBV: r.breakdown.defensiveEquipBV || 0,
      explosivePen: r.breakdown.explosivePenalty || 0,
      offBV: r.breakdown.offensiveBV,
      defBV: r.breakdown.defensiveBV,
      sf: r.breakdown.speedFactor,
    });
  } catch {}
}

console.log('Tech bases:', JSON.stringify(techBases));
console.log(`Units with issues: ${unresolvedCount}`);
console.log(`Units without breakdown: ${noBreakdown}`);

// Show detailed breakdown for worst 20 undercalculated
console.log('\n=== WORST UNDERCALCULATED (by abs diff) ===');
breakdownDiffs.sort((a, b) => a.diff - b.diff);
for (const bd of breakdownDiffs.slice(0, 20)) {
  console.log(`${bd.unit.padEnd(35)} ${bd.techBase.padEnd(6)} diff=${bd.diff} (${bd.percentDiff.toFixed(1)}%) weapBV=${bd.weaponBV} ammoBV=${bd.ammoBV} defEquip=${bd.defEquipBV} explPen=${bd.explosivePen} offBV=${bd.offBV.toFixed(0)} defBV=${bd.defBV.toFixed(0)} sf=${bd.sf.toFixed(3)}`);
  if (bd.issues.length > 0) console.log(`  issues: ${bd.issues.join('; ')}`);
}

// Show overcalculated analysis
console.log('\n=== OVERCALCULATED ANALYSIS ===');
const overTechBases: Record<string, number> = {};
const overBreakdowns: typeof breakdownDiffs = [];
for (const r of overCalc.slice(0, 100)) {
  const iu = idx.units.find((u: any) => `${u.chassis} ${u.model}` === `${r.chassis} ${r.model}`);
  if (!iu) continue;
  try {
    const fp = path.resolve('public/data/units/battlemechs', iu.path);
    const ud = JSON.parse(fs.readFileSync(fp, 'utf-8'));
    overTechBases[ud.techBase] = (overTechBases[ud.techBase] || 0) + 1;
    if (r.breakdown) overBreakdowns.push({
      unit: `${r.chassis} ${r.model}`, percentDiff: r.percentDiff, techBase: ud.techBase,
      issues: r.issues || [], diff: r.difference, weaponBV: r.breakdown.weaponBV,
      ammoBV: r.breakdown.ammoBV, defEquipBV: r.breakdown.defensiveEquipBV || 0,
      explosivePen: r.breakdown.explosivePenalty || 0, offBV: r.breakdown.offensiveBV,
      defBV: r.breakdown.defensiveBV, sf: r.breakdown.speedFactor,
    });
  } catch {}
}
console.log('Over tech bases:', JSON.stringify(overTechBases));
overBreakdowns.sort((a, b) => b.diff - a.diff);
for (const bd of overBreakdowns.slice(0, 10)) {
  console.log(`${bd.unit.padEnd(35)} ${bd.techBase.padEnd(6)} diff=+${bd.diff} (+${bd.percentDiff.toFixed(1)}%) weapBV=${bd.weaponBV} ammoBV=${bd.ammoBV} defEquip=${bd.defEquipBV} explPen=${bd.explosivePen} offBV=${bd.offBV.toFixed(0)} defBV=${bd.defBV.toFixed(0)} sf=${bd.sf.toFixed(3)}`);
  if (bd.issues.length > 0) console.log(`  issues: ${bd.issues.join('; ')}`);
}
