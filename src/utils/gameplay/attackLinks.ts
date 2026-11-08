import type {
  IBattleArmorCombatState,
  IGameState,
  IUnitGameState,
} from '@/types/gameplay';

import { getUnitOperability } from './unitOperability';

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

/**
 * Release only relationships involving an off-field participant. Call at the
 * existing exit commit, including direct destruction before UnitDestroyed.
 * See ATTACK_LINK_RULES.md for pinned rules and the grappled-retreat deviation.
 */
export function clearAttackLinks(
  state: IGameState,
  unitId: string,
): IGameState {
  const exited = state.units[unitId];
  if (!exited || getUnitOperability(exited).onField) return state;

  let units = state.units;
  for (const [id, unit] of Object.entries(state.units)) {
    const released = releaseUnitLinks(unit, id === unitId, exited);
    if (released !== unit) {
      if (units === state.units) units = { ...units };
      units[id] = released;
    }
  }
  return units === state.units ? state : { ...state, units };
}

function releaseUnitLinks(
  unit: IUnitGameState,
  isExiting: boolean,
  exited: IUnitGameState,
): IUnitGameState {
  let next = unit;
  const sharesGrapple =
    isExiting ||
    unit.grappledUnitId === exited.id ||
    (exited.grappledUnitId === unit.id && unit.grappledUnitId === undefined);
  const hasGrapple =
    unit.grappledUnitId !== undefined ||
    unit.isGrappleAttacker !== undefined ||
    unit.grappledThisRound === true ||
    unit.grappleSide !== undefined ||
    unit.isChainWhipGrappled === true;
  if (sharesGrapple && hasGrapple)
    next = { ...next, ...releasedGrappleState() };

  const squad =
    unit.combatState?.kind === 'squad' ? unit.combatState : undefined;
  const detachSquad =
    squad?.state.swarmingUnitId !== undefined &&
    (isExiting || squad.state.swarmingUnitId === exited.id);
  if (detachSquad && squad) {
    next = {
      ...next,
      isSwarming: false,
      combatState: { ...squad, state: removeSquadSwarmState(squad.state) },
    };
  } else if (isExiting && unit.isSwarming === true) {
    next = { ...next, isSwarming: false };
  }

  const releaseOutgoing =
    isExiting ||
    unit.displacementAttackTargetId === exited.id ||
    (exited.targetedByDisplacementAttackerId === unit.id &&
      unit.displacementAttackTargetId === undefined);
  const hasOutgoing =
    unit.displacementAttackTargetId !== undefined ||
    unit.isMakingDFA === true ||
    unit.isMakingDisplacementAttack === true ||
    unit.isPushing === true;
  if (releaseOutgoing && hasOutgoing) {
    next = {
      ...next,
      displacementAttackTargetId: undefined,
      isMakingDFA: false,
      isMakingDisplacementAttack: false,
      isPushing: false,
    };
  }
  if (
    unit.targetedByDisplacementAttackerId !== undefined &&
    (isExiting || unit.targetedByDisplacementAttackerId === exited.id)
  ) {
    next = { ...next, targetedByDisplacementAttackerId: undefined };
  }
  return next;
}
