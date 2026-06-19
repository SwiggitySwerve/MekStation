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

describe('DropShipUnitHandler Tier 1 Invariants', () => {
  const handler = createDropShipHandler();

  function makeDoc(overrides: Partial<IBlkDocument> = {}): IBlkDocument {
    return {
      blockVersion: 1,
      version: 'MAM0',
      unitType: 'DropShip',
      mappedUnitType: UnitType.DROPSHIP,
      name: 'Union',
      model: 'Standard',
      year: 2708,
      type: 'IS Level 2',
      tonnage: 3500,
      motionType: 'Spheroid',
      safeThrust: 3,
      structuralIntegrity: 10,
      fuel: 2500,
      heatsinks: 100,
      sinkType: 0,
      engineType: 0,
      armorType: 0,
      armor: [200, 150, 150, 120, 120, 80], // 820 total
      crew: 21,
      officers: 5,
      gunners: 4,
      passengers: 0,
      marines: 0,
      escapePod: 7,
      lifeBoat: 0,
      equipmentByLocation: {},
      transporters: ['mechbay:12', 'asfbay:2:1', 'cargobay:75.5:1'],
      rawTags: { dockingcollar: 'true' },
      designType: 0,
      ...overrides,
    };
  }

  it('BV is finite, integer, > 0 for canonical Union', () => {
    const result = handler.parse(makeDoc());
    expect(result.success).toBe(true);
    assertBVInvariants(handler.calculateBV(result.data!.unit), 'DropShip');
  });

  it('BV monotonically increases with structural integrity', () => {
    const lo = handler.parse(makeDoc({ structuralIntegrity: 5 }));
    const hi = handler.parse(makeDoc({ structuralIntegrity: 20 }));
    expect(handler.calculateBV(hi.data!.unit)).toBeGreaterThan(
      handler.calculateBV(lo.data!.unit),
    );
  });

  it('BV monotonically increases with safe thrust', () => {
    const slow = handler.parse(makeDoc({ safeThrust: 2 }));
    const fast = handler.parse(makeDoc({ safeThrust: 5 }));
    expect(handler.calculateBV(fast.data!.unit)).toBeGreaterThan(
      handler.calculateBV(slow.data!.unit),
    );
  });

  it('military design type costs more than civilian (same hull)', () => {
    const military = handler.parse(makeDoc({ designType: 0 })); // Military
    const civilian = handler.parse(makeDoc({ designType: 1 })); // Civilian
    expect(handler.calculateCost(military.data!.unit)).toBeGreaterThan(
      handler.calculateCost(civilian.data!.unit),
    );
  });
});

// ============================================================================
// JumpShipUnitHandler — capital ship, BV-load-bearing (#423)
// ============================================================================
//
// Formula (calculateJumpShipBV):
//   bv = round(armor*2 + SI*30 + kfRating*100 + dockingCollars*50)
//

describe('JumpShipUnitHandler Tier 1 Invariants', () => {
  const handler = createJumpShipHandler();

  function makeDoc(overrides: Partial<IBlkDocument> = {}): IBlkDocument {
    return {
      blockVersion: 1,
      version: 'MAM0',
      unitType: 'JumpShip',
      mappedUnitType: UnitType.JUMPSHIP,
      name: 'Invader',
      model: 'Standard',
      year: 2631,
      type: 'IS Level 2',
      tonnage: 152000,
      safeThrust: 0,
      structuralIntegrity: 35,
      fuel: 7500,
      heatsinks: 100,
      sinkType: 0,
      engineType: 0,
      armorType: 0,
      armor: [30, 25, 25, 20, 20, 15], // 135 total
      crew: 25,
      officers: 8,
      gunners: 2,
      passengers: 10,
      escapePod: 5,
      lifeBoat: 2,
      equipmentByLocation: {},
      transporters: ['cargobay:100.0:1'],
      rawTags: {
        dockingcollars: '3',
        gravdecks: '2',
        kfrating: '15',
        kfintegrity: '4',
        lithiumfusion: 'false',
      },
      ...overrides,
    };
  }

  it('locks down BV golden value for canonical Invader-class JumpShip', () => {
    // armor=135, SI=35, kfRating=15, collars=3
    // bv = round(135*2 + 35*30 + 15*100 + 3*50)
    //    = round(270 + 1050 + 1500 + 150) = 2970
    const result = handler.parse(makeDoc());
    expect(result.success).toBe(true);
    expect(handler.calculateBV(result.data!.unit)).toBe(2970);
  });

  it('BV invariants hold for canonical fixture', () => {
    const result = handler.parse(makeDoc());
    assertBVInvariants(handler.calculateBV(result.data!.unit), 'JumpShip');
  });

  it('K-F drive rating dominates BV scaling (100x weight)', () => {
    // Doubling kfRating should add (kfRating * 100) BV exactly.
    const r15 = handler.parse(
      makeDoc({ rawTags: { ...makeDoc().rawTags, kfrating: '15' } }),
    );
    const r30 = handler.parse(
      makeDoc({ rawTags: { ...makeDoc().rawTags, kfrating: '30' } }),
    );
    const bv15 = handler.calculateBV(r15.data!.unit);
    const bv30 = handler.calculateBV(r30.data!.unit);
    // Diff = (30-15) * 100 = 1500
    expect(bv30 - bv15).toBe(1500);
  });

  it('docking collars contribute exactly 50 BV each', () => {
    const c3 = handler.parse(
      makeDoc({ rawTags: { ...makeDoc().rawTags, dockingcollars: '3' } }),
    );
    const c5 = handler.parse(
      makeDoc({ rawTags: { ...makeDoc().rawTags, dockingcollars: '5' } }),
    );
    expect(
      handler.calculateBV(c5.data!.unit) - handler.calculateBV(c3.data!.unit),
    ).toBe(100);
  });

  it('weight equals declared tonnage (no internal weight calc for capital ships)', () => {
    const result = handler.parse(makeDoc({ tonnage: 152000 }));
    expect(handler.calculateWeight(result.data!.unit)).toBe(152000);
  });

  it('lithium-fusion increases cost without changing BV', () => {
    const docNoLF = makeDoc({
      rawTags: { ...makeDoc().rawTags, lithiumfusion: 'false' },
    });
    const docLF = makeDoc({
      rawTags: { ...makeDoc().rawTags, lithiumfusion: 'true' },
    });
    const noLF = handler.parse(docNoLF);
    const withLF = handler.parse(docLF);

    // BV unchanged
    expect(handler.calculateBV(noLF.data!.unit)).toBe(
      handler.calculateBV(withLF.data!.unit),
    );
    // Cost increases
    expect(handler.calculateCost(withLF.data!.unit)).toBeGreaterThan(
      handler.calculateCost(noLF.data!.unit),
    );
  });
});

// ============================================================================
// SpaceStationUnitHandler — capital ship, BV-load-bearing (#423)
// ============================================================================
//
// Formula (calculateSpaceStationBV):
//   bv = round(armor*2 + SI*25 + dockingCollars*40 + sum(bay.cap*3))
//
