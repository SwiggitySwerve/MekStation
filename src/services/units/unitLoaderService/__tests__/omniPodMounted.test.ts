import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { getEquipmentLookupService } from '@/services/equipment/EquipmentLookupService';
import { getEquipmentRegistry } from '@/services/equipment/EquipmentRegistry';
import { TechBaseMode } from '@/types/construction/TechBaseConfiguration';
import { TechBase } from '@/types/enums/TechBase';

import type { IRawSerializedUnit } from '../types';

import puma from '../../../../../public/data/units/battlemechs/3-succession-wars/advanced/Puma A.json';
import { restoreCriticalSlotEquipment } from '../criticalSlotEquipment';
import { parseCriticalSlotToken } from '../equipmentResolution';
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
  await getEquipmentLookupService().initialize();
  await getEquipmentRegistry().initialize();
});

it.each([
  ['ISMediumLaser (OMNIPOD)', true],
  ['ISMediumLaser (omnipod) (ARMORED)', true],
  ['ISMediumLaser', false],
  ['ISMediumLaser (R) (T) (OMNIPOD) (ARMORED)', true],
  ['ISMediumLaser (OMNIPOD) (R)', false],
  ['ISMediumLaser (OMNIPOD) extra', false],
  ['Cargo (OMNIPOD):SIZE:2', true],
  ['Cargo (OMNIPOD) (ARMORED):SIZE:2', false],
])('follows Java marker order for %s', (token, pod) => {
  expect(parseCriticalSlotToken(token)).toHaveProperty('isOmniPodMounted', pod);
});

const load = (
  equipment: IRawSerializedUnit['equipment'],
  criticalSlots?: IRawSerializedUnit['criticalSlots'],
  isOmni: boolean | undefined = true,
) =>
  new UnitLoaderService().mapToUnitState(
    {
      ...puma,
      techBase: 'INNER_SPHERE',
      tonnage: 50,
      equipment,
      criticalSlots,
      isOmni,
    },
    true,
  ).equipment;

it.each([
  ['medium-laser', 'ISMediumLaser', 1],
  ['autocannon-5', 'ISAC5', 4],
  ['lrm-5', 'ISLRM5', 1],
  ['beagle-active-probe', 'BeagleActiveProbe', 2],
  ['jump-jet', 'Jump Jet', 1],
] as const)('derives pod flags for listed %s mounts', (id, token, count) => {
  const items = load([{ id, location: 'LEFT_ARM' }], {
    LEFT_ARM: Array(count).fill(`${token} (OMNIPOD)`),
  });
  expect(items[0]).toMatchObject({ isOmniPodMounted: true });
});

it.each([true, false])(
  'preserves explicit saved %s against the opposite source marker',
  (pod) => {
    const [item] = load(
      [
        {
          id: 'medium-laser',
          location: 'LEFT_ARM',
          slots: [5],
          isOmniPodMounted: pod,
        },
      ],
      {
        LEFT_ARM: [
          null,
          null,
          null,
          null,
          null,
          `ISMediumLaser${pod ? '' : ' (OMNIPOD)'}`,
        ],
      },
    );
    expect(item.isOmniPodMounted).toBe(pod);
  },
);

it("uses each duplicate mount's reserved cells instead of its same-name neighbour", () => {
  const items = load(
    [
      { id: 'medium-laser', location: 'LEFT_ARM', slots: [1] },
      { id: 'medium-laser', location: 'LEFT_ARM', slots: [0] },
    ],
    { LEFT_ARM: ['ISMediumLaser (OMNIPOD)', 'ISMediumLaser'] },
  );
  expect(items.map((item) => item.isOmniPodMounted)).toEqual([false, true]);
});

it('keeps missing source evidence fixed, including unresolved and zero-slot items', () => {
  for (const criticalSlots of [undefined, { LEFT_ARM: [null] }]) {
    const items = load(
      [
        { id: 'medium-laser', location: 'LEFT_ARM' },
        { id: 'unknown-omni-item', location: 'Unallocated' },
      ],
      criticalSlots,
    );
    expect(items.map((item) => item.isOmniPodMounted)).toEqual([false, false]);
  }
});

