import { NodeCanonicalUnitService } from '@/services/units/NodeCanonicalUnitService';
import { GroundMotionType } from '@/types/unit/BaseUnitInterfaces';
import { calculateUnitBV } from '@/utils/construction/bvAdapter';

import { calculateVehicleBV } from '../vehicleBV';
import { baseInput } from './vehicleBV.test.helpers';

// P1 full.jsonl SHA-256 4e19c56b957de2a8fc70dbfd131e76b64caa05adf8ba145b1610cc6b3ec37d87.
// Each row below cites battleValue.total under expected-reference-policy.json:
// MegaMek 48fcb2f64, MML 62bf193, mm-data 50f7efe; ignore C3/skill/TAG.
describe('Canonical vehicles (pinned MegaMek BV)', () => {
  const catalog = new NodeCanonicalUnitService(process.cwd());
  it.each([
    // Row 8283: vehicles/3039u/Demolisher Heavy Tank (Mk. I).blk
    ['demolisher-heavy-tank-mk-i', 981],
    // Row 8334: vehicles/3039u/Manticore Heavy Tank.blk
    ['manticore-heavy-tank', 993],
    // Row 8375: vehicles/3039u/Savannah Master Hovercraft.blk
    ['savannah-master-hovercraft', 215],
    // Row 8403: vehicles/3039u/Warrior H-7 Attack Helicopter.blk
    ['warrior-attack-helicopter-h-7', 295],
    // Row 8330: vehicles/3039u/LRM Carrier.blk
    ['lrm-carrier', 833],
  ] as const)('%s matches its pinned reference BV', (id, expectedBV) => {
    const unit = catalog.getByIdSync(id, { family: 'vehicles', strict: true });
    if (!unit) throw new Error(`Missing canonical vehicle ${id}`);
    expect(calculateUnitBV(unit)).toBe(expectedBV);
  });
});

describe('Synthetic vehicle rule scenarios', () => {
  it('Demolisher: tracked + single turret -> neutral turret mod, positive BV', () => {
    const bv = calculateVehicleBV(
      baseInput({
        motionType: GroundMotionType.TRACKED,
        cruiseMP: 2,
        flankMP: 3,
        tonnage: 80,
        totalArmorPoints: 176,
        totalStructurePoints: 40,
        turret: { kind: 'single' },
        weapons: [
          {
            id: 'ac-20',
            location: 'turret',
            bvOverride: 178,
            isTurretMounted: true,
          },
          {
            id: 'ac-20',
            location: 'turret',
            bvOverride: 178,
            isTurretMounted: true,
          },
        ],
      }),
    );
    expect(bv.turretModifier).toBe(1);
    expect(bv.final).toBeGreaterThan(0);
    expect(bv.offensive).toBeGreaterThan(0);
    expect(bv.defensive).toBeGreaterThan(0);
  });

  it('Manticore: mixed turret + front weapon yields reasonable BV components', () => {
    const bv = calculateVehicleBV(
      baseInput({
        motionType: GroundMotionType.TRACKED,
        cruiseMP: 4,
        flankMP: 6,
        tonnage: 60,
        totalArmorPoints: 176,
        totalStructurePoints: 30,
        turret: { kind: 'single' },
        weapons: [
          { id: 'medium-laser', location: 'front', bvOverride: 46 },
          {
            id: 'ppc',
            location: 'turret',
            bvOverride: 176,
            isTurretMounted: true,
          },
          {
            id: 'lrm-10',
            location: 'turret',
            bvOverride: 90,
            isTurretMounted: true,
          },
          {
            id: 'srm-6',
            location: 'turret',
            bvOverride: 59,
            isTurretMounted: true,
          },
        ],
      }),
    );
    expect(bv.turretModifier).toBe(1);
    expect(bv.defensive).toBeGreaterThan(0);
    expect(bv.offensive).toBeGreaterThan(0);
    expect(bv.final).toBeGreaterThan(500);
  });

  it('Savannah Master: hover flank 11 -> TMM 4, sf ~= 1.78', () => {
    const bv = calculateVehicleBV(
      baseInput({
        motionType: GroundMotionType.HOVER,
        cruiseMP: 8,
        flankMP: 12,
        tonnage: 5,
        totalArmorPoints: 20,
        totalStructurePoints: 3,
        weapons: [{ id: 'small-laser', location: 'front', bvOverride: 9 }],
      }),
    );
    expect(bv.tmm).toBe(4);
    expect(bv.speedFactor).toBeGreaterThan(1.7);
    expect(bv.final).toBeGreaterThan(0);
  });

  it('Warrior VTOL: VTOL flank 12 -> TMM 5 (4 base + 1 altitude)', () => {
    const bv = calculateVehicleBV(
      baseInput({
        motionType: GroundMotionType.VTOL,
        cruiseMP: 8,
        flankMP: 12,
        tonnage: 20,
        totalArmorPoints: 52,
        totalStructurePoints: 10,
        weapons: [{ id: 'lrm-10', location: 'front', bvOverride: 90 }],
      }),
    );
    expect(bv.tmm).toBe(5);
    expect(bv.defensiveFactor).toBeCloseTo(1.5, 4);
  });

  it('LRM Carrier: 10 LRM-20s produce large offensive BV', () => {
    const bv = calculateVehicleBV(
      baseInput({
        motionType: GroundMotionType.TRACKED,
        cruiseMP: 3,
        flankMP: 5,
        tonnage: 60,
        totalArmorPoints: 72,
        totalStructurePoints: 30,
        weapons: Array.from({ length: 10 }, (_, i) => ({
          id: `lrm-20-${i}`,
          location: 'front',
          bvOverride: 181,
        })),
      }),
    );
    expect(bv.offensive).toBeGreaterThan(1500);
    expect(bv.final).toBeGreaterThan(0);
  });
});
