import type {
  GmAuthorityDecision,
  IGmAuthorityContext,
  IGmInterventionRedactionEnvelope,
  IGmPrivateMetadata,
  IGmPublicEffect,
  IGmVisibleInterventionRecord,
  IInterventionLedgerCommand,
  IInterventionLedgerPreview,
  IInterventionLedgerRecord,
  IPlayerVisibleInterventionRecord,
  IRejectedGmInterventionRequest,
} from '@/types/interventions';

import { logger } from '@/utils/logger';

import type { InterventionLedger } from './InterventionLedger';

export type GmInterventionPreviewWithAuthorityResult<
  TPrivate = unknown,
  TPublic = unknown,
  TDomainPayload = unknown,
> =
  | IInterventionLedgerPreview<TPrivate, TPublic, TDomainPayload>
  | IRejectedGmInterventionRequest;

export interface IPreviewGmInterventionWithAuthorityInput<
  TState,
  TCommandPayload = unknown,
> {
  readonly ledger: InterventionLedger<TState>;
  readonly command: IInterventionLedgerCommand<TCommandPayload>;
  readonly state: TState;
  readonly authority: IGmAuthorityContext;
  readonly logRejection?: boolean;
}

export interface IGmInterventionAuthorizationFailureLog {
  readonly level: 'warn';
  readonly service: 'gm-intervention';
  readonly event: 'authorization-rejected';
  readonly message: string;
  readonly actorId: string;
  readonly role: string;
  readonly gameId: string;
  readonly campaignId?: string;
  readonly domain: string;
  readonly kind: string;
  readonly targetRefs: readonly string[];
  readonly rejectionCode: string;
  readonly rejectionReason: string;
}

const toGameRef = (gameId: string): string => `game:${gameId}`;
const toCampaignRef = (campaignId: string): string => `campaign:${campaignId}`;

export function evaluateGmInterventionAuthority(
  authority: IGmAuthorityContext,
  command: IInterventionLedgerCommand,
): GmAuthorityDecision {
  if (authority.actorId !== command.actorId) {
    return {
      status: 'rejected',
      code: 'actor-mismatch',
      reason: 'Intervention actor does not match the authority context actor.',
    };
  }

  if (authority.role !== 'gm') {
    return {
      status: 'rejected',
      code: 'gm-role-required',
      reason: 'Only the owning GM can request GM intervention previews.',
    };
  }

  if (!ownsTargetState(authority)) {
    return {
      status: 'rejected',
      code: 'state-not-owned',
      reason:
        'GM authority context does not own the target game or campaign state.',
    };
  }

  return { status: 'authorized' };
}

export function previewGmInterventionWithAuthority<TState, TCommandPayload>(
  input: IPreviewGmInterventionWithAuthorityInput<TState, TCommandPayload>,
): GmInterventionPreviewWithAuthorityResult {
  const { authority, command, ledger, logRejection = true, state } = input;
  const decision = evaluateGmInterventionAuthority(authority, command);

  if (decision.status === 'rejected') {
    const rejection: IRejectedGmInterventionRequest = {
      status: 'rejected',
      code: decision.code,
      reason: decision.reason,
      actorId: authority.actorId,
      role: authority.role,
      gameId: authority.gameId,
      campaignId: authority.campaignId,
      domain: command.domain,
      kind: command.kind,
      targetRefs: command.targetRefs,
    };

    if (logRejection) {
      logGmInterventionAuthorizationFailure(rejection);
    }

    return rejection;
  }

  return ledger.preview(command, state);
}

export function buildGmInterventionRedactionEnvelope<
  TPrivate extends IGmPrivateMetadata,
  TPublic extends IGmPublicEffect,
>(
  privateMetadata: TPrivate,
  publicEffect: TPublic,
): IGmInterventionRedactionEnvelope<TPrivate, TPublic> {
  return {
    privateMetadata,
    publicEffect,
  };
}

export function projectInterventionRecordForPlayer<
  TPublic extends IGmPublicEffect,
>(
  record: IInterventionLedgerRecord<unknown, TPublic>,
): IPlayerVisibleInterventionRecord<TPublic> {
  return {
    id: record.id,
    domain: record.domain,
    kind: record.kind,
    status: record.status,
    actorId: record.actorId,
    targetRefs: record.targetRefs,
    causedBy: record.causedBy,
    supersedes: record.supersedes,
    previewId: record.previewId,
    subjectIds: record.subjectIds,
    beforeSummary: record.beforeSummary,
    afterSummary: record.afterSummary,
    resultingStateSummary: record.resultingStateSummary,
    redactionPolicy: record.redactionPolicy,
    publicEffect: record.publicEffect,
    createdAt: record.createdAt,
    approvedAt: record.approvedAt,
  };
}

export function projectInterventionRecordForGm<
  TPrivate extends IGmPrivateMetadata,
  TPublic extends IGmPublicEffect,
>(
  record: IInterventionLedgerRecord<TPrivate, TPublic>,
): IGmVisibleInterventionRecord<TPrivate, TPublic> {
  return {
    ...projectInterventionRecordForPlayer(record),
    privateMetadata: record.privateMetadata,
  };
}

export function logGmInterventionAuthorizationFailure(
  rejection: IRejectedGmInterventionRequest,
  emit: (
    message: string,
    entry: IGmInterventionAuthorizationFailureLog,
  ) => void = logger.warn,
): IGmInterventionAuthorizationFailureLog {
  const entry: IGmInterventionAuthorizationFailureLog = {
    level: 'warn',
    service: 'gm-intervention',
    event: 'authorization-rejected',
    message: 'Rejected GM intervention before preview generation.',
    actorId: rejection.actorId,
    role: rejection.role,
    gameId: rejection.gameId,
    campaignId: rejection.campaignId,
    domain: rejection.domain,
    kind: rejection.kind,
    targetRefs: rejection.targetRefs,
    rejectionCode: rejection.code,
    rejectionReason: rejection.reason,
  };

  emit('[gm-intervention:authorization-rejected]', entry);
  return entry;
}

function ownsTargetState(authority: IGmAuthorityContext): boolean {
  const ownedRefs = new Set(authority.ownedStateRefs);
  if (
    ownedRefs.has(authority.gameId) ||
    ownedRefs.has(toGameRef(authority.gameId))
  ) {
    return true;
  }

  if (!authority.campaignId) return false;
  return (
    ownedRefs.has(authority.campaignId) ||
    ownedRefs.has(toCampaignRef(authority.campaignId))
  );
}
