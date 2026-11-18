/**
 * One campaign day run locally: computed through the day pipeline
 * (computeDay), written to the stores (installDay) and saved (commitDay),
 * rolled back and reported when it is not saved. Shared by the single-player
 * day advance (useCampaignStore.dayActions) and the co-op host's
 * (coopDayAdvance).
 */

import type { StateCreator } from 'zustand';

import type { ICampaignWithBattleState } from '@/lib/campaign/processors/postBattleProcessor';
import type {
  IAppliedCombatOutcome,
  ICombatOutcome,
} from '@/types/combat/CombatOutcome';

import { toast } from '@/components/shared/Toast';
import { campaignDaysBetween } from '@/lib/campaign/campaignCalendar';
import {
  appendDailyBattleAuditEntry,
  buildDailyBattleAuditEntry,
} from '@/lib/campaign/dailyBattleAuditBuilder';
import {
  convertToLegacyDayReport,
  DayReport,
} from '@/lib/campaign/dayAdvancement';
import {
  describeDayProcessorFailure,
  getDayPipeline,
  type IDayEvent,
} from '@/lib/campaign/dayPipeline';
import {
  persistDayAwardGrants,
  registerBuiltinProcessors,
} from '@/lib/campaign/processors';
import { ICampaign } from '@/types/campaign/Campaign';

import type { IDayAdvanceSnapshot } from './dayAdvanceSnapshot';
import type {
  CampaignCommitResult,
  CampaignStore,
  MaybePromise,
} from './useCampaignStore.types';

import { restoreBattleOutcomeState } from './campaignBattleOutcomeState';
import { appendContractPaymentActivityEntries } from './contractPaymentActivity';
import {
  captureDayAdvanceSnapshot,
  recordPipelineWrites,
  recordStoredCampaign,
  rollbackDayAdvance,
} from './dayAdvanceSnapshot';
import {
  snapshotRosterPilots,
  withBattleQueueAttached,
} from './useCampaignStore.persistence';

export type CampaignSet = Parameters<StateCreator<CampaignStore>>[0];
export type CampaignGet = Parameters<StateCreator<CampaignStore>>[1];

function collectOutcomeErrors(
  events: readonly { readonly type: string; readonly data?: unknown }[],
  previousErrors: Record<string, string>,
  queuedOutcomes: readonly ICombatOutcome[],
): Record<string, string> {
  const stillQueued = new Set(queuedOutcomes.map((outcome) => outcome.matchId));
  const nextErrors: Record<string, string> = {};
  for (const event of events) {
    if (event.type !== 'post_battle_apply_failed') continue;
    const data = event.data as { matchId?: unknown; error?: unknown };
    if (typeof data.matchId === 'string' && typeof data.error === 'string') {
      nextErrors[data.matchId] = data.error;
    }
  }
  for (const [matchId, message] of Object.entries(previousErrors)) {
    if (stillQueued.has(matchId) && !(matchId in nextErrors)) {
      nextErrors[matchId] = message;
    }
  }
  return nextErrors;
}

function collectAppliedOutcomesForAudit(
  queuedBeforeDay: readonly ICombatOutcome[],
  recentlyApplied: readonly ICombatOutcome[],
  events: readonly { readonly type: string; readonly data?: unknown }[],
): readonly ICombatOutcome[] {
  const appliedIds: string[] = [];
  for (const event of events) {
    if (event.type !== 'post_battle_applied') continue;
    const matchId = (event.data as { matchId?: unknown } | undefined)?.matchId;
    if (typeof matchId === 'string') {
      appliedIds.push(matchId);
    }
  }

  if (appliedIds.length === 0) {
    return [];
  }

  const byMatchId = new Map<string, ICombatOutcome>();
  for (const outcome of [...queuedBeforeDay, ...recentlyApplied]) {
    byMatchId.set(outcome.matchId, outcome);
  }

  return appliedIds
    .map((matchId) => byMatchId.get(matchId))
    .filter((outcome): outcome is ICombatOutcome => Boolean(outcome));
}

