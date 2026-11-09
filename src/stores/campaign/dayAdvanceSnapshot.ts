/**
 * What a day advance (or a travel) can write, captured before it runs and put
 * back when its save is refused or its store tail throws.
 *
 * The day pipeline commits to stores as it runs - the roster's pilots through
 * `applyPilotPatches`, the pilot vault's awards through `setState` - and the
 * store tail then writes the campaign, the battle ledgers, the outcome errors,
 * the missions store and the activity log, and the local cache record, all
 * before the save. A day that is not saved must leave none of it behind: a
 * retry would otherwise patch the same pilots a second time, or, with the
 * ledgers restored but not the roster, lose a battle's outcome.
 *
 * Only a rejection is rolled back. A save the server refused for want of a
 * credential it will accept (a typed live co-op refusal, surfaced as
 * `CampaignCommitResult.recoverable`) is not: the persistence layer keeps
 * that change pending so a save after the host token is renewed persists it
 * (CAMPAIGN-LIVE-WRITE-1), and the day stands with it.
 *
 * Not restorable, and not tried: the host's committed AdvanceDay (a retry
 * sends the same intent id, so the host replays its receipt), the vault's
 * fire-and-forget award PUT (it sends the full awards array, so the retry's
 * PUT converges to the same row), and toasts already shown.
 *
 * The persistence layer rolls a refused co-op save back itself, but only the
 * campaign (switchCampaign, which also swaps in a fresh missions store) and,
 * on a conflict, the roster from the server's record. The ledgers it merges
 * with this attempt's, and the roster on a plain error, the vault and the
 * activity log it leaves alone - those are restored here.
 *
 * Each restore applies only to what this attempt itself left behind. When
 * another writer got there first - the persistence layer's roster, a roster
 * edit made while the save was out - that writer's state is kept.
 */
import type { StateCreator } from 'zustand';

import type { IActivityLogEntry } from '@/types/campaign/ActivityLog';
import type { ICampaign, IMission } from '@/types/campaign/Campaign';
import type { ICampaignRosterEntry } from '@/types/campaign/CampaignRosterEntry';
import type { ICombatOutcome } from '@/types/combat/CombatOutcome';
import type { IPilot } from '@/types/pilot';

import { usePilotStore } from '@/stores/usePilotStore';

import type { CampaignStore } from './useCampaignStore.types';

import { useCampaignPersistenceStore } from './useCampaignPersistenceStore';
import { useCampaignRosterStore } from './useCampaignRosterStore';
import { persistCampaignRecord } from './useCampaignStore.persistence';

type CampaignSet = Parameters<StateCreator<CampaignStore>>[0];
type CampaignGet = Parameters<StateCreator<CampaignStore>>[1];

export interface IDayAdvanceSnapshot {
  readonly campaign: ICampaign;
  readonly pendingBattleOutcomes: ICombatOutcome[];
  readonly processedBattleIds: string[];
  readonly reviewedBattleIds: Record<string, number>;
  readonly outcomeApplyErrors: Record<string, string>;
  readonly activityLog: IActivityLogEntry[];
  readonly rosterCampaignId: string | null;
  readonly rosterPilots: ICampaignRosterEntry[];
  readonly vaultPilots: IPilot[];
  readonly missions: ReadonlyMap<string, IMission> | undefined;
  /** What this attempt left in each place; starts as what was there. */
  appliedCampaign: ICampaign;
  appliedRosterPilots: ICampaignRosterEntry[];
  appliedVaultPilots: IPilot[];
  /** The missions the day wrote to the missions store (none for a jump). */
  appliedMissions: ReadonlyMap<string, IMission> | undefined;
}

/**
 * Capture the stores as `campaign` (the campaign the attempt starts from)
 * finds them. Taken after any co-op refresh has replaced the roster, so it
 * is the roster the attempt really started from.
 */
export function captureDayAdvanceSnapshot(
  get: CampaignGet,
  campaign: ICampaign,
): IDayAdvanceSnapshot {
  const state = get();
  const rosterPilots = useCampaignRosterStore.getState().pilots;
  const vaultPilots = usePilotStore.getState().pilots;
  return {
    campaign,
    pendingBattleOutcomes: state.pendingBattleOutcomes,
    processedBattleIds: state.processedBattleIds,
    reviewedBattleIds: state.reviewedBattleIds,
    outcomeApplyErrors: state.outcomeApplyErrors,
    activityLog: state.activityLog,
    rosterCampaignId: useCampaignRosterStore.getState().campaignId,
    rosterPilots,
    vaultPilots,
    missions: state.missionsStore?.getState().missions,
    appliedCampaign: campaign,
    appliedRosterPilots: rosterPilots,
    appliedVaultPilots: vaultPilots,
    appliedMissions: undefined,
  };
}

/**
 * Note what the day pipeline left in the roster and the vault, and the
 * missions the store tail is about to upsert into the missions store.
 */
