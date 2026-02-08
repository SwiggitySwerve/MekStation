#!/usr/bin/env npx tsx
import * as fs from 'fs';
import * as path from 'path';
import { resolveAmmoBV, normalizeEquipmentId } from '../src/utils/construction/equipmentBVResolver';

const testAmmos = [
  'IS Ammo MML-7 SRM',
  'IS Ammo MML-7 LRM', 
  'ISRotaryAC2 Ammo',
  'ISLBXAC5 CL Ammo',
  'CLMediumChemLaserAmmo',
  'Taser Ammo',
  'ISMagshotGR Ammo',
  'Clan Heavy Machine Gun Ammo - Half',
  'ISLRT15 Ammo',
  'ISSRT4 Ammo',
  'ISSniperCannonAmmo',
  'ISAMS Ammo',
];

for (const ammo of testAmmos) {
  const norm = normalizeEquipmentId(ammo);
  const res = resolveAmmoBV(ammo);
  console.log(`${ammo.padEnd(45)} norm=${norm.padEnd(30)} bv=${res.battleValue} resolved=${res.resolved} weaponType=${res.weaponType}`);
}
