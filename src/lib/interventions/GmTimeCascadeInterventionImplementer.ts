import type {
  IGmPrivateMetadata,
  IGmTimeCascadeInterventionCommandPayload,
  IGmTimeCascadeInterventionDomainPayload,
  IGmTimeCascadeInterventionState,
  IGmTimeCascadePublicEffect,
  IInterventionConflict,
  IInterventionLedgerCommand,
  IInterventionLedgerImplementer,
  IInterventionLedgerPreview,
  IInterventionLedgerRecord,
} from '@/types/interventions';

import type { InterventionLedger } from './InterventionLedger';

import { buildGmInterventionRedactionEnvelope } from './GmInterventionAuthority';
import { buildGmTimeCascadeProjectedEffect } from './GmTimeCascadePreview';
import {
  applyGmTimeCascadeProjectedEffects,
  projectTimeCascadeEffectsForRecord,
} from './GmTimeCascadeProjection';

type TimeCascadePreview = IInterventionLedgerPreview<
  IGmPrivateMetadata,
  IGmTimeCascadePublicEffect,
  IGmTimeCascadeInterventionDomainPayload
>;

type TimeCascadeCommand =
  IInterventionLedgerCommand<IGmTimeCascadeInterventionCommandPayload>;

type TimeCascadeRecord = IInterventionLedgerRecord<
  IGmPrivateMetadata,
  IGmTimeCascadePublicEffect,
  IGmTimeCascadeInterventionDomainPayload
>;

export function createGmTimeCascadeInterventionImplementer(): IInterventionLedgerImplementer<
  TimeCascadeCommand,
  IGmTimeCascadeInterventionState,
  IGmPrivateMetadata,
  IGmTimeCascadePublicEffect,
  IGmTimeCascadeInterventionDomainPayload
> {
  return {
    domain: 'time',
    preview(command, state): TimeCascadePreview {
      if (!isTimeCascadeCommandPayload(command.payload)) {
        return blockedTimeCascadePreview(
          command,
          'time-cascade-payload-invalid',
          'Time cascade command requires a time advancement correction and GM-private reason.',
        );
      }

      const projected = buildGmTimeCascadeProjectedEffect(
        command.payload,
        state,
      );
      if (!projected.effect) {
        return blockedTimeCascadePreview(
          command,
          projected.code,
          projected.reason,
          projected.affectedRefs,
        );
      }

      const envelope = buildGmInterventionRedactionEnvelope(
        command.payload.privateMetadata,
        {
          summary: command.payload.publicSummary ?? projected.summary,
          family: command.payload.correction.family,
          days: command.payload.correction.days,
          fromDate: projected.effect.before.currentDate,
          toDate: projected.effect.after.currentDate,
          fromSystemId: projected.effect.before.currentSystemId,
          toSystemId: projected.effect.after.currentSystemId,
          changedStateRefs: projected.changedStateRefs,
          visibleToPlayerIds: command.payload.visibleToPlayerIds,
        },
      );

      return {
        domain: 'time',
        kind: command.kind,
        status: 'ready',
        actorId: command.actorId,
        targetRefs: command.targetRefs,
        causedBy: command.causedBy,
        supersedes: command.supersedes,
        privateMetadata: envelope.privateMetadata,
        publicEffect: envelope.publicEffect,
        domainPayload: {
          correction: command.payload.correction,
          projectedEffects: [projected.effect],
        },
        projectedEvents: [projected.effect],
        conflicts: projected.conflicts,
      };
    },
    apply(record, state): IGmTimeCascadeInterventionState {
      return applyGmTimeCascadeProjectedEffects(
        state,
        projectTimeCascadeEffectsForRecord(record as TimeCascadeRecord),
      );
    },
    projectPublic(record): IGmTimeCascadePublicEffect {
      return record.publicEffect;
    },
    projectPrivate(record): IGmPrivateMetadata {
      return record.privateMetadata;
    },
  };
}

export function registerGmTimeCascadeInterventionImplementer(
  ledger: InterventionLedger<IGmTimeCascadeInterventionState>,
): InterventionLedger<IGmTimeCascadeInterventionState> {
  return ledger.register(
    createGmTimeCascadeInterventionImplementer() as IInterventionLedgerImplementer<
      IInterventionLedgerCommand,
      IGmTimeCascadeInterventionState
    >,
  );
}

function blockedTimeCascadePreview(
  command: IInterventionLedgerCommand,
  code: string,
  reason: string,
  affectedRefs: readonly string[] = command.targetRefs,
): TimeCascadePreview {
  const conflict: IInterventionConflict = {
    code,
    message: reason,
    affectedRefs,
  };

  return {
    domain: 'time',
    kind: command.kind,
    status: 'blocked',
    actorId: command.actorId,
    targetRefs: command.targetRefs,
    causedBy: command.causedBy,
    supersedes: command.supersedes,
    conflicts: [conflict],
    reason,
  };
}

function isTimeCascadeCommandPayload(
  payload: unknown,
): payload is IGmTimeCascadeInterventionCommandPayload {
  if (!isRecord(payload)) return false;
  if (!isRecord(payload.privateMetadata)) return false;
  if (typeof payload.privateMetadata.reason !== 'string') return false;
  if (!isRecord(payload.correction)) return false;
  return payload.correction.family === 'time-advance';
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
