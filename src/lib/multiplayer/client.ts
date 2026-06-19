/**
 * Multiplayer client wrapper.
 *
 * Framework-agnostic connect-and-listen API around a WebSocket. Wave 5
 * builds the React hook on top of this; Wave 1 only exposes the raw
 * `IMultiplayerClient`. Browser WebSocket and Node `ws.WebSocket` both
 * satisfy the structural `IClientWebSocket` shape used here, so the
 * client works in tests (mock socket), Node (e.g., load test), and the
 * browser without conditional code paths.
 *
 * Behaviour summary:
 *   - On connect, sends `SessionJoin` immediately.
 *   - Buffers `Event` messages received during the initial replay
 *     window. Replay sequence: `ReplayStart` → 0+ `ReplayChunk` →
 *     `ReplayEnd`. Once `ReplayEnd` fires, the `ready` listener gets
 *     the buffered + flushed event stream and subsequent live events.
 *   - On disconnect, attempts exponential reconnect (capped at 30s)
 *     unless the caller invoked `close()`.
 *   - All inbound messages are zod-validated; `BAD_ENVELOPE` traffic is
 *     dropped silently with a console warn (not surfaced to the
 *     consumer to avoid drowning the UI in malformed-frame noise).
 *
 * @spec openspec/changes/add-multiplayer-server-infrastructure/specs/multiplayer-server/spec.md
 */

import {
  encodeTokenForWire,
  type IPlayerToken,
} from '@/types/multiplayer/Player';
import {
  ClientMessageSchema,
  ServerMessageSchema,
  RECONNECT_INITIAL_MS,
  RECONNECT_MAX_MS,
  RECONNECT_MULTIPLIER,
  type IServerMessage,
  type IIntentPayload,
  nowIso,
} from '@/types/multiplayer/Protocol';

// =============================================================================
// Public API
// =============================================================================

/**
 * Events the client emits to consumers. `event` carries the raw engine
 * event payload (caller casts to the engine's `IGameEvent` type when
 * using).
 */
export type IClientEventName =
  | 'ready' // replay drained — live events follow
  | 'event' // a live game event arrived
  | 'error' // server rejected something
  | 'close' // connection terminated (either side)
  | 'reconnect'; // reconnection attempt scheduled

export type IClientEventHandler = (payload: unknown) => void;

export interface IMultiplayerClient {
  send(intent: IIntentPayload): void;
  on(event: IClientEventName, handler: IClientEventHandler): () => void;
  close(): void;
  /** Last server-side sequence the client has observed (for reconnect). */
  lastSeq(): number;
  /** True after `ReplayEnd` has fired for the current connection. */
  isReady(): boolean;
}

/**
 * Structural type for the WebSocket the client manages. Browser
 * `WebSocket` and Node `ws.WebSocket` both satisfy this. We avoid
 * importing the `ws` types so this module ships cleanly into the
 * browser bundle.
 */
export interface IClientWebSocket {
  send(data: string): void;
  close(): void;
  readyState: number;
  onopen: ((ev: unknown) => void) | null;
  onmessage: ((ev: { data: unknown }) => void) | null;
  onerror: ((ev: unknown) => void) | null;
  onclose: ((ev: unknown) => void) | null;
}

/**
 * Factory the consumer can override in tests to inject a mock socket.
 * Defaults to the global `WebSocket` constructor in environments where
 * it exists.
 */
export type WebSocketFactory = (url: string) => IClientWebSocket;

export interface IConnectOptions {
  /** Override the WebSocket factory (tests). */
  socketFactory?: WebSocketFactory;
  /** Disable auto-reconnect (tests, controlled shutdown). */
  reconnect?: boolean;
  /** Last sequence to resume from (Wave 4 reconnect path). */
  lastSeq?: number;
}

// =============================================================================
// Internal state
// =============================================================================

