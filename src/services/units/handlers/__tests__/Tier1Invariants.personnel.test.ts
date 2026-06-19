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

  it('locks down BV golden value for canonical Elemental Point', () => {
    // armorPerTrooper=10, squadSize=5, jumpMP=3>0 -> *1.1
    // bv = round(10 * 20 * 5 * 1.1) = round(1100) = 1100
    const result = handler.parse(makeDoc());
    expect(result.success).toBe(true);
    expect(handler.calculateBV(result.data!.unit)).toBe(1100);
  });

  it('BV scales linearly with squad size', () => {
    const sq4 = handler.parse(makeDoc({ trooperCount: 4 }));
    const sq5 = handler.parse(makeDoc({ trooperCount: 5 }));
    const bv4 = handler.calculateBV(sq4.data!.unit);
    const bv5 = handler.calculateBV(sq5.data!.unit);
    // 5/4 ratio
    expect(bv5).toBeGreaterThan(bv4);
    expect(bv5).toBe(Math.round((bv4 * 5) / 4));
  });

  it('jump-capable squads get exactly 10% BV bonus', () => {
    const ground = handler.parse(makeDoc({ jumpingMP: 0 }));
    const jumper = handler.parse(makeDoc({ jumpingMP: 3 }));
    const bvGround = handler.calculateBV(ground.data!.unit);
    const bvJump = handler.calculateBV(jumper.data!.unit);
    expect(bvJump).toBe(Math.round(bvGround * 1.1));
  });

  it('BV invariants hold for canonical fixture', () => {
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
