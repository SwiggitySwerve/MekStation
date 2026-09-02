import type { ICampaignAuthoritativeState } from '@/types/campaign/CampaignSync';
import type {
  CoopParticipationChoice,
  GmArbitrationMode,
} from '@/types/campaign/CoopCampaign';
import type { IForce } from '@/types/campaign/Force';

import { registerActiveCoopHost } from '@/lib/campaign/coop/coopHostRegistry';
import {
  readCampaignSessionState,
  writeCampaignSessionActiveBranch,
  writeCampaignSessionReadinessRevision,
} from '@/services/campaignPersistence/CampaignSessionStateStore';
import { getSQLiteService } from '@/services/persistence/SQLiteService';
import { parseCampaignCoopSnapshot } from '@/types/campaign/campaignCoopSnapshot';

function sqliteReady(): boolean {
  return getSQLiteService().isInitialized();
}

import type { CampaignEventStoreDurability } from './getCampaignEventStore';
import type { IMatchStore } from './IMatchStore';

import { CampaignGmArbiter } from './CampaignGmArbiter';
import { CampaignMatchHost } from './CampaignMatchHost';
import { participationIsFresh } from './campaignParticipationFreshness';
import { CampaignSyncSession } from './CampaignSyncSession';
import { selectCampaignEventStore } from './getCampaignEventStore';
import { getDefaultMatchStore } from './getDefaultMatchStore';

const MAX_RECONCILED_BATTLE_IDS = 2048;

export interface ICampaignHostRegistrationSnapshot {
  readonly campaignId: string;
  readonly hostPlayerId: string;
  /** The invite, or `null` to register with it already expired. */
  readonly roomCode: string | null;
  readonly state: ICampaignAuthoritativeState;
  readonly revision?: number;
  readonly arbitrationMode?: GmArbitrationMode;
}

export interface ICampaignParticipationRecord {
  readonly matchId: string;
  readonly missionId: string;
  readonly playerId: string;
  readonly role: 'host' | 'guest';
  readonly choice: CoopParticipationChoice;
  readonly force: IForce;
}

export type CampaignParticipationListener = (
  records: readonly ICampaignParticipationRecord[],
) => void;

interface IParticipationBucket {
  readonly records: Map<string, ICampaignParticipationRecord>;
  readonly listeners: Set<CampaignParticipationListener>;
}

export interface ICampaignHostRegistryEntry {
  readonly matchId: string;
  readonly campaignId: string;
  /** The invite this entry opened with, or `null` once expired. */
  readonly roomCode: string | null;
  readonly revision: number;
  /** Null means the genesis/default branch. */
  readonly activeBranch: string | null;
  readonly hostPlayerId: string;
  readonly host: CampaignMatchHost;
  readonly syncSession: CampaignSyncSession;
  readonly arbiter: CampaignGmArbiter;
  /**
   * Which log this campaign's events are actually going to. Exposed so a
   * diagnostic or recovery path cannot mistake a dev process's ephemeral
   * adapter for authority it can rebuild from.
   */
  readonly eventStoreDurability: CampaignEventStoreDurability;
  readonly publishParticipation: (record: ICampaignParticipationRecord) => void;
  readonly subscribeParticipation: (
    missionId: string,
    listener: CampaignParticipationListener,
  ) => () => void;
  readonly getParticipationRecords: (
    missionId: string,
  ) => readonly ICampaignParticipationRecord[];
  readonly advanceRevision: (next: number) => void;
  readonly setActiveBranch: (next: string | null) => void;
  readonly hasReconciledBattle: (matchId: string) => boolean;
  readonly recordReconciledBattle: (matchId: string) => void;
  readonly close: () => void;
}

class CampaignHostRegistryEntry implements ICampaignHostRegistryEntry {
  readonly matchId: string;
  readonly campaignId: string;
  readonly roomCode: string | null;
  readonly hostPlayerId: string;
  readonly host: CampaignMatchHost;
  readonly syncSession: CampaignSyncSession;
  readonly arbiter: CampaignGmArbiter;
  readonly eventStoreDurability: CampaignEventStoreDurability;

  private currentRevision: number;
  private currentActiveBranch: string | null;
  private readonly participationByMission = new Map<
    string,
    IParticipationBucket
  >();
  private readonly reconciledBattleIds = new Set<string>();

