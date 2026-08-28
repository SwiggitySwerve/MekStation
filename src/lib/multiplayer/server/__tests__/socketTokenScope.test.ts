/**
 * SCOPED-TOKEN binder rows (umbrella 6.3).
 *
 * Scope is checked on the upgrade path (verifyPlayerToken with the
 * binder's expectedScope) BEFORE bind. A mismatch never reaches the
 * binder, so the socket has no frames.
 */

import { EventEmitter } from 'node:events';

import type {
  IPlayerToken,
  IPlayerTokenScope,
} from '@/types/multiplayer/Player';

import { generateKeyPair, signData } from '@/services/vault/IdentityService';
import { createEmptyCampaignState } from '@/types/campaign/CampaignSync';
import { nowIso, type IClientMessage } from '@/types/multiplayer/Protocol';

import type { IMatchSocket } from '../ServerMatchSocketTypes';

import {
  canonicalTokenPayload,
  expectedScopeForSocket,
  verifyPlayerToken,
} from '../auth';
import { bindCampaignSyncConnection } from '../bindCampaignSyncConnection';
import {
  bindMultiplayerSocketConnection,
  type IMatchHostRegistryLike,
} from '../bindMultiplayerSocketConnection';
import { CampaignHostRegistry } from '../CampaignHostRegistry';
import { derivePlayerId } from '../playerIdFromPublicKey';

class MockWireSocket extends EventEmitter implements IMatchSocket {
  readonly sent: unknown[] = [];
  readonly closes: Array<{ code?: number; reason?: string }> = [];
  readyState = 1;

  send(data: string): void {
    this.sent.push(JSON.parse(data));
  }

  close(code?: number, reason?: string): void {
    if (this.readyState === 3) return;
    this.readyState = 3;
    this.closes.push({ code, reason });
    this.emit('close');
  }

  inbound(message: IClientMessage | Record<string, unknown> | string): void {
    this.emit(
      'message',
      typeof message === 'string' ? message : JSON.stringify(message),
    );
  }
}

function toBase64(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString('base64');
}

async function mintToken(scope?: IPlayerTokenScope): Promise<IPlayerToken> {
  const kp = await generateKeyPair();
  const playerId = derivePlayerId(kp.publicKey);
  const now = Date.now();
  const issuedAt = new Date(now).toISOString();
  const expiresAt = new Date(now + 60_000).toISOString();
  const payload = canonicalTokenPayload({
    playerId,
    issuedAt,
    expiresAt,
    scope,
  });
  const signature = await signData(
    new TextEncoder().encode(payload),
    kp.privateKey,
  );
  return {
    playerId,
    issuedAt,
    expiresAt,
    publicKey: toBase64(kp.publicKey),
    signature: toBase64(signature),
    ...(scope ? { scope } : {}),
  };
}

function makeHost() {
  const host = {
    attachSocket: jest.fn(),
    admitSocket: jest.fn<
      Promise<{ kind: string; principalId: unknown } | null>,
      [unknown, unknown]
    >(async (socket: unknown, playerId: unknown) => {
      host.attachSocket(socket, playerId);
      return { kind: 'viewer', principalId: playerId };
    }),
    detachSocket: jest.fn(),
    handleSessionJoin: jest.fn().mockResolvedValue(undefined),
    handleIntent: jest.fn().mockResolvedValue([]),
    noteInbound: jest.fn(),
    releaseConnection: jest.fn(),
  };
  return host;
}

function makeCombatRegistry(
  host: ReturnType<typeof makeHost> | null,
): IMatchHostRegistryLike {
  return {
    getOrCreate: jest.fn().mockResolvedValue(host),
  };
}

const quietLogger = {
  error: jest.fn(),
  log: jest.fn(),
  warn: jest.fn(),
};

async function flushAsyncHandlers(): Promise<void> {
  for (let i = 0; i < 8; i += 1) {
    await Promise.resolve();
  }
}

async function makeCampaignRegistry(): Promise<CampaignHostRegistry> {
  const registry = new CampaignHostRegistry();
  await registry.register('match-campaign', {
    campaignId: 'campaign-sync',
    hostPlayerId: 'pid_host',
    roomCode: 'ABC234',
    arbitrationMode: 'auto-approve',
    state: {
      ...createEmptyCampaignState('campaign-sync'),
      balance: 1_000_000,
    },
  });
  return registry;
}

