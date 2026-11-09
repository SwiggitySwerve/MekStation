import type { StateCreator } from 'zustand';

import type { ICampaignWithBattleState } from '@/lib/campaign/processors/postBattleProcessor';
import type {
  IAppliedCombatOutcome,
  ICombatOutcome,
} from '@/types/combat/CombatOutcome';

import { toast } from '@/components/shared/Toast';
import { campaignDaysBetween } from '@/lib/campaign/campaignCalendar';
import {
  campaignEventFromMessage,
  getActiveCampaignSyncTransport,
  type ICampaignSyncTransport,
} from '@/lib/campaign/coop/campaignSyncTransport';
import {
  appendDailyBattleAuditEntry,
  buildDailyBattleAuditEntry,
} from '@/lib/campaign/dailyBattleAuditBuilder';
import {
  convertToLegacyDayReport,
  DayReport,
} from '@/lib/campaign/dayAdvancement';
import { getDayPipeline, type IDayEvent } from '@/lib/campaign/dayPipeline';
import { registerBuiltinProcessors } from '@/lib/campaign/processors';
import {
  logTravelCommitSucceeded,
  logTravelInvalidAction,
  logTravelMalformedDestination,
  logTravelNoCampaign,
  logTravelPreview,
} from '@/lib/starmap/starmapTravelCommandDiagnostics';
import {
  buildStarmapTravelPreview,
  type IStarmapTravelPreview,
} from '@/lib/starmap/starmapTravelPreview';
import { ICampaign } from '@/types/campaign/Campaign';

import type { IDayAdvanceSnapshot } from './dayAdvanceSnapshot';
import type {
  CampaignCommitResult,
  CampaignStore,
  MaybePromise,
} from './useCampaignStore.types';

import { appendContractPaymentActivityEntries } from './contractPaymentActivity';
import {
  captureDayAdvanceSnapshot,
  recordPipelineWrites,
  recordStoredCampaign,
  rollbackDayAdvance,
} from './dayAdvanceSnapshot';
import { useCampaignPersistenceStore } from './useCampaignPersistenceStore';
import {
  snapshotRosterPilots,
  withBattleQueueAttached,
} from './useCampaignStore.persistence';

type CampaignSet = Parameters<StateCreator<CampaignStore>>[0];
type CampaignGet = Parameters<StateCreator<CampaignStore>>[1];

/**
 * How long the co-op host has to answer an AdvanceDay intent. The host's own
 * commit is a local journal append; half a minute is past any healthy answer.
 * Expiry is safe to retry: the intent id derives from the campaign's current
 * date, so a retry is the same command and the host replays its receipt
 * rather than committing a second day.
 */
export const COOP_ADVANCE_TIMEOUT_MS = 30_000;

/**
 * Run `run` as the only clock-moving action (day advance, multi-day advance,
 * travel) in flight on this store, holding `dayAdvanceInFlight` until its
 * result settles. A call made meanwhile changes nothing, toasts once and
 * returns `busy`. Releases on a throw as well as on a result.
 */
function runExclusive<T>(
  set: CampaignSet,
  get: CampaignGet,
  busy: T,
  run: () => MaybePromise<T>,
): MaybePromise<T> {
  if (get().dayAdvanceInFlight) {
    toast({
      message:
        'The campaign clock is already advancing. Try again in a moment.',
      variant: 'warning',
    });
    return busy;
  }
  set({ dayAdvanceInFlight: true });
  const release = (): void => set({ dayAdvanceInFlight: false });
  let result: MaybePromise<T>;
  try {
    result = run();
  } catch (error) {
    release();
    throw error;
  }
  if (!isPromiseLike(result)) {
    release();
    return result;
  }
  return result.finally(release);
}

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

/**
 * Advance the campaign one day, as the only clock action in flight
 * (runExclusive). See advanceOneDay for what the day itself does.
 */
function advanceDayAction(
  set: CampaignSet,
  get: CampaignGet,
): CampaignStore['advanceDay'] {
  return () =>
    runExclusive<DayReport | null>(set, get, null, () =>
      advanceOneDay(set, get),
    );
}

