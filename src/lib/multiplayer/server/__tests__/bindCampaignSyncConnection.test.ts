import { EventEmitter } from 'node:events';
import * as fs from 'node:fs';
import * as path from 'node:path';

import type {
  IClientMessage,
  IServerMessage,
} from '@/types/multiplayer/Protocol';

import { reconcileCoopBattle } from '@/lib/campaign/coop/reconcileCoopBattle';
import { createEmptyCampaignState } from '@/types/campaign/CampaignSync';
import { nowIso } from '@/types/multiplayer/Protocol';

import type { IMatchSocket } from '../ServerMatchSocketTypes';

import { bindCampaignSyncConnection } from '../bindCampaignSyncConnection';
import { CampaignHostRegistry } from '../CampaignHostRegistry';

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
  for (let i = 0; i < 8; i += 1) {
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

  /** In-memory membership port: the store's contract without a database. */
  function fakeMembership(
    seed: {
      active?: readonly string[];
      revoked?: readonly string[];
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
});

function readCampaignEventType(message: IServerMessage): string | null {
  if (message.kind !== 'CampaignEvent') return null;
  if (typeof message.event !== 'object' || message.event === null) return null;
  const event = message.event as { type?: unknown };
  return typeof event.type === 'string' ? event.type : null;
}
