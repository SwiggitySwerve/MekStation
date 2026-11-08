import type { IBattleArmorCombatState, IUnitGameState } from '@/types/gameplay';

/** The existing break-grapple result, shared by reducer and runner. */
export function releasedGrappleState(): Pick<
  IUnitGameState,
  | 'grappledUnitId'
  | 'isGrappleAttacker'
  | 'grappledThisRound'
  | 'grappleSide'
  | 'isChainWhipGrappled'
> {
  return {
    grappledUnitId: undefined,
    isGrappleAttacker: undefined,
    grappledThisRound: false,
    grappleSide: undefined,
    isChainWhipGrappled: false,
  };
}

/** Preserve the historical event-fold shape: remove the optional target key. */
export function removeSquadSwarmState(
  state: IBattleArmorCombatState,
): IBattleArmorCombatState {
  const { swarmingUnitId: _swarmingUnitId, ...squadState } = state;
  return squadState;
}
