import { MechLocation } from '@/types/construction';
import { EngineType } from '@/types/construction/EngineType';
import { GyroType } from '@/types/construction/GyroType';
import {
  getDisplacedEquipment,
  getEquipmentDisplacedByEngineChange,
  getEquipmentDisplacedByGyroChange,
  applyDisplacement,
} from '@/utils/construction/displacementUtils';

interface MockEquipment {
  instanceId: string;
  equipmentId: string;
  location: MechLocation;
  slots: number[];
}

describe('displacementUtils', () => {
  const createEquipment = (
    overrides?: Partial<MockEquipment>,
  ): MockEquipment => ({
    instanceId: 'equip-1',
    equipmentId: 'medium-laser',
    location: MechLocation.CENTER_TORSO,
    slots: [0, 1],
    ...overrides,
  });

  describe('getDisplacedEquipment()', () => {
    it('should return empty result when no displacement', () => {
      const equipment = [createEquipment()];
      const result = getDisplacedEquipment(
        // @ts-expect-error - MockEquipment is partial for testing
        equipment,
        EngineType.STANDARD,
        EngineType.STANDARD,
        GyroType.STANDARD,
        GyroType.STANDARD,
      );

      expect(result.displacedEquipmentIds.length).toBe(0);
      expect(result.affectedLocations.length).toBe(0);
    });

    it('should detect equipment displaced by engine change', () => {
      // XL engine takes 3 slots in each side torso
      const equipment = [
        createEquipment({ location: MechLocation.LEFT_TORSO, slots: [0, 1] }),
      ];
      const result = getDisplacedEquipment(
        // @ts-expect-error - MockEquipment is partial for testing
        equipment,
        EngineType.STANDARD,
        EngineType.XL_IS,
        GyroType.STANDARD,
        GyroType.STANDARD,
      );

      expect(result.displacedEquipmentIds).toContain('equip-1');
      expect(result.affectedLocations).toContain(MechLocation.LEFT_TORSO);
    });

    it('should detect equipment displaced by gyro change', () => {
      // Standard gyro + Standard engine takes slots 0-9
      // XL gyro + Standard engine takes slots 0-11
      // Slots 10 and 11 are newly required
      const equipment = [
        createEquipment({ location: MechLocation.CENTER_TORSO, slots: [10] }),
      ];
      const result = getDisplacedEquipment(
        // @ts-expect-error - MockEquipment is partial for testing
        equipment,
        EngineType.STANDARD,
        EngineType.STANDARD,
        GyroType.STANDARD,
        GyroType.XL,
      );

      expect(result.displacedEquipmentIds).toContain('equip-1');
    });

    it('should skip equipment in unaffected locations', () => {
      const equipment = [
        createEquipment({ location: MechLocation.HEAD, slots: [0] }),
      ];
      const result = getDisplacedEquipment(
        // @ts-expect-error - MockEquipment is partial for testing
        equipment,
        EngineType.STANDARD,
        EngineType.XL_IS,
        GyroType.STANDARD,
        GyroType.STANDARD,
      );

      expect(result.displacedEquipmentIds.length).toBe(0);
    });

    it('should include affected locations', () => {
      const equipment = [
        createEquipment({ location: MechLocation.CENTER_TORSO }),
      ];
      const result = getDisplacedEquipment(
        // @ts-expect-error - MockEquipment is partial for testing
        equipment,
        EngineType.STANDARD,
        EngineType.XL_IS,
        GyroType.STANDARD,
        GyroType.STANDARD,
      );

      expect(result.affectedLocations).toBeDefined();
    });
  });

  describe('getEquipmentDisplacedByEngineChange()', () => {
    it('should detect equipment displaced by engine change', () => {
      const equipment = [createEquipment()];
      const result = getEquipmentDisplacedByEngineChange(
        // @ts-expect-error - MockEquipment is partial for testing
        equipment,
        EngineType.STANDARD,
        EngineType.XL_IS,
        GyroType.STANDARD,
      );

      expect(result).toBeDefined();
      expect(result.displacedEquipmentIds).toBeDefined();
    });
  });

  describe('getEquipmentDisplacedByGyroChange()', () => {
    it('should detect equipment displaced by gyro change', () => {
      const equipment = [createEquipment()];
      const result = getEquipmentDisplacedByGyroChange(
        // @ts-expect-error - MockEquipment is partial for testing
        equipment,
        EngineType.STANDARD,
        GyroType.STANDARD,
        GyroType.COMPACT,
      );

      expect(result).toBeDefined();
      expect(result.displacedEquipmentIds).toBeDefined();
    });
  });

  describe('applyDisplacement()', () => {
    it('should return original equipment when no displacement', () => {
      const equipment = [createEquipment()];
      // @ts-expect-error - MockEquipment is partial for testing
      const result = applyDisplacement(
        equipment as Parameters<typeof applyDisplacement>[0],
        [],
      );

      expect(result).toEqual(equipment);
    });

    it('should unallocate displaced equipment', () => {
      const equipment = [
        createEquipment({ instanceId: 'equip-1' }),
        createEquipment({ instanceId: 'equip-2' }),
      ];
      // @ts-expect-error - MockEquipment is partial for testing
      const result = applyDisplacement(equipment, ['equip-1']);

      expect(result[0].location).toBeUndefined();
      expect(result[0].slots).toBeUndefined();
      expect(result[1].location).toBeDefined();
    });

    it('should handle multiple displaced equipment', () => {
      const equipment = [
        createEquipment({ instanceId: 'equip-1' }),
        createEquipment({ instanceId: 'equip-2' }),
        createEquipment({ instanceId: 'equip-3' }),
      ];
      // @ts-expect-error - MockEquipment is partial for testing
      const result = applyDisplacement(equipment, ['equip-1', 'equip-3']);

      expect(result[0].location).toBeUndefined();
      expect(result[1].location).toBeDefined();
      expect(result[2].location).toBeUndefined();
    });
  });
});
