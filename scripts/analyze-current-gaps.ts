import * as fs from 'fs';
import * as path from 'path';

const report = JSON.parse(fs.readFileSync('validation-output/bv-validation-report.json', 'utf8'));
const idx = JSON.parse(fs.readFileSync('public/data/units/battlemechs/index.json', 'utf8'));
const valid = report.allResults.filter((x: any) => x.status !== 'error' && x.percentDiff !== null);
const outside1 = valid.filter((x: any) => Math.abs(x.percentDiff) > 1);

// Distribution
const under1to2 = outside1.filter((x: any) => x.percentDiff < -1 && x.percentDiff >= -2);
const under2to5 = outside1.filter((x: any) => x.percentDiff < -2 && x.percentDiff >= -5);
const under5plus = outside1.filter((x: any) => x.percentDiff < -5);
const over1to2 = outside1.filter((x: any) => x.percentDiff > 1 && x.percentDiff <= 2);
const over2to5 = outside1.filter((x: any) => x.percentDiff > 2 && x.percentDiff <= 5);
const over5plus = outside1.filter((x: any) => x.percentDiff > 5);

console.log(`Outside 1%: ${outside1.length} (need ~${outside1.length - 148} fixed for 95%)`);
console.log(`  Under 1-2%: ${under1to2.length}`);
console.log(`  Under 2-5%: ${under2to5.length}`);
console.log(`  Under 5%+:  ${under5plus.length}`);
console.log(`  Over 1-2%:  ${over1to2.length}`);
console.log(`  Over 2-5%:  ${over2to5.length}`);
console.log(`  Over 5%+:   ${over5plus.length}`);

// Load units and classify patterns
function loadUnit(unitId: string): any {
  const ie = idx.units.find((e: any) => e.id === unitId);
  if (!ie?.path) return null;
  try { return JSON.parse(fs.readFileSync(path.join('public/data/units/battlemechs', ie.path), 'utf8')); } catch { return null; }
}

// Focus on the 1-2% bands since those are easiest to fix
console.log('\n=== OVERCALCULATED 1-2% PATTERNS ===');
const overPatterns: Record<string, number> = {};
for (const u of over1to2) {
  const unit = loadUnit(u.unitId);
  if (!unit) continue;
  const b = u.breakdown;
  const cockpit = b?.cockpitModifier ?? 1;
  const refBase = u.indexBV / cockpit;

  // Check what side has excess
  const defExcess = b ? b.defensiveBV - (refBase - b.offensiveBV) : 0;
  const offExcess = b ? b.offensiveBV - (refBase - b.defensiveBV) : 0;

  const hasTSM = unit.criticalSlots && Object.values(unit.criticalSlots).some((slots: any) =>
    Array.isArray(slots) && slots.some((s: any) => s && typeof s === 'string' &&
      (s.toLowerCase() === 'tsm' || s.toLowerCase().includes('triple strength'))));
  const hasMASC = unit.criticalSlots && Object.values(unit.criticalSlots).some((slots: any) =>
    Array.isArray(slots) && slots.some((s: any) => s && typeof s === 'string' && s.toLowerCase().includes('masc')));
  const hasSC = unit.criticalSlots && Object.values(unit.criticalSlots).some((slots: any) =>
    Array.isArray(slots) && slots.some((s: any) => s && typeof s === 'string' && s.toLowerCase().includes('supercharger')));

  const tags: string[] = [];
  if (hasTSM) tags.push('tsm');
  if (hasMASC) tags.push('masc');
  if (hasSC) tags.push('sc');
  if (defExcess > 10) tags.push('def-high');
  if (offExcess > 10) tags.push('off-high');
  if (unit.armor?.type && unit.armor.type.toLowerCase() !== 'standard') tags.push('special-armor:' + unit.armor.type);
  if (unit.structure?.type && unit.structure.type.toLowerCase() !== 'standard') tags.push('special-struct:' + unit.structure.type);
  if (tags.length === 0) tags.push('unknown');

  for (const t of tags) overPatterns[t] = (overPatterns[t] ?? 0) + 1;
}
for (const [k, v] of Object.entries(overPatterns).sort((a, b) => b[1] - a[1])) {
  console.log(`  ${k}: ${v}`);
}