interface IClientState {
  socket: IClientWebSocket | null;
  closedByCaller: boolean;
  ready: boolean;
  // Buffer for events that arrive between ReplayEnd and the
  // consumer's `on('event', ...)` registration. Zustand-style: drain
  // on first listener attach.
  pendingLiveEvents: unknown[];
  replayBuffer: unknown[];
  lastSeq: number;
  reconnectAttempt: number;
  reconnectTimer: ReturnType<typeof setTimeout> | null;
}

type ClientEmit = (name: IClientEventName, payload: unknown) => void;
type LastSeqUpdater = (event: unknown) => void;
type ServerMessageHandlerContext = {
  readonly message: IServerMessage;
  readonly state: IClientState;
  readonly emit: ClientEmit;
  readonly updateLastSeq: LastSeqUpdater;
};
type ServerMessageHandler = (context: ServerMessageHandlerContext) => void;

const SERVER_MESSAGE_HANDLERS: Record<
  IServerMessage['kind'],
  ServerMessageHandler
> = {
  ReplayStart: ({ state }) => {
    state.replayBuffer = [];
    state.ready = false;
  },
  ReplayChunk: ({ message, state, updateLastSeq }) => {
    const replay = message as Extract<IServerMessage, { kind: 'ReplayChunk' }>;
    for (const evt of replay.events) {
      state.replayBuffer.push(evt);
      updateLastSeq(evt);
    }
  },
  ReplayEnd: ({ state, emit }) => {
    state.ready = true;
    for (const evt of state.replayBuffer) {
      emit('event', evt);
    }
    state.replayBuffer = [];
    emit('ready', { lastSeq: state.lastSeq });
    for (const evt of state.pendingLiveEvents) {
      emit('event', evt);
    }
    state.pendingLiveEvents = [];
  },
  Event: ({ message, state, emit, updateLastSeq }) => {
    const eventMessage = message as Extract<IServerMessage, { kind: 'Event' }>;
    updateLastSeq(eventMessage.event);
    if (!state.ready) {
      state.pendingLiveEvents.push(eventMessage.event);
      return;
    }
    emit('event', eventMessage.event);
  },
  Heartbeat: () => {
    // Server liveness ping; clients do not need to echo.
  },
  Error: ({ message, emit }) => {
    const error = message as Extract<IServerMessage, { kind: 'Error' }>;
    emit('error', { code: error.code, reason: error.reason });
  },
  Close: ({ message, state, emit }) => {
    const close = message as Extract<IServerMessage, { kind: 'Close' }>;
    emit('close', { code: close.code, reason: close.reason });
    try {
      state.socket?.close();
    } catch {
      // ignore
    }
  },
  LobbyUpdated: ({ message, emit }) => {
    emit('event', message);
  },
  MatchPaused: ({ message, emit }) => {
    emit('event', message);
  },
  MatchResumed: ({ message, emit }) => {
    emit('event', message);
  },
  SeatTimedOut: ({ message, emit }) => {
    emit('event', message);
  },
  HostMigrated: ({ message, emit }) => {
    emit('event', message);
  },
};

interface IClientRuntime {
  readonly url: string;
  readonly matchId: string;
  readonly auth: IClientAuth;
  readonly wireToken: string;
  readonly options: IConnectOptions;
  readonly factory: WebSocketFactory;
  readonly listeners: Map<IClientEventName, Set<IClientEventHandler>>;
  readonly state: IClientState;
}

// =============================================================================
// Connect
// =============================================================================

/**
 * Auth blob accepted by `connect`. Wave 2 prefers a structured
 * `IPlayerToken` (signed Ed25519 bearer); a raw `string` is still
 * accepted for backward compatibility with Wave 1 fixtures and unit
 * tests that don't want to mint a real signature.
 */
export type IClientAuth =
  | { playerId: string; token: IPlayerToken }
  | { playerId: string; token: string };

/**
 * Connect to a multiplayer server and return a client handle.
 *
 * @param url      Full WebSocket URL (`ws://host/api/multiplayer/socket`)
 * @param matchId  Match identifier; appended as `?matchId=` query param
 * @param auth     Auth blob with `playerId` + token. Token is a signed
 *                 `IPlayerToken` in production; a raw string is still
 *                 accepted for legacy/test paths.
 * @param options  Reconnect / factory overrides for tests.
 */
