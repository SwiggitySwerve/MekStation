import type { IGmCascadePreview } from '@/types/interventions';

import {
  logCommandDiagnostic,
  logInvalidCommandAction,
} from '@/lib/command-screen/commandDiagnostics';

export function logGmCascadePreviewDiagnostic(
  preview: IGmCascadePreview,
): void {
  logCommandDiagnostic({
    event:
      preview.status === 'rejected' || preview.status === 'blocked'
        ? 'command_preview_rejected'
        : 'command_preview_created',
    level:
      preview.status === 'rejected' ||
      preview.status === 'blocked' ||
      preview.status === 'deferred'
        ? 'warn'
        : 'info',
    commandId: gmCascadeCommandId(preview),
    previewId: preview.previewId ?? preview.interventionId,
    domain: preview.domain,
    status: preview.status,
    authority: 'owner-gm',
    subjectRefIds: preview.affectedStateRefs,
    reasonCodes: gmCascadeReasonCodes(preview),
    userVisibleStateChanged: false,
    resultingStateSummary: preview.resultingStateSummary,
    metadata: {
      actorId: preview.actorId,
      kind: preview.kind,
      conflictCodes: preview.conflicts.map((conflict) => conflict.code),
      publicSummary: publicEffectSummary(preview.publicEffect),
      projectedEventCount: preview.projectedEvents.length,
      redactionPolicy: preview.redactionPolicy,
    },
  });
}

export function logGmCascadeInvalidApproval(
  preview: IGmCascadePreview,
  reason: string,
): void {
  logInvalidCommandAction({
    commandId: gmCascadeCommandId(preview),
    previewId: preview.previewId ?? preview.interventionId,
    domain: preview.domain,
    authority: 'owner-gm',
    subjectRefIds: preview.affectedStateRefs,
    reasonCodes: [...gmCascadeReasonCodes(preview), approvalReasonCode(reason)],
    resultingStateSummary: preview.resultingStateSummary,
    metadata: {
      actorId: preview.actorId,
      kind: preview.kind,
      previewStatus: preview.status,
      conflictCodes: preview.conflicts.map((conflict) => conflict.code),
      reason,
    },
  });
}

export function logGmCascadeCommitSucceeded(
  preview: IGmCascadePreview,
  ledgerRecordId: string,
  actionLedgerRecordId: string | undefined,
): void {
  logCommandDiagnostic({
    event: 'command_gm_intervention_committed',
    commandId: gmCascadeCommandId(preview),
    previewId: preview.previewId ?? preview.interventionId,
    domain: preview.domain,
    status: 'committed',
    authority: 'owner-gm',
    subjectRefIds: preview.affectedStateRefs,
    reasonCodes: [],
    userVisibleStateChanged: true,
    ledgerRef: ledgerRecordId,
    persistenceRef: actionLedgerRecordId,
    resultingStateSummary: preview.resultingStateSummary,
    metadata: {
      actorId: preview.actorId,
      kind: preview.kind,
      actionLedgerRecordId,
      publicSummary: publicEffectSummary(preview.publicEffect),
      redactionPolicy: preview.redactionPolicy,
    },
  });
}

function gmCascadeCommandId(
  preview: Pick<IGmCascadePreview, 'domain' | 'kind'>,
): string {
  return `gm.${preview.domain}.${preview.kind}`;
}

function gmCascadeReasonCodes(preview: IGmCascadePreview): readonly string[] {
  const codes = [
    ...preview.conflicts.map((conflict) => conflict.code),
    ...(preview.reason ? [approvalReasonCode(preview.reason)] : []),
  ];
  return Array.from(new Set(codes));
}

function approvalReasonCode(reason: string): string {
  return reason
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80);
}

function publicEffectSummary(effect: unknown): string | undefined {
  if (!isRecord(effect)) return undefined;
  const summary = effect.summary;
  return typeof summary === 'string' ? summary : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
