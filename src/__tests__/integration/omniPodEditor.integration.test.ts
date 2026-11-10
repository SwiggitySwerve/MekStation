import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { getEquipmentLookupService } from '@/services/equipment/EquipmentLookupService';
import { getEquipmentRegistry } from '@/services/equipment/EquipmentRegistry';
import { UnitLoaderService } from '@/services/units/unitLoaderService';
import {
  getUnitDraftFingerprint,
  getUnitLibraryFingerprint,
} from '@/stores/unit/unitEditSnapshot';
import { createUnitStore } from '@/stores/unit/useUnitStore';
import { MechLocation } from '@/types/construction/CriticalSlotAllocation';
import { Era } from '@/types/temporal/Era';
import {
  canChangeEquipmentMount,
  isFixedOmniEquipment,
} from '@/utils/construction/equipmentMutationPolicy';
import { serializeCustomUnitState } from '@/utils/serialization/CustomUnitSerializer';

import puma from '../../../public/data/units/battlemechs/3-succession-wars/advanced/Puma A.json';

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
  await getEquipmentLookupService().initialize();
  await getEquipmentRegistry().initialize();
});

// mm-data 50f7efe: meks/3050U/Puma (Adder) A.mtf, Config:Biped OmniMek.
// This is the phase-b declaration, without modifying the committed catalog.
// Pinned Java 48fcb2f64 probe: the represented set has eight pods and one fixed
// CLFlamer at CT:10. Jump jets/structure/armor remain separate discovery work.
const load = () =>
  new UnitLoaderService().mapToUnitState({ ...puma, isOmni: true }, true);

it('matches Java pod/fixed and editor lock sets for represented Puma A mounts', () => {
  const state = load();
  expect(state.equipment).toHaveLength(9);
  const fixed = state.equipment.filter((item) =>
    isFixedOmniEquipment(state.isOmni, item),
  );
  expect(
    fixed.map(({ equipmentId, location, slots }) => ({
      equipmentId,
      location,
      slots,
    })),
  ).toEqual([
    {
      equipmentId: 'clan-flamer',
      location: MechLocation.CENTER_TORSO,
      slots: [10],
    },
  ]);
  expect(state.equipment.filter((item) => item.isOmniPodMounted)).toHaveLength(
    8,
  );
  for (const item of state.equipment)
    expect(canChangeEquipmentMount(state.isOmni, item)).toBe(
      item.equipmentId !== 'clan-flamer',
    );
});

it.each(['remove', 'move', 'bulk', 'unassign', 'clear'] as const)(
  'enforces loaded Java fixed/pod flags for %s',
  (command) => {
    for (const pod of [false, true]) {
      const store = createUnitStore(load());
      const before = store.getState();
      const mount = before.equipment.find(
        (item) => item.isOmniPodMounted === pod,
      );
      if (!mount) throw Error(`Missing ${pod ? 'pod' : 'fixed'} Puma A mount`);
      switch (command) {
        case 'remove':
          before.removeEquipment(mount.instanceId);
          break;
        case 'move':
          before.updateEquipmentLocation(
            mount.instanceId,
            MechLocation.CENTER_TORSO,
            [0],
          );
          break;
        case 'bulk':
          before.bulkUpdateEquipmentLocations([
            {
              instanceId: mount.instanceId,
              location: MechLocation.CENTER_TORSO,
              slots: [0],
            },
          ]);
          break;
        case 'unassign':
          before.clearEquipmentLocation(mount.instanceId);
          break;
        case 'clear':
          before.clearAllEquipment();
          break;
      }
      const after = store.getState();
      const current = after.equipment.find(
        (item) => item.instanceId === mount.instanceId,
      );
      if (!pod) {
        expect(current).toEqual(mount);
        if (command !== 'clear') expect(after).toBe(before);
      } else if (command === 'remove' || command === 'clear')
        expect(current).toBeUndefined();
      else if (command === 'unassign')
        expect(current?.location).toBeUndefined();
      else
        expect(current).toMatchObject({
          location: MechLocation.CENTER_TORSO,
          slots: [0],
        });
      expect(
        after.equipment.find((item) => item.equipmentId === 'clan-flamer'),
      ).toEqual(
        before.equipment.find((item) => item.equipmentId === 'clan-flamer'),
      );
    }
  },
);

it('retains explicit true and false through custom save and cold reopen', () => {
  const before = load();
  const saved = serializeCustomUnitState(before, {
    id: 'puma-a-pods',
    chassis: before.chassis,
    variant: before.model,
    era: Era.CLAN_INVASION,
  });
  const reopened = new UnitLoaderService().mapToUnitState({ ...saved }, false);
  expect(reopened.equipment.map((item) => item.isOmniPodMounted)).toEqual(
    before.equipment.map((item) => item.isOmniPodMounted),
  );
  expect(
    reopened.equipment
      .filter((item) => isFixedOmniEquipment(reopened.isOmni, item))
      .map((item) => item.equipmentId),
  ).toEqual(['clan-flamer']);
  expect(getUnitDraftFingerprint(reopened)).toContain(
    '"isOmniPodMounted":true',
  );
  expect(getUnitLibraryFingerprint(reopened)).toContain(
    '"isOmniPodMounted":false',
  );
});
