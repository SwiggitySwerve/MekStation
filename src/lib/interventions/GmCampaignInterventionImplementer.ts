import type {
  GmCampaignInterventionDomain,
  IGmCampaignInterventionCommandPayload,
  IGmCampaignInterventionDomainPayload,
  IGmCampaignInterventionState,
  IGmCampaignPublicEffect,
  IGmPrivateMetadata,
  IInterventionConflict,
  IInterventionLedgerCommand,
  IInterventionLedgerImplementer,
  IInterventionLedgerPreview,
  IInterventionLedgerRecord,
} from '@/types/interventions';

import type { InterventionLedger } from './InterventionLedger';

import { buildGmCampaignProjectedEffect } from './GmCampaignInterventionPreview';
import {
  applyGmCampaignProjectedEffects,
  projectCampaignEffectsForRecord,
} from './GmCampaignInterventionProjection';
import { buildGmInterventionRedactionEnvelope } from './GmInterventionAuthority';

type CampaignPreview = IInterventionLedgerPreview<
  IGmPrivateMetadata,
  IGmCampaignPublicEffect,
  IGmCampaignInterventionDomainPayload
>;

type CampaignCommand =
  IInterventionLedgerCommand<IGmCampaignInterventionCommandPayload>;

type CampaignRecord = IInterventionLedgerRecord<
  IGmPrivateMetadata,
  IGmCampaignPublicEffect,
  IGmCampaignInterventionDomainPayload
>;

const CAMPAIGN_INTERVENTION_DOMAINS = [
  'post-combat',
  'economy',
  'repair',
  'salvage',
] as const satisfies readonly GmCampaignInterventionDomain[];

export function createGmCampaignInterventionImplementer(
  domain: GmCampaignInterventionDomain,
): IInterventionLedgerImplementer<
  CampaignCommand,
  IGmCampaignInterventionState,
  IGmPrivateMetadata,
  IGmCampaignPublicEffect,
  IGmCampaignInterventionDomainPayload
> {
  return {
    domain,
    preview(command, state): CampaignPreview {
      if (!isCampaignCommandPayload(command.payload)) {
        return blockedCampaignPreview(
          domain,
          command,
          'campaign-payload-invalid',
          'Campaign intervention command requires a correction and GM-private reason.',
        );
      }

      const projected = buildGmCampaignProjectedEffect(
        domain,
        command.payload,
        state,
      );
      if (!projected.effect) {
        return blockedCampaignPreview(
          domain,
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
        domain,
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
        conflicts: normalizeConflicts(command.payload.conflicts),
      };
    },
    apply(record, state): IGmCampaignInterventionState {
      return applyGmCampaignProjectedEffects(
        state,
        projectCampaignEffectsForRecord(record as CampaignRecord),
      );
    },
    projectPublic(record): IGmCampaignPublicEffect {
      return record.publicEffect;
    },
    projectPrivate(record): IGmPrivateMetadata {
      return record.privateMetadata;
    },
  };
}

export function registerGmCampaignInterventionImplementer(
  ledger: InterventionLedger<IGmCampaignInterventionState>,
  domain: GmCampaignInterventionDomain,
): InterventionLedger<IGmCampaignInterventionState> {
  return ledger.register(
    createGmCampaignInterventionImplementer(
      domain,
    ) as IInterventionLedgerImplementer<
      IInterventionLedgerCommand,
      IGmCampaignInterventionState
    >,
  );
}

export function registerGmCampaignInterventionImplementers(
  ledger: InterventionLedger<IGmCampaignInterventionState>,
  domains: readonly GmCampaignInterventionDomain[] = CAMPAIGN_INTERVENTION_DOMAINS,
): InterventionLedger<IGmCampaignInterventionState> {
  domains.forEach((domain) =>
    registerGmCampaignInterventionImplementer(ledger, domain),
  );
  return ledger;
}

function blockedCampaignPreview(
  domain: GmCampaignInterventionDomain,
  command: IInterventionLedgerCommand,
  code: string,
  reason: string,
  affectedRefs: readonly string[] = command.targetRefs,
): CampaignPreview {
  const conflict: IInterventionConflict = {
    code,
    message: reason,
    affectedRefs,
  };

  return {
    domain,
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

function normalizeConflicts(
  conflicts: IGmCampaignInterventionCommandPayload['conflicts'] | undefined,
): readonly IInterventionConflict[] {
  return (conflicts ?? [])
    .filter(
      (conflict) =>
        isNonEmptyString(conflict.code) && isNonEmptyString(conflict.message),
    )
    .map((conflict) => ({
      code: conflict.code,
      message: conflict.message,
      affectedRefs: conflict.affectedRefs,
      requiresManualTakeover: conflict.requiresManualTakeover,
    }));
}

function isCampaignCommandPayload(
  payload: unknown,
): payload is IGmCampaignInterventionCommandPayload {
  if (!isRecord(payload)) return false;
  if (!isRecord(payload.privateMetadata)) return false;
  if (typeof payload.privateMetadata.reason !== 'string') return false;
  if (!isRecord(payload.correction)) return false;

  return (
    payload.correction.family === 'salvage-allocation' ||
    payload.correction.family === 'repair-ticket' ||
    payload.correction.family === 'funds-transaction' ||
    payload.correction.family === 'inventory-lot' ||
    payload.correction.family === 'base-unit-state'
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}