  constructor(input: {
    readonly matchId: string;
    readonly roomCode: string | null;
    readonly revision: number;
    readonly activeBranch: string | null;
    readonly host: CampaignMatchHost;
    readonly syncSession: CampaignSyncSession;
    readonly arbiter: CampaignGmArbiter;
    readonly eventStoreDurability: CampaignEventStoreDurability;
    readonly unregisterActiveHost: () => void;
  }) {
    this.matchId = input.matchId;
    this.roomCode = input.roomCode;
    this.currentRevision = input.revision;
    this.currentActiveBranch = input.activeBranch;
    this.host = input.host;
    this.syncSession = input.syncSession;
    this.arbiter = input.arbiter;
    this.eventStoreDurability = input.eventStoreDurability;
    this.unregisterActiveHost = input.unregisterActiveHost;
    this.campaignId = input.host.campaignId;
    this.hostPlayerId = input.host.getHostPlayerId();
  }

  get revision(): number {
    return this.currentRevision;
  }

  get activeBranch(): string | null {
    return this.currentActiveBranch;
  }

  private readonly unregisterActiveHost: () => void;

  publishParticipation = (record: ICampaignParticipationRecord): void => {
    const bucket = this.getParticipationBucket(record.missionId);
    bucket.records.set(record.playerId, record);
    this.notifyParticipation(bucket);
  };

  subscribeParticipation = (
    missionId: string,
    listener: CampaignParticipationListener,
  ): (() => void) => {
    const bucket = this.getParticipationBucket(missionId);
    bucket.listeners.add(listener);
    listener(Array.from(bucket.records.values()));
    return () => {
      bucket.listeners.delete(listener);
    };
  };

  getParticipationRecords = (
    missionId: string,
  ): readonly ICampaignParticipationRecord[] => {
    const bucket = this.participationByMission.get(missionId);
    if (!bucket) return [];
    // Filtered against CURRENT roster state, not against what was true
    // when the choice was made. A player who picked a lance and then
    // lost a mech to it is no longer ready, and saying so here rather
    // than storing a flag means no invalidation path can forget to.
    const rosterUnits = this.host.getState().rosterUnits ?? {};
    return Array.from(bucket.records.values()).filter((record) =>
      participationIsFresh(record, rosterUnits),
    );
  };

  advanceRevision = (next: number): void => {
    if (!Number.isInteger(next) || next <= this.currentRevision) {
      throw new Error('Campaign snapshot revision is stale');
    }
    if (sqliteReady()) {
      writeCampaignSessionReadinessRevision({
        campaignId: this.campaignId,
        sessionId: this.matchId,
        readinessRevision: next,
      });
    }
    this.currentRevision = next;
  };

  setActiveBranch = (next: string | null): void => {
    if (next !== null && next.trim() === '') {
      throw new Error('Campaign active branch is empty');
    }
    if (sqliteReady()) {
      writeCampaignSessionActiveBranch({
        campaignId: this.campaignId,
        sessionId: this.matchId,
        activeBranch: next,
      });
    }
    this.currentActiveBranch = next;
  };

  hasReconciledBattle = (matchId: string): boolean =>
    this.reconciledBattleIds.has(matchId);

  recordReconciledBattle = (matchId: string): void => {
    if (this.reconciledBattleIds.has(matchId)) return;
    this.reconciledBattleIds.add(matchId);
    while (this.reconciledBattleIds.size > MAX_RECONCILED_BATTLE_IDS) {
      const oldest = this.reconciledBattleIds.values().next().value;
      if (oldest === undefined) break;
      this.reconciledBattleIds.delete(oldest);
    }
  };

  close = (): void => {
    this.unregisterActiveHost();
    this.host.close();
    this.participationByMission.clear();
    this.reconciledBattleIds.clear();
  };

  private getParticipationBucket(missionId: string): IParticipationBucket {
    let bucket = this.participationByMission.get(missionId);
    if (!bucket) {
      bucket = { records: new Map(), listeners: new Set() };
      this.participationByMission.set(missionId, bucket);
    }
    return bucket;
  }

  private notifyParticipation(bucket: IParticipationBucket): void {
    const records = Array.from(bucket.records.values());
    bucket.listeners.forEach((listener) => listener(records));
  }
}

export class CampaignHostRegistry {
  private readonly entries = new Map<string, CampaignHostRegistryEntry>();
  private readonly matchStore?: IMatchStore;

  constructor(deps: { readonly matchStore?: IMatchStore } = {}) {
    this.matchStore = deps.matchStore;
  }

