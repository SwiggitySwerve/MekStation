/**
 * Tests for unitState.ts
 */

import {
  createDefaultUnitState,
  getTotalAllocatedArmor,
  armorResultToAllocation,
} from '@/stores/unitState';
import { ArmorTypeEnum } from '@/types/construction/ArmorType';
import { MechLocation } from '@/types/construction/CriticalSlotAllocation';
import { TechBase } from '@/types/enums/TechBase';
import { MechConfiguration } from '@/types/unit/BattleMechInterfaces';
import {
  getMaxTotalArmor,
  calculateArmorPoints,
  calculateOptimalArmorAllocation,
} from '@/utils/construction/armorCalculations';

describe('unitState', () => {
  describe('createDefaultUnitState()', () => {
    it('should create a unit with 70% default armor', () => {
      const unit = createDefaultUnitState({
        name: 'Test Mech',
        tonnage: 50,
        techBase: TechBase.INNER_SPHERE,
      });

      const maxArmor = getMaxTotalArmor(50, MechConfiguration.BIPED);
      const expectedTargetPoints = Math.floor(maxArmor * 0.7);

      expect(unit.armorTonnage).toBeGreaterThan(0);

      // Verify armor is allocated
      const totalAllocated = getTotalAllocatedArmor(
        unit.armorAllocation,
        MechConfiguration.BIPED,
      );
      expect(totalAllocated).toBeGreaterThan(0);

      // Should be approximately 70% of max armor (60-75% range accounts for rounding)
      const allocatedRatio = totalAllocated / maxArmor;
      expect(allocatedRatio).toBeGreaterThanOrEqual(0.6);
      expect(allocatedRatio).toBeLessThanOrEqual(0.75);
    });

    it('should allocate armor to all locations', () => {
      const unit = createDefaultUnitState({
        name: 'Test Mech',
        tonnage: 50,
        techBase: TechBase.INNER_SPHERE,
      });

      // All biped locations should have some armor
      expect(unit.armorAllocation[MechLocation.HEAD]).toBeGreaterThan(0);
      expect(unit.armorAllocation[MechLocation.CENTER_TORSO]).toBeGreaterThan(
        0,
      );
      expect(unit.armorAllocation.centerTorsoRear).toBeGreaterThan(0);
      expect(unit.armorAllocation[MechLocation.LEFT_TORSO]).toBeGreaterThan(0);
      expect(unit.armorAllocation.leftTorsoRear).toBeGreaterThan(0);
      expect(unit.armorAllocation[MechLocation.RIGHT_TORSO]).toBeGreaterThan(0);
      expect(unit.armorAllocation.rightTorsoRear).toBeGreaterThan(0);
      expect(unit.armorAllocation[MechLocation.LEFT_ARM]).toBeGreaterThan(0);
      expect(unit.armorAllocation[MechLocation.RIGHT_ARM]).toBeGreaterThan(0);
      expect(unit.armorAllocation[MechLocation.LEFT_LEG]).toBeGreaterThan(0);
      expect(unit.armorAllocation[MechLocation.RIGHT_LEG]).toBeGreaterThan(0);
    });

    it('should work for different tonnages', () => {
      const lightMech = createDefaultUnitState({
        name: 'Light Mech',
        tonnage: 20,
        techBase: TechBase.INNER_SPHERE,
      });

      const assaultMech = createDefaultUnitState({
        name: 'Assault Mech',
        tonnage: 100,
        techBase: TechBase.INNER_SPHERE,
      });

      // Light mech should have less armor than assault
      expect(lightMech.armorTonnage).toBeLessThan(assaultMech.armorTonnage);

      // Both should have armor allocated
      const lightTotal = getTotalAllocatedArmor(
        lightMech.armorAllocation,
        MechConfiguration.BIPED,
      );
      const assaultTotal = getTotalAllocatedArmor(
        assaultMech.armorAllocation,
        MechConfiguration.BIPED,
      );

      expect(lightTotal).toBeGreaterThan(0);
      expect(assaultTotal).toBeGreaterThan(0);
      expect(assaultTotal).toBeGreaterThan(lightTotal);
    });
  });

  describe('armorResultToAllocation()', () => {
    it('should convert ArmorAllocationResult to IArmorAllocation', () => {
      const result = calculateOptimalArmorAllocation(
        100,
        50,
        MechConfiguration.BIPED,
      );
      const allocation = armorResultToAllocation(result);

      expect(allocation[MechLocation.HEAD]).toBe(result.head);
      expect(allocation[MechLocation.CENTER_TORSO]).toBe(
        result.centerTorsoFront,
      );
      expect(allocation.centerTorsoRear).toBe(result.centerTorsoRear);
      expect(allocation[MechLocation.LEFT_TORSO]).toBe(result.leftTorsoFront);
      expect(allocation.leftTorsoRear).toBe(result.leftTorsoRear);
      expect(allocation[MechLocation.RIGHT_TORSO]).toBe(result.rightTorsoFront);
      expect(allocation.rightTorsoRear).toBe(result.rightTorsoRear);
      expect(allocation[MechLocation.LEFT_ARM]).toBe(result.leftArm);
      expect(allocation[MechLocation.RIGHT_ARM]).toBe(result.rightArm);
      expect(allocation[MechLocation.LEFT_LEG]).toBe(result.leftLeg);
      expect(allocation[MechLocation.RIGHT_LEG]).toBe(result.rightLeg);
    });
  });
});
