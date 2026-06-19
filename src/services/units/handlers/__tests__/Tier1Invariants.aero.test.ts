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

describe('AerospaceUnitHandler Tier 1 Invariants', () => {
  const handler = createAerospaceHandler();

  function makeDoc(overrides: Partial<IBlkDocument> = {}): IBlkDocument {
    return {
      blockVersion: 1,
      version: 'MAM0',
      unitType: 'Aero',
      mappedUnitType: UnitType.AEROSPACE,
      name: 'Stuka',
      model: 'STU-K5',
      year: 2571,
      type: 'IS Level 2',
      tonnage: 100,
      safeThrust: 5,
      fuel: 400,
      structuralIntegrity: 8,
      heatsinks: 20,
      sinkType: 0,
      armor: [30, 24, 24, 18], // 96 total
      equipmentByLocation: {},
      rawTags: {},
      ...overrides,
    };
  }

  it('locks down BV golden value for canonical Stuka', () => {
    // armor=96, SI=8, thrust=5
    // base = 96*2 + 8*10 = 192 + 80 = 272
    // thrustMod = 1 + (5-5)*0.05 = 1.0
    // bv = round(272 * 1) = 272
    const result = handler.parse(makeDoc());
    expect(result.success).toBe(true);
    expect(handler.calculateBV(result.data!.unit)).toBe(272);
  });

  it('BV scales with thrust per documented thrust modifier', () => {
    const t5 = handler.parse(makeDoc({ safeThrust: 5 }));
    const t9 = handler.parse(makeDoc({ safeThrust: 9 }));
    const bv5 = handler.calculateBV(t5.data!.unit);
    const bv9 = handler.calculateBV(t9.data!.unit);
    // base*1.0 vs base*1.20 — exactly 20% more for thrust=9
    expect(bv9).toBe(Math.round(bv5 * 1.2));
  });

  it('BV invariants hold for canonical fixture', () => {
    const result = handler.parse(makeDoc());
    assertBVInvariants(handler.calculateBV(result.data!.unit), 'Aerospace');
  });

  it('locks down cost golden value for canonical Stuka', () => {
    // 100*50000 + 5*100*10000 + 96*10000 + 200000
    // = 5,000,000 + 5,000,000 + 960,000 + 200,000 = 11,160,000
    const result = handler.parse(makeDoc());
    expect(handler.calculateCost(result.data!.unit)).toBe(11_160_000);
  });
});

// ============================================================================
// ConventionalFighterUnitHandler — invariants
// ============================================================================
//
// Formula:
//   bv = round((armor*1.5 + SI*5) * (1 + (thrust - 5) * 0.03))
//

describe('ConventionalFighterUnitHandler Tier 1 Invariants', () => {
  const handler = createConventionalFighterHandler();

  function makeDoc(overrides: Partial<IBlkDocument> = {}): IBlkDocument {
    return {
      blockVersion: 1,
      version: 'MAM0',
      unitType: 'ConvFighter',
      mappedUnitType: UnitType.CONVENTIONAL_FIGHTER,
      name: 'F-92 Stingray',
      model: 'Standard',
      year: 3025,
      type: 'IS Level 2',
      tonnage: 50,
      safeThrust: 6,
      fuel: 160,
      structuralIntegrity: 6,
      heatsinks: 0,
      sinkType: 0,
      engineType: 0,
      armorType: 0,
      cockpitType: 0,
      armor: [16, 12, 12, 8], // 48 total
      equipmentByLocation: {},
      rawTags: {},
      ...overrides,
    };
  }

  it('locks down BV golden value for canonical Stingray', () => {
    // armor=48, SI=6, thrust=6
    // base = 48*1.5 + 6*5 = 72 + 30 = 102
    // mod = 1 + (6-5)*0.03 = 1.03
    // bv = round(102 * 1.03) = round(105.06) = 105
    const result = handler.parse(makeDoc());
    expect(result.success).toBe(true);
    expect(handler.calculateBV(result.data!.unit)).toBe(105);
  });

  it('BV invariants hold for canonical fixture', () => {
    const result = handler.parse(makeDoc());
    assertBVInvariants(
      handler.calculateBV(result.data!.unit),
      'ConventionalFighter',
    );
  });

  it('BV is lower than equivalent ASF (1.5x vs 2x armor multiplier)', () => {
    // Equal armor/SI/thrust between conv vs ASF — conv must always be lower BV.
    const convDoc = makeDoc({ safeThrust: 5, structuralIntegrity: 6 });
    const conv = handler.parse(convDoc);
    const convBV = handler.calculateBV(conv.data!.unit);

    const asf = createAerospaceHandler();
    const asfDoc: IBlkDocument = {
      ...convDoc,
      unitType: 'Aero',
      mappedUnitType: UnitType.AEROSPACE,
    };
    const asfRes = asf.parse(asfDoc);
    expect(asfRes.success).toBe(true);
    const asfBV = asf.calculateBV(asfRes.data!.unit);

    expect(asfBV).toBeGreaterThan(convBV);
  });
});

// ============================================================================
// VTOLUnitHandler — invariants
// ============================================================================
//
// Formula:
//   bv = round(armor * 2 * (1 + (cruiseMP - 1) * 0.15))
//

describe('SmallCraftUnitHandler Tier 1 Invariants', () => {
  const handler = createSmallCraftHandler();

  function makeDoc(overrides: Partial<IBlkDocument> = {}): IBlkDocument {
    return {
      blockVersion: 1,
      version: 'MAM0',
      unitType: 'Small Craft',
      mappedUnitType: UnitType.SMALL_CRAFT,
      name: 'K-1',
      model: 'Shuttle',
      year: 2470,
      type: 'IS Level 2',
      tonnage: 100,
      motionType: 'Aerodyne',
      safeThrust: 5,
      structuralIntegrity: 5,
      fuel: 500,
      heatsinks: 10,
      sinkType: 0,
      engineType: 0,
      armorType: 0,
      armor: [40, 30, 30, 20], // 120 total
      crew: 2,
      passengers: 8,
      escapePod: 2,
      lifeBoat: 0,
      equipmentByLocation: {},
      rawTags: { cargo: '5.0' },
      ...overrides,
    };
  }

  it('locks down BV golden value for canonical K-1 Shuttle', () => {
    // armor=120, SI=5, thrust=5
    // base = 120*2 + 5*15 = 240 + 75 = 315
    // mod = 1 + 5*0.1 = 1.5
    // bv = round(315 * 1.5) = round(472.5) = 473 (banker's rounding => 472? — Math.round in JS rounds half to +inf so 472.5 -> 473)
    const result = handler.parse(makeDoc());
    expect(result.success).toBe(true);
    expect(handler.calculateBV(result.data!.unit)).toBe(473);
  });

  it('BV invariants hold for canonical fixture', () => {
    const result = handler.parse(makeDoc());
    assertBVInvariants(handler.calculateBV(result.data!.unit), 'SmallCraft');
  });

  it('BV scales monotonically with safeThrust', () => {
    const slow = handler.parse(makeDoc({ safeThrust: 2 }));
    const fast = handler.parse(makeDoc({ safeThrust: 8 }));
    expect(handler.calculateBV(fast.data!.unit)).toBeGreaterThan(
      handler.calculateBV(slow.data!.unit),
    );
  });
});

// ============================================================================
// DropShipUnitHandler — invariants
// ============================================================================
//
// Formula:
//   bv = round((armor*2 + SI*20 + sum(bay.cap*5)) * (1 + safeThrust*0.1))
//
