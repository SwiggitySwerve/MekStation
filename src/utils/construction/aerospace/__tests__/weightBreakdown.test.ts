/**
 * Aerospace weight-breakdown invariants.
 *
 * Total used = engine + extra-SI + fuel + armor + extra-heat-sinks + cockpit
 *            + (small-craft quarters) + equipment.
 * The first 10 heat sinks are engine-integral (free).
 * Standard cockpit = 3 t, small = 2 t, primitive = 5 t, command-console = 6 t.
 */

import {
  AerospaceEngineType,
  AerospaceSubType,
} from '@/types/unit/AerospaceInterfaces';

import {
  cockpitTons,
  computeWeightBreakdown,
  heatSinkExtraTons,
} from '../weightBreakdown';

describe('cockpitTons', () => {
  it('uses 3 t for the standard cockpit (default)', () => {
    expect(cockpitTons('Standard')).toBe(3);
    expect(cockpitTons('UnknownCockpit')).toBe(3); // default fallback
  });

  it('matches per-type tonnage table', () => {
    expect(cockpitTons('Small')).toBe(2);
    expect(cockpitTons('Primitive')).toBe(5);
    expect(cockpitTons('Command Console')).toBe(6);
  });
});

describe('heatSinkExtraTons (engine-free baseline)', () => {
  it('returns 0 when ≤10 heat sinks (all engine-integral)', () => {
    expect(heatSinkExtraTons(10)).toBe(0);
    expect(heatSinkExtraTons(5)).toBe(0);
  });

  it('charges 1 t per sink above 10', () => {
    expect(heatSinkExtraTons(11)).toBe(1);
    expect(heatSinkExtraTons(20)).toBe(10);
  });
});

describe('computeWeightBreakdown', () => {
  it('aggregates all components and computes remaining tonnage', () => {
    const bd = computeWeightBreakdown({
      tonnage: 50,
      subType: AerospaceSubType.AEROSPACE_FIGHTER,
      engineRating: 200, // table = 8.5 t fusion
      engineType: AerospaceEngineType.FUSION,
      structuralIntegrity: 5, // default for 50 t = 5 → no extra cost
      fuelTons: 5,
      armorTons: 4,
      totalHeatSinks: 12, // 2 t extra
      cockpitType: 'Standard', // 3 t
      equipmentTons: 8,
      crew: null,
    });

    expect(bd.engineTons).toBe(8.5);
    expect(bd.siTons).toBe(0); // SI 5 = default for 50 t
    expect(bd.fuelTons).toBe(5);
    expect(bd.armorTons).toBe(4);
    expect(bd.heatSinkTons).toBe(2);
    expect(bd.cockpitTons).toBe(3);
    expect(bd.quartersTons).toBe(0);
    expect(bd.equipmentTons).toBe(8);
    expect(bd.totalUsed).toBeCloseTo(8.5 + 0 + 5 + 4 + 2 + 3 + 0 + 8, 5);
    expect(bd.remaining).toBeCloseTo(50 - bd.totalUsed, 5);
  });

  it('charges extra SI tonnage when above default', () => {
    const bd = computeWeightBreakdown({
      tonnage: 100,
      subType: AerospaceSubType.AEROSPACE_FIGHTER,
      engineRating: 300, // 17.5 t fusion
      engineType: AerospaceEngineType.FUSION,
      structuralIntegrity: 12, // default 10 → +2 → 2 × (100/10) × 0.5 = 10 t
      fuelTons: 5,
      armorTons: 0,
      totalHeatSinks: 10,
      cockpitType: 'Standard',
      equipmentTons: 0,
      crew: null,
    });
    expect(bd.siTons).toBe(10);
  });

  it('includes small-craft quarters tonnage', () => {
    const bd = computeWeightBreakdown({
      tonnage: 200,
      subType: AerospaceSubType.SMALL_CRAFT,
      engineRating: 300,
      engineType: AerospaceEngineType.FUSION,
      structuralIntegrity: 20,
      fuelTons: 20,
      armorTons: 5,
      totalHeatSinks: 15,
      cockpitType: 'Standard',
      equipmentTons: 0,
      crew: { crew: 4, passengers: 0, marines: 0, quartersTons: 20 },
    });
    expect(bd.quartersTons).toBe(20);
    // totalUsed must include the 20-t quarters
    expect(bd.totalUsed).toBeGreaterThanOrEqual(20);
  });

  it('produces negative remaining when over-budget', () => {
    const bd = computeWeightBreakdown({
      tonnage: 30,
      subType: AerospaceSubType.AEROSPACE_FIGHTER,
      engineRating: 200,
      engineType: AerospaceEngineType.FUSION,
      structuralIntegrity: 3,
      fuelTons: 5,
      armorTons: 5,
      totalHeatSinks: 10,
      cockpitType: 'Standard',
      equipmentTons: 50, // way too much
      crew: null,
    });
    expect(bd.remaining).toBeLessThan(0);
  });
});
