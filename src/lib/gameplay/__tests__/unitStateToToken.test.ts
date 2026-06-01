/**
 * unitStateToToken — projection adapter tests
 *
 * Per `wire-combat-behavior-dispatch` (Council #1 PR7) tasks §4.1 / §6.1 and
 * the `tactical-map-interface` + `fog-of-war` delta specs. Verifies:
 *   - Each `combatState.kind` projects the correct per-type fields with the
 *     right `TokenUnitType` discriminator.
 *   - Mech path (`combatState === undefined`) returns the base token with no
 *     per-type fields populated.
 *   - The `isHidden` early-return strips ALL `combatState`-derived per-type
 *     fields while preserving the fog-projection layer (`fogStatus` /
 *     `lastKnownPosition` / `sensorRange`).
 */

import {
  Facing,
  GameSide,
  LockState,
  MovementType,
  TokenUnitType,
  VehicleMotionType,
  type IUnitGameState,
} from '@/types/gameplay';
import { GroundMotionType } from '@/types/unit/BaseUnitInterfaces';
import { InfantryArmorKit } from '@/types/unit/PersonnelInterfaces';
import { ProtoChassis, ProtoLocation } from '@/types/unit/ProtoMechInterfaces';
import { createAerospaceCombatState } from '@/utils/gameplay/aerospace/state';
import { createBattleArmorCombatState } from '@/utils/gameplay/battlearmor/state';
import { createInfantryCombatState } from '@/utils/gameplay/infantry/state';
import { createProtoMechCombatState } from '@/utils/gameplay/protomech/state';
import { createVehicleCombatState } from '@/utils/gameplay/vehicleDamage';

import { unitStateToToken, type IFogProjection } from '../unitStateToToken';

/**
 * Widen a token to a record so per-variant fields can be asserted regardless
 * of which discriminated-union arm the adapter returned. Per Council #1 PR8
 * (discriminated-union flip), accessing per-type fields on the union requires
 * narrowing on `unitType` first — but these tests verify the *runtime* shape
 * of the projection (does altitude/infantryCount land on the correct arm?),
 * so widening at the assertion site is the most readable pattern.
 */
function widen(
  token: ReturnType<typeof unitStateToToken>,
): Record<string, unknown> {
  return token as unknown as Record<string, unknown>;
}

// =============================================================================
// Fixtures
// =============================================================================

const POSITION = { q: 1, r: 2 };
const UNIT_INFO = { name: 'Test Unit', side: GameSide.Player };

function baseState(overrides: Partial<IUnitGameState> = {}): IUnitGameState {
  return {
    id: 'unit-1',
    side: GameSide.Player,
    position: POSITION,
    facing: Facing.North,
    heat: 0,
    movementThisTurn: MovementType.Stationary,
    hexesMovedThisTurn: 0,
    armor: {},
    structure: {},
    destroyedLocations: [],
    destroyedEquipment: [],
    ammo: {},
    pilotWounds: 0,
    pilotConscious: true,
    destroyed: false,
    lockState: LockState.Pending,
    ...overrides,
  };
}

// =============================================================================
// Mech (legacy) path
// =============================================================================

describe('unitStateToToken — mech / no-envelope path', () => {
  it('returns the Mech variant with no per-type fields when combatState is undefined', () => {
    // Per Council #1 PR8 (discriminated-union flip), the no-envelope path
    // emits the Mech variant (the safe default that exposes no per-type
    // combat fields). The runtime shape must NOT carry altitude /
    // infantryCount / trooperCount / protoCount.
    const token = unitStateToToken('u1', baseState(), UNIT_INFO);
    expect(token.unitId).toBe('u1');
    expect(token.position).toEqual(POSITION);
    expect(token.unitType).toBe(TokenUnitType.Mech);
    const widened = token as unknown as Record<string, unknown>;
    expect(widened.altitude).toBeUndefined();
    expect(widened.infantryCount).toBeUndefined();
    expect(widened.trooperCount).toBeUndefined();
    expect(widened.protoCount).toBeUndefined();
  });

  it('derives a designation from the unit name (split on space + hyphen, max 4, uppercase)', () => {
    // 'Atlas AS7-D' splits on `[\s-]+` → ['Atlas', 'AS7', 'D'] → 'AAD'.
    const token = unitStateToToken('u1', baseState(), {
      name: 'Atlas AS7-D',
      side: GameSide.Player,
    });
    expect(token.designation).toBe('AAD');
  });

  it('passes through fog-projection fields untouched', () => {
    const fog: IFogProjection = {
      fogStatus: 'lastKnown',
      lastKnownPosition: { q: 9, r: 9 },
      sensorRange: 5,
    };
    const token = unitStateToToken('u1', baseState(), UNIT_INFO, {}, fog);
    expect(token.fogStatus).toBe('lastKnown');
    expect(token.lastKnownPosition).toEqual({ q: 9, r: 9 });
    expect(token.sensorRange).toBe(5);
  });
});

