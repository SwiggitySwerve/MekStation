/**
 * Shared doubles for grant-channel binder tests. Not a test file.
 */

import { EventEmitter } from 'node:events';

import type { ICampaignDeliveryHarness } from '@/lib/campaign/delivery/__tests__/grantProjectionHarness';
import type { CampaignGrantNullCursorBackfill } from '@/lib/campaign/delivery/campaignDeliveryTypes';
import type { ICampaignGrantLiveSource } from '@/lib/campaign/delivery/campaignGrantChannelSession';
import type { ICampaignGrant } from '@/lib/campaign/grants/ICampaignGrantStore';
import type { ICampaignHostRegistryLike } from '@/lib/multiplayer/server/bindCampaignSyncConnection';
import type { ICampaignHostRegistryEntry } from '@/lib/multiplayer/server/CampaignHostRegistry';
import type { ICampaignGrantChannelDeps } from '@/lib/multiplayer/server/handleCampaignGrantJoin';
import type { IMatchSocket } from '@/lib/multiplayer/server/ServerMatchSocketTypes';
import type {
  IClientMessage,
  IServerMessage,
} from '@/types/multiplayer/Protocol';

import {
  EVENT_TS,
  ISSUED_AT,
  EXPIRES_AT,
} from '@/lib/campaign/delivery/__tests__/grantProjectionHarness';
import { signCampaignGrantToken } from '@/lib/campaign/grants/campaignGrantToken';
import { InMemoryCampaignEventStore } from '@/lib/campaign/sync/InMemoryCampaignEventStore';
import { CampaignGmArbiter } from '@/lib/multiplayer/server/CampaignGmArbiter';
import { CampaignMatchHost } from '@/lib/multiplayer/server/CampaignMatchHost';
import { CampaignSyncSession } from '@/lib/multiplayer/server/CampaignSyncSession';
import { generateKeyPair, toBase64 } from '@/services/vault/IdentityService';
import { createEmptyCampaignState } from '@/types/campaign/CampaignSync';
import { nowIso } from '@/types/multiplayer/Protocol';

export const MATCH_ID = 'match-grant-channel';
export const NOW_ACTIVE_MS = Date.parse('2026-08-22T16:30:00.000Z');

export const quietLogger = {
  error: jest.fn(),
  log: jest.fn(),
  warn: jest.fn(),
};

export class MockWireSocket extends EventEmitter implements IMatchSocket {
  readonly sent: IServerMessage[] = [];
  readonly closes: Array<{ code?: number; reason?: string }> = [];
  readyState = 1;

  /** Records outbound JSON frames as parsed server messages. */
  send(data: string): void {
    this.sent.push(JSON.parse(data) as IServerMessage);
  }

  /** Marks the socket closed and emits the binder's cleanup event. */
  close(code?: number, reason?: string): void {
    if (this.readyState === 3) return;
    this.readyState = 3;
    this.closes.push({ code, reason });
    this.emit('close');
  }

  /** Injects one inbound client envelope. */
  inbound(message: IClientMessage | Record<string, unknown> | string): void {
    this.emit(
      'message',
      typeof message === 'string' ? message : JSON.stringify(message),
    );
  }
}

/**
 * Live wakeup the test fires after a durable journal append. Production
 * uses host.subscribe instead, which also runs only after append.
 */
export class ManualLiveSource implements ICampaignGrantLiveSource {
  private readonly listeners = new Set<() => void>();

  /** Registers a grant-session pump. */
  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /** Wakes every subscribed grant session. */
  public wake(): void {
    this.listeners.forEach((listener) => {
      listener();
    });
  }

  /** True when disconnect cleanup dropped the listener. */
  public get listenerCount(): number {
    return this.listeners.size;
  }
}

/** Yields so async grant-join projection can finish. */
export async function drain(settled?: () => boolean): Promise<void> {
  // Condition-based, not a fixed turn budget. The projection awaits real
  // SQLite work, so "N microtasks is surely enough" is only true on an
  // idle machine - under full-suite contention it is not, which is a
  // flake by construction. Callers that know what they are waiting for
  // pass a predicate; the deadline keeps a never-true predicate from
  // hanging the suite.
  const deadline = Date.now() + 5000;
  for (;;) {
    for (let i = 0; i < 40; i += 1) {
      await Promise.resolve();
    }
    await new Promise<void>((resolve) => {
      setTimeout(resolve, 0);
    });
    if (settled === undefined || settled()) return;
    if (Date.now() >= deadline) return;
  }
}

/** Frozen grant-channel deps bound to one delivery harness. */
export function harnessGrantChannel(
  harness: ICampaignDeliveryHarness,
  nullCursorBackfill: CampaignGrantNullCursorBackfill = 'full-stream',
): ICampaignGrantChannelDeps {
  return {
    projectDeps: harness.deps,
    nowMs: () => NOW_ACTIVE_MS,
    nowIso: () => EVENT_TS,
    nullCursorBackfill,
  };
}

