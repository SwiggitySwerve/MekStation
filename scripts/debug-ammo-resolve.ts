#!/usr/bin/env npx tsx
import { resolveAmmoBV, normalizeEquipmentId } from '../src/utils/construction/equipmentBVResolver';

// Test how ammo names from criticalSlots resolve
const ammoNames = [
  'HAG/40 Ammo',
  'HAG/30 Ammo',
  'Clan Ultra AC/10 Ammo',
  'CLArrowIVAmmo',
  'CLArrowIVAmmo (OMNIPOD)',
  'CLArrowIVHomingAmmo',
  'CLArrowIVHomingAmmo (OMNIPOD)',
  'IS LB 10-X Cluster Ammo',
  'IS LB 10-X AC Ammo',
  'CLAMS Ammo',
  // These work - for reference
  'IS Ammo LRM-20',
  'Clan Ammo SRM-6',
  'IS Ammo AC/20',
  'Clan Streak SRM 4 Ammo',
  'IS Ultra AC/5 Ammo',
  'Clan Ultra AC/5 Ammo',
  'Clan Streak SRM 6 Ammo',
  // More failing types
  'IS Ammo LB 10-X',
  'IS LB 10-X AC Ammo',
  'IS Ammo LB 10-X Cluster',
  'CLERSmallLaser',  // not ammo, shouldn't resolve
  'Clan HAG 40 Ammo',
  'ISPrototypeLB10XACAmmo',
  'Clan Improved LRM 15 Ammo',
];

for (const name of ammoNames) {
  const clean = name.replace(/\s*\(omnipod\)/gi, '').replace(/\s*\((?:Clan|IS)\)\s*(?:Artemis(?:\s*V)?|Narc)-?[Cc]apable/gi, '').replace(/\s*(?:Artemis(?:\s*V)?|Narc)-?[Cc]apable/gi, '').replace(/\|.*/g, '').trim();
  const norm = normalizeEquipmentId(clean);
  const lo = clean.toLowerCase();
  const stripped = lo.replace(/\s*\((?:clan|is)\)\s*/g, '').replace(/\s*-\s*(?:full|half|proto)\s*$/g, '').replace(/\s*\(\d+\)\s*$/g, '').trim();

  const direct = resolveAmmoBV(clean);
  console.log(`${name.padEnd(40)} clean=${clean.padEnd(30)} norm=${norm.padEnd(25)} stripped=${stripped.padEnd(30)} directBV=${direct.battleValue}`);
}
