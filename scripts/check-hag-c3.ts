/**
 * Investigate HAG undercalculation and C3 slave issues.
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

// HAG units
console.log('=== HAG UNITS ===');
const hagUnits: any[] = [];
for (const r of valid) {
  const unit = loadUnit(r.unitId);
  if (!unit?.criticalSlots) continue;
  const critsStr = JSON.stringify(unit.criticalSlots).toLowerCase();
  if (critsStr.includes('hag')) {
    const weaps = r.breakdown?.weapons?.filter((w: any) => w.id?.toLowerCase().includes('hag') || w.name?.toLowerCase().includes('hag')) || [];
    hagUnits.push({ ...r, hagWeapons: weaps, unit });
  }
}

console.log(`Total HAG units: ${hagUnits.length}`);
for (const r of hagUnits.filter((x: any) => Math.abs(x.percentDiff) > 1).sort((a: any, b: any) => a.percentDiff - b.percentDiff)) {
  const weaps = r.hagWeapons.map((w: any) => `${w.name||w.id}(bv=${w.bv})`).join(', ');
  console.log(`  ${r.unitId.padEnd(40)} diff=${r.percentDiff.toFixed(1).padStart(5)}% ref=${r.indexBV} calc=${r.calculatedBV} HAG: ${weaps}`);
}

// Check HAG weapon BV values
console.log('\n=== HAG WEAPON BV VALUES ===');
const hagBVs = new Map<string, Set<number>>();
for (const r of hagUnits) {
  for (const w of r.hagWeapons) {
    const name = w.name || w.id;
    if (!hagBVs.has(name)) hagBVs.set(name, new Set());
    hagBVs.get(name)!.add(w.bv);
  }
}
for (const [name, bvs] of hagBVs) {
  console.log(`  ${name}: BV values = ${[...bvs].sort((a, b) => a - b).join(', ')}`);
}

// C3 slave units
console.log('\n=== C3 SLAVE UNITS ===');
const c3Units: any[] = [];
for (const r of valid) {
  const unit = loadUnit(r.unitId);
  if (!unit?.criticalSlots) continue;
  const critsStr = JSON.stringify(unit.criticalSlots).toLowerCase();
  const hasC3Slave = critsStr.includes('c3 slave') || critsStr.includes('c3slave') || critsStr.includes('isc3boostedslaveunit');
  const hasC3Master = critsStr.includes('c3 master') || critsStr.includes('c3master');
  if (hasC3Slave && !hasC3Master) {
    c3Units.push({ ...r, unit });
  }
}

const c3Outliers = c3Units.filter((x: any) => Math.abs(x.percentDiff) > 1);
console.log(`Total C3 slave-only units: ${c3Units.length}, outliers: ${c3Outliers.length}`);
for (const r of c3Outliers.sort((a: any, b: any) => a.percentDiff - b.percentDiff)) {
  const b = r.breakdown;
  console.log(`  ${r.unitId.padEnd(40)} diff=${r.percentDiff.toFixed(1).padStart(5)}% ref=${r.indexBV} calc=${r.calculatedBV} DF=${b?.defensiveFactor} SF=${b?.speedFactor}`);
}

// Check: PPC Capacitor units
console.log('\n=== PPC CAPACITOR UNITS ===');
const ppcCapUnits: any[] = [];
for (const r of valid) {
  const unit = loadUnit(r.unitId);
  if (!unit?.criticalSlots) continue;
  const critsStr = JSON.stringify(unit.criticalSlots).toLowerCase();
  if (critsStr.includes('ppc capacitor') || critsStr.includes('ppccapacitor')) {
    const weaps = r.breakdown?.weapons?.filter((w: any) => w.id?.toLowerCase().includes('ppc') || w.name?.toLowerCase().includes('ppc')) || [];
    ppcCapUnits.push({ ...r, ppcWeapons: weaps, unit });
  }
}

const ppcCapOutliers = ppcCapUnits.filter((x: any) => Math.abs(x.percentDiff) > 1);
console.log(`Total PPC Capacitor units: ${ppcCapUnits.length}, outliers: ${ppcCapOutliers.length}`);
for (const r of ppcCapOutliers.sort((a: any, b: any) => a.percentDiff - b.percentDiff)) {
  const weaps = r.ppcWeapons.map((w: any) => `${w.name||w.id}(bv=${w.bv})`).join(', ');
  console.log(`  ${r.unitId.padEnd(40)} diff=${r.percentDiff.toFixed(1).padStart(5)}% ref=${r.indexBV} calc=${r.calculatedBV} PPC: ${weaps}`);
}

// Check: do we handle PPC Capacitor BV bonus? It adds +5 damage and changes BV
console.log('\n=== PPC CAPACITOR HANDLING CHECK ===');
// In BV 2.0, PPC Capacitor adds 44 BV (standard PPC) or variable per PPC type
// Check if we're counting it
for (const r of ppcCapOutliers.slice(0, 5)) {
  const unit = r.unit;
  let capCount = 0;
  for (const [loc, slots] of Object.entries(unit.criticalSlots || {})) {
    if (!Array.isArray(slots)) continue;
    for (const s of slots) {
      if (typeof s === 'string' && s.toLowerCase().includes('ppc capacitor')) capCount++;
    }
  }
  console.log(`  ${r.unitId}: ${capCount} PPC Capacitor crit slots`);
}
