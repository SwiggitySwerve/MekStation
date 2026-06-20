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

import type { InterventionLedger } from './InterventionLedger';

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
}

export interface IApproveGmCascadePreviewInput<
  TState,
  TPrivate = unknown,
  TPublic = unknown,
  TDomainPayload = unknown,
> {
  readonly ledger: InterventionLedger<TState>;
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
    return {
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
  }

  const status =
    previewResult.status === 'unsupported' &&
    DEFERRED_FIRST_SLICE_DOMAINS.has(previewResult.domain)
      ? 'deferred'
      : normalizePreviewStatus(previewResult);

  return {
    interventionId: resolvedInterventionId,
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
    return {
      status: 'blocked',
      state,
      appended: false,
      reason: `Cannot approve GM cascade preview with status "${preview.status}".`,
    };
  }

  if (!preview.privateMetadata || !preview.publicEffect) {
    return {
      status: 'blocked',
      state,
      appended: false,
      reason:
        'Cannot approve GM cascade preview without private metadata and public effect.',
    };
  }

  const record = buildApprovedRecord(input);
  ledger.appendApprovedRecord(record);
  const applyResult = ledger.apply(record, state);

  if (applyResult.status === 'unsupported') {
    return {
      status: 'blocked',
      state,
      appended: true,
      record,
      reason: applyResult.reason,
    };
  }

  return {
    status: 'approved',
    state: applyResult.state,
    appended: true,
    record,
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

function affectedStateRefs(
  preview: IInterventionLedgerPreview,
): readonly string[] {
  return uniqueRefs([
    ...preview.targetRefs,
    ...changedStateRefs(preview.publicEffect),
    ...preview.conflicts.flatMap((conflict) => conflict.affectedRefs ?? []),
  ]);
}

function changedStateRefs(publicEffect: unknown): readonly string[] {
  if (!publicEffect || typeof publicEffect !== 'object') return [];
  const maybeRefs = (publicEffect as { changedStateRefs?: unknown })
    .changedStateRefs;
  return Array.isArray(maybeRefs)
    ? maybeRefs.filter((ref): ref is string => typeof ref === 'string')
    : [];
}

function uniqueRefs(refs: readonly string[]): readonly string[] {
  return Array.from(new Set(refs));
}

function createDefaultInterventionId(now?: () => string): string {
  generatedIdSequence += 1;
  return `gm-int-${now?.() ?? new Date().toISOString()}-${generatedIdSequence}`;
}
