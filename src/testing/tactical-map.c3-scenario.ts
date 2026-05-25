import type { IApplyAttackInput } from '@/engine/InteractiveSession.actions';
import type { ICombatRangeHex, IGameState, IUnitToken } from '@/types/gameplay';

import {
  Facing,
  GameSide,
  LockState,
  MovementType,
  TokenUnitType,
} from '@/types/gameplay';
import {
  addC3Network,
  createC3MasterSlaveNetwork,
  createC3Unit,
  createEmptyC3State,
} from '@/utils/gameplay/c3Network';
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
  tacticalMapTokens,
} from './tactical-map.fixtures';

export const tacticalMapC3RangeBenefitTargetId = 'medium-target';
const tacticalMapC3RangeBenefitTargetHex = { q: 1, r: 2 } as const;
export const tacticalMapC3RangeBenefitSelectedWeaponIds = ['medium-laser'];

const tacticalMapC3SpotterToken: IUnitToken = {
  unitId: 'c3-spotter',
  name: 'Raven RVN-3L',
  designation: 'RVN',
  position: { q: 1, r: 1 },
  facing: Facing.Southwest,
  side: GameSide.Player,
  isDestroyed: false,
  isSelected: false,
  isValidTarget: false,
  unitType: TokenUnitType.Mech,
};

export const tacticalMapC3RangeBenefitTokens: readonly IUnitToken[] = [
  ...tacticalMapTokens,
  tacticalMapC3SpotterToken,
];

const tacticalMapC3Network = createC3MasterSlaveNetwork('c3-map-net', [
  createC3Unit({
    entityId: 'attacker',
    teamId: GameSide.Player,
    role: 'master',
    position: { q: -1, r: 0 },
  }),
  createC3Unit({
    entityId: 'c3-spotter',
    teamId: GameSide.Player,
    role: 'slave',
    position: tacticalMapC3SpotterToken.position,
  }),
]);

if (!tacticalMapC3Network) {
  throw new Error('Expected tactical-map C3 network fixture');
}

export const tacticalMapC3RangeBenefitCombatState: IGameState = {
  ...tacticalMapCombatState,
  units: {
    ...tacticalMapCombatState.units,
    [tacticalMapC3SpotterToken.unitId]: {
      id: tacticalMapC3SpotterToken.unitId,
      side: tacticalMapC3SpotterToken.side,
      position: tacticalMapC3SpotterToken.position,
      facing: tacticalMapC3SpotterToken.facing,
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
      prone: false,
      destroyed: false,
      lockState: LockState.Pending,
      shutdown: false,
      hasRetreated: false,
      gunnery: 4,
    },
  },
  c3State: addC3Network(createEmptyC3State(), tacticalMapC3Network),
};

const tacticalMapC3Grid = tacticalMapCombatGrid();
const tacticalMapC3Attacker = tacticalMapC3RangeBenefitTokens.find(
  (token) => token.unitId === 'attacker',
);

if (!tacticalMapC3Attacker) {
  throw new Error('Missing tactical-map C3 attacker token');
}

export const tacticalMapC3RangeBenefitCombatProjection: ICombatRangeHex =
  requireCombatProjection(
    deriveCombatRangeHexes({
      attacker: tacticalMapC3Attacker,
      targetUnitId: tacticalMapC3RangeBenefitTargetId,
      hexes: Array.from(tacticalMapC3Grid.hexes.values(), (hex) => hex.coord),
      grid: tacticalMapC3Grid,
      tokens: tacticalMapC3RangeBenefitTokens,
      weapons: tacticalMapSelectedWeapons(
        tacticalMapC3RangeBenefitSelectedWeaponIds,
      ),
      combatState: tacticalMapC3RangeBenefitCombatState,
    }).find(
      (projection) =>
        projection.hex.q === tacticalMapC3RangeBenefitTargetHex.q &&
        projection.hex.r === tacticalMapC3RangeBenefitTargetHex.r,
    ),
  );

export function tacticalMapC3RangeBenefitCommitInput(): IApplyAttackInput {
  return {
    session: tacticalMapCombatSession({
      tokens: tacticalMapC3RangeBenefitTokens,
      combatState: tacticalMapC3RangeBenefitCombatState,
    }),
    weaponsByUnit: tacticalMapWeaponsByUnit(),
    attackerId: 'attacker',
    targetId: tacticalMapC3RangeBenefitTargetId,
    weaponIds: tacticalMapC3RangeBenefitSelectedWeaponIds,
    grid: tacticalMapC3Grid,
  };
}
