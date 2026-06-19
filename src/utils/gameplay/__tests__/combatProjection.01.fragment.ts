import type { IGameState, IUnitToken, IWeaponStatus } from '@/types/gameplay';

import { VehicleLocation } from '@/types/construction/UnitLocation';
import {
  Facing,
  FiringArc,
  GamePhase,
  GameSide,
  GameStatus,
  MovementType,
  TerrainType,
  TokenUnitType,
} from '@/types/gameplay';
import { createHexGrid } from '@/utils/gameplay/hexGrid';
import { terrainStringFromFeatures } from '@/utils/gameplay/terrainEncoding';
import { getTwoD6HitProbability } from '@/utils/gameplay/toHit/forecast';

import { deriveCombatRangeHexes } from '../combatProjection';
import { deriveValidWeaponTargetIds } from '../combatTargetIds';
import {
  HULL_DOWN_FRONT_WEAPON_BLOCKED_REASON,
  HULL_DOWN_LEG_WEAPON_BLOCKED_REASON,
} from '../hullDownRestrictions';

function makeToken(overrides: Partial<IUnitToken>): IUnitToken {
  return {
    unitId: 'unit',
    name: 'Unit',
    side: GameSide.Player,
    position: { q: 0, r: 0 },
    facing: Facing.Southeast,
    isSelected: false,
    isValidTarget: false,
    isDestroyed: false,
    designation: 'UNT',
    unitType: TokenUnitType.Mech,
    ...overrides,
  } as IUnitToken;
}

function makeWeapon(overrides: Partial<IWeaponStatus> = {}): IWeaponStatus {
  return {
    id: 'medium-laser',
    name: 'Medium Laser',
    location: 'right_arm',
    destroyed: false,
    firedThisTurn: false,
    heat: 3,
    damage: 5,
    ranges: { short: 2, medium: 4, long: 6 },
    ...overrides,
  };
}

function makeCombatState(
  units: Record<
    string,
    {
      readonly side: GameSide;
      readonly position: { readonly q: number; readonly r: number };
      readonly gunnery?: number;
      readonly heat?: number;
      readonly movementThisTurn?: MovementType;
      readonly hexesMovedThisTurn?: number;
      readonly prone?: boolean;
      readonly hullDown?: boolean;
      readonly shutdown?: boolean;
      readonly destroyed?: boolean;
    }
  >,
): IGameState {
  return {
    gameId: 'combat-projection-test',
    status: GameStatus.Active,
    turn: 1,
    phase: GamePhase.WeaponAttack,
    activationIndex: 0,
    turnEvents: [],
    units: Object.fromEntries(
      Object.entries(units).map(([unitId, unit]) => [
        unitId,
        {
          id: unitId,
          side: unit.side,
          position: unit.position,
          facing: Facing.North,
          heat: unit.heat ?? 0,
          movementThisTurn: unit.movementThisTurn ?? MovementType.Stationary,
          hexesMovedThisTurn: unit.hexesMovedThisTurn ?? 0,
          prone: unit.prone,
          hullDown: unit.hullDown,
          destroyed: unit.destroyed ?? false,
          shutdown: unit.shutdown ?? false,
          hasRetreated: false,
          gunnery: unit.gunnery ?? 4,
        },
      ]),
    ) as IGameState['units'],
  };
}

