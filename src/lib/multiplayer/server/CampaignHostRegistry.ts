import type { ICampaignAuthoritativeState } from '@/types/campaign/CampaignSync';
import type {
  CoopParticipationChoice,
  GmArbitrationMode,
} from '@/types/campaign/CoopCampaign';
import type { IForce } from '@/types/campaign/Force';

import { registerActiveCoopHost } from '@/lib/campaign/coop/coopHostRegistry';
import { InMemoryCampaignEventStore } from '@/lib/campaign/sync/InMemoryCampaignEventStore';

import type { IMatchStore } from './IMatchStore';

import { CampaignGmArbiter } from './CampaignGmArbiter';
import { CampaignMatchHost } from './CampaignMatchHost';
import { CampaignSyncSession } from './CampaignSyncSession';
import { getDefaultMatchStore } from './getDefaultMatchStore';

export interface ICampaignHostRegistrationSnapshot {
  readonly campaignId: string;
  readonly hostPlayerId: string;
  readonly roomCode: string;
  readonly state: ICampaignAuthoritativeState;
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
  readonly roomCode: string;
  readonly hostPlayerId: string;
  readonly host: CampaignMatchHost;
  readonly syncSession: CampaignSyncSession;
  readonly arbiter: CampaignGmArbiter;
  readonly publishParticipation: (record: ICampaignParticipationRecord) => void;
  readonly subscribeParticipation: (
    missionId: string,
    listener: CampaignParticipationListener,
  ) => () => void;
  readonly getParticipationRecords: (
    missionId: string,
  ) => readonly ICampaignParticipationRecord[];
  readonly close: () => void;
}

class CampaignHostRegistryEntry implements ICampaignHostRegistryEntry {
  readonly matchId: string;
  readonly campaignId: string;
  readonly roomCode: string;
  readonly hostPlayerId: string;
  readonly host: CampaignMatchHost;
  readonly syncSession: CampaignSyncSession;
  readonly arbiter: CampaignGmArbiter;

  private readonly participationByMission = new Map<
    string,
    IParticipationBucket
  >();

  constructor(input: {
    readonly matchId: string;
    readonly roomCode: string;
    readonly host: CampaignMatchHost;
    readonly syncSession: CampaignSyncSession;
    readonly arbiter: CampaignGmArbiter;
    readonly unregisterActiveHost: () => void;
  }) {
    this.matchId = input.matchId;
    this.roomCode = input.roomCode;
    this.host = input.host;
    this.syncSession = input.syncSession;
    this.arbiter = input.arbiter;
    this.unregisterActiveHost = input.unregisterActiveHost;
    this.campaignId = input.host.campaignId;
    this.hostPlayerId = input.host.getHostPlayerId();
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
    return bucket ? Array.from(bucket.records.values()) : [];
  };

  close = (): void => {
    this.unregisterActiveHost();
    this.host.close();
    this.participationByMission.clear();
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
  ): Promise<ICampaignHostRegistryEntry> => {
    const existing = this.entries.get(matchId);
    if (existing && !existing.host.isClosed()) return existing;

    const host = new CampaignMatchHost({
      campaignId: snapshot.campaignId,
      hostPlayerId: snapshot.hostPlayerId,
      eventStore: new InMemoryCampaignEventStore(),
      initialState: snapshot.state,
    });
    const syncSession = new CampaignSyncSession(host);
    const roomCode = await syncSession.open(snapshot.roomCode);
    const arbiter = new CampaignGmArbiter(
      host,
      snapshot.arbitrationMode ?? 'host-review',
      { proposalTimeoutMs: 0 },
    );
    const unregisterActiveHost = registerActiveCoopHost(host);
    const entry = new CampaignHostRegistryEntry({
      matchId,
      roomCode,
      host,
      syncSession,
      arbiter,
      unregisterActiveHost,
    });
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
    if (!meta.coopCampaign || !meta.roomCode) {
      return null;
    }

    return this.register(matchId, {
      campaignId: meta.coopCampaign.campaignId,
      hostPlayerId: meta.hostPlayerId,
      roomCode: meta.roomCode,
      state: meta.coopCampaign.state,
      arbitrationMode: meta.coopCampaign.arbitrationMode,
    });
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
