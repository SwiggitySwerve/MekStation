import type {
  IGmAuthorityContext,
  IGmCascadeApprovalResult,
  IGmCascadeCancellationResult,
  IGmCascadePreview,
  IInterventionLedgerCommand,
  IInterventionLedgerPreview,
  IInterventionLedgerRecord,
  InterventionDomain,
} from '@/types/interventions';

import {
  logGmCascadeCommitSucceeded,
  logGmCascadeInvalidApproval,
  logGmCascadePreviewDiagnostic,
} from '@/lib/interventions/GmCascadeCommandDiagnostics';
import { logger } from '@/utils/logger';

import type { ActionLedger } from './ActionLedger';
import type { InterventionLedger } from './InterventionLedger';

import {
  affectedStateRefs,
  buildPreviewMetadata,
} from './GmCascadePreviewMetadata';
import { previewGmInterventionWithAuthority } from './GmInterventionAuthority';

export interface ICreateGmCascadePreviewInput<
  TState,
  TCommandPayload = unknown,
> {
  readonly ledger: InterventionLedger<TState>;
  readonly command: IInterventionLedgerCommand<TCommandPayload>;
  readonly state: TState;
  readonly authority: IGmAuthorityContext;
  readonly interventionId?: string;
  readonly now?: () => string;
  readonly logDeferred?: boolean;
  readonly emitDeferredLog?: GmDeferredInterventionLogger;
}

export interface IApproveGmCascadePreviewInput<
  TState,
  TPrivate = unknown,
  TPublic = unknown,
  TDomainPayload = unknown,
> {
  readonly ledger: InterventionLedger<TState>;
  readonly actionLedger?: ActionLedger;
  readonly preview: IGmCascadePreview<TPrivate, TPublic, TDomainPayload>;
  readonly state: TState;
  readonly approvedAt?: string;
  readonly createdAt?: string;
}

const DEFERRED_FIRST_SLICE_DOMAINS = new Set<InterventionDomain>([
  'post-combat',
  'economy',
  'repair',
  'salvage',
  'time',
]);

let generatedIdSequence = 0;

export interface IGmDeferredInterventionAttemptLog {
  readonly level: 'warn';
  readonly service: 'gm-intervention';
  readonly event: 'domain-deferred';
  readonly message: string;
  readonly actorId: string;
  readonly domain: string;
  readonly kind: string;
  readonly targetRefs: readonly string[];
  readonly deferredReason: string;
}

export type GmDeferredInterventionLogger = (
  message: string,
  entry: IGmDeferredInterventionAttemptLog,
) => void;

export function createGmCascadePreview<TState, TCommandPayload>(
  input: ICreateGmCascadePreviewInput<TState, TCommandPayload>,
): IGmCascadePreview {
  const { authority, command, interventionId, ledger, state } = input;
  const previewResult = previewGmInterventionWithAuthority({
    ledger,
    command,
    state,
    authority,
  });
  const resolvedInterventionId =
    interventionId ?? createDefaultInterventionId(input.now);

  if (previewResult.status === 'rejected') {
    const preview: IGmCascadePreview = {
      interventionId: resolvedInterventionId,
      status: 'rejected',
      domain: previewResult.domain,
      kind: previewResult.kind,
      actorId: previewResult.actorId,
      targetRefs: previewResult.targetRefs,
      affectedStateRefs: previewResult.targetRefs,
      projectedEvents: [],
      conflicts: [],
      reason: previewResult.reason,
    };
    logGmCascadePreviewDiagnostic(preview);
    return preview;
  }

  const status =
    previewResult.status === 'unsupported' &&
    DEFERRED_FIRST_SLICE_DOMAINS.has(previewResult.domain)
      ? 'deferred'
      : normalizePreviewStatus(previewResult);
  const metadata = buildPreviewMetadata(previewResult, resolvedInterventionId);

  const preview: IGmCascadePreview = {
    interventionId: resolvedInterventionId,
    ...metadata,
    status,
    domain: previewResult.domain,
    kind: previewResult.kind,
    actorId: previewResult.actorId,
    targetRefs: previewResult.targetRefs,
    affectedStateRefs: affectedStateRefs(previewResult),
    privateMetadata: previewResult.privateMetadata,
    publicEffect: previewResult.publicEffect,
    domainPayload: previewResult.domainPayload,
    projectedEvents: previewResult.projectedEvents ?? [],
    conflicts: previewResult.conflicts,
    causedBy: previewResult.causedBy,
    supersedes: previewResult.supersedes,
    reason: previewResult.reason,
  };

  if (preview.status === 'deferred' && input.logDeferred !== false) {
    logGmDeferredInterventionAttempt(preview, input.emitDeferredLog);
  }
  logGmCascadePreviewDiagnostic(preview);

  return preview;
}

export function logGmDeferredInterventionAttempt(
  preview: Pick<
    IGmCascadePreview,
    'actorId' | 'domain' | 'kind' | 'targetRefs' | 'reason'
  >,
  emit: GmDeferredInterventionLogger = logger.warn,
): IGmDeferredInterventionAttemptLog {
  const entry: IGmDeferredInterventionAttemptLog = {
    level: 'warn',
    service: 'gm-intervention',
    event: 'domain-deferred',
    message: 'Deferred GM intervention domain without mutation.',
    actorId: preview.actorId,
    domain: preview.domain,
    kind: preview.kind,
    targetRefs: preview.targetRefs,
    deferredReason:
      preview.reason ??
      `GM intervention domain "${preview.domain}" is deferred in this slice.`,
  };

  emit('[gm-intervention:domain-deferred]', entry);
  return entry;
}

