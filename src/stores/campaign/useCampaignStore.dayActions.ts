import { toast } from '@/components/shared/Toast';
import { DayReport } from '@/lib/campaign/dayAdvancement';
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
  advanceDayLocally,
  campaignDayFor,
  errorMessage,
  isPromiseLike,
  toastNotSaved,
  type CampaignGet,
  type CampaignSet,
} from './campaignDayCommit';
import {
  advanceCoopDayThroughHost,
  coopHostTransport,
  warnCoopDayAdvanceWithoutHost,
} from './coopDayAdvance';
import {
  captureDayAdvanceSnapshot,
  recordStoredCampaign,
  rollbackDayAdvance,
} from './dayAdvanceSnapshot';

export { COOP_ADVANCE_TIMEOUT_MS } from './coopDayAdvance';

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
