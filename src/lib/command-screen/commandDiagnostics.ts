import type {
  CommandDiagnosticEvent,
  CommandScreenAuthority,
  CommandScreenDomain,
  ICommandCommitResult,
  ICommandPreview,
  ICommandSubjectRef,
} from '@/types/command-screen';
import type {
  IDiagnosticLogEntry,
  IDiagnosticLogInput,
  LogLevel,
} from '@/utils/logger';

import { logger } from '@/utils/logger';

import {
  buildCommitDiagnosticMetadata,
  buildPreviewDiagnosticMetadata,
} from './commandScreenProjection';

export const COMMAND_DIAGNOSTIC_SERVICE = 'command-screen';

export type CommandDiagnosticEmitter = (
  input: IDiagnosticLogInput,
) => IDiagnosticLogEntry;

export interface ICommandDiagnosticInput {
  readonly level?: LogLevel;
  readonly service?: string;
  readonly event: CommandDiagnosticEvent;
  readonly message?: string;
  readonly commandId: string;
  readonly previewId?: string;
  readonly domain: CommandScreenDomain;
  readonly status: string;
  readonly authority?: CommandScreenAuthority;
  readonly subjectRefs?: readonly ICommandSubjectRef[];
  readonly subjectRefIds?: readonly string[];
  readonly reasonCodes?: readonly string[];
  readonly userVisibleStateChanged: boolean;
  readonly ledgerRef?: string;
  readonly persistenceRef?: string;
  readonly resultingStateSummary?: string;
  readonly entityIds?: Record<string, string>;
  readonly metadata?: Record<string, unknown>;
  readonly error?: unknown;
}

export interface ICommandReloadValidationInput extends Omit<
  ICommandDiagnosticInput,
  'event' | 'level'
> {
  readonly resultCount?: number;
}

export interface IMalformedCommandPayloadInput extends Omit<
  ICommandDiagnosticInput,
  'event' | 'level' | 'status' | 'userVisibleStateChanged'
> {
  readonly payloadKind: string;
}

export function logCommandDiagnostic(
  input: ICommandDiagnosticInput,
  emit: CommandDiagnosticEmitter = logger.diagnostic,
): IDiagnosticLogEntry {
  const subjectRefIds = normalizeSubjectRefIds(input);
  const entry = emit({
    level: input.level ?? defaultLevelForEvent(input.event),
    service: input.service ?? COMMAND_DIAGNOSTIC_SERVICE,
    event: input.event,
    message: input.message,
    entityIds: {
      commandId: input.commandId,
      ...(input.previewId ? { previewId: input.previewId } : {}),
      ...(input.ledgerRef ? { ledgerRef: input.ledgerRef } : {}),
      ...(input.persistenceRef ? { persistenceRef: input.persistenceRef } : {}),
      ...(subjectRefIds.length === 1 ? { subjectId: subjectRefIds[0] } : {}),
      ...(input.entityIds ?? {}),
    },
    metadata: {
      domain: input.domain,
      commandId: input.commandId,
      previewId: input.previewId,
      status: input.status,
      authority: input.authority,
      subjectRefIds,
      reasonCodes: input.reasonCodes ?? [],
      userVisibleStateChanged: input.userVisibleStateChanged,
      ledgerRef: input.ledgerRef,
      persistenceRef: input.persistenceRef,
      resultingStateSummary: input.resultingStateSummary,
      ...(input.metadata ?? {}),
    },
    error: input.error,
  });

  return entry;
}

export function logCommandPreviewCreated(
  preview: ICommandPreview,
  options: Partial<ICommandDiagnosticInput> = {},
): IDiagnosticLogEntry {
  const metadata = buildPreviewDiagnosticMetadata(preview);
  return logCommandDiagnostic({
    event: 'command_preview_created',
    message: 'Created command preview.',
    commandId: preview.commandId,
    previewId: preview.previewId,
    domain: preview.domain,
    status: preview.status,
    authority: preview.authority,
    subjectRefs: preview.subjectRefs,
    reasonCodes: metadata.reasonCodes,
    userVisibleStateChanged: metadata.userVisibleStateChanged,
    resultingStateSummary: preview.after.label,
    ...options,
    metadata: {
      beforeSummary: preview.before.label,
      afterSummary: preview.after.label,
      costCount: preview.costs.length,
      warningCount: preview.warnings.length,
      ...(options.metadata ?? {}),
    },
  });
}