export function connect(
  url: string,
  matchId: string,
  auth: IClientAuth,
  options: IConnectOptions = {},
): IMultiplayerClient {
  // Pre-encode the token to its wire form ONCE so every URL/SessionJoin
  // sees the same bytes. Structured tokens become base64-of-JSON; raw
  // strings pass through (legacy/test path).
  const wireToken: string =
    typeof auth.token === 'string'
      ? auth.token
      : encodeTokenForWire(auth.token);
  const listeners = new Map<IClientEventName, Set<IClientEventHandler>>();

  const state: IClientState = {
    socket: null,
    closedByCaller: false,
    ready: false,
    pendingLiveEvents: [],
    replayBuffer: [],
    lastSeq: options.lastSeq ?? -1,
    reconnectAttempt: 0,
    reconnectTimer: null,
  };

  const factory = options.socketFactory ?? defaultWebSocketFactory();
  const runtime: IClientRuntime = {
    url,
    matchId,
    auth,
    wireToken,
    options,
    factory,
    listeners,
    state,
  };

  // Kick the connection now so the caller can attach listeners
  // synchronously after `connect()` returns.
  openSocket(runtime);

  return {
    send: (intent) => sendClientIntent(runtime, intent),
    on: (event, handler) => addClientListener(runtime, event, handler),
    close: () => closeClient(runtime),
    lastSeq: () => state.lastSeq,
    isReady: () => state.ready,
  };
}

function emitClientEvent(
  runtime: IClientRuntime,
  name: IClientEventName,
  payload: unknown,
): void {
  const handlers = runtime.listeners.get(name);
  if (!handlers) return;
  for (const handler of Array.from(handlers)) {
    try {
      handler(payload);
    } catch {
      // Don't let a buggy listener kill the socket pump.
    }
  }
}

function buildSocketUrl(runtime: IClientRuntime): string {
  const sep = runtime.url.includes('?') ? '&' : '?';
  const params = new URLSearchParams({
    matchId: runtime.matchId,
    token: runtime.wireToken,
    playerId: runtime.auth.playerId,
  });
  return `${runtime.url}${sep}${params.toString()}`;
}

function openSocket(runtime: IClientRuntime): void {
  const socket = runtime.factory(buildSocketUrl(runtime));
  runtime.state.socket = socket;

  socket.onopen = () => sendSessionJoin(runtime, socket);
  socket.onmessage = (ev: { data: unknown }) =>
    handleSocketMessage(runtime, ev);
  socket.onerror = (e: unknown) => emitClientEvent(runtime, 'error', e);
  socket.onclose = () => handleSocketClose(runtime);
}

function sendSessionJoin(
  runtime: IClientRuntime,
  socket: IClientWebSocket,
): void {
  runtime.state.reconnectAttempt = 0;
  const join = {
    kind: 'SessionJoin' as const,
    matchId: runtime.matchId,
    ts: nowIso(),
    playerId: runtime.auth.playerId,
    token: runtime.wireToken,
    ...(runtime.state.lastSeq >= 0 ? { lastSeq: runtime.state.lastSeq } : {}),
  };
  const parsed = ClientMessageSchema.safeParse(join);
  if (!parsed.success) {
    emitClientEvent(
      runtime,
      'error',
      new Error('SessionJoin failed local validation'),
    );
    return;
  }
  try {
    socket.send(JSON.stringify(parsed.data));
  } catch (e) {
    emitClientEvent(runtime, 'error', e);
  }
}

function handleSocketMessage(
  runtime: IClientRuntime,
  ev: { data: unknown },
): void {
  const raw = typeof ev.data === 'string' ? ev.data : String(ev.data);
  let parsed;
  try {
    parsed = ServerMessageSchema.safeParse(JSON.parse(raw));
  } catch {
    return;
  }
  if (!parsed.success) return;
  handleServerMessage(runtime, parsed.data);
}

