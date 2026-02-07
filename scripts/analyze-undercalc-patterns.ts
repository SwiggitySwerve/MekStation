#!/usr/bin/env npx tsx
/**
 * Deep pattern analysis of undercalculated units.
 * Check if there's a consistent ratio/offset across many units.
 */
import * as fs from 'fs';
import * as path from 'path';

const results: any[] = JSON.parse(fs.readFileSync('./validation-output/bv-all-results.json', 'utf-8'));
const idx = JSON.parse(fs.readFileSync('public/data/units/battlemechs/index.json', 'utf-8'));
const basePath = 'public/data/units/battlemechs';

// All units that are 1-5% undercalculated
const under = results.filter(r => r.pct < -1 && r.pct >= -5);

// Calculate gap/SF for each unit (gap in raw offensive BV terms)
const gaps: { name: string; gap: number; rawGap: number; sf: number; defBV: number; offBV: number; ref: number; calc: number; tonnage: number; }[] = [];

for (const r of under) {
  if (!r.sf || !r.defBV || !r.offBV) continue;
  const gap = r.ref - r.calc;
  // The gap could be in defensive BV or offensive BV
  // If it's in offensive BV: gapInOff = gap / 1 (cockpit mod is usually 1.0)
  // rawGap = gap / (1 * 1) = gap raw BV
  gaps.push({
    name: r.name, gap, rawGap: gap, sf: r.sf,
    defBV: r.defBV, offBV: r.offBV, ref: r.ref, calc: r.calc,
    tonnage: r.ton || 0,
  });
}

// Check if gap correlates with tonnage (weight bonus issue)
console.log('Gap vs tonnage correlation:');
const by10t: Record<string, { count: number; totalGap: number; avgPct: number }> = {};
for (const g of gaps) {
  const bucket = `${Math.floor(g.tonnage / 20) * 20}-${Math.floor(g.tonnage / 20) * 20 + 19}t`;
  if (!by10t[bucket]) by10t[bucket] = { count: 0, totalGap: 0, avgPct: 0 };
  by10t[bucket].count++;
  by10t[bucket].totalGap += g.gap;
}
for (const [bucket, data] of Object.entries(by10t).sort((a, b) => a[0].localeCompare(b[0]))) {
  console.log(`  ${bucket}: ${data.count} units, avg gap ${(data.totalGap / data.count).toFixed(1)} BV`);
}

// Check if gap is proportional to offBV (suggesting a multiplier issue)
console.log('\nGap as fraction of offensive BV:');
const pctOfOff: number[] = [];
for (const g of gaps) {
  if (g.offBV > 0) pctOfOff.push(g.gap / g.offBV * 100);
}
pctOfOff.sort((a, b) => a - b);
console.log(`  Median: ${pctOfOff[Math.floor(pctOfOff.length / 2)].toFixed(2)}%`);
console.log(`  Mean: ${(pctOfOff.reduce((s, v) => s + v, 0) / pctOfOff.length).toFixed(2)}%`);
console.log(`  P25: ${pctOfOff[Math.floor(pctOfOff.length * 0.25)].toFixed(2)}%`);
console.log(`  P75: ${pctOfOff[Math.floor(pctOfOff.length * 0.75)].toFixed(2)}%`);

// Check if gap/SF gives a consistent value (suggesting missing offensive component)
console.log('\nGap divided by speed factor:');
const gapPerSF: number[] = gaps.filter(g => g.sf > 0).map(g => g.gap / g.sf);
gapPerSF.sort((a, b) => a - b);
console.log(`  Median: ${gapPerSF[Math.floor(gapPerSF.length / 2)].toFixed(1)} BV`);
console.log(`  Mean: ${(gapPerSF.reduce((s, v) => s + v, 0) / gapPerSF.length).toFixed(1)} BV`);
console.log(`  P25: ${gapPerSF[Math.floor(gapPerSF.length * 0.25)].toFixed(1)} BV`);
console.log(`  P75: ${gapPerSF[Math.floor(gapPerSF.length * 0.75)].toFixed(1)} BV`);