function syncReportMissions(get: CampaignGet, campaign: ICampaign): void {
  const missionsStore = get().missionsStore;
  if (!missionsStore) {
    return;
  }
  const missionState = missionsStore.getState();
  Array.from(campaign.missions.values()).forEach((mission) => {
    missionState.addMission(mission);
  });
}

function emitDailyActivityEntries(
  get: CampaignGet,
  report: DayReport,
  postPipeline: { readonly dayNumber?: number },
  events: readonly IDayEvent[],
): void {
  const dayNumber = postPipeline.dayNumber ?? campaignDayFor(report.campaign);
  const dayId =
    postPipeline.dayNumber?.toString() ??
    report.date.toISOString().slice(0, 10);
  const append = get().appendActivityLogEntry;
  const isoNow = new Date().toISOString();
  for (const heal of report.healedPersonnel) {
    append({
      id: `act-medical-${heal.personId}-${dayId}`,
      category: 'medical',
      timestamp: isoNow,
      campaignDay: dayNumber,
      message: `${heal.personName} recovered`,
      payload: {
        pilotId: heal.personId,
        pilotName: heal.personName,
        event: 'recovered',
      },
    });
  }
  for (const exp of report.expiredContracts) {
    append({
      id: `act-finances-contract-expiry-${exp.contractId}-${dayId}`,
      category: 'finances',
      timestamp: isoNow,
      campaignDay: dayNumber,
      message: `Contract "${exp.contractName}" expired`,
      payload: {
        event: 'contract-expiry',
        amount: 0,
        currency: 'C-bills',
        memo: exp.contractName,
      },
    });
  }
  appendContractPaymentActivityEntries(append, report.campaign, events, {
    campaignDay: dayNumber,
    dayId,
    timestamp: isoNow,
  });
  emitDailyCostEntry(append, report, dayNumber, dayId, isoNow);
}

function emitDailyCostEntry(
  append: CampaignStore['appendActivityLogEntry'],
  report: DayReport,
  dayNumber: number,
  dayId: string,
  timestamp: string,
): void {
  const totalAmount = report.costs.total?.amount ?? 0;
  if (totalAmount === 0) {
    return;
  }
  append({
    id: `act-finances-daily-costs-${dayId}`,
    category: 'finances',
    timestamp,
    campaignDay: dayNumber,
    message: `Daily costs: ${totalAmount.toLocaleString()} C-bills`,
    payload: {
      event: 'daily-costs',
      amount: -totalAmount,
      currency: 'C-bills',
    },
  });
}

export const errorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

/**
 * Tell the player a day or a jump was not saved and what became of the
 * stores: `restoreFailure` is the message of the first restore that failed.
 */
export function toastNotSaved(
  what: string,
  reason: string,
  restoreFailure: string | null,
): void {
  toast({
    message: restoreFailure
      ? `The ${what} was not saved (${reason}), and restoring the campaign failed (${restoreFailure}). Reload the campaign before you go on.`
      : `The ${what} was not saved (${reason}). The campaign was restored; try again.`,
    variant: 'error',
    duration: 7000,
  });
}

/** What the day wrote to the stores, ready to be committed or rolled back. */
export interface IAppliedDay {
  readonly committedReport: DayReport;
  /** Outcome-apply errors that are new this day; toasted once it is saved. */
  readonly outcomeErrorToasts: readonly string[];
  /**
   * The day's events. Its award grants are persisted to the server once the
   * day stands (persistDayAwardGrants), never from inside the pipeline.
   */
  readonly events: readonly IDayEvent[];
}

/** A day the pipeline ran, not yet written to the campaign store. */
export interface IComputedDay {
  /** The battle queue the day started from. */
  readonly queuedOutcomes: readonly ICombatOutcome[];
  readonly report: DayReport;
  /** The day's campaign, with its battle audit entry. */
  readonly campaign: ICampaign;
  readonly events: readonly IDayEvent[];
  readonly pendingBattleOutcomes: ICombatOutcome[];
  readonly processedBattleIds: string[];
  readonly outcomeApplyErrors: Record<string, string>;
  /** Outcome-apply errors that are new this day; toasted once it is saved. */
  readonly outcomeErrorToasts: readonly string[];
  readonly dayNumber?: number;
}

