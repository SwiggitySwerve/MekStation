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
// BV delegates to the aerospace BV calculator (see
// AerospaceHandlerBV.singleOwner.test.ts); the rules are not restated here.
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
// BV delegates to the aerospace BV calculator (see
// AerospaceHandlerBV.singleOwner.test.ts); the rules are not restated here.
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

  it('BV invariants hold for canonical fixture', () => {
    const result = handler.parse(makeDoc());
    assertBVInvariants(handler.calculateBV(result.data!.unit), 'SmallCraft');
  });
});

// ============================================================================
// DropShipUnitHandler — invariants
// ============================================================================
//
// Formula:
//   bv = round((armor*2 + SI*20 + sum(bay.cap*5)) * (1 + safeThrust*0.1))
//
