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

describe('deriveValidWeaponTargetIds', () => {
  it('returns only targets that the shared combat projection marks legal', () => {
    const grid = createHexGrid({ radius: 3 });
    const attacker = makeToken({
      unitId: 'attacker',
      isSelected: true,
      position: { q: 0, r: 0 },
    });
    const visibleTarget = makeToken({
      unitId: 'visible-target',
      side: GameSide.Opponent,
      position: { q: 2, r: 0 },
    });
    const lastKnownTarget = makeToken({
      unitId: 'last-known-target',
      side: GameSide.Opponent,
      position: { q: 3, r: 0 },
      fogStatus: 'lastKnown',
      lastKnownPosition: { q: 1, r: 0 },
    });

    const result = deriveValidWeaponTargetIds({
      currentState: makeCombatState({
        attacker: { side: GameSide.Player, position: { q: 0, r: 0 } },
        'visible-target': {
          side: GameSide.Opponent,
          position: { q: 2, r: 0 },
        },
        'last-known-target': {
          side: GameSide.Opponent,
          position: { q: 3, r: 0 },
        },
      }),
      selectedUnitId: 'attacker',
      tokens: [attacker, visibleTarget, lastKnownTarget],
      mapRadius: 3,
      grid,
      unitWeapons: { attacker: [makeWeapon()] },
    });

    expect(result).toEqual(['visible-target']);
  });

  it('filters valid targets by selected weapon ids when provided', () => {
    const grid = createHexGrid({ radius: 3 });
    const attacker = makeToken({
      unitId: 'attacker',
      isSelected: true,
      position: { q: 0, r: 0 },
      facing: Facing.Southeast,
    });
    const visibleTarget = makeToken({
      unitId: 'visible-target',
      side: GameSide.Opponent,
      position: { q: 2, r: 0 },
    });

    const result = deriveValidWeaponTargetIds({
      currentState: makeCombatState({
        attacker: { side: GameSide.Player, position: { q: 0, r: 0 } },
        'visible-target': {
          side: GameSide.Opponent,
          position: { q: 2, r: 0 },
        },
      }),
      selectedUnitId: 'attacker',
      tokens: [attacker, visibleTarget],
      mapRadius: 3,
      grid,
      unitWeapons: {
        attacker: [
          makeWeapon({
            id: 'small-laser',
            ranges: { short: 1, medium: 1, long: 1 },
          }),
          makeWeapon({
            id: 'medium-laser',
            ranges: { short: 2, medium: 4, long: 6 },
          }),
        ],
      },
      selectedWeaponIds: ['small-laser'],
    });

    expect(result).toEqual([]);
  });
});