// =============================================================================
// Vehicle projection
// =============================================================================

describe('unitStateToToken — vehicle projection', () => {
  it('returns the Vehicle variant when vehicle combat state is represented', () => {
    const token = unitStateToToken(
      'u1',
      baseState({
        combatState: {
          kind: 'vehicle',
          state: createVehicleCombatState({
            unitId: 'u1',
            motionType: GroundMotionType.HOVER,
            originalCruiseMP: 8,
            armor: {},
            structure: {},
          }),
        },
      }),
      UNIT_INFO,
    );

    expect(token.unitType).toBe(TokenUnitType.Vehicle);
    expect(widen(token).vehicleMotionType).toBe(VehicleMotionType.Hover);
  });

  it('projects VTOL altitude from vehicle combat state', () => {
    const token = unitStateToToken(
      'u1',
      baseState({
        combatState: {
          kind: 'vehicle',
          state: createVehicleCombatState({
            unitId: 'u1',
            motionType: GroundMotionType.VTOL,
            originalCruiseMP: 10,
            armor: {},
            structure: {},
            altitude: 3,
          }),
        },
      }),
      UNIT_INFO,
    );

    expect(token.unitType).toBe(TokenUnitType.Vehicle);
    expect(widen(token).vehicleMotionType).toBe(VehicleMotionType.VTOL);
    expect(widen(token).altitude).toBe(3);
  });

  it('projects WiGE altitude from vehicle combat state', () => {
    const token = unitStateToToken(
      'u1',
      baseState({
        combatState: {
          kind: 'vehicle',
          state: createVehicleCombatState({
            unitId: 'u1',
            motionType: GroundMotionType.WIGE,
            originalCruiseMP: 10,
            armor: {},
            structure: {},
            altitude: 2,
          }),
        },
      }),
      UNIT_INFO,
    );

    expect(token.unitType).toBe(TokenUnitType.Vehicle);
    expect(widen(token).vehicleMotionType).toBe(VehicleMotionType.WiGE);
    expect(widen(token).altitude).toBe(2);
  });

  it('does not project altitude for ground-only vehicles', () => {
    const token = unitStateToToken(
      'u1',
      baseState({
        combatState: {
          kind: 'vehicle',
          state: createVehicleCombatState({
            unitId: 'u1',
            motionType: GroundMotionType.HOVER,
            originalCruiseMP: 8,
            armor: {},
            structure: {},
            altitude: 2,
          }),
        },
      }),
      UNIT_INFO,
    );

    expect(token.unitType).toBe(TokenUnitType.Vehicle);
    expect(widen(token).vehicleMotionType).toBe(VehicleMotionType.Hover);
    expect(widen(token).altitude).toBeUndefined();
  });
});

// =============================================================================
// Aerospace projection
// =============================================================================

describe('unitStateToToken — aerospace projection', () => {
  function aeroState(
    altitude: number,
    currentVelocity: number = 0,
  ): IUnitGameState {
    return baseState({
      combatState: {
        kind: 'aero',
        state: createAerospaceCombatState({
          maxSI: 8,
          armorByArc: { nose: 20, leftWing: 15, rightWing: 15, aft: 10 },
          heatSinks: 12,
          fuelPoints: 400,
          safeThrust: 5,
          maxThrust: 8,
          altitude,
          currentVelocity,
        }),
      },
    });
  }

  it("populates altitude and unitType=Aerospace when kind === 'aero'", () => {
    const token = unitStateToToken('u1', aeroState(3), UNIT_INFO);
    expect(token.unitType).toBe(TokenUnitType.Aerospace);
    expect((token as { altitude?: number }).altitude).toBe(3);
  });

  it('honours altitude=0 (landed)', () => {
    const token = unitStateToToken('u1', aeroState(0), UNIT_INFO);
    expect((token as { altitude?: number }).altitude).toBe(0);
  });

  it('projects current velocity from aerospace combat state', () => {
    const token = unitStateToToken('u1', aeroState(4, 7), UNIT_INFO);
    expect((token as { velocity?: number }).velocity).toBe(7);
  });
});