/**
 * One day's advance, with the clock lock already held by the caller. A guest
 * mirror refuses: it cannot save, and the host's clock is the only one, so
 * running the pipeline there would only diverge the mirror from the host. A
 * co-op campaign whose host transport is active advances through the host
 * first (advanceCoopDayThroughHost). Any other campaign runs the day locally
 * and saves it; a co-op host whose socket is not up then warns that guests
 * may need to refetch once the save committed.
 */
function advanceOneDay(
  set: CampaignSet,
  get: CampaignGet,
): MaybePromise<DayReport | null> {
  const { campaign } = get();
  if (!campaign) {
    return null;
  }
  if (campaign.coopSession?.mode === 'guest') {
    toast({
      message: 'Only the host can advance the day.',
      variant: 'warning',
    });
    return null;
  }
  const transport = coopHostTransport(campaign);
  if (transport) {
    return advanceCoopDayThroughHost(set, get, transport, campaign);
  }
  const report = advanceDayLocally(set, get, campaign);
  if (!isPromiseLike(report)) {
    return report;
  }
  return report.then((committed) => {
    if (committed) warnCoopDayAdvanceWithoutHost(campaign);
    return committed;
  });
}

const errorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

/**
 * Tell the player a day or a jump was not saved and what became of the
 * stores: `restoreFailure` is the message of the first restore that failed.
 */
function toastNotSaved(
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
interface IAppliedDay {
  readonly committedReport: DayReport;
  /** Outcome-apply errors that are new this day; toasted once it is saved. */
  readonly outcomeErrorToasts: readonly string[];
}

/**
 * Run one day of `campaign` through the day pipeline, store the result
 * (campaign, battle queue, outcome errors, missions, activity entries) and
 * save it. Returns the day report once the save committed, or null when it
 * did not; a promise when the save is asynchronous (a co-op campaign).
 *
 * A day that is not saved - the save refused, or a throw anywhere after the
 * stores were first written - is rolled back (dayAdvanceSnapshot) and
 * reported with a toast, so the player can retry it.
 */
function advanceDayLocally(
  set: CampaignSet,
  get: CampaignGet,
  campaign: ICampaign,
): MaybePromise<DayReport | null> {
  const snapshot = captureDayAdvanceSnapshot(get, campaign);
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
    day = applyDayToStores(set, get, campaign, snapshot);
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
    return result.committed ? day.committedReport : null;
  };
  return isPromiseLike(saveResult)
    ? saveResult.then(settle, (error) => fail(errorMessage(error)))
    : settle(saveResult);
}

/** Run the pipeline and write its result to the stores, up to the save. */
function applyDayToStores(
  set: CampaignSet,
  get: CampaignGet,
  campaign: ICampaign,
  snapshot: IDayAdvanceSnapshot,
): IAppliedDay {
  const { pendingBattleOutcomes, processedBattleIds } = get();
  registerBuiltinProcessors();
  const campaignWithOutcomes = withBattleQueueAttached(
    campaign,
    pendingBattleOutcomes,
    processedBattleIds,
  );
  const beforeRosterPilots = snapshotRosterPilots();
  const pipelineResult = getDayPipeline().processDay(campaignWithOutcomes);
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
  const campaignWithAudit = appendDailyBattleAuditEntry(
    report.campaign,
    auditEntry,
  );
  const pendingOutcomes = [...(postPipeline.pendingBattleOutcomes ?? [])];
  const previousErrors = get().outcomeApplyErrors;
  const outcomeApplyErrors = collectOutcomeErrors(
    pipelineResult.events,
    previousErrors,
    pendingOutcomes,
  );
  set({
    campaign: campaignWithAudit,
    pendingBattleOutcomes: pendingOutcomes,
    processedBattleIds: [
      ...(postPipeline.processedBattleIds ?? processedBattleIds),
    ],
    outcomeApplyErrors,
  });
  recordStoredCampaign(snapshot, campaignWithAudit);
  const outcomeErrorToasts = Object.entries(outcomeApplyErrors)
    .filter(([matchId, error]) => error !== previousErrors[matchId])
    .map(([matchId, error]) => `Battle ${matchId}: ${error}`);
  syncReportMissions(get, report.campaign);
  emitDailyActivityEntries(get, report, postPipeline, pipelineResult.events);
  return {
    committedReport: { ...report, campaign: campaignWithAudit },
    outcomeErrorToasts,
  };
}

