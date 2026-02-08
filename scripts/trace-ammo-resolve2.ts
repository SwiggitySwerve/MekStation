#!/usr/bin/env npx tsx
/**
 * Trace exactly why top unresolved ammo types fail to resolve via both
 * resolveAmmoBV (catalog lookup) and resolveAmmoByPattern (regex).
 */
import * as fs from 'fs';
import * as path from 'path';
import { resolveAmmoBV } from '../src/utils/construction/equipmentBVResolver';

// Build ammo lookup (same as validator)
const ammoDir = path.resolve('public/data/equipment/official/ammo');
const ammoLookup = new Map<string, { bv: number; id: string }>();
try {
  for (const f of fs.readdirSync(ammoDir)) {
    if (!f.endsWith('.json')) continue;
    const d = JSON.parse(fs.readFileSync(path.join(ammoDir, f), 'utf8'));
    for (const item of (d.items || [])) {
      const norm = item.id.toLowerCase().replace(/[^a-z0-9]/g, '');
      ammoLookup.set(norm, { bv: item.battleValue, id: item.id });
    }
  }
} catch {}

function normalizeEquipmentId(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, '');
}

// Top failing ammo from the gap analysis
const testNames = [
  'IS Ammo SRM-6',
  'IS Ammo LRM-15',
  'ISPlasmaRifleAmmo',
  'Clan Gauss Ammo',
  'Clan Ammo LRM-15',
  'IS Ammo LRM-10',
  'ISRotaryAC5 Ammo',
  'Clan Streak SRM 6 Ammo',
  'Clan Ultra AC/10 Ammo',
  'ISAMS Ammo',
  'IS Ammo LRM-15 Artemis-capable',
  'IS Ammo AC/10',
  'IS Ammo AC/20',
  'CLMediumChemLaserAmmo',
  'HAG/20 Ammo',
  'CLAPGaussRifle Ammo',
  'ISHeavyGauss Ammo',
  'ISGauss Ammo',
  'IS Ammo MG - Full',
  'Clan LB 10-X AC Ammo',
  'Clan LB 10-X Cluster Ammo',
];

console.log('=== resolveAmmoBV Test (catalog lookup) ===');
for (const name of testNames) {
  const res = resolveAmmoBV(name);
  const norm = normalizeEquipmentId(name);
  const directLookup = ammoLookup.get(norm);
  console.log(`"${name}"  norm="${norm}"  catalog=${directLookup ? `bv=${directLookup.bv}(${directLookup.id})` : 'MISS'}  resolver=${res.resolved ? `bv=${res.battleValue}` : 'MISS'}`);
}

// Show all available ammo catalog normalized IDs for reference
console.log('\n=== All ammo catalog normalized IDs ===');
const sortedKeys = [...ammoLookup.keys()].sort();
for (const k of sortedKeys) {
  const e = ammoLookup.get(k)!;
  console.log(`  ${k} → bv=${e.bv} (${e.id})`);
}
