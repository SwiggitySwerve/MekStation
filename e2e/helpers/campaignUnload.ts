/** Shared production-store mutation, warm-worker and discard probes. */
import { expect, type Page } from '@playwright/test';

import { UNLOAD_TIMING_KEY } from './unloadFlushEvidence';

interface CampaignSnapshot {
  campaign: { currentDate: string | Date } | null;
  pendingBattleOutcomes: readonly { matchId: string }[];
  enqueueOutcome: (outcome: Record<string, unknown>) => void;
}

type SweepWindow = {
  __ZUSTAND_STORES__?: {
    campaign: {
      getState: () => CampaignSnapshot;
      subscribe: (listener: (state: CampaignSnapshot) => void) => () => void;
    };
    campaignPersistence: {
      getState: () => { dirty: boolean; saveState: string };
    };
  };
};

export interface ReloadTiming {
  offsetMs: number;
  expectedDate: string | null;
  expectedMatchId: string | null;
  editEpochMs: number;
  reloadCallMs: number;
  pagehideMs: number;
}

export async function waitForCleanCampaign(page: Page): Promise<void> {
  await page.waitForFunction(() => {
    const state = (
      window as SweepWindow
    ).__ZUSTAND_STORES__?.campaignPersistence.getState();
    return state && !state.dirty && state.saveState === 'saved';
  });
  await expect(page.getByTestId('advance-day-btn')).toBeEnabled();
}

/**
 * Inspect the actual controller each trial, rather than infer it from a ready
 * registration. A controlled, unique no-store GET completes a worker fetch
 * dispatch before the edit; activated alone does not prove a worker is running.
 * Other requests keep the normal HTTP cache (no context.route/CDP overrides).
 */
interface ControllerSnapshot {
  controlled: boolean;
  scriptURL: string | null;
  state: ServiceWorkerState | null;
}

export interface ControllerProbe {
  beforeFetch: ControllerSnapshot;
  afterFetch: ControllerSnapshot;
  warmFetchStatus: number;
  registrationScope: string | null;
  activeScriptURL: string | null;
  activeState: ServiceWorkerState | null;
  installing: ServiceWorkerState | null;
  waiting: ServiceWorkerState | null;
  visibilityState: DocumentVisibilityState;
}

export async function probeController(
  page: Page,
  warmFetchPath: string,
): Promise<ControllerProbe> {
  await page.waitForFunction(() => Boolean(navigator.serviceWorker.controller));
  return page.evaluate(async (path) => {
    const snapshot = () => ({
      controlled: navigator.serviceWorker.controller !== null,
      scriptURL: navigator.serviceWorker.controller?.scriptURL ?? null,
      state: navigator.serviceWorker.controller?.state ?? null,
    });
    const beforeFetch = snapshot();
    const response = await fetch(path, { cache: 'no-store' });
    await response.text();
    const registration = await navigator.serviceWorker.getRegistration();
    return {
      beforeFetch,
      afterFetch: snapshot(),
      warmFetchStatus: response.status,
      registrationScope: registration?.scope ?? null,
      activeScriptURL: registration?.active?.scriptURL ?? null,
      activeState: registration?.active?.state ?? null,
      installing: registration?.installing?.state ?? null,
      waiting: registration?.waiting?.state ?? null,
      visibilityState: document.visibilityState,
    };
  }, warmFetchPath);
}

/** One timer implementation for both arms; t0 is the mutation/arming task. */
export async function reloadAtOffset(
  page: Page,
  offsetMs: number,
  controlTrial: string | null = null,
  outcomeMatchId: string | null = null,
): Promise<ReloadTiming> {
  const navigation = page.waitForNavigation({ waitUntil: 'domcontentloaded' });
  const trigger = (async () => {
    await page.evaluate(
      ({ offsetMs, controlTrial, outcomeMatchId, timingKey }) => {
        const start = (expectedDate: string | null) => {
          const t0 = performance.now();
          const timing: ReloadTiming = {
            offsetMs,
            expectedDate,
            expectedMatchId: outcomeMatchId,
            editEpochMs: performance.timeOrigin + t0,
            reloadCallMs: 0,
            pagehideMs: 0,
          };
          const record = () =>
            sessionStorage.setItem(timingKey, JSON.stringify(timing));
          record();
          if (controlTrial) sessionStorage.setItem('armed-trial', controlTrial);
          window.addEventListener(
            'pagehide',
            () => {
              timing.pagehideMs = performance.now() - t0;
              record();
            },
            { once: true },
          );
          // Same 10 ms navigation lead as the original audit sweep. Busy wait
          // only the final slice; record actual call AND pagehide offsets.
          const target = t0 + offsetMs - 10;
          setTimeout(
            () => {
              while (performance.now() < target) {
                /* wait for the target offset */
              }
              timing.reloadCallMs = performance.now() - t0;
              record();
              window.location.reload();
            },
            Math.max(0, offsetMs - 40),
          );
        };
        if (controlTrial) {
          start(null);
          return;
        }
        const campaign = (window as SweepWindow).__ZUSTAND_STORES__?.campaign;
        if (!campaign) throw new Error('Campaign store is not exposed');
        const selected = campaign.getState().campaign;
        if (!selected) throw new Error('No campaign selected');
        const before = new Date(selected.currentDate).toISOString();
        const unsubscribe = campaign.subscribe((state) => {
          if (!state.campaign) return;
          const expectedDate = new Date(
            state.campaign.currentDate,
          ).toISOString();
          if (outcomeMatchId) {
            if (
              !state.pendingBattleOutcomes.some(
                (outcome) => outcome.matchId === outcomeMatchId,
              )
            )
              return;
          } else if (expectedDate === before) return;
          unsubscribe();
          start(expectedDate);
        });
        if (outcomeMatchId) {
          // Same public action called by the combat-outcome bus subscriber.
          // No setState, hand-written campaign edit, or direct dirty marking.
          campaign.getState().enqueueOutcome({
            version: 1,
            matchId: outcomeMatchId,
            contractId: null,
            scenarioId: `unload-scenario-${outcomeMatchId}`,
            endReason: 'objective',
            capturedAt: new Date().toISOString(),
            report: {
              version: 1,
              matchId: outcomeMatchId,
              winner: 'player',
              reason: 'objective',
              turnCount: 1,
              units: [],
              mvpUnitId: null,
              log: [],
            },
            unitDeltas: [],
          });
          const state = campaign.getState();
          if (
            !state.pendingBattleOutcomes.some(
              (outcome) => outcome.matchId === outcomeMatchId,
            ) ||
            !(
              window as SweepWindow
            ).__ZUSTAND_STORES__?.campaignPersistence.getState().dirty
          ) {
            throw new Error(
              'Production outcome enqueue did not mark campaign dirty',
            );
          }
        }
      },
      { offsetMs, controlTrial, outcomeMatchId, timingKey: UNLOAD_TIMING_KEY },
    );
    if (!controlTrial && !outcomeMatchId) {
      await page.getByTestId('advance-day-btn').click({ noWaitAfter: true });
    }
  })();
  await Promise.all([navigation, trigger]);
  const timing = await page.evaluate(
    (key) =>
      JSON.parse(sessionStorage.getItem(key) ?? 'null') as ReloadTiming | null,
    UNLOAD_TIMING_KEY,
  );
  if (!timing || !timing.pagehideMs)
    throw new Error('Missing reload/pagehide timing');
  return timing;
}
