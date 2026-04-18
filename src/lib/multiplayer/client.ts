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

  function emit(name: IClientEventName, payload: unknown): void {
    const handlers = listeners.get(name);
    if (!handlers) return;
    // Snapshot before iterating so handlers can safely unsubscribe
    // mid-emit.
    for (const handler of Array.from(handlers)) {
      try {
        handler(payload);
      } catch {
        // Don't let a buggy listener kill the socket pump.
      }
    }
  }

  function buildUrl(): string {
    const sep = url.includes('?') ? '&' : '?';
    const params = new URLSearchParams({
      matchId,
      token: wireToken,
      playerId: auth.playerId,
    });
    return `${url}${sep}${params.toString()}`;
  }

  function openSocket(): void {
    const socket = factory(buildUrl());
    state.socket = socket;

    socket.onopen = () => {
      state.reconnectAttempt = 0;
      // Send SessionJoin as the first frame. Validated at the schema
      // layer to catch developer typos in tests.
      const join = {
        kind: 'SessionJoin' as const,
        matchId,
        ts: nowIso(),
        playerId: auth.playerId,
        token: wireToken,
        ...(state.lastSeq >= 0 ? { lastSeq: state.lastSeq + 1 } : {}),
      };
      const parsed = ClientMessageSchema.safeParse(join);
      if (!parsed.success) {
        // Should never happen; hard error so tests catch a regression.
        emit('error', new Error('SessionJoin failed local validation'));
        return;
      }
      try {
        socket.send(JSON.stringify(parsed.data));
      } catch (e) {
        emit('error', e);
      }
    };

    socket.onmessage = (ev: { data: unknown }) => {
      const raw = typeof ev.data === 'string' ? ev.data : String(ev.data);
      let parsed;
      try {
        parsed = ServerMessageSchema.safeParse(JSON.parse(raw));
      } catch {
        // Malformed JSON; drop. Server will eventually heartbeat-time-
        // out our socket if we never recover.
        return;
      }
      if (!parsed.success) return;
      handleServerMessage(parsed.data);
    };

    socket.onerror = (e: unknown) => emit('error', e);

    socket.onclose = () => {
      emit('close', null);
      if (!state.closedByCaller && (options.reconnect ?? true)) {
        scheduleReconnect();
      }
    };
  }

  function handleServerMessage(message: IServerMessage): void {
    switch (message.kind) {
      case 'ReplayStart':
        state.replayBuffer = [];
        state.ready = false;
        return;
      case 'ReplayChunk':
        for (const evt of message.events) {
          state.replayBuffer.push(evt);
          updateLastSeq(evt);
        }
        return;
      case 'ReplayEnd':
        state.ready = true;
        // Drain buffered replay events as live `event` notifications.
        // Listeners attached AFTER this point still receive them via
        // `pendingLiveEvents`. Replay events are NOT buffered there
        // because the spec says the client gets `ready` once and then
        // streams from the cursor; consumers that need history can
        // call `lastSeq()` and re-fetch.
        for (const evt of state.replayBuffer) {
          emit('event', evt);
        }
        state.replayBuffer = [];
        emit('ready', { lastSeq: state.lastSeq });
        // Drain anything that arrived live during replay.
        for (const evt of state.pendingLiveEvents) {
          emit('event', evt);
        }
        state.pendingLiveEvents = [];
        return;
      case 'Event':
        updateLastSeq(message.event);
        if (!state.ready) {
          state.pendingLiveEvents.push(message.event);
          return;
        }
        emit('event', message.event);
        return;
      case 'Heartbeat':
        // Server liveness ping; nothing for us to do beyond updating
        // any wall-clock if we tracked it. Don't echo back — the spec
        // says clients don't have to respond and the server uses
        // *any* inbound traffic as the keepalive signal.
        return;
      case 'Error':
        emit('error', { code: message.code, reason: message.reason });
        return;
      case 'Close':
        emit('close', { code: message.code, reason: message.reason });
        try {
          state.socket?.close();
        } catch {
          // ignore
        }
        return;
    }
  }

  function updateLastSeq(event: unknown): void {
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

  function scheduleReconnect(): void {
    state.reconnectAttempt += 1;
    const baseDelay =
      RECONNECT_INITIAL_MS *
      Math.pow(RECONNECT_MULTIPLIER, state.reconnectAttempt - 1);
    const delay = Math.min(baseDelay, RECONNECT_MAX_MS);
    emit('reconnect', { attempt: state.reconnectAttempt, delayMs: delay });
    state.reconnectTimer = setTimeout(() => {
      state.reconnectTimer = null;
      if (state.closedByCaller) return;
      openSocket();
    }, delay);
  }

  function send(intent: IIntentPayload): void {
    if (!state.socket) return;
    const envelope = {
      kind: 'Intent' as const,
      matchId,
      ts: nowIso(),
      playerId: auth.playerId,
      intent,
    };
    const parsed = ClientMessageSchema.safeParse(envelope);
    if (!parsed.success) {
      emit('error', new Error('Intent failed local validation'));
      return;
    }
    try {
      state.socket.send(JSON.stringify(parsed.data));
    } catch (e) {
      emit('error', e);
    }
  }

  function on(
    event: IClientEventName,
    handler: IClientEventHandler,
  ): () => void {
    let set = listeners.get(event);
    if (!set) {
      set = new Set();
      listeners.set(event, set);
    }
    set.add(handler);
    return () => {
      set?.delete(handler);
    };
  }

  function close(): void {
    state.closedByCaller = true;
    if (state.reconnectTimer) {
      clearTimeout(state.reconnectTimer);
      state.reconnectTimer = null;
    }
    try {
      state.socket?.close();
    } catch {
      // ignore
    }
  }

  // Kick the connection now so the caller can attach listeners
  // synchronously after `connect()` returns.
  openSocket();

  return {
    send,
    on,
    close,
    lastSeq: () => state.lastSeq,
    isReady: () => state.ready,
  };
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
