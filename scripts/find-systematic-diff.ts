#!/usr/bin/env npx tsx
// Find the systematic cause of ~2% undercalculation in IS units
import * as fs from 'fs';
import * as path from 'path';

const report = JSON.parse(fs.readFileSync('validation-output/bv-validation-report.json', 'utf-8'));
const idx = JSON.parse(fs.readFileSync('public/data/units/battlemechs/index.json', 'utf-8'));

// IS units undercalculated 1-5% with no unresolved weapons
const under = report.allResults.filter((r: any) =>
  r.percentDiff !== null && r.percentDiff < -1 && r.percentDiff > -5 &&
  r.breakdown && (!r.issues || r.issues.length === 0 || !r.issues.some((i: string) => i.includes('Unresolved')))
);

console.log(`Undercalculated 1-5%: ${under.length} units`);

// For a subset, calculate what % of total BV the diff represents,
// and check if the diff is proportional to offensive or defensive BV
const diffs: { name: string; techBase: string; diff: number; pct: number;
  offBV: number; defBV: number; weapBV: number; ammoBV: number;
  offPct: number; defPct: number; sf: number; tonnage: number;
  armorType: string; structType: string; engineType: string;
}[] = [];

for (const r of under.slice(0, 200)) {
  const iu = idx.units.find((u: any) => `${u.chassis} ${u.model}` === `${r.chassis} ${r.model}`);
  if (!iu) continue;
  try {
    const fp = path.resolve('public/data/units/battlemechs', iu.path);
    const ud = JSON.parse(fs.readFileSync(fp, 'utf-8'));

    const bd = r.breakdown;
    const totalCalc = bd.offensiveBV + bd.defensiveBV;

    diffs.push({
      name: `${r.chassis} ${r.model}`,
      techBase: ud.techBase,
      diff: r.difference,
      pct: r.percentDiff,
      offBV: bd.offensiveBV,
      defBV: bd.defensiveBV,
      weapBV: bd.weaponBV,
      ammoBV: bd.ammoBV,
      offPct: bd.offensiveBV / totalCalc * 100,
      defPct: bd.defensiveBV / totalCalc * 100,
      sf: bd.speedFactor,
      tonnage: ud.tonnage,
      armorType: ud.armor.type,
      structType: ud.structure.type,
      engineType: ud.engine.type,
    });
  } catch {}
}

// Check: is the diff consistently proportional to offensive BV or defensive BV?
console.log('\n=== DIFF AS % OF OFFENSIVE BV ===');
const offRatios = diffs.map(d => d.diff / d.offBV * 100);
console.log(`avg: ${(offRatios.reduce((s, v) => s + v, 0) / offRatios.length).toFixed(2)}%`);
console.log(`min: ${Math.min(...offRatios).toFixed(2)}%, max: ${Math.max(...offRatios).toFixed(2)}%`);

console.log('\n=== DIFF AS % OF DEFENSIVE BV ===');
const defRatios = diffs.map(d => d.diff / d.defBV * 100);
console.log(`avg: ${(defRatios.reduce((s, v) => s + v, 0) / defRatios.length).toFixed(2)}%`);
console.log(`min: ${Math.min(...defRatios).toFixed(2)}%, max: ${Math.max(...defRatios).toFixed(2)}%`);

console.log('\n=== DIFF AS % OF WEAPON BV ===');
const weapRatios = diffs.filter(d => d.weapBV > 0).map(d => d.diff / d.weapBV * 100);
console.log(`avg: ${(weapRatios.reduce((s, v) => s + v, 0) / weapRatios.length).toFixed(2)}%`);

// Group by armor type
console.log('\n=== BY ARMOR TYPE ===');
const armorGroups: Record<string, { count: number; totalDiff: number }> = {};
for (const d of diffs) {
  if (!armorGroups[d.armorType]) armorGroups[d.armorType] = { count: 0, totalDiff: 0 };
  armorGroups[d.armorType].count++;
  armorGroups[d.armorType].totalDiff += d.pct;
}
for (const [type, data] of Object.entries(armorGroups).sort((a, b) => b[1].count - a[1].count)) {
  console.log(`  ${type.padEnd(25)} ${data.count} units, avg ${(data.totalDiff / data.count).toFixed(2)}%`);
}

// Group by engine type
console.log('\n=== BY ENGINE TYPE ===');
const engineGroups: Record<string, { count: number; totalDiff: number }> = {};
for (const d of diffs) {
  if (!engineGroups[d.engineType]) engineGroups[d.engineType] = { count: 0, totalDiff: 0 };
  engineGroups[d.engineType].count++;
  engineGroups[d.engineType].totalDiff += d.pct;
}
for (const [type, data] of Object.entries(engineGroups).sort((a, b) => b[1].count - a[1].count)) {
  console.log(`  ${type.padEnd(25)} ${data.count} units, avg ${(data.totalDiff / data.count).toFixed(2)}%`);
}

// Group by structure type
console.log('\n=== BY STRUCTURE TYPE ===');
const structGroups: Record<string, { count: number; totalDiff: number }> = {};
for (const d of diffs) {
  if (!structGroups[d.structType]) structGroups[d.structType] = { count: 0, totalDiff: 0 };
  structGroups[d.structType].count++;
  structGroups[d.structType].totalDiff += d.pct;
}
for (const [type, data] of Object.entries(structGroups).sort((a, b) => b[1].count - a[1].count)) {
  console.log(`  ${type.padEnd(25)} ${data.count} units, avg ${(data.totalDiff / data.count).toFixed(2)}%`);
}

// Check: does the diff correlate with tonnage?
console.log('\n=== BY TONNAGE ===');
const tonnageGroups: Record<number, { count: number; totalDiff: number }> = {};
for (const d of diffs) {
  const bucket = Math.floor(d.tonnage / 20) * 20;
  if (!tonnageGroups[bucket]) tonnageGroups[bucket] = { count: 0, totalDiff: 0 };
  tonnageGroups[bucket].count++;
  tonnageGroups[bucket].totalDiff += d.pct;
}
for (const [ton, data] of Object.entries(tonnageGroups).sort((a, b) => Number(a) - Number(b))) {
  console.log(`  ${ton}t+: ${data.count} units, avg ${(data.totalDiff / data.count).toFixed(2)}%`);
}

// Finally: look at exact match units and see if there are features they DON'T have
console.log('\n=== TOP 20 CLOSEST UNDERCALCULATED (might reveal diff source) ===');
const closest = diffs.sort((a, b) => b.pct - a.pct).slice(0, 20);
for (const d of closest) {
  console.log(`  ${d.name.padEnd(35)} ${d.techBase.padEnd(6)} diff=${d.diff} (${d.pct.toFixed(2)}%) off=${d.offBV.toFixed(0)} def=${d.defBV.toFixed(0)} wBV=${d.weapBV.toFixed(0)} sf=${d.sf} ton=${d.tonnage}`);
}
