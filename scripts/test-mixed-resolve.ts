#!/usr/bin/env npx tsx
import { resolveEquipmentBV, normalizeEquipmentId } from '../src/utils/construction/equipmentBVResolver';

function resolveWeaponForUnit(id: string, techBase: string, isClanEquip?: boolean): { battleValue: number; heat: number; resolved: boolean } {
  const lo = id.toLowerCase().replace(/^\d+-/, '');
  const isResult = resolveEquipmentBV(id);
  if (techBase === 'CLAN' || isClanEquip || (techBase === 'MIXED' && (lo.startsWith('clan-') || lo.startsWith('cl-') || lo.startsWith('cl ')))) {
    const normalizedIS = normalizeEquipmentId(lo);
    const candidates: string[] = [];
    if (!normalizedIS.startsWith('clan-')) candidates.push('clan-' + normalizedIS);
    if (!lo.startsWith('clan-') && lo !== normalizedIS) candidates.push('clan-' + lo);
    for (const cid of candidates) {
      const cr = resolveEquipmentBV(cid);
      if (cr.resolved && cr.battleValue > 0) {
        if (!isResult.resolved || cr.battleValue > isResult.battleValue) return cr;
        if (isResult.battleValue === cr.battleValue) return cr;
      }
    }
  }
  if (isResult.resolved && isResult.battleValue > 0) return isResult;
  const stripped = id.replace(/^\d+-/, '');
  if (stripped !== id) { const sr = resolveEquipmentBV(stripped); if (sr.resolved && sr.battleValue > 0) return sr; }
  // For MIXED units: if IS resolution failed, try Clan resolution as fallback
  if (techBase === 'MIXED' && (!isResult.resolved || isResult.battleValue === 0)) {
    const normalizedIS2 = normalizeEquipmentId(lo);
    const clanCandidates: string[] = [];
    if (!normalizedIS2.startsWith('clan-')) clanCandidates.push('clan-' + normalizedIS2);
    if (!lo.startsWith('clan-') && lo !== normalizedIS2) clanCandidates.push('clan-' + lo);
    console.log(`  MIXED fallback for ${id}: candidates=${JSON.stringify(clanCandidates)}`);
    for (const cid of clanCandidates) {
      const cr = resolveEquipmentBV(cid);
      console.log(`    ${cid} -> BV=${cr.battleValue} resolved=${cr.resolved}`);
      if (cr.resolved && cr.battleValue > 0) return cr;
    }
  }
  return isResult;
}

// Test MIXED units
const weapons = ['er-medium-pulse-laser', 'er-large-pulse-laser', 'er-small-pulse-laser'];
console.log('=== MIXED techBase ===');
for (const w of weapons) {
  const res = resolveWeaponForUnit(w, 'MIXED');
  console.log(`${w.padEnd(30)} BV=${res.battleValue} resolved=${res.resolved}`);
}

console.log('\n=== CLAN techBase ===');
for (const w of weapons) {
  const res = resolveWeaponForUnit(w, 'CLAN');
  console.log(`${w.padEnd(30)} BV=${res.battleValue} resolved=${res.resolved}`);
}
