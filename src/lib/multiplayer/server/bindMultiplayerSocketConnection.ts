import {
  ClientMessageSchema,
  nowIso,
  type IClientMessage,
  type IErrorCode,
  type IServerMessage,
} from '@/types/multiplayer/Protocol';

import type { ServerMatchHost } from './ServerMatchHost';
import type { IMatchSocket } from './ServerMatchSocketTypes';

import {
  getMatchHostRegistry,
  type MatchHostRegistry,
} from './MatchHostRegistry';

type SocketEvent = 'message' | 'close' | 'error';

export interface IWireMatchSocket extends IMatchSocket {
  on(event: 'message', listener: (data: unknown) => void): this;
  on(event: 'close' | 'error', listener: () => void): this;
}

type HostLike = Pick<
  ServerMatchHost,
  | 'attachSocket'
  | 'detachSocket'
  | 'handleSessionJoin'
  | 'handleIntent'
  | 'noteInbound'
  | 'releaseConnection'
>;

export interface IMatchHostRegistryLike {
  getOrCreate(
    matchId: string,
    options?: { diceSeed?: number },
  ): Promise<HostLike | null>;
}

export interface IBindMultiplayerSocketConnectionDeps {
  socket: IWireMatchSocket;
  matchId: string;
  verifiedPlayerId: string;
  diceSeed?: number;
  connectionKey?: string;
  registry?: Pick<MatchHostRegistry, 'getOrCreate'> | IMatchHostRegistryLike;
  logger?: Pick<Console, 'error' | 'warn' | 'log'>;
}

export interface IBoundMultiplayerSocketConnection {
  host: HostLike;
  connectionKey: string;
}

let connectionCounter = 0;

/**
 * Bind one authenticated WebSocket to the authoritative match host.
 *
 * The HTTP upgrade handler already verified the wire token and placed
 * the derived player id on the request. This adapter owns the remaining
 * wire concerns: registry lookup, frame parsing, envelope validation,
 * dispatch to `ServerMatchHost`, and connection cleanup.
 */
export async function bindMultiplayerSocketConnection({
  socket,
  matchId,
  verifiedPlayerId,
  diceSeed,
  connectionKey = nextConnectionKey(matchId, verifiedPlayerId),
  registry = getMatchHostRegistry(),
  logger = console,
}: IBindMultiplayerSocketConnectionDeps): Promise<IBoundMultiplayerSocketConnection | null> {
  let boundContext: {
    readonly host: HostLike;
    readonly cleanup: () => void;
  } | null = null;
  let resolveReady!: (context: {
    readonly host: HostLike;
    readonly cleanup: () => void;
  }) => void;
  const ready = new Promise<{
    readonly host: HostLike;
    readonly cleanup: () => void;
  }>((resolve) => {
    resolveReady = resolve;
  });

  socket.on('message', (data) => {
    void ready
      .then(({ host, cleanup }) =>
        handleInbound({
          data,
          socket,
          host,
          matchId,
          verifiedPlayerId,
          connectionKey,
          cleanup,
          logger,
        }),
      )
      .catch(() => {
        // Binding already failed and the socket has been closed.
      });
  });
  const cleanupBoundSocket = (): void => {
    boundContext?.cleanup();
  };
  socket.on('close', cleanupBoundSocket);
  socket.on('error', cleanupBoundSocket);

  const options = diceSeed != null ? { diceSeed } : {};
  const host = await registry.getOrCreate(matchId, options);
  if (!host) {
    send(socket, errorFrame(matchId, 'UNKNOWN_MATCH', 'unknown-match'));
    send(socket, closeFrame(matchId, 'UNKNOWN_MATCH', 'unknown-match'));
    socket.close(1008, 'unknown-match');
    return null;
  }

  let cleanedUp = false;
  const cleanup = (): void => {
    if (cleanedUp) return;
    cleanedUp = true;
    host.detachSocket(socket);
    host.releaseConnection(connectionKey);
  };

  host.attachSocket(socket, verifiedPlayerId);
  boundContext = { host, cleanup };
  resolveReady(boundContext);

  return { host, connectionKey };
}

interface IHandleInboundDeps {
  data: unknown;
  socket: IWireMatchSocket;
  host: HostLike;
  matchId: string;
  verifiedPlayerId: string;
  connectionKey: string;
  cleanup: () => void;
  logger: Pick<Console, 'error' | 'warn' | 'log'>;
}

