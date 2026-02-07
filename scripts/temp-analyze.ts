#!/usr/bin/env npx tsx
import * as fs from 'fs';
import * as path from 'path';

const reportPath = path.resolve(process.cwd(), 'validation-output/bv-validation-report.json');
const report = JSON.parse(fs.readFileSync(reportPath, 'utf-8'));

const basePath = path.resolve(process.cwd(), 'public/data/units/battlemechs');
const indexData = JSON.parse(fs.readFileSync(path.join(basePath, 'index.json'), 'utf-8'));
const unitIndex = new Map<string, any>();
for (const iu of indexData.units) unitIndex.set(iu.id, iu);

const minorDisc = report.allResults.filter((r: any) => r.rootCause === 'minor-discrepancy');
const underCalc = minorDisc.filter((r: any) => r.difference < 0);
const overCalc = minorDisc.filter((r: any) => r.difference > 0);

console.log(`Minor discrepancy: ${minorDisc.length} total`);
console.log(`  Under-calculated: ${underCalc.length} (avg ${(underCalc.reduce((s: number, r: any) => s + r.percentDiff, 0) / underCalc.length).toFixed(2)}%)`);
console.log(`  Over-calculated: ${overCalc.length} (avg ${(overCalc.reduce((s: number, r: any) => s + r.percentDiff, 0) / overCalc.length).toFixed(2)}%)`);

// Analyze by tech base
const byTech: Record<string, { count: number; avgPct: number; under: number; over: number }> = {};
for (const r of minorDisc) {
  const iu = unitIndex.get(r.unitId);
  if (!iu) continue;
  const ud = JSON.parse(fs.readFileSync(path.join(basePath, iu.path), 'utf-8'));
  const tech = ud.techBase || 'UNKNOWN';
  if (!byTech[tech]) byTech[tech] = { count: 0, avgPct: 0, under: 0, over: 0 };
  byTech[tech].count++;
  byTech[tech].avgPct += r.percentDiff;
  if (r.difference < 0) byTech[tech].under++;
  else byTech[tech].over++;
}
console.log('\nBy tech base:');
for (const [tech, data] of Object.entries(byTech)) {
  console.log(`  ${tech}: ${data.count} units, avg ${(data.avgPct / data.count).toFixed(2)}%, under=${data.under}, over=${data.over}`);
}

// Analyze by tonnage range
const byTonnage: Record<string, { count: number; avgPct: number }> = {};
for (const r of minorDisc) {
  const range = r.tonnage <= 35 ? 'Light (20-35t)' : r.tonnage <= 55 ? 'Medium (40-55t)' : r.tonnage <= 75 ? 'Heavy (60-75t)' : 'Assault (80-100t)';
  if (!byTonnage[range]) byTonnage[range] = { count: 0, avgPct: 0 };
  byTonnage[range].count++;
  byTonnage[range].avgPct += r.percentDiff;
}
console.log('\nBy tonnage:');
for (const [range, data] of Object.entries(byTonnage)) {
  console.log(`  ${range}: ${data.count} units, avg ${(data.avgPct / data.count).toFixed(2)}%`);
}

// Show breakdown stats for under-calculated minor discrepancies
console.log('\nSample under-calculated minor discrepancies (sorted by % diff):');
const sortedUnder = underCalc.sort((a: any, b: any) => a.percentDiff - b.percentDiff).slice(0, 15);
for (const r of sortedUnder) {
  const bd = r.breakdown;
  console.log(`  ${(r.chassis + ' ' + r.model).padEnd(35)} idx=${r.indexBV} calc=${r.calculatedBV} diff=${r.difference} (${r.percentDiff.toFixed(1)}%) def=${bd?.defensiveBV?.toFixed(0)} off=${bd?.offensiveBV?.toFixed(0)} wep=${bd?.weaponBV?.toFixed(0)} ammo=${bd?.ammoBV?.toFixed(0)} spd=${bd?.speedFactor?.toFixed(2)} defEq=${bd?.defensiveEquipBV?.toFixed(0)}`);
}

console.log('\nSample over-calculated minor discrepancies (sorted by % diff):');
const sortedOver = overCalc.sort((a: any, b: any) => b.percentDiff - a.percentDiff).slice(0, 15);
for (const r of sortedOver) {
  const bd = r.breakdown;
  console.log(`  ${(r.chassis + ' ' + r.model).padEnd(35)} idx=${r.indexBV} calc=${r.calculatedBV} diff=${r.difference} (${r.percentDiff.toFixed(1)}%) def=${bd?.defensiveBV?.toFixed(0)} off=${bd?.offensiveBV?.toFixed(0)} wep=${bd?.weaponBV?.toFixed(0)} ammo=${bd?.ammoBV?.toFixed(0)} spd=${bd?.speedFactor?.toFixed(2)} defEq=${bd?.defensiveEquipBV?.toFixed(0)}`);
}
