/**
 * Trace undercalculated 1-2% units to find specific weapon/ammo BV gaps.
 * Focus on what equipment IDs aren't resolving correctly.
 */
import * as fs from 'fs';
import * as path from 'path';
import { resolveEquipmentBV, normalizeEquipmentId } from '../src/utils/construction/equipmentBVResolver';

const report = JSON.parse(fs.readFileSync('validation-output/bv-validation-report.json', 'utf8'));
const idx = JSON.parse(fs.readFileSync('public/data/units/battlemechs/index.json', 'utf8'));

function loadUnit(unitId: string): any {
  const ie = idx.units.find((e: any) => e.id === unitId);
  if (!ie?.path) return null;
  try { return JSON.parse(fs.readFileSync(path.join('public/data/units/battlemechs', ie.path), 'utf8')); } catch { return null; }
}

const valid = report.allResults.filter((x: any) => x.status !== 'error' && x.percentDiff !== null);
const under1to2 = valid.filter((x: any) => x.percentDiff >= -2 && x.percentDiff < -1 && x.breakdown);

// For each unit, find weapons that resolve to 0 BV or have suspiciously low BV
console.log(`=== UNDERCALCULATED 1-2%: ${under1to2.length} units ===\n`);

const unresolvedEquip: Record<string, { count: number; units: string[] }> = {};
const lowBVEquip: Record<string, { count: number; resolvedBV: number; units: string[] }> = {};

for (const u of under1to2) {
  const unit = loadUnit(u.unitId);
  if (!unit) continue;

  for (const eq of unit.equipment || []) {
    const res = resolveEquipmentBV(eq.id);
    if (res.battleValue === 0 && !eq.id.toLowerCase().includes('ammo') && !eq.id.toLowerCase().includes('case') &&
        !eq.id.toLowerCase().includes('heat-sink') && !eq.id.toLowerCase().includes('jump-jet') &&
        !eq.id.toLowerCase().includes('targeting-computer') && !eq.id.toLowerCase().includes('tsm')) {
      const key = eq.id;
      if (!unresolvedEquip[key]) unresolvedEquip[key] = { count: 0, units: [] };
      unresolvedEquip[key].count++;
      if (!unresolvedEquip[key].units.includes(u.unitId)) unresolvedEquip[key].units.push(u.unitId);
    }
  }
}

console.log('UNRESOLVED EQUIPMENT (BV=0):');
for (const [id, info] of Object.entries(unresolvedEquip).sort((a, b) => b[1].count - a[1].count)) {
  console.log(`  ${id.padEnd(45)} count=${info.count} units=${info.units.length}`);
  if (info.units.length <= 5) {
    console.log(`    units: ${info.units.join(', ')}`);
  }
}

// Check for crit-only weapons (in crits but not in equipment)
console.log('\n=== CRIT-ONLY WEAPONS ===');
const critOnlyWeapons: Record<string, { count: number; bv: number }> = {};
for (const u of under1to2) {
  const unit = loadUnit(u.unitId);
  if (!unit?.criticalSlots) continue;

  const equipIds = new Set((unit.equipment || []).map((eq: any) => normalizeEquipmentId(eq.id)));

  for (const [loc, slots] of Object.entries(unit.criticalSlots)) {
    if (!Array.isArray(slots)) continue;
    for (const s of slots) {
      if (!s || typeof s !== 'string') continue;
      const clean = (s as string).replace(/\s*\(omnipod\)/gi, '').replace(/\s*\(R\)/gi, '').trim();
      const lo = clean.toLowerCase();
      // Skip non-weapon entries
      if (lo.includes('ammo') || lo.includes('heat sink') || lo.includes('endo') ||
          lo.includes('ferro') || lo.includes('engine') || lo.includes('gyro') ||
          lo.includes('actuator') || lo.includes('life support') || lo.includes('sensor') ||
          lo.includes('cockpit') || lo.includes('case') || lo.includes('jump jet') ||
          lo.includes('targeting computer') || lo.includes('tsm') || lo.includes('masc') ||
          lo.includes('supercharger') || lo.includes('ecm') || lo.includes('bap') ||
          lo.includes('beagle') || lo.includes('active probe') || lo.includes('c3') ||
          lo.includes('shoulder') || lo.includes('hip') || lo.includes('foot') ||
          lo.includes('null sig') || lo.includes('void') || lo.includes('chameleon') ||
          lo.includes('stealth') || lo.includes('partial wing') || lo.includes('cews') ||
          lo.includes('watchdog') || lo.includes('angel') || lo.includes('armor') ||
          lo.includes('structure')) continue;

      const norm = normalizeEquipmentId(clean);
      if (equipIds.has(norm)) continue;

      const res = resolveEquipmentBV(clean);
      if (res.battleValue > 0) {
        const key = clean;
        if (!critOnlyWeapons[key]) critOnlyWeapons[key] = { count: 0, bv: res.battleValue };
        critOnlyWeapons[key].count++;
      }
    }
  }
}