async function handleInbound({
  data,
  socket,
  host,
  matchId,
  verifiedPlayerId,
  connectionKey,
  cleanup,
  logger,
}: IHandleInboundDeps): Promise<void> {
  host.noteInbound(socket);

  const parsedJson = parseJsonPayload(data);
  if (!parsedJson.ok) {
    logger.warn(
      `[mp-socket] bad envelope matchId=${matchId} reason=${parsedJson.reason}`,
    );
    send(socket, errorFrame(matchId, 'BAD_ENVELOPE', parsedJson.reason));
    return;
  }

  const parsedEnvelope = ClientMessageSchema.safeParse(parsedJson.value);
  if (!parsedEnvelope.success) {
    logger.warn(`[mp-socket] malformed envelope matchId=${matchId}`);
    send(socket, errorFrame(matchId, 'BAD_ENVELOPE', 'malformed-envelope'));
    return;
  }

  const envelope = parsedEnvelope.data;
  logger.log(`[mp-socket] inbound ${envelope.kind} matchId=${matchId}`);
  if (envelope.matchId !== matchId) {
    closeWithTypedError({
      socket,
      matchId,
      cleanup,
      code: 'UNKNOWN_MATCH',
      reason: 'wrong-match',
    });
    return;
  }

  try {
    await dispatchEnvelope({
      envelope,
      socket,
      host,
      matchId,
      verifiedPlayerId,
      connectionKey,
      cleanup,
      logger,
    });
  } catch (error) {
    logger.error('[mp-socket] dispatch failed', error);
    closeWithTypedError({
      socket,
      matchId,
      cleanup,
      code: 'INTERNAL_ERROR',
      reason: 'dispatch-failed',
    });
  }
}

interface IDispatchEnvelopeDeps {
  envelope: IClientMessage;
  socket: IWireMatchSocket;
  host: HostLike;
  matchId: string;
  verifiedPlayerId: string;
  connectionKey: string;
  cleanup: () => void;
  logger: Pick<Console, 'error' | 'warn' | 'log'>;
}

async function dispatchEnvelope({
  envelope,
  socket,
  host,
  matchId,
  verifiedPlayerId,
  connectionKey,
  cleanup,
  logger,
}: IDispatchEnvelopeDeps): Promise<void> {
  switch (envelope.kind) {
    case 'Heartbeat':
      return;
    case 'SessionJoin':
      if (envelope.playerId !== verifiedPlayerId) {
        closeWithTypedError({
          socket,
          matchId,
          cleanup,
          code: 'AUTH_REJECTED',
          reason: 'player-mismatch',
        });
        return;
      }
      await host.handleSessionJoin(
        socket,
        verifiedPlayerId,
        envelope.lastSeq,
        envelope.matchId,
      );
      logger.log(
        `[mp-socket] session joined matchId=${matchId} playerId=${verifiedPlayerId}`,
      );
      return;
    case 'Intent':
      if (envelope.playerId !== verifiedPlayerId) {
        closeWithTypedError({
          socket,
          matchId,
          cleanup,
          code: 'AUTH_REJECTED',
          reason: 'player-mismatch',
        });
        return;
      }
      await host.handleIntent(envelope, connectionKey);
      logger.log(
        `[mp-socket] intent dispatched matchId=${matchId} playerId=${verifiedPlayerId} intent=${envelope.intent.kind}`,
      );
      return;
  }
}

function nextConnectionKey(matchId: string, playerId: string): string {
  connectionCounter += 1;
  return `${matchId}:${playerId}:${connectionCounter}`;
}

function parseJsonPayload(
  data: unknown,
): { ok: true; value: unknown } | { ok: false; reason: string } {
  const text = payloadToString(data);
  if (text == null) {
    return { ok: false, reason: 'unsupported-payload' };
  }
  try {
    return { ok: true, value: JSON.parse(text) };
  } catch {
    return { ok: false, reason: 'malformed-json' };
  }
}

function payloadToString(data: unknown): string | null {
  if (typeof data === 'string') return data;
  if (data instanceof Buffer) return data.toString('utf8');
  if (data instanceof ArrayBuffer) return Buffer.from(data).toString('utf8');
  if (Array.isArray(data) && data.every((item) => item instanceof Buffer)) {
    return Buffer.concat(data).toString('utf8');
  }
  return null;
}

function closeWithTypedError({
  socket,
  matchId,
  cleanup,
  code,
  reason,
}: {
  socket: IWireMatchSocket;
  matchId: string;
  cleanup: () => void;
  code: IErrorCode;
  reason: string;
}): void {
  send(socket, errorFrame(matchId, code, reason));
  send(socket, closeFrame(matchId, code, reason));
  socket.close(1008, reason);
  cleanup();
}

function errorFrame(
  matchId: string,
  code: IErrorCode,
  reason: string,
): Extract<IServerMessage, { kind: 'Error' }> {
  return {
    kind: 'Error',
    matchId,
    ts: nowIso(),
    code,
    reason,
  };
}

function closeFrame(
  matchId: string,
  code: IErrorCode,
  reason: string,
): Extract<IServerMessage, { kind: 'Close' }> {
  return {
    kind: 'Close',
    matchId,
    ts: nowIso(),
    code,
    reason,
  };
}

function send(socket: IMatchSocket, message: IServerMessage): void {
  if (socket.readyState !== 1) return;
  socket.send(JSON.stringify(message));
}
