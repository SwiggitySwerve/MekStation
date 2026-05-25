import type { IApplyAttackInput } from '@/engine/InteractiveSession.actions';
import type {
  IGameState,
  IHexCoordinate,
  IUnitGameState,
  IUnitToken,
} from '@/types/gameplay';

import {
  Facing,
  GamePhase,
  GameSide,
  GameStatus,
  LockState,
  MovementType,
  TokenUnitType,
} from '@/types/gameplay';
import { deriveCombatRangeHexes } from '@/utils/gameplay/combatProjection';

import {
  requireCombatProjection,
  tacticalMapCombatGrid,
  tacticalMapCombatSession,
  tacticalMapSelectedWeapons,
  tacticalMapWeaponsByUnit,
} from './tactical-map.combat-scenarios';
import {
  tacticalMapCombatState,
  tacticalMapSelectedWeaponIds,
  tacticalMapTokens,
} from './tactical-map.fixtures';

export const tacticalMapMixedVisibilityTargetId = 'medium-target';
export const tacticalMapMixedVisibilityTargetHex = { q: 1, r: 2 } as const;
export const tacticalMapMixedVisibilitySelectedWeaponIds =
  tacticalMapSelectedWeaponIds;

const mixedVisibilityHiddenId = 'same-hex-hidden-contact';
const mixedVisibilityLastKnownId = 'same-hex-last-known-contact';

function mixedVisibilityToken({
  unitId,
  name,
  designation,
  fogStatus,
  position,
  lastKnownPosition,
}: {
  readonly unitId: string;
  readonly name: string;
  readonly designation: string;
  readonly fogStatus: 'hidden' | 'lastKnown';
  readonly position: IHexCoordinate;
  readonly lastKnownPosition?: IHexCoordinate;
}): IUnitToken {
  return {
    unitId,
    name,
    designation,
    position,
    lastKnownPosition,
    facing: Facing.Southwest,
    side: GameSide.Opponent,
    isDestroyed: false,
    isSelected: false,
    isValidTarget: false,
    fogStatus,
    unitType: TokenUnitType.Mech,
  };
}

function mixedVisibilityUnitState(
  unitId: string,
  position: IHexCoordinate,
): IUnitGameState {
  return {
    id: unitId,
    side: GameSide.Opponent,
    position,
    facing: Facing.Southwest,
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
    prone: false,
    shutdown: false,
    hasRetreated: false,
    gunnery: 4,
  };
}

export const tacticalMapMixedVisibilityTokens: readonly IUnitToken[] = [
  ...tacticalMapTokens,
  mixedVisibilityToken({
    unitId: mixedVisibilityHiddenId,
    name: 'Hidden Contact',
    designation: 'HID',
    fogStatus: 'hidden',
    position: tacticalMapMixedVisibilityTargetHex,
  }),
  mixedVisibilityToken({
    unitId: mixedVisibilityLastKnownId,
    name: 'Last Known Contact',
    designation: 'LKC',
    fogStatus: 'lastKnown',
    position: { q: 3, r: -1 },
    lastKnownPosition: tacticalMapMixedVisibilityTargetHex,
  }),
];

export const tacticalMapMixedVisibilityCombatState: IGameState = {
  gameId: 'tactical-map-e2e',
  status: GameStatus.Active,
  turn: 1,
  phase: GamePhase.WeaponAttack,
  activationIndex: 0,
  turnEvents: [],
  units: {
    ...tacticalMapCombatState.units,
    [mixedVisibilityHiddenId]: mixedVisibilityUnitState(
      mixedVisibilityHiddenId,
      tacticalMapMixedVisibilityTargetHex,
    ),
    [mixedVisibilityLastKnownId]: mixedVisibilityUnitState(
      mixedVisibilityLastKnownId,
      { q: 3, r: -1 },
    ),
  },
};

const tacticalMapMixedVisibilityGrid = tacticalMapCombatGrid();
const tacticalMapMixedVisibilityAttacker = tacticalMapTokens.find(
  (token) => token.unitId === 'attacker',
);

if (!tacticalMapMixedVisibilityAttacker) {
  throw new Error('Missing tactical-map attacker token');
}

export const tacticalMapMixedVisibilityCombatProjection =
  requireCombatProjection(
    deriveCombatRangeHexes({
      attacker: tacticalMapMixedVisibilityAttacker,
      hexes: Array.from(
        tacticalMapMixedVisibilityGrid.hexes.values(),
        (hex) => hex.coord,
      ),
      grid: tacticalMapMixedVisibilityGrid,
      tokens: tacticalMapMixedVisibilityTokens,
      weapons: tacticalMapSelectedWeapons(
        tacticalMapMixedVisibilitySelectedWeaponIds,
      ),
      combatState: tacticalMapMixedVisibilityCombatState,
    }).find(
      (projection) =>
        projection.hex.q === tacticalMapMixedVisibilityTargetHex.q &&
        projection.hex.r === tacticalMapMixedVisibilityTargetHex.r,
    ),
  );

export function tacticalMapMixedVisibilityCommitInput(): IApplyAttackInput {
  return {
    session: tacticalMapCombatSession({
      tokens: tacticalMapMixedVisibilityTokens,
      combatState: tacticalMapMixedVisibilityCombatState,
    }),
    weaponsByUnit: tacticalMapWeaponsByUnit(),
    attackerId: 'attacker',
    targetId: tacticalMapMixedVisibilityTargetId,
    weaponIds: tacticalMapMixedVisibilitySelectedWeaponIds,
    grid: tacticalMapMixedVisibilityGrid,
  };
}
