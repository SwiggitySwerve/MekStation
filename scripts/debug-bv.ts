#!/usr/bin/env npx tsx
import * as fs from 'fs';
import * as path from 'path';

// Reproduce the resolveAmmoBV function exactly as in validate-bv.ts
interface AmmoCatalogEntry { id: string; name: string; battleValue: number; compatibleWeaponIds: string[]; }
let ammoCatalog: AmmoCatalogEntry[] | null = null;
let ammoByName: Map<string, AmmoCatalogEntry> | null = null;

function loadAmmoCatalog(): AmmoCatalogEntry[] {
  if (ammoCatalog) return ammoCatalog;
  const ammoPath = path.resolve(process.cwd(), 'public/data/equipment/official/ammunition.json');
  const data = JSON.parse(fs.readFileSync(ammoPath, 'utf-8'));
  ammoCatalog = (data.items as AmmoCatalogEntry[]) || [];
  ammoByName = new Map();
  for (const entry of ammoCatalog) {
    ammoByName.set(entry.id, entry);
    ammoByName.set(entry.name.toLowerCase(), entry);
  }
  return ammoCatalog;
}

import { normalizeEquipmentId } from '../src/utils/construction/equipmentBVResolver';

function resolveAmmoBV(slotName: string): { bv: number; weaponType: string } {
  loadAmmoCatalog();
  const lower = slotName.toLowerCase();
  const cleaned = lower.replace(/\(omnipod\)/gi, '').replace(/\(armored\)/gi, '').replace(/^(is|clan|cl)\s+/, '').replace(/\s*-\s*half$/i, '').replace(/artemis[- ]?(?:iv|v)?[- ]?capable/gi, '').replace(/narc[- ]?capable/gi, '').replace(/\(clan\)/gi, '').trim();

  if (ammoByName!.has(cleaned)) { const e = ammoByName!.get(cleaned)!; return { bv: e.battleValue, weaponType: e.compatibleWeaponIds[0] || '' }; }

  let ammoId = '';
  let weaponType = '';

  if (lower.includes('lrm')) { const m = lower.match(/lrm[- ]?(\d+)/); if (m) { ammoId = `ammo-lrm-${m[1]}`; weaponType = lower.includes('clan') || lower.includes('cl ') ? `clan-lrm-${m[1]}` : `lrm-${m[1]}`; } }
  else if (lower.includes('srm') && lower.includes('streak')) { const m = lower.match(/srm[- ]?(\d+)/); if (m) { ammoId = `ammo-streak-srm-${m[1]}`; weaponType = lower.includes('clan') || lower.includes('cl ') ? `clan-streak-srm-${m[1]}` : `streak-srm-${m[1]}`; } }
  else if (lower.includes('srm')) { const m = lower.match(/srm[- ]?(\d+)/); if (m) { ammoId = `ammo-srm-${m[1]}`; weaponType = lower.includes('clan') || lower.includes('cl ') ? `clan-srm-${m[1]}` : `srm-${m[1]}`; } }
  else if (lower.includes('mml')) { const m = lower.match(/mml[- ]?(\d+)/); if (m) { ammoId = lower.includes('srm') ? `ammo-mml-${m[1]}-srm` : `ammo-mml-${m[1]}-lrm`; weaponType = `mml-${m[1]}`; } }
  else if (lower.includes('atm')) { const m = lower.match(/atm[- ]?(\d+)/); if (m) { ammoId = `ammo-atm-${m[1]}`; weaponType = `atm-${m[1]}`; } }
  // ... rest omitted for test

  if (ammoId && ammoByName!.has(ammoId)) { const e = ammoByName!.get(ammoId)!; return { bv: e.battleValue, weaponType: weaponType || (e.compatibleWeaponIds[0] || '') }; }

  // Try compatible weapon type lookup
  if (weaponType) {
    const normalizedWT = normalizeEquipmentId(weaponType);
    for (const entry of ammoCatalog!) {
      if (entry.compatibleWeaponIds.includes(normalizedWT) || entry.compatibleWeaponIds.includes(weaponType)) {
        return { bv: entry.battleValue, weaponType: normalizedWT };
      }
    }
    return { bv: 0, weaponType: normalizedWT };
  }

  return { bv: 0, weaponType: '' };
}

// Test
const tests = [
  'IS Ammo LRM-20',
  'Clan Ammo SRM-6',
  'IS Ammo AC/5',
  'IS Ammo LRM-15',
  'ISLRM20 Ammo',
  'ISSRM6 Ammo',
  'Clan Streak SRM 6 Ammo',
  'Clan Ammo ATM-9',
  'IS Ammo MML-9 LRM',
  'Clan Ultra AC/5 Ammo',
  'Clan Gauss Ammo',
  'CLPlasmaCannonAmmo',
  'ISRotaryAC2 Ammo',
  'ISLBXAC10 Ammo',
  'ISMML9 LRM Ammo',
];

for (const t of tests) {
  const r = resolveAmmoBV(t);
  console.log(`"${t}" => BV=${r.bv} weaponType="${r.weaponType}"`);
}