export function approveGmCascadePreview<
  TState,
  TPrivate,
  TPublic,
  TDomainPayload,
>(
  input: IApproveGmCascadePreviewInput<
    TState,
    TPrivate,
    TPublic,
    TDomainPayload
  >,
): IGmCascadeApprovalResult<TState> {
  const { ledger, preview, state } = input;

  if (preview.status !== 'ready') {
    const reason = `Cannot approve GM cascade preview with status "${preview.status}".`;
    logGmCascadeInvalidApproval(preview, reason);
    return {
      status: 'blocked',
      state,
      appended: false,
      reason,
    };
  }

  if (!preview.privateMetadata || !preview.publicEffect) {
    const reason =
      'Cannot approve GM cascade preview without private metadata and public effect.';
    logGmCascadeInvalidApproval(preview, reason);
    return {
      status: 'blocked',
      state,
      appended: false,
      reason,
    };
  }

  const freshnessFailure = validatePreviewFreshness(preview, state);
  if (freshnessFailure) {
    logGmCascadeInvalidApproval(preview, freshnessFailure);
    return {
      status: 'blocked',
      state,
      appended: false,
      reason: freshnessFailure,
    };
  }

  const record = buildApprovedRecord(input);
  const applyResult = ledger.apply(record, state);

  if (applyResult.status === 'unsupported') {
    logGmCascadeInvalidApproval(preview, applyResult.reason);
    return {
      status: 'blocked',
      state,
      appended: false,
      reason: applyResult.reason,
    };
  }

  const appendedRecord = ledger.appendApprovedRecord(record);
  const actionLedgerRecord =
    input.actionLedger?.appendGmInterventionRecord(appendedRecord);
  logGmCascadeCommitSucceeded(
    preview,
    appendedRecord.id,
    actionLedgerRecord?.id,
  );

  return {
    status: 'approved',
    state: applyResult.state,
    appended: true,
    record: appendedRecord,
    actionLedgerRecord,
  };
}

export function cancelGmCascadePreview<TState>(
  preview: IGmCascadePreview,
  state: TState,
): IGmCascadeCancellationResult<TState> {
  return {
    status: 'cancelled',
    state,
    appended: false,
  };
}

function buildApprovedRecord<TState, TPrivate, TPublic, TDomainPayload>(
  input: IApproveGmCascadePreviewInput<
    TState,
    TPrivate,
    TPublic,
    TDomainPayload
  >,
): IInterventionLedgerRecord<TPrivate, TPublic, TDomainPayload> {
  const { approvedAt, createdAt, preview } = input;
  const approvalTime = approvedAt ?? new Date().toISOString();

  return {
    id: preview.interventionId,
    domain: preview.domain,
    kind: preview.kind,
    status: 'approved',
    actorId: preview.actorId,
    targetRefs: preview.targetRefs,
    causedBy: preview.causedBy,
    supersedes: preview.supersedes,
    previewId: preview.previewId ?? preview.interventionId,
    subjectIds: preview.subjectIds ?? preview.affectedStateRefs,
    beforeSummary: preview.beforeSummary,
    afterSummary: preview.afterSummary,
    resultingStateSummary: preview.resultingStateSummary,
    redactionPolicy: preview.redactionPolicy ?? 'gm-private-metadata',
    privateMetadata: preview.privateMetadata as TPrivate,
    publicEffect: preview.publicEffect as TPublic,
    domainPayload: preview.domainPayload,
    createdAt: createdAt ?? approvalTime,
    approvedAt: approvalTime,
  };
}

function normalizePreviewStatus(
  preview: IInterventionLedgerPreview,
): IGmCascadePreview['status'] {
  if (
    preview.status === 'ready' &&
    preview.conflicts.some((conflict) => conflict.requiresManualTakeover)
  ) {
    return 'requires-manual-takeover';
  }

  return preview.status;
}

function validatePreviewFreshness(
  preview: IGmCascadePreview,
  state: unknown,
): string | undefined {
  const correction = readCorrection(preview.domainPayload);
  if (!correction) return undefined;

  const baseUpdatedAt = readString(correction, 'baseUpdatedAt');
  if (baseUpdatedAt) {
    const currentUpdatedAt = readString(state, 'updatedAt');
    if (currentUpdatedAt && currentUpdatedAt !== baseUpdatedAt) {
      return 'Cannot approve GM cascade preview from a stale campaign version.';
    }
  }

  const baseCurrentDate = readString(correction, 'baseCurrentDate');
  if (baseCurrentDate) {
    const currentDate = readDateIso(state, 'currentDate');
    if (currentDate && currentDate !== baseCurrentDate) {
      return 'Cannot approve GM cascade preview from a stale campaign date.';
    }
  }

  return undefined;
}

function readCorrection(value: unknown): Record<string, unknown> | undefined {
  if (!isRecord(value)) return undefined;
  const correction = value.correction;
  return isRecord(correction) ? correction : undefined;
}

function readString(value: unknown, key: string): string | undefined {
  if (!isRecord(value)) return undefined;
  const entry = value[key];
  return typeof entry === 'string' ? entry : undefined;
}

function readDateIso(value: unknown, key: string): string | undefined {
  if (!isRecord(value)) return undefined;
  const entry = value[key];
  if (entry instanceof Date) return entry.toISOString();
  if (typeof entry !== 'string') return undefined;
  const date = new Date(entry);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function createDefaultInterventionId(now?: () => string): string {
  generatedIdSequence += 1;
  return `gm-int-${now?.() ?? new Date().toISOString()}-${generatedIdSequence}`;
}
