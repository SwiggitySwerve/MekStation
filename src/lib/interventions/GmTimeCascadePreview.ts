import type { IDayEvent, IDayProcessor } from '@/lib/campaign/dayPipeline';
import type { ICampaign } from '@/types/campaign/Campaign';
import type { ICampaignWithCommand } from '@/types/campaign/CampaignCommandExtensions';
import type {
  IGmTimeCascadeInterventionCommandPayload,
  IGmTimeCascadeInterventionConflictInput,
  IGmTimeCascadeInterventionState,
  IGmTimeCascadeProjectedEffect,
} from '@/types/interventions';

import {
  contractProcessor,
  dailyCostsProcessor,
  repairProgressProcessor,
  unitMarketProcessor,
  personnelMarketProcessor,
  contractMarketProcessor,
} from '@/lib/campaign/processors';
import { findSystemById } from '@/lib/starmap/loadInnerSphereSeed';

export interface IGmTimeCascadeProjectedEffectResult {
  readonly effect: IGmTimeCascadeProjectedEffect;
  readonly changedStateRefs: readonly string[];
  readonly summary: string;
  readonly conflicts: readonly IGmTimeCascadeInterventionConflictInput[];
}

export interface IGmTimeCascadeProjectedEffectFailure {
  readonly effect?: undefined;
  readonly code: string;
  readonly reason: string;
  readonly affectedRefs?: readonly string[];
}

const DAY_MS = 24 * 60 * 60 * 1000;

const TIME_CASCADE_PROCESSORS = [
  repairProgressProcessor,
  contractProcessor,
  dailyCostsProcessor,
  unitMarketProcessor,
  personnelMarketProcessor,
  contractMarketProcessor,
] as const satisfies readonly IDayProcessor[];

const CAMPAIGN_ROOT_FIELDS = [
  'currentDate',
  'currentSystemId',
  'repairQueue',
  'partsInventory',
  'unitCombatStates',
  'finances',
  'missions',
  'loans',
  'unitMarket',
  'personnelMarket',
  'contractMarket',
] as const;

export function buildGmTimeCascadeProjectedEffect(
  payload: IGmTimeCascadeInterventionCommandPayload,
  state: IGmTimeCascadeInterventionState,
): IGmTimeCascadeProjectedEffectResult | IGmTimeCascadeProjectedEffectFailure {
  const { correction } = payload;
  if (correction.family !== 'time-advance') {
    return failure(
      'time-cascade-family-invalid',
      'Unsupported time cascade correction family.',
      [campaignRef(state.id)],
    );
  }

  if (!Number.isInteger(correction.days) || correction.days <= 0) {
    return failure(
      'time-cascade-days-invalid',
      'Time cascade requires a positive integer day count.',
      [campaignFieldRef(state.id, 'currentDate')],
    );
  }

  if (
    correction.baseUpdatedAt !== undefined &&
    correction.baseUpdatedAt !== state.updatedAt
  ) {
    return failure(
      'time-cascade-base-stale',
      'Time cascade preview was based on a stale campaign version.',
      [campaignRef(state.id), campaignFieldRef(state.id, 'updatedAt')],
    );
  }

  const currentDateIso = state.currentDate.toISOString();
  if (
    correction.baseCurrentDate !== undefined &&
    correction.baseCurrentDate !== currentDateIso
  ) {
    return failure(
      'time-cascade-date-stale',
      'Time cascade preview was based on a stale campaign date.',
      [campaignFieldRef(state.id, 'currentDate')],
    );
  }

  if (
    correction.destinationSystemId &&
    !findSystemById(correction.destinationSystemId)
  ) {
    return failure(
      'time-cascade-destination-unknown',
      `Destination system "${correction.destinationSystemId}" was not found.`,
      [campaignFieldRef(state.id, 'currentSystemId')],
    );
  }

  const generatedAt = correction.generatedAt ?? new Date().toISOString();
  const initialCampaign = applyTravelDestination(
    state,
    correction.destinationSystemId,
  );
  const projection = projectDays(initialCampaign, correction.days, generatedAt);
  const externalEffects = correction.projectedExternalEffects ?? [];
  const externalConflicts = buildExternalConflicts(
    correction.externalEffectRefs,
    externalEffects,
  );
  const explicitConflicts = normalizeConflicts(payload.conflicts);
  const changedStateRefs = uniqueRefs([
    ...computeChangedStateRefs(state, projection.campaign),
    ...externalEffects.map((effect) => effect.ref),
    ...externalConflicts.flatMap((conflict) => conflict.affectedRefs ?? []),
    ...explicitConflicts.flatMap((conflict) => conflict.affectedRefs ?? []),
  ]);
  const summary =
    payload.publicSummary ??
    buildPublicSummary({
      days: correction.days,
      fromDate: state.currentDate.toISOString(),
      toDate: projection.campaign.currentDate.toISOString(),
      fromSystemId: state.currentSystemId,
      toSystemId: projection.campaign.currentSystemId,
    });

  return {
    summary,
    changedStateRefs,
    conflicts: [...externalConflicts, ...explicitConflicts],
    effect: {
      type: 'gm.campaign.time_cascade_applied',
      domain: 'time',
      family: 'time-advance',
      days: correction.days,
      destinationSystemId: correction.destinationSystemId,
      before: snapshotState(state),
      after: snapshotState(projection.campaign),
      afterCampaign: projection.campaign,
      daySummaries: projection.daySummaries,
      generatedEvents: projection.events,
      changedStateRefs,
      externalEffects,
      publicSummary: summary,
    },
  };
}