/**
 * Run one day of `campaign` through the day pipeline, store the result
 * (campaign, battle queue, outcome errors, missions, activity entries) and
 * save it. Returns the day report once the save committed, or null when it
 * did not; a promise when the save is asynchronous (a co-op campaign).
 *
 * A day that is not saved - a day processor threw, the save refused, or a
 * throw anywhere after the stores were first written - is rolled back
 * (dayAdvanceSnapshot) and reported with a toast, so the player can retry it.
 * A failed day is never saved.
 */
export function advanceDayLocally(
  set: CampaignSet,
  get: CampaignGet,
  campaign: ICampaign,
): MaybePromise<DayReport | null> {
  const snapshot = captureDayAdvanceSnapshot(get, campaign);
  return commitDay(set, get, snapshot, () =>
    installDay(set, get, computeDay(get, campaign, snapshot), snapshot),
  );
}

/**
 * Write a day to the stores (`install`) and save it. Returns the day report
 * once the save committed, or null; a day that is not saved is rolled back
 * to `snapshot` and reported with a toast.
 */
export function commitDay(
  set: CampaignSet,
  get: CampaignGet,
  snapshot: IDayAdvanceSnapshot,
  install: () => IAppliedDay,
): MaybePromise<DayReport | null> {
  const fail = (reason: string): null => {
    toastNotSaved(
      'day advance',
      reason,
      rollbackDayAdvance(set, get, snapshot),
    );
    return null;
  };
  let day: IAppliedDay;
  let saveResult: MaybePromise<CampaignCommitResult>;
  try {
    day = install();
    try {
      saveResult = get().saveCampaign();
    } finally {
      recordStoredCampaign(snapshot, get().campaign);
    }
  } catch (error) {
    return fail(errorMessage(error));
  }
  const settle = (result: CampaignCommitResult): DayReport | null => {
    // A recoverable refusal (no credential the server accepts) is not a
    // rejection: the persistence layer keeps the change, pending, for a later
    // save once the player renews it, so the day stands. It is not committed,
    // so no report is returned.
    if (!result.committed && !result.recoverable) {
      return fail(result.reason ?? 'the save was refused');
    }
    day.outcomeErrorToasts.forEach((message) =>
      toast({ message, variant: 'error' }),
    );
    persistDayAwardGrants(day.events);
    return result.committed ? day.committedReport : null;
  };
  return isPromiseLike(saveResult)
    ? saveResult.then(settle, (error) => fail(errorMessage(error)))
    : settle(saveResult);
}

/**
 * Run the day pipeline over `campaign` and the store's battle queue. Writes
 * nothing to the campaign store; the processors' own roster and vault writes
 * are noted on `snapshot` so a rollback takes them back. Throws when a day
 * processor threw.
 */
