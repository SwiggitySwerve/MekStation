import { NodeCanonicalUnitService } from '@/services/units/NodeCanonicalUnitService';
import { calculateUnitBV, type UnitData } from '@/utils/construction/bvAdapter';
import { resolveEquipmentBV } from '@/utils/construction/equipmentBVResolver';

// P1 full.jsonl (SHA-256 4e19c56b957de2a8fc70dbfd131e76b64caa05adf8ba145b1610cc6b3ec37d87),
// row 6260: meks/3145/Marik/Stalker II STK-9A.mtf, battleValue.total.
// Policy: config/reference-policy/expected-reference-policy.json;
// MegaMek 48fcb2f64, MML 62bf193, mm-data 50f7efe.
const STALKER_REFERENCE_BV = 2261;
const catalog = new NodeCanonicalUnitService(process.cwd());

function createStalkerUnitData() {
  const unit = catalog.getByIdSync('stalker-ii-stk-9a', { strict: true });
  if (!unit) throw new Error('Missing canonical Stalker II STK-9A');
  return unit;
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
    it('matches the pinned BV for the canonical Stalker II STK-9A', () => {
      const result = calculateUnitBV(createStalkerUnitData());
      expect(result).toBe(STALKER_REFERENCE_BV);
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

      // BVCalculator.processWeapons/processOffensiveType: a front medium laser
      // stays below the heat limit here and receives no arc/heat penalty.
      // The documented speed formula for walk 6/run 9 gives 1.50. Its BV delta
      // is integral, so rounding final BV preserves the delta exactly.
      const withMediumLaser = calculateUnitBV({
        ...createMinimalBattleMech(),
        equipment: [{ id: 'medium-laser', location: 'LEFT_ARM' }],
      });
      expect(withMediumLaser - withoutWeapons).toBe(
        resolveEquipmentBV('medium-laser').battleValue * 1.5,
      );
    });

    it('retains the pinned rounded BV for the canonical Stalker II STK-9A', () => {
      const result = calculateUnitBV(createStalkerUnitData());
      expect(result).toBe(STALKER_REFERENCE_BV);
    });
  });
});
