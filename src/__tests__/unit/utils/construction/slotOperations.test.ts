import { IMountedEquipmentInstance } from '@/stores/unitState';
import { ArmorTypeEnum } from '@/types/construction/ArmorType';
import {
  MechLocation,
  LOCATION_SLOT_COUNTS,
} from '@/types/construction/CriticalSlotAllocation';
import { EngineType } from '@/types/construction/EngineType';
import { GyroType } from '@/types/construction/GyroType';
import { InternalStructureType } from '@/types/construction/InternalStructureType';
import { BIPED_LOCATIONS } from '@/types/construction/MechConfigurationSystem';
import { TechBase } from '@/types/enums/TechBase';
import { EquipmentCategory } from '@/types/equipment';
import {
  compactEquipmentSlots,
  fillUnhittableSlots,
  getAvailableSlotIndices,
  getFixedSlotIndices,
  getUnallocatedUnhittables,
  isUnhittableEquipment,
  sortEquipmentBySize,
} from '@/utils/construction/slotOperations';

const createEquipment = (
  overrides: Partial<IMountedEquipmentInstance>,
): IMountedEquipmentInstance => ({
  instanceId: 'equipment-0',
  equipmentId: 'equipment-0',
  name: 'Equipment',
  category: EquipmentCategory.STRUCTURAL,
  weight: 0,
  criticalSlots: 1,
  heat: 0,
  techBase: TechBase.INNER_SPHERE,
  location: undefined,
  slots: undefined,
  isRearMounted: false,
  isRemovable: false,
  isOmniPodMounted: false,
  ...overrides,
});

const createUnhittable = (
  index: number,
  name: string = InternalStructureType.ENDO_STEEL_IS,
): IMountedEquipmentInstance =>
  createEquipment({
    instanceId: `unhittable-${index}`,
    equipmentId: `endo-${index}`,
    name,
    category: EquipmentCategory.STRUCTURAL,
    isRemovable: false,
  });

const capacityForLocation = (
  location: MechLocation,
  engineType: EngineType = EngineType.STANDARD,
  gyroType: GyroType = GyroType.STANDARD,
): number =>
  LOCATION_SLOT_COUNTS[location] -
  getFixedSlotIndices(location, engineType, gyroType).size;

