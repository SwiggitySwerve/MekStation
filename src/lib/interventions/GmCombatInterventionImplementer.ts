import type {
  IGmCombatInterventionCommandPayload,
  IGmCombatInterventionDomainPayload,
  IGmCombatInterventionState,
  IGmCombatPublicEffect,
  IGmPrivateMetadata,
  IInterventionConflict,
  IInterventionLedgerCommand,
  IInterventionLedgerImplementer,
  IInterventionLedgerPreview,
  IInterventionLedgerRecord,
} from '@/types/interventions';

import type { InterventionLedger } from './InterventionLedger';

import { buildGmCombatProjectedEffect } from './GmCombatInterventionPreview';
import {
  applyGmCombatProjectedEffects,
  projectCombatEffectsForRecord,
} from './GmCombatInterventionProjection';
import { buildGmInterventionRedactionEnvelope } from './GmInterventionAuthority';

type CombatPreview = IInterventionLedgerPreview<
  IGmPrivateMetadata,
  IGmCombatPublicEffect,
  IGmCombatInterventionDomainPayload
>;

type CombatCommand =
  IInterventionLedgerCommand<IGmCombatInterventionCommandPayload>;

type CombatRecord = IInterventionLedgerRecord<
  IGmPrivateMetadata,
  IGmCombatPublicEffect,
  IGmCombatInterventionDomainPayload
>;

const COMBAT_DOMAIN = 'combat' as const;

export function createGmCombatInterventionImplementer(): IInterventionLedgerImplementer<
  CombatCommand,
  IGmCombatInterventionState,
  IGmPrivateMetadata,
  IGmCombatPublicEffect,
  IGmCombatInterventionDomainPayload
> {
  return {
    domain: COMBAT_DOMAIN,
    preview(command, state): CombatPreview {
      if (!isCombatCommandPayload(command.payload)) {
        return blockedCombatPreview(
          command,
          'combat-payload-invalid',
          'Combat intervention command requires a correction and GM-private reason.',
        );
      }

      const projected = buildGmCombatProjectedEffect(command.payload, state);
      if (!projected.effect) {
        return blockedCombatPreview(
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
          changedStateRefs: projected.changedStateRefs,
          visibleToPlayerIds: command.payload.visibleToPlayerIds,
        },
      );

      return {
        domain: COMBAT_DOMAIN,
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
        conflicts: [],
      };
    },
    apply(record, state): IGmCombatInterventionState {
      return applyGmCombatProjectedEffects(
        state,
        projectCombatEffectsForRecord(record as CombatRecord),
      );
    },
    projectPublic(record): IGmCombatPublicEffect {
      return record.publicEffect;
    },
    projectPrivate(record): IGmPrivateMetadata {
      return record.privateMetadata;
    },
  };
}

export function registerGmCombatInterventionImplementer(
  ledger: InterventionLedger<IGmCombatInterventionState>,
): InterventionLedger<IGmCombatInterventionState> {
  return ledger.register(
    createGmCombatInterventionImplementer() as IInterventionLedgerImplementer<
      IInterventionLedgerCommand,
      IGmCombatInterventionState
    >,
  );
}

function blockedCombatPreview(
  command: IInterventionLedgerCommand,
  code: string,
  reason: string,
  affectedRefs: readonly string[] = command.targetRefs,
): CombatPreview {
  const conflict: IInterventionConflict = {
    code,
    message: reason,
    affectedRefs,
  };

  return {
    domain: COMBAT_DOMAIN,
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

function isCombatCommandPayload(
  payload: unknown,
): payload is IGmCombatInterventionCommandPayload {
  if (!isRecord(payload)) return false;
  if (!isRecord(payload.privateMetadata)) return false;
  if (typeof payload.privateMetadata.reason !== 'string') return false;
  if (!isRecord(payload.correction)) return false;

  return (
    payload.correction.family === 'reposition-facing' ||
    payload.correction.family === 'damage-critical' ||
    payload.correction.family === 'heat-ammo' ||
    payload.correction.family === 'turn-order' ||
    payload.correction.family === 'lifecycle'
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