function handleSocketClose(runtime: IClientRuntime): void {
  emitClientEvent(runtime, 'close', null);
  if (!runtime.state.closedByCaller && (runtime.options.reconnect ?? true)) {
    scheduleReconnect(runtime);
  }
}

function handleServerMessage(
  runtime: IClientRuntime,
  message: IServerMessage,
): void {
  SERVER_MESSAGE_HANDLERS[message.kind]?.({
    message,
    state: runtime.state,
    emit: (name, payload) => emitClientEvent(runtime, name, payload),
    updateLastSeq: (event) => updateLastSeq(runtime.state, event),
  });
}

function updateLastSeq(state: IClientState, event: unknown): void {
  if (
    typeof event === 'object' &&
    event !== null &&
    'sequence' in event &&
    typeof (event as { sequence?: unknown }).sequence === 'number'
  ) {
    const seq = (event as { sequence: number }).sequence;
    if (seq > state.lastSeq) state.lastSeq = seq;
  }
}

function scheduleReconnect(runtime: IClientRuntime): void {
  runtime.state.reconnectAttempt += 1;
  const baseDelay =
    RECONNECT_INITIAL_MS *
    Math.pow(RECONNECT_MULTIPLIER, runtime.state.reconnectAttempt - 1);
  const delay = Math.min(baseDelay, RECONNECT_MAX_MS);
  emitClientEvent(runtime, 'reconnect', {
    attempt: runtime.state.reconnectAttempt,
    delayMs: delay,
  });
  runtime.state.reconnectTimer = setTimeout(() => {
    runtime.state.reconnectTimer = null;
    if (runtime.state.closedByCaller) return;
    openSocket(runtime);
  }, delay);
}

function sendClientIntent(
  runtime: IClientRuntime,
  intent: IIntentPayload,
): void {
  if (!runtime.state.socket) return;
  const envelope = {
    kind: 'Intent' as const,
    matchId: runtime.matchId,
    ts: nowIso(),
    playerId: runtime.auth.playerId,
    intent,
  };
  const parsed = ClientMessageSchema.safeParse(envelope);
  if (!parsed.success) {
    emitClientEvent(
      runtime,
      'error',
      new Error('Intent failed local validation'),
    );
    return;
  }
  try {
    runtime.state.socket.send(JSON.stringify(parsed.data));
  } catch (e) {
    emitClientEvent(runtime, 'error', e);
  }
}

function addClientListener(
  runtime: IClientRuntime,
  event: IClientEventName,
  handler: IClientEventHandler,
): () => void {
  let set = runtime.listeners.get(event);
  if (!set) {
    set = new Set();
    runtime.listeners.set(event, set);
  }
  set.add(handler);
  return () => {
    set?.delete(handler);
  };
}

function closeClient(runtime: IClientRuntime): void {
  runtime.state.closedByCaller = true;
  if (runtime.state.reconnectTimer) {
    clearTimeout(runtime.state.reconnectTimer);
    runtime.state.reconnectTimer = null;
  }
  try {
    runtime.state.socket?.close();
  } catch {
    // ignore
  }
}

// =============================================================================
// Default factory
// =============================================================================

/**
 * Resolve the global WebSocket constructor lazily. Browser code paths
 * use `window.WebSocket`; Node + jsdom in tests bring their own (or the
 * caller injects a mock). Throws at connect time if no global is
 * available — callers can pass an explicit `socketFactory` to bypass.
 */
function defaultWebSocketFactory(): WebSocketFactory {
  return (url: string) => {
    const Ctor =
      typeof globalThis !== 'undefined'
        ? (globalThis as { WebSocket?: new (url: string) => IClientWebSocket })
            .WebSocket
        : undefined;
    if (!Ctor) {
      throw new Error(
        'No WebSocket constructor available; pass options.socketFactory',
      );
    }
    return new Ctor(url);
  };
}
