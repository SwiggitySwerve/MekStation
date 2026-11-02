/**
 * Tier 1 Handler Invariants — Parity-Style Golden Tests
 *
 * Each block locks down a handler's calculate*() output against a hand-derived
 * exact value computed from the production formula. Tests assert RULE INVARIANTS
 * (BV must be a non-negative integer, BV scales linearly with armor, etc.) plus
 * exact golden values for canonical fixtures, NOT internal call shapes.
 *
 * When a handler's BV/weight/cost formula changes intentionally, update the
 * golden value in the relevant block. When it changes UNINTENTIONALLY, the
 * golden trips and surfaces the regression.
 *
 * Capital ships (JumpShip, SpaceStation, WarShip) get extra coverage because
 * they're BV-load-bearing and were recently refactored (#423).
 *
 * @see src/services/units/handlers/__tests__/PR-C2 plan
 */

import { IBlkDocument } from '@/types/formats/BlkFormat';
import { UnitType } from '@/types/unit/BattleMechInterfaces';
import { calculateBattleValueForUnit } from '@/utils/construction/battleValueCalculations';

import { createAerospaceHandler } from '../AerospaceUnitHandler';
import { createBattleArmorHandler } from '../BattleArmorUnitHandler';
import { createConventionalFighterHandler } from '../ConventionalFighterUnitHandler';
import { createDropShipHandler } from '../DropShipUnitHandler';
import { createInfantryHandler } from '../InfantryUnitHandler';
import { createJumpShipHandler } from '../JumpShipUnitHandler';
import { createProtoMechHandler } from '../ProtoMechUnitHandler';
import { createSmallCraftHandler } from '../SmallCraftUnitHandler';
import { createSpaceStationHandler } from '../SpaceStationUnitHandler';
import { createSupportVehicleHandler } from '../SupportVehicleUnitHandler';
import { createVehicleHandler } from '../VehicleUnitHandler';
import { createVTOLHandler } from '../VTOLUnitHandler';
import { createWarShipHandler } from '../WarShipUnitHandler';

// ============================================================================
// Shared invariant assertions
// ============================================================================

/**
 * BV is a non-negative integer (Math.round'd in production).
 * Every Tier 1 handler MUST satisfy this — broken if a handler returns NaN,
 * negative, or non-integer BV.
 */
function assertBVInvariants(bv: number, label: string): void {
  expect(Number.isFinite(bv)).toBe(true);
  expect(Number.isInteger(bv)).toBe(true);
  expect(bv).toBeGreaterThanOrEqual(0);
  // BV should be useful, not microscopic — if a unit returns BV<10 it usually
  // means a missing input was zeroed. Skip this for ProtoMech/Infantry which
  // delegate to external calc and may yield small values for stub fixtures.
  if (label !== 'ProtoMech' && label !== 'Infantry') {
    expect(bv).toBeGreaterThan(0);
  }
}

// ============================================================================
// VehicleUnitHandler — invariants
// ============================================================================
//
// Formula (calculateTypeSpecificBV):
//   bv = round(armorPts * 2.5 * (1 + (cruiseMP - 1) * 0.1))
// Cost (calculateTypeSpecificCost):
//   cost = round(tonnage*10000 + mp*tonnage*5000 + armorPts*10000)
//

describe('BattleArmorUnitHandler Tier 1 Invariants', () => {
  const handler = createBattleArmorHandler();

  function makeDoc(overrides: Partial<IBlkDocument> = {}): IBlkDocument {
    return {
      blockVersion: 1,
      version: 'MAM0',
      unitType: 'BattleArmor',
      mappedUnitType: UnitType.BATTLE_ARMOR,
      name: 'Elemental',
      model: 'Point',
      year: 2868,
      type: 'Clan Level 2',
      tonnage: 4,
      chassis: 'biped',
      trooperCount: 5,
      weightClass: 3,
      cruiseMP: 1,
      jumpingMP: 3,
      armor: [10],
      equipmentByLocation: {},
      rawTags: {},
      ...overrides,
    };
  }

  function defensive(overrides: Partial<IBlkDocument> = {}): number {
    const parsed = handler.parse(makeDoc(overrides));
    if (!parsed.success) throw new Error(parsed.error.errors.join('; '));
    const value = calculateBattleValueForUnit(parsed.data.unit);
    if (value?.kind !== 'battlearmor') throw new Error('Missing BA dispatch');
    return value.breakdown.perTrooper.defensive.total;
  }

  // The fixture is synthetic and unarmed, not an oracle Elemental source.
  // MegaMek 48fcb2f64 BattleArmorBVCalculator.java:84-111,257-274 and
  // BVCalculator.java:650-683: (1 + 10*2.5) * (1 + 2/10 + 0.1) = 33.8.
  it('matches pinned Java defense for the unarmed heavy Elemental fixture', () => {
    expect(defensive()).toBeCloseTo(33.8, 10);
  });

  it('keeps per-trooper defense independent of shooting strength', () => {
    expect(defensive({ trooperCount: 4 })).toBeCloseTo(33.8, 10);
    expect(defensive({ trooperCount: 5 })).toBeCloseTo(33.8, 10);
  });

  // BattleArmorBVCalculator.java:193-204 applies strength factor 7, not 5.
  // Its full unarmed total is round(33.8*7)=237, not the partial port's 169.
  it('matches the unarmed heavy Java total 237 with strength factor 7', () => {
    const parsed = handler.parse(makeDoc());
    expect(handler.calculateBV(parsed.data!.unit)).toBe(237);
  });

  it('applies jump TMM brackets to the Java defensive factor', () => {
    // BVCalculator.java:650-683: jumps 1/2 have TMM 1; jump 3 has TMM 2.
    // The ground run of 1 has TMM 0. This is not a flat jump percentage.
    expect(defensive({ jumpingMP: 0 })).toBeCloseTo(28.6, 10);
    expect(defensive({ jumpingMP: 1 })).toBeCloseTo(31.2, 10);
    expect(defensive({ jumpingMP: 2 })).toBeCloseTo(31.2, 10);
    expect(defensive({ jumpingMP: 3 })).toBeCloseTo(33.8, 10);
  });

  it('BV invariants hold for the synthetic unarmed fixture', () => {
    const result = handler.parse(makeDoc());
    assertBVInvariants(handler.calculateBV(result.data!.unit), 'BattleArmor');
  });
});