// =============================================================================
// Infantry projection
// =============================================================================

describe('unitStateToToken — infantry projection', () => {
  function platoonState(survivingTroopers: number): IUnitGameState {
    const state = createInfantryCombatState({
      startingTroopers: 28,
      armorKit: InfantryArmorKit.STANDARD,
      hasAntiMechTraining: true,
    });
    return baseState({
      combatState: {
        kind: 'platoon',
        state: { ...state, survivingTroopers },
      },
    });
  }

  it("populates infantryCount + platoonCount + unitType=Infantry when kind === 'platoon'", () => {
    const token = unitStateToToken('u1', platoonState(22), UNIT_INFO);
    expect(token.unitType).toBe(TokenUnitType.Infantry);
    expect((token as { infantryCount?: number }).infantryCount).toBe(22);
    expect((token as { platoonCount?: number }).platoonCount).toBe(1);
  });
});

// =============================================================================
// Battle armor projection
// =============================================================================

describe('unitStateToToken — battle armor projection', () => {
  function squadState(survivors: number): IUnitGameState {
    const state = createBattleArmorCombatState({
      unitId: 'u1',
      squadSize: 5,
      armorPointsPerTrooper: 8,
    });
    // Kill troopers down to `survivors` while keeping the rest fully alive.
    const killCount = Math.max(0, state.troopers.length - survivors);
    const troopers = state.troopers.map((t, i) =>
      i < killCount ? { ...t, alive: false, armorRemaining: 0 } : t,
    );
    return baseState({
      combatState: { kind: 'squad', state: { ...state, troopers } },
    });
  }

  it("populates trooperCount + unitType=BattleArmor when kind === 'squad'", () => {
    const token = unitStateToToken('u1', squadState(3), UNIT_INFO);
    expect(token.unitType).toBe(TokenUnitType.BattleArmor);
    expect((token as { trooperCount?: number }).trooperCount).toBe(3);
  });
});

// =============================================================================
// Protomech projection
// =============================================================================

describe('unitStateToToken — protomech projection', () => {
  function protoState(
    chassisType: ProtoChassis,
    hasMainGun: boolean,
  ): IUnitGameState {
    return baseState({
      combatState: {
        kind: 'proto',
        state: createProtoMechCombatState({
          unitId: 'u1',
          chassisType,
          hasMainGun,
          armorByLocation: {
            [ProtoLocation.HEAD]: 2,
            [ProtoLocation.TORSO]: 6,
          },
          structureByLocation: {
            [ProtoLocation.HEAD]: 1,
            [ProtoLocation.TORSO]: 5,
          },
        }),
      },
    });
  }

  it('populates protoCount=1 + isGlider + hasMainGun for GLIDER chassis with main gun', () => {
    const token = unitStateToToken(
      'u1',
      protoState(ProtoChassis.GLIDER, true),
      UNIT_INFO,
    );
    expect(token.unitType).toBe(TokenUnitType.ProtoMech);
    expect((token as { protoCount?: number }).protoCount).toBe(1);
    expect((token as { isGlider?: boolean }).isGlider).toBe(true);
    expect((token as { hasMainGun?: boolean }).hasMainGun).toBe(true);
  });

  it('isGlider=false for BIPED chassis', () => {
    const token = unitStateToToken(
      'u1',
      protoState(ProtoChassis.BIPED, false),
      UNIT_INFO,
    );
    expect((token as { isGlider?: boolean }).isGlider).toBe(false);
    expect((token as { hasMainGun?: boolean }).hasMainGun).toBe(false);
  });
});

// =============================================================================
// Selection / target flags
// =============================================================================

describe('unitStateToToken — selection / target flags', () => {
  it('honours isSelected / isValidTarget / isActiveTarget flags', () => {
    const token = unitStateToToken('u1', baseState(), UNIT_INFO, {
      isSelected: true,
      isValidTarget: true,
      isActiveTarget: true,
    });
    expect(token.isSelected).toBe(true);
    expect(token.isValidTarget).toBe(true);
    expect(token.isActiveTarget).toBe(true);
  });

  it('defaults all flags to false when omitted', () => {
    const token = unitStateToToken('u1', baseState(), UNIT_INFO);
    expect(token.isSelected).toBe(false);
    expect(token.isValidTarget).toBe(false);
    expect(token.isActiveTarget).toBe(false);
  });
});

// =============================================================================
// Fog redaction
// =============================================================================

