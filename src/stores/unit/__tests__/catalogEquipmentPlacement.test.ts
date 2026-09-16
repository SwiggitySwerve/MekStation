import { MechLocation } from '@/types/construction';
import { MechConfiguration } from '@/types/construction/MechConfigurationSystem';
import { RulesLevel } from '@/types/enums/RulesLevel';
import { TechBase } from '@/types/enums/TechBase';
import { EquipmentCategory, type IEquipmentItem } from '@/types/equipment';
import { createMountedEquipment } from '@/types/equipment/MountedEquipment';
import { getEquipmentSlotIssues } from '@/utils/construction/slotOperations/placement';
import { getAvailableSlotIndices } from '@/utils/construction/slotOperations/queries';

import { previewCatalogEquipmentPlacement } from '../catalogEquipmentPlacement';
import { getUnitEditHistory } from '../unitEditHistory';
import { createNewUnitStore, createUnitStore } from '../useUnitStore';

/** @spec openspec/specs/equipment-browser/spec.md */
const laser: IEquipmentItem = {
  id: 'medium-laser',
  name: 'Medium Laser',
  category: EquipmentCategory.ENERGY_WEAPON,
  techBase: TechBase.INNER_SPHERE,
  rulesLevel: RulesLevel.STANDARD,
  weight: 1,
  criticalSlots: 1,
  costCBills: 40000,
  battleValue: 46,
  introductionYear: 2300,
};
const makeUnit = () =>
  createNewUnitStore({
    name: 'Placement test',
    tonnage: 50,
    techBase: TechBase.INNER_SPHERE,
  });
beforeEach(() => localStorage.clear());

it('previews without mutation, commits once and restores the same instance through undo/redo and draft recovery', () => {
  const unit = makeUnit(),
    history = getUnitEditHistory(unit),
    before = unit.getState();
  const preview = previewCatalogEquipmentPlacement(laser, before);
  expect(
    preview.locations.find(
      (option) => option.location === MechLocation.LEFT_ARM,
    )?.canFit,
  ).toBe(true);
  expect(unit.getState()).toBe(before);
  expect(history.getState().canUndo).toBe(false);
  const result = unit
    .getState()
    .addEquipmentAtLocation(laser, MechLocation.LEFT_ARM);
  expect(result.success).toBe(true);
  const mounted = unit.getState().equipment;
  expect(mounted).toHaveLength(before.equipment.length + 1);
  expect(mounted.at(-1)).toMatchObject({
    location: MechLocation.LEFT_ARM,
    slots: [4],
  });
  expect(
    getEquipmentSlotIssues(
      mounted,
      before.configuration,
      before.engineType,
      before.gyroType,
    ),
  ).toEqual([]);
  expect(history.getState().undoLabel).toBe('Add and place equipment');
  history.getState().undo();
  expect(unit.getState().equipment).toEqual(before.equipment);
  expect(history.getState().canUndo).toBe(false);
  history.getState().redo();
  expect(unit.getState().equipment).toEqual(mounted);
  const persisted = JSON.parse(
    localStorage.getItem(`megamek-unit-${before.id}`)!,
  ).state;
  const cold = createUnitStore({ ...unit.getState(), ...persisted });
  expect(cold.getState().equipment).toEqual(mounted);
});

it('uses the same variable calculations as Add and reports the resulting weight', () => {
  const item = {
    ...laser,
    id: 'hatchet',
    name: 'Hatchet',
    category: EquipmentCategory.PHYSICAL_WEAPON,
    variableEquipmentId: 'hatchet',
    weight: 0,
    criticalSlots: 0,
  };
  const unit = makeUnit(),
    reference = makeUnit();
  reference.getState().addEquipment(item);
  const expected = reference.getState().equipment.at(-1)!;
  const preview = previewCatalogEquipmentPlacement(item, unit.getState());
  expect(preview.equipment).toMatchObject({
    weight: expected.weight,
    criticalSlots: expected.criticalSlots,
  });
  expect(preview.weightChange).toBe(expected.weight);
  expect(expected.criticalSlots).toBeGreaterThan(0);
  expect(
    unit.getState().addEquipmentAtLocation(item, MechLocation.RIGHT_ARM)
      .success,
  ).toBe(true);
  expect(unit.getState().equipment.at(-1)).toMatchObject({
    weight: expected.weight,
    criticalSlots: expected.criticalSlots,
  });
});

