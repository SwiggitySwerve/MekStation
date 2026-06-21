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
  return {
    attachSocket: jest.fn(),
    detachSocket: jest.fn(),
    handleSessionJoin: jest.fn().mockResolvedValue(undefined),
    handleIntent: jest.fn().mockResolvedValue([]),
    noteInbound: jest.fn(),
    releaseConnection: jest.fn(),
  };
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
    expect(host.handleIntent).toHaveBeenCalledWith(intent, 'conn-host');
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
});
