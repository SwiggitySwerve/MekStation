#!/usr/bin/env npx tsx
// Find what's systematically different in undercalculated IS units
import * as fs from 'fs';
import * as path from 'path';

const report = JSON.parse(fs.readFileSync('validation-output/bv-validation-report.json', 'utf-8'));
const idx = JSON.parse(fs.readFileSync('public/data/units/battlemechs/index.json', 'utf-8'));

// Undercalculated 1-5% IS units
const under = report.allResults.filter((r: any) =>
  r.percentDiff !== null && r.percentDiff < -1 && r.percentDiff > -5 && r.breakdown
);

// Exact match units
const exact = report.allResults.filter((r: any) =>
  r.percentDiff === 0 && r.breakdown
);

function analyzeWeaponIssues(group: any[], label: string) {
  console.log(`\n=== ${label} (${group.length} units) ===`);

  const hasXPulse: string[] = [];
  const hasHatchet: string[] = [];
  const hasSword: string[] = [];
  const hasRetBlade: string[] = [];
  const hasCoolantPod: string[] = [];
  const hasSmallCockpit: string[] = [];
  const hasCompactGyro: string[] = [];
  const hasHeavyGyro: string[] = [];
  const hasCompactEngine: string[] = [];
  const hasLightEngine: string[] = [];
  const hasICE: string[] = [];
  const hasFuelCell: string[] = [];
  const hasSupercharger: string[] = [];
  const hasMASC: string[] = [];
  const hasImprovedJJ: string[] = [];
  const hasHarjel: string[] = [];
  const hasStreakSRM: string[] = [];

  for (const r of group) {
    const iu = idx.units.find((u: any) => `${u.chassis} ${u.model}` === `${r.chassis} ${r.model}`);
    if (!iu) continue;
    try {
      const fp = path.resolve('public/data/units/battlemechs', iu.path);
      const ud = JSON.parse(fs.readFileSync(fp, 'utf-8'));

      const eqIds = ud.equipment.map((e: any) => e.id.toLowerCase()).join(' ');
      const name = `${r.chassis} ${r.model}`;

      if (eqIds.includes('x-pulse') || eqIds.includes('xpulse')) hasXPulse.push(name);
      if (eqIds.includes('hatchet')) hasHatchet.push(name);
      if (eqIds.includes('sword')) hasSword.push(name);
      if (eqIds.includes('retractable-blade') || eqIds.includes('retractableblade')) hasRetBlade.push(name);
      if (eqIds.includes('coolant') || eqIds.includes('coolantpod')) hasCoolantPod.push(name);
      if (ud.cockpit && ud.cockpit.toLowerCase().includes('small')) hasSmallCockpit.push(name);
      if (ud.gyro.type.toLowerCase().includes('compact')) hasCompactGyro.push(name);
      if (ud.gyro.type.toLowerCase().includes('heavy') && !ud.gyro.type.toLowerCase().includes('superheavy')) hasHeavyGyro.push(name);
      if (ud.engine.type.toLowerCase().includes('compact')) hasCompactEngine.push(name);
      if (ud.engine.type.toLowerCase().includes('light')) hasLightEngine.push(name);
      if (ud.engine.type.toLowerCase() === 'ice' || ud.engine.type.toLowerCase().includes('i.c.e')) hasICE.push(name);
      if (ud.engine.type.toLowerCase().includes('fuel')) hasFuelCell.push(name);
      if (eqIds.includes('supercharger')) hasSupercharger.push(name);
      if (eqIds.includes('masc')) hasMASC.push(name);
      if (eqIds.includes('improved') && (eqIds.includes('jump-jet') || eqIds.includes('jumpjet'))) hasImprovedJJ.push(name);
      if (eqIds.includes('harjel')) hasHarjel.push(name);
    } catch {}
  }

  console.log(`  X-Pulse: ${hasXPulse.length} units`);
  console.log(`  Hatchet: ${hasHatchet.length}`);
  console.log(`  Sword: ${hasSword.length}`);
  console.log(`  Retractable Blade: ${hasRetBlade.length}`);
  console.log(`  Coolant Pod: ${hasCoolantPod.length}`);
  console.log(`  Small Cockpit: ${hasSmallCockpit.length}`);
  console.log(`  Compact Gyro: ${hasCompactGyro.length}`);
  console.log(`  Heavy Gyro: ${hasHeavyGyro.length}`);
  console.log(`  Compact Engine: ${hasCompactEngine.length}`);
  console.log(`  Light Engine: ${hasLightEngine.length}`);
  console.log(`  ICE: ${hasICE.length}`);
  console.log(`  Fuel Cell: ${hasFuelCell.length}`);
  console.log(`  Supercharger: ${hasSupercharger.length}`);
  console.log(`  MASC: ${hasMASC.length}`);
  console.log(`  Improved JJ: ${hasImprovedJJ.length}`);
  console.log(`  HarJel: ${hasHarjel.length}`);

  return { hasXPulse, hasSmallCockpit, hasCompactGyro, hasCompactEngine, hasSupercharger, hasMASC, hasHarjel };
}

const underStats = analyzeWeaponIssues(under, 'UNDERCALCULATED 1-5%');
const exactStats = analyzeWeaponIssues(exact, 'EXACT MATCHES');

// Now look at whether our undercalculated units have unresolved weapons
console.log('\n=== UNRESOLVED WEAPONS IN UNDERCALCULATED ===');
let unresCount = 0;
for (const r of under) {
  if (r.issues && r.issues.some((i: string) => i.includes('Unresolved'))) {
    unresCount++;
    if (unresCount <= 10) console.log(`  ${r.chassis} ${r.model}: ${r.issues.join('; ')}`);
  }
}
console.log(`Total with unresolved weapons: ${unresCount}/${under.length}`);

// Check if the diff correlates with any particular variable
console.log('\n=== DIFF CORRELATION WITH SPEED FACTOR ===');
const sfBuckets: Record<string, { count: number; totalDiff: number }> = {};
for (const r of under) {
  const sf = r.breakdown.speedFactor.toFixed(1);
  if (!sfBuckets[sf]) sfBuckets[sf] = { count: 0, totalDiff: 0 };
  sfBuckets[sf].count++;
  sfBuckets[sf].totalDiff += r.percentDiff;
}
for (const [sf, data] of Object.entries(sfBuckets).sort((a, b) => parseFloat(a[0]) - parseFloat(b[0]))) {
  console.log(`  SF=${sf}: ${data.count} units, avg diff=${(data.totalDiff / data.count).toFixed(2)}%`);
}

// Check X-Pulse impact
if (underStats.hasXPulse.length > 0) {
  console.log('\n=== X-PULSE IMPACT ===');
  for (const name of underStats.hasXPulse.slice(0, 10)) {
    const r = under.find((r: any) => `${r.chassis} ${r.model}` === name);
    if (r) {
      const iu = idx.units.find((u: any) => `${u.chassis} ${u.model}` === name);
      if (!iu) continue;
      const fp = path.resolve('public/data/units/battlemechs', iu.path);
      const ud = JSON.parse(fs.readFileSync(fp, 'utf-8'));
      const xPulseCount = ud.equipment.filter((e: any) => {
        const lo = e.id.toLowerCase();
        return lo.includes('x-pulse') || lo.includes('xpulse');
      }).length;
      console.log(`  ${name}: diff=${r.difference} (${r.percentDiff.toFixed(1)}%), ${xPulseCount} x-pulse lasers`);
    }
  }
}