/**
 * Advance `count` days holding the clock lock for the whole run, so nothing
 * moves the clock between two of its days. Each day is advanced by
 * advanceOneDay, not the public action, which would find the lock taken.
 */
function advanceDaysAction(
  set: CampaignSet,
  get: CampaignGet,
): CampaignStore['advanceDays'] {
  return (count: number) =>
    runExclusive<DayReport[] | null>(set, get, null, () => {
      if (!get().campaign) {
        return null;
      }
      const reports: DayReport[] = [];
      for (let i = 0; i < count; i++) {
        const report = advanceOneDay(set, get);
        if (isPromiseLike(report)) {
          return finishAsyncAdvanceDays(
            set,
            get,
            report,
            reports,
            i + 1,
            count,
          );
        }
        if (!report) break;
        reports.push(report);
      }
      return reports.length > 0 ? reports : null;
    });
}

function campaignDayFor(campaign: ICampaign): number {
  const startDate = campaign.campaignStartDate ?? campaign.currentDate;
  return campaignDaysBetween(startDate, campaign.currentDate);
}

function isPromiseLike<T>(value: MaybePromise<T>): value is Promise<T> {
  return (
    typeof value === 'object' &&
    value !== null &&
    'then' in value &&
    typeof (value as { then?: unknown }).then === 'function'
  );
}

async function finishAsyncAdvanceDays(
  set: CampaignSet,
  get: CampaignGet,
  firstPending: Promise<DayReport | null>,
  reports: DayReport[],
  nextIndex: number,
  count: number,
): Promise<DayReport[] | null> {
  const firstReport = await firstPending;
  if (firstReport) {
    reports.push(firstReport);
  }
  for (let i = nextIndex; i < count; i++) {
    const report = await advanceOneDay(set, get);
    if (!report) break;
    reports.push(report);
  }
  return reports.length > 0 ? reports : null;
}

/** The active host-role transport of `campaign`'s co-op match, or null. */
function coopHostTransport(campaign: ICampaign): ICampaignSyncTransport | null {
  const session = campaign.coopSession;
  const transport = getActiveCampaignSyncTransport(
    session?.matchId ?? session?.hostMatchId,
  );
  return transport?.role === 'host' ? transport : null;
}

/**
 * The co-op host's day advance (roadmap unit U96): AdvanceDay goes to the
 * live host first. A refusal toasts its reason and returns null with
 * nothing computed or saved. On commit the command has rewritten the saved
 * record at the next version (U35e): the record is re-read
 * (refreshAfterCommittedCommand, which replaces the live campaign and roster
 * with it), the campaign the day was advanced from is put back, and the day
 * runs locally and is saved at that version, carrying the day the host
 * already holds, so the host's adoption of the save does not re-advance it.
 */
async function advanceCoopDayThroughHost(
  set: CampaignSet,
  get: CampaignGet,
  transport: ICampaignSyncTransport,
  campaign: ICampaign,
): Promise<DayReport | null> {
  const answer = await sendAdvanceDay(transport, campaign);
  if (answer.kind === 'timeout') {
    toast({
      message:
        "The host didn't answer the day advance in time. Nothing was saved. Retrying is safe.",
      variant: 'error',
      duration: 7000,
    });
    return null;
  }
  if (answer.kind === 'refused') {
    toast({
      message: `Co-op day advance was refused by the host: ${answer.reason}. Nothing was saved.`,
      variant: 'error',
      duration: 7000,
    });
    return null;
  }
  // The awaits above and below are windows in which the player can switch
  // campaigns; the day belongs to the campaign it was started on.
  if (get().campaign?.id !== campaign.id) {
    return null;
  }
  await useCampaignPersistenceStore.getState().refreshAfterCommittedCommand({
    kind: 'committed',
    state: { campaignId: campaign.id },
  });
  if (get().campaign?.id !== campaign.id) {
    return null;
  }
  set({ campaign });
  return advanceDayLocally(set, get, campaign);
}

