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

describe('VehicleUnitHandler Tier 1 Invariants', () => {
  const handler = createVehicleHandler();

  function makeDoc(overrides: Partial<IBlkDocument> = {}): IBlkDocument {
    return {
      blockVersion: 1,
      version: 'MAM0',
      unitType: 'Tank',
      mappedUnitType: UnitType.VEHICLE,
      name: 'Scorpion',
      model: 'Light Tank',
      year: 2807,
      type: 'IS Level 1',
      tonnage: 25,
      cruiseMP: 4,
      armor: [16, 12, 12, 10, 8], // 58 total
      equipmentByLocation: {},
      rawTags: {},
      ...overrides,
    };
  }

  it('locks down BV golden value for canonical Scorpion Light Tank', () => {
    // 58 armor * 2.5 = 145, *(1 + 3*0.1)=1.3 -> 188.5 -> round -> 189
    const result = handler.parse(makeDoc());
    expect(result.success).toBe(true);
    const bv = handler.calculateBV(result.data!.unit);
    expect(bv).toBe(189);
  });

  it('BV scales linearly with armor when cruiseMP held constant', () => {
    // cruiseMP=4 -> mod=1.3; choose armor totals that yield integer pre-round
    // values so the doubling invariant holds without rounding asymmetry.
    // 40 pts * 2.5 * 1.3 = 130 (integer). 80 pts -> 260.
    const lo = handler.parse(makeDoc({ armor: [10, 10, 10, 5, 5] })); // 40 pts
    const hi = handler.parse(makeDoc({ armor: [20, 20, 20, 10, 10] })); // 80 pts
    const bvLo = handler.calculateBV(lo.data!.unit);
    const bvHi = handler.calculateBV(hi.data!.unit);
    expect(bvLo).toBe(130);
    expect(bvHi).toBe(260);
    // doubling armor doubles BV
    expect(bvHi).toBe(bvLo * 2);
  });

  it('BV increases monotonically with cruiseMP when armor held constant', () => {
    const slow = handler.parse(makeDoc({ cruiseMP: 2 }));
    const fast = handler.parse(makeDoc({ cruiseMP: 8 }));
    const bvSlow = handler.calculateBV(slow.data!.unit);
    const bvFast = handler.calculateBV(fast.data!.unit);
    expect(bvFast).toBeGreaterThan(bvSlow);
  });

  it('BV invariants hold for canonical fixture', () => {
    const result = handler.parse(makeDoc());
    assertBVInvariants(handler.calculateBV(result.data!.unit), 'Vehicle');
  });

  it('locks down cost golden value for canonical Scorpion Light Tank', () => {
    // tonnage=25, mp=4, armor=58
    // 25*10000 + 4*25*5000 + 58*10000 = 250000 + 500000 + 580000 = 1,330,000
    const result = handler.parse(makeDoc());
    expect(handler.calculateCost(result.data!.unit)).toBe(1_330_000);
  });
});

// ============================================================================
// AerospaceUnitHandler — invariants
// ============================================================================
//
// Formula (calculateTypeSpecificBV):
//   bv = round((armor*2 + SI*10) * (1 + (safeThrust - 5) * 0.05))
// Cost:
//   cost = round(tonnage*50000 + thrust*tonnage*10000 + armor*10000 + 200000)
//

describe('VTOLUnitHandler Tier 1 Invariants', () => {
  const handler = createVTOLHandler();

  function makeDoc(overrides: Partial<IBlkDocument> = {}): IBlkDocument {
    return {
      blockVersion: 1,
      version: 'MAM0',
      unitType: 'VTOL',
      mappedUnitType: UnitType.VTOL,
      name: 'Warrior',
      model: 'H-7',
      year: 2957,
      type: 'IS Level 1',
      tonnage: 21,
      cruiseMP: 10,
      armor: [16, 10, 10, 8, 2], // 46 total
      equipmentByLocation: {},
      rawTags: {},
      ...overrides,
    };
  }

  it('locks down BV golden value for canonical Warrior H-7', () => {
    // armor=46, mp=10
    // base = 46 * 2 = 92
    // mod = 1 + (10-1)*0.15 = 1 + 1.35 = 2.35
    // bv = round(92 * 2.35) = round(216.2) = 216
    const result = handler.parse(makeDoc());
    expect(result.success).toBe(true);
    expect(handler.calculateBV(result.data!.unit)).toBe(216);
  });

  it('BV invariants hold for canonical fixture', () => {
    const result = handler.parse(makeDoc());
    assertBVInvariants(handler.calculateBV(result.data!.unit), 'VTOL');
  });

  it('VTOL movement multiplier is exactly 0.15 per cruiseMP', () => {
    // Hold armor constant; vary cruiseMP. At mp=1: mod=1.0. At mp=11: mod=1+10*0.15=2.5.
    // BV ratio between mp=11 and mp=1 should be exactly 2.5.
    const slow = handler.parse(makeDoc({ cruiseMP: 1 }));
    const fast = handler.parse(makeDoc({ cruiseMP: 11 }));
    const bvSlow = handler.calculateBV(slow.data!.unit);
    const bvFast = handler.calculateBV(fast.data!.unit);
    // armor=46, mp=1: 46*2*1.0=92; mp=11: 46*2*2.5=230 -> ratio 2.5
    expect(bvSlow).toBe(92);
    expect(bvFast).toBe(230);
  });
});