  register = async (
    matchId: string,
    snapshot: ICampaignHostRegistrationSnapshot,
    options: { readonly rebuilt?: boolean } = {},
  ): Promise<ICampaignHostRegistryEntry> => {
    const parsed = parseCampaignCoopSnapshot({
      campaignId: snapshot.campaignId,
      matchId,
      revision: snapshot.revision ?? 0,
      state: snapshot.state,
    });
    if (!parsed.ok) {
      throw new Error(`Campaign snapshot rejected: ${parsed.reason}`);
    }
    const existing = this.entries.get(matchId);
    if (existing && !existing.host.isClosed()) {
      if (parsed.snapshot.revision < existing.revision) {
        throw new Error('Campaign snapshot revision is stale');
      }
      return existing;
    }

    // The environment decides which log this campaign writes to, and it
    // says which one it picked. A process that promised durability and
    // cannot deliver it throws here rather than hosting the campaign on
    // a log that disappears with the process.
    const eventStore = selectCampaignEventStore();
    const host = new CampaignMatchHost({
      campaignId: snapshot.campaignId,
      hostPlayerId: snapshot.hostPlayerId,
      eventStore: eventStore.store,
      initialState: snapshot.state,
    });
    const syncSession = new CampaignSyncSession(host, { matchId });
    // `null` means the invite already expired - see `getOrCreate`. It
    // opens the session without one rather than minting a fresh code,
    // so rehydration cannot re-open a door that launching closed.
    let roomCode: string | null = null;
    if (snapshot.roomCode === null) {
      await syncSession.openWithoutInvite();
    } else {
      roomCode = await syncSession.open(snapshot.roomCode);
    }
    const logRevision = Math.max(
      0,
      (await host.getEventLog().nextSequence()) - 1,
    );
    const remembered = sqliteReady()
      ? readCampaignSessionState(snapshot.campaignId, matchId)
      : null;
    const revision = remembered?.readinessRevision ?? logRevision;
    const activeBranch = remembered?.activeBranch ?? null;
    const arbiter = new CampaignGmArbiter(
      host,
      snapshot.arbitrationMode ?? 'host-review',
      { proposalTimeoutMs: 0 },
    );
    const unregisterActiveHost = registerActiveCoopHost(host);
    const entry = new CampaignHostRegistryEntry({
      matchId,
      roomCode,
      revision,
      activeBranch,
      host,
      syncSession,
      arbiter,
      eventStoreDurability: eventStore.durability,
      unregisterActiveHost,
    });
    // A REBUILT session starts paused: it has no GM connection, so the
    // GM is absent, so the campaign is paused until they return. This
    // is what carries the GM-loss pause across a process restart, and
    // it needs no stored flag - a flag could disagree with reality,
    // whereas this states the reality.
    if (options.rebuilt === true) {
      syncSession.pauseUntilGmReturns();
    }
    this.entries.set(matchId, entry);
    return entry;
  };

  get = (matchId: string | undefined): ICampaignHostRegistryEntry | null => {
    if (!matchId) return null;
    return this.entries.get(matchId) ?? null;
  };

  getOrCreate = async (
    matchId: string | undefined,
  ): Promise<ICampaignHostRegistryEntry | null> => {
    const existing = this.get(matchId);
    if (existing) return existing;
    if (!matchId) return null;

    let meta;
    try {
      meta = await (this.matchStore ?? getDefaultMatchStore()).getMatchMeta(
        matchId,
      );
    } catch {
      return null;
    }
    if (!meta.coopCampaign) {
      return null;
    }

    // A MISSING room code is not a missing campaign. Launching the
    // match clears the code from the store (`clearRoomCode`), so
    // refusing to rehydrate without one meant an active campaign became
    // unreachable the moment its invite expired - the members inside it
    // could not cold-recover after a restart. `null` rehydrates with
    // the invite already expired rather than minting a new one.
    return this.register(
      matchId,
      {
        campaignId: meta.coopCampaign.campaignId,
        hostPlayerId: meta.hostPlayerId,
        roomCode: meta.roomCode ?? null,
        state: meta.coopCampaign.state,
        arbitrationMode: meta.coopCampaign.arbitrationMode,
      },
      // Rebuilt, not created: this path runs when the entry was already
      // gone - a restart, or an eviction - and nobody is connected to it.
      { rebuilt: true },
    );
  };

  dispose = (matchId: string): void => {
    const entry = this.entries.get(matchId);
    if (!entry) return;
    entry.close();
    this.entries.delete(matchId);
  };

  size = (): number => this.entries.size;

  _reset = (): void => {
    this.entries.forEach((entry) => entry.close());
    this.entries.clear();
  };
}

let _singleton: CampaignHostRegistry | null = null;

export function getCampaignHostRegistry(): CampaignHostRegistry {
  if (!_singleton) {
    _singleton = new CampaignHostRegistry();
  }
  return _singleton;
}

export function _resetCampaignHostRegistry(): void {
  _singleton?._reset();
  _singleton = null;
}
