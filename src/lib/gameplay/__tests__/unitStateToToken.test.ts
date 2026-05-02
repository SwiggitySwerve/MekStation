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
  type IUnitGameState,
} from '@/types/gameplay';
import { InfantryArmorKit } from '@/types/unit/PersonnelInterfaces';
import { ProtoChassis, ProtoLocation } from '@/types/unit/ProtoMechInterfaces';
import { createAerospaceCombatState } from '@/utils/gameplay/aerospace/state';
import { createBattleArmorCombatState } from '@/utils/gameplay/battlearmor/state';
import { createInfantryCombatState } from '@/utils/gameplay/infantry/state';
import { createProtoMechCombatState } from '@/utils/gameplay/protomech/state';

import { unitStateToToken, type IFogProjection } from '../unitStateToToken';

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
  it('returns base token with no per-type fields when combatState is undefined', () => {
    const token = unitStateToToken('u1', baseState(), UNIT_INFO);
    expect(token.unitId).toBe('u1');
    expect(token.position).toEqual(POSITION);
    expect(token.altitude).toBeUndefined();
    expect(token.infantryCount).toBeUndefined();
    expect(token.trooperCount).toBeUndefined();
    expect(token.protoCount).toBeUndefined();
    expect(token.unitType).toBeUndefined();
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
// Aerospace projection
// =============================================================================

describe('unitStateToToken — aerospace projection', () => {
  function aeroState(altitude: number): IUnitGameState {
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
        }),
      },
    });
  }

  it("populates altitude and unitType=Aerospace when kind === 'aero'", () => {
    const token = unitStateToToken('u1', aeroState(3), UNIT_INFO);
    expect(token.unitType).toBe(TokenUnitType.Aerospace);
    expect(token.altitude).toBe(3);
  });

  it('honours altitude=0 (landed)', () => {
    const token = unitStateToToken('u1', aeroState(0), UNIT_INFO);
    expect(token.altitude).toBe(0);
  });

  it('leaves velocity undefined (movement slice 2 future work)', () => {
    const token = unitStateToToken('u1', aeroState(1), UNIT_INFO);
    expect(token.velocity).toBeUndefined();
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
    expect(token.infantryCount).toBe(22);
    expect(token.platoonCount).toBe(1);
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
    expect(token.trooperCount).toBe(3);
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
    expect(token.protoCount).toBe(1);
    expect(token.isGlider).toBe(true);
    expect(token.hasMainGun).toBe(true);
  });

  it('isGlider=false for BIPED chassis', () => {
    const token = unitStateToToken(
      'u1',
      protoState(ProtoChassis.BIPED, false),
      UNIT_INFO,
    );
    expect(token.isGlider).toBe(false);
    expect(token.hasMainGun).toBe(false);
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
    expect(token.infantryCount).toBeUndefined();
    expect(token.platoonCount).toBeUndefined();
    expect(token.unitType).toBeUndefined();
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
    expect(token.altitude).toBeUndefined();
    expect(token.velocity).toBeUndefined();
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
    expect(token.trooperCount).toBeUndefined();
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
    expect(token.protoCount).toBeUndefined();
    expect(token.isGlider).toBeUndefined();
    expect(token.hasMainGun).toBeUndefined();
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
    expect(token.infantryCount).toBe(22);
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
    expect(token.infantryCount).toBe(22);
  });
});