// Check if gap is proportional to defBV (suggesting defensive issue)
console.log('\nGap as fraction of defensive BV:');
const pctOfDef: number[] = [];
for (const g of gaps) {
  if (g.defBV > 0) pctOfDef.push(g.gap / g.defBV * 100);
}
pctOfDef.sort((a, b) => a - b);
console.log(`  Median: ${pctOfDef[Math.floor(pctOfDef.length / 2)].toFixed(2)}%`);
console.log(`  Mean: ${(pctOfDef.reduce((s, v) => s + v, 0) / pctOfDef.length).toFixed(2)}%`);

// Check gap vs tonnage directly
console.log('\nGap vs tonnage (is gap proportional to tonnage?):');
const gapPerTon: number[] = gaps.filter(g => g.tonnage > 0).map(g => g.gap / g.tonnage);
gapPerTon.sort((a, b) => a - b);
console.log(`  Median gap/ton: ${gapPerTon[Math.floor(gapPerTon.length / 2)].toFixed(2)}`);
console.log(`  Mean gap/ton: ${(gapPerTon.reduce((s, v) => s + v, 0) / gapPerTon.length).toFixed(2)}`);

// Check gap vs tonnage*SF (weight bonus * speed factor)
console.log('\nGap vs tonnage*SF:');
const gapVsWeightSF: number[] = gaps.filter(g => g.tonnage > 0 && g.sf > 0).map(g => g.gap / (g.tonnage * g.sf));
gapVsWeightSF.sort((a, b) => a - b);
console.log(`  Median gap/(ton*SF): ${gapVsWeightSF[Math.floor(gapVsWeightSF.length / 2)].toFixed(3)}`);
console.log(`  Mean gap/(ton*SF): ${(gapVsWeightSF.reduce((s, v) => s + v, 0) / gapVsWeightSF.length).toFixed(3)}`);

// How many units have gap ~= 0.5 * tonnage * SF? (suggesting weight bonus is half of what it should be)
let halfTonMatch = 0;
let fullTonMatch = 0;
for (const g of gaps) {
  if (g.tonnage <= 0 || g.sf <= 0) continue;
  const halfTonBV = 0.5 * g.tonnage * g.sf;
  const fullTonBV = g.tonnage * g.sf;
  if (Math.abs(g.gap - halfTonBV) < g.gap * 0.15) halfTonMatch++;
  if (Math.abs(g.gap - fullTonBV) < g.gap * 0.15) fullTonMatch++;
}
console.log(`\n  Gap ~= 0.5*tonnage*SF (within 15%): ${halfTonMatch} / ${gaps.length}`);
console.log(`  Gap ~= tonnage*SF (within 15%): ${fullTonMatch} / ${gaps.length}`);

// Load units and check for specific patterns: mechs with missing arm/hand actuators
// (which could affect physical weapon BV via mech-attack weight bonus)
let hasLowerArmActuator = 0;
let hasHandActuator = 0;
let missingHand = 0;
let missingLowerArm = 0;
let hasSword = 0;
let hasHatchet = 0;
let hasPhysical = 0;

for (const r of under.slice(0, 200)) {
  const iu = idx.units.find((u: any) => `${u.chassis} ${u.model}` === r.name);
  if (!iu) continue;
  let ud: any;
  try { ud = JSON.parse(fs.readFileSync(path.join(basePath, iu.path), 'utf-8')); } catch { continue; }
  const allCrits = Object.values(ud.criticalSlots || {}).flat().filter((s): s is string => !!s && typeof s === 'string');
  const allCritsLo = allCrits.map(s => s.toLowerCase());
  if (allCritsLo.some(s => s.includes('lower arm'))) hasLowerArmActuator++;
  if (allCritsLo.some(s => s.includes('hand actuator'))) hasHandActuator++;
  if (!allCritsLo.some(s => s.includes('hand actuator'))) missingHand++;
  if (!allCritsLo.some(s => s.includes('lower arm'))) missingLowerArm++;
  if (allCritsLo.some(s => s.includes('sword') || s.includes('hatchet') || s.includes('mace') || s.includes('retractable blade') || s.includes('claw'))) hasPhysical++;
}

console.log(`\nPhysical weapon analysis (first 200 under-units):`);
console.log(`  Has lower arm: ${hasLowerArmActuator}, Missing lower arm: ${missingLowerArm}`);
console.log(`  Has hand: ${hasHandActuator}, Missing hand: ${missingHand}`);
console.log(`  Has physical weapon: ${hasPhysical}`);