/** The host's answer to an AdvanceDay intent, or its absence. */
type AdvanceDayAnswer =
  | { readonly kind: 'committed' }
  | { readonly kind: 'refused'; readonly reason: string }
  | { readonly kind: 'timeout' };

/**
 * Send the AdvanceDay host intent for the day `campaign` is on and resolve
 * with the host's answer on `transport`: committed when a CampaignDayAdvanced
 * event of the campaign arrives, refused with the reason (or, without one,
 * the code) of the Error frame carrying the intent's id or with the message
 * of a transport error or of a send that threw, or timeout when nothing
 * answered within COOP_ADVANCE_TIMEOUT_MS. The listeners and the timer are
 * dropped on the first answer, so a frame that arrives later is ignored.
 */
function sendAdvanceDay(
  transport: ICampaignSyncTransport,
  campaign: ICampaign,
): Promise<AdvanceDayAnswer> {
  const intentId = `host-advance-day-${campaign.id}-${campaign.currentDate.toISOString()}`;
  return new Promise((resolve) => {
    const stops: (() => void)[] = [];
    let settled = false;
    const answer = (result: AdvanceDayAnswer): void => {
      if (settled) return;
      settled = true;
      stops.forEach((stop) => stop());
      resolve(result);
    };
    const refuse = (reason: string): void =>
      answer({ kind: 'refused', reason });
    stops.push(
      transport.onFrame((message) => {
        if (message.kind === 'Error' && message.intentId === intentId) {
          refuse(message.reason ?? message.code);
          return;
        }
        const event =
          message.kind === 'CampaignEvent'
            ? campaignEventFromMessage(message)
            : null;
        if (
          event?.type === 'CampaignDayAdvanced' &&
          event.campaignId === campaign.id
        ) {
          answer({ kind: 'committed' });
        }
      }),
      transport.onError((error) =>
        refuse(error instanceof Error ? error.message : 'campaign sync error'),
      ),
    );
    const timer = setTimeout(
      () => answer({ kind: 'timeout' }),
      COOP_ADVANCE_TIMEOUT_MS,
    );
    stops.push(() => clearTimeout(timer));
    try {
      transport.sendHostIntent({
        kind: 'AdvanceDay',
        campaignId: campaign.id,
        intentId,
        payload: { days: 1 },
      });
    } catch (error) {
      refuse(error instanceof Error ? error.message : 'co-op push failed');
    }
  });
}

/**
 * Toast that a saved co-op day advance did not reach a live host, when
 * `campaign` names a co-op match (the caller found no host transport).
 */
function warnCoopDayAdvanceWithoutHost(campaign: ICampaign): void {
  const session = campaign.coopSession;
  if (!session?.matchId && !session?.hostMatchId) {
    return;
  }
  toast({
    message:
      'Co-op day advance was saved but the live host connection is unavailable. Guests may need to refetch.',
    variant: 'warning',
    duration: 7000,
  });
}

function travelToSystemAction(
  set: CampaignSet,
  get: CampaignGet,
): CampaignStore['travelToSystem'] {
  return (systemId: string) =>
    runExclusive<boolean>(set, get, false, () => {
      const preview = get().previewTravelToSystem(systemId);
      if (!preview || preview.status !== 'ready' || !preview.afterCampaign) {
        logTravelInvalidAction(get().campaign, systemId, preview);
        return false;
      }
      // A jump that is not saved is undone like a day (dayAdvanceSnapshot).
      const snapshot = captureDayAdvanceSnapshot(
        get,
        get().campaign as ICampaign,
      );
      const fail = (reason: string): false => {
        toastNotSaved('jump', reason, rollbackDayAdvance(set, get, snapshot));
        return false;
      };
      let saveResult: MaybePromise<CampaignCommitResult>;
      try {
        set({ campaign: preview.afterCampaign });
        recordStoredCampaign(snapshot, preview.afterCampaign);
        emitTravelActivityEntries(get, preview);
        try {
          saveResult = get().saveCampaign();
        } finally {
          recordStoredCampaign(snapshot, get().campaign);
        }
      } catch (error) {
        return fail(errorMessage(error));
      }
      const settle = (result: CampaignCommitResult): boolean => {
        // A recoverable refusal keeps the jump pending (see the day's settle).
        if (!result.committed) {
          return result.recoverable
            ? false
            : fail(result.reason ?? 'the save was refused');
        }
        logTravelCommitSucceeded(preview);
        return true;
      };
      return isPromiseLike(saveResult)
        ? saveResult.then(settle, (error) => fail(errorMessage(error)))
        : settle(saveResult);
    });
}

