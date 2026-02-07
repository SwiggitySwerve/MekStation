#!/usr/bin/env npx tsx
import { resolveEquipmentBV, normalizeEquipmentId } from '../src/utils/construction/equipmentBVResolver';

console.warn = () => {};

function resolveWeaponForUnit(id: string, techBase: string): { battleValue: number; heat: number; resolved: boolean } {
  const lo = id.toLowerCase().replace(/^\d+-/, '');
  const isResult = resolveEquipmentBV(id);
  if (techBase === 'CLAN' || techBase === 'MIXED') {
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
  return isResult;
}

const weapons = [
  ['srm-2', 'CLAN'],
  ['er-small-laser', 'CLAN'],
  ['er-medium-laser', 'CLAN'],
  ['improved-heavy-medium-laser', 'CLAN'],
  ['srm-2', 'IS'],
  ['er-small-laser', 'IS'],
  ['er-medium-laser', 'IS'],
];

for (const [id, tech] of weapons) {
  const r = resolveWeaponForUnit(id, tech);
  console.log(`${id.padEnd(30)} [${tech}] → BV=${r.battleValue} heat=${r.heat} resolved=${r.resolved}`);
}