console.log('\n=== UNDERCALCULATED 1-2% PATTERNS ===');
const underPatterns: Record<string, number> = {};
for (const u of under1to2) {
  const unit = loadUnit(u.unitId);
  if (!unit) continue;
  const b = u.breakdown;

  const hasTSM = unit.criticalSlots && Object.values(unit.criticalSlots).some((slots: any) =>
    Array.isArray(slots) && slots.some((s: any) => s && typeof s === 'string' &&
      (s.toLowerCase() === 'tsm' || s.toLowerCase().includes('triple strength'))));
  const hasMASC = unit.criticalSlots && Object.values(unit.criticalSlots).some((slots: any) =>
    Array.isArray(slots) && slots.some((s: any) => s && typeof s === 'string' && s.toLowerCase().includes('masc')));
  const hasTC = unit.criticalSlots && Object.values(unit.criticalSlots).some((slots: any) =>
    Array.isArray(slots) && slots.some((s: any) => s && typeof s === 'string' && s.toLowerCase().includes('targeting computer')));

  const tags: string[] = [];
  if (hasTSM) tags.push('tsm');
  if (hasMASC) tags.push('masc');
  if (hasTC) tags.push('tc');
  if (unit.techBase === 'CLAN') tags.push('clan');
  else if (unit.techBase === 'MIXED') tags.push('mixed');
  if (b?.halvedWeaponCount > 0) tags.push('has-halved');

  // Check unresolved equipment
  const unresolved = (unit.equipment || []).filter((eq: any) => {
    const { resolveEquipmentBV } = require('../src/utils/construction/equipmentBVResolver');
    const res = resolveEquipmentBV(eq.id);
    return !res.resolved;
  });
  if (unresolved.length > 0) tags.push('unresolved-equip');

  if (tags.length === 0) tags.push('unknown');
  for (const t of tags) underPatterns[t] = (underPatterns[t] ?? 0) + 1;
}
for (const [k, v] of Object.entries(underPatterns).sort((a, b) => b[1] - a[1])) {
  console.log(`  ${k}: ${v}`);
}

// Check bigger gaps: what types of equipment are unresolved in 2-5% undercalculated?
console.log('\n=== UNDERCALCULATED 2-5% UNRESOLVED EQUIPMENT ===');
const { resolveEquipmentBV } = require('../src/utils/construction/equipmentBVResolver');
const unresolvedCounts: Record<string, number> = {};
for (const u of under2to5) {
  const unit = loadUnit(u.unitId);
  if (!unit) continue;
  for (const eq of (unit.equipment || [])) {
    const res = resolveEquipmentBV(eq.id);
    if (!res.resolved) {
      unresolvedCounts[eq.id] = (unresolvedCounts[eq.id] ?? 0) + 1;
    }
  }
}
for (const [k, v] of Object.entries(unresolvedCounts).sort((a, b) => b[1] - a[1]).slice(0, 20)) {
  console.log(`  ${k}: ${v} units`);
}

// Same for 5%+ undercalculated
console.log('\n=== UNDERCALCULATED 5%+ UNRESOLVED EQUIPMENT ===');
const unresolvedBig: Record<string, number> = {};
for (const u of under5plus) {
  const unit = loadUnit(u.unitId);
  if (!unit) continue;
  for (const eq of (unit.equipment || [])) {
    const res = resolveEquipmentBV(eq.id);
    if (!res.resolved) {
      unresolvedBig[eq.id] = (unresolvedBig[eq.id] ?? 0) + 1;
    }
  }
}
for (const [k, v] of Object.entries(unresolvedBig).sort((a, b) => b[1] - a[1]).slice(0, 20)) {
  console.log(`  ${k}: ${v} units`);
}

// Also check overcalculated 2-5% for patterns
console.log('\n=== OVERCALCULATED 2-5% PATTERNS ===');
for (const u of over2to5.slice(0, 15)) {
  const unit = loadUnit(u.unitId);
  if (!unit) continue;
  const b = u.breakdown;
  const hasTSM = unit.criticalSlots && Object.values(unit.criticalSlots).some((slots: any) =>
    Array.isArray(slots) && slots.some((s: any) => s && typeof s === 'string' &&
      (s.toLowerCase() === 'tsm' || s.toLowerCase().includes('triple strength'))));
  const hasSmallCockpit = b?.cockpitModifier === 0.95;
  console.log(`  ${u.unitId.padEnd(45)} ${u.percentDiff > 0 ? '+' : ''}${u.percentDiff.toFixed(1)}%  diff=${u.difference}  tsm=${hasTSM ? 'Y' : 'N'}  smallCk=${hasSmallCockpit ? 'Y' : 'N'}  eng=${unit.engine?.type || '?'}`);
}