/** Issues a grant with a real issuer key and a matching signed token. */
export async function issueSignedGrant(
  harness: ICampaignDeliveryHarness,
  input: {
    readonly campaignId: string;
    readonly participantId: string;
    readonly scopes: readonly string[];
  },
): Promise<{
  grant: ICampaignGrant;
  token: Awaited<ReturnType<typeof signCampaignGrantToken>>;
  signer: { readonly publicKey: string; readonly privateKey: string };
}> {
  const keyPair = await generateKeyPair();
  const signer = {
    publicKey: toBase64(keyPair.publicKey),
    privateKey: toBase64(keyPair.privateKey),
  };
  const grant = harness.grantStore.issueGrant({
    campaignId: input.campaignId,
    participantId: input.participantId,
    issuerPublicKey: signer.publicKey,
    scopes: input.scopes,
    issuedAt: ISSUED_AT,
    expiresAt: EXPIRES_AT,
  });
  const token = await signCampaignGrantToken(grant, signer);
  return { grant, token, signer };
}

/**
 * Registry entry pointing at a real host so the binder's default live
 * source can subscribe after durable append.
 */
export function registryForHost(
  host: CampaignMatchHost,
  matchId: string,
): ICampaignHostRegistryLike {
  const syncSession = new CampaignSyncSession(host, { matchId });
  const arbiter = new CampaignGmArbiter(host, 'auto-approve', {
    proposalTimeoutMs: 0,
  });
  const entry: ICampaignHostRegistryEntry = {
    matchId,
    campaignId: host.campaignId,
    roomCode: 'GRANT0',
    revision: 0,
    hostPlayerId: host.getHostPlayerId(),
    host,
    syncSession,
    arbiter,
    publishParticipation: () => undefined,
    subscribeParticipation: () => () => undefined,
    getParticipationRecords: () => [],
    advanceRevision: () => undefined,
    hasReconciledBattle: () => false,
    recordReconciledBattle: () => undefined,
    close: () => {
      host.close();
    },
  };
  return {
    get: () => entry,
    getOrCreate: async () => entry,
  };
}

/** Host with an in-memory log; grant projection still reads the harness journal. */
export function memoryHost(campaignId: string): CampaignMatchHost {
  return new CampaignMatchHost({
    campaignId,
    hostPlayerId: 'pid_host',
    eventStore: new InMemoryCampaignEventStore(),
    initialState: createEmptyCampaignState(campaignId),
  });
}

/** CampaignGrantJoin envelope for one replica. */
export function grantJoinEnvelope(args: {
  readonly campaignId: string;
  readonly grantId: string;
  readonly playerId: string;
  readonly token: unknown;
  readonly cursor: { deliveryEpochId: string; afterSequence: number } | null;
  readonly matchId?: string;
}): IClientMessage {
  return {
    kind: 'CampaignGrantJoin',
    matchId: args.matchId ?? MATCH_ID,
    ts: nowIso(),
    playerId: args.playerId,
    campaignId: args.campaignId,
    grantId: args.grantId,
    token: args.token,
    cursor: args.cursor,
  };
}

export const WITHHELD_GM_SECRET = 'WITHHELD-GM-SECRET';
export const VISIBLE_ONE = 'VISIBLE-CAMPAIGN-1';
export const VISIBLE_TWO = 'VISIBLE-CAMPAIGN-2';

const JOURNAL_LEAK_KEYS: readonly string[] = [
  'streamRevision',
  'commitPosition',
  'eventDigest',
  'previousStreamEventDigest',
  'commit_position',
  'event_digest',
  'stream_revision',
  'projectedEventIdentity',
  'sequence',
];

/** Collects own enumerable keys from a JSON tree. */
function collectKeys(value: unknown, into: Set<string>): void {
  if (Array.isArray(value)) {
    for (const entry of value) collectKeys(entry, into);
    return;
  }
  if (typeof value !== 'object' || value === null) return;
  for (const key of Object.keys(value)) {
    into.add(key);
    collectKeys(Reflect.get(value, key), into);
  }
}

/** Names withheld markers or journal fields found on a socket's frames. */
export function leakScan(
  frames: readonly IServerMessage[],
  withheldMarker: string,
): readonly string[] {
  const leaks: string[] = [];
  const serialized = JSON.stringify(frames);
  if (serialized.includes(withheldMarker))
    leaks.push('withheld-payload-marker');
  const keys = new Set<string>();
  collectKeys(frames, keys);
  for (const key of JOURNAL_LEAK_KEYS) {
    if (keys.has(key)) leaks.push(key);
  }
  return leaks;
}

/** Frames of one kind from a socket. */
export function framesOf<K extends IServerMessage['kind']>(
  socket: MockWireSocket,
  kind: K,
): Extract<IServerMessage, { kind: K }>[] {
  return socket.sent.filter(
    (message): message is Extract<IServerMessage, { kind: K }> =>
      message.kind === kind,
  );
}
