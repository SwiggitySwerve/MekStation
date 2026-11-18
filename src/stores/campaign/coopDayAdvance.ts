/**
 * The co-op host's day advance: the day is computed before the live host is
 * asked to commit it, then installed and saved on the row the host's commit
 * produced (see advanceCoopDayThroughHost).
 */

import type { DayReport } from '@/lib/campaign/dayAdvancement';

import { toast } from '@/components/shared/Toast';
import {
  campaignEventFromMessage,
  getActiveCampaignSyncTransport,
  type ICampaignSyncTransport,
} from '@/lib/campaign/coop/campaignSyncTransport';
import { ICampaign } from '@/types/campaign/Campaign';

import type { IDayAdvanceSnapshot } from './dayAdvanceSnapshot';
import type { CampaignCommitResult } from './useCampaignStore.types';

import { mergeBattleOutcomeState } from './campaignBattleOutcomeState';
import {
  advanceDayLocally,
  commitDay,
  computeDay,
  errorMessage,
  installDay,
  toastNotSaved,
  type CampaignGet,
  type CampaignSet,
  type IComputedDay,
} from './campaignDayCommit';
import {
  captureDayAdvanceSnapshot,
  recordPipelineWrites,
  rollbackDayAdvance,
} from './dayAdvanceSnapshot';
import { useCampaignPersistenceStore } from './useCampaignPersistenceStore';
import { useCampaignRosterStore } from './useCampaignRosterStore';

/**
 * How long the co-op host has to answer an AdvanceDay intent. The host's own
 * commit is a local journal append; half a minute is past any healthy answer.
 * Expiry is safe to retry: the intent id derives from the campaign's current
 * date, so a retry is the same command and the host replays its receipt
 * rather than committing a second day.
 */
export const COOP_ADVANCE_TIMEOUT_MS = 30_000;

export function coopHostTransport(
  campaign: ICampaign,
): ICampaignSyncTransport | null {
  const session = campaign.coopSession;
  const transport = getActiveCampaignSyncTransport(
    session?.matchId ?? session?.hostMatchId,
  );
  return transport?.role === 'host' ? transport : null;
}

/**
 * The co-op host's day advance (roadmap unit U96). The day is computed BEFORE
 * the host is asked to commit it, so a day processor that throws never
 * leaves the host at D+1 with no processor run (T6):
 *
 * 1. A dirty campaign is saved first (the 6.2a contract: the command is sent
 *    from an acknowledged save). A save that fails refuses the day; nothing
 *    is computed or sent.
 * 2. The day is computed (computeDay). A throw is rolled back and reported,
 *    and AdvanceDay is never sent.
 * 3. AdvanceDay goes to the live host. A refusal, a timeout or a campaign
 *    switch rolls the computed day back (the processors' roster and vault
 *    writes included) and installs nothing.
 * 4. On commit the record is re-read (refreshAfterCommittedCommand), and
 *    the computed day is installed over it and saved at the version the
 *    host's commit produced, carrying the day the host already holds, so the
 *    host's adoption of the save does not re-advance it. When the record
 *    moved further than the AdvanceDay commit alone moves it, something else
 *    committed in between: the computed day is rolled back and the day is
 *    recomputed on the refreshed campaign, then saved.
 *
 * A retry after a late commit (an AdvanceDay that timed out or was committed
 * while the player had switched campaigns, unsettledAdvanceIntents) skips the
 * pre-save: the row has moved, so a co-op save would be refused and would
 * install the host's record - D+1 with no processor run - in place of the
 * live campaign. The day is computed from the live (dirty) campaign instead,
 * the same intent id is sent (the host replays its receipt), and the computed
 * day, carrying the unsaved edits, is installed and saved on the host's row.
 *
 * Accepted residuals (C8 T6 r4):
 * - A roster-only edit does not mark the campaign dirty, so it triggers no
 *   pre-save; the day is computed on the live roster and keeps the edit.
 * - A snapshot-authority campaign's row does not move on a commit, so the
 *   stale-compute check has no version signal there.
 * - A throw in the recompute after a stale-version commit leaves the host at
 *   D+1 with no processor result saved (pinned by R-RECOMPUTE-THROW).
 * - A campaign switch after the host committed leaves the host at D+1 as
 *   before; the day completes on a retry from the campaign's D state.
 * - (F3, C4 OPEN, pre-existing) In the app the host route surface folds a
 *   late CampaignDayAdvanced into the live campaign before the retry, so the
 *   retry names D+1, unsettledAdvanceIntents never matches, and day D's
 *   processors never run.
 */