it('recovers ammo and external heat-sink flags through the same mount metadata boundary', () => {
  const items = load([{ id: 'medium-laser', location: 'RIGHT_ARM' }], {
    RIGHT_ARM: ['ISMediumLaser'],
    LEFT_TORSO: [
      'IS Ammo AC/5 (OMNIPOD)',
      ...Array(3).fill('ISDoubleHeatSink (OMNIPOD)'),
    ],
  });
  const recovered = items.filter((item) => item.location === 'Left Torso');
  expect(recovered).toHaveLength(2);
  expect(recovered.every((item) => item.isOmniPodMounted)).toBe(true);
});

it('uses the last Java-visited slot for a split weapon rather than any pod token', () => {
  const items = load([{ id: 'ac-20', location: 'LEFT_TORSO' }], {
    LEFT_ARM: Array(6).fill('ISAC20 (OMNIPOD)'),
    LEFT_TORSO: Array(4).fill('ISAC20'),
  });
  expect(items).toHaveLength(1);
  expect(items[0].splitSlots).toBeDefined();
  expect(items[0].isOmniPodMounted).toBe(false);
});

it.each([undefined, false])(
  "retains today's non-Omni loading behavior for isOmni=%s",
  (isOmni) => {
    const equipment = [
      { id: 'medium-laser', location: 'LEFT_ARM' },
      { id: 'mace', location: 'RIGHT_ARM' },
    ];
    const grid = {
      LEFT_ARM: ['ISMediumLaser (OMNIPOD)'],
      RIGHT_ARM: Array(5).fill('Mace (OMNIPOD)'),
    };
    // TestEntity.java:1861-1882 validates pod flags on non-Omnis separately.
    // Existing physical recovery preserves its marker; ordinary mounts stay false.
    const items = new UnitLoaderService().mapToUnitState(
      {
        ...puma,
        techBase: 'INNER_SPHERE',
        tonnage: 50,
        equipment,
        criticalSlots: grid,
        isOmni,
      },
      true,
    ).equipment;
    expect(
      items.map(({ equipmentId, isOmniPodMounted }) => ({
        equipmentId,
        isOmniPodMounted,
      })),
    ).toEqual([
      { equipmentId: 'medium-laser', isOmniPodMounted: false },
      { equipmentId: 'mace', isOmniPodMounted: true },
    ]);
  },
);

it.each([
  ['single-heat-sink', 'Heat Sink', 1],
  ['double-heat-sink', 'ISDoubleHeatSink', 3],
  ['clan-double-heat-sink', 'CLDoubleHeatSink', 2],
  ['compact-heat-sink', 'ISCompactHeatSink', 1],
] as const)(
  'restores metadata on represented %s without changing mount discovery',
  (id, token, count) => {
    const slots = Array.from({ length: count }, (_, index) => index);
    const [item] = load([{ id, location: 'LEFT_TORSO', slots }], {
      LEFT_TORSO: Array(count).fill(`${token} (OMNIPOD)`),
    });
    expect(item.slots).toEqual(slots);
    expect(item.isOmniPodMounted).toBe(true);
  },
);

it('keeps direct empty-summary ammo recovery separate from the summary admission guard', () => {
  const items = restoreCriticalSlotEquipment(
    [],
    [],
    TechBase.INNER_SPHERE,
    TechBaseMode.INNER_SPHERE,
    { LEFT_TORSO: ['IS Ammo AC/5 (OMNIPOD)'] },
    50,
    false,
    true,
  );
  expect(items).toHaveLength(1);
  expect(items[0].isOmniPodMounted).toBe(true);
  expect(load([], { LEFT_TORSO: ['IS Ammo AC/5 (OMNIPOD)'] })).toEqual([]);
});

it('observes spreadable creation order rather than any pod-marked part', () => {
  const [item] = load([{ id: 'talons', location: 'LEFT_LEG' }], {
    RIGHT_LEG: ['Talons (OMNIPOD)', 'Talons (OMNIPOD)'],
    LEFT_LEG: ['Talons', 'Talons'],
  });
  expect(item.spreadSlots).toHaveLength(1);
  expect(item.isOmniPodMounted).toBe(false);
});

it('retains explicit reserved-cell metadata for an unresolved source identity', () => {
  const [item] = load(
    [{ id: 'unknown-omni-item', location: 'LEFT_ARM', slots: [0] }],
    { LEFT_ARM: ['Unknown Native Mount (OMNIPOD)'] },
  );
  expect(item.equipmentId).toBe('unknown-omni-item');
  expect(item.isOmniPodMounted).toBe(true);
});
