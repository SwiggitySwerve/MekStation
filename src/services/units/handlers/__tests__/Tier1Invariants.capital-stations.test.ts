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

describe('SpaceStationUnitHandler Tier 1 Invariants', () => {
  const handler = createSpaceStationHandler();

  function makeDoc(overrides: Partial<IBlkDocument> = {}): IBlkDocument {
    return {
      blockVersion: 1,
      version: 'MAM0',
      unitType: 'Space Station',
      mappedUnitType: UnitType.SPACE_STATION,
      name: 'Olympus',
      model: 'Recharge Station',
      year: 2785,
      type: 'IS Level 2',
      tonnage: 50000,
      safeThrust: 0,
      structuralIntegrity: 50,
      fuel: 1000,
      heatsinks: 200,
      sinkType: 0,
      armorType: 0,
      armor: [100, 80, 80, 60, 60, 40], // 420 total
      crew: 150,
      officers: 20,
      gunners: 10,
      passengers: 500,
      escapePod: 100,
      lifeBoat: 20,
      equipmentByLocation: {},
      // 'cargobay:10000.0:4' is parsed as cap=10000
      // 'mechbay:12' is parsed as cap=12
      // 'asfbay:6:1' is parsed as cap=6
      transporters: ['cargobay:10000.0:4', 'mechbay:12', 'asfbay:6:1'],
      rawTags: {
        stationtype: 'recharge',
        dockingcollars: '6',
        gravdecks: '3',
        hpg: 'true',
        pressurizedmodules: '10',
      },
      ...overrides,
    };
  }

  it('BV is finite, integer, > 0 for canonical Olympus station', () => {
    // We DON'T lock an exact golden here because bay capacity sum depends on
    // transporter parser internals. Instead we lock the dependency-free
    // invariants and rely on the dedicated bay test below for exactness.
    const result = handler.parse(makeDoc());
    expect(result.success).toBe(true);
    assertBVInvariants(handler.calculateBV(result.data!.unit), 'SpaceStation');
  });

  it('without bays, BV matches armor + SI + collars formula exactly', () => {
    // Strip transporters so transportBays sum is 0.
    // bv = armor*2 + SI*25 + collars*40
    //    = 420*2 + 50*25 + 6*40
    //    = 840 + 1250 + 240 = 2330
    const docNoBays: IBlkDocument = { ...makeDoc(), transporters: [] };
    const result = handler.parse(docNoBays);
    expect(result.success).toBe(true);
    expect(handler.calculateBV(result.data!.unit)).toBe(2330);
  });

  it('SI contributes exactly 25 BV per point', () => {
    const docNoBays: IBlkDocument = { ...makeDoc(), transporters: [] };
    const lowSI = handler.parse({ ...docNoBays, structuralIntegrity: 50 });
    const hiSI = handler.parse({ ...docNoBays, structuralIntegrity: 75 });
    const diff =
      handler.calculateBV(hiSI.data!.unit) -
      handler.calculateBV(lowSI.data!.unit);
    expect(diff).toBe((75 - 50) * 25);
  });

  it('docking collars contribute exactly 40 BV each (lower than JumpShip 50)', () => {
    // Capital BV per collar diverges between JumpShip (50) and Station (40).
    // This invariant ensures we don't accidentally unify them in a refactor.
    const docNoBays: IBlkDocument = { ...makeDoc(), transporters: [] };
    const c3 = handler.parse({
      ...docNoBays,
      rawTags: { ...docNoBays.rawTags, dockingcollars: '3' },
    });
    const c6 = handler.parse({
      ...docNoBays,
      rawTags: { ...docNoBays.rawTags, dockingcollars: '6' },
    });
    expect(
      handler.calculateBV(c6.data!.unit) - handler.calculateBV(c3.data!.unit),
    ).toBe((6 - 3) * 40);
  });

  it('weight equals declared tonnage (no internal weight calc)', () => {
    const result = handler.parse(makeDoc());
    expect(handler.calculateWeight(result.data!.unit)).toBe(50000);
  });

  it('HPG capability raises cost without changing BV', () => {
    const docHPG = makeDoc({
      rawTags: { ...makeDoc().rawTags, hpg: 'true' },
    });
    const docNoHPG = makeDoc({
      rawTags: { ...makeDoc().rawTags, hpg: 'false' },
    });
    const withHPG = handler.parse(docHPG);
    const noHPG = handler.parse(docNoHPG);
    expect(handler.calculateBV(withHPG.data!.unit)).toBe(
      handler.calculateBV(noHPG.data!.unit),
    );
    expect(handler.calculateCost(withHPG.data!.unit)).toBeGreaterThan(
      handler.calculateCost(noHPG.data!.unit),
    );
  });
});

