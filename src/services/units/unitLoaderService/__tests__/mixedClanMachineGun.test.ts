import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { getEquipmentLookupService } from '@/services/equipment/EquipmentLookupService';
import { getEquipmentRegistry } from '@/services/equipment/EquipmentRegistry';
import { MechLocation } from '@/types/construction/CriticalSlotAllocation';
import { createAmmoWeaponMatcher } from '@/utils/equipment/ammunitionCompatibility';

import { UnitLoaderService } from '../unitLoader';

jest.mock('@/services/equipment/EquipmentFileReader', () => ({
  readJsonFile: async (file: string) =>
    JSON.parse(
      readFileSync(
        join(process.cwd(), 'public/data/equipment/official', file),
        'utf8',
      ),
    ),
}));
beforeAll(async () => {
  await getEquipmentRegistry().initialize();
  await getEquipmentLookupService().initialize();
});

// Prometheus (mixed tech) lists six machine-gun over CLMG crits. MegaMek
// 48fcb2f6 CLMG is the Clan machine gun (CLMG.java:58,69: 0.25 t); the token
// loaded the IS record (0.5 t), so the list stayed IS and the mech ran 1.5 t
// heavy. List and crit now reach the Clan record together.
it('mounts Prometheus machine guns as Clan on their CLMG crits', () => {
  const state = new UnitLoaderService().mapToUnitState(
    JSON.parse(
      readFileSync(
        join(
          process.cwd(),
          'public/data/units/battlemechs/4-clan-invasion/standard/Prometheus Unknown.json',
        ),
        'utf8',
      ),
    ),
    true,
  );
  const guns = (location: MechLocation) =>
    state.equipment
      .filter(
        (item) =>
          item.location === location && /machine-gun/.test(item.equipmentId),
      )
      .map((item) => [item.equipmentId, item.weight, item.slots]);
  for (const location of [MechLocation.LEFT_TORSO, MechLocation.RIGHT_TORSO])
    expect(guns(location)).toEqual([
      ['clan-machine-gun', 0.25, [7]],
      ['clan-machine-gun', 0.25, [8]],
      ['clan-machine-gun', 0.25, [9]],
    ]);
});

// Minsk MNK-101 feeds its Clan machine guns from "Clan Machine Gun Ammo - Full",
// which loads ammo-mg-full. Java matches ammo to a weapon by ammo type and rack
// size (AmmoType.java:17147-17155): that bin is MG / rack 2 (AmmoType.java:
// 6626-6627), as are CLMG (MGWeapon.java:62, CLMG.java:64) and ISMG
// (ISMG.java:66). The full bin listed no weapons, so a Clan gun found no ammo.
it.each(['machine-gun', 'clan-machine-gun'])(
  'feeds %s from the full machine gun ammo bin',
  (weaponId) => {
    const catalog = getEquipmentLookupService().getAllEquipment();
    const bin = getEquipmentLookupService().getById('ammo-mg-full');
    expect(bin && createAmmoWeaponMatcher([weaponId], catalog)(bin)).toBe(true);
  },
);
