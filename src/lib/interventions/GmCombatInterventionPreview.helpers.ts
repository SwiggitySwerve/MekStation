import type {
  IGmCombatAttackResolutionCorrection,
  IGmCombatInterventionState,
  IGmCombatLifecycleCorrection,
  IGmCombatObjectiveStateCorrection,
  IGmCombatProjectedEffect,
} from '@/types/interventions';

import {
  isObjectiveMarker,
  type IObjectiveMarker,
} from '@/types/scenario/ScenarioInterfaces';

type LifecycleEffect = Extract<
  IGmCombatProjectedEffect,
  { readonly family: 'lifecycle' }
>;

type LifecyclePatch = LifecycleEffect['after'];

export function lifecyclePatch(
  correction: IGmCombatLifecycleCorrection,
): LifecyclePatch {
  switch (correction.lifecycle) {
    case 'active':
      return inactiveLifecyclePatch();
    case 'ejected':
      return { ...inactiveLifecyclePatch(), hasEjected: true };
    case 'withdrawing':
      return {
        ...inactiveLifecyclePatch(),
        isWithdrawing: true,
        retreatTargetEdge: correction.retreatTargetEdge,
      };
    case 'withdrawn':
      return { ...inactiveLifecyclePatch(), hasRetreated: true };
    case 'disabled':
      return { ...inactiveLifecyclePatch(), shutdown: true };
    case 'destroyed':
      return {
        ...inactiveLifecyclePatch(),
        destroyed: true,
        destructionCause: correction.destructionCause ?? 'damage',
      };
    case 'rescued':
      return {
        ...inactiveLifecyclePatch(),
        hasRetreated: true,
        rescued: true,
      };
  }
}

function inactiveLifecyclePatch(): LifecyclePatch {
  return {
    destroyed: false,
    destructionCause: undefined,
    hasEjected: false,
    isWithdrawing: false,
    hasRetreated: false,
    shutdown: false,
    rescued: false,
    retreatTargetEdge: undefined,
  };
}

export function resolveActivationIndex(
  initiativeOrder: readonly string[] | undefined,
  activeUnitId: string | null | undefined,
): number | undefined {
  if (!initiativeOrder || !activeUnitId) return undefined;
  const index = initiativeOrder.indexOf(activeUnitId);
  return index >= 0 ? index : undefined;
}

export function resolveActiveUnitId(
  initiativeOrder: readonly string[] | undefined,
  activationIndex: number | undefined,
): string | null | undefined {
  if (!initiativeOrder || activationIndex === undefined) return undefined;
  return initiativeOrder[activationIndex] ?? null;
}

export function unitRef(unitId: string): string {
  return `unit:${unitId}`;
}

export function unitFieldRef(unitId: string, field: string): string {
  return `unit:${unitId}:${field}`;
}

export function gameRef(gameId: string): string {
  return `game:${gameId}`;
}

export function gameFieldRef(gameId: string, field: string): string {
  return `game:${gameId}:${field}`;
}

export function attackResolutionRef(attackId: string): string {
  return `attack-resolution:${attackId}`;
}

export function objectiveRef(objectiveId: string): string {
  return `objective:${objectiveId}`;
}

export function objectiveHexRef(hexKey: string): string {
  return `objective-hex:${hexKey}`;
}

export function findObjectiveMarker(
  state: IGmCombatInterventionState,
  correction: IGmCombatObjectiveStateCorrection,
): IObjectiveMarker | undefined {
  const objectives = state.objectives ?? {};

  if (correction.hexKey && objectives[correction.hexKey]) {
    return objectives[correction.hexKey];
  }

  if (correction.objectiveId) {
    return Object.values(objectives).find(
      (marker) => marker.id === correction.objectiveId,
    );
  }

  if (correction.marker && objectives[correction.marker.hexKey]) {
    return objectives[correction.marker.hexKey];
  }

  return undefined;
}

export function buildObjectiveMarkerAfter(
  correction: IGmCombatObjectiveStateCorrection,
  before: IObjectiveMarker | undefined,
): IObjectiveMarker | undefined {
  if (correction.marker) {
    const marker = {
      ...correction.marker,
      ...definedObjectPatch(correction.patch ?? {}),
    };
    return isObjectiveMarker(marker) ? marker : undefined;
  }

  if (!before || !correction.patch) return undefined;

  const marker = {
    ...before,
    ...definedObjectPatch(correction.patch),
  };
  return isObjectiveMarker(marker) ? marker : undefined;
}

function definedObjectPatch<T extends Record<string, unknown>>(
  value: T,
): Partial<T> {
  const entries = Object.entries(value).filter(
    ([, entryValue]) => entryValue !== undefined,
  );
  return Object.fromEntries(entries) as Partial<T>;
}

export function validateAttackResolutionCorrection(
  correction: IGmCombatAttackResolutionCorrection,
): string | undefined {
  if (
    !isNonEmptyString(correction.attackId) ||
    !isNonEmptyString(correction.attackerId) ||
    !isNonEmptyString(correction.targetId) ||
    !isNonEmptyString(correction.weaponId) ||
    !isFiniteNumber(correction.roll) ||
    !isFiniteNumber(correction.toHitNumber) ||
    typeof correction.hit !== 'boolean'
  ) {
    return 'Attack-resolution correction requires attackId, attackerId, targetId, weaponId, numeric roll/toHitNumber, and hit.';
  }

  return undefined;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

export function hasObjectKeys(value: object | undefined): boolean {
  return value !== undefined && Object.keys(value).length > 0;
}

export function hasOwn(value: object, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(value, key);
}
