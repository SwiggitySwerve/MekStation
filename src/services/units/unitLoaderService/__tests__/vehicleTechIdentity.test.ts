import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { getEquipmentLookupService } from '@/services/equipment/EquipmentLookupService';
import { getEquipmentRegistry } from '@/services/equipment/EquipmentRegistry';

import { mapTechBase, mapTechBaseMode } from '../componentMappers';
import { mapVehicleEquipment } from '../vehicleMapping';

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

function mounts(file: string): Map<string, Set<string>> {
  const unit = JSON.parse(
    readFileSync(
      join(process.cwd(), 'public/data/units/vehicles', `${file}.json`),
      'utf8',
    ),
  );
  const techBase = unit.techBase ?? 'INNER_SPHERE';
  const mapped = mapVehicleEquipment(
    unit.equipment,
    mapTechBase(techBase),
    mapTechBaseMode(techBase),
    false,
  );
  const bySource = new Map<string, Set<string>>();
  mapped.forEach((mount, index) => {
    const source = unit.equipment[index].id as string;
    if (!bySource.has(source)) bySource.set(source, new Set());
    bySource.get(source)!.add(mount.equipmentId);
  });
  return bySource;
}

// Follow-up 93 for VEH-WEIGHT (demon-causes.md). The vehicle adapter passes no
// crit slots, so a mixed-tech unit's Clan list id fell back to the IS record.
// A native Clan name is one pinned MegaMek 48fcb2f6 item whatever the unit:
// CLLRM20.java:68 5 t, CLLRM15.java:68 3.5 t, CLLRM10.java:69 2.5 t,
// CLUAC10.java:67 10 t, CLUAC20.java:67 12 t, CLStreakSRM4 2 t, CLLightMG.java:71
// 0.25 t, CLERMediumLaser 1 t, CLTargeting Computer (variable).
it.each([
  ['Winston Combat Vehicle (Support)', 'cllrm20', 'clan-lrm-20'],
  ['Winston Combat Vehicle (TSEMP)', 'cllrm15', 'clan-lrm-15'],
  ['Winston Combat Vehicle (XXL)', 'cllrm15', 'clan-lrm-15'],
  ['SturmFeur Heavy Tank (Assault)', 'cllrm20', 'clan-lrm-20'],
  ['SturmFeur Heavy Tank (Assault)', 'cllrm10', 'clan-lrm-10'],
  ['SturmFeur Heavy Tank (Assault)', 'clermediumlaser', 'clan-er-medium-laser'],
  ['SturmFeur Heavy Tank (Cell)', 'cllrm20', 'clan-lrm-20'],
  ['Hunter Light Support Tank (Cell)', 'cllrm20', 'clan-lrm-20'],
  ['Demolisher II Heavy Tank II-X', 'clultraac10', 'clan-uac-10'],
  [
    'Chalchiuhtotolin Support Tank (Bombast Laser)',
    'cllightmg',
    'clan-light-machine-gun',
  ],
  [
    'Chalchiuhtotolin Support Tank (Bombast Laser)',
    'clstreaksrm4',
    'clan-streak-srm-4',
  ],
  [
    'Chalchiuhtotolin Support Tank (Bombast Laser)',
    'cltargeting-computer',
    'clan-targeting-computer',
  ],
  [
    'Chalchiuhtotolin Support Tank (Chemical Laser)',
    'cllightmg',
    'clan-light-machine-gun',
  ],
  [
    'Chalchiuhtotolin Support Tank (Chemical Laser)',
    'clstreaksrm4',
    'clan-streak-srm-4',
  ],
  [
    'Chalchiuhtotolin Support Tank (Chemical Laser)',
    'clermediumlaser',
    'clan-er-medium-laser',
  ],
  ['SM Tank Destroyer SM1B', 'clultraac20', 'clan-uac-20'],
  ['SM Tank Destroyer SM1B', 'cllightmg', 'clan-light-machine-gun'],
])('%s mounts %s as Java’s Clan item (%s)', (file, source, expected) => {
  expect([...(mounts(file).get(source) ?? [])]).toEqual([expected]);
});

it('keeps IS list ids on the same mixed-tech units on IS records', () => {
  // Winston (Support) also mounts IS SRM 4s, TAG and the Angel ECM.
  const winston = mounts('Winston Combat Vehicle (Support)');
  expect([...winston.get('srm-4')!]).toEqual(['srm-4']);
  expect([...winston.get('istag')!]).toEqual(['tag']);
  expect([...winston.get('isangelecmsuite')!]).toEqual(['angel-ecm']);
});

// Follow-up 93 (Clan LRM ammo identity, BV 27 vs 23): the BV owner resolves a
// vehicle's ammo bin to its pinned MegaMek 48fcb2f6 AmmoType record, but the
// loader took the legacy record of the same base (IS ammo-lrm-20 for Clan Ammo
// LRM-20), so a loaded unit carried another bin's BV and shots.
it.each([
  // AmmoType.java "Clan Ammo LRM-20": BV 27 (the IS bin is 23).
  [
    'Hunter Light Support Tank (Cell)',
    'clan-ammo-lrm-20',
    'clan-ammo-lrm-20-registry',
  ],
  // "CLRotaryAC5 Ammo": BV 43.
  [
    'Fury Command Tank (Fury III)',
    'clrotaryac5-ammo',
    'clrotaryac5-ammo-registry',
  ],
  // "Clan Ultra AC/10 Ammo".
  [
    'Demolisher II Heavy Tank II-X',
    'clan-ultra-ac-10-ammo',
    'clan-ultra-ac-10-ammo-registry',
  ],
  // "IS Streak SRM 2 Ammo": BV 4, 50 shots (the generic Streak bin is 17).
  [
    'Burke Defense Tank (Royal)',
    'is-streak-srm-2-ammo',
    'is-streak-srm-2-ammo-registry',
  ],
])('%s loads %s as the BV owner’s record (%s)', (file, source, expected) => {
  expect([...(mounts(file).get(source) ?? [])]).toEqual([expected]);
});
