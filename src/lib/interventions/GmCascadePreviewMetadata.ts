import type {
  IGmCascadePreview,
  IInterventionLedgerPreview,
} from '@/types/interventions';

export function buildPreviewMetadata(
  preview: IInterventionLedgerPreview,
  previewId: string,
): Pick<
  IGmCascadePreview,
  | 'previewId'
  | 'subjectIds'
  | 'beforeSummary'
  | 'afterSummary'
  | 'resultingStateSummary'
  | 'redactionPolicy'
> {
  const events = preview.projectedEvents ?? [];
  return {
    previewId: preview.previewId ?? previewId,
    subjectIds: preview.subjectIds ?? affectedStateRefs(preview),
    beforeSummary:
      preview.beforeSummary ?? firstSummary(events, summarizeBeforeEvent),
    afterSummary:
      preview.afterSummary ?? firstSummary(events, summarizeAfterEvent),
    resultingStateSummary:
      preview.resultingStateSummary ??
      publicSummary(preview.publicEffect) ??
      preview.reason,
    redactionPolicy:
      preview.redactionPolicy ??
      (preview.privateMetadata ? 'gm-private-metadata' : 'public-effect-only'),
  };
}

export function affectedStateRefs(
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

function publicSummary(publicEffect: unknown): string | undefined {
  return isRecord(publicEffect)
    ? readString(publicEffect, 'summary')
    : undefined;
}

function firstSummary(
  events: readonly unknown[],
  summarize: (event: unknown) => string | undefined,
): string | undefined {
  for (const event of events) {
    const summary = summarize(event);
    if (summary) return summary;
  }
  return undefined;
}

function summarizeBeforeEvent(event: unknown): string | undefined {
  if (!isRecord(event)) return undefined;
  const family = readString(event, 'family');
  const before = readRecord(event, 'before');

  switch (family) {
    case 'funds-transaction':
      return formatBalance(readNumber(before, 'balanceCents'));
    case 'repair-ticket':
      return summarizeTicket(readString(event, 'ticketId'), before);
    case 'salvage-allocation':
      return summarizeProcessed(readString(event, 'matchId'), before);
    case 'base-unit-state':
      return summarizeUnitState(readString(event, 'unitId'), before);
    case 'time-advance':
      return summarizeDate(readString(before, 'currentDate'));
    case 'unit-reload':
      return summarizeSessionUnit(readString(event, 'unitId'), before);
    default:
      return undefined;
  }
}

function summarizeAfterEvent(event: unknown): string | undefined {
  if (!isRecord(event)) return undefined;
  const family = readString(event, 'family');
  const after = readRecord(event, 'after');

  switch (family) {
    case 'funds-transaction':
      return formatBalance(readNumber(after, 'balanceCents'));
    case 'repair-ticket':
      return summarizeTicket(readString(event, 'ticketId'), after);
    case 'salvage-allocation':
      return summarizeProcessed(readString(event, 'matchId'), after);
    case 'base-unit-state':
      return summarizeUnitState(readString(event, 'unitId'), after);
    case 'time-advance':
      return summarizeDate(readString(after, 'currentDate'));
    case 'unit-reload':
      return summarizeSessionUnit(readString(event, 'unitId'), after);
    default:
      return undefined;
  }
}

function summarizeTicket(
  ticketId: string | undefined,
  value: Record<string, unknown> | undefined,
): string | undefined {
  if (!ticketId) return undefined;
  if (!value) return `Repair ticket ${ticketId}: missing`;
  const status = readString(value, 'status') ?? 'unknown';
  const remainingHours = readNumber(value, 'remainingHours');
  const suffix =
    remainingHours === undefined ? '' : `, ${remainingHours}h remaining`;
  return `Repair ticket ${ticketId}: ${status}${suffix}`;
}

function summarizeProcessed(
  matchId: string | undefined,
  value: Record<string, unknown> | undefined,
): string | undefined {
  if (!matchId) return undefined;
  if (!value) return `Salvage allocation ${matchId}: missing`;
  return `Salvage allocation ${matchId}: processed=${String(
    readBoolean(value, 'processed') ?? false,
  )}`;
}

function summarizeUnitState(
  unitId: string | undefined,
  value: Record<string, unknown> | undefined,
): string | undefined {
  if (!unitId) return undefined;
  const combatState = readRecord(value, 'combatState');
  const ready = readBoolean(combatState, 'combatReady');
  return ready === undefined
    ? `Unit ${unitId}: state checked`
    : `Unit ${unitId}: combatReady=${String(ready)}`;
}

function summarizeSessionUnit(
  unitId: string | undefined,
  value: Record<string, unknown> | undefined,
): string | undefined {
  if (!unitId) return undefined;
  const sessionUnit = readRecord(value, 'sessionUnit');
  const name = readString(sessionUnit, 'name');
  return name ? `Unit ${unitId}: ${name}` : `Unit ${unitId}: source reloaded`;
}

function summarizeDate(value: string | undefined): string | undefined {
  return value ? `Campaign date ${value.slice(0, 10)}` : undefined;
}

function formatBalance(cents: number | undefined): string | undefined {
  if (cents === undefined) return undefined;
  return `Balance ${(cents / 100).toLocaleString('en-US', {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  })} C-bills`;
}

function readRecord(
  value: unknown,
  key: string,
): Record<string, unknown> | undefined {
  if (!isRecord(value)) return undefined;
  const entry = value[key];
  return isRecord(entry) ? entry : undefined;
}

function readString(value: unknown, key: string): string | undefined {
  if (!isRecord(value)) return undefined;
  const entry = value[key];
  return typeof entry === 'string' ? entry : undefined;
}

function readNumber(value: unknown, key: string): number | undefined {
  if (!isRecord(value)) return undefined;
  const entry = value[key];
  return typeof entry === 'number' && Number.isFinite(entry)
    ? entry
    : undefined;
}

function readBoolean(value: unknown, key: string): boolean | undefined {
  if (!isRecord(value)) return undefined;
  const entry = value[key];
  return typeof entry === 'boolean' ? entry : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function uniqueRefs(refs: readonly string[]): readonly string[] {
  return Array.from(new Set(refs));
}
