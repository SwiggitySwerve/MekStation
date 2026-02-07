/**
 * Analyze units in the 2-5% band for fixable patterns.
 */
import * as fs from 'fs';
import * as path from 'path';
import { resolveEquipmentBV } from '../src/utils/construction/equipmentBVResolver';

const report = JSON.parse(fs.readFileSync('validation-output/bv-validation-report.json', 'utf8'));
const idx = JSON.parse(fs.readFileSync('public/data/units/battlemechs/index.json', 'utf8'));

function loadUnit(unitId: string): any {
  const ie = idx.units.find((e: any) => e.id === unitId);
  if (!ie?.path) return null;
  try { return JSON.parse(fs.readFileSync(path.join('public/data/units/battlemechs', ie.path), 'utf8')); } catch { return null; }
}

const valid = report.allResults.filter((x: any) => x.status !== 'error' && x.percentDiff !== null && x.breakdown);

// Units in 2-5% band
const underBand = valid.filter((x: any) => x.percentDiff >= -5 && x.percentDiff < -2);
const overBand = valid.filter((x: any) => x.percentDiff > 2 && x.percentDiff <= 5);

console.log(`=== 2-5% BAND: ${underBand.length} under, ${overBand.length} over ===\n`);

// Analyze overcalculated - are they using MUL or index BV?
console.log(`=== OVERCALCULATED 2-5% (${overBand.length} units) ===`);
const overByRef: { mul: number; index: number } = { mul: 0, index: 0 };
const overEquipIssues = new Map<string, number>();

for (const u of overBand.sort((a: any, b: any) => b.percentDiff - a.percentDiff)) {
  const unit = loadUnit(u.unitId);
  if (!unit) continue;

  // Check ref source
  const ie = idx.units.find((e: any) => e.id === u.unitId);
  if (ie?.mulBV) overByRef.mul++;
  else overByRef.index++;

  // Check equipment patterns
  const allCrits: string[] = [];
  if (unit.criticalSlots) {
    for (const [, slots] of Object.entries(unit.criticalSlots)) {
      if (Array.isArray(slots)) for (const s of slots as string[]) if (s) allCrits.push(s.toLowerCase());
    }
  }
  const tags: string[] = [];
  if (unit.techBase === 'CLAN') tags.push('clan');
  else if (unit.techBase === 'MIXED') tags.push('mixed');
  else tags.push('IS');
  if (allCrits.some(c => c.includes('tsm'))) tags.push('TSM');
  if (allCrits.some(c => c.includes('masc'))) tags.push('MASC');
  if (allCrits.some(c => c.includes('supercharger'))) tags.push('SC');
  if (allCrits.some(c => c.includes('ecm') || c.includes('guardian') || c.includes('angel') || c.includes('watchdog'))) tags.push('ECM');
  if (allCrits.some(c => c.includes('stealth'))) tags.push('stealth');
  if (allCrits.some(c => c.includes('null') && c.includes('sig'))) tags.push('null-sig');
  if (allCrits.some(c => c.includes('void') && c.includes('sig'))) tags.push('void-sig');
  if (allCrits.some(c => c.includes('chameleon'))) tags.push('chameleon');
  if (allCrits.some(c => c.includes('c3'))) tags.push('C3');
  if (allCrits.some(c => c.includes('hatchet') || c.includes('sword') || c.includes('mace') || c.includes('claw') || c.includes('talons'))) tags.push('melee');

  const b = u.breakdown;
  if (overBand.indexOf(u) < 25)
    console.log(`  ${u.unitId.padEnd(42)} +${u.percentDiff.toFixed(1)}% diff=+${u.difference} ref=${u.indexBV} calc=${u.calculatedBV} SF=${b.speedFactor} [${tags.join(',')}]`);
}
console.log(`\n  Ref source: MUL=${overByRef.mul}, Index-only=${overByRef.index}`);

// Analyze undercalculated 2-5%
console.log(`\n=== UNDERCALCULATED 2-5% (${underBand.length} units) ===`);
const underByRef: { mul: number; index: number } = { mul: 0, index: 0 };

for (const u of underBand.sort((a: any, b: any) => a.percentDiff - b.percentDiff)) {
  const unit = loadUnit(u.unitId);
  if (!unit) continue;

  const ie = idx.units.find((e: any) => e.id === u.unitId);
  if (ie?.mulBV) underByRef.mul++;
  else underByRef.index++;

  const allCrits: string[] = [];
  if (unit.criticalSlots) {
    for (const [, slots] of Object.entries(unit.criticalSlots)) {
      if (Array.isArray(slots)) for (const s of slots as string[]) if (s) allCrits.push(s.toLowerCase());
    }
  }
  const tags: string[] = [];
  if (unit.techBase === 'CLAN') tags.push('clan');
  else if (unit.techBase === 'MIXED') tags.push('mixed');
  else tags.push('IS');
  if (allCrits.some(c => c.includes('tsm'))) tags.push('TSM');
  if (allCrits.some(c => c.includes('masc'))) tags.push('MASC');
  if (allCrits.some(c => c.includes('supercharger'))) tags.push('SC');
  if (allCrits.some(c => c.includes('ecm') || c.includes('guardian') || c.includes('angel') || c.includes('watchdog'))) tags.push('ECM');
  if (allCrits.some(c => c.includes('stealth'))) tags.push('stealth');
  if (allCrits.some(c => c.includes('c3'))) tags.push('C3');

  const b = u.breakdown;
  // Check for unresolved weapons
  const unresolvedW: string[] = [];
  for (const eq of (unit.equipment || [])) {
    const lo = eq.id.toLowerCase();
    if (lo.includes('targeting-computer') || lo.includes('tsm')) continue;
    const res = resolveEquipmentBV(eq.id);
    if (!res.resolved) unresolvedW.push(eq.id);
  }
  if (unresolvedW.length > 0) tags.push('unresolved');

  if (underBand.indexOf(u) < 25)
    console.log(`  ${u.unitId.padEnd(42)} ${u.percentDiff.toFixed(1)}% diff=${u.difference} weap=${b.weaponBV?.toFixed(0)} ammo=${b.ammoBV} HE=${b.heatEfficiency} [${tags.join(',')}]`);
  if (unresolvedW.length > 0 && underBand.indexOf(u) < 25)
    console.log(`    UNRESOLVED: ${unresolvedW.join(', ')}`);
}
console.log(`\n  Ref source: MUL=${underByRef.mul}, Index-only=${underByRef.index}`);

// Check: how many overcalculated units have stealth/void/null-sig?
console.log('\n=== STEALTH/SIGNATURE EQUIPMENT IN OVERCALCULATED ===');
let stealthCount = 0, voidCount = 0, nullCount = 0, chameleonCount = 0;
for (const u of overBand) {
  const unit = loadUnit(u.unitId);
  if (!unit || !unit.criticalSlots) continue;
  const allCrits: string[] = [];
  for (const [, slots] of Object.entries(unit.criticalSlots)) {
    if (Array.isArray(slots)) for (const s of slots as string[]) if (s) allCrits.push(s.toLowerCase());
  }
  if (allCrits.some(c => c.includes('stealth'))) stealthCount++;
  if (allCrits.some(c => c.includes('void') && c.includes('sig'))) voidCount++;
  if (allCrits.some(c => c.includes('null') && c.includes('sig'))) nullCount++;
  if (allCrits.some(c => c.includes('chameleon'))) chameleonCount++;
}
console.log(`  Stealth=${stealthCount}, VoidSig=${voidCount}, NullSig=${nullCount}, Chameleon=${chameleonCount}`);
