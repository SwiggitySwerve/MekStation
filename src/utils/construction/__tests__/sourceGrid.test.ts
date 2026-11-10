import { MechLocation } from '@/types/construction/CriticalSlotAllocation';

it('writes a mount into a missing source array with explicit empty cells', () => {
  expect(
    projectSourceGrid(
      { criticalSlots: {} },
      [],
      [
        {
          equipmentId: 'laser',
          name: 'Laser',
          location: MechLocation.LEFT_ARM,
          slots: [4],
        },
      ],
    ).criticalSlots.LEFT_ARM,
  ).toEqual([null, null, null, null, 'Laser']);
});

import { projectSourceGrid } from '../slotOperations/sourceGrid';

it('copies source-only criticals and keeps raw equipment when no mounts change', () => {
  const source = {
    criticalSlots: {
      HEAD: ['Life Support', null],
      LEFT_ARM: ['Native Laser (R)'],
    },
    equipment: [{ id: 'native-laser', location: 'LA (R)' }],
  };
  const mount = {
    instanceId: 'original',
    equipmentId: 'laser',
    location: 'Left Arm',
    slots: [0],
    isRearMounted: true,
  };
  const result = projectSourceGrid(source, [mount], [mount]);
  expect(result).toEqual({
    criticalSlots: source.criticalSlots,
    equipment: source.equipment,
  });
  expect(result.criticalSlots.HEAD).not.toBe(source.criticalSlots.HEAD);
});

it('matches unchanged designs independently of temporary instance ids', () => {
  const original = {
    instanceId: 'native',
    equipmentId: 'laser',
    location: 'Left Arm',
    slots: [0],
  };
  const source = {
    criticalSlots: { LEFT_ARM: ['ISMediumLaser (R)'] },
    equipment: [{ id: 'source-id', location: 'LA' }],
  };
  expect(
    projectSourceGrid(
      source,
      [original],
      [{ ...original, instanceId: 'equipment-0' }],
    ),
  ).toEqual({
    criticalSlots: source.criticalSlots,
    equipment: source.equipment,
  });
});

it.each(['remove', 'move', 'unassign'] as const)(
  'clears every old split and spread portion on %s',
  (action) => {
    const original = {
      instanceId: 'native',
      equipmentId: 'large-laser',
      name: 'Large Laser',
      location: MechLocation.LEFT_TORSO,
      slots: [0],
      splitSlots: { location: MechLocation.LEFT_ARM, slots: [4] },
      spreadSlots: [{ location: MechLocation.CENTER_TORSO, slots: [10] }],
    };
    const source = {
      criticalSlots: {
        LEFT_TORSO: ['Native'],
        LEFT_ARM: [null, null, null, null, 'Native'],
        CENTER_TORSO: [
          null,
          null,
          null,
          null,
          null,
          null,
          null,
          null,
          null,
          null,
          'Native',
        ],
      },
    };
    const live =
      action === 'remove'
        ? []
        : action === 'unassign'
          ? [
              {
                ...original,
                location: '',
                slots: undefined,
                splitSlots: undefined,
                spreadSlots: undefined,
              },
            ]
          : [
              {
                ...original,
                slots: [1],
                splitSlots: { location: MechLocation.LEFT_ARM, slots: [5] },
                spreadSlots: [
                  { location: MechLocation.CENTER_TORSO, slots: [11] },
                ],
              },
            ];
    const result = projectSourceGrid(source, [original], live).criticalSlots;
    expect(result.LEFT_TORSO[0]).toBeNull();
    expect(result.LEFT_ARM[4]).toBeNull();
    expect(result.CENTER_TORSO[10]).toBeNull();
    if (action === 'move') {
      expect(result.LEFT_TORSO[1]).toBe('Large Laser');
      expect(result.LEFT_ARM[5]).toBe('Large Laser');
      expect(result.CENTER_TORSO[11]).toBe('Large Laser');
    }
  },
);

it('clears all old mounts before inserting swapped allocations', () => {
  const a = {
    instanceId: 'a',
    equipmentId: 'a',
    name: 'A',
    location: 'Left Arm',
    slots: [4],
  };
  const b = {
    instanceId: 'b',
    equipmentId: 'b',
    name: 'B',
    location: 'Left Arm',
    slots: [5],
  };
  expect(
    projectSourceGrid(
      { criticalSlots: { LEFT_ARM: [null, null, null, null, 'A', 'B'] } },
      [a, b],
      [
        { ...a, slots: [5] },
        { ...b, slots: [4] },
      ],
    ).criticalSlots.LEFT_ARM.slice(4),
  ).toEqual(['B', 'A']);
});

it('clears a moved mount before adding it at the new allocation', () => {
  const mount = {
    instanceId: 'a',
    equipmentId: 'laser',
    name: 'Laser',
    location: 'Left Arm',
    slots: [4],
  };
  expect(
    projectSourceGrid(
      { criticalSlots: { LEFT_ARM: [null, null, null, null, 'Native Laser'] } },
      [mount],
      [{ ...mount, slots: [5] }],
    ).criticalSlots.LEFT_ARM,
  ).toEqual([null, null, null, null, null, 'Laser']);
});
