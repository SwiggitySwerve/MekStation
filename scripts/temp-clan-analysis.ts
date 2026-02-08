#!/usr/bin/env npx tsx
import * as fs from 'fs';
import * as path from 'path';

const reportPath = path.resolve(process.cwd(), 'validation-output/bv-validation-report.json');
const report = JSON.parse(fs.readFileSync(reportPath, 'utf-8'));

interface Result { unitId: string; chassis: string; model: string; tonnage: number; indexBV: number; calculatedBV: number; difference: number; percentDiff: number; status: string; breakdown?: { defensiveBV: number; offensiveBV: number; weaponBV: number; ammoBV: number; speedFactor: number; explosivePenalty: number; defensiveEquipBV: number }; rootCause?: string; }

const basePath = path.resolve(process.cwd(), 'public/data/units/battlemechs');
const indexData = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), 'public/data/units/battlemechs/index.json'), 'utf-8'));
const indexMap = new Map<string, any>();
for (const u of indexData.units) indexMap.set(u.id, u);

const minorDisc = report.allResults.filter((r: Result) => r.rootCause === 'minor-discrepancy');
console.log(`Minor discrepancy units: ${minorDisc.length}`);

const underCalc = minorDisc.filter((r: Result) => r.percentDiff < 0);
const overCalc = minorDisc.filter((r: Result) => r.percentDiff > 0);
console.log(`  Under-calculated: ${underCalc.length} (avg ${(underCalc.reduce((s: number, r: Result) => s + r.percentDiff, 0) / underCalc.length).toFixed(2)}%)`);
console.log(`  Over-calculated: ${overCalc.length} (avg ${(overCalc.reduce((s: number, r: Result) => s + r.percentDiff, 0) / overCalc.length).toFixed(2)}%)`);

const buckets: Record<string, Result[]> = {};
for (const r of minorDisc) {
  const pct = r.percentDiff;
  const bucket = pct < -4 ? '<-4%' : pct < -3 ? '-4 to -3%' : pct < -2 ? '-3 to -2%' : pct < -1 ? '-2 to -1%' : pct < 0 ? '-1 to 0%' : pct < 1 ? '0 to 1%' : pct < 2 ? '1 to 2%' : pct < 3 ? '2 to 3%' : pct < 4 ? '3 to 4%' : '>4%';
  if (!buckets[bucket]) buckets[bucket] = [];
  buckets[bucket].push(r);
}
console.log(`\nDistribution:`);
for (const [b, items] of Object.entries(buckets).sort((a, b) => {
  const order = ['<-4%', '-4 to -3%', '-3 to -2%', '-2 to -1%', '-1 to 0%', '0 to 1%', '1 to 2%', '2 to 3%', '3 to 4%', '>4%'];
  return order.indexOf(a[0]) - order.indexOf(b[0]);
})) {
  const techBases: Record<string, number> = {};
  for (const r of items) {
    const iu = indexMap.get(r.unitId);
    const tb = iu?.techBase || 'UNKNOWN';
    techBases[tb] = (techBases[tb] || 0) + 1;
  }
  const tbStr = Object.entries(techBases).map(([t, c]) => `${t}:${c}`).join(' ');
  console.log(`  ${b.padEnd(12)} ${String(items.length).padStart(4)} units  ${tbStr}`);
}

const within5 = report.allResults.filter((r: Result) => r.rootCause === 'minor-discrepancy' && Math.abs(r.percentDiff) > 1 && Math.abs(r.percentDiff) <= 5);
console.log(`\nUnits between 1-5% off: ${within5.length}`);

const underBy2to5 = within5.filter((r: Result) => r.percentDiff < -1);
console.log(`  Under by 1-5%: ${underBy2to5.length}`);

for (const r of underBy2to5.slice(0, 10)) {
  const iu = indexMap.get(r.unitId);
  const unitPath = path.join(basePath, iu.path);
  const ud = JSON.parse(fs.readFileSync(unitPath, 'utf-8'));
  const hasAmmo = ud.criticalSlots && Object.values(ud.criticalSlots).some((slots: any) => Array.isArray(slots) && slots.some((s: any) => s && typeof s === 'string' && s.toLowerCase().includes('ammo')));
  const hasMGA = ud.equipment?.some((eq: any) => eq.id.toLowerCase().includes('machine-gun-array') || eq.id.toLowerCase().includes('mga'));
  const hasAES = ud.criticalSlots && Object.values(ud.criticalSlots).some((slots: any) => Array.isArray(slots) && slots.some((s: any) => s && typeof s === 'string' && s.toLowerCase().includes('aes')));
  console.log(`  ${(r.chassis + ' ' + r.model).padEnd(40)} ${iu.techBase.padEnd(6)} BV%=${r.percentDiff.toFixed(1)}% idx=${r.indexBV} calc=${r.calculatedBV} ammo=${hasAmmo} mga=${hasMGA} aes=${hasAES}`);
}

console.log(`\n=== Checking for MGA units in discrepancies ===`);
let mgaCount = 0;
for (const r of report.allResults) {
  if (r.status === 'error') continue;
  const iu = indexMap.get(r.unitId);
  if (!iu) continue;
  const unitPath = path.join(basePath, iu.path);
  if (!fs.existsSync(unitPath)) continue;
  const ud = JSON.parse(fs.readFileSync(unitPath, 'utf-8'));
  const hasMGA = ud.equipment?.some((eq: any) => {
    const lo = eq.id.toLowerCase();
    return lo.includes('machine-gun-array') || lo === 'ismga' || lo === 'clmga' || lo === 'islmga' || lo === 'clhmga' || lo === 'ishmga' || lo === 'cllmga';
  }) || (ud.criticalSlots && Object.values(ud.criticalSlots).some((slots: any) => Array.isArray(slots) && slots.some((s: any) => s && typeof s === 'string' && (s.toLowerCase().includes('machine gun array') || s.toLowerCase().includes('mga')))));
  if (hasMGA && r.percentDiff !== null) {
    mgaCount++;
    if (Math.abs(r.percentDiff) > 1) {
      console.log(`  ${(r.chassis + ' ' + r.model).padEnd(40)} ${iu.techBase.padEnd(6)} BV%=${r.percentDiff.toFixed(1)}% idx=${r.indexBV} calc=${r.calculatedBV}`);
    }
  }
}
console.log(`Total MGA units in validation: ${mgaCount}`);

console.log(`\n=== Checking for AES units in discrepancies ===`);
let aesCount = 0;
for (const r of report.allResults) {
  if (r.status === 'error') continue;
  const iu = indexMap.get(r.unitId);
  if (!iu) continue;
  const unitPath = path.join(basePath, iu.path);
  if (!fs.existsSync(unitPath)) continue;
  const ud = JSON.parse(fs.readFileSync(unitPath, 'utf-8'));
  const hasAES = (ud.criticalSlots && Object.values(ud.criticalSlots).some((slots: any) => Array.isArray(slots) && slots.some((s: any) => s && typeof s === 'string' && s.toLowerCase().includes('aes')))) || ud.equipment?.some((eq: any) => eq.id.toLowerCase().includes('aes'));
  if (hasAES && r.percentDiff !== null) {
    aesCount++;
    if (Math.abs(r.percentDiff) > 1) {
      console.log(`  ${(r.chassis + ' ' + r.model).padEnd(40)} ${iu.techBase.padEnd(6)} BV%=${r.percentDiff.toFixed(1)}% idx=${r.indexBV} calc=${r.calculatedBV}`);
    }
  }
}
console.log(`Total AES units in validation: ${aesCount}`);