export async function advanceCoopDayThroughHost(
  set: CampaignSet,
  get: CampaignGet,
  transport: ICampaignSyncTransport,
  campaign: ICampaign,
): Promise<DayReport | null> {
  const intentId = advanceDayIntentId(campaign);
  // The signal that the host may already hold this day: this client sent
  // this very intent (the id names the campaign and the day) and never
  // installed its commit. The row the host committed is then at D+1, and only
  // a replay of the same intent finishes the day.
  const lateCommitPossible =
    unsettledAdvanceIntents.get(campaign.id) === intentId;
  // Awaited only when there is something to save, so a clean campaign's
  // intent goes out in the same tick as the call.
  if (
    useCampaignPersistenceStore.getState().dirty &&
    !lateCommitPossible &&
    !(await saveBeforeComputingDay(get))
  ) {
    return null;
  }
  const unsavedEditsCarried =
    lateCommitPossible && useCampaignPersistenceStore.getState().dirty;
  // The awaits here and below are windows in which the player can switch
  // campaigns; the day belongs to the campaign it was started on.
  const base = get().campaign;
  if (!base || base.id !== campaign.id) {
    return null;
  }
  const savedVersion = useCampaignPersistenceStore.getState().baseVersion;
  const snapshot = captureDayAdvanceSnapshot(get, base);
  let day: IComputedDay;
  try {
    day = computeDay(get, base, snapshot);
  } catch (error) {
    toastNotSaved(
      'day advance',
      errorMessage(error),
      rollbackDayAdvance(set, get, snapshot),
    );
    return null;
  }
  const discard = (): void =>
    toastIfRestoreFailed(rollbackDayAdvance(set, get, snapshot));
  const answer = await sendAdvanceDay(transport, base);
  if (answer.kind !== 'refused') {
    // Committed, or perhaps committed late: unsettled until the day is saved.
    unsettledAdvanceIntents.set(campaign.id, intentId);
  } else if (lateCommitPossible) {
    unsettledAdvanceIntents.delete(campaign.id);
  }
  if (answer.kind === 'timeout') {
    discard();
    toast({
      message:
        "The host didn't answer the day advance in time. Nothing was saved. Retrying is safe.",
      variant: 'error',
      duration: 7000,
    });
    return null;
  }
  if (answer.kind === 'unconfirmed') {
    // A transport error: the host may have committed, so the intent stays
    // unsettled for the retry, as after a timeout.
    discard();
    toastUnconfirmed(answer.reason);
    return null;
  }
  if (answer.kind === 'refused') {
    discard();
    toast({
      message: `Co-op day advance was refused by the host: ${answer.reason}. Nothing was saved.`,
      variant: 'error',
      duration: 7000,
    });
    return null;
  }
  if (get().campaign?.id !== campaign.id) {
    discard();
    return null;
  }
  // The refresh installs the server's battle queue; an outcome queued while
  // the host answered is carried over to the next day from here.
  const queuedBeforeRefresh = get().pendingBattleOutcomes;
  const adopted = await useCampaignPersistenceStore
    .getState()
    .refreshAfterCommittedCommand({
      kind: 'committed',
      state: { campaignId: campaign.id },
    });
  if (get().campaign?.id !== campaign.id) {
    discard();
    return null;
  }
  if (!adopted) {
    // The record the host's commit produced was not read, so its version is
    // unknown: a save now would go out at the old version and be refused,
    // and the refusal would install the host's D+1 with no processor run.
    // Nothing is saved; the intent stays unsettled and a retry replays it.
    discard();
    toastUnconfirmed('the committed record could not be read');
    return null;
  }
  // The version check: a journal-native campaign's AdvanceDay commit rewrites
  // its record at exactly savedVersion + 1 (campaignRecordJournalState
  // rewriteCampaignRecordAfterCommand runs once per committed command or
  // combat outcome); a snapshot-authority campaign's commit does not touch
  // the row, so it stays at savedVersion. Any other version means another
  // command committed after the day was computed.
  if (!isOnlyAdvanceDayCommitted(savedVersion)) {
    discard();
    if (unsavedEditsCarried) {
      // The refresh replaced the live campaign with the host's record, and
      // the recompute starts from that record: say so rather than lose the
      // unsaved edits quietly.
      toast({
        message:
          'Unsaved changes made before this day advance could not be kept: the campaign changed on the host meanwhile.',
        variant: 'warning',
        duration: 7000,
      });
    }
    // The recomputed day runs after every outcome queued so far, the ones
    // the refresh replaced included, so it applies them.
    const state = get();
    const ledgers = mergeBattleOutcomeState(state.campaign, {
      pendingBattleOutcomes: [
        ...state.pendingBattleOutcomes,
        ...queuedBeforeRefresh,
      ],
      processedBattleIds: state.processedBattleIds,
      reviewedBattleIds: state.reviewedBattleIds,
    });
    const recomputeFrom = {
      ...(state.campaign as ICampaign),
      ...ledgers,
      currentDate: base.currentDate,
    };
    set({ ...ledgers, campaign: recomputeFrom });
    return settleAdvanceIntent(
      campaign.id,
      intentId,
      await advanceDayLocally(set, get, recomputeFrom),
    );
  }
  // Taken after the refresh, as the day's starting point if its save fails.
  // The vault's starting point is the one from before the compute, and so is
  // the roster's when the refresh left the computed roster in place (a
  // snapshot-authority row the cache already names): that roster carries
  // the day's patches, and restoring it would let a retry patch again. A
  // roster the refresh replaced is the record's, the day's real start (M5).
  const refreshed = captureDayAdvanceSnapshot(get, base);
  const installSnapshot: IDayAdvanceSnapshot = {
    ...refreshed,
    vaultPilots: snapshot.vaultPilots,
    rosterPilots:
      refreshed.rosterPilots === snapshot.appliedRosterPilots
        ? snapshot.rosterPilots
        : refreshed.rosterPilots,
  };
  const report = await commitDay(set, get, installSnapshot, () => {
    // The refresh adopted the record the day was computed from (the save
    // above made it the live state), so the computed roster replaces it.
    useCampaignRosterStore
      .getState()
      .replacePilotsForCampaign(
        snapshot.rosterCampaignId,
        snapshot.appliedRosterPilots,
      );
    recordPipelineWrites(installSnapshot, day.report.campaign.missions);
    return installDay(set, get, day, installSnapshot, queuedBeforeRefresh);
  });
  return settleAdvanceIntent(campaign.id, intentId, report);
}

