import type { StateCreator } from 'zustand';

import type { ICampaignWithBattleState } from '@/lib/campaign/processors/postBattleProcessor';
import type { ICombatOutcome } from '@/types/combat/CombatOutcome';

import { toast } from '@/components/shared/Toast';
import { getActiveCampaignSyncTransport } from '@/lib/campaign/coop/campaignSyncTransport';
import {
  appendDailyBattleAuditEntry,
  buildDailyBattleAuditEntry,
} from '@/lib/campaign/dailyBattleAuditBuilder';
import {
  convertToLegacyDayReport,
  DayReport,
} from '@/lib/campaign/dayAdvancement';
import { getDayPipeline } from '@/lib/campaign/dayPipeline';
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

import type {
  CampaignCommitResult,
  CampaignStore,
  MaybePromise,
} from './useCampaignStore.types';

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

function advanceDayAction(
  set: CampaignSet,
  get: CampaignGet,
): CampaignStore['advanceDay'] {
  return () => {
    const { campaign, pendingBattleOutcomes, processedBattleIds } = get();
    if (!campaign) {
      return null;
    }
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
    emitDailyActivityEntries(get, report, postPipeline);
    const committedReport = { ...report, campaign: campaignWithAudit };
    const saveResult = get().saveCampaign();
    if (isPromiseLike(saveResult)) {
      return finishCoopAdvanceDay(
        saveResult,
        campaign,
        campaignWithAudit,
        committedReport,
      );
    }
    if (!saveResult.committed) {
      return null;
    }
    return committedReport;
  };
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
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.max(
    0,
    Math.floor(
      (campaign.currentDate.getTime() - startDate.getTime()) / msPerDay,
    ),
  );
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

async function finishCoopAdvanceDay(
  saveResult: Promise<CampaignCommitResult>,
  beforeCampaign: ICampaign,
  afterCampaign: ICampaign,
  report: DayReport,
): Promise<DayReport | null> {
  const committed = await saveResult;
  if (!committed.committed) {
    return null;
  }
  await emitCoopDayAdvancedEvent(beforeCampaign, afterCampaign);
  return report;
}

function emitCoopDayAdvancedEvent(
  beforeCampaign: ICampaign,
  afterCampaign: ICampaign,
): void {
  if (!beforeCampaign.coopSession) {
    return;
  }
  const matchId =
    beforeCampaign.coopSession.matchId ??
    beforeCampaign.coopSession.hostMatchId;
  if (!matchId) {
    return;
  }
  try {
    const transport = getActiveCampaignSyncTransport(matchId);
    if (!transport || transport.role !== 'host') {
      toast({
        message:
          'Co-op day advance was saved but the live host connection is unavailable. Guests may need to refetch.',
        variant: 'warning',
        duration: 7000,
      });
      return;
    }
    const dayDelta = Math.max(
      1,
      campaignDayFor(afterCampaign) - campaignDayFor(beforeCampaign),
    );
    transport.sendHostIntent({
      kind: 'AdvanceDay',
      campaignId: beforeCampaign.id,
      intentId: `host-advance-day-${beforeCampaign.id}-${afterCampaign.currentDate.toISOString()}`,
      payload: { days: dayDelta },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'co-op push failed';
    toast({
      message: `Co-op day advance was saved but live push failed: ${message}. Guests may need to refetch.`,
      variant: 'warning',
      duration: 7000,
    });
  }
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
