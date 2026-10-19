import Database from 'better-sqlite3';
import assert from 'node:assert/strict';
import { EventEmitter, once } from 'node:events';
import * as fs from 'node:fs';
import * as path from 'node:path';

import type {
  IClientMessage,
  IServerMessage,
} from '@/types/multiplayer/Protocol';

import { reconcileCoopBattle } from '@/lib/campaign/coop/reconcileCoopBattle';
import { CampaignLaunchView } from '@/lib/campaign/sync/campaignPublicAppliedView';
import { SQLiteEventJournalWriter } from '@/lib/events/journal/SQLiteEventJournalWriter';
import { getSQLiteService } from '@/services/persistence/SQLiteService';
import { createEmptyCampaignState } from '@/types/campaign/CampaignSync';
import {
  HEARTBEAT_INTERVAL_MS,
  HEARTBEAT_TIMEOUT_MS,
  nowIso,
} from '@/types/multiplayer/Protocol';

import type { ICampaignHostRegistryEntry } from '../CampaignHostRegistry';
import type { IMatchSocket } from '../ServerMatchSocketTypes';

import { bindCampaignSyncConnection } from '../bindCampaignSyncConnection';
import {
  _resetCampaignHostRegistry,
  CampaignHostRegistry,
  getCampaignHostRegistry,
} from '../CampaignHostRegistry';
import { createCampaignSessionMembershipPort } from '../campaignSessionMembershipPort';
import { _setDefaultMatchStoreForTests } from '../getDefaultMatchStore';
import { InMemoryMatchStore } from '../InMemoryMatchStore';
import { ObservedSocket } from './coopMissionAnnouncement.harness';
import { openRouteFixture } from './coopMissionCreate.harness';

class MockWireSocket extends EventEmitter implements IMatchSocket {
  readonly sent: IServerMessage[] = [];
  readonly closes: Array<{ code?: number; reason?: string }> = [];
  readyState = 1;

