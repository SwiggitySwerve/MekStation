import type { IMountedEquipmentInstance } from '@/types/equipment/MountedEquipment';

import { createNewUnitStore } from '@/stores/unit/useUnitStore';
import { hydrateOrCreateUnit } from '@/stores/unitStoreRegistry';
import { MechLocation as L } from '@/types/construction';
import { TechBase } from '@/types/enums/TechBase';
import { EquipmentCategory } from '@/types/equipment';
import {
  compactEquipmentSlots,
  sortEquipmentBySize,
} from '@/utils/construction/slotOperations';

const cannon: IMountedEquipmentInstance = {
  instanceId: 'cannon',
  equipmentId: 'ac-20',
  name: 'AC/20',
  category: EquipmentCategory.BALLISTIC_WEAPON,
  weight: 14,
  criticalSlots: 10,
  heat: 7,
  techBase: TechBase.INNER_SPHERE,
  location: L.LEFT_TORSO,
  slots: [0, 1],
  splitSlots: { location: L.LEFT_ARM, slots: [4, 5, 6, 7, 8, 9, 10, 11] },
  isRearMounted: false,
  isRemovable: true,
  isOmniPodMounted: true,
};
const createStore = () => {
  const store = createNewUnitStore({
    name: 'Split allocation',
    tonnage: 100,
    techBase: TechBase.INNER_SPHERE,
  });
  store.setState({ equipment: [cannon], isModified: false });
  return store;
};

it('unassigns every part of one split mount', () => {
  const store = createStore();
  store.getState().clearEquipmentLocation(cannon.instanceId);
  expect(store.getState().equipment[0]).toMatchObject({
    location: undefined,
    slots: undefined,
    splitSlots: undefined,
  });
});

it('clears the former secondary part when moving into one location', () => {
  const store = createStore();
  store
    .getState()
    .updateEquipmentLocation(
      cannon.instanceId,
      L.RIGHT_TORSO,
      [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
    );
  expect(store.getState().equipment[0].splitSlots).toBeUndefined();
});

it('applies both parts atomically and keeps them through draft rehydration', () => {
  const store = createStore();
  store.getState().clearEquipmentLocation(cannon.instanceId);
  store
    .getState()
    .updateEquipmentLocation(
      cannon.instanceId,
      cannon.location!,
      cannon.slots!,
      cannon.splitSlots,
    );
  expect(store.getState().equipment[0]).toEqual(cannon);
  const reopened = hydrateOrCreateUnit(store.getState().id, {
    id: store.getState().id,
    name: 'Reopened',
    tonnage: 100,
    techBase: TechBase.INNER_SPHERE,
  });
  expect(reopened.getState().equipment).toEqual([cannon]);
});

it('reserves the secondary portion of a fixed Omni mount', () => {
  const store = createStore();
  const fixed = { ...cannon, isOmniPodMounted: false };
  const pod = {
    ...cannon,
    instanceId: 'pod',
    location: undefined,
    slots: undefined,
    splitSlots: undefined,
    criticalSlots: 1,
  };
  store.setState({ isOmni: true, equipment: [fixed, pod], isModified: false });
  store.getState().updateEquipmentLocation(pod.instanceId, L.LEFT_ARM, [4]);
  expect(store.getState().equipment).toEqual([fixed, pod]);
  expect(store.getState().isModified).toBe(false);
});

it.each([compactEquipmentSlots, sortEquipmentBySize])(
  'organizes a split mount without losing either part (%p)',
  (organize) => {
    const store = createStore();
    const before = store.getState();
    const result = organize(
      before.equipment,
      before.engineType,
      before.gyroType,
      before.configuration,
    );
    expect(result.unassigned).toEqual([]);
    before.bulkUpdateEquipmentLocations(result.assignments);
    expect(store.getState().equipment[0]).toEqual(cannon);
  },
);

it('keeps the original layout when one portion cannot be organized', () => {
  const store = createStore();
  const invalid = {
    ...cannon,
    slots: [1, 2],
    splitSlots: { location: L.LEFT_ARM, slots: [3, 4, 5, 6, 7, 8, 9, 10, 11] },
  };
  const neighbor = {
    ...cannon,
    instanceId: 'neighbor',
    criticalSlots: 1,
    slots: [3],
    splitSlots: undefined,
  };
  store.setState({ equipment: [invalid, neighbor] });
  const before = store.getState();
  const result = compactEquipmentSlots(
    before.equipment,
    before.engineType,
    before.gyroType,
    before.configuration,
  );
  before.bulkUpdateEquipmentLocations(result.assignments);
  expect(store.getState().equipment).toEqual([invalid, neighbor]);
});
