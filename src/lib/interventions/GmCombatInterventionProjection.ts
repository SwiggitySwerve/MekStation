import type {
  IGmCombatInterventionDomainPayload,
  IGmCombatInterventionState,
  IGmCombatInterventionUnitState,
  IGmCombatProjectedEffect,
  IGmCombatPublicEffect,
  IGmPrivateMetadata,
  IInterventionLedgerRecord,
} from '@/types/interventions';

type CombatRecord = IInterventionLedgerRecord<
  IGmPrivateMetadata,
  IGmCombatPublicEffect,
  IGmCombatInterventionDomainPayload
>;

type TurnOrderEffect = Extract<
  IGmCombatProjectedEffect,
  { readonly family: 'turn-order' }
>;

type ObjectiveStateEffect = Extract<
  IGmCombatProjectedEffect,
  { readonly family: 'objective-state' }
>;

export function projectCombatEffectsForRecord(
  record: CombatRecord,
): readonly IGmCombatProjectedEffect[] {
  if (!record.domainPayload) return [];

  return record.domainPayload.projectedEffects.map(
    (effect) =>
      ({
        ...effect,
        interventionId: record.id,
      }) as IGmCombatProjectedEffect,
  );
}

export function applyGmCombatProjectedEffects(
  state: IGmCombatInterventionState,
  effects: readonly IGmCombatProjectedEffect[],
): IGmCombatInterventionState {
  return effects.reduce(applyGmCombatProjectedEffect, state);
}

function applyGmCombatProjectedEffect(
  state: IGmCombatInterventionState,
  effect: IGmCombatProjectedEffect,
): IGmCombatInterventionState {
  switch (effect.family) {
    case 'reposition-facing':
      return appendGmCombatEvent(
        patchUnit(state, effect.unitId, definedUnitPatch(effect.after)),
        effect,
      );
    case 'damage-critical':
      return appendGmCombatEvent(
        patchUnit(state, effect.unitId, definedUnitPatch(effect.after)),
        effect,
      );
    case 'heat-ammo':
      return appendGmCombatEvent(
        patchUnit(state, effect.unitId, definedUnitPatch(effect.after)),
        effect,
      );
    case 'turn-order':
      return appendGmCombatEvent(applyTurnOrderEffect(state, effect), effect);
    case 'lifecycle':
      return appendGmCombatEvent(
        patchUnit(state, effect.unitId, {
          destroyed: effect.after.destroyed,
          destructionCause: effect.after.destructionCause,
          hasEjected: effect.after.hasEjected,
          isWithdrawing: effect.after.isWithdrawing,
          hasRetreated: effect.after.hasRetreated,
          shutdown: effect.after.shutdown,
          rescued: effect.after.rescued,
          retreatTargetEdge: effect.after.retreatTargetEdge,
        }),
        effect,
      );
    case 'attack-resolution':
      return appendGmCombatEvent(
        applyAttackResolutionEffect(state, effect),
        effect,
      );
    case 'objective-state':
      return appendGmCombatEvent(
        applyObjectiveStateEffect(state, effect),
        effect,
      );
  }
}

function applyTurnOrderEffect(
  state: IGmCombatInterventionState,
  effect: TurnOrderEffect,
): IGmCombatInterventionState {
  return {
    ...state,
    ...(effect.after.phase !== undefined ? { phase: effect.after.phase } : {}),
    ...(effect.after.initiativeWinner !== undefined
      ? { initiativeWinner: effect.after.initiativeWinner }
      : {}),
    ...(effect.after.firstMover !== undefined
      ? { firstMover: effect.after.firstMover }
      : {}),
    ...(effect.after.activationIndex !== undefined
      ? { activationIndex: effect.after.activationIndex }
      : {}),
    ...(effect.after.initiativeOrder !== undefined
      ? { initiativeOrder: effect.after.initiativeOrder }
      : {}),
    ...(effect.after.activeUnitId !== undefined
      ? { activeUnitId: effect.after.activeUnitId }
      : {}),
  };
}

function applyAttackResolutionEffect(
  state: IGmCombatInterventionState,
  effect: Extract<
    IGmCombatProjectedEffect,
    { readonly family: 'attack-resolution' }
  >,
): IGmCombatInterventionState {
  return {
    ...state,
    attackResolutionCorrections: {
      ...(state.attackResolutionCorrections ?? {}),
      [effect.attackId]: effect.after,
    },
  };
}

function applyObjectiveStateEffect(
  state: IGmCombatInterventionState,
  effect: ObjectiveStateEffect,
): IGmCombatInterventionState {
  const objectives = { ...(state.objectives ?? {}) };
  if (effect.before?.hexKey && effect.before.hexKey !== effect.after.hexKey) {
    delete objectives[effect.before.hexKey];
  }
  objectives[effect.after.hexKey] = effect.after;

  return {
    ...state,
    objectives,
  };
}

function patchUnit(
  state: IGmCombatInterventionState,
  unitId: string,
  patch: Partial<IGmCombatInterventionUnitState>,
): IGmCombatInterventionState {
  const unit = state.units[unitId];
  if (!unit) return state;

  return {
    ...state,
    units: {
      ...state.units,
      [unitId]: {
        ...unit,
        ...patch,
      },
    },
  };
}

function appendGmCombatEvent(
  state: IGmCombatInterventionState,
  effect: IGmCombatProjectedEffect,
): IGmCombatInterventionState {
  return {
    ...state,
    gmInterventionEvents: [...(state.gmInterventionEvents ?? []), effect],
  };
}

function definedUnitPatch<T extends Partial<IGmCombatInterventionUnitState>>(
  value: T,
): Partial<IGmCombatInterventionUnitState> {
  const entries = Object.entries(value).filter(
    ([, entryValue]) => entryValue !== undefined,
  );
  return Object.fromEntries(entries) as Partial<IGmCombatInterventionUnitState>;
}
