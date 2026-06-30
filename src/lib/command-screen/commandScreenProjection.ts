import type {
  CommandCommitStatus,
  CommandPreviewStatus,
  ICommandCommitResult,
  ICommandDiagnosticMetadata,
  ICommandPreview,
  ICommandReason,
  IPlayerCommandResult,
} from '@/types/command-screen';

const BLOCKING_REASON_KINDS = new Set<ICommandReason['kind']>([
  'illegal',
  'blocked',
  'stale',
  'manual-takeover',
]);

const NON_COMMITTABLE_PREVIEW_STATUSES = new Set<CommandPreviewStatus>([
  'blocked',
  'requires-manual-takeover',
  'stale',
  'unsupported',
]);

const NON_SUCCESS_COMMIT_STATUSES = new Set<CommandCommitStatus>([
  'rejected',
  'drift',
  'manual-required',
]);

export function previewHasBlockingReasons(
  preview: Pick<ICommandPreview, 'reasons'>,
): boolean {
  return preview.reasons.some((reason) =>
    BLOCKING_REASON_KINDS.has(reason.kind),
  );
}

export function canCommitPreview(
  preview: Pick<ICommandPreview, 'isLegal' | 'status' | 'reasons'>,
): boolean {
  return (
    preview.isLegal &&
    !NON_COMMITTABLE_PREVIEW_STATUSES.has(preview.status) &&
    !previewHasBlockingReasons(preview)
  );
}

export function projectCommandResultForPlayer<TPublic>(
  result: ICommandCommitResult<TPublic, unknown>,
): IPlayerCommandResult<TPublic> {
  return {
    commandId: result.commandId,
    previewId: result.previewId,
    domain: result.domain,
    status: result.status,
    subjectRefs: result.subjectRefs,
    publicEffect: result.publicEffect,
    rejectionReason: result.rejectionReason,
    resultingState: result.resultingState,
    ledgerRef: result.ledgerRef,
    diagnosticEvent: result.diagnosticEvent,
    committedAt: result.committedAt,
  };
}

export function buildPreviewDiagnosticMetadata(
  preview: ICommandPreview,
): ICommandDiagnosticMetadata {
  return {
    domain: preview.domain,
    commandId: preview.commandId,
    previewId: preview.previewId,
    status: preview.status,
    authority: preview.authority,
    subjectRefIds: preview.subjectRefs.map((ref) => ref.id),
    reasonCodes: preview.reasons.map((reason) => reason.code),
    userVisibleStateChanged: false,
  };
}

export function buildCommitDiagnosticMetadata(
  result: ICommandCommitResult,
): ICommandDiagnosticMetadata {
  return {
    domain: result.domain,
    commandId: result.commandId,
    previewId: result.previewId,
    status: result.status,
    authority: result.authority,
    subjectRefIds: result.subjectRefs.map((ref) => ref.id),
    reasonCodes: result.rejectionReason ? [result.rejectionReason.code] : [],
    userVisibleStateChanged: !NON_SUCCESS_COMMIT_STATUSES.has(result.status),
  };
}