describe('unitStateToToken — fog redaction (isHidden=true)', () => {
  const FOG_PROJECTION: IFogProjection = {
    fogStatus: 'lastKnown',
    lastKnownPosition: { q: 4, r: 4 },
  };

  it('redacts infantry per-type fields for hidden enemy platoon', () => {
    const state = baseState({
      combatState: {
        kind: 'platoon',
        state: {
          ...createInfantryCombatState({
            startingTroopers: 28,
            armorKit: InfantryArmorKit.STANDARD,
            hasAntiMechTraining: true,
          }),
          survivingTroopers: 22,
        },
      },
    });
    const token = unitStateToToken(
      'u1',
      state,
      UNIT_INFO,
      {},
      FOG_PROJECTION,
      true,
    );
    expect((token as { infantryCount?: number }).infantryCount).toBeUndefined();
    expect((token as { platoonCount?: number }).platoonCount).toBeUndefined();
    // Discriminated union: redacted tokens default to Mech variant.
    expect(token.unitType).toBe(TokenUnitType.Mech);
    // Fog-projection fields survive redaction.
    expect(token.fogStatus).toBe('lastKnown');
    expect(token.lastKnownPosition).toEqual({ q: 4, r: 4 });
  });

  it('redacts altitude (and velocity) for hidden enemy aerospace', () => {
    const state = baseState({
      combatState: {
        kind: 'aero',
        state: createAerospaceCombatState({
          maxSI: 8,
          armorByArc: { nose: 20, leftWing: 15, rightWing: 15, aft: 10 },
          heatSinks: 12,
          fuelPoints: 400,
          safeThrust: 5,
          maxThrust: 8,
          altitude: 5,
        }),
      },
    });
    const token = unitStateToToken(
      'u1',
      state,
      UNIT_INFO,
      {},
      FOG_PROJECTION,
      true,
    );
    expect((token as { altitude?: number }).altitude).toBeUndefined();
    expect((token as { velocity?: number }).velocity).toBeUndefined();
  });

  it('redacts trooperCount for hidden enemy battle armor', () => {
    const state = baseState({
      combatState: {
        kind: 'squad',
        state: createBattleArmorCombatState({
          unitId: 'u1',
          squadSize: 5,
          armorPointsPerTrooper: 8,
        }),
      },
    });
    const token = unitStateToToken(
      'u1',
      state,
      UNIT_INFO,
      {},
      FOG_PROJECTION,
      true,
    );
    expect((token as { trooperCount?: number }).trooperCount).toBeUndefined();
  });

  it('redacts protoCount / isGlider / hasMainGun for hidden enemy proto', () => {
    const state = baseState({
      combatState: {
        kind: 'proto',
        state: createProtoMechCombatState({
          unitId: 'u1',
          chassisType: ProtoChassis.GLIDER,
          hasMainGun: true,
          armorByLocation: { [ProtoLocation.TORSO]: 6 },
          structureByLocation: { [ProtoLocation.TORSO]: 5 },
        }),
      },
    });
    const token = unitStateToToken(
      'u1',
      state,
      UNIT_INFO,
      {},
      FOG_PROJECTION,
      true,
    );
    expect((token as { protoCount?: number }).protoCount).toBeUndefined();
    expect((token as { isGlider?: boolean }).isGlider).toBeUndefined();
    expect((token as { hasMainGun?: boolean }).hasMainGun).toBeUndefined();
  });

  it('does NOT redact when isHidden=false (visible enemies render normally)', () => {
    const state = baseState({
      combatState: {
        kind: 'platoon',
        state: {
          ...createInfantryCombatState({
            startingTroopers: 28,
            armorKit: InfantryArmorKit.STANDARD,
            hasAntiMechTraining: true,
          }),
          survivingTroopers: 22,
        },
      },
    });
    const token = unitStateToToken(
      'u1',
      state,
      UNIT_INFO,
      {},
      FOG_PROJECTION,
      false,
    );
    expect((token as { infantryCount?: number }).infantryCount).toBe(22);
  });

  it('does NOT redact when caller omits isHidden (defaults to false)', () => {
    const state = baseState({
      combatState: {
        kind: 'platoon',
        state: {
          ...createInfantryCombatState({
            startingTroopers: 28,
            armorKit: InfantryArmorKit.STANDARD,
            hasAntiMechTraining: true,
          }),
          survivingTroopers: 22,
        },
      },
    });
    const token = unitStateToToken('u1', state, UNIT_INFO);
    expect((token as { infantryCount?: number }).infantryCount).toBe(22);
  });
});
