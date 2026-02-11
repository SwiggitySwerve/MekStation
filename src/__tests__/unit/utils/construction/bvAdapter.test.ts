import { _resetCalculationService } from '@/services/construction/CalculationService';
import {
  calculateUnitBV,
  unitDataToEditableMech,
  type UnitData,
} from '@/utils/construction/bvAdapter';

const mockEquipment: Map<
  string,
  { battleValue?: number; heat?: number; cost?: number; category?: string }
> = new Map([
  [
    'medium-laser',
    { battleValue: 46, heat: 3, cost: 40000, category: 'Energy' },
  ],
  [
    'large-laser',
    { battleValue: 123, heat: 8, cost: 100000, category: 'Energy' },
  ],
  ['lrm-10', { battleValue: 90, heat: 4, cost: 100000, category: 'Missile' }],
]);

jest.mock('@/services/equipment/EquipmentRegistry', () => ({
  getEquipmentRegistry: () => ({
    isReady: () => true,
    initialize: jest.fn().mockResolvedValue(undefined),
    lookup: (id: string) => {
      const equipment = mockEquipment.get(id.toLowerCase());
      if (equipment) {
        return { found: true, equipment, category: equipment.category };
      }
      return { found: false, equipment: null, category: null };
    },
  }),
}));

function createStalkerUnitData(): UnitData {
  return {
    id: 'stalker-ii-stk-9a',
    chassis: 'Stalker II',
    model: 'STK-9A',
    unitType: 'BattleMech',
    tonnage: 85,
    techBase: 'INNER_SPHERE',
    engine: { type: 'FUSION', rating: 255 },
    gyro: { type: 'COMPACT' },
    cockpit: 'TORSO_MOUNTED',
    structure: { type: 'ENDO_STEEL' },
    armor: {
      type: 'HARDENED',
      allocation: {
        HEAD: 9,
        CENTER_TORSO: { front: 36, rear: 11 },
        LEFT_TORSO: { front: 25, rear: 7 },
        RIGHT_TORSO: { front: 25, rear: 7 },
        LEFT_ARM: 23,
        RIGHT_ARM: 23,
        LEFT_LEG: 25,
        RIGHT_LEG: 25,
      },
    },
    heatSinks: { type: 'DOUBLE', count: 10 },
    movement: { walk: 3, jump: 0 },
    equipment: [
      { id: 'medium-laser', location: 'LEFT_ARM' },
      { id: 'medium-laser', location: 'LEFT_ARM' },
      { id: 'medium-laser', location: 'RIGHT_ARM' },
      { id: 'medium-laser', location: 'RIGHT_ARM' },
      { id: 'medium-laser', location: 'CENTER_TORSO' },
      { id: 'medium-laser', location: 'CENTER_TORSO' },
      { id: 'medium-laser', location: 'HEAD' },
      { id: 'medium-laser', location: 'HEAD' },
    ],
  };
}

function createMinimalBattleMech(): UnitData {
  return {
    unitType: 'BattleMech',
    tonnage: 20,
    engine: { type: 'FUSION', rating: 120 },
    armor: {
      type: 'STANDARD',
      allocation: {
        HEAD: 6,
        CENTER_TORSO: { front: 8, rear: 4 },
        LEFT_TORSO: { front: 6, rear: 3 },
        RIGHT_TORSO: { front: 6, rear: 3 },
        LEFT_ARM: 4,
        RIGHT_ARM: 4,
        LEFT_LEG: 6,
        RIGHT_LEG: 6,
      },
    },
    heatSinks: { type: 'SINGLE', count: 10 },
    movement: { walk: 6 },
    equipment: [],
  };
}