// ============================================================================
// InfantryUnitHandler — invariants (delegates to construction/infantry)
// ============================================================================
//
// Handler delegates BV to calculateInfantryBVFromUnit() which lives in the BV
// pipeline (PR-C1 territory). At the handler level we lock invariants only:
//   - BV is finite, non-negative, integer
//   - BV stays > 0 for a valid platoon
//   - Cost scales linearly with platoon strength
//

describe('InfantryUnitHandler Tier 1 Invariants', () => {
  const handler = createInfantryHandler();

  function makeDoc(overrides: Partial<IBlkDocument> = {}): IBlkDocument {
    return {
      blockVersion: 1,
      version: 'MAM0',
      unitType: 'Infantry',
      mappedUnitType: UnitType.INFANTRY,
      name: 'Foot Rifle Platoon',
      model: 'Standard',
      year: 2750,
      type: 'IS Level 1',
      tonnage: 0.1,
      motionType: 'Foot',
      squadSize: 7,
      squadn: 4,
      primary: 'Rifle',
      cruiseMP: 1,
      armor: [0],
      equipmentByLocation: {},
      rawTags: {},
      ...overrides,
    };
  }

  it('BV is finite, non-negative, and integer-valued', () => {
    const result = handler.parse(makeDoc());
    expect(result.success).toBe(true);
    const bv = handler.calculateBV(result.data!.unit);
    expect(Number.isFinite(bv)).toBe(true);
    expect(Number.isInteger(bv)).toBe(true);
    expect(bv).toBeGreaterThanOrEqual(0);
  });

  it('cost scales linearly with platoon strength', () => {
    // costPerSoldier (no armor kit, no anti-mech) = 1000
    const small = handler.parse(makeDoc({ squadSize: 4, squadn: 4 })); // 16 troopers
    const big = handler.parse(makeDoc({ squadSize: 7, squadn: 4 })); // 28 troopers

    const costSmall = handler.calculateCost(small.data!.unit);
    const costBig = handler.calculateCost(big.data!.unit);
    expect(costBig).toBeGreaterThan(costSmall);
    // exact ratio: 28/16 = 1.75
    expect(costBig).toBe(Math.round((costSmall * 28) / 16));
  });
});

// ============================================================================
// ProtoMechUnitHandler — invariants (delegates to construction/protomech)
// ============================================================================
//
// Handler delegates BV to calculateProtoMechBV() in the BV pipeline. Lock
// invariants only at the handler level.
//

describe('ProtoMechUnitHandler Tier 1 Invariants', () => {
  const handler = createProtoMechHandler();

  function makeDoc(overrides: Partial<IBlkDocument> = {}): IBlkDocument {
    return {
      blockVersion: 1,
      version: 'MAM0',
      unitType: 'ProtoMech',
      mappedUnitType: UnitType.PROTOMECH,
      name: 'Centaur',
      model: 'Standard',
      year: 3060,
      type: 'Clan Level 3',
      tonnage: 5,
      trooperCount: 5,
      cruiseMP: 5,
      jumpingMP: 0,
      armor: [2, 7, 2, 2, 4, 1],
      equipmentByLocation: {},
      rawTags: {},
      ...overrides,
    };
  }

  it('BV is finite, non-negative, and integer-valued', () => {
    const result = handler.parse(makeDoc());
    expect(result.success).toBe(true);
    const bv = handler.calculateBV(result.data!.unit);
    expect(Number.isFinite(bv)).toBe(true);
    expect(Number.isInteger(bv)).toBe(true);
    expect(bv).toBeGreaterThanOrEqual(0);
  });

  it('cost scales with tonnage (200k per ton baseline)', () => {
    const light = handler.parse(makeDoc({ tonnage: 4 }));
    const heavy = handler.parse(makeDoc({ tonnage: 8 }));
    const costLight = handler.calculateCost(light.data!.unit);
    const costHeavy = handler.calculateCost(heavy.data!.unit);
    expect(costHeavy).toBeGreaterThan(costLight);
  });
});

// ============================================================================
// SmallCraftUnitHandler — invariants
// ============================================================================
//
// Formula:
//   bv = round((armor*2 + SI*15) * (1 + safeThrust*0.1))
//
