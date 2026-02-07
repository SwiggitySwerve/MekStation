#!/usr/bin/env npx tsx
import { resolveAmmoBV, normalizeEquipmentId } from '../src/utils/construction/equipmentBVResolver';

// Test ammo resolution for the failing names
const tests = [
  'IS Improved Heavy Gauss Rifle Ammo',
  'Hyper-Assault Gauss Rifle/30 Ammo (OMNIPOD)',
  'ISPlasmaRifle Ammo',
  'ISPlasmaRifleAmmo',
  'ISPlasmaRifleAmmo (omnipod)',
  'CLPlasmaCannonAmmo (OMNIPOD)',
  'HAG/20 Ammo (omnipod)',
  'HAG/20 Ammo',
  'ISArrowIVAmmo',
  'ISArrowIV Ammo',
  'CLArrowIVAmmo',
  'CLArrowIVHomingAmmo',
  'ISArrowIV Homing Ammo',
  'Taser Ammo',
  'ISStreakSRM6 Ammo',
  'ISStreakSRM4 Ammo',
  'ISFluidGun Ammo',
  'Silver Bullet Gauss Ammo',
  'Clan Streak LRM 20 Ammo (omnipod)',
  'Clan Ammo SRTorpedo-6 (omnipod)',
  'IS Ammo LRTorpedo-15 Artemis-capable (omnipod)',
  'IS Ammo LRTorpedo-10 Artemis-capable (omnipod)',
  'IS Ammo SRTorpedo-4 Artemis-capable (omnipod)',
  'ISImprovedHeavyGauss Ammo',
  'Hyper-Assault Gauss Rifle/20 Ammo',
  'Hyper-Assault Gauss Rifle/40 Ammo',
];

for (const name of tests) {
  const result = resolveAmmoBV(name);
  const norm = normalizeEquipmentId(name);
  console.log(`"${name}"`);
  console.log(`  normalizeId: "${norm}"`);
  console.log(`  resolveAmmoBV: bv=${result.battleValue}, weaponType="${result.weaponType}", resolved=${result.resolved}`);
  console.log();
}