describe('deriveCombatRangeHexes', () => {
  it('marks visible enemy target hexes with weapon range, arc, and to-hit data', () => {
    const grid = createHexGrid({ radius: 3 });
    const attacker = makeToken({
      unitId: 'attacker',
      isSelected: true,
      position: { q: 0, r: 0 },
    });
    const target = makeToken({
      unitId: 'target',
      side: GameSide.Opponent,
      position: { q: 2, r: 0 },
    });

    const targetHex = deriveCombatRangeHexes({
      attacker,
      hexes: Array.from(grid.hexes.values(), (hex) => hex.coord),
      grid,
      tokens: [attacker, target],
      weapons: [makeWeapon()],
      combatState: makeCombatState({
        attacker: { side: GameSide.Player, position: { q: 0, r: 0 } },
        target: { side: GameSide.Opponent, position: { q: 2, r: 0 } },
      }),
    }).find((hex) => hex.hex.q === 2 && hex.hex.r === 0);

    expect(targetHex).toMatchObject({
      distance: 2,
      rangeBracket: 'short',
      inRange: true,
      inArc: true,
      losState: 'clear',
      hasTarget: true,
      targetVisibilityState: 'visible',
      attackable: true,
      weaponIdsInRange: ['medium-laser'],
      weaponIdsInArc: ['medium-laser'],
      weaponIdsAvailable: ['medium-laser'],
      weaponRangeOptions: [
        {
          weaponId: 'medium-laser',
          rangeBracket: 'short',
          inRange: true,
          inArc: true,
          environmentLegal: true,
          available: true,
        },
      ],
      targetUnitIds: ['target'],
      validTargetUnitIds: ['target'],
    });
    expect(targetHex?.toHitNumber).toBeGreaterThan(0);
    expect(targetHex?.attackInvalidReason).toBeUndefined();
  });

  it('projects source-pinned hull-down cover modifiers from combat state', () => {
    const grid = createHexGrid({ radius: 3 });
    const coverHex = grid.hexes.get('1,0');
    expect(coverHex).toBeDefined();
    grid.hexes.set('1,0', {
      ...coverHex!,
      terrain: terrainStringFromFeatures([
        { type: TerrainType.Building, level: 1 },
      ]),
    });
    const attacker = makeToken({
      unitId: 'attacker',
      isSelected: true,
      position: { q: 0, r: 0 },
    });
    const target = makeToken({
      unitId: 'target',
      side: GameSide.Opponent,
      position: { q: 2, r: 0 },
    });

    const targetHex = deriveCombatRangeHexes({
      attacker,
      hexes: Array.from(grid.hexes.values(), (hex) => hex.coord),
      grid,
      tokens: [attacker, target],
      weapons: [makeWeapon()],
      combatState: makeCombatState({
        attacker: { side: GameSide.Player, position: { q: 0, r: 0 } },
        target: {
          side: GameSide.Opponent,
          position: { q: 2, r: 0 },
          hullDown: true,
        },
      }),
    }).find((hex) => hex.hex.q === 2 && hex.hex.r === 0);

    expect(targetHex).toMatchObject({
      attackable: true,
      targetPartialCover: true,
      targetCoverModifier: 1,
      targetHullDown: true,
      targetHullDownModifier: 2,
      targetHullDownReason: 'Target in hull-down position: +2',
      toHitNumber: 6,
    });
    expect(targetHex?.toHitModifiers).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: 'Hull-Down', value: 2 }),
      ]),
    );
  });

  it('blocks hull-down attacker leg weapons while keeping upper-body weapons available', () => {
    const grid = createHexGrid({ radius: 3 });
    const attacker = makeToken({
      unitId: 'attacker',
      isSelected: true,
      position: { q: 0, r: 0 },
    });
    const target = makeToken({
      unitId: 'target',
      side: GameSide.Opponent,
      position: { q: 2, r: 0 },
    });

    const targetHex = deriveCombatRangeHexes({
      attacker,
      hexes: Array.from(grid.hexes.values(), (hex) => hex.coord),
      grid,
      tokens: [attacker, target],
      weapons: [
        makeWeapon({
          id: 'leg-laser',
          name: 'Leg Laser',
          location: 'left_leg',
        }),
        makeWeapon({
          id: 'arm-laser',
          name: 'Arm Laser',
          location: 'right_arm',
        }),
      ],
      combatState: makeCombatState({
        attacker: {
          side: GameSide.Player,
          position: { q: 0, r: 0 },
          hullDown: true,
        },
        target: { side: GameSide.Opponent, position: { q: 2, r: 0 } },
      }),
    }).find((hex) => hex.hex.q === 2 && hex.hex.r === 0);

    expect(targetHex).toMatchObject({
      attackable: true,
      weaponIdsInRange: ['leg-laser', 'arm-laser'],
      weaponIdsInArc: ['leg-laser', 'arm-laser'],
      weaponIdsAvailable: ['arm-laser'],
      attackInvalidReason: undefined,
    });
    expect(targetHex?.weaponRangeOptions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          weaponId: 'leg-laser',
          available: false,
          blockedReason: HULL_DOWN_LEG_WEAPON_BLOCKED_REASON,
        }),
        expect.objectContaining({
          weaponId: 'arm-laser',
          available: true,
          blockedReason: undefined,
        }),
      ]),
    );
  });

  it('marks all-leg hull-down attacker volleys invalid before commit', () => {
    const grid = createHexGrid({ radius: 3 });
    const attacker = makeToken({
      unitId: 'attacker',
      isSelected: true,
      position: { q: 0, r: 0 },
    });
    const target = makeToken({
      unitId: 'target',
      side: GameSide.Opponent,
      position: { q: 2, r: 0 },
    });

    const targetHex = deriveCombatRangeHexes({
      attacker,
      hexes: Array.from(grid.hexes.values(), (hex) => hex.coord),
      grid,
      tokens: [attacker, target],
      weapons: [
        makeWeapon({
          id: 'leg-laser',
          name: 'Leg Laser',
          location: 'right_leg',
        }),
      ],
      combatState: makeCombatState({
        attacker: {
          side: GameSide.Player,
          position: { q: 0, r: 0 },
          hullDown: true,
        },
        target: { side: GameSide.Opponent, position: { q: 2, r: 0 } },
      }),
    }).find((hex) => hex.hex.q === 2 && hex.hex.r === 0);

    expect(targetHex).toMatchObject({
      inRange: true,
      inArc: true,
      attackable: false,
      weaponIdsAvailable: [],
      attackInvalidReason: 'InvalidTarget',
      attackInvalidDetails: HULL_DOWN_LEG_WEAPON_BLOCKED_REASON,
      blockedReason: HULL_DOWN_LEG_WEAPON_BLOCKED_REASON,
    });
  });
});
