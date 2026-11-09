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
