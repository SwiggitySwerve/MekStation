import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { getEquipmentLookupService } from '@/services/equipment/EquipmentLookupService';
import { getEquipmentRegistry } from '@/services/equipment/EquipmentRegistry';
import { TechBaseMode } from '@/types/construction/TechBaseConfiguration';
import { TechBase } from '@/types/enums/TechBase';
import { getEquipmentSlotIssues } from '@/utils/construction/slotOperations/placement';

import { resolveEquipmentId } from '../equipmentResolution';
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

// FU-101 mortar classes. MegaMek 48fcb2f6: Clan Mech Mortar-8 is 5 t / 3 slots
// and Clan Mech Mortar-4 3.5 t / 2 slots. Crossbow D's list id reached a stale
// 10 t / 5 slot record; Antlion LK-3D's crit token "Clan Mech Mortar-4"
// resolved to nothing, and its record was 5 t / 3 slots.
it.each([
  ['4-clan-invasion/experimental/Crossbow D', 'clan-mech-mortar-8-registry', 5],
  ['6-dark-age/standard/Antlion LK-3D', 'clan-mech-mortar-4', 3.5],
])('%s mounts %s on its crit slots at Java’s %d t', (path, id, tons) => {
  const state = new UnitLoaderService().mapToUnitState(
    JSON.parse(
      readFileSync(
        join(process.cwd(), 'public/data/units/battlemechs', `${path}.json`),
        'utf8',
      ),
    ),
    true,
  );
  const mounts = state.equipment.filter((item) => item.equipmentId === id);
  expect(mounts.length).toBeGreaterThan(0);
  expect(mounts.every((item) => (item.slots?.length ?? 0) > 0)).toBe(true);
  expect(getEquipmentLookupService().getById(id)?.weight).toBe(tons);
  expect(
    getEquipmentSlotIssues(
      state.equipment,
      state.configuration,
      state.engineType,
      state.gyroType,
      state.armActuators,
      state.cockpitType,
    )
      .map((issue) => issue.message)
      .filter((message) => /Mortar/i.test(message)),
  ).toEqual([]);
});

// Native vehicle lists carry the exact Java internal name. `IS Mech Mortar-8`
// (ISMekMortar8.java: 10 t, 5 slots; 48fcb2f64) normalized to "is mech mortar" and
// resolved to nothing, so Mortar Carrier's mounts had no mass. IS Mech Mortar-4 has
// the same gap, but only owner-excluded `ge` sources use it. The registry ids for
// IS -1 and -2 and the Clan -4 and -8 records keep resolving as before.
it.each([
  [
    'IS Mech Mortar-8',
    TechBase.INNER_SPHERE,
    TechBaseMode.INNER_SPHERE,
    'mech-mortar-8',
    10,
  ],
  ['IS Mech Mortar-8', TechBase.CLAN, TechBaseMode.CLAN, 'mech-mortar-8', 10],
  [
    'IS Mech Mortar-1',
    TechBase.INNER_SPHERE,
    TechBaseMode.INNER_SPHERE,
    'is-mech-mortar-1-registry',
    2,
  ],
  [
    'IS Mech Mortar-2',
    TechBase.INNER_SPHERE,
    TechBaseMode.INNER_SPHERE,
    'is-mech-mortar-2-registry',
    5,
  ],
  [
    'Clan Mech Mortar-4',
    TechBase.CLAN,
    TechBaseMode.CLAN,
    'clan-mech-mortar-4',
    3.5,
  ],
  [
    'Clan Mech Mortar-8',
    TechBase.CLAN,
    TechBaseMode.CLAN,
    'clan-mech-mortar-8-registry',
    5,
  ],
])(
  'resolves native name %s on a %s unit (%s mode) to %s at Java’s %d t',
  (name, techBase, mode, id, tons) => {
    const { equipmentDef } = resolveEquipmentId(
      name,
      techBase,
      mode,
      undefined,
      name,
    );
    expect(equipmentDef?.id).toBe(id);
    expect(equipmentDef?.weight).toBe(tons);
  },
);
