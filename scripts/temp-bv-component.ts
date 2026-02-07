#!/usr/bin/env npx tsx
import * as fs from 'fs';
import * as path from 'path';

const reportPath = path.resolve(process.cwd(), 'validation-output/bv-validation-report.json');
const report = JSON.parse(fs.readFileSync(reportPath, 'utf-8'));

interface Result { unitId: string; chassis: string; model: string; tonnage: number; indexBV: number; calculatedBV: number; difference: number; percentDiff: number; status: string; breakdown?: { defensiveBV: number; offensiveBV: number; weaponBV: number; ammoBV: number; speedFactor: number; explosivePenalty: number; defensiveEquipBV: number }; rootCause?: string; }

const within1to5under = report.allResults.filter((r: Result) => 
  r.status !== 'error' && r.percentDiff !== null && r.percentDiff < -1 && r.percentDiff > -5 && r.breakdown
);

console.log(`Units under-calculated by 1-5% with breakdown: ${within1to5under.length}`);

let defHigher = 0, offHigher = 0, bothHigher = 0;
let defLower = 0, offLower = 0;
const speedFactors: number[] = [];
const ammoBVs: number[] = [];
const weaponBVs: number[] = [];

for (const r of within1to5under) {
  const b = r.breakdown!;
  speedFactors.push(b.speedFactor);
  ammoBVs.push(b.ammoBV);
  weaponBVs.push(b.weaponBV);
}

const avgSpeed = speedFactors.reduce((s, v) => s + v, 0) / speedFactors.length;
const avgAmmo = ammoBVs.reduce((s, v) => s + v, 0) / ammoBVs.length;
const avgWeapon = weaponBVs.reduce((s, v) => s + v, 0) / weaponBVs.length;

console.log(`\nAverage speed factor: ${avgSpeed.toFixed(3)}`);
console.log(`Average ammo BV: ${avgAmmo.toFixed(1)}`);
console.log(`Average weapon BV: ${avgWeapon.toFixed(1)}`);

console.log(`\n=== Speed factor distribution ===`);
const sfBuckets: Record<string, number> = {};
for (const sf of speedFactors) {
  const bucket = sf < 0.8 ? '<0.8' : sf < 1.0 ? '0.8-1.0' : sf < 1.2 ? '1.0-1.2' : sf < 1.5 ? '1.2-1.5' : sf < 2.0 ? '1.5-2.0' : '>=2.0';
  sfBuckets[bucket] = (sfBuckets[bucket] || 0) + 1;
}
for (const [b, c] of Object.entries(sfBuckets).sort()) console.log(`  ${b}: ${c}`);

console.log(`\n=== Checking specific units for patterns ===`);
const samples = within1to5under.sort((a: Result, b: Result) => a.percentDiff - b.percentDiff).slice(0, 15);
for (const r of samples) {
  const b = r.breakdown!;
  console.log(`${(r.chassis + ' ' + r.model).padEnd(40)} idx=${r.indexBV} calc=${r.calculatedBV} diff=${r.difference} (${r.percentDiff.toFixed(1)}%)`);
  console.log(`  def=${b.defensiveBV.toFixed(0)} off=${b.offensiveBV.toFixed(0)} wpn=${b.weaponBV.toFixed(0)} ammo=${b.ammoBV.toFixed(0)} sf=${b.speedFactor.toFixed(3)} expl=${b.explosivePenalty.toFixed(0)} defEq=${b.defensiveEquipBV.toFixed(0)}`);
}

console.log(`\n=== Checking exact match units for comparison ===`);
const exactUnits = report.allResults.filter((r: Result) => r.status === 'exact' && r.breakdown).slice(0, 5);
for (const r of exactUnits) {
  const b = r.breakdown!;
  console.log(`${(r.chassis + ' ' + r.model).padEnd(40)} idx=${r.indexBV} calc=${r.calculatedBV}`);
  console.log(`  def=${b.defensiveBV.toFixed(0)} off=${b.offensiveBV.toFixed(0)} wpn=${b.weaponBV.toFixed(0)} ammo=${b.ammoBV.toFixed(0)} sf=${b.speedFactor.toFixed(3)} expl=${b.explosivePenalty.toFixed(0)} defEq=${b.defensiveEquipBV.toFixed(0)}`);
}

console.log(`\n=== Checking if cockpit modifier is being applied correctly ===`);
const cockpitIssues: Result[] = [];
const basePath = path.resolve(process.cwd(), 'public/data/units/battlemechs');
const indexData = JSON.parse(fs.readFileSync(path.resolve(basePath, 'index.json'), 'utf-8'));
const indexMap = new Map<string, any>();
for (const u of indexData.units) indexMap.set(u.id, u);

for (const r of within1to5under.slice(0, 50)) {
  const iu = indexMap.get(r.unitId);
  if (!iu) continue;
  const unitPath = path.join(basePath, iu.path);
  if (!fs.existsSync(unitPath)) continue;
  const ud = JSON.parse(fs.readFileSync(unitPath, 'utf-8'));
  
  const b = r.breakdown!;
  const baseBV = b.defensiveBV + b.offensiveBV;
  const impliedMod = r.calculatedBV / baseBV;
  const cockpit = ud.cockpit || 'STANDARD';
  
  if (Math.abs(impliedMod - 1.0) > 0.001 || cockpit.toUpperCase() !== 'STANDARD') {
    console.log(`  ${(r.chassis + ' ' + r.model).padEnd(40)} cockpit=${cockpit} impliedMod=${impliedMod.toFixed(4)} baseBV=${baseBV.toFixed(0)} calcBV=${r.calculatedBV}`);
  }
}
