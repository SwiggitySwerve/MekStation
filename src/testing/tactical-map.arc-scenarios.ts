import type { IApplyAttackInput } from '@/engine/InteractiveSession.actions';
import type { IWeapon } from '@/simulation/ai/types';
import type { IGameState, IUnitToken, IWeaponStatus } from '@/types/gameplay';

import {
  Facing,
  FiringArc,
  GamePhase,
  GameSide,
  GameStatus,
  MovementType,
  TokenUnitType,
} from '@/types/gameplay';
import { deriveCombatRangeHexes } from '@/utils/gameplay/combatProjection';

import {
  requireCombatProjection,
  tacticalMapCombatGrid,
  tacticalMapCombatSession,
} from './tactical-map.combat-scenarios';

export const tacticalMapOutOfArcTargetId = 'rear-arc-target';
export const tacticalMapOutOfArcTargetHex = { q: 0, r: 1 } as const;
export const tacticalMapOutOfArcSelectedWeaponIds = ['front-arc-laser'];

export const tacticalMapOutOfArcTokens: readonly IUnitToken[] = [
  {
    unitId: 'attacker',
    name: 'Shadow Hawk SHD-2H',
    designation: 'SHD',
    position: { q: 0, r: 0 },
    facing: Facing.North,
    side: GameSide.Player,
    isDestroyed: false,
    isSelected: true,
    isValidTarget: false,
    unitType: TokenUnitType.Mech,
  },
  {
    unitId: tacticalMapOutOfArcTargetId,
    name: 'Rear Arc Target',
    designation: 'RAT',
    position: tacticalMapOutOfArcTargetHex,
    facing: Facing.South,
    side: GameSide.Opponent,
    isDestroyed: false,
    isSelected: false,
    isValidTarget: true,
    isActiveTarget: true,
    unitType: TokenUnitType.Mech,
  },
];

export const tacticalMapOutOfArcCombatState: IGameState = {
  gameId: 'tactical-map-e2e',
  status: GameStatus.Active,
  turn: 1,
  phase: GamePhase.WeaponAttack,
  activationIndex: 0,
  turnEvents: [],
  units: Object.fromEntries(
    tacticalMapOutOfArcTokens.map((token) => [
      token.unitId,
      {
        id: token.unitId,
        side: token.side,
        position: token.position,
        facing: token.facing,
        heat: 0,
        movementThisTurn: MovementType.Stationary,
        hexesMovedThisTurn: 0,
        prone: false,
        destroyed: token.isDestroyed,
        shutdown: false,
        hasRetreated: false,
        gunnery: 4,
      },
    ]),
  ) as IGameState['units'],
};

export const tacticalMapOutOfArcUnitWeapons: Record<
  string,
  readonly IWeaponStatus[]
> = {
  attacker: [
    {
      id: 'front-arc-laser',
      name: 'Front Arc Laser',
      location: 'right_arm',
      mountingArc: FiringArc.Front,
      mountingArcs: [FiringArc.Front],
      destroyed: false,
      firedThisTurn: false,
      heat: 3,
      damage: 5,
      ranges: { short: 3, medium: 6, long: 9 },
    },
  ],
};

function weaponStatusToCommitWeapon(status: IWeaponStatus): IWeapon {
  return {
    id: status.id,
    name: status.name,
    shortRange: status.ranges.short,
    mediumRange: status.ranges.medium,
    longRange: status.ranges.long,
    extremeRange: status.ranges.extreme,
    damage: typeof status.damage === 'number' ? status.damage : 0,
    heat: status.heat,
    minRange: status.ranges.minimum ?? 0,
    ammoPerTon:
      status.ammoRemaining === undefined
        ? -1
        : Math.max(1, status.ammoMax ?? status.ammoRemaining),
    destroyed: status.destroyed,
    mountingArc: status.mountingArc,
    mountingArcs: status.mountingArcs,
    isTorpedo: status.isTorpedo,
  };
}

function tacticalMapOutOfArcWeaponsByUnit(): Map<string, readonly IWeapon[]> {
  return new Map(
    Object.entries(tacticalMapOutOfArcUnitWeapons).map(([unitId, weapons]) => [
      unitId,
      weapons.map(weaponStatusToCommitWeapon),
    ]),
  );
}

const tacticalMapOutOfArcGrid = tacticalMapCombatGrid();

export const tacticalMapOutOfArcCombatProjection = requireCombatProjection(
  deriveCombatRangeHexes({
    attacker: tacticalMapOutOfArcTokens[0],
    targetUnitId: tacticalMapOutOfArcTargetId,
    hexes: Array.from(
      tacticalMapOutOfArcGrid.hexes.values(),
      (hex) => hex.coord,
    ),
    grid: tacticalMapOutOfArcGrid,
    tokens: tacticalMapOutOfArcTokens,
    weapons: tacticalMapOutOfArcUnitWeapons.attacker,
    combatState: tacticalMapOutOfArcCombatState,
  }).find(
    (projection) =>
      projection.hex.q === tacticalMapOutOfArcTargetHex.q &&
      projection.hex.r === tacticalMapOutOfArcTargetHex.r,
  ),
);

export function tacticalMapOutOfArcCommitInput(): IApplyAttackInput {
  return {
    session: tacticalMapCombatSession({
      tokens: tacticalMapOutOfArcTokens,
      combatState: tacticalMapOutOfArcCombatState,
    }),
    weaponsByUnit: tacticalMapOutOfArcWeaponsByUnit(),
    attackerId: 'attacker',
    targetId: tacticalMapOutOfArcTargetId,
    weaponIds: tacticalMapOutOfArcSelectedWeaponIds,
    grid: tacticalMapOutOfArcGrid,
  };
}
