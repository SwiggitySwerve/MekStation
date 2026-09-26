import type { StateCreator } from 'zustand';

import type { ICampaignWithBattleState } from '@/lib/campaign/processors/postBattleProcessor';
import type { ICombatOutcome } from '@/types/combat/CombatOutcome';

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

import type { CampaignStore, MaybePromise } from './useCampaignStore.types';

import { appendContractPaymentActivityEntries } from './contractPaymentActivity';
import { useCampaignPersistenceStore } from './useCampaignPersistenceStore';
import {
  snapshotRosterPilots,
  withBattleQueueAttached,
} from './useCampaignStore.persistence';

type CampaignSet = Parameters<StateCreator<CampaignStore>>[0];
type CampaignGet = Parameters<StateCreator<CampaignStore>>[1];

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
 * Advance the campaign one day. A co-op campaign whose host transport is
 * active advances through the host first (advanceCoopDayThroughHost). Any
 * other campaign runs the day locally and saves it; a co-op campaign without
 * an active host transport (a guest, or a host whose socket is not up) then
 * warns that guests may need to refetch once the save committed.
 */
function advanceDayAction(
  set: CampaignSet,
  get: CampaignGet,
): CampaignStore['advanceDay'] {
  return () => {
    const { campaign } = get();
    if (!campaign) {
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
  };
}

/**
 * Run one day of `campaign` through the day pipeline, store the result
 * (campaign, battle queue, outcome errors, missions, activity entries) and
 * save it. Returns the day report once the save committed, or null when it
 * did not; a promise when the save is asynchronous (a co-op campaign).
 */
function advanceDayLocally(
  set: CampaignSet,
  get: CampaignGet,
  campaign: ICampaign,
): MaybePromise<DayReport | null> {
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
  const postPipeline = report.campaign as ICampaign & {
    readonly pendingBattleOutcomes?: readonly ICombatOutcome[];
    readonly processedBattleIds?: readonly string[];
    readonly recentlyAppliedOutcomes?: readonly ICombatOutcome[];
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
  set({
    campaign: campaignWithAudit,
    pendingBattleOutcomes: pendingOutcomes,
    processedBattleIds: [
      ...(postPipeline.processedBattleIds ?? processedBattleIds),
    ],
    outcomeApplyErrors: collectOutcomeErrors(
      pipelineResult.events,
      get().outcomeApplyErrors,
      pendingOutcomes,
    ),
  });
  syncReportMissions(get, report.campaign);
  emitDailyActivityEntries(get, report, postPipeline, pipelineResult.events);
  const committedReport = { ...report, campaign: campaignWithAudit };
  const saveResult = get().saveCampaign();
  if (isPromiseLike(saveResult)) {
    return saveResult.then((committed) =>
      committed.committed ? committedReport : null,
    );
  }
  if (!saveResult.committed) {
    return null;
  }
  return committedReport;
}

function advanceDaysAction(get: CampaignGet): CampaignStore['advanceDays'] {
  return (count: number) => {
    if (!get().campaign) {
      return null;
    }
    const reports: DayReport[] = [];
    for (let i = 0; i < count; i++) {
      const report = get().advanceDay();
      if (isPromiseLike(report)) {
        return finishAsyncAdvanceDays(get, report, reports, i + 1, count);
      }
      if (!report) break;
      reports.push(report);
    }
    return reports.length > 0 ? reports : null;
  };
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
    const report = await get().advanceDay();
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
  const refusal = await sendAdvanceDay(transport, campaign);
  if (refusal !== null) {
    toast({
      message: `Co-op day advance was refused by the host: ${refusal}. Nothing was saved.`,
      variant: 'error',
      duration: 7000,
    });
    return null;
  }
  await useCampaignPersistenceStore.getState().refreshAfterCommittedCommand({
    kind: 'committed',
    state: { campaignId: campaign.id },
  });
  set({ campaign });
  return advanceDayLocally(set, get, campaign);
}

/**
 * Send the AdvanceDay host intent for the day `campaign` is on and resolve
 * with the host's answer on `transport`: null when a CampaignDayAdvanced
 * event of the campaign arrives, the reason (or, without one, the code) of
 * the Error frame carrying the intent's id, or the message of a transport
 * error or of a send that threw.
 * There is no timeout: an unanswered intent leaves it pending.
 */
function sendAdvanceDay(
  transport: ICampaignSyncTransport,
  campaign: ICampaign,
): Promise<string | null> {
  const intentId = `host-advance-day-${campaign.id}-${campaign.currentDate.toISOString()}`;
  return new Promise((resolve) => {
    const stops: (() => void)[] = [];
    const answer = (refusal: string | null): void => {
      stops.forEach((stop) => stop());
      resolve(refusal);
    };
    stops.push(
      transport.onFrame((message) => {
        if (message.kind === 'Error' && message.intentId === intentId) {
          answer(message.reason ?? message.code);
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
          answer(null);
        }
      }),
      transport.onError((error) =>
        answer(error instanceof Error ? error.message : 'campaign sync error'),
      ),
    );
    try {
      transport.sendHostIntent({
        kind: 'AdvanceDay',
        campaignId: campaign.id,
        intentId,
        payload: { days: 1 },
      });
    } catch (error) {
      answer(error instanceof Error ? error.message : 'co-op push failed');
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
  return (systemId: string) => {
    const preview = get().previewTravelToSystem(systemId);
    if (!preview || preview.status !== 'ready' || !preview.afterCampaign) {
      logTravelInvalidAction(get().campaign, systemId, preview);
      return false;
    }
    set({ campaign: preview.afterCampaign });
    emitTravelActivityEntries(get, preview);
    const saveResult = get().saveCampaign();
    logTravelCommitSucceeded(preview);
    if (isPromiseLike(saveResult)) {
      return saveResult.then((result) => result.committed);
    }
    return saveResult.committed;
  };
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
    advanceDays: advanceDaysAction(get),
    previewTravelToSystem: previewTravelToSystemAction(get),
    travelToSystem: travelToSystemAction(set, get),
  };
}
