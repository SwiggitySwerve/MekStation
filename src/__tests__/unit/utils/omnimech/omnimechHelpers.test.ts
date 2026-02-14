/**
 * OmniMech Helpers Tests
 *
 * @spec openspec/specs/omnimech-system/spec.md
 */

import type { IMountedEquipmentInstance } from '@/types/equipment/MountedEquipment';

import { UnitState, createDefaultUnitState } from '@/stores/unitState';
import { MechLocation } from '@/types/construction/CriticalSlotAllocation';
import { TechBase } from '@/types/enums/TechBase';
import { EquipmentCategory } from '@/types/equipment';
import {
  isOmniFixedOnly,
  canPodMount,
  getFixedEquipment,
  getPodEquipment,
  calculatePodSpace,
  getEffectiveBaseChassisHeatSinks,
} from '@/utils/omnimech';

// Helper to create mock equipment
function createMockEquipment(
  overrides: Partial<IMountedEquipmentInstance> = {},
): IMountedEquipmentInstance {
  return {
    instanceId: 'test-' + Math.random().toString(36).substr(2, 9),
    equipmentId: 'eq-001',
    name: 'Test Equipment',
    category: EquipmentCategory.ENERGY_WEAPON,
    weight: 1,
    criticalSlots: 1,
    heat: 0,
    techBase: TechBase.INNER_SPHERE,
    location: undefined,
    slots: undefined,
    isRearMounted: false,
    linkedAmmoId: undefined,
    isRemovable: true,
    isOmniPodMounted: false,
    ...overrides,
  };
}

// Helper to create OmniMech state
function createOmniMechState(overrides: Partial<UnitState> = {}): UnitState {
  const base = createDefaultUnitState({
    name: 'Test OmniMech',
    tonnage: 75,
    techBase: TechBase.CLAN,
  });
  return {
    ...base,
    isOmni: true,
    baseChassisHeatSinks: 10,
    ...overrides,
  };
}

