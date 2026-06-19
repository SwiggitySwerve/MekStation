import type {
  IGameState,
  IPhysicalAttackResolvedPayload,
} from '@/types/gameplay';

import { removeEquivalentINarcPod } from '@/utils/gameplay/specialWeaponMechanics';

import { hexNeighbor } from '../hexMath';

function facingToward(
  source: IGameState['units'][string]['position'],
  destination: IGameState['units'][string]['position'],
  fallback: IGameState['units'][string]['facing'],
): IGameState['units'][string]['facing'] {
  for (let facing = 0; facing < 6; facing++) {
    const neighbor = hexNeighbor(source, facing as typeof fallback);
    if (neighbor.q === destination.q && neighbor.r === destination.r) {
      return facing as typeof fallback;
    }
  }
  return fallback;
}

export function applyPhysicalAttackResolved(
  state: IGameState,
  payload: IPhysicalAttackResolvedPayload,
): IGameState {
  if (!payload.hit && (payload.displacements?.length ?? 0) === 0) {
    return state;
  }

  let units: IGameState['units'] = state.units;

  if (payload.hit) {
    units = applyPhysicalHitPayload(units, payload);
  }

  units = applyPhysicalDisplacements(units, payload);

  if (payload.hit && payload.attackType === 'break-grapple') {
    units = applyBreakGrappleResolution(units, payload);
  }

  return { ...state, units };
}

function applyPhysicalHitPayload(
  units: IGameState['units'],
  payload: IPhysicalAttackResolvedPayload,
): IGameState['units'] {
  let updatedUnits = applyTargetDamage(units, payload);

  if (payload.attackType === 'grapple') {
    updatedUnits = applyGrappleResolution(updatedUnits, payload);
  }

  return updatedUnits;
}

function applyTargetDamage(
  units: IGameState['units'],
  payload: IPhysicalAttackResolvedPayload,
): IGameState['units'] {
  const target = units[payload.targetId];
  if (!target) {
    return units;
  }

  const currentDamageThisPhase = target.damageThisPhase ?? 0;
  return {
    ...units,
    [payload.targetId]: {
      ...target,
      ...buildBrushOffTargetState(target, payload),
      damageThisPhase: currentDamageThisPhase + (payload.damage ?? 0),
    },
  };
}

function buildBrushOffTargetState(
  target: IGameState['units'][string],
  payload: IPhysicalAttackResolvedPayload,
): Partial<IGameState['units'][string]> {
  if (payload.attackType !== 'brush-off') {
    return {};
  }

  const brushOffINarcPods =
    target.iNarcPods === undefined
      ? undefined
      : payload.selectedINarcPod
        ? removeEquivalentINarcPod(target.iNarcPods, payload.selectedINarcPod)
        : target.iNarcPods.slice(1);
  const combatState =
    target.combatState?.kind === 'squad'
      ? {
          ...target.combatState,
          state: removeSquadSwarmState(target.combatState.state),
        }
      : target.combatState;

  return {
    isSwarming: false,
    ...(brushOffINarcPods !== undefined
      ? { iNarcPods: brushOffINarcPods }
      : {}),
    ...(combatState ? { combatState } : {}),
  };
}

function removeSquadSwarmState<
  T extends NonNullable<IGameState['units'][string]['combatState']>['state'],
>(state: T): T {
  const { swarmingUnitId: _swarmingUnitId, ...squadState } = state as T & {
    readonly swarmingUnitId?: string;
  };
  return squadState as T;
}

function applyGrappleResolution(
  units: IGameState['units'],
  payload: IPhysicalAttackResolvedPayload,
): IGameState['units'] {
  const attacker = units[payload.attackerId];
  const target = units[payload.targetId];
  if (!attacker || !target) {
    return units;
  }

  return {
    ...units,
    [payload.attackerId]: {
      ...attacker,
      grappledUnitId: payload.targetId,
      isGrappleAttacker: true,
      grappledThisRound: true,
      grappleSide: 'both',
      position: target.position,
    },
    [payload.targetId]: {
      ...target,
      grappledUnitId: payload.attackerId,
      isGrappleAttacker: false,
      grappledThisRound: true,
      grappleSide: 'both',
      facing: ((attacker.facing + 3) % 6) as typeof target.facing,
    },
  };
}

function applyPhysicalDisplacements(
  units: IGameState['units'],
  payload: IPhysicalAttackResolvedPayload,
): IGameState['units'] {
  return (payload.displacements ?? []).reduce<IGameState['units']>(
    (updatedUnits, displacement) => {
      const displacedUnit = updatedUnits[displacement.unitId];
      if (!displacedUnit) {
        return updatedUnits;
      }

      return {
        ...updatedUnits,
        [displacement.unitId]: {
          ...displacedUnit,
          position: displacement.to,
        },
      };
    },
    units,
  );
}

function applyBreakGrappleResolution(
  units: IGameState['units'],
  payload: IPhysicalAttackResolvedPayload,
): IGameState['units'] {
  const attacker = units[payload.attackerId];
  const target = units[payload.targetId];
  if (!attacker || !target) {
    return units;
  }

  const movedUnitIds = new Set(
    (payload.displacements ?? [])
      .filter((displacement) => displacement.reason === 'break-grapple')
      .map((displacement) => displacement.unitId),
  );

  return {
    ...units,
    [payload.attackerId]: {
      ...attacker,
      ...releasedGrappleState(),
      facing: movedUnitIds.has(payload.attackerId)
        ? facingToward(attacker.position, target.position, attacker.facing)
        : attacker.facing,
    },
    [payload.targetId]: {
      ...target,
      ...releasedGrappleState(),
      facing: movedUnitIds.has(payload.targetId)
        ? facingToward(target.position, attacker.position, target.facing)
        : target.facing,
    },
  };
}

function releasedGrappleState(): Partial<IGameState['units'][string]> {
  return {
    grappledUnitId: undefined,
    isGrappleAttacker: undefined,
    grappledThisRound: false,
    grappleSide: undefined,
    isChainWhipGrappled: false,
  };
}
