import { calculateUnitBV, type UnitData } from '@/utils/construction/bvAdapter';

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
  describe('calculateUnitBV', () => {
    it('returns a positive BV for a valid BattleMech', () => {
      const result = calculateUnitBV(createStalkerUnitData());
      expect(result).toBeGreaterThan(0);
    });

    it('rejects a vehicle without its family BV inputs', () => {
      const vehicleData: UnitData = {
        ...createMinimalBattleMech(),
        unitType: 'Vehicle',
      };
      expect(() => calculateUnitBV(vehicleData)).toThrow();
    });

    it('rejects an unsupported AeroSpaceFighter unit type', () => {
      const aeroData: UnitData = {
        ...createMinimalBattleMech(),
        unitType: 'AeroSpaceFighter',
      };
      expect(() => calculateUnitBV(aeroData)).toThrow(
        'Unsupported BV unitType: AeroSpaceFighter',
      );
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
});