/**
 * AdvanceDay intents the host may have committed without this client having
 * saved their day: one that timed out (it can still commit late) or that
 * committed while the day could not be installed. Keyed by campaign id; the
 * value is the intent id, which names the campaign and the day.
 */
const unsettledAdvanceIntents = new Map<string, string>();

/** The AdvanceDay intent id for the day `campaign` is on. */
function advanceDayIntentId(campaign: ICampaign): string {
  return `host-advance-day-${campaign.id}-${campaign.currentDate.toISOString()}`;
}

/** A saved day settles its intent; anything else leaves it unsettled. */
function settleAdvanceIntent(
  campaignId: string,
  intentId: string,
  report: DayReport | null,
): DayReport | null {
  if (report && unsettledAdvanceIntents.get(campaignId) === intentId) {
    unsettledAdvanceIntents.delete(campaignId);
  }
  return report;
}

/**
 * Whether the record the refresh read is the one the AdvanceDay commit alone
 * produced from `savedVersion`: a journal-native campaign's commit rewrites
 * the record at the next version (campaignRecordJournalState
 * rewriteCampaignRecordAfterCommand), a snapshot-authority campaign's leaves
 * it where it was. Any other version means another command committed (a
 * guest proposal), so a day computed before it is stale.
 */
function isOnlyAdvanceDayCommitted(savedVersion: number): boolean {
  const version = useCampaignPersistenceStore.getState().baseVersion;
  return version === savedVersion || version === savedVersion + 1;
}