describe('slotOperations', () => {
  describe('getFixedSlotIndices()', () => {
    it('should return fixed slots for head', () => {
      const fixed = getFixedSlotIndices(
        MechLocation.HEAD,
        EngineType.STANDARD,
        GyroType.STANDARD,
      );

      // Head has 5 fixed slots (0, 1, 2, 4, 5), only slot 3 is assignable
      expect(fixed.size).toBe(5);
      expect(fixed.has(0)).toBe(true);
      expect(fixed.has(1)).toBe(true);
      expect(fixed.has(2)).toBe(true);
      expect(fixed.has(4)).toBe(true);
      expect(fixed.has(5)).toBe(true);
      expect(fixed.has(3)).toBe(false);
    });

    it('should reserve side torso engine slots for XL engines', () => {
      const fixedLeft = getFixedSlotIndices(
        MechLocation.LEFT_TORSO,
        EngineType.XL_IS,
        GyroType.STANDARD,
      );
      const fixedRight = getFixedSlotIndices(
        MechLocation.RIGHT_TORSO,
        EngineType.XL_IS,
        GyroType.STANDARD,
      );

      expect(Array.from(fixedLeft)).toEqual([0, 1, 2]);
      expect(Array.from(fixedRight)).toEqual([0, 1, 2]);
    });

    it('should place compact engine slots before XL gyro slots in center torso', () => {
      const fixed = getFixedSlotIndices(
        MechLocation.CENTER_TORSO,
        EngineType.COMPACT,
        GyroType.XL,
      );
      const expectedSlots = new Set([0, 1, 2, 3, 4, 5, 6, 7, 8]); // 3 engine + 6 gyro

      expect(fixed.size).toBe(expectedSlots.size);
      expectedSlots.forEach((slot) => expect(fixed.has(slot)).toBe(true));
      expect(fixed.has(9)).toBe(false);
    });

    it('should return fixed slots for arms and legs (actuators)', () => {
      const armFixed = getFixedSlotIndices(
        MechLocation.LEFT_ARM,
        EngineType.STANDARD,
        GyroType.STANDARD,
      );
      const legFixed = getFixedSlotIndices(
        MechLocation.LEFT_LEG,
        EngineType.STANDARD,
        GyroType.STANDARD,
      );

      expect(armFixed.size).toBe(4);
      expect(legFixed.size).toBe(4);
      [0, 1, 2, 3].forEach((slot) => {
        expect(armFixed.has(slot)).toBe(true);
        expect(legFixed.has(slot)).toBe(true);
      });
      expect(armFixed.has(4)).toBe(false);
      expect(legFixed.has(4)).toBe(false);
    });
  });

  describe('getAvailableSlotIndices()', () => {
    it('should expose only the single head slot when empty', () => {
      const available = getAvailableSlotIndices(
        MechLocation.HEAD,
        EngineType.STANDARD,
        GyroType.STANDARD,
        [],
      );

      expect(available).toEqual([3]);
    });

    it('should exclude fixed and already used slots in side torso', () => {
      const equipment = [
        createEquipment({
          instanceId: 'lt-equipped',
          equipmentId: 'lt-equipped',
          name: 'Filler',
          category: EquipmentCategory.MISC_EQUIPMENT,
          location: MechLocation.LEFT_TORSO,
          slots: [3],
        }),
      ];

      const available = getAvailableSlotIndices(
        MechLocation.LEFT_TORSO,
        EngineType.XL_IS,
        GyroType.STANDARD,
        equipment,
      );

      expect(available.includes(0)).toBe(false);
      expect(available.includes(1)).toBe(false);
      expect(available.includes(2)).toBe(false);
      expect(available.includes(3)).toBe(false);
      expect(available[0]).toBe(4);
      expect(available[available.length - 1]).toBe(11);
      expect(available).toHaveLength(8);
    });
  });

  describe('isUnhittableEquipment()', () => {
    it('should detect Endo Steel and Ferro-Fibrous equipment and ignore standard armor', () => {
      const endoSteel = createEquipment({
        instanceId: 'endo',
        equipmentId: 'endo-steel',
        name: InternalStructureType.ENDO_STEEL_IS,
      });
      const ferro = createEquipment({
        instanceId: 'ferro',
        equipmentId: 'ferro',
        name: ArmorTypeEnum.FERRO_FIBROUS_IS,
      });
      const standardArmor = createEquipment({
        instanceId: 'standard-armor',
        equipmentId: 'standard-armor',
        name: 'Standard Armor',
      });

      expect(isUnhittableEquipment(endoSteel)).toBe(true);
      expect(isUnhittableEquipment(ferro)).toBe(true);
      expect(isUnhittableEquipment(standardArmor)).toBe(false);
    });
  });

  describe('getUnallocatedUnhittables()', () => {
    it('should return only unallocated unhittable equipment', () => {
      const unallocatedEndo = createUnhittable(1);
      const allocatedEndo = createEquipment({
        ...createUnhittable(2),
        instanceId: 'allocated-endo',
        equipmentId: 'allocated-endo',
        location: MechLocation.LEFT_TORSO,
        slots: [0],
      });
      const weapon = createEquipment({
        instanceId: 'weapon',
        equipmentId: 'medium-laser',
        name: 'Medium Laser',
        category: EquipmentCategory.ENERGY_WEAPON,
      });

      const result = getUnallocatedUnhittables([
        unallocatedEndo,
        allocatedEndo,
        weapon,
      ]);

      expect(result).toHaveLength(1);
      expect(result[0].instanceId).toBe(unallocatedEndo.instanceId);
    });
  });

  describe('fillUnhittableSlots()', () => {
    it('should distribute unallocated unhittables and skip already placed ones', () => {
      const placedUnhittable = createEquipment({
        instanceId: 'placed-endo',
        equipmentId: 'endo-placed',
        name: InternalStructureType.ENDO_STEEL_IS,
        category: EquipmentCategory.STRUCTURAL,
        location: MechLocation.LEFT_TORSO,
        slots: [0],
        isRemovable: false,
      });
      const unhittables = [
        createUnhittable(0),
        createUnhittable(1),
        createUnhittable(2),
      ];
      const other = createEquipment({
        instanceId: 'weapon',
        equipmentId: 'medium-laser',
        name: 'Medium Laser',
        category: EquipmentCategory.ENERGY_WEAPON,
      });

      const result = fillUnhittableSlots(
        [placedUnhittable, ...unhittables, other],
        EngineType.STANDARD,
        GyroType.STANDARD,
      );

      expect(result.unassigned).toHaveLength(0);
      expect(result.assignments.map((a) => a.instanceId)).not.toContain(
        placedUnhittable.instanceId,
      );
      expect(result.assignments.map((a) => a.instanceId)).not.toContain(
        other.instanceId,
      );
      expect(result.assignments.map((a) => a.location)).toEqual([
        MechLocation.LEFT_TORSO,
        MechLocation.RIGHT_TORSO,
        MechLocation.LEFT_TORSO,
      ]);
      expect(result.assignments[0].slots[0]).not.toBe(0);
    });

    it('should fill locations in priority order and report overflow', () => {
      const unhittables = Array.from({ length: 50 }, (_, index) =>
        createUnhittable(index),
      );

      const result = fillUnhittableSlots(
        unhittables,
        EngineType.STANDARD,
        GyroType.STANDARD,
      );

      // Only check biped locations since fillUnhittableSlots only works with biped mechs
      const expectedCapacity = BIPED_LOCATIONS.reduce<
        Partial<Record<MechLocation, number>>
      >((acc, location) => {
        acc[location] = capacityForLocation(location);
        return acc;
      }, {});

      const countByLocation = result.assignments.reduce<
        Record<MechLocation, number>
      >(
        (acc, assignment) => {
          acc[assignment.location] = (acc[assignment.location] ?? 0) + 1;
          return acc;
        },
        {} as Record<MechLocation, number>,
      );

      Object.entries(expectedCapacity).forEach(([location, capacity]) => {
        expect(countByLocation[location as MechLocation]).toBe(capacity);
      });

      const headAssignment = result.assignments.find(
        (a) => a.location === MechLocation.HEAD,
      );
      expect(headAssignment?.slots).toEqual([3]);

      const ctSlots = result.assignments
        .filter((a) => a.location === MechLocation.CENTER_TORSO)
        .flatMap((a) => a.slots);
      expect(ctSlots).toEqual([10, 11]);

      expect(result.unassigned).toHaveLength(3);
    });
  });

  describe('compactEquipmentSlots()', () => {
    it('should compact equipment to lowest slots', () => {
      const equipment: IMountedEquipmentInstance[] = [
        createEquipment({
          instanceId: 'equip-1',
          equipmentId: 'large-pulse',
          name: 'Large Pulse Laser',
          category: EquipmentCategory.ENERGY_WEAPON,
          criticalSlots: 2,
          location: MechLocation.LEFT_ARM,
          slots: [9, 10],
        }),
        createEquipment({
          instanceId: 'equip-2',
          equipmentId: 'small-laser',
          name: 'Small Laser',
          category: EquipmentCategory.ENERGY_WEAPON,
          criticalSlots: 1,
          location: MechLocation.LEFT_ARM,
          slots: [11],
        }),
      ];

      const result = compactEquipmentSlots(
        equipment,
        EngineType.STANDARD,
        GyroType.STANDARD,
      );

      const leftArmAssignments = result.assignments.filter(
        (a) => a.location === MechLocation.LEFT_ARM,
      );
      expect(leftArmAssignments).toEqual([
        {
          instanceId: 'equip-1',
          location: MechLocation.LEFT_ARM,
          slots: [4, 5],
        },
        { instanceId: 'equip-2', location: MechLocation.LEFT_ARM, slots: [6] },
      ]);
    });
  });

  describe('sortEquipmentBySize()', () => {
    it('should sort equipment by size', () => {
      const equipment: IMountedEquipmentInstance[] = [
        createEquipment({
          instanceId: 'alpha',
          equipmentId: 'alpha',
          name: 'Alpha Cannon',
          category: EquipmentCategory.MISC_EQUIPMENT,
          criticalSlots: 2,
          location: MechLocation.LEFT_ARM,
          slots: [8, 9],
        }),
        createEquipment({
          instanceId: 'zeta',
          equipmentId: 'zeta',
          name: 'Zeta Cannon',
          category: EquipmentCategory.MISC_EQUIPMENT,
          criticalSlots: 2,
          location: MechLocation.LEFT_ARM,
          slots: [10, 11],
        }),
        createEquipment({
          instanceId: 'beta',
          equipmentId: 'beta',
          name: 'Beta Laser',
          category: EquipmentCategory.ENERGY_WEAPON,
          criticalSlots: 1,
          location: MechLocation.LEFT_ARM,
          slots: [6],
        }),
      ];

      const result = sortEquipmentBySize(
        equipment,
        EngineType.STANDARD,
        GyroType.STANDARD,
      );

      const assignments = result.assignments.filter(
        (a) => a.location === MechLocation.LEFT_ARM,
      );
      expect(assignments.map((a) => a.instanceId)).toEqual([
        'alpha',
        'zeta',
        'beta',
      ]);
      expect(assignments[0].slots).toEqual([4, 5]);
      expect(assignments[1].slots).toEqual([6, 7]);
      expect(assignments[2].slots).toEqual([8]);
    });
  });
});
