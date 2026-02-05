/**
 * Mech Builder Service Tests
 *
 * Tests for mech construction and modification logic.
 *
 * @spec openspec/specs/construction-services/spec.md
 */

import {
  MechBuilderService,
  IEditableMech,
} from '@/services/construction/MechBuilderService';
import { IFullUnit } from '@/services/units/CanonicalUnitService';
import { EngineType } from '@/types/construction/EngineType';
import { HeatSinkType } from '@/types/construction/HeatSinkType';
import { TechBase } from '@/types/enums/TechBase';

describe('MechBuilderService', () => {
  let service: MechBuilderService;

  beforeEach(() => {
    service = new MechBuilderService();
  });

  // ============================================================================
  // createEmpty
  // ============================================================================
  describe('createEmpty', () => {
    describe('valid tonnages', () => {
      it.each([
        20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80, 85, 90, 95, 100,
      ])('should create empty %d-ton mech', (tonnage) => {
        const mech = service.createEmpty(tonnage, TechBase.INNER_SPHERE);

        expect(mech.tonnage).toBe(tonnage);
        expect(mech.techBase).toBe(TechBase.INNER_SPHERE);
        expect(mech.chassis).toBe('New Mech');
        expect(mech.variant).toBe('Custom');
      });
    });

    describe('default values', () => {
      it('should set default walk MP to 3', () => {
        const mech = service.createEmpty(50, TechBase.INNER_SPHERE);
        expect(mech.walkMP).toBe(3);
      });

      it('should calculate engine rating from tonnage and walk MP', () => {
        const mech = service.createEmpty(50, TechBase.INNER_SPHERE);
        expect(mech.engineRating).toBe(150); // 50 × 3 = 150
      });

      it('should set standard engine type', () => {
        const mech = service.createEmpty(50, TechBase.INNER_SPHERE);
        expect(mech.engineType).toBe(EngineType.STANDARD);
      });

      it('should set 10 heat sinks', () => {
        const mech = service.createEmpty(50, TechBase.INNER_SPHERE);
        expect(mech.heatSinkCount).toBe(10);
      });

      it('should set Single heat sinks for IS', () => {
        const mech = service.createEmpty(50, TechBase.INNER_SPHERE);
        expect(mech.heatSinkType).toBe(HeatSinkType.SINGLE);
      });

      it('should set Double heat sinks for Clan', () => {
        const mech = service.createEmpty(50, TechBase.CLAN);
        expect(mech.heatSinkType).toBe(HeatSinkType.DOUBLE_CLAN);
      });

      it('should set empty armor allocation', () => {
        const mech = service.createEmpty(50, TechBase.INNER_SPHERE);
        expect(mech.armorAllocation.head).toBe(0);
        expect(mech.armorAllocation.centerTorso).toBe(0);
        expect(mech.armorAllocation.leftArm).toBe(0);
      });

      it('should set empty equipment list', () => {
        const mech = service.createEmpty(50, TechBase.INNER_SPHERE);
        expect(mech.equipment).toEqual([]);
      });

      it('should not be marked dirty', () => {
        const mech = service.createEmpty(50, TechBase.INNER_SPHERE);
        expect(mech.isDirty).toBe(false);
      });
    });

    describe('invalid tonnages', () => {
      it('should throw for tonnage below 20', () => {
        expect(() => service.createEmpty(15, TechBase.INNER_SPHERE)).toThrow(
          'Invalid tonnage',
        );
      });

      it('should throw for tonnage above 100', () => {
        expect(() => service.createEmpty(105, TechBase.INNER_SPHERE)).toThrow(
          'Invalid tonnage',
        );
      });

      it('should throw for non-5-ton increment', () => {
        expect(() => service.createEmpty(52, TechBase.INNER_SPHERE)).toThrow(
          'Invalid tonnage',
        );
      });
    });
  });

  // ============================================================================
  // createFromUnit
  // ============================================================================
  describe('createFromUnit', () => {
    it('should create editable mech from unit', () => {
      const unit: IFullUnit = {
        id: 'test-unit',
        chassis: 'Atlas',
        variant: 'AS7-D',
        tonnage: 100,
        techBase: TechBase.INNER_SPHERE,
      } as IFullUnit;

      const mech = service.createFromUnit(unit);

      expect(mech.id).toBe('test-unit');
      expect(mech.chassis).toBe('Atlas');
      expect(mech.variant).toBe('AS7-D');
      expect(mech.tonnage).toBe(100);
    });

    it('should not be marked dirty after creation', () => {
      const unit: IFullUnit = {
        id: 'test',
        chassis: 'Test',
        variant: 'TST-1A',
        tonnage: 50,
      } as IFullUnit;

      const mech = service.createFromUnit(unit);
      expect(mech.isDirty).toBe(false);
    });

    it('should default to IS if tech base not specified', () => {
      const unit: IFullUnit = {
        id: 'test',
        chassis: 'Test',
        variant: 'TST',
        tonnage: 50,
      } as IFullUnit;

      const mech = service.createFromUnit(unit);
      expect(mech.techBase).toBe(TechBase.INNER_SPHERE);
    });
  });

  // ============================================================================
  // applyChanges
  // ============================================================================
  describe('applyChanges', () => {
    let baseMech: IEditableMech;

    beforeEach(() => {
      baseMech = service.createEmpty(50, TechBase.INNER_SPHERE);
    });

    it('should apply chassis change', () => {
      const updated = service.applyChanges(baseMech, { chassis: 'Hunchback' });
      expect(updated.chassis).toBe('Hunchback');
    });

    it('should apply variant change', () => {
      const updated = service.applyChanges(baseMech, { variant: 'HBK-4G' });
      expect(updated.variant).toBe('HBK-4G');
    });

    it('should apply engine type change', () => {
      const updated = service.applyChanges(baseMech, { engineType: 'XL' });
      expect(updated.engineType).toBe('XL');
    });

    it('should apply walk MP change and recalculate engine rating', () => {
      const updated = service.applyChanges(baseMech, { walkMP: 4 });
      expect(updated.walkMP).toBe(4);
      expect(updated.engineRating).toBe(200); // 50 × 4 = 200
    });

    it('should apply armor allocation changes', () => {
      const updated = service.applyChanges(baseMech, {
        armorAllocation: { head: 9, centerTorso: 20 },
      });
      expect(updated.armorAllocation.head).toBe(9);
      expect(updated.armorAllocation.centerTorso).toBe(20);
    });

    it('should preserve unchanged armor values', () => {
      const withArmor = service.applyChanges(baseMech, {
        armorAllocation: { head: 9, centerTorso: 20 },
      });
      const updated = service.applyChanges(withArmor, {
        armorAllocation: { leftArm: 10 },
      });

      expect(updated.armorAllocation.head).toBe(9);
      expect(updated.armorAllocation.centerTorso).toBe(20);
      expect(updated.armorAllocation.leftArm).toBe(10);
    });

    it('should mark mech as dirty', () => {
      const updated = service.applyChanges(baseMech, { chassis: 'Modified' });
      expect(updated.isDirty).toBe(true);
    });

    it('should be immutable - original unchanged', () => {
      const updated = service.applyChanges(baseMech, { chassis: 'Modified' });
      expect(baseMech.chassis).toBe('New Mech');
      expect(updated.chassis).toBe('Modified');
    });
  });

  // ============================================================================
  // setEngine
  // ============================================================================
  describe('setEngine', () => {
    let baseMech: IEditableMech;

    beforeEach(() => {
      baseMech = service.createEmpty(50, TechBase.INNER_SPHERE);
    });

    it('should set engine type', () => {
      const updated = service.setEngine(baseMech, 'XL');
      expect(updated.engineType).toBe('XL');
    });

    it('should preserve walk MP if not specified', () => {
      const updated = service.setEngine(baseMech, 'XL');
      expect(updated.walkMP).toBe(baseMech.walkMP);
    });

    it('should update walk MP and engine rating together', () => {
      const updated = service.setEngine(baseMech, 'Standard', 4);
      expect(updated.walkMP).toBe(4);
      expect(updated.engineRating).toBe(200); // 50 × 4
    });

    it('should throw for engine rating exceeding maximum', () => {
      // Walk MP 9 on 50-ton mech = rating 450 (exceeds 400)
      expect(() => service.setEngine(baseMech, 'Standard', 9)).toThrow(
        'Engine rating 450 exceeds maximum',
      );
    });

    it('should throw for engine rating below minimum', () => {
      // For very low walk MP
      const heavyMech = service.createEmpty(100, TechBase.INNER_SPHERE);
      // Walk MP of 0 would give rating 0, but we can't set 0 walk
      expect(() => service.setEngine(heavyMech, 'Standard', 0)).toThrow(
        'Engine rating 0 below minimum',
      );
    });

    it('should mark mech as dirty', () => {
      const updated = service.setEngine(baseMech, 'XL');
      expect(updated.isDirty).toBe(true);
    });
  });

  // ============================================================================
  // setArmor
  // ============================================================================
  describe('setArmor', () => {
    let baseMech: IEditableMech;

    beforeEach(() => {
      baseMech = service.createEmpty(50, TechBase.INNER_SPHERE);
    });

    it('should set armor allocation', () => {
      const updated = service.setArmor(baseMech, { head: 9 });
      expect(updated.armorAllocation.head).toBe(9);
    });

    it('should merge with existing armor', () => {
      const step1 = service.setArmor(baseMech, { head: 9 });
      const step2 = service.setArmor(step1, { centerTorso: 20 });

      expect(step2.armorAllocation.head).toBe(9);
      expect(step2.armorAllocation.centerTorso).toBe(20);
    });

    it('should mark mech as dirty', () => {
      const updated = service.setArmor(baseMech, { head: 9 });
      expect(updated.isDirty).toBe(true);
    });
  });

  // ============================================================================
  // addEquipment
  // ============================================================================
  describe('addEquipment', () => {
    let baseMech: IEditableMech;

    beforeEach(() => {
      baseMech = service.createEmpty(50, TechBase.INNER_SPHERE);
    });

    it('should add equipment to location', () => {
      const updated = service.addEquipment(baseMech, 'medium-laser', 'RT');

      expect(updated.equipment.length).toBe(1);
      expect(updated.equipment[0].equipmentId).toBe('medium-laser');
      expect(updated.equipment[0].location).toBe('RT');
    });

    it('should assign sequential slot indices', () => {
      let mech = baseMech;
      mech = service.addEquipment(mech, 'medium-laser', 'RT');
      mech = service.addEquipment(mech, 'medium-laser', 'RT');
      mech = service.addEquipment(mech, 'medium-laser', 'LT');

      expect(mech.equipment[0].slotIndex).toBe(0);
      expect(mech.equipment[1].slotIndex).toBe(1);
      expect(mech.equipment[2].slotIndex).toBe(0); // Different location
    });

    it('should mark mech as dirty', () => {
      const updated = service.addEquipment(baseMech, 'medium-laser', 'RT');
      expect(updated.isDirty).toBe(true);
    });
  });

  // ============================================================================
  // removeEquipment
  // ============================================================================
  describe('removeEquipment', () => {
    let mechWithEquipment: IEditableMech;

    beforeEach(() => {
      let mech = service.createEmpty(50, TechBase.INNER_SPHERE);
      mech = service.addEquipment(mech, 'medium-laser', 'RT');
      mech = service.addEquipment(mech, 'srm-6', 'LT');
      mech = service.addEquipment(mech, 'machine-gun', 'RA');
      mechWithEquipment = mech;
    });

    it('should remove equipment by index', () => {
      const updated = service.removeEquipment(mechWithEquipment, 1);

      expect(updated.equipment.length).toBe(2);
      expect(
        updated.equipment.find((e) => e.equipmentId === 'srm-6'),
      ).toBeUndefined();
    });

    it('should preserve other equipment', () => {
      const updated = service.removeEquipment(mechWithEquipment, 1);

      expect(
        updated.equipment.find((e) => e.equipmentId === 'medium-laser'),
      ).toBeDefined();
      expect(
        updated.equipment.find((e) => e.equipmentId === 'machine-gun'),
      ).toBeDefined();
    });

    it('should mark mech as dirty', () => {
      const updated = service.removeEquipment(mechWithEquipment, 0);
      expect(updated.isDirty).toBe(true);
    });
  });

  // ============================================================================
  // Immutability
  // ============================================================================
  describe('Immutability', () => {
    it('all operations should return new object', () => {
      const original = service.createEmpty(50, TechBase.INNER_SPHERE);

      const afterChanges = service.applyChanges(original, {
        chassis: 'Changed',
      });
      const afterEngine = service.setEngine(original, 'XL');
      const afterArmor = service.setArmor(original, { head: 9 });
      const afterEquip = service.addEquipment(original, 'laser', 'RA');

      expect(afterChanges).not.toBe(original);
      expect(afterEngine).not.toBe(original);
      expect(afterArmor).not.toBe(original);
      expect(afterEquip).not.toBe(original);
    });

    it('original should remain unchanged after modifications', () => {
      const original = service.createEmpty(50, TechBase.INNER_SPHERE);
      const originalChassis = original.chassis;

      service.applyChanges(original, { chassis: 'Modified' });

      expect(original.chassis).toBe(originalChassis);
    });
  });
});