export function campaignRef(campaignId: string): string {
  return `campaign:${campaignId}`;
}

export function campaignFieldRef(campaignId: string, field: string): string {
  return `campaign:${campaignId}:${field}`;
}

export function externalRef(campaignId: string, ref: string): string {
  return ref.startsWith('campaign:') ? ref : `campaign:${campaignId}:${ref}`;
}

function projectDays(
  campaign: ICampaign,
  days: number,
  generatedAt: string,
): {
  readonly campaign: ICampaignWithCommand;
  readonly daySummaries: IGmTimeCascadeProjectedEffect['daySummaries'];
  readonly events: readonly IDayEvent[];
} {
  let current = campaign as ICampaignWithCommand;
  const allEvents: IDayEvent[] = [];
  const daySummaries: IGmTimeCascadeProjectedEffect['daySummaries'][number][] =
    [];

  for (let dayIndex = 1; dayIndex <= days; dayIndex += 1) {
    const processedDate = current.currentDate;
    const processorsRun: string[] = [];
    const dayEvents: IDayEvent[] = [];
    let working = current;

    for (const processor of [...TIME_CASCADE_PROCESSORS].sort(
      (a, b) => a.phase - b.phase,
    )) {
      const result = processor.process(working, processedDate);
      working = result.campaign as ICampaignWithCommand;
      dayEvents.push(...result.events);
      processorsRun.push(processor.id);
    }

    const resultingDate = new Date(processedDate.getTime() + DAY_MS);
    current = {
      ...working,
      currentDate: resultingDate,
      updatedAt: generatedAt,
    };

    allEvents.push(...dayEvents);
    daySummaries.push({
      dayIndex,
      processedDate: processedDate.toISOString(),
      resultingDate: resultingDate.toISOString(),
      eventCount: dayEvents.length,
      eventTypes: uniqueRefs(dayEvents.map((event) => event.type)),
      processorsRun,
    });
  }

  return { campaign: current, daySummaries, events: allEvents };
}

function applyTravelDestination(
  state: IGmTimeCascadeInterventionState,
  destinationSystemId: string | undefined,
): ICampaignWithCommand {
  if (!destinationSystemId) return state;
  return {
    ...state,
    currentSystemId: destinationSystemId,
  };
}

function buildExternalConflicts(
  externalRefs: readonly string[] | undefined,
  externalEffects: readonly { readonly ref: string }[],
): readonly IGmTimeCascadeInterventionConflictInput[] {
  const projectedRefs = new Set(externalEffects.map((effect) => effect.ref));
  return (externalRefs ?? [])
    .filter((ref) => !projectedRefs.has(ref))
    .map((ref) => ({
      code: 'time-cascade-external-effect-unprojected',
      message: `External time effect "${ref}" requires manual projection before approval.`,
      affectedRefs: [ref],
      requiresManualTakeover: true,
    }));
}

function normalizeConflicts(
  conflicts: IGmTimeCascadeInterventionCommandPayload['conflicts'] | undefined,
): readonly IGmTimeCascadeInterventionConflictInput[] {
  return (conflicts ?? []).filter(
    (conflict) =>
      isNonEmptyString(conflict.code) && isNonEmptyString(conflict.message),
  );
}

function computeChangedStateRefs(
  before: IGmTimeCascadeInterventionState,
  after: ICampaignWithCommand,
): readonly string[] {
  const refs = CAMPAIGN_ROOT_FIELDS.filter(
    (field) =>
      snapshotValue(readCampaignField(before, field)) !==
      snapshotValue(readCampaignField(after, field)),
  ).map((field) => campaignFieldRef(before.id, field));
  return uniqueRefs(refs);
}

function readCampaignField(
  campaign: ICampaignWithCommand,
  field: (typeof CAMPAIGN_ROOT_FIELDS)[number],
): unknown {
  return campaign[field];
}

function snapshotState(campaign: ICampaign): {
  readonly currentDate: string;
  readonly updatedAt: string;
  readonly currentSystemId?: string;
} {
  return {
    currentDate: campaign.currentDate.toISOString(),
    updatedAt: campaign.updatedAt,
    currentSystemId: campaign.currentSystemId,
  };
}

function snapshotValue(value: unknown): string {
  return JSON.stringify(value, (_key, entry) => {
    if (entry instanceof Map) return Array.from(entry.entries());
    if (entry && typeof entry === 'object' && 'centsValue' in entry) {
      return (entry as { readonly centsValue: number }).centsValue;
    }
    return entry;
  });
}

function buildPublicSummary(input: {
  readonly days: number;
  readonly fromDate: string;
  readonly toDate: string;
  readonly fromSystemId?: string;
  readonly toSystemId?: string;
}): string {
  const dateSummary = `Campaign time advanced ${input.days} day${input.days === 1 ? '' : 's'} from ${input.fromDate.slice(0, 10)} to ${input.toDate.slice(0, 10)}.`;
  if (!input.toSystemId || input.fromSystemId === input.toSystemId) {
    return dateSummary;
  }
  return `${dateSummary} Campaign location changed from ${input.fromSystemId ?? 'terra'} to ${input.toSystemId}.`;
}

function failure(
  code: string,
  reason: string,
  affectedRefs: readonly string[],
): IGmTimeCascadeProjectedEffectFailure {
  return { code, reason, affectedRefs };
}

function uniqueRefs(refs: readonly string[]): readonly string[] {
  return Array.from(new Set(refs));
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}
