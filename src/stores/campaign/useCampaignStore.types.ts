import type { StoreApi } from 'zustand';

import type { DayReport } from '@/lib/campaign/dayAdvancement';
import type { IStarmapTravelPreview } from '@/lib/starmap/starmapTravelPreview';
import type { IActivityLogEntry } from '@/types/campaign/ActivityLog';
import type { ICampaign, ICampaignOptions } from '@/types/campaign/Campaign';
import type { ICoopSession } from '@/types/campaign/CoopSession';
import type { ICombatOutcome } from '@/types/combat/CombatOutcome';

import type { ForcesStore } from './useForcesStore';
import type { MissionsStore } from './useMissionsStore';

/**
 * Optional initialiser knobs passed to `createCampaign` for a co-op
 * session (`wire-coop-campaign-route`, task 1.3). Separate from
 * `ICampaignOptions` (which is the in-game options bag) because co-op
 * session metadata is per-campaign identity, not gameplay tuning.
 */
export interface ICreateCampaignCoopOpts {
  /** Stamped on `campaign.coopSession` at creation time. */
  readonly coopSession?: ICoopSession;
}

/**
 * Minimal host snapshot the guest receives over CO1's session-lifecycle
 * protocol when joining a co-op campaign. The guest mirror is minted
 * with the host's id / name / faction so the guest's UI shows the same
 * campaign identity. Other guest-visible state arrives over the live
 * `CampaignSnapshotPublished` baseline event after the WebSocket opens.
 */
export interface IGuestMirrorSnapshot {
  readonly campaignId: string;
  readonly campaignName: string;
  readonly factionId: string;
  /** Room code the guest typed to join; surfaced on the navigation badge. */
  readonly roomCode: string;
}

export interface CampaignState {
  campaign: ICampaign | null;
  pendingBattleOutcomes: ICombatOutcome[];
  processedBattleIds: string[];
  reviewedBattleIds: Record<string, number>;
  outcomeApplyErrors: Record<string, string>;
  forcesStore: StoreApi<ForcesStore> | null;
  missionsStore: StoreApi<MissionsStore> | null;
  /**
   * Activity log — 200-entry rolling FIFO buffer
   * (`add-campaign-command-center` Wave 6.1.B). Day-advance writes
   * append via `appendActivityLogEntry`. Surfaced by the dashboard's
   * `<ActivityLogCard>` and the full-log page at
   * `/gameplay/campaigns/[id]/log`. Bounded retention keeps the
   * persisted log from growing without bound.
   */
  activityLog: IActivityLogEntry[];
}

export interface CampaignActions {
  createCampaign: (
    name: string,
    factionId: string,
    options?: Partial<ICampaignOptions>,
    coopOpts?: ICreateCampaignCoopOpts,
  ) => string;
  /**
   * Mint a guest-mode mirror campaign from a host snapshot — fired when
   * the user joins a co-op campaign via room code (Wave 6.1, task 1.4).
   * The freshly minted campaign carries `coopSession.mode = 'guest'`
   * and the host's `hostMatchId`. Returns the local mirror campaign id.
   */
  createGuestMirrorCampaign: (
    hostMatchId: string,
    snapshot: IGuestMirrorSnapshot,
  ) => string;
  loadCampaign: (id: string) => boolean;
  switchCampaign: (campaign: ICampaign) => void;
  saveCampaign: () => void;
  advanceDay: () => DayReport | null;
  advanceDays: (count: number) => DayReport[] | null;
  getCampaign: () => ICampaign | null;
  updateCampaign: (updates: Partial<ICampaign>) => void;
  getForcesStore: () => StoreApi<ForcesStore> | null;
  getMissionsStore: () => StoreApi<MissionsStore> | null;
  enqueueOutcome: (outcome: ICombatOutcome) => void;
  dequeueOutcome: (matchId: string) => boolean;
  getPendingOutcomes: () => readonly ICombatOutcome[];
  reviewReady: (matchId: string) => boolean;
  getPendingOutcomeCount: () => number;
  getProcessedBattleIds: () => readonly string[];
  markBattleReviewed: (matchId: string) => void;
  getReviewedAt: (matchId: string) => number | null;
  getOutcomeApplyErrors: () => Readonly<Record<string, string>>;
  retryOutcomeApplication: (matchId: string) => boolean;
  /**
   * Append an activity log entry, evicting the oldest entry when the
   * cap (`ACTIVITY_LOG_MAX_ENTRIES`) would be exceeded. FIFO,
   * last-write-wins on id collisions
   * (`add-campaign-command-center` Wave 6.1.B, task 1.2).
   */
  appendActivityLogEntry: (entry: IActivityLogEntry) => void;
  /** Read the current activity log (newest last). */
  getActivityLog: () => readonly IActivityLogEntry[];
  /**
   * Preview campaign travel to a different star system.
   *
   * The preview is pure: it validates route legality, computes jump legs,
   * fees, elapsed days, deadline warnings, projected daily costs, and the
   * after-campaign state without mutating the store.
   */
  previewTravelToSystem: (systemId: string) => IStarmapTravelPreview | null;
  /**
   * Approve and commit the current travel preview.
   *
   * Validates `systemId` against the Inner Sphere seed dataset, builds a
   * starmap logistics preview, and commits only when the preview is ready.
   * A successful commit applies the projected campaign date, destination,
   * finance ledger, day progression, and travel activity entries through
   * one path. Returns `false` on blocked/no-op/invalid previews.
   */
  travelToSystem: (systemId: string) => boolean;
}

export type CampaignStore = CampaignState & CampaignActions;
