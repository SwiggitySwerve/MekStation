#!/usr/bin/env npx tsx
import * as fs from 'fs';
import * as path from 'path';
import { resolveEquipmentBV, normalizeEquipmentId } from '../src/utils/construction/equipmentBVResolver';

// Replicate resolveWeaponForUnit from validate-bv.ts
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
  return isResult;
}

// Check the top undercalculated units
const index = JSON.parse(fs.readFileSync('public/data/units/battlemechs/index.json', 'utf-8'));
const topUnder = [
  'Prowler PWR-1X', 'Vixen 9', 'Preta C-PRT-OS Caelestis', 'Cougar X 3',
  'Ryoken III-XP Prime', 'Sojourner B', 'Parash 2', 'Cephalus Prime',
  'Shadow Cat II 2', 'Linebacker I', 'Nobori-nin G', 'Puma K',
];

for (const name of topUnder) {
  const parts = name.split(' ');
  const iu = index.units.find((u: any) => `${u.chassis} ${u.model}` === name);
  if (!iu) { console.log(`NOT FOUND: ${name}`); continue; }
  const fp = path.resolve('public/data/units/battlemechs', iu.path);
  const ud = JSON.parse(fs.readFileSync(fp, 'utf-8'));

  console.log(`\n=== ${name} (${ud.techBase}) ===`);
  let totalWeapBV = 0;
  for (const eq of ud.equipment) {
    const res = resolveWeaponForUnit(eq.id, ud.techBase);
    const isRes = resolveEquipmentBV(eq.id);
    const delta = res.battleValue !== isRes.battleValue ? ` (IS: ${isRes.battleValue})` : '';
    console.log(`  ${eq.id.padEnd(35)} BV=${res.battleValue} heat=${res.heat} resolved=${res.resolved}${delta}`);
    totalWeapBV += res.battleValue;
  }
  console.log(`  TOTAL weapon BV: ${totalWeapBV}`);
}
