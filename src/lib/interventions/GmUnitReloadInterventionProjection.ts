import type {
  IGmPrivateMetadata,
  IGmUnitReloadInterventionDomainPayload,
  IGmUnitReloadInterventionState,
  IGmUnitReloadProjectedEffect,
  IGmUnitReloadPublicEffect,
  IInterventionLedgerRecord,
} from '@/types/interventions';

type UnitReloadRecord = IInterventionLedgerRecord<
  IGmPrivateMetadata,
  IGmUnitReloadPublicEffect,
  IGmUnitReloadInterventionDomainPayload
>;

export function projectUnitReloadEffectsForRecord(
  record: UnitReloadRecord,
): readonly IGmUnitReloadProjectedEffect[] {
  if (!record.domainPayload) return [];

  return record.domainPayload.projectedEffects.map((effect) => ({
    ...effect,
    interventionId: record.id,
  }));
}

export function applyGmUnitReloadProjectedEffects(
  state: IGmUnitReloadInterventionState,
  effects: readonly IGmUnitReloadProjectedEffect[],
): IGmUnitReloadInterventionState {
  return effects.reduce(applyGmUnitReloadProjectedEffect, state);
}

function applyGmUnitReloadProjectedEffect(
  state: IGmUnitReloadInterventionState,
  effect: IGmUnitReloadProjectedEffect,
): IGmUnitReloadInterventionState {
  return appendGmUnitReloadEvent(
    {
      ...state,
      units: {
        ...state.units,
        [effect.unitId]: effect.after.unit,
      },
      sessionUnits: state.sessionUnits?.map((unit) =>
        unit.id === effect.unitId ? effect.after.sessionUnit : unit,
      ),
    },
    effect,
  );
}

function appendGmUnitReloadEvent(
  state: IGmUnitReloadInterventionState,
  effect: IGmUnitReloadProjectedEffect,
): IGmUnitReloadInterventionState {
  return {
    ...state,
    gmUnitReloadEvents: [...(state.gmUnitReloadEvents ?? []), effect],
  };
}