/**
 * Save a dirty campaign before its day is computed and sent to the host, so
 * the host commits on the record the day is computed from. Toasts and
 * resolves false when the save did not commit.
 */
async function saveBeforeComputingDay(get: CampaignGet): Promise<boolean> {
  let result: CampaignCommitResult;
  try {
    result = await get().saveCampaign();
  } catch (error) {
    result = { committed: false, reason: errorMessage(error) };
  }
  if (result.committed) {
    return true;
  }
  toast({
    message: `The day was not advanced: the campaign could not be saved before asking the host (${result.reason ?? 'the save was refused'}). Nothing was sent to the host; try again.`,
    variant: 'error',
    duration: 7000,
  });
  return false;
}

/** The host's answer could not be confirmed; nothing was saved. */
function toastUnconfirmed(reason: string): void {
  toast({
    message: `The day advance could not be confirmed with the host (${reason}). Nothing was saved. Retrying is safe.`,
    variant: 'error',
    duration: 7000,
  });
}

/** Tell the player when putting a discarded day back failed. */
function toastIfRestoreFailed(restoreFailure: string | null): void {
  if (!restoreFailure) return;
  toast({
    message: `Restoring the campaign after the day advance failed (${restoreFailure}). Reload the campaign before you go on.`,
    variant: 'error',
    duration: 7000,
  });
}

/** The host's answer to an AdvanceDay intent, or its absence. */
type AdvanceDayAnswer =
  | { readonly kind: 'committed' }
  | { readonly kind: 'refused'; readonly reason: string }
  | { readonly kind: 'unconfirmed'; readonly reason: string }
  | { readonly kind: 'timeout' };

/**
 * Send the AdvanceDay host intent for the day `campaign` is on and resolve
 * with the host's answer on `transport`: committed when a CampaignDayAdvanced
 * event of the campaign arrives, refused with the reason (or, without one,
 * the code) of the Error frame carrying the intent's id, unconfirmed with the
 * message of a transport error or of a send that threw (the host may still
 * have committed), or timeout when nothing answered within
 * COOP_ADVANCE_TIMEOUT_MS. The listeners and the timer are
 * dropped on the first answer, so a frame that arrives later is ignored.
 */
function sendAdvanceDay(
  transport: ICampaignSyncTransport,
  campaign: ICampaign,
): Promise<AdvanceDayAnswer> {
  const intentId = advanceDayIntentId(campaign);
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
    const unconfirmed = (reason: string): void =>
      answer({ kind: 'unconfirmed', reason });
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
        unconfirmed(
          error instanceof Error ? error.message : 'campaign sync error',
        ),
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
      unconfirmed(error instanceof Error ? error.message : 'co-op push failed');
    }
  });
}

/**
 * Toast that a saved co-op day advance did not reach a live host, when
 * `campaign` names a co-op match (the caller found no host transport).
 */
export function warnCoopDayAdvanceWithoutHost(campaign: ICampaign): void {
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