// ============================================================================
// SupportVehicleUnitHandler — invariants
// ============================================================================
//
// Formula:
//   bv = round(armor * 1.5 * (barRating/10) * (1 + cruiseMP * 0.05))
//   (mp branch only fires when cruiseMP > 0)
//

describe('SupportVehicleUnitHandler Tier 1 Invariants', () => {
  const handler = createSupportVehicleHandler();

  function makeDoc(overrides: Partial<IBlkDocument> = {}): IBlkDocument {
    return {
      blockVersion: 1,
      version: 'MAM0',
      unitType: 'SupportTank',
      mappedUnitType: UnitType.SUPPORT_VEHICLE,
      name: 'Cargo Truck',
      model: 'Standard',
      year: 3025,
      type: 'IS Level 1',
      tonnage: 20,
      cruiseMP: 4,
      armor: [8, 6, 6, 4], // 24 total
      equipmentByLocation: {},
      rawTags: {
        bar: '5',
        cargo: '5',
      },
      ...overrides,
    };
  }

  it('locks down BV golden value for canonical Cargo Truck', () => {
    // armor=24, BAR=5, mp=4
    // base = 24 * 1.5 * (5/10) = 24 * 1.5 * 0.5 = 18
    // mod = 1 + 4*0.05 = 1.2
    // bv = round(18 * 1.2) = round(21.6) = 22
    const result = handler.parse(makeDoc());
    expect(result.success).toBe(true);
    expect(handler.calculateBV(result.data!.unit)).toBe(22);
  });

  it('BV invariants hold for canonical fixture', () => {
    const result = handler.parse(makeDoc());
    assertBVInvariants(
      handler.calculateBV(result.data!.unit),
      'SupportVehicle',
    );
  });

  it('BV scales linearly with BAR rating', () => {
    // Pick armor=20 so the formula yields exact integers and rounding doesn't
    // bite the linearity claim.
    // 20 * 1.5 * (BAR/10) * (1 + 4*0.05) = 20 * 1.5 * (BAR/10) * 1.2
    // BAR=5  -> 20*1.5*0.5*1.2 = 18
    // BAR=10 -> 20*1.5*1.0*1.2 = 36
    const bar5 = handler.parse(
      makeDoc({ armor: [5, 5, 5, 5], rawTags: { bar: '5', cargo: '5' } }),
    );
    const bar10 = handler.parse(
      makeDoc({ armor: [5, 5, 5, 5], rawTags: { bar: '10', cargo: '5' } }),
    );
    const bvLow = handler.calculateBV(bar5.data!.unit);
    const bvHigh = handler.calculateBV(bar10.data!.unit);
    expect(bvLow).toBe(18);
    expect(bvHigh).toBe(36);
    expect(bvHigh).toBe(bvLow * 2);
  });

  it('immobile (cruiseMP=0) support vehicles still produce non-negative BV', () => {
    const result = handler.parse(makeDoc({ cruiseMP: 0 }));
    const bv = handler.calculateBV(result.data!.unit);
    expect(bv).toBeGreaterThanOrEqual(0);
    expect(Number.isInteger(bv)).toBe(true);
  });
});

// ============================================================================
// BattleArmorUnitHandler — invariants
// ============================================================================
//
// Formula:
//   bv = round(armorPerTrooper * 20 * squadSize * (jumpMP > 0 ? 1.1 : 1))
//
