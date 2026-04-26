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
