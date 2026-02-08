/**
 * Analyze units in the 1-2% band to find systematic patterns for quick fixes.
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

// Units in 1-2% band
const nearMissUnder = valid.filter((x: any) => x.percentDiff >= -2 && x.percentDiff < -1);
const nearMissOver = valid.filter((x: any) => x.percentDiff > 1 && x.percentDiff <= 2);

console.log(`=== NEAR-MISS ANALYSIS ===`);
console.log(`  Undercalculated 1-2%: ${nearMissUnder.length}`);
console.log(`  Overcalculated 1-2%: ${nearMissOver.length}`);
console.log(`  Total: ${nearMissUnder.length + nearMissOver.length}\n`);

// Analyze undercalculated near-misses
console.log(`=== UNDERCALCULATED 1-2% (${nearMissUnder.length} units) ===`);
const underPatterns = { clan: 0, is: 0, mixed: 0, hasAMS: 0, hasC3: 0, hasArtemis: 0, hasTC: 0, hasTSM: 0, hasECM: 0, hasNarc: 0, hasProbe: 0 };
const underDiffBuckets = { def: 0, off: 0, both: 0 };

for (const u of nearMissUnder.sort((a: any, b: any) => a.percentDiff - b.percentDiff)) {
  const unit = loadUnit(u.unitId);
  if (!unit) continue;
  const b = u.breakdown;

  if (unit.techBase === 'CLAN') underPatterns.clan++;
  else if (unit.techBase === 'MIXED') underPatterns.mixed++;
  else underPatterns.is++;

  // Check for specific equipment
  const allCrits: string[] = [];
  if (unit.criticalSlots) {
    for (const [, slots] of Object.entries(unit.criticalSlots)) {
      if (Array.isArray(slots)) for (const s of slots as string[]) if (s) allCrits.push(s.toLowerCase());
    }
  }

  if (allCrits.some(c => c.includes('ams') || c.includes('antimissile'))) underPatterns.hasAMS++;
  if (allCrits.some(c => c.includes('c3'))) underPatterns.hasC3++;
  if (allCrits.some(c => c.includes('artemis'))) underPatterns.hasArtemis++;
  if (allCrits.some(c => c.includes('targeting computer') || c.includes('targetingcomputer') || c.includes('istc'))) underPatterns.hasTC++;
  if (allCrits.some(c => c.includes('tsm') || c.includes('triple strength'))) underPatterns.hasTSM++;
  if (allCrits.some(c => c.includes('ecm') || c.includes('guardian') || c.includes('angel') || c.includes('watchdog'))) underPatterns.hasECM++;
  if (allCrits.some(c => c.includes('narc'))) underPatterns.hasNarc++;
  if (allCrits.some(c => c.includes('probe') || c.includes('beagle') || c.includes('bloodhound'))) underPatterns.hasProbe++;

  // Show first 20
  if (nearMissUnder.indexOf(u) < 20) {
    const tags: string[] = [];
    if (unit.techBase === 'CLAN') tags.push('clan');
    else if (unit.techBase === 'MIXED') tags.push('mixed');
    else tags.push('IS');
    if (allCrits.some(c => c.includes('c3'))) tags.push('C3');
    if (allCrits.some(c => c.includes('artemis'))) tags.push('art');
    if (allCrits.some(c => c.includes('ecm') || c.includes('guardian') || c.includes('angel'))) tags.push('ecm');
    if (allCrits.some(c => c.includes('narc'))) tags.push('narc');
    if (allCrits.some(c => c.includes('ams'))) tags.push('ams');
    if (allCrits.some(c => c.includes('probe') || c.includes('beagle') || c.includes('bloodhound'))) tags.push('probe');

    console.log(`  ${u.unitId.padEnd(42)} ${u.percentDiff.toFixed(2)}% diff=${u.difference} [${tags.join(',')}]`);
  }
}

console.log(`\n  Patterns: IS=${underPatterns.is} Clan=${underPatterns.clan} Mixed=${underPatterns.mixed}`);
console.log(`  AMS=${underPatterns.hasAMS} C3=${underPatterns.hasC3} Artemis=${underPatterns.hasArtemis} TC=${underPatterns.hasTC} TSM=${underPatterns.hasTSM} ECM=${underPatterns.hasECM} Narc=${underPatterns.hasNarc} Probe=${underPatterns.hasProbe}`);

// Analyze overcalculated near-misses
console.log(`\n=== OVERCALCULATED 1-2% (${nearMissOver.length} units) ===`);
const overPatterns = { clan: 0, is: 0, mixed: 0, hasAMS: 0, hasC3: 0, hasArtemis: 0, hasTC: 0, hasTSM: 0, hasECM: 0, hasNarc: 0, hasProbe: 0 };

for (const u of nearMissOver.sort((a: any, b: any) => b.percentDiff - a.percentDiff)) {
  const unit = loadUnit(u.unitId);
  if (!unit) continue;

  if (unit.techBase === 'CLAN') overPatterns.clan++;
  else if (unit.techBase === 'MIXED') overPatterns.mixed++;
  else overPatterns.is++;

  const allCrits: string[] = [];
  if (unit.criticalSlots) {
    for (const [, slots] of Object.entries(unit.criticalSlots)) {
      if (Array.isArray(slots)) for (const s of slots as string[]) if (s) allCrits.push(s.toLowerCase());
    }
  }

  if (allCrits.some(c => c.includes('ams') || c.includes('antimissile'))) overPatterns.hasAMS++;
  if (allCrits.some(c => c.includes('c3'))) overPatterns.hasC3++;
  if (allCrits.some(c => c.includes('artemis'))) overPatterns.hasArtemis++;
  if (allCrits.some(c => c.includes('targeting computer') || c.includes('targetingcomputer') || c.includes('istc'))) overPatterns.hasTC++;
  if (allCrits.some(c => c.includes('tsm') || c.includes('triple strength'))) overPatterns.hasTSM++;
  if (allCrits.some(c => c.includes('ecm') || c.includes('guardian') || c.includes('angel') || c.includes('watchdog'))) overPatterns.hasECM++;
  if (allCrits.some(c => c.includes('narc'))) overPatterns.hasNarc++;
  if (allCrits.some(c => c.includes('probe') || c.includes('beagle') || c.includes('bloodhound'))) overPatterns.hasProbe++;

  if (nearMissOver.indexOf(u) < 20) {
    const tags: string[] = [];
    if (unit.techBase === 'CLAN') tags.push('clan');
    else if (unit.techBase === 'MIXED') tags.push('mixed');
    else tags.push('IS');
    if (allCrits.some(c => c.includes('c3'))) tags.push('C3');
    if (allCrits.some(c => c.includes('artemis'))) tags.push('art');
    if (allCrits.some(c => c.includes('ecm') || c.includes('guardian') || c.includes('angel'))) tags.push('ecm');
    if (allCrits.some(c => c.includes('narc'))) tags.push('narc');
    if (allCrits.some(c => c.includes('ams'))) tags.push('ams');
    if (allCrits.some(c => c.includes('probe') || c.includes('beagle') || c.includes('bloodhound'))) tags.push('probe');

    console.log(`  ${u.unitId.padEnd(42)} +${u.percentDiff.toFixed(2)}% diff=+${u.difference} [${tags.join(',')}]`);
  }
}

console.log(`\n  Patterns: IS=${overPatterns.is} Clan=${overPatterns.clan} Mixed=${overPatterns.mixed}`);
console.log(`  AMS=${overPatterns.hasAMS} C3=${overPatterns.hasC3} Artemis=${overPatterns.hasArtemis} TC=${overPatterns.hasTC} TSM=${overPatterns.hasTSM} ECM=${overPatterns.hasECM} Narc=${overPatterns.hasNarc} Probe=${overPatterns.hasProbe}`);

// Check: how many near-miss units have unresolved offensive equipment?
console.log('\n=== UNRESOLVED EQUIPMENT IN 1-2% BAND ===');
const allNearMiss = [...nearMissUnder, ...nearMissOver];
let unresolvedCount = 0;
for (const u of allNearMiss) {
  const unit = loadUnit(u.unitId);
  if (!unit) continue;
  const unresolved: string[] = [];
  for (const eq of (unit.equipment || [])) {
    const res = resolveEquipmentBV(eq.id);
    if (!res.resolved) unresolved.push(eq.id);
  }
  if (unresolved.length > 0) {
    unresolvedCount++;
    console.log(`  ${u.unitId.padEnd(42)} ${u.percentDiff.toFixed(2)}% unresolved: ${unresolved.join(', ')}`);
  }
}
console.log(`  Total with unresolved: ${unresolvedCount}/${allNearMiss.length}`);