function previewTravelToSystemAction(
  get: CampaignGet,
): CampaignStore['previewTravelToSystem'] {
  return (systemId: string) => {
    const { campaign } = get();
    if (!campaign) {
      logTravelNoCampaign(systemId);
      return null;
    }
    if (!systemId) {
      logTravelMalformedDestination(campaign);
      return null;
    }

    const preview = buildStarmapTravelPreview(campaign, systemId);
    logTravelPreview(campaign, systemId, preview);
    return preview;
  };
}

function emitTravelActivityEntries(
  get: CampaignGet,
  preview: IStarmapTravelPreview,
): void {
  const campaign = preview.afterCampaign;
  const destination = preview.destinationSystem;
  if (!campaign || !destination) return;

  const campaignDay = campaignDayFor(campaign);
  const append = get().appendActivityLogEntry;
  append({
    id: `travel-${campaign.id}-${preview.generatedAt}-${destination.id}`,
    timestamp: preview.generatedAt,
    campaignDay,
    category: 'travel',
    message: `Jumped to ${destination.name} over ${preview.elapsedDays} days.`,
    payload: {
      event: 'jump',
      fromSystemId: preview.fromSystem.id,
      toSystemId: destination.id,
      toSystemName: destination.name,
    },
  });

  if (!preview.travelFees.isZero()) {
    append({
      id: `act-finances-travel-fee-${campaign.id}-${preview.generatedAt}-${destination.id}`,
      timestamp: preview.generatedAt,
      campaignDay,
      category: 'finances',
      message: `Travel fees: ${preview.travelFees.format()}`,
      payload: {
        event: 'spend',
        amount: -preview.travelFees.amount,
        currency: 'C-bills',
        memo: `${preview.fromSystem.name} to ${destination.name}`,
      },
    });
  }

  if (!preview.dailyCosts.isZero()) {
    append({
      id: `act-finances-travel-daily-costs-${campaign.id}-${preview.generatedAt}-${destination.id}`,
      timestamp: preview.generatedAt,
      campaignDay,
      category: 'finances',
      message: `Travel upkeep: ${preview.dailyCosts.format()}`,
      payload: {
        event: 'daily-costs',
        amount: -preview.dailyCosts.amount,
        currency: 'C-bills',
        memo: `${preview.elapsedDays} travel days`,
      },
    });
  }

  preview.generatedEvents
    .filter((event) => event.type === 'repair_completed')
    .forEach((event, index) => {
      const unitId =
        typeof event.data?.unitId === 'string' ? event.data.unitId : 'unit';
      append({
        id: `act-technical-travel-repair-${campaign.id}-${preview.generatedAt}-${unitId}-${index}`,
        timestamp: preview.generatedAt,
        campaignDay,
        category: 'technical',
        message: event.description,
        payload: {
          event: 'repair-complete',
          unitId,
          unitName: unitId,
        },
      });
    });
}

export function createCampaignDayActions(
  set: CampaignSet,
  get: CampaignGet,
): Pick<
  CampaignStore,
  'advanceDay' | 'advanceDays' | 'previewTravelToSystem' | 'travelToSystem'
> {
  return {
    advanceDay: advanceDayAction(set, get),
    advanceDays: advanceDaysAction(set, get),
    previewTravelToSystem: previewTravelToSystemAction(get),
    travelToSystem: travelToSystemAction(set, get),
  };
}