describe('combat binder token scope', () => {
  it('(a) match-A token on match-B is refused with no frames', async () => {
    const token = await mintToken({ kind: 'match', id: 'match-A' });
    const socket = new MockWireSocket();
    const host = makeHost();
    const result = await verifyPlayerToken(
      token,
      Date.now(),
      expectedScopeForSocket(undefined, 'match-B'),
    );
    expect(result).toEqual({ ok: false, reason: 'scope-mismatch' });
    expect(socket.sent).toEqual([]);
    expect(host.admitSocket).not.toHaveBeenCalled();
  });

  it('(b) correctly-scoped token admits and streams', async () => {
    const token = await mintToken({ kind: 'match', id: 'match-live' });
    const socket = new MockWireSocket();
    const host = makeHost();
    host.handleSessionJoin.mockImplementation(async () => {
      socket.send(
        JSON.stringify({
          kind: 'Event',
          matchId: 'match-live',
          ts: nowIso(),
          event: { sequence: 1, type: 'phase_changed', id: 'evt-1' },
        }),
      );
    });
    const result = await verifyPlayerToken(
      token,
      Date.now(),
      expectedScopeForSocket(undefined, 'match-live'),
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    await bindMultiplayerSocketConnection({
      socket,
      registry: makeCombatRegistry(host),
      matchId: 'match-live',
      verifiedPlayerId: result.playerId,
      logger: quietLogger,
    });
    socket.inbound({
      kind: 'SessionJoin',
      matchId: 'match-live',
      ts: nowIso(),
      playerId: result.playerId,
      token: 'already-verified-at-upgrade',
      lastSeq: 0,
    });
    await flushAsyncHandlers();

    expect(host.admitSocket).toHaveBeenCalled();
    expect(host.handleSessionJoin).toHaveBeenCalled();
    expect(socket.sent).toContainEqual(
      expect.objectContaining({
        kind: 'Event',
        matchId: 'match-live',
      }),
    );
  });

  it('(c) scopeless token still admits (transition)', async () => {
    const token = await mintToken();
    const socket = new MockWireSocket();
    const host = makeHost();
    const result = await verifyPlayerToken(
      token,
      Date.now(),
      expectedScopeForSocket(undefined, 'match-live'),
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    await bindMultiplayerSocketConnection({
      socket,
      registry: makeCombatRegistry(host),
      matchId: 'match-live',
      verifiedPlayerId: result.playerId,
      logger: quietLogger,
    });
    expect(host.admitSocket).toHaveBeenCalled();
    expect(socket.closes).toEqual([]);
  });
});

describe('campaign binder token scope', () => {
  it('(a) campaign-A token on campaign-B is refused with no frames', async () => {
    const token = await mintToken({
      kind: 'campaign-session',
      id: 'match-A',
    });
    const socket = new MockWireSocket();
    const result = await verifyPlayerToken(
      token,
      Date.now(),
      expectedScopeForSocket('campaign', 'match-B'),
    );
    expect(result).toEqual({ ok: false, reason: 'scope-mismatch' });
    expect(socket.sent).toEqual([]);
  });

  it('(b) correctly-scoped token admits and streams', async () => {
    const token = await mintToken({
      kind: 'campaign-session',
      id: 'match-campaign',
    });
    const socket = new MockWireSocket();
    const result = await verifyPlayerToken(
      token,
      Date.now(),
      expectedScopeForSocket('campaign', 'match-campaign'),
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const registry = await makeCampaignRegistry();
    await bindCampaignSyncConnection({
      socket,
      registry,
      matchId: 'match-campaign',
      verifiedPlayerId: result.playerId,
      logger: quietLogger,
      replicaStore: null,
    });
    socket.inbound({
      kind: 'CampaignJoin',
      matchId: 'match-campaign',
      ts: nowIso(),
      playerId: result.playerId,
      role: 'guest',
      roomCode: 'ABC234',
    });
    await flushAsyncHandlers();

    expect(socket.sent).toContainEqual(
      expect.objectContaining({
        kind: 'CampaignSnapshot',
        matchId: 'match-campaign',
      }),
    );
  });

  it('(c) scopeless token still admits (transition)', async () => {
    const token = await mintToken();
    const socket = new MockWireSocket();
    const result = await verifyPlayerToken(
      token,
      Date.now(),
      expectedScopeForSocket('campaign', 'match-campaign'),
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const registry = await makeCampaignRegistry();
    await bindCampaignSyncConnection({
      socket,
      registry,
      matchId: 'match-campaign',
      verifiedPlayerId: result.playerId,
      logger: quietLogger,
      replicaStore: null,
    });
    socket.inbound({
      kind: 'CampaignJoin',
      matchId: 'match-campaign',
      ts: nowIso(),
      playerId: result.playerId,
      role: 'guest',
      roomCode: 'ABC234',
    });
    await flushAsyncHandlers();

    expect(socket.sent).toContainEqual(
      expect.objectContaining({
        kind: 'CampaignSnapshot',
        matchId: 'match-campaign',
      }),
    );
  });
});