describe('bvAdapter', () => {
  beforeEach(() => {
    _resetCalculationService();
  });

  afterEach(() => {
    _resetCalculationService();
  });

  describe('calculateUnitBV', () => {
    it('returns a positive BV for a valid BattleMech', () => {
      const result = calculateUnitBV(createStalkerUnitData());
      expect(result).toBeGreaterThan(0);
    });

    it('returns 0 for unsupported unit types', () => {
      const vehicleData: UnitData = {
        ...createMinimalBattleMech(),
        unitType: 'Vehicle',
      };
      expect(calculateUnitBV(vehicleData)).toBe(0);
    });

    it('returns 0 for AeroSpaceFighter unit type', () => {
      const aeroData: UnitData = {
        ...createMinimalBattleMech(),
        unitType: 'AeroSpaceFighter',
      };
      expect(calculateUnitBV(aeroData)).toBe(0);
    });

    it('accepts Biped as a valid unit type', () => {
      const bipedData: UnitData = {
        ...createMinimalBattleMech(),
        unitType: 'Biped',
      };
      expect(calculateUnitBV(bipedData)).toBeGreaterThan(0);
    });

    it('accepts Quad as a valid unit type', () => {
      const quadData: UnitData = {
        ...createMinimalBattleMech(),
        unitType: 'Quad',
      };
      expect(calculateUnitBV(quadData)).toBeGreaterThan(0);
    });

    it('returns BV for a mech with no equipment (tonnage-only BV)', () => {
      const result = calculateUnitBV(createMinimalBattleMech());
      expect(result).toBeGreaterThan(0);
    });

    it('returns higher BV for a mech with weapons than without', () => {
      const withoutWeapons = calculateUnitBV(createMinimalBattleMech());
      const withWeapons = calculateUnitBV({
        ...createMinimalBattleMech(),
        equipment: [
          { id: 'large-laser', location: 'RIGHT_ARM' },
          { id: 'medium-laser', location: 'LEFT_ARM' },
        ],
      });
      expect(withWeapons).toBeGreaterThan(withoutWeapons);
    });

    it('returns integer BV values', () => {
      const result = calculateUnitBV(createStalkerUnitData());
      expect(Number.isInteger(result)).toBe(true);
    });
  });

  describe('unitDataToEditableMech', () => {
    it('maps tonnage correctly', () => {
      const mech = unitDataToEditableMech(createStalkerUnitData());
      expect(mech.tonnage).toBe(85);
    });

    it('maps chassis and variant', () => {
      const mech = unitDataToEditableMech(createStalkerUnitData());
      expect(mech.chassis).toBe('Stalker II');
      expect(mech.variant).toBe('STK-9A');
    });

    it('normalizes engine type from UPPER_SNAKE to lowercase-hyphenated', () => {
      const mech = unitDataToEditableMech(createStalkerUnitData());
      expect(mech.engineType).toBe('fusion');
    });

    it('normalizes structure type', () => {
      const mech = unitDataToEditableMech(createStalkerUnitData());
      expect(mech.structureType).toBe('endo-steel');
    });

    it('normalizes gyro type', () => {
      const mech = unitDataToEditableMech(createStalkerUnitData());
      expect(mech.gyroType).toBe('compact');
    });

    it('normalizes cockpit type', () => {
      const mech = unitDataToEditableMech(createStalkerUnitData());
      expect(mech.cockpitType).toBe('torso-mounted');
    });

    it('maps armor allocation with front/rear split', () => {
      const mech = unitDataToEditableMech(createStalkerUnitData());
      expect(mech.armorAllocation.head).toBe(9);
      expect(mech.armorAllocation.centerTorso).toBe(36);
      expect(mech.armorAllocation.centerTorsoRear).toBe(11);
      expect(mech.armorAllocation.leftTorso).toBe(25);
      expect(mech.armorAllocation.leftTorsoRear).toBe(7);
      expect(mech.armorAllocation.leftArm).toBe(23);
      expect(mech.armorAllocation.rightArm).toBe(23);
      expect(mech.armorAllocation.leftLeg).toBe(25);
      expect(mech.armorAllocation.rightLeg).toBe(25);
    });

    it('maps double heat sinks to double-is', () => {
      const mech = unitDataToEditableMech(createStalkerUnitData());
      expect(mech.heatSinkType).toBe('double-is');
    });

    it('maps single heat sinks', () => {
      const mech = unitDataToEditableMech(createMinimalBattleMech());
      expect(mech.heatSinkType).toBe('single');
    });

    it('maps equipment array to IEquipmentSlot format', () => {
      const mech = unitDataToEditableMech(createStalkerUnitData());
      expect(mech.equipment).toHaveLength(8);
      expect(mech.equipment[0]).toEqual({
        equipmentId: 'medium-laser',
        location: 'LEFT_ARM',
        slotIndex: 0,
      });
    });

    it('handles empty equipment list', () => {
      const mech = unitDataToEditableMech(createMinimalBattleMech());
      expect(mech.equipment).toHaveLength(0);
    });

    it('provides defaults for optional fields', () => {
      const mech = unitDataToEditableMech(createMinimalBattleMech());
      expect(mech.id).toBe('bv-adapter-unit');
      expect(mech.chassis).toBe('Unknown');
      expect(mech.variant).toBe('Unknown');
      expect(mech.structureType).toBe('standard');
      expect(mech.gyroType).toBe('standard');
      expect(mech.cockpitType).toBe('standard');
    });

    it('maps walkMP from movement.walk', () => {
      const mech = unitDataToEditableMech(createStalkerUnitData());
      expect(mech.walkMP).toBe(3);
    });

    it('maps engineRating from engine.rating', () => {
      const mech = unitDataToEditableMech(createStalkerUnitData());
      expect(mech.engineRating).toBe(255);
    });
  });
});
