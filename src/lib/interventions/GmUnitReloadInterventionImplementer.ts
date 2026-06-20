import type {
  IGmPrivateMetadata,
  IGmUnitReloadInterventionCommandPayload,
  IGmUnitReloadInterventionDomainPayload,
  IGmUnitReloadInterventionState,
  IGmUnitReloadPublicEffect,
  IInterventionConflict,
  IInterventionLedgerCommand,
  IInterventionLedgerImplementer,
  IInterventionLedgerPreview,
  IInterventionLedgerRecord,
} from '@/types/interventions';

import type { InterventionLedger } from './InterventionLedger';

import { buildGmInterventionRedactionEnvelope } from './GmInterventionAuthority';
import {
  applyGmUnitReloadProjectedEffects,
  projectUnitReloadEffectsForRecord,
} from './GmUnitReloadInterventionProjection';
import { buildGmUnitReloadProjectedEffect } from './GmUnitReloadReconciliation';

type UnitReloadPreview = IInterventionLedgerPreview<
  IGmPrivateMetadata,
  IGmUnitReloadPublicEffect,
  IGmUnitReloadInterventionDomainPayload
>;

type UnitReloadCommand =
  IInterventionLedgerCommand<IGmUnitReloadInterventionCommandPayload>;

type UnitReloadRecord = IInterventionLedgerRecord<
  IGmPrivateMetadata,
  IGmUnitReloadPublicEffect,
  IGmUnitReloadInterventionDomainPayload
>;

const UNIT_RELOAD_DOMAIN = 'unit-reload' as const;

export function createGmUnitReloadInterventionImplementer(): IInterventionLedgerImplementer<
  UnitReloadCommand,
  IGmUnitReloadInterventionState,
  IGmPrivateMetadata,
  IGmUnitReloadPublicEffect,
  IGmUnitReloadInterventionDomainPayload
> {
  return {
    domain: UNIT_RELOAD_DOMAIN,
    preview(command, state): UnitReloadPreview {
      if (command.kind !== 'reload') {
        return blockedUnitReloadPreview(
          command,
          'unit-reload-kind-invalid',
          'Unit reload intervention command must use kind "reload".',
        );
      }

      if (!isUnitReloadCommandPayload(command.payload)) {
        return blockedUnitReloadPreview(
          command,
          'unit-reload-payload-invalid',
          'Unit reload command requires a unit id, source map, and GM-private reason.',
        );
      }

      const projected = buildGmUnitReloadProjectedEffect(
        command.payload,
        state,
      );
      if (!projected.effect) {
        return blockedUnitReloadPreview(
          command,
          projected.code,
          projected.reason,
          projected.affectedRefs,
        );
      }

      const envelope = buildGmInterventionRedactionEnvelope(
        {
          ...command.payload.privateMetadata,
          manualTakeoverNotes:
            command.payload.privateMetadata.manualTakeoverNotes ??
            manualTakeoverSummary(projected.conflicts) ??
            command.payload.manualResolution?.notes,
        },
        {
          summary: projected.summary,
          family: UNIT_RELOAD_DOMAIN,
          changedStateRefs: projected.changedStateRefs,
          visibleToPlayerIds: command.payload.visibleToPlayerIds,
        },
      );
      const status = projected.conflicts.some(
        (conflict) => conflict.requiresManualTakeover,
      )
        ? 'requires-manual-takeover'
        : 'ready';

      return {
        domain: UNIT_RELOAD_DOMAIN,
        kind: command.kind,
        status,
        actorId: command.actorId,
        targetRefs: command.targetRefs,
        causedBy: command.causedBy,
        supersedes: command.supersedes,
        privateMetadata: envelope.privateMetadata,
        publicEffect: envelope.publicEffect,
        domainPayload: {
          reload: {
            unitId: projected.effect.unitId,
            unitRef: projected.effect.unitRef,
            pilotRef: projected.effect.pilotRef,
          },
          projectedEffects: [projected.effect],
        },
        projectedEvents: [projected.effect],
        conflicts: projected.conflicts,
      };
    },
    apply(record, state): IGmUnitReloadInterventionState {
      return applyGmUnitReloadProjectedEffects(
        state,
        projectUnitReloadEffectsForRecord(record as UnitReloadRecord),
      );
    },
    projectPublic(record): IGmUnitReloadPublicEffect {
      return record.publicEffect;
    },
    projectPrivate(record): IGmPrivateMetadata {
      return record.privateMetadata;
    },
  };
}

export function registerGmUnitReloadInterventionImplementer(
  ledger: InterventionLedger<IGmUnitReloadInterventionState>,
): InterventionLedger<IGmUnitReloadInterventionState> {
  return ledger.register(
    createGmUnitReloadInterventionImplementer() as IInterventionLedgerImplementer<
      IInterventionLedgerCommand,
      IGmUnitReloadInterventionState
    >,
  );
}

function blockedUnitReloadPreview(
  command: IInterventionLedgerCommand,
  code: string,
  reason: string,
  affectedRefs: readonly string[] = command.targetRefs,
): UnitReloadPreview {
  const conflict: IInterventionConflict = {
    code,
    message: reason,
    affectedRefs,
  };

  return {
    domain: UNIT_RELOAD_DOMAIN,
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

function isUnitReloadCommandPayload(
  payload: unknown,
): payload is IGmUnitReloadInterventionCommandPayload {
  if (!isRecord(payload)) return false;
  if (typeof payload.unitId !== 'string') return false;
  if (!isRecord(payload.privateMetadata)) return false;
  if (typeof payload.privateMetadata.reason !== 'string') return false;
  return isRecord(payload.sourceUnitsByRef);
}

function manualTakeoverSummary(
  conflicts: readonly IInterventionConflict[],
): string | undefined {
  const unresolved = conflicts.filter(
    (conflict) => conflict.requiresManualTakeover,
  );
  return unresolved.length > 0
    ? `Reload requires manual takeover for: ${unresolved
        .map((conflict) => conflict.code)
        .join(', ')}.`
    : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
