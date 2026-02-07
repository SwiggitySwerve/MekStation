/**
 * Trace undercalculated 1-2% units to find systematic patterns.
 * Group by cause: unresolved weapons, wrong Clan detection, halving, etc.
 */
import * as fs from 'fs';
import * as path from 'path';
import { resolveEquipmentBV, normalizeEquipmentId, resolveAmmoBV } from '../src/utils/construction/equipmentBVResolver';

const report = JSON.parse(fs.readFileSync('validation-output/bv-validation-report.json', 'utf8'));
const idx = JSON.parse(fs.readFileSync('public/data/units/battlemechs/index.json', 'utf8'));

function loadUnit(unitId: string): any {
  const ie = idx.units.find((e: any) => e.id === unitId);
  if (!ie?.path) return null;
  try { return JSON.parse(fs.readFileSync(path.join('public/data/units/battlemechs', ie.path), 'utf8')); } catch { return null; }
}

const valid = report.allResults.filter((x: any) => x.status !== 'error' && x.percentDiff !== null);
const under1to2 = valid.filter((x: any) => x.percentDiff < -1 && x.percentDiff >= -2 && x.breakdown);
const under2to5 = valid.filter((x: any) => x.percentDiff < -2 && x.percentDiff >= -5 && x.breakdown);

console.log(`=== UNDERCALCULATED 1-2% (${under1to2.length} units) ===\n`);

for (const u of under1to2.sort((a: any, b: any) => a.percentDiff - b.percentDiff).slice(0, 30)) {
  const unit = loadUnit(u.unitId);
  if (!unit) continue;
  const b = u.breakdown;
  const cockpit = b.cockpitModifier ?? 1;
  const refBase = u.indexBV / cockpit;
  const defNeeded = refBase - b.offensiveBV;
  const offNeeded = refBase - b.defensiveBV;
  const defDiff = b.defensiveBV - defNeeded;
  const offDiff = b.offensiveBV - offNeeded;

  // Check for unresolved weapons
  const unresolved: string[] = [];
  const clanWeapons: string[] = [];
  for (const eq of (unit.equipment || [])) {
    const res = resolveEquipmentBV(eq.id);
    if (!res.resolved) unresolved.push(eq.id);
    // Check if this weapon resolves differently with clan prefix
    if (unit.techBase === 'MIXED' || unit.techBase === 'CLAN') {
      const clanId = 'clan-' + eq.id;
      const clanRes = resolveEquipmentBV(clanId);
      if (clanRes.resolved && clanRes.battleValue !== res.battleValue) {
        clanWeapons.push(`${eq.id}(is=${res.battleValue} clan=${clanRes.battleValue})`);
      }
    }
  }

  // Check if ammo resolves
  let unresolvedAmmo: string[] = [];
  // Scan crit slots for ammo
  for (const [loc, slots] of Object.entries(unit.criticalSlots || {})) {
    if (!Array.isArray(slots)) continue;
    for (const s of slots as string[]) {
      if (!s || typeof s !== 'string') continue;
      const lo = s.toLowerCase();
      if (lo.includes('ammo') && !lo.includes('case')) {
        const res = resolveAmmoBV(s.replace(/\s*\(omnipod\)/gi, '').trim());
        if (!res.resolved) unresolvedAmmo.push(s.replace(/\s*\(omnipod\)/gi, '').trim());
      }
    }
  }
  unresolvedAmmo = [...new Set(unresolvedAmmo)];

  const side = defDiff < offDiff ? 'DEF-LOW' : 'OFF-LOW';
  console.log(`${u.unitId.padEnd(45)} ${u.percentDiff.toFixed(1)}% diff=${u.difference} ${side} defD=${defDiff.toFixed(0)} offD=${offDiff.toFixed(0)} tech=${unit.techBase} halved=${b.halvedWeaponCount}/${b.weaponCount}`);
  if (unresolved.length > 0) console.log(`  UNRESOLVED: ${unresolved.join(', ')}`);
  if (clanWeapons.length > 0) console.log(`  CLAN-DIFF: ${clanWeapons.join(', ')}`);
  if (unresolvedAmmo.length > 0) console.log(`  UNRESOLVED-AMMO: ${unresolvedAmmo.join(', ')}`);
}

// Also check undercalculated 2-5% for the same patterns
console.log(`\n=== UNDERCALCULATED 2-5% (${under2to5.length} units) ===\n`);

for (const u of under2to5.sort((a: any, b: any) => a.percentDiff - b.percentDiff).slice(0, 30)) {
  const unit = loadUnit(u.unitId);
  if (!unit) continue;
  const b = u.breakdown;
  const cockpit = b.cockpitModifier ?? 1;
  const refBase = u.indexBV / cockpit;
  const defNeeded = refBase - b.offensiveBV;
  const offNeeded = refBase - b.defensiveBV;
  const defDiff = b.defensiveBV - defNeeded;
  const offDiff = b.offensiveBV - offNeeded;

  const unresolved: string[] = [];
  for (const eq of (unit.equipment || [])) {
    const res = resolveEquipmentBV(eq.id);
    if (!res.resolved) unresolved.push(eq.id);
  }

  let unresolvedAmmo: string[] = [];
  for (const [loc, slots] of Object.entries(unit.criticalSlots || {})) {
    if (!Array.isArray(slots)) continue;
    for (const s of slots as string[]) {
      if (!s || typeof s !== 'string') continue;
      const lo = s.toLowerCase();
      if (lo.includes('ammo') && !lo.includes('case')) {
        const res = resolveAmmoBV(s.replace(/\s*\(omnipod\)/gi, '').trim());
        if (!res.resolved) unresolvedAmmo.push(s.replace(/\s*\(omnipod\)/gi, '').trim());
      }
    }
  }
  unresolvedAmmo = [...new Set(unresolvedAmmo)];

  const side = defDiff < offDiff ? 'DEF-LOW' : 'OFF-LOW';
  console.log(`${u.unitId.padEnd(45)} ${u.percentDiff.toFixed(1)}% diff=${u.difference} ${side} tech=${unit.techBase} halved=${b.halvedWeaponCount}/${b.weaponCount}`);
  if (unresolved.length > 0) console.log(`  UNRESOLVED: ${unresolved.join(', ')}`);
  if (unresolvedAmmo.length > 0) console.log(`  UNRESOLVED-AMMO: ${unresolvedAmmo.join(', ')}`);
}