it('rejects restricted and non-configuration locations without an edit or history entry', () => {
  const unit = makeUnit();
  const caseItem = {
    ...laser,
    id: 'case',
    name: 'CASE',
    category: EquipmentCategory.MISC_EQUIPMENT,
  };
  const before = unit.getState();
  expect(
    before.addEquipmentAtLocation(caseItem, MechLocation.HEAD),
  ).toMatchObject({ success: false, error: 'Restricted location' });
  expect(unit.getState()).toBe(before);
  unit.setState({ configuration: MechConfiguration.QUAD });
  const quad = unit.getState();
  expect(
    quad.addEquipmentAtLocation(laser, MechLocation.LEFT_ARM).success,
  ).toBe(false);
  expect(unit.getState()).toBe(quad);
  expect(getUnitEditHistory(unit).getState().canUndo).toBe(false);
});

it('revalidates occupied space at confirmation and preserves fixed OmniMech mounts', () => {
  const unit = makeUnit();
  expect(
    previewCatalogEquipmentPlacement(laser, unit.getState()).locations.find(
      (option) => option.location === MechLocation.LEFT_ARM,
    )?.canFit,
  ).toBe(true);
  const free = getAvailableSlotIndices(
    MechLocation.LEFT_ARM,
    unit.getState().engineType,
    unit.getState().gyroType,
    [],
  );
  const fixed = {
    ...createMountedEquipment(
      { ...laser, criticalSlots: free.length },
      'fixed',
    ),
    location: MechLocation.LEFT_ARM,
    slots: free,
  };
  unit.setState({ isOmni: true, equipment: [fixed], isModified: false });
  const before = unit.getState();
  expect(
    before.addEquipmentAtLocation(laser, MechLocation.LEFT_ARM),
  ).toMatchObject({ success: false, error: 'No contiguous space' });
  expect(unit.getState()).toBe(before);
  expect(unit.getState().equipment).toEqual([fixed]);
  expect(getUnitEditHistory(unit).getState().canUndo).toBe(false);
});

it('explains split allocation, read-only state and failed variable calculations without mutation', () => {
  const unit = makeUnit(),
    before = unit.getState();
  const split = { ...laser, id: 'endo-steel-is', criticalSlots: 14 };
  expect(previewCatalogEquipmentPlacement(split, before).error).toContain(
    'split allocation',
  );
  expect(
    before.addEquipmentAtLocation(split, MechLocation.LEFT_TORSO).success,
  ).toBe(false);
  expect(previewCatalogEquipmentPlacement(laser, before, true).error).toContain(
    'read-only',
  );
  const unknown = { ...laser, variableEquipmentId: 'missing-calculation' };
  expect(
    before.addEquipmentAtLocation(unknown, MechLocation.LEFT_ARM).success,
  ).toBe(false);
  expect(unit.getState()).toBe(before);
  expect(getUnitEditHistory(unit).getState().canUndo).toBe(false);
});

it('places zero-slot equipment with an empty slot array and preserves Add as unassigned', () => {
  const unit = makeUnit();
  expect(
    unit
      .getState()
      .addEquipmentAtLocation({ ...laser, criticalSlots: 0 }, MechLocation.HEAD)
      .success,
  ).toBe(true);
  expect(unit.getState().equipment.at(-1)).toMatchObject({
    location: MechLocation.HEAD,
    slots: [],
  });
  unit.getState().addEquipment(laser);
  expect(unit.getState().equipment.at(-1)?.location).toBeUndefined();
});