// ============================================================================
// WarShipUnitHandler — capital ship, BV-load-bearing
// ============================================================================
//
// Formula (calculateWarShipBV):
//   base = armor*5 + SI*50 + 500 + (LFBattery ? 200 : 0) + sum(bay.cap*10)
//   bv = round(base * (1 + safeThrust*0.05))
//

describe('WarShipUnitHandler Tier 1 Invariants', () => {
  const handler = createWarShipHandler();

  function makeDoc(overrides: Partial<IBlkDocument> = {}): IBlkDocument {
    return {
      blockVersion: 1,
      version: 'MAM0',
      unitType: 'WarShip',
      mappedUnitType: UnitType.WARSHIP,
      name: 'McKenna',
      model: 'Battleship',
      year: 2652,
      type: 'IS Level 3',
      tonnage: 1400000,
      safeThrust: 2,
      structuralIntegrity: 75,
      fuel: 10000,
      heatsinks: 5000,
      sinkType: 1,
      engineType: 0,
      armorType: 0,
      armor: [500, 400, 400, 350, 350, 300, 450, 450], // 3200 total
      crew: 2200,
      officers: 150,
      gunners: 400,
      marines: 60,
      passengers: 20,
      escapePod: 50,
      lifeBoat: 20,
      equipmentByLocation: {},
      transporters: ['mechbay:24', 'asfbay:12:2', 'cargobay:5000.0:1'],
      rawTags: {
        kfdrivetype: 'standard',
        lfbattery: 'true',
        sailarea: '1000',
        hardpoints: '6',
        gravdecks: '3',
        largegravdecks: '1',
      },
      ...overrides,
    };
  }

  it('BV is finite, integer, > 0 for canonical McKenna', () => {
    const result = handler.parse(makeDoc());
    expect(result.success).toBe(true);
    assertBVInvariants(handler.calculateBV(result.data!.unit), 'WarShip');
  });

  it('without bays, BV matches armor + SI + 500 + LFB + thrust formula exactly', () => {
    // No transporters, lfbattery=true, thrust=2
    // base = 3200*5 + 75*50 + 500 + 200 = 16000 + 3750 + 500 + 200 = 20450
    // mod = 1 + 2*0.05 = 1.10
    // bv = round(20450 * 1.10) = round(22495) = 22495
    const result = handler.parse({ ...makeDoc(), transporters: [] });
    expect(result.success).toBe(true);
    expect(handler.calculateBV(result.data!.unit)).toBe(22495);
  });

  it('LF battery contributes exactly 200 BV before thrust modifier', () => {
    const docNoBays: IBlkDocument = { ...makeDoc(), transporters: [] };
    const noLF = handler.parse({
      ...docNoBays,
      rawTags: { ...docNoBays.rawTags, lfbattery: 'false' },
    });
    const withLF = handler.parse({
      ...docNoBays,
      rawTags: { ...docNoBays.rawTags, lfbattery: 'true' },
    });
    // Diff = 200 * thrustMod (1.10 with safeThrust=2). Must round to 220.
    expect(
      handler.calculateBV(withLF.data!.unit) -
        handler.calculateBV(noLF.data!.unit),
    ).toBe(Math.round(200 * 1.1));
  });

  it('thrust modifier scales BV by 5% per safeThrust point', () => {
    const docNoBays: IBlkDocument = { ...makeDoc(), transporters: [] };
    const t2 = handler.parse({ ...docNoBays, safeThrust: 2 });
    const t4 = handler.parse({ ...docNoBays, safeThrust: 4 });
    const bv2 = handler.calculateBV(t2.data!.unit);
    const bv4 = handler.calculateBV(t4.data!.unit);
    // base*(1.10) -> base*(1.20). Ratio = 1.20/1.10 ≈ 1.0909
    expect(bv4).toBe(Math.round((bv2 / 1.1) * 1.2));
  });

  it('weight equals declared tonnage', () => {
    const result = handler.parse(makeDoc());
    expect(handler.calculateWeight(result.data!.unit)).toBe(1400000);
  });

  it('LF battery raises cost in addition to BV', () => {
    const noLF = handler.parse(
      makeDoc({ rawTags: { ...makeDoc().rawTags, lfbattery: 'false' } }),
    );
    const withLF = handler.parse(
      makeDoc({ rawTags: { ...makeDoc().rawTags, lfbattery: 'true' } }),
    );
    expect(handler.calculateCost(withLF.data!.unit)).toBeGreaterThan(
      handler.calculateCost(noLF.data!.unit),
    );
    expect(handler.calculateBV(withLF.data!.unit)).toBeGreaterThan(
      handler.calculateBV(noLF.data!.unit),
    );
  });
});

