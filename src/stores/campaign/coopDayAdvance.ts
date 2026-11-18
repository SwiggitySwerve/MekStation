/**
 * The co-op host's day advance: the day is computed before the live host is
 * asked to commit it, then installed and saved on the row the host's commit
 * produced (see advanceCoopDayThroughHost).
 */

import type { DayReport } from '@/lib/campaign/dayAdvancement';

import { toast } from '@/components/shared/Toast';
import { nextCampaignDay } from '@/lib/campaign/campaignCalendar';
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
  commitDay,
  computeDay,
  errorMessage,
  installDay,
  toastNotSaved,
  type CampaignGet,
  type CampaignSet,
  type DayNotSavedReporter,
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

/** The active host-role transport of `campaign`'s co-op match, or null. */
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
 *    committed in between: the computed day is rolled back and refused.
 *
 * An AdvanceDay the host may hold without its day saved here (it timed out,
 * its answer was a transport error, its committed record could not be read,
 * the day's save failed, or the player switched away) stays unsettled
 * (unsettledAdvanceIntents), with the D campaign it was computed from held in
 * memory. A retry REPLAYS it - the same intent id, so the host replays its
 * receipt - and never sends a new D+1 intent while it is unsettled:
 * - The live campaign is still at D: the day is computed from the live
 *   (perhaps dirty) campaign, and the pre-save is skipped - the host's row
 *   has moved, so a co-op save would be refused and would install the host's
 *   D+1 in place of the live campaign.
 * - The live campaign is at D+1 (a save rollback, a refresh, or the host
 *   surface's fold installed the host's record, with no processor run): the
 *   day is computed from the HELD D campaign, never from the host's record.
 *   Without a held campaign the day is not advanced, and the player is told
 *   the host advanced it.
 *
 * A commit that went stale - the record moved further than the AdvanceDay
 * commit alone moves it, because another command committed after the day
 * was computed - is refused (C4 ruling (b)); the day is not recomputed from
 * the host's record.
 *
 * Accepted residuals (C8 T6 r7; atomicity is C4's OPEN):
 * - Reload and fold (S1/F3): the unsettled intent and the held D campaign
 *   live in memory only, so after a reload a late commit the host surface
 *   folded in cannot be finished here, and the next advance starts D+1.
 * - Stale path: the host is at D+1 with the other command; day D's
 *   processors do not run (refused, the status quo on main; pinned by
 *   R-STALE-REFUSED).
 * - A snapshot-authority campaign's row does not move on a commit, so the
 *   stale-compute check has no version signal there.
 * - C4's open question: whether the saved record and the journal can
 *   diverge on balance, consumed offers or roster readiness at commit (the
 *   AdvanceDay record rewrite re-projects them from the journal).
 * - A roster-only edit does not mark the campaign dirty, so it triggers no
 *   pre-save; the day is computed on the live roster and keeps the edit.
 */
export async function advanceCoopDayThroughHost(
  set: CampaignSet,
  get: CampaignGet,
  transport: ICampaignSyncTransport,
  campaign: ICampaign,
): Promise<DayReport | null> {
  // The signal that the host may already hold a day: this client sent its
  // intent (the id names the campaign and the day) and never saved the day.
  const unsettled = unsettledAdvanceIntents.get(campaign.id);
  const replayAtD = unsettled?.intentId === advanceDayIntentId(campaign);
  const replayAtNextDay =
    unsettled !== undefined &&
    !replayAtD &&
    campaign.currentDate.getTime() === nextCampaignDay(unsettled.day).getTime();
  if (replayAtNextDay && !unsettled.held) {
    toast({
      message:
        "The host advanced the day, but it was not finished here. Reload the campaign to see the host's state.",
      variant: 'error',
      duration: 7000,
    });
    return null;
  }
  const lateCommitPossible = replayAtD || replayAtNextDay;
  const hostMayHoldDay: DayNotSavedReporter = (reason, restoreFailure) =>
    toastHostMayHoldDay(reason, restoreFailure);
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
  const live = get().campaign;
  if (!live || live.id !== campaign.id) {
    return null;
  }
  // Day D, from the held D campaign when the live one already shows the
  // host's D+1. The intent sent is D's either way.
  const base = replayAtNextDay ? (unsettled.held as ICampaign) : live;
  const intentId = advanceDayIntentId(base);
  // The version the day is checked against is the one its FIRST attempt was
  // computed on: a replay must find the record exactly where the host's
  // AdvanceDay commit took it from there, however much of it this client
  // has adopted since.
  const savedVersion = lateCommitPossible
    ? unsettled.savedVersion
    : useCampaignPersistenceStore.getState().baseVersion;
  const snapshot = captureDayAdvanceSnapshot(get, base);
  let day: IComputedDay;
  try {
    day = computeDay(get, base, snapshot);
  } catch (error) {
    const restoreFailure = rollbackDayAdvance(set, get, snapshot);
    if (lateCommitPossible) hostMayHoldDay(errorMessage(error), restoreFailure);
    else toastNotSaved('day advance', errorMessage(error), restoreFailure);
    return null;
  }
  const discard = (): void =>
    toastIfRestoreFailed(rollbackDayAdvance(set, get, snapshot));
  const answer = await sendAdvanceDay(transport, base);
  if (answer.kind !== 'refused') {
    // Committed, or perhaps committed late: unsettled until the day is
    // saved. A replay keeps the first attempt's record.
    unsettledAdvanceIntents.set(
      campaign.id,
      lateCommitPossible
        ? unsettled
        : { intentId, day: base.currentDate, savedVersion, held: base },
    );
  } else if (lateCommitPossible) {
    unsettledAdvanceIntents.delete(campaign.id);
  }
  if (answer.kind === 'timeout') {
    discard();
    toast({
      message:
        "The host didn't answer the day advance in time; it may still advance the day. Nothing was saved here. Retrying is safe: it finishes the same day.",
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
  // The version check, against the version the day's FIRST attempt was
  // computed on (savedVersion). A journal-native campaign's AdvanceDay commit
  // rewrites its record at exactly savedVersion + 1 (campaignRecordJournalState
  // rewriteCampaignRecordAfterCommand runs once per committed command or
  // combat outcome), and a replay of the same intent does not move it again;
  // a snapshot-authority campaign's commit does not touch the row, so it
  // stays at savedVersion - the blind spot. Anything else - another command
  // committed after the day was computed, including a guest command one
  // version past a commit this client already adopted - is stale.
  if (!isOnlyAdvanceDayCommitted(savedVersion)) {
    // Stale: another command committed after the day was computed. The day
    // is not recomputed from the host's record (C4 ruling (b)): it is
    // refused. The computed day is rolled back, nothing is installed or
    // saved, and the intent stays unsettled, so a retry replays it and is
    // refused again rather than starting D+1. The live campaign is the
    // host's record the refresh installed.
    discard();
    // The refresh installed the server's battle queue; an outcome queued
    // before it stays queued.
    const state = get();
    const ledgers = mergeBattleOutcomeState(state.campaign, {
      pendingBattleOutcomes: [
        ...state.pendingBattleOutcomes,
        ...queuedBeforeRefresh,
      ],
      processedBattleIds: state.processedBattleIds,
      reviewedBattleIds: state.reviewedBattleIds,
    });
    set({
      ...ledgers,
      campaign: { ...(state.campaign as ICampaign), ...ledgers },
    });
    toast({
      message: `Another player changed the campaign while the day advanced, so the day wasn't applied here.${
        unsavedEditsCarried ? ' Unsaved changes could not be kept.' : ''
      } Reload the campaign to see the host's state.`,
      variant: 'error',
      duration: 7000,
    });
    return null;
  }
  // What a failed save puts back. Its campaign is `base`, the D campaign the
  // day was computed from (the persistence layer's own rollback usually
  // installs the host's record first, and a live copy that is not the one
  // this attempt stored is kept). Its battle ledgers and roster are read
  // after the refresh; the roster is the pre-compute one instead when the
  // refresh left the computed roster in place (a snapshot-authority row the
  // cache already names), since that roster carries the day's patches. A
  // roster the refresh replaced is the record's, the day's real start (M5).
  // The vault's is the one from before the compute.
  const refreshed = captureDayAdvanceSnapshot(get, base);
  const installSnapshot: IDayAdvanceSnapshot = {
    ...refreshed,
    vaultPilots: snapshot.vaultPilots,
    rosterPilots:
      refreshed.rosterPilots === snapshot.appliedRosterPilots
        ? snapshot.rosterPilots
        : refreshed.rosterPilots,
  };
  const report = await commitDay(
    set,
    get,
    installSnapshot,
    () => {
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
    },
    hostMayHoldDay,
  );
  return settleAdvanceIntent(campaign.id, intentId, report);
}

/** An AdvanceDay the host may hold without its day saved here. */
interface IUnsettledAdvance {
  /** The intent id, which names the campaign and day D. */
  readonly intentId: string;
  /** Day D. */
  readonly day: Date;
  /** The record version day D's first attempt was computed on. */
  readonly savedVersion: number;
  /** The D campaign that attempt was computed from; null once forgotten. */
  readonly held: ICampaign | null;
}

/**
 * AdvanceDay intents the host may have committed without this client having
 * saved their day: one that timed out (it can still commit late), one whose
 * answer could not be confirmed, or one that committed while the day could
 * not be saved here. Keyed by campaign id; in memory only.
 */
const unsettledAdvanceIntents = new Map<string, IUnsettledAdvance>();

/** Test seam: the held D campaigns are lost (a reload keeps nothing). */
export function _forgetHeldDayCampaignsForTest(): void {
  unsettledAdvanceIntents.forEach((entry, campaignId) =>
    unsettledAdvanceIntents.set(campaignId, { ...entry, held: null }),
  );
}

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
  if (
    report &&
    unsettledAdvanceIntents.get(campaignId)?.intentId === intentId
  ) {
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
 * guest proposal), so a day computed before it is stale and is refused.
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

/** The host's answer could not be confirmed; nothing was saved here. */
function toastUnconfirmed(reason: string): void {
  toast({
    message: `The day advance could not be confirmed with the host (${reason}); the host may have advanced the day. Nothing was saved here. Retrying is safe: it finishes the same day.`,
    variant: 'error',
    duration: 7000,
  });
}

/**
 * A day the host may already hold was not saved here (its save failed, or
 * its replay's compute threw): the campaign may show the host's next day,
 * so "restored" would not be true.
 */
function toastHostMayHoldDay(
  reason: string,
  restoreFailure: string | null,
): void {
  toast({
    message: restoreFailure
      ? `The day advance was not saved here (${reason}), and restoring the campaign failed (${restoreFailure}). The host may have advanced the day. Reload the campaign before you go on.`
      : `The day advance was not saved here (${reason}). The host may have advanced the day; retry to finish it.`,
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
