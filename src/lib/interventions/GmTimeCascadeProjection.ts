import type {
  IGmPrivateMetadata,
  IGmTimeCascadeInterventionDomainPayload,
  IGmTimeCascadeInterventionState,
  IGmTimeCascadeProjectedEffect,
  IGmTimeCascadePublicEffect,
  IInterventionLedgerRecord,
} from '@/types/interventions';

type TimeCascadeRecord = IInterventionLedgerRecord<
  IGmPrivateMetadata,
  IGmTimeCascadePublicEffect,
  IGmTimeCascadeInterventionDomainPayload
>;

export function projectTimeCascadeEffectsForRecord(
  record: TimeCascadeRecord,
): readonly IGmTimeCascadeProjectedEffect[] {
  if (!record.domainPayload) return [];

  return record.domainPayload.projectedEffects.map((effect) => ({
    ...effect,
    interventionId: record.id,
  }));
}

export function applyGmTimeCascadeProjectedEffects(
  state: IGmTimeCascadeInterventionState,
  effects: readonly IGmTimeCascadeProjectedEffect[],
): IGmTimeCascadeInterventionState {
  return effects.reduce(applyGmTimeCascadeProjectedEffect, state);
}

function applyGmTimeCascadeProjectedEffect(
  state: IGmTimeCascadeInterventionState,
  effect: IGmTimeCascadeProjectedEffect,
): IGmTimeCascadeInterventionState {
  return {
    ...state,
    ...effect.afterCampaign,
    timeCascadeEvents: [...(state.timeCascadeEvents ?? []), effect],
  };
}