for (const [name, info] of Object.entries(critOnlyWeapons).sort((a, b) => b[1].count - a[1].count).slice(0, 20)) {
  console.log(`  ${name.padEnd(40)} count=${info.count} bv=${info.bv}`);
}

// Check ammo BV: what ammo types are resolving to 0?
console.log('\n=== UNRESOLVED AMMO ===');
const unresolvedAmmo: Record<string, number> = {};
for (const u of under1to2) {
  const unit = loadUnit(u.unitId);
  if (!unit?.criticalSlots) continue;

  for (const [loc, slots] of Object.entries(unit.criticalSlots)) {
    if (!Array.isArray(slots)) continue;
    for (const s of slots) {
      if (!s || typeof s !== 'string') continue;
      const lo = (s as string).toLowerCase();
      if (!lo.includes('ammo')) continue;
      const res = resolveEquipmentBV(s as string);
      if (res.battleValue === 0) {
        unresolvedAmmo[s as string] = (unresolvedAmmo[s as string] || 0) + 1;
      }
    }
  }
}
for (const [name, count] of Object.entries(unresolvedAmmo).sort((a, b) => b[1] - a[1]).slice(0, 20)) {
  console.log(`  ${name.padEnd(50)} count=${count}`);
}

// Show top 15 units with their specific gap breakdown
console.log('\n=== TOP 15 UNITS BY ABSOLUTE GAP ===');
const sorted = [...under1to2].sort((a: any, b: any) => a.difference - b.difference);
for (const u of sorted.slice(0, 15)) {
  const unit = loadUnit(u.unitId);
  if (!unit) continue;
  const b = u.breakdown;
  const cockpit = b.cockpitModifier ?? 1;
  const refBase = u.indexBV / cockpit;
  const baseOff = (b.weaponBV ?? 0) + (b.ammoBV ?? 0) + (b.weightBonus ?? 0) + (b.physicalWeaponBV ?? 0) + (b.offEquipBV ?? 0);
  const neededBaseOff = (refBase - b.defensiveBV) / b.speedFactor;
  const gap = neededBaseOff - baseOff;

  // Find unresolved weapons
  const unresolved: string[] = [];
  for (const eq of unit.equipment || []) {
    const res = resolveEquipmentBV(eq.id);
    if (res.battleValue === 0 && !eq.id.toLowerCase().includes('ammo') && !eq.id.toLowerCase().includes('case') &&
        !eq.id.toLowerCase().includes('heat-sink') && !eq.id.toLowerCase().includes('jump-jet') &&
        !eq.id.toLowerCase().includes('targeting-computer') && !eq.id.toLowerCase().includes('tsm')) {
      unresolved.push(eq.id);
    }
  }

  console.log(`  ${u.unitId.padEnd(40)} diff=${u.difference} (${u.percentDiff.toFixed(1)}%) baseGap=${gap.toFixed(0)} tech=${unit.techBase}`);
  if (unresolved.length > 0) {
    console.log(`    UNRESOLVED: ${unresolved.join(', ')}`);
  }
}