export function computeDay(
  get: CampaignGet,
  campaign: ICampaign,
  snapshot: IDayAdvanceSnapshot,
): IComputedDay {
  const { pendingBattleOutcomes, processedBattleIds } = get();
  registerBuiltinProcessors();
  const campaignWithOutcomes = withBattleQueueAttached(
    campaign,
    pendingBattleOutcomes,
    processedBattleIds,
  );
  const beforeRosterPilots = snapshotRosterPilots();
  const pipelineResult = getDayPipeline().processDay(campaignWithOutcomes);
  if (pipelineResult.failure) {
    // The processors that ran before the failure may have written the roster
    // or the vault; note it so the rollback takes those writes back.
    recordPipelineWrites(snapshot, new Map());
    throw new Error(describeDayProcessorFailure(pipelineResult.failure));
  }
  const report = convertToLegacyDayReport(pipelineResult);
  recordPipelineWrites(snapshot, report.campaign.missions);
  const postPipeline = report.campaign as ICampaign & {
    readonly pendingBattleOutcomes?: readonly ICombatOutcome[];
    readonly processedBattleIds?: readonly string[];
    readonly recentlyAppliedOutcomes?: readonly IAppliedCombatOutcome[];
    readonly dayNumber?: number;
  };
  const auditEntry = buildDailyBattleAuditEntry({
    before: campaignWithOutcomes as ICampaignWithBattleState,
    after: report.campaign as ICampaignWithBattleState,
    beforeRoster: beforeRosterPilots,
    afterRoster: snapshotRosterPilots(),
    appliedOutcomes: collectAppliedOutcomesForAudit(
      campaignWithOutcomes.pendingBattleOutcomes ?? [],
      postPipeline.recentlyAppliedOutcomes ?? [],
      pipelineResult.events,
    ),
    events: pipelineResult.events,
    date: pipelineResult.date,
  });
  const pendingOutcomes = [...(postPipeline.pendingBattleOutcomes ?? [])];
  const previousErrors = get().outcomeApplyErrors;
  const outcomeApplyErrors = collectOutcomeErrors(
    pipelineResult.events,
    previousErrors,
    pendingOutcomes,
  );
  return {
    queuedOutcomes: pendingBattleOutcomes,
    report,
    campaign: appendDailyBattleAuditEntry(report.campaign, auditEntry),
    events: pipelineResult.events,
    pendingBattleOutcomes: pendingOutcomes,
    processedBattleIds: [
      ...(postPipeline.processedBattleIds ?? processedBattleIds),
    ],
    outcomeApplyErrors,
    outcomeErrorToasts: Object.entries(outcomeApplyErrors)
      .filter(([matchId, error]) => error !== previousErrors[matchId])
      .map(([matchId, error]) => `Battle ${matchId}: ${error}`),
    dayNumber: postPipeline.dayNumber,
  };
}

/**
 * Write a computed day to the stores, up to the save. An outcome queued
 * since the day was computed (in the store, or in `laterQueued`) is not the
 * day's: it stays queued for the next day, by the rule a rollback keeps such
 * an outcome (restoreBattleOutcomeState).
 */
export function installDay(
  set: CampaignSet,
  get: CampaignGet,
  day: IComputedDay,
  snapshot: IDayAdvanceSnapshot,
  laterQueued: readonly ICombatOutcome[] = [],
): IAppliedDay {
  const state = get();
  const ledgers = restoreBattleOutcomeState(
    {
      pendingBattleOutcomes: day.pendingBattleOutcomes,
      processedBattleIds: day.processedBattleIds,
      reviewedBattleIds: state.reviewedBattleIds,
    },
    { pendingBattleOutcomes: day.queuedOutcomes },
    {
      pendingBattleOutcomes: [...state.pendingBattleOutcomes, ...laterQueued],
    },
  );
  const campaign =
    ledgers.pendingBattleOutcomes === day.pendingBattleOutcomes
      ? day.campaign
      : {
          ...day.campaign,
          pendingBattleOutcomes: ledgers.pendingBattleOutcomes,
          processedBattleIds: ledgers.processedBattleIds,
        };
  set({
    campaign,
    pendingBattleOutcomes: ledgers.pendingBattleOutcomes,
    processedBattleIds: ledgers.processedBattleIds,
    outcomeApplyErrors: day.outcomeApplyErrors,
  });
  recordStoredCampaign(snapshot, campaign);
  syncReportMissions(get, day.report.campaign);
  emitDailyActivityEntries(get, day.report, day, day.events);
  return {
    committedReport: { ...day.report, campaign },
    outcomeErrorToasts: day.outcomeErrorToasts,
    events: day.events,
  };
}

export function campaignDayFor(campaign: ICampaign): number {
  const startDate = campaign.campaignStartDate ?? campaign.currentDate;
  return campaignDaysBetween(startDate, campaign.currentDate);
}

export function isPromiseLike<T>(value: MaybePromise<T>): value is Promise<T> {
  return (
    typeof value === 'object' &&
    value !== null &&
    'then' in value &&
    typeof (value as { then?: unknown }).then === 'function'
  );
}