describe('OmniMech Helpers', () => {
  describe('isOmniFixedOnly', () => {
    it('should return true for engine components', () => {
      const engine = createMockEquipment({ name: 'Fusion Engine' });
      expect(isOmniFixedOnly(engine)).toBe(true);
    });

    it('should return true for XL Engine', () => {
      const xlEngine = createMockEquipment({ name: 'XL Engine' });
      expect(isOmniFixedOnly(xlEngine)).toBe(true);
    });

    it('should return true for Gyro', () => {
      const gyro = createMockEquipment({ name: 'Gyro' });
      expect(isOmniFixedOnly(gyro)).toBe(true);
    });

    it('should return true for Cockpit', () => {
      const cockpit = createMockEquipment({ name: 'Cockpit' });
      expect(isOmniFixedOnly(cockpit)).toBe(true);
    });

    it('should return true for Endo Steel', () => {
      const endoSteel = createMockEquipment({ name: 'Endo Steel' });
      expect(isOmniFixedOnly(endoSteel)).toBe(true);
    });

    it('should return true for Ferro-Fibrous', () => {
      const ferroFibrous = createMockEquipment({ name: 'Ferro-Fibrous' });
      expect(isOmniFixedOnly(ferroFibrous)).toBe(true);
    });

    it('should return true for actuators', () => {
      const shoulder = createMockEquipment({ name: 'Shoulder' });
      expect(isOmniFixedOnly(shoulder)).toBe(true);

      const handActuator = createMockEquipment({ name: 'Hand Actuator' });
      expect(isOmniFixedOnly(handActuator)).toBe(true);
    });

    it('should return true for TSM', () => {
      const tsm = createMockEquipment({ name: 'Triple Strength Myomer' });
      expect(isOmniFixedOnly(tsm)).toBe(true);
    });

    it('should return false for weapons', () => {
      const laser = createMockEquipment({ name: 'ER Large Laser' });
      expect(isOmniFixedOnly(laser)).toBe(false);
    });

    it('should return false for ammo', () => {
      const ammo = createMockEquipment({
        name: 'LRM 20 Ammo',
        category: EquipmentCategory.AMMUNITION,
      });
      expect(isOmniFixedOnly(ammo)).toBe(false);
    });

    it('should return false for CASE', () => {
      const caseEquip = createMockEquipment({ name: 'CASE' });
      expect(isOmniFixedOnly(caseEquip)).toBe(false);
    });
  });

  describe('canPodMount', () => {
    it('should return false for non-OmniMech units', () => {
      const state = createOmniMechState({ isOmni: false });
      const weapon = createMockEquipment({ name: 'Medium Laser' });
      expect(canPodMount(state, weapon)).toBe(false);
    });

    it('should return false for fixed-only equipment on OmniMech', () => {
      const state = createOmniMechState();
      const engine = createMockEquipment({ name: 'Fusion Engine' });
      expect(canPodMount(state, engine)).toBe(false);
    });

    it('should return true for weapons on OmniMech', () => {
      const state = createOmniMechState();
      const weapon = createMockEquipment({ name: 'ER Large Laser' });
      expect(canPodMount(state, weapon)).toBe(true);
    });

    it('should return true for ammo on OmniMech', () => {
      const state = createOmniMechState();
      const ammo = createMockEquipment({
        name: 'LRM 20 Ammo',
        category: EquipmentCategory.AMMUNITION,
      });
      expect(canPodMount(state, ammo)).toBe(true);
    });

    it('should return true for CASE on OmniMech', () => {
      const state = createOmniMechState();
      const caseEquip = createMockEquipment({ name: 'CASE' });
      expect(canPodMount(state, caseEquip)).toBe(true);
    });

    describe('heat sink special rules', () => {
      it('should allow pod-mounting heat sink when above minimum', () => {
        // State with 12 fixed heat sinks, minimum is 10
        const fixedHeatSinks = Array(12)
          .fill(null)
          .map((_, i) =>
            createMockEquipment({
              instanceId: `hs-fixed-${i}`,
              name: 'Double Heat Sink',
              isOmniPodMounted: false,
            }),
          );
        const state = createOmniMechState({
          baseChassisHeatSinks: 10,
          equipment: fixedHeatSinks,
        });

        const newHeatSink = createMockEquipment({
          name: 'Double Heat Sink',
          isOmniPodMounted: false,
        });
        // With 12 fixed and minimum 10, we can pod-mount one
        expect(canPodMount(state, newHeatSink)).toBe(true);
      });

      it('should prevent pod-mounting heat sink at minimum', () => {
        // State with exactly 10 fixed heat sinks, minimum is 10
        const fixedHeatSinks = Array(10)
          .fill(null)
          .map((_, i) =>
            createMockEquipment({
              instanceId: `hs-fixed-${i}`,
              name: 'Double Heat Sink',
              isOmniPodMounted: false,
            }),
          );
        const state = createOmniMechState({
          baseChassisHeatSinks: 10,
          equipment: fixedHeatSinks,
        });

        const newHeatSink = createMockEquipment({
          name: 'Double Heat Sink',
          isOmniPodMounted: false,
        });
        // With exactly 10 fixed and minimum 10, cannot pod-mount
        expect(canPodMount(state, newHeatSink)).toBe(false);
      });
    });
  });

  describe('getFixedEquipment', () => {
    it('should return only non-pod-mounted equipment', () => {
      const fixedWeapon = createMockEquipment({
        instanceId: 'fixed-1',
        name: 'Medium Laser',
        isOmniPodMounted: false,
      });
      const podWeapon = createMockEquipment({
        instanceId: 'pod-1',
        name: 'ER Large Laser',
        isOmniPodMounted: true,
      });
      const state = createOmniMechState({
        equipment: [fixedWeapon, podWeapon],
      });

      const fixed = getFixedEquipment(state);
      expect(fixed).toHaveLength(1);
      expect(fixed[0].instanceId).toBe('fixed-1');
    });

    it('should return empty array when all equipment is pod-mounted', () => {
      const podWeapon = createMockEquipment({
        name: 'ER Large Laser',
        isOmniPodMounted: true,
      });
      const state = createOmniMechState({
        equipment: [podWeapon],
      });

      const fixed = getFixedEquipment(state);
      expect(fixed).toHaveLength(0);
    });
  });

  describe('getPodEquipment', () => {
    it('should return only pod-mounted equipment', () => {
      const fixedWeapon = createMockEquipment({
        instanceId: 'fixed-1',
        name: 'Medium Laser',
        isOmniPodMounted: false,
      });
      const podWeapon = createMockEquipment({
        instanceId: 'pod-1',
        name: 'ER Large Laser',
        isOmniPodMounted: true,
      });
      const state = createOmniMechState({
        equipment: [fixedWeapon, podWeapon],
      });

      const pod = getPodEquipment(state);
      expect(pod).toHaveLength(1);
      expect(pod[0].instanceId).toBe('pod-1');
    });

    it('should return empty array when all equipment is fixed', () => {
      const fixedWeapon = createMockEquipment({
        name: 'Medium Laser',
        isOmniPodMounted: false,
      });
      const state = createOmniMechState({
        equipment: [fixedWeapon],
      });

      const pod = getPodEquipment(state);
      expect(pod).toHaveLength(0);
    });
  });

  describe('calculatePodSpace', () => {
    it('should return full slots when no fixed equipment', () => {
      const state = createOmniMechState({ equipment: [] });
      // Left Arm has 12 slots
      const podSpace = calculatePodSpace(state, MechLocation.LEFT_ARM);
      expect(podSpace).toBe(12);
    });

    it('should subtract fixed equipment slots', () => {
      const fixedWeapon = createMockEquipment({
        name: 'Large Laser',
        criticalSlots: 2,
        location: MechLocation.LEFT_ARM,
        isOmniPodMounted: false,
      });
      const state = createOmniMechState({ equipment: [fixedWeapon] });

      const podSpace = calculatePodSpace(state, MechLocation.LEFT_ARM);
      expect(podSpace).toBe(10); // 12 - 2
    });

    it('should not count pod-mounted equipment against pod space', () => {
      const podWeapon = createMockEquipment({
        name: 'ER Large Laser',
        criticalSlots: 2,
        location: MechLocation.LEFT_ARM,
        isOmniPodMounted: true,
      });
      const state = createOmniMechState({ equipment: [podWeapon] });

      // Pod-mounted equipment doesn't reduce pod space
      const podSpace = calculatePodSpace(state, MechLocation.LEFT_ARM);
      expect(podSpace).toBe(12);
    });

    it('should handle head location (6 slots)', () => {
      const state = createOmniMechState({ equipment: [] });
      const podSpace = calculatePodSpace(state, MechLocation.HEAD);
      expect(podSpace).toBe(6);
    });
  });

  describe('getEffectiveBaseChassisHeatSinks', () => {
    it('should return baseChassisHeatSinks when set', () => {
      const state = createOmniMechState({ baseChassisHeatSinks: 15 });
      expect(getEffectiveBaseChassisHeatSinks(state)).toBe(15);
    });

    it('should return engine integral heat sinks when -1', () => {
      // Engine rating 300 = 12 integral heat sinks (300/25 = 12)
      const state = createOmniMechState({
        baseChassisHeatSinks: -1,
        engineRating: 300,
      });
      expect(getEffectiveBaseChassisHeatSinks(state)).toBe(12);
    });

    it('should return full engine integral heat sinks for high rating', () => {
      // Engine rating 400 = 16 integral heat sinks (400/25 = 16)
      // Note: integral capacity is not capped - all can fit in engine
      const state = createOmniMechState({
        baseChassisHeatSinks: -1,
        engineRating: 400,
      });
      expect(getEffectiveBaseChassisHeatSinks(state)).toBe(16);
    });
  });
});