export function logCommandPreviewRejected(
  preview: ICommandPreview,
  options: Partial<ICommandDiagnosticInput> = {},
): IDiagnosticLogEntry {
  const metadata = buildPreviewDiagnosticMetadata(preview);
  return logCommandDiagnostic({
    event: 'command_preview_rejected',
    level: 'warn',
    message: 'Rejected command preview before commitment.',
    commandId: preview.commandId,
    previewId: preview.previewId,
    domain: preview.domain,
    status: preview.status,
    authority: preview.authority,
    subjectRefs: preview.subjectRefs,
    reasonCodes: metadata.reasonCodes,
    userVisibleStateChanged: false,
    resultingStateSummary: preview.after.label,
    ...options,
  });
}

export function logCommandCommitResult(
  result: ICommandCommitResult,
  options: Partial<ICommandDiagnosticInput> = {},
): IDiagnosticLogEntry {
  const metadata = buildCommitDiagnosticMetadata(result);
  return logCommandDiagnostic({
    event: result.diagnosticEvent,
    level: result.status === 'committed' ? 'info' : 'warn',
    message:
      result.status === 'committed'
        ? 'Committed command result.'
        : 'Rejected command result.',
    commandId: result.commandId,
    previewId: result.previewId,
    domain: result.domain,
    status: result.status,
    authority: result.authority,
    subjectRefs: result.subjectRefs,
    reasonCodes: metadata.reasonCodes,
    userVisibleStateChanged: metadata.userVisibleStateChanged,
    ledgerRef: result.ledgerRef,
    resultingStateSummary: result.resultingState?.label,
    ...options,
    metadata: {
      publicEffect: result.publicEffect,
      ...(options.metadata ?? {}),
    },
  });
}

export function logCommandReloadValidated(
  input: ICommandReloadValidationInput,
  emit?: CommandDiagnosticEmitter,
): IDiagnosticLogEntry {
  return logCommandDiagnostic(
    {
      event: 'command_reload_validated',
      level: 'info',
      message: 'Validated command result through persisted reload/replay path.',
      ...input,
      metadata: {
        resultCount: input.resultCount,
        ...(input.metadata ?? {}),
      },
    },
    emit,
  );
}

export function logMalformedCommandPayload(
  input: IMalformedCommandPayloadInput,
  emit?: CommandDiagnosticEmitter,
): IDiagnosticLogEntry {
  return logCommandDiagnostic(
    {
      event: 'command_malformed_payload_rejected',
      level: 'warn',
      message: 'Rejected malformed command payload before state mutation.',
      status: 'rejected',
      userVisibleStateChanged: false,
      ...input,
      metadata: {
        payloadKind: input.payloadKind,
        ...(input.metadata ?? {}),
      },
    },
    emit,
  );
}

export function logInvalidCommandAction(
  input: Omit<
    ICommandDiagnosticInput,
    'event' | 'level' | 'status' | 'userVisibleStateChanged'
  > & {
    readonly status?: string;
  },
  emit?: CommandDiagnosticEmitter,
): IDiagnosticLogEntry {
  return logCommandDiagnostic(
    {
      event: 'command_invalid_action_rejected',
      level: 'warn',
      message: 'Rejected invalid command action before state mutation.',
      status: input.status ?? 'rejected',
      userVisibleStateChanged: false,
      ...input,
    },
    emit,
  );
}

function normalizeSubjectRefIds(
  input: Pick<ICommandDiagnosticInput, 'subjectRefs' | 'subjectRefIds'>,
): readonly string[] {
  return [
    ...(input.subjectRefIds ?? []),
    ...(input.subjectRefs?.map((ref) => ref.id) ?? []),
  ].filter((id, index, all) => id.length > 0 && all.indexOf(id) === index);
}

function defaultLevelForEvent(event: CommandDiagnosticEvent): LogLevel {
  if (
    event === 'command_malformed_payload_rejected' ||
    event === 'command_preview_rejected' ||
    event === 'command_invalid_action_rejected' ||
    event === 'command_commit_rejected' ||
    event === 'command_commit_drift_detected'
  ) {
    return 'warn';
  }
  return 'info';
}
