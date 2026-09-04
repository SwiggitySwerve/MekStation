import { EventEmitter } from 'node:events';

import type {
  IClientMessage,
  IServerMessage,
} from '@/types/multiplayer/Protocol';

import type { IMatchSocket } from '../ServerMatchSocketTypes';

import {
  bindMultiplayerSocketConnection,
  type IMatchHostRegistryLike,
} from '../bindMultiplayerSocketConnection';

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

  inbound(message: IClientMessage | string): void {
    this.emit(
      'message',
      typeof message === 'string' ? message : JSON.stringify(message),
    );
  }
}

function makeHost() {
  const host = {
    attachSocket: jest.fn(),
    // The mock mirrors production admission: attach on success and
    // return a viewer-shaped object.
    // Return type mirrors production's `IAuthorizedViewer | null`, so a
    // refusal can be modelled at all - a mock that can only succeed
    // cannot express the case the binder has to handle.
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

function makeRegistry(
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
  await Promise.resolve();
  await Promise.resolve();
}

describe('bindMultiplayerSocketConnection', () => {
  it('closes an unknown match with a typed error instead of a wave stub', async () => {
    const socket = new MockWireSocket();
    const registry = makeRegistry(null);

    await bindMultiplayerSocketConnection({
      socket,
      registry,
      matchId: 'missing-match',
      verifiedPlayerId: 'pid_host',
      logger: quietLogger,
    });

    expect(registry.getOrCreate).toHaveBeenCalledWith('missing-match', {});
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
      reason: 'unknown-match',
    });
  });

  it('closes a quarantined match with MATCH_QUARANTINED rather than UNKNOWN_MATCH', async () => {
    const socket = new MockWireSocket();
    const isQuarantined = jest.fn(
      (matchId: string) => matchId === 'match-gapped',
    );
    const registry: IMatchHostRegistryLike = {
      getOrCreate: jest.fn().mockResolvedValue(null),
      isQuarantined,
    };

    await bindMultiplayerSocketConnection({
      socket,
      registry,
      matchId: 'match-gapped',
      verifiedPlayerId: 'pid_host',
      logger: quietLogger,
    });

    expect(registry.getOrCreate).toHaveBeenCalledWith('match-gapped', {});
    expect(isQuarantined).toHaveBeenCalledWith('match-gapped');
    expect(socket.sent).toEqual([
      expect.objectContaining({
        kind: 'Error',
        matchId: 'match-gapped',
        code: 'MATCH_QUARANTINED',
      }),
      expect.objectContaining({
        kind: 'Close',
        matchId: 'match-gapped',
        code: 'MATCH_QUARANTINED',
      }),
    ]);
    expect(socket.closes[0]).toMatchObject({
      code: 1008,
      reason: 'match-quarantined',
    });
  });

  it('refuses a SessionJoin claiming another player and replays nothing', async () => {
    // Impersonation at the door. The envelope carries a playerId the
    // connection never proved, and the reply must be a refusal - not a
    // replay addressed to the claimed identity.
    const socket = new MockWireSocket();
    const host = makeHost();

    await bindMultiplayerSocketConnection({
      socket,
      registry: makeRegistry(host),
      matchId: 'match-live',
      verifiedPlayerId: 'pid_guest',
      connectionKey: 'conn-guest',
      logger: quietLogger,
    });
    socket.inbound({
      kind: 'SessionJoin',
      matchId: 'match-live',
      ts: new Date().toISOString(),
      playerId: 'pid_host',
      token: 'already-verified-at-upgrade',
      lastSeq: 0,
    });
    await flushAsyncHandlers();

    expect(host.handleSessionJoin).not.toHaveBeenCalled();
    expect(socket.closes[0]).toMatchObject({
      code: 1008,
      reason: 'player-mismatch',
    });
    // Nothing but the refusal itself went out: a replay stream is
    // exactly the payload this guard exists to withhold.
    expect(
      socket.sent.every(
        (message) => message.kind === 'Error' || message.kind === 'Close',
      ),
    ).toBe(true);
  });

  it('refuses an Intent claiming another player and dispatches nothing', async () => {
    // The same lie one message later. SessionJoin and Intent are
    // guarded separately, so passing the first tells you nothing about
    // the second - a player who joined honestly could still try to act
    // as someone else.
    const socket = new MockWireSocket();
    const host = makeHost();

    await bindMultiplayerSocketConnection({
      socket,
      registry: makeRegistry(host),
      matchId: 'match-live',
      verifiedPlayerId: 'pid_guest',
      connectionKey: 'conn-guest',
      logger: quietLogger,
    });
    socket.inbound({
      kind: 'SessionJoin',
      matchId: 'match-live',
      ts: new Date().toISOString(),
      playerId: 'pid_guest',
      token: 'already-verified-at-upgrade',
      lastSeq: 0,
    });
    await flushAsyncHandlers();
    expect(host.handleSessionJoin).toHaveBeenCalled();

    socket.inbound({
      kind: 'Intent',
      matchId: 'match-live',
      ts: new Date().toISOString(),
      playerId: 'pid_host',
      intentId: 'intent-impersonated',
      intent: { kind: 'AdvancePhase' },
    });
    await flushAsyncHandlers();

    expect(host.handleIntent).not.toHaveBeenCalled();
    expect(socket.closes[0]).toMatchObject({
      code: 1008,
      reason: 'player-mismatch',
    });
  });

  it('attaches the verified socket and routes SessionJoin to replay', async () => {
    const socket = new MockWireSocket();
    const host = makeHost();

    await bindMultiplayerSocketConnection({
      socket,
      registry: makeRegistry(host),
      matchId: 'match-live',
      verifiedPlayerId: 'pid_host',
      connectionKey: 'conn-host',
      logger: quietLogger,
    });

    expect(host.attachSocket).toHaveBeenCalledWith(socket, 'pid_host');

    socket.inbound({
      kind: 'SessionJoin',
      matchId: 'match-live',
      ts: new Date().toISOString(),
      playerId: 'pid_host',
      token: 'already-verified-at-upgrade',
      lastSeq: 4,
    });
    await flushAsyncHandlers();

    expect(host.noteInbound).toHaveBeenCalledWith(socket);
    expect(host.handleSessionJoin).toHaveBeenCalledWith(
      socket,
      'pid_host',
      4,
      'match-live',
      // The client's own delivery cursor, absent on a first join.
      undefined,
    );
    expect(socket.closes).toEqual([]);
  });

  it('routes Intent envelopes through the host with a per-connection key', async () => {
    const socket = new MockWireSocket();
    const host = makeHost();

    await bindMultiplayerSocketConnection({
      socket,
      registry: makeRegistry(host),
      matchId: 'match-live',
      verifiedPlayerId: 'pid_host',
      connectionKey: 'conn-host',
      logger: quietLogger,
    });

    const intent = {
      kind: 'Intent',
      matchId: 'match-live',
      ts: new Date().toISOString(),
      playerId: 'pid_host',
      intentId: 'intent-1',
      intent: { kind: 'AdvancePhase' },
    } satisfies IClientMessage;
    socket.inbound(intent);
    await flushAsyncHandlers();

    expect(host.noteInbound).toHaveBeenCalledWith(socket);
    expect(host.handleIntent).toHaveBeenCalledWith(
      intent,
      'conn-host',
      'pid_host',
    );
    expect(socket.closes).toEqual([]);
  });

  it('refuses an Intent that smuggles a client roll at the door, with the intentId, and dispatches nothing', async () => {
    // The same envelope without a dice key already reaches handleIntent
    // in the row above; this row is the raw-wire refusal only.
    const socket = new MockWireSocket();
    const host = makeHost();

    await bindMultiplayerSocketConnection({
      socket,
      registry: makeRegistry(host),
      matchId: 'match-live',
      verifiedPlayerId: 'pid_host',
      connectionKey: 'conn-host',
      logger: quietLogger,
    });

    socket.inbound(
      JSON.stringify({
        kind: 'Intent',
        matchId: 'match-live',
        ts: new Date().toISOString(),
        playerId: 'pid_host',
        intentId: 'roll-1',
        intent: { kind: 'AdvancePhase', roll: 6 },
      }),
    );
    await flushAsyncHandlers();

    expect(socket.sent).toHaveLength(1);
    expect(socket.sent[0]).toEqual(
      expect.objectContaining({
        kind: 'Error',
        code: 'INVALID_INTENT',
        reason: 'client-rolls-forbidden',
        intentId: 'roll-1',
      }),
    );
    expect(host.handleIntent).not.toHaveBeenCalled();
    expect(socket.closes).toEqual([]);
  });

  it('rejects malformed payloads without dispatching to the host', async () => {
    const socket = new MockWireSocket();
    const host = makeHost();

    await bindMultiplayerSocketConnection({
      socket,
      registry: makeRegistry(host),
      matchId: 'match-live',
      verifiedPlayerId: 'pid_host',
      logger: quietLogger,
    });

    socket.inbound('not-json');
    await flushAsyncHandlers();

    expect(host.handleIntent).not.toHaveBeenCalled();
    expect(host.handleSessionJoin).not.toHaveBeenCalled();
    expect(socket.sent).toContainEqual(
      expect.objectContaining({
        kind: 'Error',
        matchId: 'match-live',
        code: 'BAD_ENVELOPE',
      }),
    );
  });

  it('detaches and releases per-connection state on socket close', async () => {
    const socket = new MockWireSocket();
    const host = makeHost();

    await bindMultiplayerSocketConnection({
      socket,
      registry: makeRegistry(host),
      matchId: 'match-live',
      verifiedPlayerId: 'pid_host',
      connectionKey: 'conn-host',
      logger: quietLogger,
    });

    socket.emit('close');

    expect(host.detachSocket).toHaveBeenCalledWith(socket);
    expect(host.releaseConnection).toHaveBeenCalledWith('conn-host');
  });

  it('binds nothing when durable membership refuses admission', async () => {
    // The admission resolver has its own suite proving a non-member is
    // refused and never attaches. What had no coverage was the BINDER's
    // half of that contract: that a refusal actually stops the bind,
    // rather than the socket being wired up anyway and merely lacking a
    // viewer. Umbrella 6.1 names this binder explicitly.
    const socket = new MockWireSocket();
    const host = makeHost();
    host.admitSocket.mockImplementation(async () => null);

    const bound = await bindMultiplayerSocketConnection({
      socket,
      matchId: 'match-1',
      verifiedPlayerId: 'pid_intruder',
      registry: makeRegistry(host),
      logger: quietLogger,
    });

    expect(bound).toBeNull();
    // Never attached, so never a fan-out recipient.
    expect(host.attachSocket).not.toHaveBeenCalled();
    // And the connection slot is given back rather than leaked to a
    // socket that was refused.
    expect(host.releaseConnection).toHaveBeenCalled();
  });

  it('never dispatches an inbound message after a refused admission', async () => {
    // The message handler is registered BEFORE admission resolves, and
    // waits on a promise that only settles on success. A refusal must
    // therefore leave inbound traffic permanently undelivered rather
    // than merely unauthorized.
    const socket = new MockWireSocket();
    const host = makeHost();
    host.admitSocket.mockImplementation(async () => null);

    await bindMultiplayerSocketConnection({
      socket,
      matchId: 'match-1',
      verifiedPlayerId: 'pid_intruder',
      registry: makeRegistry(host),
      logger: quietLogger,
    });
    socket.inbound({
      kind: 'SessionJoin',
      matchId: 'match-1',
      ts: new Date().toISOString(),
      playerId: 'pid_intruder',
      token: 'wire-token',
    });
    await Promise.resolve();
    await Promise.resolve();

    expect(host.handleSessionJoin).not.toHaveBeenCalled();
    expect(host.handleIntent).not.toHaveBeenCalled();
  });
});
