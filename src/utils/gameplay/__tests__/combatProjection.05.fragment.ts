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
  it('treats last-known fog contacts as intelligence instead of legal targets', () => {
    const grid = createHexGrid({ radius: 2 });
    const attacker = makeToken({
      unitId: 'attacker',
      isSelected: true,
      position: { q: 0, r: 0 },
    });
    const target = makeToken({
      unitId: 'target',
      side: GameSide.Opponent,
      position: { q: 2, r: 0 },
      fogStatus: 'lastKnown',
      lastKnownPosition: { q: 1, r: 0 },
    });

    const targetHex = deriveCombatRangeHexes({
      attacker,
      hexes: Array.from(grid.hexes.values(), (hex) => hex.coord),
      grid,
      tokens: [attacker, target],
      weapons: [makeWeapon()],
    }).find((hex) => hex.hex.q === 1 && hex.hex.r === 0);

    expect(targetHex).toMatchObject({
      targetVisibilityState: 'lastKnown',
      visibleTargetUnitIds: [],
      obscuredTargetUnitIds: ['target'],
      attackable: false,
      targetUnitIds: ['target'],
      validTargetUnitIds: [],
      visibilityBlockedReason: 'Last known contact is not currently visible',
      attackInvalidReason: 'TargetNotVisible',
    });
  });

  it('surfaces LOS blockers with the same invalid reason the commit path expects', () => {
    const grid = createHexGrid({ radius: 3 });
    grid.hexes.set('1,0', {
      coord: { q: 1, r: 0 },
      terrain: TerrainType.Clear,
      elevation: 2,
      occupantId: null,
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
    }).find((hex) => hex.hex.q === 2 && hex.hex.r === 0);

    expect(targetHex).toMatchObject({
      losState: 'blocked',
      attackable: false,
      attackInvalidReason: 'NoLineOfSight',
      lineOfSightBlocker: {
        hex: { q: 1, r: 0 },
        kind: 'elevation',
        reason: 'Blocked by elevation +2 at (1, 0)',
      },
    });
    expect(targetHex?.lineOfSightBlockerReason).toBe(
      'Blocked by elevation +2 at (1, 0)',
    );
    expect(targetHex?.attackInvalidDetails).toBe(
      'Blocked by elevation +2 at (1, 0)',
    );
  });
});