  send(data: string): void {
    this.sent.push(JSON.parse(data) as IServerMessage);
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

async function makeRegistry(
  arbitrationMode: 'auto-approve' | 'host-review' = 'auto-approve',
): Promise<CampaignHostRegistry> {
  const registry = new CampaignHostRegistry();
  await registry.register('match-campaign', {
    campaignId: 'campaign-sync',
    hostPlayerId: 'pid_host',
    roomCode: 'ABC234',
    arbitrationMode,
    state: {
      ...createEmptyCampaignState('campaign-sync'),
      balance: 1_000_000,
      rosterUnits: {
        'unit-guest': {
          unitId: 'unit-guest',
          designation: 'Guest Mech',
          status: 'operational' as const,
          unitRef: 'guest-mech',
          unitSource: 'canonical' as const,
        },
      },
      forceUnits: { 'force-guest': ['unit-guest'] },
    },
  });
  return registry;
}

async function flushAsyncHandlers(): Promise<void> {
  // 32, matching bindCampaignSyncConnection.reconcile.test.ts. This is a
  // microtask DRAIN, not an assertion: it counts how far the harness
  // pumps the socket handler's promise chain before reading `sent`.
  // Projecting the join baseline (umbrella 12.1) reads the campaign log,
  // which put hydration past 8 ticks. Nothing about what the rows assert
  // changes - only how long the harness waits before asserting it.
  for (let i = 0; i < 32; i += 1) {
    await Promise.resolve();
  }
}

function participate(
  socket: MockWireSocket,
  participation: Record<string, unknown>,
): void {
  // Deliberately a loose record: these cases send payloads the schema
  // must REJECT, so the literal must not be checked against the valid
  // CampaignParticipation shape.
  socket.inbound({
    kind: 'CampaignParticipation',
    matchId: 'match-campaign',
    ts: nowIso(),
    playerId: 'pid_guest',
    participation,
  } as Record<string, unknown>);
}

function sawError(
  socket: MockWireSocket,
  code: string,
  reason?: string,
): boolean {
  return socket.sent.some(
    (message) =>
      message.kind === 'Error' &&
      message.code === code &&
      (reason === undefined || message.reason === reason),
  );
}

const quietLogger = {
  error: jest.fn(),
  log: jest.fn(),
  warn: jest.fn(),
};

describe('bindCampaignSyncConnection', () => {
  beforeEach(() => {
    quietLogger.error.mockClear();
    quietLogger.log.mockClear();
    quietLogger.warn.mockClear();
  });

  it('closes an unknown campaign match with a typed error', async () => {
    const socket = new MockWireSocket();
    const registry = new CampaignHostRegistry();

    await bindCampaignSyncConnection({
      socket,
      registry,
      matchId: 'missing-match',
      verifiedPlayerId: 'pid_guest',
      logger: quietLogger,
      replicaStore: null,
    });

    expect(socket.sent).toEqual([
      expect.objectContaining({
        kind: 'Error',
        matchId: 'missing-match',
        code: 'UNKNOWN_MATCH',
      }),
      expect.objectContaining({
        kind: 'Close',
        matchId: 'missing-match',
        code: 'UNKNOWN_MATCH',
      }),
    ]);
    expect(socket.closes[0]).toMatchObject({
      code: 1008,
      reason: 'unknown-campaign-match',
    });
  });

  it('streams a campaign snapshot to a joined guest', async () => {
    const socket = new MockWireSocket();
    const registry = await makeRegistry();

    await bindCampaignSyncConnection({
      socket,
      registry,
      matchId: 'match-campaign',
      verifiedPlayerId: 'pid_guest',
      logger: quietLogger,
      replicaStore: null,
    });
    socket.inbound({
      kind: 'CampaignJoin',
      matchId: 'match-campaign',
      ts: nowIso(),
      playerId: 'pid_guest',
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

  describe('campaign heartbeat lifecycle', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('accepts a heartbeat and replies on the standard server cadence', async () => {
      const socket = new MockWireSocket();
      const registry = await makeRegistry();

      await bindCampaignSyncConnection({
        socket,
        registry,
        matchId: 'match-campaign',
        verifiedPlayerId: 'pid_guest',
        logger: quietLogger,
        replicaStore: null,
      });
      socket.inbound({
        kind: 'Heartbeat',
        matchId: 'match-campaign',
        ts: nowIso(),
      });
      await flushAsyncHandlers();
      jest.advanceTimersByTime(HEARTBEAT_INTERVAL_MS);

      expect(sawError(socket, 'BAD_ENVELOPE', 'not-campaign-sync')).toBe(false);
      expect(socket.sent).toContainEqual(
        expect.objectContaining({
          kind: 'Heartbeat',
          matchId: 'match-campaign',
        }),
      );
      expect(socket.readyState).toBe(1);

      socket.close();
    });

    it('reaps an idle GM socket and pauses the campaign through existing cleanup', async () => {
      const socket = new MockWireSocket();
      const registry = await makeRegistry();

      await bindCampaignSyncConnection({
        socket,
        registry,
        matchId: 'match-campaign',
        verifiedPlayerId: 'pid_host',
        logger: quietLogger,
        replicaStore: null,
      });
      socket.inbound({
        kind: 'CampaignJoin',
        matchId: 'match-campaign',
        ts: nowIso(),
        playerId: 'pid_host',
        role: 'host',
      });
      await flushAsyncHandlers();
      expect(registry.get('match-campaign')?.syncSession.isPaused()).toBe(
        false,
      );

      jest.advanceTimersByTime(
        HEARTBEAT_TIMEOUT_MS + HEARTBEAT_INTERVAL_MS + 1,
      );
      await flushAsyncHandlers();

      expect(socket.readyState).toBe(3);
      expect(registry.get('match-campaign')?.syncSession.isPaused()).toBe(true);
    });

    it('keeps a quiet campaign socket connected on heartbeat cadence alone', async () => {
      const socket = new MockWireSocket();
      const registry = await makeRegistry();

      await bindCampaignSyncConnection({
        socket,
        registry,
        matchId: 'match-campaign',
        verifiedPlayerId: 'pid_guest',
        logger: quietLogger,
        replicaStore: null,
      });

      const ticks = Math.ceil(
        (HEARTBEAT_TIMEOUT_MS * 4) / HEARTBEAT_INTERVAL_MS,
      );
      for (let tick = 0; tick < ticks; tick += 1) {
        jest.advanceTimersByTime(HEARTBEAT_INTERVAL_MS);
        socket.inbound({
          kind: 'Heartbeat',
          matchId: 'match-campaign',
          ts: nowIso(),
        });
        await flushAsyncHandlers();
      }

      expect(socket.readyState).toBe(1);
      expect(sawError(socket, 'BAD_ENVELOPE', 'not-campaign-sync')).toBe(false);

      socket.close();
    });

    it('treats an authenticated campaign intent as liveness traffic', async () => {
      const socket = new MockWireSocket();
      const registry = await makeRegistry();

      await bindCampaignSyncConnection({
        socket,
        registry,
        matchId: 'match-campaign',
        verifiedPlayerId: 'pid_host',
        logger: quietLogger,
        replicaStore: null,
      });
      socket.inbound({
        kind: 'CampaignJoin',
        matchId: 'match-campaign',
        ts: nowIso(),
        playerId: 'pid_host',
        role: 'host',
      });
      await flushAsyncHandlers();

      jest.advanceTimersByTime(HEARTBEAT_INTERVAL_MS * 2);
      socket.inbound({
        kind: 'CampaignHostIntent',
        matchId: 'match-campaign',
        ts: nowIso(),
        playerId: 'pid_host',
        intent: {
          kind: 'AdvanceDay',
          campaignId: 'campaign-sync',
          intentId: 'heartbeat-liveness-intent',
          payload: { days: 1 },
        },
      });
      await flushAsyncHandlers();
      jest.advanceTimersByTime(HEARTBEAT_INTERVAL_MS * 2);

      expect(socket.readyState).toBe(1);
      expect(registry.get('match-campaign')?.host.getState().day).toBe(1);

      socket.close();
    });
  });

  /** In-memory membership port: the store's contract without a database. */
  function fakeMembership(
    seed: {
      active?: readonly string[];
      revoked?: readonly string[];
      /** The gm seat is already held by a different durable identity. */
      gmSeatTaken?: boolean;
    } = {},
  ) {
    const active = new Set(seed.active ?? []);
    const revoked = new Set(seed.revoked ?? []);
    const bound: { participantId: string; seat: string }[] = [];
    return {
      bound,
      isActive: (_c: string, _s: string, participantId: string) =>
        active.has(participantId),
      isRevoked: (_c: string, _s: string, participantId: string) =>
        revoked.has(participantId),
      bind: (input: { participantId: string; seat: 'gm' | 'player' }) => {
        // The store's single-active-GM index answers this, and the
        // socket layer was throwing the answer away.
        if (input.seat === 'gm' && seed.gmSeatTaken === true) {
          return { kind: 'gm-seat-taken' as const };
        }
        // The real store refuses a third tactical seat inside its own
        // transaction. A fake that always says yes cannot show whether
        // the socket layer listens to that answer.
        if (
          input.seat === 'player' &&
          !bound.some((row) => row.participantId === input.participantId) &&
          bound.filter((row) => row.seat === 'player').length >= 2
        ) {
          return { kind: 'tactical-seats-full' as const, limit: 2 };
        }
        bound.push({ participantId: input.participantId, seat: input.seat });
        active.add(input.participantId);
        return { kind: 'bound' as const };
      },
      revoke: (input: { participantId: string; revokedAt: string }) => {
        void input.revokedAt;
        if (revoked.has(input.participantId)) return false;
        active.delete(input.participantId);
        revoked.add(input.participantId);
        return true;
      },
    };
  }

  it('refuses a revoked member even when they present a valid room code', async () => {
    // The property that did not exist before durable membership:
    // revocation used to last exactly as long as the member stayed
    // disconnected, because the room code was the whole check.
    const socket = new MockWireSocket();
    const registry = await makeRegistry();
    const membership = fakeMembership({ revoked: ['pid_guest'] });

    await bindCampaignSyncConnection({
      socket,
      registry,
      matchId: 'match-campaign',
      verifiedPlayerId: 'pid_guest',
      logger: quietLogger,
      replicaStore: null,
      membership,
    });
    socket.inbound({
      kind: 'CampaignJoin',
      matchId: 'match-campaign',
      ts: nowIso(),
      playerId: 'pid_guest',
      role: 'guest',
      roomCode: 'ABC234',
    });
    await flushAsyncHandlers();

    expect(socket.sent).toContainEqual(
      expect.objectContaining({
        kind: 'Error',
        code: 'AUTH_REJECTED',
        reason: 'membership-revoked',
      }),
    );
    expect(socket.sent).not.toContainEqual(
      expect.objectContaining({ kind: 'CampaignSnapshot' }),
    );
  });

  it('admits a returning member whose room code is now wrong', async () => {
    // Durable routing, not invite routing: a rotated or expired code
    // must not lock out someone already admitted.
    const socket = new MockWireSocket();
    const registry = await makeRegistry();
    const membership = fakeMembership({ active: ['pid_guest'] });

    await bindCampaignSyncConnection({
      socket,
      registry,
      matchId: 'match-campaign',
      verifiedPlayerId: 'pid_guest',
      logger: quietLogger,
      replicaStore: null,
      membership,
    });
    socket.inbound({
      kind: 'CampaignJoin',
      matchId: 'match-campaign',
      ts: nowIso(),
      playerId: 'pid_guest',
      role: 'guest',
      roomCode: 'ZZZ999',
    });
    await flushAsyncHandlers();

    expect(socket.sent).not.toContainEqual(
      expect.objectContaining({ kind: 'Error', code: 'UNKNOWN_MATCH' }),
    );
  });

  it('records a newcomer admitted by room code as a durable member', async () => {
    // The invite worked once; it should not be needed again.
    const socket = new MockWireSocket();
    const registry = await makeRegistry();
    const membership = fakeMembership();

    await bindCampaignSyncConnection({
      socket,
      registry,
      matchId: 'match-campaign',
      verifiedPlayerId: 'pid_guest',
      logger: quietLogger,
      replicaStore: null,
      membership,
    });
    socket.inbound({
      kind: 'CampaignJoin',
      matchId: 'match-campaign',
      ts: nowIso(),
      playerId: 'pid_guest',
      role: 'guest',
      roomCode: 'ABC234',
    });
    await flushAsyncHandlers();

    expect(membership.bound).toContainEqual({
      participantId: 'pid_guest',
      seat: 'player',
    });
  });

  it('refuses a third tactical player and leaves the first two seated', async () => {
    // Exactly two tactical slots is the campaign's topology, and the
    // store already refuses the third inside its bind transaction. The
    // socket layer was discarding that answer, so the third player was
    // admitted and streamed the campaign anyway.
    const registry = await makeRegistry();
    const membership = fakeMembership();

    const join = async (playerId: string) => {
      const socket = new MockWireSocket();
      await bindCampaignSyncConnection({
        socket,
        registry,
        matchId: 'match-campaign',
        verifiedPlayerId: playerId,
        logger: quietLogger,
        replicaStore: null,
        membership,
      });
      socket.inbound({
        kind: 'CampaignJoin',
        matchId: 'match-campaign',
        ts: nowIso(),
        playerId,
        role: 'guest',
        roomCode: 'ABC234',
      });
      await flushAsyncHandlers();
      return socket;
    };

    await join('pid_p1');
    await join('pid_p2');
    const third = await join('pid_p3');

    expect(
      sawError(third, 'AUTH_REJECTED', 'campaign-tactical-seats-full'),
    ).toBe(true);
    // The two who were already seated keep their seats: a refusal must
    // not disturb existing membership.
    expect(membership.bound).toEqual([
      { participantId: 'pid_p1', seat: 'player' },
      { participantId: 'pid_p2', seat: 'player' },
    ]);
  });

  it('a refused third player is sent NOTHING but the refusal', async () => {
    // The membership-smoke law: a refusal must produce no admission
    // artifact. joinGuest streamed the baseline BEFORE the seat cap
    // answered, so a seats-full stranger left with the campaign
    // snapshot in hand - the code even documented the trade-off. The
    // seat now binds before anything streams.
    const registry = await makeRegistry();
    const membership = fakeMembership();

    const join = async (playerId: string) => {
      const socket = new MockWireSocket();
      await bindCampaignSyncConnection({
        socket,
        registry,
        matchId: 'match-campaign',
        verifiedPlayerId: playerId,
        logger: quietLogger,
        replicaStore: null,
        membership,
      });
      socket.inbound({
        kind: 'CampaignJoin',
        matchId: 'match-campaign',
        ts: nowIso(),
        playerId,
        role: 'guest',
        roomCode: 'ABC234',
      });
      await flushAsyncHandlers();
      return socket;
    };

    const first = await join('pid_p1');
    await join('pid_p2');
    const third = await join('pid_p3');

    // Falsification: restore the stream-then-bind order and the
    // snapshot assertion below reds while the refusal stays green.
    expect(third.sent.filter((frame) => frame.kind !== 'Error')).toHaveLength(
      0,
    );
    // CONTROL: an admitted player still receives the snapshot, so a
    // guard that starved everyone would fail here rather than pass.
    expect(first.sent.some((frame) => frame.kind === 'CampaignSnapshot')).toBe(
      true,
    );
  });

  it('refuses a GM whose seat durable membership gives to someone else', async () => {
    // The registry decides `role === 'host'` by comparing the verified
    // principal to its OWN in-memory hostPlayerId. Durable membership is
    // the authority, and when the two disagree the store says so with
    // gm-seat-taken - which was discarded. Worse, the session was
    // RESUMED before the bind ran, so a contested GM unpaused a campaign
    // on the way to being ignored.
    const registry = await makeRegistry();
    const membership = fakeMembership({ gmSeatTaken: true });
    const socket = new MockWireSocket();

    await bindCampaignSyncConnection({
      socket,
      registry,
      matchId: 'match-campaign',
      verifiedPlayerId: 'pid_host',
      logger: quietLogger,
      replicaStore: null,
      membership,
    });
    socket.inbound({
      kind: 'CampaignJoin',
      matchId: 'match-campaign',
      ts: nowIso(),
      playerId: 'pid_host',
      role: 'host',
    });
    await flushAsyncHandlers();

    expect(sawError(socket, 'AUTH_REJECTED', 'campaign-gm-seat-taken')).toBe(
      true,
    );
    // And nothing was handed over: an admitted GM is sent the campaign
    // snapshot and subscribed to the stream. A refusal that still did
    // that would have given a contested GM the live campaign anyway.
    expect(socket.sent.some((frame) => frame.kind === 'CampaignSnapshot')).toBe(
      false,
    );
  });

  it('still admits the GM when the seat is theirs', async () => {
    // The control. A guard that refused every host would pass the row
    // above while making every campaign unhostable.
    const registry = await makeRegistry();
    const membership = fakeMembership();
    const socket = new MockWireSocket();

    await bindCampaignSyncConnection({
      socket,
      registry,
      matchId: 'match-campaign',
      verifiedPlayerId: 'pid_host',
      logger: quietLogger,
      replicaStore: null,
      membership,
    });
    socket.inbound({
      kind: 'CampaignJoin',
      matchId: 'match-campaign',
      ts: nowIso(),
      playerId: 'pid_host',
      role: 'host',
    });
    await flushAsyncHandlers();

    expect(sawError(socket, 'AUTH_REJECTED', 'campaign-gm-seat-taken')).toBe(
      false,
    );
    expect(membership.bound).toContainEqual({
      participantId: 'pid_host',
      seat: 'gm',
    });
    // ...and they really were admitted, not merely un-refused.
    expect(socket.sent.some((frame) => frame.kind === 'CampaignSnapshot')).toBe(
      true,
    );
  });

  it('records the host as the gm seat', async () => {
    const socket = new MockWireSocket();
    const registry = await makeRegistry();
    const membership = fakeMembership();

    await bindCampaignSyncConnection({
      socket,
      registry,
      matchId: 'match-campaign',
      verifiedPlayerId: 'pid_host',
      logger: quietLogger,
      replicaStore: null,
      membership,
    });
    socket.inbound({
      kind: 'CampaignJoin',
      matchId: 'match-campaign',
      ts: nowIso(),
      playerId: 'pid_host',
      role: 'host',
      roomCode: 'ABC234',
    });
    await flushAsyncHandlers();

    expect(membership.bound).toContainEqual({
      participantId: 'pid_host',
      seat: 'gm',
    });
  });

  it('refuses a campaign envelope claiming another player before any payload', async () => {
    // The campaign socket guards EVERY inbound kind at one place rather
    // than per-kind, so the host-intent handler downstream can compare
    // `envelope.playerId` to the registered host and still be safe. That
    // safety is entirely borrowed from this check - a proof of the
    // downstream comparison would prove nothing without it.
    const socket = new MockWireSocket();
    const registry = await makeRegistry();

    await bindCampaignSyncConnection({
      socket,
      registry,
      matchId: 'match-campaign',
      verifiedPlayerId: 'pid_guest',
      logger: quietLogger,
      replicaStore: null,
    });
    socket.inbound({
      kind: 'CampaignHostIntent',
      matchId: 'match-campaign',
      ts: nowIso(),
      playerId: 'pid_host',
      intent: {
        kind: 'AdvanceDay',
        campaignId: 'campaign-sync',
        intentId: 'intent-impersonated',
        payload: { days: 1 },
      },
    });
    await flushAsyncHandlers();

    expect(sawError(socket, 'AUTH_REJECTED', 'player-mismatch')).toBe(true);
    expect(socket.closes[0]).toMatchObject({ reason: 'player-mismatch' });
    // No campaign state reached the impersonator - not a snapshot, not
    // an event, not the pending-proposal list.
    expect(
      socket.sent.every(
        (message) => message.kind === 'Error' || message.kind === 'Close',
      ),
    ).toBe(true);
  });

  async function bindHost(
    registry: CampaignHostRegistry,
    socket: MockWireSocket,
  ): Promise<void> {
    await bindCampaignSyncConnection({
      socket,
      registry,
      matchId: 'match-campaign',
      verifiedPlayerId: 'pid_host',
      logger: quietLogger,
      replicaStore: null,
    });
    socket.inbound({
      kind: 'CampaignJoin',
      matchId: 'match-campaign',
      ts: nowIso(),
      playerId: 'pid_host',
      role: 'host',
    });
    await flushAsyncHandlers();
  }

  it('pauses the campaign when the GM connection drops', async () => {
    // Authority belongs to the GM's connection. Losing it must stop the
    // campaign rather than carry on without the only participant
    // entitled to run it.
    const registry = await makeRegistry();
    const gm = new MockWireSocket();
    await bindHost(registry, gm);
    expect(registry.get('match-campaign')?.syncSession.isPaused()).toBe(false);

    gm.close();
    await flushAsyncHandlers();

    expect(registry.get('match-campaign')?.syncSession.isPaused()).toBe(true);
  });

  it('refuses a player command while the GM is absent', async () => {
    // The pause has to bite, or it is only a label. A player who stayed
    // connected keeps PLAYER authority and nothing more.
    const registry = await makeRegistry();
    const gm = new MockWireSocket();
    await bindHost(registry, gm);

    const player = new MockWireSocket();
    await bindCampaignSyncConnection({
      socket: player,
      registry,
      matchId: 'match-campaign',
      verifiedPlayerId: 'pid_guest',
      logger: quietLogger,
      replicaStore: null,
      membership: fakeMembership({ active: ['pid_guest'] }),
    });
    player.inbound({
      kind: 'CampaignJoin',
      matchId: 'match-campaign',
      ts: nowIso(),
      playerId: 'pid_guest',
      role: 'guest',
    });
    await flushAsyncHandlers();

    gm.close();
    await flushAsyncHandlers();
    player.sent.length = 0;

    player.inbound({
      kind: 'CampaignProposal',
      matchId: 'match-campaign',
      ts: nowIso(),
      playerId: 'pid_guest',
      proposal: { kind: 'AdvanceDay', payload: {} },
    });
    await flushAsyncHandlers();

    expect(sawError(player, 'MATCH_PAUSED', 'campaign-paused-gm-absent')).toBe(
      true,
    );
  });

  it('does not let a player resume the campaign by reconnecting', async () => {
    // No implicit promotion. A player's connection arriving is not the
    // GM's, so the pause must survive it - otherwise losing the GM and
    // rejoining as a player would quietly hand the campaign back.
    const registry = await makeRegistry();
    const gm = new MockWireSocket();
    await bindHost(registry, gm);
    gm.close();
    await flushAsyncHandlers();

    const player = new MockWireSocket();
    await bindCampaignSyncConnection({
      socket: player,
      registry,
      matchId: 'match-campaign',
      verifiedPlayerId: 'pid_guest',
      logger: quietLogger,
      replicaStore: null,
      membership: fakeMembership({ active: ['pid_guest'] }),
    });
    player.inbound({
      kind: 'CampaignJoin',
      matchId: 'match-campaign',
      ts: nowIso(),
      playerId: 'pid_guest',
      role: 'guest',
    });
    await flushAsyncHandlers();

    expect(registry.get('match-campaign')?.syncSession.isPaused()).toBe(true);
  });

  it('resumes when the SAME GM reconnects', async () => {
    // The other half of "no promotion": the pause is not a dead end.
    // Authority waited for them and comes back when they do.
    const registry = await makeRegistry();
    const first = new MockWireSocket();
    await bindHost(registry, first);
    first.close();
    await flushAsyncHandlers();
    expect(registry.get('match-campaign')?.syncSession.isPaused()).toBe(true);

    const second = new MockWireSocket();
    await bindHost(registry, second);

    expect(registry.get('match-campaign')?.syncSession.isPaused()).toBe(false);
  });

  it('does not pause while the GM still holds another connection', async () => {
    // A second tab, or a reconnect that lands before the old socket's
    // close is processed. Tracking presence as a flag paused a session
    // the GM was still sitting in; it is a count for exactly this.
    const registry = await makeRegistry();
    const firstTab = new MockWireSocket();
    const secondTab = new MockWireSocket();
    await bindHost(registry, firstTab);
    await bindHost(registry, secondTab);

    firstTab.close();
    await flushAsyncHandlers();

    expect(registry.get('match-campaign')?.syncSession.isPaused()).toBe(false);

    secondTab.close();
    await flushAsyncHandlers();

    expect(registry.get('match-campaign')?.syncSession.isPaused()).toBe(true);
  });

  it('does not pause when a non-GM connection closes', async () => {
    // A player disconnecting is ordinary. Only the GM's loss pauses.
    const registry = await makeRegistry();
    const gm = new MockWireSocket();
    await bindHost(registry, gm);

    const player = new MockWireSocket();
    await bindCampaignSyncConnection({
      socket: player,
      registry,
      matchId: 'match-campaign',
      verifiedPlayerId: 'pid_guest',
      logger: quietLogger,
      replicaStore: null,
      membership: fakeMembership({ active: ['pid_guest'] }),
    });
    player.inbound({
      kind: 'CampaignJoin',
      matchId: 'match-campaign',
      ts: nowIso(),
      playerId: 'pid_guest',
      role: 'guest',
    });
    await flushAsyncHandlers();

    player.close();
    await flushAsyncHandlers();

    expect(registry.get('match-campaign')?.syncSession.isPaused()).toBe(false);
  });

  it('cold-recovers a durable member after the invite expired', async () => {
    // Rehydration of a LAUNCHED campaign: the store cleared the code,
    // so the session opens with no invite at all. The member inside it
    // must still get back in - previously the member path re-presented
    // the entry's invite on their behalf, so expiring it locked out
    // exactly the people expiry was never aimed at.
    const registry = new CampaignHostRegistry();
    await registry.register('match-campaign', {
      campaignId: 'campaign-sync',
      hostPlayerId: 'pid_host',
      roomCode: null,
      state: createEmptyCampaignState('campaign-sync'),
    });
    expect(
      registry.get('match-campaign')?.syncSession.getRoomCode(),
    ).toBeNull();

    const socket = new MockWireSocket();
    await bindCampaignSyncConnection({
      socket,
      registry,
      matchId: 'match-campaign',
      verifiedPlayerId: 'pid_guest',
      logger: quietLogger,
      replicaStore: null,
      membership: fakeMembership({ active: ['pid_guest'] }),
    });
    socket.inbound({
      kind: 'CampaignJoin',
      matchId: 'match-campaign',
      ts: nowIso(),
      playerId: 'pid_guest',
      role: 'guest',
    });
    await flushAsyncHandlers();

    expect(socket.sent).not.toContainEqual(
      expect.objectContaining({ kind: 'Error' }),
    );
  });

  it('refuses a newcomer on a campaign whose invite expired', async () => {
    // The control for the row above. A member gets in with nothing; a
    // stranger must not, even holding the code that used to work.
    const registry = new CampaignHostRegistry();
    await registry.register('match-campaign', {
      campaignId: 'campaign-sync',
      hostPlayerId: 'pid_host',
      roomCode: null,
      state: createEmptyCampaignState('campaign-sync'),
    });

    const socket = new MockWireSocket();
    await bindCampaignSyncConnection({
      socket,
      registry,
      matchId: 'match-campaign',
      verifiedPlayerId: 'pid_stranger',
      logger: quietLogger,
      replicaStore: null,
      membership: fakeMembership(),
    });
    socket.inbound({
      kind: 'CampaignJoin',
      matchId: 'match-campaign',
      ts: nowIso(),
      playerId: 'pid_stranger',
      role: 'guest',
      roomCode: 'ABC234',
    });
    await flushAsyncHandlers();

    expect(socket.sent).toContainEqual(
      expect.objectContaining({ kind: 'Error', code: 'UNKNOWN_MATCH' }),
    );
  });

  it('lets a durable member cold-reconnect with no room code at all', async () => {
    // The reconnection a page reload produces. The first join is an
    // invited newcomer; the SECOND presents no code whatsoever, which is
    // the situation after a client loses whatever it had cached. Before
    // durable membership this was simply a rejected join.
    const registry = await makeRegistry();
    const membership = fakeMembership();

    const first = new MockWireSocket();
    await bindCampaignSyncConnection({
      socket: first,
      registry,
      matchId: 'match-campaign',
      verifiedPlayerId: 'pid_guest',
      logger: quietLogger,
      replicaStore: null,
      membership,
    });
    first.inbound({
      kind: 'CampaignJoin',
      matchId: 'match-campaign',
      ts: nowIso(),
      playerId: 'pid_guest',
      role: 'guest',
      roomCode: 'ABC234',
    });
    await flushAsyncHandlers();
    expect(membership.bound).toContainEqual({
      participantId: 'pid_guest',
      seat: 'player',
    });

    // Cold restart of the client: brand new socket, no room code.
    const reconnected = new MockWireSocket();
    await bindCampaignSyncConnection({
      socket: reconnected,
      registry,
      matchId: 'match-campaign',
      verifiedPlayerId: 'pid_guest',
      logger: quietLogger,
      replicaStore: null,
      membership,
    });
    reconnected.inbound({
      kind: 'CampaignJoin',
      matchId: 'match-campaign',
      ts: nowIso(),
      playerId: 'pid_guest',
      role: 'guest',
    });
    await flushAsyncHandlers();

    expect(reconnected.sent).not.toContainEqual(
      expect.objectContaining({ kind: 'Error' }),
    );
  });

  it('still refuses a stranger who presents no room code', async () => {
    // The control. Without it, the row above would pass against a server
    // that had simply stopped checking anything at all.
    const socket = new MockWireSocket();
    const registry = await makeRegistry();

    await bindCampaignSyncConnection({
      socket,
      registry,
      matchId: 'match-campaign',
      verifiedPlayerId: 'pid_stranger',
      logger: quietLogger,
      replicaStore: null,
      membership: fakeMembership(),
    });
    socket.inbound({
      kind: 'CampaignJoin',
      matchId: 'match-campaign',
      ts: nowIso(),
      playerId: 'pid_stranger',
      role: 'guest',
    });
    await flushAsyncHandlers();

    expect(socket.sent).toContainEqual(
      expect.objectContaining({ kind: 'Error', code: 'UNKNOWN_MATCH' }),
    );
  });

  it('does not fan out to a socket whose join was rejected', async () => {
    // `addSocketToMatch` runs as the FIRST statement of the join
    // handler, before the room code is checked. A guest who presents the
    // wrong code is told UNKNOWN_MATCH and the handler returns - but the
    // socket is already in the broadcast set and nothing removes it, so
    // it keeps receiving every campaign event for a campaign it was
    // refused entry to. Umbrella 6.1: authenticated durable membership
    // must precede registration as a fan-out recipient.
    const rejected = new MockWireSocket();
    const host = new MockWireSocket();
    const registry = await makeRegistry();

    await bindCampaignSyncConnection({
      socket: rejected,
      registry,
      matchId: 'match-campaign',
      verifiedPlayerId: 'pid_intruder',
      logger: quietLogger,
      replicaStore: null,
    });
    rejected.inbound({
      kind: 'CampaignJoin',
      matchId: 'match-campaign',
      ts: nowIso(),
      playerId: 'pid_intruder',
      role: 'guest',
      roomCode: 'ZZZ999',
    });
    await flushAsyncHandlers();

    // The refusal itself is correct and stays correct.
    expect(rejected.sent).toContainEqual(
      expect.objectContaining({ kind: 'Error', code: 'UNKNOWN_MATCH' }),
    );
    const afterRefusal = rejected.sent.length;

    // Now drive a real broadcast on that campaign.
    await bindCampaignSyncConnection({
      socket: host,
      registry,
      matchId: 'match-campaign',
      verifiedPlayerId: 'pid_host',
      logger: quietLogger,
      replicaStore: null,
    });
    host.inbound({
      kind: 'CampaignJoin',
      matchId: 'match-campaign',
      ts: nowIso(),
      playerId: 'pid_host',
      role: 'host',
      roomCode: 'ABC234',
    });
    await flushAsyncHandlers();
    host.inbound({
      kind: 'CampaignProposal',
      matchId: 'match-campaign',
      ts: nowIso(),
      playerId: 'pid_host',
      proposal: {
        proposalId: 'proposal-leak',
        campaignId: 'campaign-sync',
        proposingPlayerId: 'pid_host',
        ts: nowIso(),
        intent: {
          kind: 'SpendFunds',
          campaignId: 'campaign-sync',
          intentId: 'intent-leak',
          payload: { amount: 1_000, reason: 'Ammo' },
        },
      },
    });
    await flushAsyncHandlers();

    // The refused socket must have received NOTHING further.
    expect(rejected.sent.slice(afterRefusal)).toEqual([]);
  });

  it('refuses a proposal attributed to someone else', async () => {
    // The inbound guard proves `envelope.playerId`, but the proposal
    // carries its OWN `proposingPlayerId` one level down, and that was
    // never compared. The GM's review screen renders it verbatim, so an
    // unchecked field decides whose name the GM sees next to a request
    // they are about to approve.
    const registry = await makeRegistry('host-review');
    const guest = new MockWireSocket();
    await bindCampaignSyncConnection({
      socket: guest,
      registry,
      matchId: 'match-campaign',
      verifiedPlayerId: 'pid_guest',
      logger: quietLogger,
      replicaStore: null,
    });
    guest.inbound({
      kind: 'CampaignJoin',
      matchId: 'match-campaign',
      ts: nowIso(),
      playerId: 'pid_guest',
      role: 'guest',
      roomCode: 'ABC234',
    });
    await flushAsyncHandlers();
    guest.sent.length = 0;

    guest.inbound({
      kind: 'CampaignProposal',
      matchId: 'match-campaign',
      ts: nowIso(),
      // Matches the proved identity, so the envelope guard is satisfied.
      playerId: 'pid_guest',
      proposal: {
        proposalId: 'proposal-misattributed',
        campaignId: 'campaign-sync',
        // ...but the proposal names someone else as its author.
        proposingPlayerId: 'pid_other',
        ts: nowIso(),
        intent: {
          kind: 'SpendFunds',
          campaignId: 'campaign-sync',
          intentId: 'intent-misattributed',
          payload: { amount: 750_000, reason: 'Not my idea' },
        },
      },
    });
    await flushAsyncHandlers();

    expect(
      sawError(guest, 'AUTH_REJECTED', 'campaign-proposal-attribution'),
    ).toBe(true);
    // Refusing must also mean not queueing it for the GM to see.
    expect(
      registry.get('match-campaign')?.arbiter.getPendingProposals().length,
    ).toBe(0);
  });

  it('still accepts a proposal a player attributes to themselves', async () => {
    // The control. A guard that refused every proposal would pass the
    // row above while removing the feature it protects.
    const registry = await makeRegistry('host-review');
    const guest = new MockWireSocket();
    await bindCampaignSyncConnection({
      socket: guest,
      registry,
      matchId: 'match-campaign',
      verifiedPlayerId: 'pid_guest',
      logger: quietLogger,
      replicaStore: null,
    });
    guest.inbound({
      kind: 'CampaignJoin',
      matchId: 'match-campaign',
      ts: nowIso(),
      playerId: 'pid_guest',
      role: 'guest',
      roomCode: 'ABC234',
    });
    await flushAsyncHandlers();
    guest.sent.length = 0;

    guest.inbound({
      kind: 'CampaignProposal',
      matchId: 'match-campaign',
      ts: nowIso(),
      playerId: 'pid_guest',
      proposal: {
        proposalId: 'proposal-own',
        campaignId: 'campaign-sync',
        proposingPlayerId: 'pid_guest',
        ts: nowIso(),
        intent: {
          kind: 'SpendFunds',
          campaignId: 'campaign-sync',
          intentId: 'intent-own',
          payload: { amount: 1_000, reason: 'Ammo' },
        },
      },
    });
    await flushAsyncHandlers();

    expect(
      sawError(guest, 'AUTH_REJECTED', 'campaign-proposal-attribution'),
    ).toBe(false);
    expect(
      registry.get('match-campaign')?.arbiter.getPendingProposals().length,
    ).toBe(1);
  });

  it('refuses a decision from anyone but the GM', async () => {
    // GM review is the entire point of `host-review` mode. Without this
    // a guest could submit a proposal and immediately approve their own,
    // committing it to the campaign with the GM never consulted.
    const registry = await makeRegistry('host-review');
    const guest = new MockWireSocket();
    await bindCampaignSyncConnection({
      socket: guest,
      registry,
      matchId: 'match-campaign',
      verifiedPlayerId: 'pid_guest',
      logger: quietLogger,
      replicaStore: null,
    });
    guest.inbound({
      kind: 'CampaignJoin',
      matchId: 'match-campaign',
      ts: nowIso(),
      playerId: 'pid_guest',
      role: 'guest',
      roomCode: 'ABC234',
    });
    await flushAsyncHandlers();

    guest.inbound({
      kind: 'CampaignProposal',
      matchId: 'match-campaign',
      ts: nowIso(),
      playerId: 'pid_guest',
      proposal: {
        proposalId: 'proposal-self-approved',
        campaignId: 'campaign-sync',
        proposingPlayerId: 'pid_guest',
        ts: nowIso(),
        intent: {
          kind: 'SpendFunds',
          campaignId: 'campaign-sync',
          intentId: 'intent-self-approved',
          payload: { amount: 500_000, reason: 'Helping myself' },
        },
      },
    });
    await flushAsyncHandlers();
    guest.sent.length = 0;

    // The guest now approves their OWN proposal.
    guest.inbound({
      kind: 'CampaignDecision',
      matchId: 'match-campaign',
      ts: nowIso(),
      playerId: 'pid_guest',
      proposalId: 'proposal-self-approved',
      decision: 'approve',
    });
    await flushAsyncHandlers();

    expect(
      sawError(guest, 'AUTH_REJECTED', 'campaign-decision-requires-gm'),
    ).toBe(true);
    // And nothing was decided: the proposal is still waiting for the GM.
    expect(
      registry.get('match-campaign')?.arbiter.getPendingProposals().length,
    ).toBe(1);
  });

  it('still lets the GM decide', async () => {
    // The control. A guard that refused everyone would pass the row
    // above and break the feature it is protecting.
    const registry = await makeRegistry('host-review');
    const guest = new MockWireSocket();
    await bindCampaignSyncConnection({
      socket: guest,
      registry,
      matchId: 'match-campaign',
      verifiedPlayerId: 'pid_guest',
      logger: quietLogger,
      replicaStore: null,
    });
    guest.inbound({
      kind: 'CampaignJoin',
      matchId: 'match-campaign',
      ts: nowIso(),
      playerId: 'pid_guest',
      role: 'guest',
      roomCode: 'ABC234',
    });
    await flushAsyncHandlers();
    guest.inbound({
      kind: 'CampaignProposal',
      matchId: 'match-campaign',
      ts: nowIso(),
      playerId: 'pid_guest',
      proposal: {
        proposalId: 'proposal-for-gm',
        campaignId: 'campaign-sync',
        proposingPlayerId: 'pid_guest',
        ts: nowIso(),
        intent: {
          kind: 'SpendFunds',
          campaignId: 'campaign-sync',
          intentId: 'intent-for-gm',
          payload: { amount: 1_000, reason: 'Ammo' },
        },
      },
    });
    await flushAsyncHandlers();

    const gm = new MockWireSocket();
    await bindCampaignSyncConnection({
      socket: gm,
      registry,
      matchId: 'match-campaign',
      verifiedPlayerId: 'pid_host',
      logger: quietLogger,
      replicaStore: null,
    });
    gm.inbound({
      kind: 'CampaignJoin',
      matchId: 'match-campaign',
      ts: nowIso(),
      playerId: 'pid_host',
      role: 'host',
    });
    await flushAsyncHandlers();
    gm.inbound({
      kind: 'CampaignDecision',
      matchId: 'match-campaign',
      ts: nowIso(),
      playerId: 'pid_host',
      proposalId: 'proposal-for-gm',
      decision: 'approve',
    });
    await flushAsyncHandlers();

    expect(sawError(gm, 'AUTH_REJECTED', 'campaign-decision-requires-gm')).toBe(
      false,
    );
    expect(
      registry.get('match-campaign')?.arbiter.getPendingProposals().length,
    ).toBe(0);
  });

  it('routes a guest proposal through the server arbiter and broadcasts committed events', async () => {
    const socket = new MockWireSocket();
    const registry = await makeRegistry();

    await bindCampaignSyncConnection({
      socket,
      registry,
      matchId: 'match-campaign',
      verifiedPlayerId: 'pid_guest',
      logger: quietLogger,
      replicaStore: null,
    });
    socket.inbound({
      kind: 'CampaignJoin',
      matchId: 'match-campaign',
      ts: nowIso(),
      playerId: 'pid_guest',
      role: 'guest',
      roomCode: 'ABC234',
    });
    await flushAsyncHandlers();

    socket.inbound({
      kind: 'CampaignProposal',
      matchId: 'match-campaign',
      ts: nowIso(),
      playerId: 'pid_guest',
      proposal: {
        proposalId: 'proposal-spend',
        campaignId: 'campaign-sync',
        proposingPlayerId: 'pid_guest',
        ts: nowIso(),
        intent: {
          kind: 'SpendFunds',
          campaignId: 'campaign-sync',
          intentId: 'intent-spend',
          payload: { amount: 50_000, reason: 'Ammo' },
        },
      },
    });
    await flushAsyncHandlers();

    expect(socket.sent).toContainEqual(
      expect.objectContaining({
        kind: 'CampaignDecision',
        proposalId: 'proposal-spend',
        result: expect.objectContaining({ status: 'committed' }),
      }),
    );
    expect(socket.sent).toContainEqual(
      expect.objectContaining({
        kind: 'CampaignEvent',
        event: expect.objectContaining({ type: 'FundsChanged' }),
      }),
    );
  });

  it('routes an authenticated host intent through the registered host and pushes the guest event', async () => {
    const hostSocket = new MockWireSocket();
    const guestSocket = new MockWireSocket();
    const registry = await makeRegistry();
    await bindCampaignSyncConnection({
      socket: hostSocket,
      registry,
      matchId: 'match-campaign',
      verifiedPlayerId: 'pid_host',
      logger: quietLogger,
      replicaStore: null,
    });
    await bindCampaignSyncConnection({
      socket: guestSocket,
      registry,
      matchId: 'match-campaign',
      verifiedPlayerId: 'pid_guest',
      logger: quietLogger,
      replicaStore: null,
    });
    hostSocket.inbound({
      kind: 'CampaignJoin',
      matchId: 'match-campaign',
      ts: nowIso(),
      playerId: 'pid_host',
      role: 'host',
      roomCode: 'ABC234',
    });
    guestSocket.inbound({
      kind: 'CampaignJoin',
      matchId: 'match-campaign',
      ts: nowIso(),
      playerId: 'pid_guest',
      role: 'guest',
      roomCode: 'ABC234',
    });
    await flushAsyncHandlers();
    guestSocket.sent.length = 0;

    hostSocket.inbound({
      kind: 'CampaignHostIntent',
      matchId: 'match-campaign',
      ts: nowIso(),
      playerId: 'pid_host',
      intent: {
        kind: 'AdvanceDay',
        campaignId: 'campaign-sync',
        intentId: 'host-day-1',
        payload: { days: 1 },
      },
    });
    await flushAsyncHandlers();

    expect(registry.get('match-campaign')?.host.getState().day).toBe(1);
    expect(guestSocket.sent).toContainEqual(
      expect.objectContaining({
        kind: 'CampaignEvent',
        event: expect.objectContaining({
          type: 'CampaignDayAdvanced',
          payload: { newDay: 1 },
        }),
      }),
    );
  });

  it('rejects a guest attempting to send a host-only campaign intent', async () => {
    const guestSocket = new MockWireSocket();
    const registry = await makeRegistry();
    await bindCampaignSyncConnection({
      socket: guestSocket,
      registry,
      matchId: 'match-campaign',
      verifiedPlayerId: 'pid_guest',
      logger: quietLogger,
      replicaStore: null,
    });

    guestSocket.inbound({
      kind: 'CampaignHostIntent',
      matchId: 'match-campaign',
      ts: nowIso(),
      playerId: 'pid_guest',
      intent: {
        kind: 'AdvanceDay',
        campaignId: 'campaign-sync',
        intentId: 'guest-day-1',
        payload: { days: 1 },
      },
    });
    await flushAsyncHandlers();

    expect(registry.get('match-campaign')?.host.getState().day).toBe(0);
    expect(guestSocket.sent).toContainEqual(
      expect.objectContaining({
        kind: 'Error',
        code: 'AUTH_REJECTED',
        intentId: 'guest-day-1',
      }),
    );
  });

  it('broadcasts post-battle reconciliation events to joined campaign-sync guests', async () => {
    const guestSocket = new MockWireSocket();
    const registry = await makeRegistry();

    await bindCampaignSyncConnection({
      socket: guestSocket,
      registry,
      matchId: 'match-campaign',
      verifiedPlayerId: 'pid_guest',
      logger: quietLogger,
      replicaStore: null,
    });
    guestSocket.inbound({
      kind: 'CampaignJoin',
      matchId: 'match-campaign',
      ts: nowIso(),
      playerId: 'pid_guest',
      role: 'guest',
      roomCode: 'ABC234',
    });
    await flushAsyncHandlers();
    guestSocket.sent.length = 0;

    const entry = registry.get('match-campaign');
    expect(entry).not.toBeNull();
    await reconcileCoopBattle(entry!.host, {
      campaignId: 'campaign-sync',
      matchId: 'battle-post-1',
      fundsDelta: -25_000,
      fundsReason: 'Repair costs',
      salvageValue: 75_000,
      rosterChanges: [
        {
          unitId: 'unit-A',
          designation: 'Atlas AS7-D',
          status: 'damaged',
        },
      ],
    });
    await flushAsyncHandlers();

    const eventTypes = guestSocket.sent
      .filter((message) => message.kind === 'CampaignEvent')
      .map((message) => readCampaignEventType(message));
    expect(eventTypes).toEqual([
      'FundsChanged',
      'SalvageAllocated',
      'RosterUnitChanged',
    ]);
  });

  it('round-trips a host-review proposal from guest to host decision', async () => {
    const hostSocket = new MockWireSocket();
    const guestSocket = new MockWireSocket();
    const registry = await makeRegistry('host-review');

    await bindCampaignSyncConnection({
      socket: hostSocket,
      registry,
      matchId: 'match-campaign',
      verifiedPlayerId: 'pid_host',
      logger: quietLogger,
      replicaStore: null,
    });
    await bindCampaignSyncConnection({
      socket: guestSocket,
      registry,
      matchId: 'match-campaign',
      verifiedPlayerId: 'pid_guest',
      logger: quietLogger,
      replicaStore: null,
    });
    hostSocket.inbound({
      kind: 'CampaignJoin',
      matchId: 'match-campaign',
      ts: nowIso(),
      playerId: 'pid_host',
      role: 'host',
      roomCode: 'ABC234',
    });
    guestSocket.inbound({
      kind: 'CampaignJoin',
      matchId: 'match-campaign',
      ts: nowIso(),
      playerId: 'pid_guest',
      role: 'guest',
      roomCode: 'ABC234',
    });
    await flushAsyncHandlers();

    guestSocket.inbound({
      kind: 'CampaignProposal',
      matchId: 'match-campaign',
      ts: nowIso(),
      playerId: 'pid_guest',
      proposal: {
        proposalId: 'proposal-spend',
        campaignId: 'campaign-sync',
        proposingPlayerId: 'pid_guest',
        ts: nowIso(),
        intent: {
          kind: 'SpendFunds',
          campaignId: 'campaign-sync',
          intentId: 'intent-spend',
          payload: { amount: 50_000, reason: 'Ammo' },
        },
      },
    });
    await flushAsyncHandlers();

    expect(guestSocket.sent).toContainEqual(
      expect.objectContaining({
        kind: 'CampaignDecision',
        proposalId: 'proposal-spend',
        result: { status: 'pending', proposalId: 'proposal-spend' },
      }),
    );
    expect(hostSocket.sent).toContainEqual(
      expect.objectContaining({
        kind: 'CampaignProposal',
        proposal: expect.objectContaining({
          proposal: expect.objectContaining({ proposalId: 'proposal-spend' }),
          balanceAtSubmit: 1_000_000,
          effectSummary: expect.stringContaining('Spend'),
        }),
      }),
    );

    hostSocket.inbound({
      kind: 'CampaignDecision',
      matchId: 'match-campaign',
      ts: nowIso(),
      playerId: 'pid_host',
      proposalId: 'proposal-spend',
      decision: 'approve',
    });
    await flushAsyncHandlers();

    expect(guestSocket.sent).toContainEqual(
      expect.objectContaining({
        kind: 'CampaignDecision',
        proposalId: 'proposal-spend',
        result: expect.objectContaining({ status: 'committed' }),
      }),
    );
    expect(hostSocket.sent).toContainEqual(
      expect.objectContaining({
        kind: 'CampaignEvent',
        event: expect.objectContaining({ type: 'FundsChanged' }),
      }),
    );
  });

  it('rejects unknown campaign frame kinds loudly', async () => {
    const socket = new MockWireSocket();
    const registry = await makeRegistry();

    await bindCampaignSyncConnection({
      socket,
      registry,
      matchId: 'match-campaign',
      verifiedPlayerId: 'pid_guest',
      logger: quietLogger,
      replicaStore: null,
    });
    socket.inbound({
      kind: 'CampaignTimeTravel',
      matchId: 'match-campaign',
      ts: nowIso(),
      playerId: 'pid_guest',
    });
    await flushAsyncHandlers();

    expect(socket.sent).toContainEqual(
      expect.objectContaining({
        kind: 'Error',
        code: 'BAD_ENVELOPE',
        reason: expect.stringContaining('Unknown campaign-sync frame kind'),
      }),
    );
  });

  it('honours durable force ownership from a previous process', async () => {
    // The in-memory rule only knows about claims made THIS session. On
    // the far side of a restart those records are gone and the force is
    // free for the taking, so the durable holder is the only thing that
    // can still say no.
    const guestSocket = new MockWireSocket();
    const registry = await makeRegistry();
    const asked: unknown[] = [];
    const forceClaims = {
      // Stands in for two different worlds rather than two forces: the
      // first ask finds the force durably held by someone else, the
      // second finds it free. Using one force id keeps the shared
      // fixture untouched.
      claim: (input: { forceId: string }) => {
        asked.push(input);
        return asked.length === 1
          ? ({ kind: 'held-by-other' } as const)
          : ({ kind: 'claimed' } as const);
      },
    };

    await bindCampaignSyncConnection({
      socket: guestSocket,
      registry,
      matchId: 'match-campaign',
      verifiedPlayerId: 'pid_guest',
      logger: quietLogger,
      replicaStore: null,
      forceClaims,
    });
    guestSocket.inbound({
      kind: 'CampaignJoin',
      matchId: 'match-campaign',
      ts: nowIso(),
      playerId: 'pid_guest',
      role: 'guest',
      roomCode: 'ABC234',
    });
    await flushAsyncHandlers();
    const records = () =>
      registry
        .get('match-campaign')
        ?.getParticipationRecords('mission-alpha') ?? [];

    guestSocket.sent.length = 0;
    participate(guestSocket, {
      missionId: 'mission-alpha',
      forceId: 'force-guest',
      choice: 'deploy',
    });
    await flushAsyncHandlers();

    expect(asked).toHaveLength(1);
    expect(sawError(guestSocket, 'INVALID_INTENT', 'foreign-force')).toBe(true);
    // Refused means not published: a broadcast would tell the GM this
    // player is deploying a force they were just denied.
    expect(records()).toHaveLength(0);

    // Control: a force nobody durably holds still goes through, so the
    // port cannot be refusing everything.
    guestSocket.sent.length = 0;
    participate(guestSocket, {
      missionId: 'mission-alpha',
      forceId: 'force-guest',
      choice: 'deploy',
    });
    await flushAsyncHandlers();

    expect(sawError(guestSocket, 'INVALID_INTENT', 'foreign-force')).toBe(
      false,
    );
    expect(records()).toHaveLength(1);
  });

  it('broadcasts participation choices and records them in the registry', async () => {
    const hostSocket = new MockWireSocket();
    const guestSocket = new MockWireSocket();
    const registry = await makeRegistry();
    const choice = {
      missionId: 'mission-alpha',
      forceId: 'force-guest',
      choice: 'deploy',
    };

    await bindCampaignSyncConnection({
      socket: hostSocket,
      registry,
      matchId: 'match-campaign',
      verifiedPlayerId: 'pid_host',
      logger: quietLogger,
      replicaStore: null,
    });
    await bindCampaignSyncConnection({
      socket: guestSocket,
      registry,
      matchId: 'match-campaign',
      verifiedPlayerId: 'pid_guest',
      logger: quietLogger,
      replicaStore: null,
    });
    hostSocket.inbound({
      kind: 'CampaignJoin',
      matchId: 'match-campaign',
      ts: nowIso(),
      playerId: 'pid_host',
      role: 'host',
      roomCode: 'ABC234',
    });
    guestSocket.inbound({
      kind: 'CampaignJoin',
      matchId: 'match-campaign',
      ts: nowIso(),
      playerId: 'pid_guest',
      role: 'guest',
      roomCode: 'ABC234',
    });
    await flushAsyncHandlers();
    const records = () =>
      registry
        .get('match-campaign')
        ?.getParticipationRecords('mission-alpha') ?? [];

    participate(guestSocket, choice);
    await flushAsyncHandlers();
    const accepted = records()[0];
    participate(guestSocket, choice);
    await flushAsyncHandlers();
    expect(records()).toHaveLength(1);

    guestSocket.sent.length = 0;
    participate(guestSocket, {
      missionId: 'mission-alpha',
      playerId: 'pid_host',
      role: 'host',
      choice: 'deploy',
      force: { id: 'force-guest', unitIds: ['unit-forged'] },
    });
    await flushAsyncHandlers();
    const forgedIdentityRejected = sawError(guestSocket, 'BAD_ENVELOPE');
    const fullForceRejected = forgedIdentityRejected && records().length === 1;

    guestSocket.sent.length = 0;
    participate(guestSocket, { ...choice, forceId: 'foreign-force' });
    await flushAsyncHandlers();
    const foreignForceRejected = sawError(
      guestSocket,
      'INVALID_INTENT',
      'foreign-force',
    );

    registry.get('match-campaign')?.advanceRevision(1);
    guestSocket.sent.length = 0;
    participate(guestSocket, choice);
    await flushAsyncHandlers();
    const staleRevisionRejected = sawError(
      guestSocket,
      'INVALID_INTENT',
      'stale-revision',
    );

    expect(hostSocket.sent).toContainEqual(
      expect.objectContaining({
        kind: 'CampaignParticipation',
        playerId: 'pid_guest',
        role: 'guest',
        participation: expect.objectContaining(choice),
      }),
    );
    expect(records()).toEqual([
      expect.objectContaining({
        playerId: 'pid_guest',
        role: 'guest',
        choice: 'deploy',
      }),
    ]);
    const assertions = {
      'authorizedChoiceAccepted===true':
        accepted?.choice === 'deploy' && accepted.force.id === 'force-guest',
      'foreignForceRejected===true': foreignForceRejected,
      'forgedIdentityRejected===true': forgedIdentityRejected,
      'fullForceRejected===true': fullForceRejected,
      'serverPlayerDerived===true': accepted?.playerId === 'pid_guest',
      'serverRoleDerived===true': accepted?.role === 'guest',
      'staleRevisionRejected===true': staleRevisionRejected,
    };
    if (Object.values(assertions).some((value) => value !== true)) {
      throw new Error(
        `wave assertion checks failed: ${JSON.stringify(assertions)}`,
      );
    }
    const artifactDir = process.env.CAMP01_ARTIFACT_DIR;
    const runId = process.env.CAMP01_RUN_ID;
    const wavePath =
      artifactDir && runId ? path.join(artifactDir, 'wave-result.json') : null;
    if (wavePath && !fs.existsSync(wavePath)) {
      fs.writeFileSync(
        wavePath,
        `${JSON.stringify({ schema: 'camp01-wave-result/v1', wave: 'camp-01c', runId, status: 'passed', assertions })}\n`,
        { flag: 'wx' },
      );
    }
  });

  describe('campaign progression requires convergence', () => {
    async function bindPlayer(
      registry: CampaignHostRegistry,
      playerId: string,
      extras: {
        membership?: ReturnType<typeof fakeMembership>;
      } = {},
    ): Promise<MockWireSocket> {
      const socket = new MockWireSocket();
      await bindCampaignSyncConnection({
        socket,
        registry,
        matchId: 'match-campaign',
        verifiedPlayerId: playerId,
        logger: quietLogger,
        replicaStore: null,
        membership: extras.membership,
      });
      return socket;
    }

    function joinAs(
      socket: MockWireSocket,
      playerId: string,
      role: 'host' | 'guest',
      extras: { lastSeq?: number; roomCode?: string } = {},
    ): void {
      socket.inbound({
        kind: 'CampaignJoin',
        matchId: 'match-campaign',
        ts: nowIso(),
        playerId,
        role,
        ...(role === 'guest' || extras.roomCode !== undefined
          ? { roomCode: extras.roomCode ?? 'ABC234' }
          : {}),
        ...(extras.lastSeq !== undefined ? { lastSeq: extras.lastSeq } : {}),
      });
    }

    function sendHostIntent(
      socket: MockWireSocket,
      intent: {
        kind: 'AdvanceDay' | 'SpendFunds';
        intentId: string;
        payload: Record<string, unknown>;
      },
    ): void {
      socket.inbound({
        kind: 'CampaignHostIntent',
        matchId: 'match-campaign',
        ts: nowIso(),
        playerId: 'pid_host',
        intent: {
          kind: intent.kind,
          campaignId: 'campaign-sync',
          intentId: intent.intentId,
          payload: intent.payload,
        },
      } as Record<string, unknown>);
    }

    function sendCampaignAck(
      socket: MockWireSocket,
      playerId: string,
      revision: number,
    ): void {
      socket.inbound({
        kind: 'CampaignAck',
        matchId: 'match-campaign',
        ts: nowIso(),
        playerId,
        campaignId: 'campaign-sync',
        revision,
      });
    }

    function readEventSequence(message: IServerMessage): number | null {
      if (message.kind !== 'CampaignEvent') return null;
      if (typeof message.event !== 'object' || message.event === null) {
        return null;
      }
      const sequence = (message.event as { sequence?: unknown }).sequence;
      return typeof sequence === 'number' ? sequence : null;
    }

    function latestGuestEventSequence(socket: MockWireSocket): number {
      const sequences = socket.sent
        .map(readEventSequence)
        .filter((sequence): sequence is number => sequence !== null);
      expect(sequences.length).toBeGreaterThan(0);
      return Math.max(...sequences);
    }

    function sawNotConverged(
      socket: MockWireSocket,
      playerId: string,
    ): boolean {
      return socket.sent.some(
        (message) =>
          message.kind === 'Error' &&
          message.code === 'CAMPAIGN_NOT_CONVERGED' &&
          typeof message.reason === 'string' &&
          message.reason.includes(playerId) &&
          message.reason.includes('requiredRevision'),
      );
    }

    async function openHostAndGuest(
      arbitrationMode: 'auto-approve' | 'host-review' = 'auto-approve',
      extras: {
        membership?: ReturnType<typeof fakeMembership>;
      } = {},
    ): Promise<{
      registry: CampaignHostRegistry;
      host: MockWireSocket;
      guest: MockWireSocket;
    }> {
      const registry = await makeRegistry(arbitrationMode);
      const host = await bindPlayer(registry, 'pid_host');
      const guest = await bindPlayer(registry, 'pid_guest', extras);
      joinAs(host, 'pid_host', 'host');
      joinAs(guest, 'pid_guest', 'guest');
      await flushAsyncHandlers();
      return { registry, host, guest };
    }

    async function putGuestBehind(
      host: MockWireSocket,
      intentId = 'spend-to-diverge',
    ): Promise<void> {
      sendHostIntent(host, {
        kind: 'SpendFunds',
        intentId,
        payload: { amount: 1_000, reason: 'Parts' },
      });
      await flushAsyncHandlers();
    }

    it('refuses AdvanceDay while a guest is behind on an old ack', async () => {
      const membership = fakeMembership({ active: ['pid_guest'] });
      const { registry, host } = await openHostAndGuest('auto-approve', {
        membership,
      });
      await putGuestBehind(host);

      sendHostIntent(host, {
        kind: 'AdvanceDay',
        intentId: 'advance-blocked',
        payload: { days: 1 },
      });
      await flushAsyncHandlers();

      expect(sawNotConverged(host, 'pid_guest')).toBe(true);
      expect(registry.get('match-campaign')?.host.getState().day).toBe(0);
    });

    it('commits AdvanceDay once every retained participant is converged', async () => {
      const { registry, host } = await openHostAndGuest();

      sendHostIntent(host, {
        kind: 'AdvanceDay',
        intentId: 'advance-converged',
        payload: { days: 1 },
      });
      await flushAsyncHandlers();

      expect(sawError(host, 'CAMPAIGN_NOT_CONVERGED')).toBe(false);
      expect(registry.get('match-campaign')?.host.getState().day).toBe(1);
    });

    it('a CampaignAck from a behind guest lets the previously refused AdvanceDay commit', async () => {
      const { registry, host, guest } = await openHostAndGuest();
      await putGuestBehind(host);
      const revision = latestGuestEventSequence(guest);

      sendHostIntent(host, {
        kind: 'AdvanceDay',
        intentId: 'advance-before-ack',
        payload: { days: 1 },
      });
      await flushAsyncHandlers();
      expect(sawNotConverged(host, 'pid_guest')).toBe(true);
      expect(registry.get('match-campaign')?.host.getState().day).toBe(0);

      sendCampaignAck(guest, 'pid_guest', revision);
      await flushAsyncHandlers();
      host.sent.length = 0;
      sendHostIntent(host, {
        kind: 'AdvanceDay',
        intentId: 'advance-after-ack',
        payload: { days: 1 },
      });
      await flushAsyncHandlers();

      expect(sawError(host, 'CAMPAIGN_NOT_CONVERGED')).toBe(false);
      expect(registry.get('match-campaign')?.host.getState().day).toBe(1);
    });

    it('commits SpendFunds while a guest is behind', async () => {
      const { registry, host } = await openHostAndGuest();
      await putGuestBehind(host);
      const afterFirst = registry
        .get('match-campaign')
        ?.host.getState().balance;

      sendHostIntent(host, {
        kind: 'SpendFunds',
        intentId: 'spend-while-behind',
        payload: { amount: 500, reason: 'Ammo' },
      });
      await flushAsyncHandlers();

      expect(sawError(host, 'CAMPAIGN_NOT_CONVERGED')).toBe(false);
      expect(registry.get('match-campaign')?.host.getState().balance).toBe(
        (afterFirst ?? 0) - 500,
      );
      expect(registry.get('match-campaign')?.host.getState().day).toBe(0);
    });

    it('refuses an auto-approved AdvanceDay proposal while a participant is behind', async () => {
      // In auto-approve mode, SUBMITTING an AdvanceDay proposal commits
      // it immediately - so the gate must run before submission there.
      // The proposal is refused outright, not queued: queuing it would
      // commit it the moment the arbiter saw it.
      const { registry, host, guest } = await openHostAndGuest('auto-approve');
      await putGuestBehind(host);

      guest.inbound({
        kind: 'CampaignProposal',
        matchId: 'match-campaign',
        ts: nowIso(),
        playerId: 'pid_guest',
        proposal: {
          proposalId: 'proposal-auto-advance-blocked',
          campaignId: 'campaign-sync',
          proposingPlayerId: 'pid_guest',
          ts: nowIso(),
          intent: {
            kind: 'AdvanceDay',
            campaignId: 'campaign-sync',
            intentId: 'guest-auto-advance-blocked',
            payload: { days: 1 },
          },
        },
      });
      await flushAsyncHandlers();

      expect(sawNotConverged(guest, 'pid_guest')).toBe(true);
      expect(registry.get('match-campaign')?.host.getState().day).toBe(0);
      expect(
        registry.get('match-campaign')?.arbiter.getPendingProposals().length,
      ).toBe(0);
    });

    it('refuses an approved AdvanceDay proposal while a participant is behind', async () => {
      const { registry, host, guest } = await openHostAndGuest('host-review');
      await putGuestBehind(host);

      guest.inbound({
        kind: 'CampaignProposal',
        matchId: 'match-campaign',
        ts: nowIso(),
        playerId: 'pid_guest',
        proposal: {
          proposalId: 'proposal-advance-blocked',
          campaignId: 'campaign-sync',
          proposingPlayerId: 'pid_guest',
          ts: nowIso(),
          intent: {
            kind: 'AdvanceDay',
            campaignId: 'campaign-sync',
            intentId: 'guest-advance-blocked',
            payload: { days: 1 },
          },
        },
      });
      await flushAsyncHandlers();
      host.inbound({
        kind: 'CampaignDecision',
        matchId: 'match-campaign',
        ts: nowIso(),
        playerId: 'pid_host',
        proposalId: 'proposal-advance-blocked',
        decision: 'approve',
      });
      await flushAsyncHandlers();

      expect(sawNotConverged(host, 'pid_guest')).toBe(true);
      expect(registry.get('match-campaign')?.host.getState().day).toBe(0);
      expect(
        registry.get('match-campaign')?.arbiter.getPendingProposals().length,
      ).toBe(1);
    });

    it('a reconnecting guest must ack the resync tail before AdvanceDay commits', async () => {
      const { registry, host, guest } = await openHostAndGuest();
      guest.close();
      await flushAsyncHandlers();
      await putGuestBehind(host);

      const rejoined = await bindPlayer(registry, 'pid_guest');
      joinAs(rejoined, 'pid_guest', 'guest', { lastSeq: 0 });
      await flushAsyncHandlers();
      expect(rejoined.sent).toContainEqual(
        expect.objectContaining({
          kind: 'CampaignEvent',
          event: expect.objectContaining({ type: 'FundsChanged' }),
        }),
      );
      const revision = latestGuestEventSequence(rejoined);

      sendHostIntent(host, {
        kind: 'AdvanceDay',
        intentId: 'advance-before-resync-ack',
        payload: { days: 1 },
      });
      await flushAsyncHandlers();
      expect(sawNotConverged(host, 'pid_guest')).toBe(true);
      expect(registry.get('match-campaign')?.host.getState().day).toBe(0);

      sendCampaignAck(rejoined, 'pid_guest', revision);
      await flushAsyncHandlers();
      host.sent.length = 0;
      sendHostIntent(host, {
        kind: 'AdvanceDay',
        intentId: 'advance-after-resync-ack',
        payload: { days: 1 },
      });
      await flushAsyncHandlers();

      expect(sawError(host, 'CAMPAIGN_NOT_CONVERGED')).toBe(false);
      expect(registry.get('match-campaign')?.host.getState().day).toBe(1);
    });

    it('answers correction-pending on the same CAMPAIGN_NOT_CONVERGED frame', async () => {
      const { registry, host } = await openHostAndGuest();
      const entry = registry.get('match-campaign');
      expect(entry).not.toBeNull();
      if (entry === null) return;
      jest
        .spyOn(entry.syncSession, 'evaluateScenarioLaunch')
        .mockResolvedValue({
          ok: false,
          reason: 'correction-pending',
          requiredRevision: 4,
          sagaKey: {
            matchId: 'match-1',
            outcomeId: 'outcome-1',
            outcomeVersion: 2,
          },
          state: 'target-pending',
          behind: [],
        });

      sendHostIntent(host, {
        kind: 'AdvanceDay',
        intentId: 'advance-correction-pending',
        payload: { days: 1 },
      });
      await flushAsyncHandlers();

      const error = host.sent.find(
        (message) =>
          message.kind === 'Error' && message.code === 'CAMPAIGN_NOT_CONVERGED',
      );
      expect(error?.kind).toBe('Error');
      if (error?.kind !== 'Error') return;
      expect(error.reason).toContain('correction-pending');
      expect(error.reason).toContain('match-1');
      expect(error.reason).toContain('outcome-1');
      expect(error.reason).toContain('target-pending');
      expect(error.reason).toContain('requiredRevision 4');
    });

    it('answers replacement-artifacts-unverified on the same CAMPAIGN_NOT_CONVERGED frame', async () => {
      const { registry, host } = await openHostAndGuest();
      const entry = registry.get('match-campaign');
      expect(entry).not.toBeNull();
      if (entry === null) return;
      jest
        .spyOn(entry.syncSession, 'evaluateScenarioLaunch')
        .mockResolvedValue({
          ok: false,
          reason: 'replacement-artifacts-unverified',
          requiredRevision: 3,
          branchId: 'candidate-1',
          behind: [],
        });

      sendHostIntent(host, {
        kind: 'AdvanceDay',
        intentId: 'advance-unverified-artifacts',
        payload: { days: 1 },
      });
      await flushAsyncHandlers();

      const error = host.sent.find(
        (message) =>
          message.kind === 'Error' && message.code === 'CAMPAIGN_NOT_CONVERGED',
      );
      expect(error?.kind).toBe('Error');
      if (error?.kind !== 'Error') return;
      expect(error.reason).toContain('replacement-artifacts-unverified');
      expect(error.reason).toContain('candidate-1');
      expect(error.reason).toContain('requiredRevision 3');
    });

    it('answers branch-not-active on the same CAMPAIGN_NOT_CONVERGED frame', async () => {
      const { registry, host } = await openHostAndGuest();
      const entry = registry.get('match-campaign');
      expect(entry).not.toBeNull();
      if (entry === null) return;
      jest
        .spyOn(entry.syncSession, 'evaluateScenarioLaunch')
        .mockResolvedValue({
          ok: false,
          reason: 'branch-not-active',
          requiredRevision: 2,
          branchId: 'candidate-1',
          status: 'building',
          behind: [],
        });

      sendHostIntent(host, {
        kind: 'AdvanceDay',
        intentId: 'advance-branch-not-active',
        payload: { days: 1 },
      });
      await flushAsyncHandlers();

      const error = host.sent.find(
        (message) =>
          message.kind === 'Error' && message.code === 'CAMPAIGN_NOT_CONVERGED',
      );
      expect(error?.kind).toBe('Error');
      if (error?.kind !== 'Error') return;
      expect(error.reason).toContain('branch-not-active');
      expect(error.reason).toContain('candidate-1');
      expect(error.reason).toContain('building');
      expect(error.reason).toContain('requiredRevision 2');
    });
  });
});

describe('bindCampaignSyncConnection — audited participant removal', () => {
  it('revokes the durable seat, detaches the live player, and unblocks the next launch', async () => {
    const registry = await makeRegistry();
    const active = new Set(['pid_guest']);
    const revoked = new Set<string>();
    const membership = {
      isActive: (
        _campaignId: string,
        _sessionId: string,
        participantId: string,
      ) => active.has(participantId),
      isRevoked: (
        _campaignId: string,
        _sessionId: string,
        participantId: string,
      ) => revoked.has(participantId),
      bind: (input: { participantId: string; seat: 'gm' | 'player' }) => {
        active.add(input.participantId);
        return { kind: 'bound' as const };
      },
      revoke: (input: { participantId: string; revokedAt: string }) => {
        void input.revokedAt;
        if (revoked.has(input.participantId)) return false;
        active.delete(input.participantId);
        revoked.add(input.participantId);
        return true;
      },
    };
    const player = new MockWireSocket();
    const gm = new MockWireSocket();
    const entry = registry.get('match-campaign');
    expect(entry).not.toBeNull();
    if (entry === null) return;

    await bindCampaignSyncConnection({
      socket: player,
      registry,
      matchId: 'match-campaign',
      verifiedPlayerId: 'pid_guest',
      logger: quietLogger,
      membership,
      replicaStore: null,
    });
    player.inbound({
      kind: 'CampaignJoin',
      matchId: 'match-campaign',
      ts: nowIso(),
      playerId: 'pid_guest',
      role: 'guest',
      roomCode: 'ABC234',
    });
    await flushAsyncHandlers();
    expect(player.sent).toContainEqual(
      expect.objectContaining({ kind: 'CampaignSnapshot' }),
    );

    const advanced = await entry.host.applyHostIntent({
      kind: 'AdvanceDay',
      campaignId: 'campaign-sync',
      intentId: 'advance-before-removal',
      payload: {},
    });
    expect(advanced.ok).toBe(true);
    expect(await entry.syncSession.evaluateScenarioLaunch()).toEqual(
      expect.objectContaining({ ok: false, reason: 'participants-behind' }),
    );

    await bindCampaignSyncConnection({
      socket: gm,
      registry,
      matchId: 'match-campaign',
      verifiedPlayerId: 'pid_host',
      logger: quietLogger,
      membership,
      replicaStore: null,
    });
    gm.inbound({
      kind: 'CampaignJoin',
      matchId: 'match-campaign',
      ts: nowIso(),
      playerId: 'pid_host',
      role: 'host',
      roomCode: 'ABC234',
    });
    await flushAsyncHandlers();

    gm.inbound({
      kind: 'CampaignHostIntent',
      matchId: 'match-campaign',
      ts: nowIso(),
      playerId: 'pid_host',
      intent: {
        kind: 'RemoveParticipant',
        campaignId: 'campaign-sync',
        intentId: 'remove-unavailable-player',
        payload: { participantId: 'pid_guest', reason: 'unavailable' },
      },
    });
    await flushAsyncHandlers();

    const events = await entry.host.getEventLog().getCampaignEvents(0);
    expect(events.at(-1)).toMatchObject({
      type: 'ParticipantRemoved',
      authorPlayerId: 'pid_host',
      scope: 'campaign',
      payload: { participantId: 'pid_guest', reason: 'unavailable' },
    });
    expect(
      membership.isRevoked('campaign-sync', 'match-campaign', 'pid_guest'),
    ).toBe(true);
    expect(await entry.syncSession.evaluateScenarioLaunch()).toEqual({
      ok: true,
      requiredRevision: 2,
    });

    player.inbound({
      kind: 'CampaignAck',
      matchId: 'match-campaign',
      ts: nowIso(),
      playerId: 'pid_guest',
      campaignId: 'campaign-sync',
      revision: 1,
    });
    await flushAsyncHandlers();
    expect(player.closes).toContainEqual(
      expect.objectContaining({ reason: 'membership-revoked' }),
    );

    const rejoin = new MockWireSocket();
    await bindCampaignSyncConnection({
      socket: rejoin,
      registry,
      matchId: 'match-campaign',
      verifiedPlayerId: 'pid_guest',
      logger: quietLogger,
      membership,
      replicaStore: null,
    });
    rejoin.inbound({
      kind: 'CampaignJoin',
      matchId: 'match-campaign',
      ts: nowIso(),
      playerId: 'pid_guest',
      role: 'guest',
      roomCode: 'ABC234',
    });
    await flushAsyncHandlers();
    expect(sawError(rejoin, 'AUTH_REJECTED', 'membership-revoked')).toBe(true);

    gm.inbound({
      kind: 'CampaignHostIntent',
      matchId: 'match-campaign',
      ts: nowIso(),
      playerId: 'pid_host',
      intent: {
        kind: 'AdvanceDay',
        campaignId: 'campaign-sync',
        intentId: 'advance-after-removal',
        payload: {},
      },
    });
    await flushAsyncHandlers();
    await new Promise((resolve) => setTimeout(resolve, 5));
    expect(sawError(gm, 'MATCH_PAUSED')).toBe(false);
    expect(sawError(gm, 'CAMPAIGN_NOT_CONVERGED')).toBe(false);
    expect(
      (await entry.host.getEventLog().getCampaignEvents(0)).at(-1),
    ).toMatchObject({
      type: 'CampaignDayAdvanced',
    });
    expect(entry.host.getState().day).toBe(2);
  });

  it('heals a committed removal on the next authenticated join after its durable revoke crashes', async () => {
    const registry = await makeRegistry();
    const active = new Set(['pid_guest']);
    const revoked = new Set<string>();
    let failNextRevoke = true;
    const membership = {
      isActive: (
        _campaignId: string,
        _sessionId: string,
        participantId: string,
      ) => active.has(participantId),
      isRevoked: (
        _campaignId: string,
        _sessionId: string,
        participantId: string,
      ) => revoked.has(participantId),
      bind: (input: { participantId: string; seat: 'gm' | 'player' }) => {
        active.add(input.participantId);
        return { kind: 'bound' as const };
      },
      revoke: (input: { participantId: string }) => {
        if (failNextRevoke) {
          failNextRevoke = false;
          throw new Error('simulated durable revoke interruption');
        }
        active.delete(input.participantId);
        revoked.add(input.participantId);
        return true;
      },
    };
    const entry = registry.get('match-campaign');
    expect(entry).not.toBeNull();
    if (entry === null) return;

    const joined = await entry.syncSession.joinMember(() => {}, 'pid_guest');
    expect(joined.ok).toBe(true);
    expect(
      await entry.host.applyHostIntent({
        kind: 'AdvanceDay',
        campaignId: 'campaign-sync',
        intentId: 'advance-before-interrupted-revoke',
        payload: {},
      }),
    ).toEqual(expect.objectContaining({ ok: true }));
    expect(await entry.syncSession.evaluateScenarioLaunch()).toEqual(
      expect.objectContaining({ ok: false, reason: 'participants-behind' }),
    );

    const firstGm = new MockWireSocket();
    await bindCampaignSyncConnection({
      socket: firstGm,
      registry,
      matchId: 'match-campaign',
      verifiedPlayerId: 'pid_host',
      logger: quietLogger,
      membership,
      replicaStore: null,
    });
    firstGm.inbound({
      kind: 'CampaignJoin',
      matchId: 'match-campaign',
      ts: nowIso(),
      playerId: 'pid_host',
      role: 'host',
      roomCode: 'ABC234',
    });
    await flushAsyncHandlers();
    firstGm.inbound({
      kind: 'CampaignHostIntent',
      matchId: 'match-campaign',
      ts: nowIso(),
      playerId: 'pid_host',
      intent: {
        kind: 'RemoveParticipant',
        campaignId: 'campaign-sync',
        intentId: 'remove-before-interrupted-revoke',
        payload: { participantId: 'pid_guest' },
      },
    });
    await new Promise((resolve) => setTimeout(resolve, 5));

    expect(
      (await entry.host.getEventLog().getCampaignEvents(0)).at(-1),
    ).toMatchObject({
      type: 'ParticipantRemoved',
      payload: { participantId: 'pid_guest' },
    });
    expect(
      membership.isRevoked('campaign-sync', 'match-campaign', 'pid_guest'),
    ).toBe(false);
    expect(await entry.syncSession.evaluateScenarioLaunch()).toEqual(
      expect.objectContaining({ ok: false, reason: 'participants-behind' }),
    );

    const returningGm = new MockWireSocket();
    await bindCampaignSyncConnection({
      socket: returningGm,
      registry,
      matchId: 'match-campaign',
      verifiedPlayerId: 'pid_host',
      logger: quietLogger,
      membership,
      replicaStore: null,
    });
    returningGm.inbound({
      kind: 'CampaignJoin',
      matchId: 'match-campaign',
      ts: nowIso(),
      playerId: 'pid_host',
      role: 'host',
      roomCode: 'ABC234',
    });
    await new Promise((resolve) => setTimeout(resolve, 5));

    expect(
      membership.isRevoked('campaign-sync', 'match-campaign', 'pid_guest'),
    ).toBe(true);
    expect(await entry.syncSession.evaluateScenarioLaunch()).toEqual({
      ok: true,
      requiredRevision: 2,
    });
  });
});

function readCampaignEventType(message: IServerMessage): string | null {
  if (message.kind !== 'CampaignEvent') return null;
  if (typeof message.event !== 'object' || message.event === null) return null;
  const event = message.event as { type?: unknown };
  return typeof event.type === 'string' ? event.type : null;
}

describe('bindCampaignSyncConnection — application receipt staging (P2CE3)', () => {
  const appliedView = {
    viewId: 'view-guessed',
    receiptId: 'receipt-guessed',
    previousReceiptId: null,
  };

  async function joinedLegacyGuest() {
    const registry = await makeRegistry();
    const entry = registry.get('match-campaign')!;
    const socket = new MockWireSocket();
    await bindCampaignSyncConnection({
      socket,
      registry,
      matchId: 'match-campaign',
      verifiedPlayerId: 'pid_guest',
      logger: quietLogger,
      replicaStore: null,
    });
    const joined = new Promise<void>((resolve) => {
      const send = socket.send.bind(socket);
      socket.send = (data: string) => {
        send(data);
        if (socket.sent.at(-1)?.kind === 'CampaignSnapshot') resolve();
      };
    });
    socket.inbound({
      kind: 'CampaignJoin',
      matchId: 'match-campaign',
      ts: nowIso(),
      playerId: 'pid_guest',
      role: 'guest',
      roomCode: 'ABC234',
    });
    await joined;
    const acknowledged = jest.spyOn(
      entry.syncSession,
      'noteParticipantAcknowledged',
    );
    return { socket, acknowledged };
  }

  function receiptAck(extra: Record<string, unknown> = {}) {
    return {
      kind: 'CampaignAck',
      matchId: 'match-campaign',
      ts: nowIso(),
      playerId: 'pid_guest',
      campaignId: 'campaign-sync',
      appliedView,
      ...extra,
    };
  }

  it('refuses a receipt ACK on a connection that was offered nothing, with no numeric fallback', async () => {
    const { socket, acknowledged } = await joinedLegacyGuest();
    const before = socket.sent.length;

    // The refusal is sent synchronously by the inbound handler itself.
    socket.inbound(receiptAck());

    expect(socket.sent.slice(before)).toEqual([
      expect.objectContaining({
        kind: 'Error',
        code: 'INVALID_INTENT',
        reason: 'campaign-application-not-offered',
      }),
    ]);
    expect(acknowledged).not.toHaveBeenCalled();
    expect(socket.closes).toEqual([]);
  });

  it.each([
    ['mixed receipt and revision', { revision: 3 }],
    ['malformed present appliedView', { appliedView: { viewId: 'v' } }],
  ])('refuses a %s ACK without downgrading it', async (_label, extra) => {
    const { socket, acknowledged } = await joinedLegacyGuest();
    const before = socket.sent.length;

    socket.inbound(receiptAck(extra));

    expect(socket.sent.slice(before)).toEqual([
      expect.objectContaining({ kind: 'Error', code: 'BAD_ENVELOPE' }),
    ]);
    expect(acknowledged).not.toHaveBeenCalled();
  });

  it('keeps the metadata-absent numeric ACK on a legacy connection', async () => {
    const { socket, acknowledged } = await joinedLegacyGuest();

    socket.inbound({
      kind: 'CampaignAck',
      matchId: 'match-campaign',
      ts: nowIso(),
      playerId: 'pid_guest',
      campaignId: 'campaign-sync',
      revision: 0,
    });

    expect(acknowledged).toHaveBeenCalledWith('pid_guest', 0);
  });
});

/**
 * P2CG1D: the three socket progression doors with the receipt port
 * installed on a reset registry, over real campaign.db / matches.db files
 * and real receipt ACKs. Readiness comes only from accepted P2CA offers.
 */
/** Confirms each write, so application offers can be established. */
class ConfirmingSocket extends ObservedSocket {
  override send(data: string, onSent?: (error?: Error) => void): void {
    super.send(data);
    if (onSent) queueMicrotask(() => onSent());
  }
}

describe('P2CG1D guarded progression doors (installed receipt port)', () => {
  let fixture: Awaited<ReturnType<typeof openRouteFixture>> | undefined;
  let entry: ICampaignHostRegistryEntry;
  const sockets: ObservedSocket[] = [];
  const signal = () => ({ signal: AbortSignal.timeout(10000) });
  const campaignDb = () => getSQLiteService().getDatabase();
  const route = () => {
    assert.ok(fixture);
    return fixture;
  };
  const matchDb = () => route().store.getDatabase();
  const port = { database: campaignDb };

  async function open(
    arbitrationMode: 'auto-approve' | 'host-review',
    install = true,
  ) {
    fixture = await openRouteFixture();
    const meta = await fixture.store.getMatchMeta(fixture.entry.matchId);
    assert.ok(meta.coopCampaign);
    // A reset registry, with the port installed explicitly before any entry.
    _resetCampaignHostRegistry();
    if (install) getCampaignHostRegistry().installApplicationReceipts(port);
    entry = await getCampaignHostRegistry().register(fixture.entry.matchId, {
      campaignId: meta.coopCampaign.campaignId,
      hostPlayerId: meta.hostPlayerId,
      roomCode: meta.roomCode ?? null,
      state: meta.coopCampaign.state,
      arbitrationMode,
    });
  }

  afterEach(async () => {
    sockets.splice(0).forEach((socket) => socket.close());
    jest.restoreAllMocks();
    await fixture?.close();
    fixture = undefined;
  });

  async function join(
    player: { readonly playerId: string },
    deps: { readonly applicationReceipts?: typeof port } = {},
  ) {
    const socket = new ConfirmingSocket();
    sockets.push(socket);
    await bindCampaignSyncConnection({
      socket,
      registry: getCampaignHostRegistry(),
      matchId: entry.matchId,
      verifiedPlayerId: player.playerId,
      logger: quietLogger,
      membership: createCampaignSessionMembershipPort(),
      ...deps,
    });
    const ready = once(socket, 'CampaignSnapshot', signal());
    socket.inbound({
      kind: 'CampaignJoin',
      matchId: entry.matchId,
      ts: nowIso(),
      playerId: player.playerId,
      role: player.playerId === entry.hostPlayerId ? 'host' : 'guest',
      roomCode: entry.roomCode ?? undefined,
    });
    await ready;
    return socket;
  }

  /** The next frame of `kind`; an unexpected Error frame or close fails with the recent frames. */
  function next(socket: ObservedSocket, kind: string) {
    return new Promise<void>((resolve, reject) => {
      const fail = (why: string) => () => {
        clearTimeout(timer);
        reject(
          new Error(
            `${why} awaiting ${kind}: ${JSON.stringify(socket.sent.slice(-3))}`,
          ),
        );
      };
      const timer = setTimeout(fail('timeout'), 10000);
      socket.once(kind, () => {
        clearTimeout(timer);
        resolve();
      });
      socket.once('Error', fail('error'));
      socket.once('close', fail('close'));
    });
  }

  type Offered = { readonly appliedView?: Record<string, unknown> };
  /** The connection's latest application offer, from the composed receipt port. */
  function latestOffer(socket: ObservedSocket) {
    return [...socket.sent]
      .reverse()
      .map((frame) => frame as unknown as Offered)
      .find((frame) => frame.appliedView !== undefined)?.appliedView;
  }

  /** A real receipt ACK of the latest offer, awaited to its confirmation. */
  async function ack(socket: ObservedSocket, playerId: string) {
    const appliedView = latestOffer(socket);
    assert.ok(appliedView, 'no application offer on this connection');
    const confirmed = next(socket, 'CampaignAck');
    socket.inbound({
      kind: 'CampaignAck',
      matchId: entry.matchId,
      ts: nowIso(),
      playerId,
      campaignId: entry.campaignId,
      appliedView,
    });
    await confirmed;
  }

  async function joinedAndReady() {
    const gm = await join(route().host);
    const guest = await join(route().guest);
    await ack(gm, route().host.playerId);
    await ack(guest, route().guest.playerId);
    return { gm, guest };
  }

  /** Every durable fact a refused progression must leave untouched. */
  function census() {
    const db = new Database(path.join(route().root, 'campaign.db'), {
      readonly: true,
    });
    try {
      const rows = (sql: string) => db.prepare(sql).all();
      return {
        batches: rows('SELECT command_id FROM event_journal_batches'),
        heads: rows('SELECT * FROM event_journal_stream_heads'),
        applied: rows('SELECT * FROM campaign_public_applied_view'),
        day: entry.host.getState().day,
        log: entry.host.getState(),
      };
    } finally {
      db.close();
    }
  }

  const days = () =>
    census().batches.filter((row) => JSON.stringify(row).includes('advance-'))
      .length;

  /** Whether a separate connection could take the file's write lock now. */
  function writable(file: string): boolean {
    const other = new Database(file, { timeout: 0 });
    try {
      other.exec('BEGIN IMMEDIATE');
      other.exec('ROLLBACK');
      return true;
    } catch (error) {
      expect(String(error)).toMatch(/SQLITE_BUSY|database is locked/);
      return false;
    } finally {
      other.close();
    }
  }

  function intent(kind: 'AdvanceDay' | 'SpendFunds', intentId: string) {
    return {
      kind,
      campaignId: entry.campaignId,
      intentId,
      payload:
        kind === 'AdvanceDay' ? { days: 1 } : { amount: 10, reason: 'Parts' },
    };
  }

  /** A host SpendFunds committed directly, moving the head under a held preparation. */
  const spend = (intentId: string) => ({
    kind: 'SpendFunds' as const,
    campaignId: entry.campaignId,
    intentId,
    payload: { amount: 10, reason: 'Parts' },
  });

  function hostIntent(
    socket: ObservedSocket,
    kind: 'AdvanceDay' | 'SpendFunds',
    intentId: string,
  ) {
    socket.inbound({
      kind: 'CampaignHostIntent',
      matchId: entry.matchId,
      ts: nowIso(),
      playerId: entry.hostPlayerId,
      intent: intent(kind, intentId),
    });
  }

  function propose(
    socket: ObservedSocket,
    kind: 'AdvanceDay' | 'SpendFunds',
    proposalId: string,
  ) {
    socket.inbound({
      kind: 'CampaignProposal',
      matchId: entry.matchId,
      ts: nowIso(),
      playerId: route().guest.playerId,
      proposal: {
        proposalId,
        campaignId: entry.campaignId,
        proposingPlayerId: route().guest.playerId,
        ts: nowIso(),
        intent: intent(
          kind,
          `${kind === 'AdvanceDay' ? 'advance' : 'spend'}-${proposalId}`,
        ),
      },
    });
  }

  function approve(socket: ObservedSocket, proposalId: string) {
    socket.inbound({
      kind: 'CampaignDecision',
      matchId: entry.matchId,
      ts: nowIso(),
      playerId: entry.hostPlayerId,
      proposalId,
      decision: 'approve',
    });
  }

  type ErrorFrame = { code: string; reason: string } & Record<string, unknown>;
  const nextError = (socket: ObservedSocket) =>
    once(socket, 'Error', signal()).then(([frame]) => frame as ErrorFrame);
  /** The day-advance fan-out, failing fast (with the frames) on an error or close. */
  const dayAdvanced = (socket: ObservedSocket) =>
    next(socket, 'CampaignDayAdvanced');

  /**
   * Records M's transaction control with whether C is still open, plus a
   * microtask queued at BEGIN: an explicit release lands before `tick`,
   * the reservation's microtask safety net only after it.
   */
  function traceMatch(
    trail: string[],
    onRollback: () => void = () => {},
    onTick: () => void = () => {},
  ) {
    const exec = matchDb().exec.bind(matchDb());
    jest.spyOn(matchDb(), 'exec').mockImplementation((sql: string) => {
      if (/^(BEGIN|COMMIT|ROLLBACK)/.test(sql)) {
        trail.push(`M:${sql}:C-open=${String(campaignDb().inTransaction)}`);
        if (sql === 'BEGIN IMMEDIATE')
          queueMicrotask(() => {
            trail.push('tick');
            onTick();
          });
        if (sql === 'ROLLBACK') onRollback();
      }
      return exec(sql);
    });
  }

  /** Holds the next real P2CB preparation until `release` resolves. */
  function holdPreparation() {
    assert.ok(entry.launch);
    const real = entry.launch.prepare.bind(entry.launch);
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    let prepared!: () => void;
    const reached = new Promise<void>((resolve) => {
      prepared = resolve;
    });
    jest.spyOn(entry.launch, 'prepare').mockImplementationOnce(async (key) => {
      const result = await real(key);
      prepared();
      await gate;
      return result;
    });
    return { reached, release };
  }

  /** P2CG1R: rows the foreign microtask in failAfterGuard committed on M. */
  function foreignRows() {
    const other = new Database(route().matchPath, { readonly: true });
    try {
      return (
        other.prepare('SELECT COUNT(*) AS n FROM r_foreign').get() as {
          readonly n: number;
        }
      ).n;
    } finally {
      other.close();
    }
  }

  /**
   * P2CG1R (H-OPEN-1 / CF-E1): fails the guarded commit of `intentId` after
   * its guard admitted, at the real writer: aimed one revision ahead (a
   * real SQL revision conflict) or aborted by a SQLite trigger on the batch
   * insert (a native throw). The trail records the guard and M; a microtask
   * queued at BEGIN writes a foreign row on M right after 'tick'.
   */
  function failAfterGuard(failure: 'conflict' | 'abort', intentId: string) {
    assert.ok(entry.launch);
    const trail: string[] = [];
    const revalidate = entry.launch.revalidate.bind(entry.launch);
    jest
      .spyOn(entry.launch, 'revalidate')
      .mockImplementation((db, prepared) => {
        trail.push('guard');
        return revalidate(db, prepared);
      });
    matchDb().exec(
      'CREATE TABLE IF NOT EXISTS r_foreign (id INTEGER PRIMARY KEY)',
    );
    traceMatch(trail, undefined, () =>
      matchDb().transaction(() =>
        matchDb().prepare('INSERT INTO r_foreign DEFAULT VALUES').run(),
      )(),
    );
    if (failure === 'abort') {
      campaignDb().exec(
        `CREATE TEMP TRIGGER r_abort BEFORE INSERT ON event_journal_batches WHEN instr(NEW.command_id, '${intentId}') > 0 BEGIN SELECT RAISE(ABORT, 'r native append abort'); END`,
      );
    } else {
      const writer = SQLiteEventJournalWriter.prototype;
      const real = writer.appendWithExtension;
      jest
        .spyOn(writer, 'appendWithExtension')
        .mockImplementation(
          function (this: SQLiteEventJournalWriter, raw, extend, onCommitted) {
            const aimed = raw.commandId.includes(intentId)
              ? { ...raw, expectedRevision: raw.expectedRevision + 1 }
              : raw;
            return real.call(this, aimed, extend, onCommitted);
          },
        );
    }
    return trail;
  }

  /** P2CG1R: counts the binder's own consumption of an arbiter reservation. */
  function countConsumed() {
    let consumed = 0;
    type Guarded = Parameters<typeof entry.arbiter.decide>[2];
    const wrap = (guarded: Guarded): Guarded =>
      guarded &&
      ((intent, reservation) =>
        guarded(intent, {
          ...reservation,
          consumed: () => {
            consumed += 1;
            reservation.consumed();
          },
        }));
    const submit = entry.arbiter.submitProposal.bind(entry.arbiter);
    jest
      .spyOn(entry.arbiter, 'submitProposal')
      .mockImplementation((proposal, guarded) =>
        submit(proposal, wrap(guarded)),
      );
    const decide = entry.arbiter.decide.bind(entry.arbiter);
    jest
      .spyOn(entry.arbiter, 'decide')
      .mockImplementation((id, decision, guarded) =>
        decide(id, decision, wrap(guarded)),
      );
    return () => consumed;
  }

  it.each([
    ['host AdvanceDay', 'host', 'conflict'],
    ['host AdvanceDay', 'host', 'abort'],
    ['an auto-approved AdvanceDay proposal', 'auto', 'conflict'],
    ['an auto-approved AdvanceDay proposal', 'auto', 'abort'],
    ['GM approval of a pending AdvanceDay', 'gm', 'conflict'],
    ['GM approval of a pending AdvanceDay', 'gm', 'abort'],
  ] as const)(
    'P2CG1R: %s failing after its guard admitted (%s) releases M in the append span',
    async (_label, door, failure) => {
      await open(door === 'auto' ? 'auto-approve' : 'host-review');
      const { gm, guest } = await joinedAndReady();
      const proposalId = `r-${door}-${failure}`;
      const intentId = `advance-${proposalId}`;
      const consumed = countConsumed();
      if (door === 'gm') {
        const queued = once(guest, 'CampaignDecision', signal());
        propose(guest, 'AdvanceDay', proposalId);
        await queued;
      }
      const before = census();
      const trail = failAfterGuard(failure, intentId);
      const answeredTo = door === 'auto' ? guest : gm;
      const answered =
        failure === 'abort'
          ? once(answeredTo, 'close', signal())
          : door === 'host'
            ? nextError(gm)
            : next(answeredTo, 'CampaignDecision');
      try {
        if (door === 'host') hostIntent(gm, 'AdvanceDay', intentId);
        if (door === 'auto') propose(guest, 'AdvanceDay', proposalId);
        if (door === 'gm') approve(gm, proposalId);
        await answered;
        await new Promise((resolve) => setTimeout(resolve, 20));
      } finally {
        campaignDb().exec('DROP TRIGGER IF EXISTS temp.r_abort');
      }

      expect(trail).toEqual([
        'M:BEGIN IMMEDIATE:C-open=true',
        'guard',
        'M:ROLLBACK:C-open=true',
        'tick',
      ]);
      // Released before the queued write ran: it committed on its own.
      expect(foreignRows()).toBe(1);
      expect(census()).toEqual(before);
      expect(days()).toBe(0);
      expect(consumed()).toBe(0);
      expect(matchDb().inTransaction).toBe(false);
      expect(campaignDb().inTransaction).toBe(false);
      // The outcome classes stand: a conflict is answered stale, a throw
      // stays uncertain (the socket closes), neither is a refusal.
      const frames = JSON.stringify(answeredTo.sent);
      if (failure === 'conflict') {
        expect(frames).toContain('CAMPAIGN_STALE_HEAD');
        expect(answeredTo.closes).toEqual([]);
      } else {
        expect(answeredTo.closes).toEqual([
          { code: 1008, reason: 'dispatch-failed' },
        ]);
      }
      expect(frames).not.toContain('CAMPAIGN_NOT_CONVERGED');

      if (door === 'host' && failure === 'conflict') {
        // Nothing stranded: the same intent then commits exactly once.
        jest.restoreAllMocks();
        const seen = dayAdvanced(guest);
        hostIntent(gm, 'AdvanceDay', intentId);
        await seen;
        expect(days()).toBe(1);
        expect(matchDb().inTransaction).toBe(false);
      }
    },
  );

  it.each(
    (['host', 'member'] as const).flatMap((seat) =>
      (['confirmed', 'held', 'failed'] as const).map(
        (mode) => [seat, mode] as const,
      ),
    ),
  )(
    'P2CG1R CF-H8/CF-G5 (P2CG1HP {host, member}): an installed bound %s membership join only ever offers (%s send callback); joinMember is never invoked',
    async (seat, mode) => {
      await open('host-review');
      const player = seat === 'host' ? route().host : route().guest;
      const unoffered = jest.spyOn(entry.syncSession, 'joinMember');
      class Controlled extends ConfirmingSocket {
        override send(data: string, onSent?: (error?: Error) => void): void {
          if (mode === 'confirmed') super.send(data, onSent);
          else {
            ObservedSocket.prototype.send.call(this, data);
            if (mode === 'failed' && onSent)
              queueMicrotask(() => onSent(new Error('held failure')));
          }
        }
      }
      const socket = new Controlled();
      sockets.push(socket);
      await bindCampaignSyncConnection({
        socket,
        registry: getCampaignHostRegistry(),
        matchId: entry.matchId,
        verifiedPlayerId: player.playerId,
        logger: quietLogger,
        membership: createCampaignSessionMembershipPort(),
      });
      socket.inbound({
        kind: 'CampaignJoin',
        matchId: entry.matchId,
        ts: nowIso(),
        playerId: player.playerId,
        role: seat === 'host' ? 'host' : 'guest',
        roomCode: entry.roomCode ?? undefined,
        campaignId: entry.campaignId,
      });
      for (let i = 0; i < 40; i++)
        await new Promise((resolve) => setTimeout(resolve, 0));
      const campaign = socket.sent.filter(
        (frame) =>
          frame.kind === 'CampaignSnapshot' || frame.kind === 'CampaignEvent',
      );
      expect(campaign.length).toBeGreaterThan(0);
      expect(campaign[0]).toHaveProperty('appliedView');
      expect(
        campaign.every(
          (frame) => 'appliedView' in frame && frame.appliedView !== undefined,
        ),
      ).toBe(true);
      expect(unoffered).not.toHaveBeenCalled();
    },
  );

  it('composes application from the installed port; a numeric cursor cannot authorize, genuine receipts commit host AdvanceDay once', async () => {
    await open('host-review');
    expect(entry.launch).toBeInstanceOf(CampaignLaunchView);
    const gm = await join(route().host);
    const guest = await join(route().guest);
    // No explicit applicationReceipts: the registry port composed the offers.
    expect(latestOffer(gm)).toBeDefined();
    expect(latestOffer(guest)).toBeDefined();
    // The installed port is the only switch: the legacy session gate is never asked.
    const legacyGate = jest.spyOn(entry.syncSession, 'evaluateScenarioLaunch');
    // P2CG1R CF-E7: a preparation refusal never opens M.
    const unreadyTrail: string[] = [];
    traceMatch(unreadyTrail);
    const before = census();
    const refused = nextError(gm);
    hostIntent(gm, 'AdvanceDay', 'advance-unready');
    expect(await refused).toEqual(
      expect.objectContaining({
        code: 'CAMPAIGN_NOT_CONVERGED',
        reason: 'participants-behind',
        intentId: 'advance-unready',
      }),
    );
    expect(census()).toEqual(before);
    // A receipt connection never downgrades to a numeric ACK.
    const numeric = nextError(guest);
    guest.inbound({
      kind: 'CampaignAck',
      matchId: entry.matchId,
      ts: nowIso(),
      playerId: route().guest.playerId,
      campaignId: entry.campaignId,
      revision: 999,
    });
    expect((await numeric).code).toBe('INVALID_INTENT');
    const stillRefused = nextError(gm);
    hostIntent(gm, 'AdvanceDay', 'advance-numeric');
    expect((await stillRefused).reason).toBe('participants-behind');
    expect(census()).toEqual(before);
    expect(unreadyTrail).toEqual([]);

    await ack(gm, route().host.playerId);
    await ack(guest, route().guest.playerId);
    const seen = dayAdvanced(guest);
    hostIntent(gm, 'AdvanceDay', 'advance-ready');
    await seen;
    expect(entry.host.getState().day).toBe(before.day + 1);
    expect(days()).toBe(1);
    // A retry of the committed intent replays; it is never refused or re-run.
    const replayed = census();
    hostIntent(gm, 'AdvanceDay', 'advance-ready');
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(census()).toEqual(replayed);
    expect(gm.sent.filter((frame) => frame.kind === 'Error')).toHaveLength(2);
    expect(legacyGate).not.toHaveBeenCalled();
    expect(matchDb().inTransaction).toBe(false);
    expect(campaignDb().inTransaction).toBe(false);
  });

  it('keeps the legacy session gate without the port, and an explicit port still composes offers', async () => {
    await open('host-review', false);
    expect(getCampaignHostRegistry().applicationReceipts).toBeNull();
    expect(entry.launch).toBeNull();
    const legacy = await join(route().guest);
    expect(latestOffer(legacy)).toBeUndefined();
    const explicit = await join(route().host, { applicationReceipts: port });
    expect(latestOffer(explicit)).toBeDefined();
    const prepare = jest.spyOn(CampaignLaunchView.prototype, 'prepare');
    const legacyGate = jest.spyOn(entry.syncSession, 'evaluateScenarioLaunch');
    const seen = dayAdvanced(explicit);
    hostIntent(explicit, 'AdvanceDay', 'advance-legacy');
    await seen;
    expect(prepare).not.toHaveBeenCalled();
    expect(legacyGate).toHaveBeenCalledTimes(1);
    expect(days()).toBe(1);
  });

  it('holds C then M inside the guard on the exact handles, commits C under M, and releases M before any publication', async () => {
    await open('host-review');
    const { gm, guest } = await joinedAndReady();
    assert.ok(entry.launch);
    const campaignFile = path.join(route().root, 'campaign.db');
    const trail: string[] = [];
    const revalidate = entry.launch.revalidate.bind(entry.launch);
    jest
      .spyOn(entry.launch, 'revalidate')
      .mockImplementation((db, prepared) => {
        expect(db).toBe(campaignDb());
        expect(db.inTransaction).toBe(true);
        expect(matchDb().inTransaction).toBe(true);
        expect(writable(campaignFile)).toBe(false);
        expect(writable(route().matchPath)).toBe(false);
        trail.push('guard');
        return revalidate(db, prepared);
      });
    traceMatch(trail, () => {
      // C has committed, durably, and nothing has been published yet.
      expect(days()).toBe(1);
      expect(
        guest.sent.some(
          (f) =>
            f.kind === 'CampaignEvent' &&
            JSON.stringify(f).includes('CampaignDayAdvanced'),
        ),
      ).toBe(false);
    });
    const seen = dayAdvanced(guest);
    hostIntent(gm, 'AdvanceDay', 'advance-locked');
    await seen;
    // C IMMEDIATE, then M, the guard under both, M released in the commit's span.
    expect(trail).toEqual([
      'M:BEGIN IMMEDIATE:C-open=true',
      'guard',
      'M:ROLLBACK:C-open=false',
      'tick',
    ]);
    expect(matchDb().inTransaction).toBe(false);
    expect(writable(route().matchPath)).toBe(true);
  });

  it('refuses a change made after preparation inside the guard, rolling back with nothing written or fanned out', async () => {
    await open('host-review');
    const { gm, guest } = await joinedAndReady();
    const held = holdPreparation();
    const trail: string[] = [];
    traceMatch(trail);
    const refused = nextError(gm);
    hostIntent(gm, 'AdvanceDay', 'advance-drift');
    await held.reached;
    // The head moves between preparation and the append.
    expect((await entry.host.applyHostIntent(spend('spend-drift'))).ok).toBe(
      true,
    );
    const before = census();
    held.release();
    expect(await refused).toEqual(
      expect.objectContaining({
        code: 'CAMPAIGN_NOT_CONVERGED',
        reason: 'fresh-request',
        intentId: 'advance-drift',
      }),
    );
    expect(census()).toEqual(before);
    expect(days()).toBe(0);
    // The refusal released M explicitly, inside C, before C rolled back.
    expect(trail).toEqual([
      'M:BEGIN IMMEDIATE:C-open=true',
      'M:ROLLBACK:C-open=true',
      'tick',
    ]);
    expect(JSON.stringify(guest.sent)).not.toContain('CampaignDayAdvanced');
    expect(matchDb().inTransaction).toBe(false);
    expect(campaignDb().inTransaction).toBe(false);
    // Public reason only: no cut, digest, count or participant list.
    expect(
      JSON.stringify(gm.sent.filter((f) => f.kind === 'Error')),
    ).not.toMatch(/digest|revision|requiredRevision/i);
  });

  it('answers a busy match connection as a typed refusal, never an uncertain commit', async () => {
    await open('host-review');
    const { gm } = await joinedAndReady();
    const before = census();
    matchDb().exec('BEGIN');
    const refused = nextError(gm);
    hostIntent(gm, 'AdvanceDay', 'advance-busy');
    const frame = await refused;
    matchDb().exec('ROLLBACK');
    expect(frame).toEqual(
      expect.objectContaining({
        code: 'CAMPAIGN_NOT_CONVERGED',
        reason: 'progression-reservation-busy',
      }),
    );
    expect(census()).toEqual(before);
    expect(gm.closes).toEqual([]);
    const seen = dayAdvanced(gm);
    hostIntent(gm, 'AdvanceDay', 'advance-busy');
    await seen;
    expect(days()).toBe(1);
  });

  it('refuses before any write when the match store has no progression reservation', async () => {
    await open('host-review');
    const { gm } = await joinedAndReady();
    _setDefaultMatchStoreForTests(new InMemoryMatchStore({ quiet: true }));
    const before = census();
    const refused = nextError(gm);
    hostIntent(gm, 'AdvanceDay', 'advance-unsupported');
    expect((await refused).reason).toBe('progression-unsupported');
    expect(census()).toEqual(before);
    _setDefaultMatchStoreForTests(route().store);
  });

  it('keeps a known commit when publication then fails: no refusal, released M, and a retry does not append again', async () => {
    await open('host-review');
    const { gm } = await joinedAndReady();
    const unsubscribe = entry.host.subscribe((event) => {
      if (event.type === 'CampaignDayAdvanced')
        throw new Error('publish failed');
    });
    const closed = once(gm, 'close', signal());
    hostIntent(gm, 'AdvanceDay', 'advance-unsettled');
    await closed;
    unsubscribe();
    expect(days()).toBe(1);
    expect(
      gm.sent.some(
        (f) => f.kind === 'Error' && f.code === 'CAMPAIGN_NOT_CONVERGED',
      ),
    ).toBe(false);
    expect(matchDb().inTransaction).toBe(false);
    const after = census();
    const again = await join(route().host);
    hostIntent(again, 'AdvanceDay', 'advance-unsettled');
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(census().batches).toEqual(after.batches);
  });

  it('guards an auto-approved AdvanceDay proposal and leaves SpendFunds proposals unguarded', async () => {
    await open('auto-approve');
    const gm = await join(route().host);
    const guest = await join(route().guest);
    const prepare = jest.spyOn(CampaignLaunchView.prototype, 'prepare');
    const legacyGate = jest.spyOn(entry.syncSession, 'evaluateScenarioLaunch');
    const refused = nextError(guest);
    propose(guest, 'AdvanceDay', 'auto-unready');
    expect(await refused).toEqual(
      expect.objectContaining({
        code: 'CAMPAIGN_NOT_CONVERGED',
        reason: 'participants-behind',
        intentId: 'auto-unready',
      }),
    );
    expect(entry.arbiter.getPendingProposals()).toEqual([]);
    expect(days()).toBe(0);
    const calls = prepare.mock.calls.length;
    const spent = once(guest, 'CampaignDecision', signal());
    propose(guest, 'SpendFunds', 'auto-spend');
    await spent;
    expect(prepare.mock.calls.length).toBe(calls);
    await ack(gm, route().host.playerId);
    await ack(guest, route().guest.playerId);
    const seen = dayAdvanced(guest);
    propose(guest, 'AdvanceDay', 'auto-ready');
    await seen;
    expect(days()).toBe(1);
    expect(legacyGate).not.toHaveBeenCalled();
  });

  it('keeps a refused GM approval pending with its timer, then coalesces concurrent approvals into one commit', async () => {
    await open('host-review');
    const gm = await join(route().host);
    const guest = await join(route().guest);
    const queued = once(guest, 'CampaignDecision', signal());
    propose(guest, 'AdvanceDay', 'review-advance');
    await queued;
    const [pending] = entry.arbiter.getPendingProposals();
    const legacyGate = jest.spyOn(entry.syncSession, 'evaluateScenarioLaunch');
    const refused = nextError(gm);
    approve(gm, 'review-advance');
    expect(await refused).toEqual(
      expect.objectContaining({
        code: 'CAMPAIGN_NOT_CONVERGED',
        reason: 'participants-behind',
      }),
    );
    expect(entry.arbiter.getPendingProposals()).toEqual([pending]);
    expect(days()).toBe(0);

    await ack(gm, route().host.playerId);
    await ack(guest, route().guest.playerId);
    const held = holdPreparation();
    const decided = once(guest, 'CampaignDecision', signal());
    approve(gm, 'review-advance');
    await held.reached;
    // Reserved, not removed: the pending item stays until the commit consumes it.
    expect(entry.arbiter.getPendingProposals()).toEqual([pending]);
    const pendingAtRelease: number[] = [];
    traceMatch([], () =>
      pendingAtRelease.push(entry.arbiter.getPendingProposals().length),
    );
    const duplicate = nextError(gm);
    approve(gm, 'review-advance');
    held.release();
    expect((await decided)[0]).toEqual(
      expect.objectContaining({
        proposalId: 'review-advance',
        result: expect.objectContaining({ status: 'committed' }),
      }),
    );
    expect(await duplicate).toEqual(
      expect.objectContaining({
        code: 'BAD_ENVELOPE',
        reason: 'unknown-proposal',
      }),
    );
    expect(days()).toBe(1);
    // Consumed in the commit's own span, so no timeout can resolve it again.
    expect(pendingAtRelease).toEqual([0]);
    expect(legacyGate).not.toHaveBeenCalled();
    expect(entry.arbiter.getPendingProposals()).toEqual([]);
  });

  it('a GM veto while an approval is being prepared invalidates it before any write', async () => {
    await open('host-review');
    const { gm, guest } = await joinedAndReady();
    const queued = once(guest, 'CampaignDecision', signal());
    propose(guest, 'AdvanceDay', 'review-veto');
    await queued;
    // P2CG1R CF-E7: a veto during preparation never opens M.
    const trail: string[] = [];
    traceMatch(trail);
    const held = holdPreparation();
    const stale = nextError(gm);
    approve(gm, 'review-veto');
    await held.reached;
    const vetoed = once(guest, 'CampaignDecision', signal());
    gm.inbound({
      kind: 'CampaignDecision',
      matchId: entry.matchId,
      ts: nowIso(),
      playerId: entry.hostPlayerId,
      proposalId: 'review-veto',
      decision: 'veto',
    });
    expect((await vetoed)[0]).toEqual(
      expect.objectContaining({
        result: expect.objectContaining({ status: 'vetoed' }),
      }),
    );
    const before = census();
    held.release();
    expect(await stale).toEqual(
      expect.objectContaining({
        code: 'BAD_ENVELOPE',
        reason: 'unknown-proposal',
      }),
    );
    expect(census()).toEqual(before);
    expect(days()).toBe(0);
    expect(trail).toEqual([]);
  });

  it('P2CG1R CF-E7: an invalid proposal reservation never opens M and keeps the pending proposal', async () => {
    await open('host-review');
    const { gm, guest } = await joinedAndReady();
    const queued = once(guest, 'CampaignDecision', signal());
    propose(guest, 'AdvanceDay', 'invalid-reservation');
    await queued;
    const decide = entry.arbiter.decide.bind(entry.arbiter);
    jest
      .spyOn(entry.arbiter, 'decide')
      .mockImplementation((id, decision, guarded) =>
        decide(
          id,
          decision,
          guarded
            ? (intent, reservation) =>
                guarded(intent, { ...reservation, valid: () => false })
            : undefined,
        ),
      );
    const trail: string[] = [];
    traceMatch(trail);
    const before = census();
    const refused = nextError(gm);
    approve(gm, 'invalid-reservation');
    expect((await refused).reason).toBe('proposal-reservation-invalid');
    expect(trail).toEqual([]);
    expect(census()).toEqual(before);
    expect(entry.arbiter.getPendingProposals()).toHaveLength(1);
  });

  it('a late refusal of a GM approval preserves the still-valid pending proposal', async () => {
    await open('host-review');
    const { gm, guest } = await joinedAndReady();
    const queued = once(guest, 'CampaignDecision', signal());
    propose(guest, 'AdvanceDay', 'review-drift');
    await queued;
    const [pending] = entry.arbiter.getPendingProposals();
    const held = holdPreparation();
    const refused = nextError(gm);
    approve(gm, 'review-drift');
    await held.reached;
    expect((await entry.host.applyHostIntent(spend('spend-review'))).ok).toBe(
      true,
    );
    const before = census();
    held.release();
    expect(await refused).toEqual(
      expect.objectContaining({
        code: 'CAMPAIGN_NOT_CONVERGED',
        reason: 'fresh-request',
        intentId: 'review-drift',
      }),
    );
    expect(census()).toEqual(before);
    expect(entry.arbiter.getPendingProposals()).toEqual([pending]);
  });
});