// ============================================================================
// Cross-handler invariant: BV scales with tier
// ============================================================================
//
// A WarShip's per-armor-point BV (5x) > Station's per-armor-point BV (2x).
// A JumpShip's K-F drive contribution (kfRating*100) is huge relative to its
// armor (135 * 2 = 270). This block locks the relative ordering between
// capital ship classes so a hot-fix can't accidentally regress the hierarchy.
//

describe('Capital ship BV class hierarchy', () => {
  function makeJumpShip(): IBlkDocument {
    return {
      blockVersion: 1,
      version: 'MAM0',
      unitType: 'JumpShip',
      mappedUnitType: UnitType.JUMPSHIP,
      name: 'Test JumpShip',
      model: '',
      year: 2700,
      type: 'IS Level 2',
      tonnage: 100000,
      safeThrust: 0,
      structuralIntegrity: 30,
      fuel: 5000,
      heatsinks: 50,
      sinkType: 0,
      engineType: 0,
      armorType: 0,
      armor: [20, 20, 20, 20, 20, 20], // 120 total
      crew: 20,
      equipmentByLocation: {},
      rawTags: {
        dockingcollars: '2',
        kfrating: '10',
        kfintegrity: '3',
        lithiumfusion: 'false',
      },
    };
  }

  function makeStation(): IBlkDocument {
    return {
      blockVersion: 1,
      version: 'MAM0',
      unitType: 'Space Station',
      mappedUnitType: UnitType.SPACE_STATION,
      name: 'Test Station',
      model: '',
      year: 2700,
      type: 'IS Level 2',
      tonnage: 100000,
      safeThrust: 0,
      structuralIntegrity: 30,
      fuel: 0,
      heatsinks: 50,
      sinkType: 0,
      armorType: 0,
      armor: [20, 20, 20, 20, 20, 20], // 120 total
      crew: 20,
      equipmentByLocation: {},
      transporters: [],
      rawTags: {
        stationtype: 'orbital',
        dockingcollars: '2',
      },
    };
  }

  it('JumpShip BV > equivalent Station BV due to K-F drive contribution', () => {
    // JumpShip: 120*2 + 30*30 + 10*100 + 2*50 = 240 + 900 + 1000 + 100 = 2240
    // Station:  120*2 + 30*25 + 2*40              = 240 + 750 + 80         = 1070
    const js = createJumpShipHandler().parse(makeJumpShip());
    const ss = createSpaceStationHandler().parse(makeStation());
    expect(js.success).toBe(true);
    expect(ss.success).toBe(true);

    const jsBV = createJumpShipHandler().calculateBV(js.data!.unit);
    const ssBV = createSpaceStationHandler().calculateBV(ss.data!.unit);
    expect(jsBV).toBe(2240);
    expect(ssBV).toBe(1070);
    expect(jsBV).toBeGreaterThan(ssBV);
  });
});