export function recordPipelineWrites(
  snapshot: IDayAdvanceSnapshot,
  dayMissions: ReadonlyMap<string, IMission>,
): void {
  snapshot.appliedRosterPilots = useCampaignRosterStore.getState().pilots;
  snapshot.appliedVaultPilots = usePilotStore.getState().pilots;
  snapshot.appliedMissions = dayMissions;
}

/** Note the campaign this attempt put in the store. */
export function recordStoredCampaign(
  snapshot: IDayAdvanceSnapshot,
  campaign: ICampaign | null,
): void {
  if (campaign) snapshot.appliedCampaign = campaign;
}

/**
 * Put back what the attempt wrote. Returns the message of the first restore
 * that failed, or null; one failing restore does not stop the others.
 */
export function rollbackDayAdvance(
  set: CampaignSet,
  get: CampaignGet,
  snapshot: IDayAdvanceSnapshot,
): string | null {
  const live = get().campaign;
  // The player switched campaigns: the one now live is not this attempt's.
  if (live?.id !== snapshot.campaign.id) {
    return null;
  }
  let failure: string | null = null;
  const attempt = (restore: () => void): void => {
    try {
      restore();
    } catch (error) {
      failure ??= error instanceof Error ? error.message : String(error);
    }
  };
  // The persistence wiring marks the campaign dirty on every campaign change,
  // restoring included. After a co-op rejection the persistence layer has
  // just cleared it, and the restored campaign is the saved one, so it is
  // put back below rather than left showing "Unsaved changes".
  const wasDirty = useCampaignPersistenceStore.getState().dirty;
  const ledgers = {
    pendingBattleOutcomes: snapshot.pendingBattleOutcomes,
    processedBattleIds: snapshot.processedBattleIds,
    reviewedBattleIds: snapshot.reviewedBattleIds,
  };
  attempt(() =>
    set({
      ...ledgers,
      outcomeApplyErrors: snapshot.outcomeApplyErrors,
      activityLog: snapshot.activityLog,
      // Still the campaign this attempt stored: the one the day started from.
      // Otherwise the persistence layer already put its own copy back after a
      // refused co-op save (switchCampaign), and in doing so merged this
      // attempt's ledgers into that copy; keep the copy, put the ledgers back.
      campaign:
        live === snapshot.appliedCampaign
          ? snapshot.campaign
          : ({ ...live, ...ledgers } as ICampaign),
    }),
  );
  attempt(() => restoreRoster(snapshot));
  attempt(() => restoreVault(snapshot));
  attempt(() => restoreMissions(get, snapshot));
  attempt(() =>
    persistCampaignRecord(
      get().campaign ?? snapshot.campaign,
      snapshot.pendingBattleOutcomes,
      snapshot.processedBattleIds,
      snapshot.reviewedBattleIds,
    ),
  );
  useCampaignPersistenceStore.getState().restoreDirtyAfterRollback(wasDirty);
  return failure;
}

/** Only when nothing has written the roster since the attempt did. */
function restoreRoster(snapshot: IDayAdvanceSnapshot): void {
  const roster = useCampaignRosterStore.getState();
  if (
    roster.pilots === snapshot.rosterPilots ||
    roster.pilots !== snapshot.appliedRosterPilots
  ) {
    return;
  }
  roster.replacePilotsForCampaign(
    snapshot.rosterCampaignId,
    snapshot.rosterPilots,
  );
}

/**
 * The vault is restored whole when untouched since the attempt. When it was
 * replaced meanwhile (the award PUT's own response does that), only the
 * awards the attempt granted are taken back, so the rest of an entry that
 * was edited in the meantime stays.
 */
function restoreVault(snapshot: IDayAdvanceSnapshot): void {
  const current = usePilotStore.getState().pilots;
  if (current === snapshot.vaultPilots) return;
  if (current === snapshot.appliedVaultPilots) {
    usePilotStore.setState({ pilots: snapshot.vaultPilots });
    return;
  }
  const before = new Map(
    snapshot.vaultPilots.map((pilot) => [pilot.id, pilot]),
  );
  usePilotStore.setState({
    pilots: current.map((pilot) => {
      const old = before.get(pilot.id);
      return old && pilot.awards !== old.awards
        ? { ...pilot, awards: old.awards }
        : pilot;
    }),
  });
}

/**
 * The store saveCampaign rebuilds campaign.missions from. Only the missions
 * the day added or changed go back, in whichever missions store is live: the
 * persistence layer's rollback swaps in a fresh one that rehydrates the
 * day's missions from storage, so restoring the old store object would not
 * reach it, and missions the day did not touch are not ours to rewrite.
 */
function restoreMissions(
  get: CampaignGet,
  snapshot: IDayAdvanceSnapshot,
): void {
  const store = get().missionsStore;
  const { missions: before, appliedMissions: written } = snapshot;
  if (!store || !before || !written) return;
  const next = new Map(store.getState().missions);
  let changed = false;
  written.forEach((mission, id) => {
    const old = before.get(id);
    if (old === mission) return;
    if (old) next.set(id, old);
    else next.delete(id);
    changed = true;
  });
  if (changed) store.setState({ missions: next });
}
