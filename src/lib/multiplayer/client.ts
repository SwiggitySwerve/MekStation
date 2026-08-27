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
 * @spec openspec/specs/multiplayer-server/spec.md
 */

import {
  encodeTokenForWire,
  type IPlayerToken,
} from '@/types/multiplayer/Player';
import {
  ClientMessageSchema,
  ServerMessageSchema,
  HEARTBEAT_INTERVAL_MS,
  HEARTBEAT_TIMEOUT_MS,
  RECONNECT_INITIAL_MS,
  RECONNECT_MAX_MS,
  RECONNECT_MULTIPLIER,
  type IServerMessage,
  type IIntentPayload,
  nowIso,
} from '@/types/multiplayer/Protocol';

import { credentialProtocols } from './socketCredentialProtocol';

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
export type WebSocketFactory = (
  url: string,
  protocols?: string[],
) => IClientWebSocket;

export interface IConnectOptions {
  /** Override the WebSocket factory (tests). */
  socketFactory?: WebSocketFactory;
  /** Disable auto-reconnect (tests, controlled shutdown). */
  reconnect?: boolean;
  /** Optional cap for consecutive reconnect attempts before terminal close. */
  maxReconnectAttempts?: number;
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
  /**
   * Identity of recently applied sequences, so a REPEAT of one can be
   * told apart from a COLLISION on it. Bounded and evicted oldest-first
   * for the same reason the server's intent window is: the useful
   * horizon is short, and an unbounded map is a leak dressed as a
   * safety feature.
   */
  appliedIdentityBySeq: Map<number, string>;
  /**
   * Set once a sequence collision was seen. The stream forked, so
   * nothing after it can be trusted and application stops.
   */
  blockedBySequenceCollision: boolean;
  lastSeq: number;
  reconnectAttempt: number;
  reconnectTimer: ReturnType<typeof setTimeout> | null;
  // The client's half of the bidirectional heartbeat. Kept on the
  // state rather than closed over, because it has to be cleared from
  // both the close paths and a reconnect starts a fresh one.
  heartbeatTimer: ReturnType<typeof setInterval> | null;
  // The other half: the deadline by which the SERVER must have said
  // something. Re-armed by valid inbound traffic, never by our own
  // sends - a keepalive we wrote proves nothing about the peer.
  livenessTimer: ReturnType<typeof setTimeout> | null;
  /**
   * Last per-viewer delivery sequence seen on this connection, or null
   * before the first numbered frame. Reset per socket: a reconnect is a
   * fresh stream, so the previous connection's number says nothing
   * about the next one's.
   */
  lastDeliverySequence: number | null;
  /**
   * True while a gap recovery is in flight. Without it a burst of lost
   * frames would fire one resync each, and every resync is a full
   * replay - turning a small loss into a stampede.
   */
  recoveringFromGap: boolean;
  suppressNextSocketCloseEvent: boolean;
}

type ClientEmit = (name: IClientEventName, payload: unknown) => void;
type LastSeqUpdater = (event: unknown) => void;
type ServerMessageHandlerContext = {
  readonly message: IServerMessage;
  readonly state: IClientState;
  readonly emit: ClientEmit;
  readonly updateLastSeq: LastSeqUpdater;
  /** Re-send `SessionJoin` to pull the tail this client is missing. */
  readonly requestResync: () => void;
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
    // Through the SAME admission as live traffic, so duplicate
    // suppression and collision blocking apply to both inbound paths.
    // Replay is fog-filtered per viewer too, so it is sparse for the
    // same reason live traffic is and no contiguity is asserted here.
    for (const evt of replay.events) {
      for (const admitted of admitLiveEvent(state, evt)) {
        state.replayBuffer.push(admitted);
        updateLastSeq(admitted);
        rememberApplied(state, admitted);
      }
    }
  },
  ReplayEnd: ({ state, emit }) => {
    // Whatever asked for this replay has been served - including a gap
    // recovery, so the next hole is allowed to ask again.
    state.recoveringFromGap = false;
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
  Event: ({ message, state, emit, updateLastSeq, requestResync }) => {
    const eventMessage = message as Extract<IServerMessage, { kind: 'Event' }>;
    const wasBlocked = state.blockedBySequenceCollision;
    for (const event of admitLiveEvent(state, eventMessage.event)) {
      updateLastSeq(event);
      rememberApplied(state, event);
      if (!state.ready) {
        state.pendingLiveEvents.push(event);
        continue;
      }
      emit('event', event);
    }
    if (!wasBlocked && state.blockedBySequenceCollision) {
      emit('error', {
        code: 'PROTOCOL_VIOLATION',
        reason: 'sequence-collision',
      });
    }
    if (noteDeliveryGap(state, eventMessage.deliverySequence)) {
      // ADVISORY ONLY - the events above were already applied, and that
      // is deliberate. Holding them behind a gap is what a previous
      // change did against the AUTHORITY sequence, and under fog it
      // stalls forever on an event the viewer may never receive. This
      // number is different: a hole in it means a frame was genuinely
      // lost, so it is worth reporting - but the right response is to
      // resynchronize, not to stop applying what did arrive.
      emit('error', {
        code: 'PROTOCOL_VIOLATION',
        reason: 'delivery-gap',
      });
      // ...and RECOVER. Reporting a hole without pulling the missing
      // frames leaves the client quietly wrong, which is worse than
      // loud and wrong. One recovery at a time: a burst of losses would
      // otherwise fire a full replay each.
      if (!state.recoveringFromGap) {
        state.recoveringFromGap = true;
        requestResync();
      }
    }
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
    state.closedByCaller = true;
    state.suppressNextSocketCloseEvent = true;
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
  CampaignSnapshot: ({ message, emit }) => {
    emit('event', message);
  },
  CampaignEvent: ({ message, emit }) => {
    emit('event', message);
  },
  CampaignProposal: ({ message, emit }) => {
    emit('event', message);
  },
  CampaignDecision: ({ message, emit }) => {
    emit('event', message);
  },
  CampaignParticipation: ({ message, emit }) => {
    emit('event', message);
  },
  // Grant-channel frames (task 3.3): emit as events so a replica client
  // can apply via applyCampaignGrantDelivery. No room-code lastSeq.
  CampaignGrantDelivery: ({ message, emit }) => {
    emit('event', message);
  },
  CampaignGrantRebaseline: ({ message, emit }) => {
    emit('event', message);
  },
  CampaignGrantSnapshot: ({ message, emit }) => {
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
    appliedIdentityBySeq: new Map(),
    blockedBySequenceCollision: false,
    lastSeq: options.lastSeq ?? -1,
    reconnectAttempt: 0,
    reconnectTimer: null,
    heartbeatTimer: null,
    livenessTimer: null,
    lastDeliverySequence: null,
    recoveringFromGap: false,
    suppressNextSocketCloseEvent: false,
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
  // No `token` here. The credential rides in the subprotocol header
  // (`credentialProtocols`) so it stays out of access and proxy logs.
  // matchId and playerId are routing hints, not secrets, and the server
  // trusts neither - it derives the principal from the token alone.
  const params = new URLSearchParams({
    matchId: runtime.matchId,
    playerId: runtime.auth.playerId,
  });
  return `${runtime.url}${sep}${params.toString()}`;
}

function openSocket(runtime: IClientRuntime): void {
  const socket = runtime.factory(
    buildSocketUrl(runtime),
    credentialProtocols(runtime.wireToken),
  );
  runtime.state.socket = socket;

  socket.onopen = () => {
    // A reconnect is a fresh delivery stream.
    runtime.state.lastDeliverySequence = null;
    sendSessionJoin(runtime, socket);
    startHeartbeat(runtime, socket);
    armLiveness(runtime, socket);
  };
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
    // The client's own numbering. Sent ALONGSIDE `lastSeq`, not instead
    // of it: the server prefers this when it still holds the delivery
    // record and falls back otherwise, so a restarted server still
    // resumes this client correctly.
    ...(runtime.state.lastDeliverySequence !== null
      ? { deliveryCursor: runtime.state.lastDeliverySequence }
      : {}),
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
  // Re-armed HERE rather than on raw receipt, because the spec asks
  // liveness to reset only on valid protocol traffic: a peer emitting
  // garbage is not a peer that is still speaking the protocol.
  const socket = runtime.state.socket;
  if (socket !== null) armLiveness(runtime, socket);
  handleServerMessage(runtime, parsed.data);
}

function handleSocketClose(runtime: IClientRuntime): void {
  stopHeartbeat(runtime);
  stopLiveness(runtime);
  if (runtime.state.suppressNextSocketCloseEvent) {
    runtime.state.suppressNextSocketCloseEvent = false;
  } else {
    emitClientEvent(runtime, 'close', null);
  }
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
    requestResync: () => {
      const socket = runtime.state.socket;
      if (socket === null) return;
      // The same frame a fresh connection sends. It carries `lastSeq`,
      // so the server replays exactly the tail this client is missing
      // rather than the whole match.
      sendSessionJoin(runtime, socket);
    },
  });
}

/**
 * Decide what a newly-arrived live event lets the client apply.
 *
 * The client used to apply whatever arrived and move its cursor to the
 * highest sequence it had seen. A dropped frame therefore did not just
 * delay an event, it LOST it: the cursor had already advanced past the
 * missing sequence, so the reconnect replay resumed after it and
 * nothing ever noticed the hole.
 *
 * Three cases, and each one is a different kind of normal:
 *
 *   - the NEXT sequence: apply it, then drain anything buffered behind
 *     it, because filling a gap can release a run;
 *   - one already applied: ignore it. At-least-once delivery makes a
 *     duplicate ordinary traffic, not an error;
 *   - one ahead of the cursor: HOLD it. Reordering is usually momentary
 *     and the missing frame arrives right after, so re-fetching the
 *     whole tail would be a heavy answer to a light problem. The cursor
 *     stays where it is, which is what makes a reconnect resume from
 *     the hole rather than past it.
 *
 * Events without a numeric sequence are not part of the sequenced
 * stream and pass straight through.
 */
function admitLiveEvent(
  state: IClientState,
  event: unknown,
): readonly unknown[] {
  if (state.blockedBySequenceCollision) return [];
  const sequence = sequenceOf(event);
  if (sequence === null) return [event];
  if (sequence <= state.lastSeq) {
    // Already applied - ordinarily a duplicate, which is fine. But if
    // this sequence carries a DIFFERENT event than the one applied
    // under it, the stream forked, and silently ignoring the second
    // would hide the fork rather than report it.
    const known = state.appliedIdentityBySeq.get(sequence);
    if (known !== undefined && known !== identityOf(event)) {
      state.blockedBySequenceCollision = true;
    }
    return [];
  }
  // AHEAD OF THE CURSOR IS NORMAL, and this is the correction to the
  // previous version of this function, which held such an event back
  // as a "gap" until the missing sequence arrived.
  //
  // It never arrives. A fog-of-war viewer's stream is LEGITIMATELY
  // SPARSE: `broadcastEvent` filters each event per recipient and skips
  // the send entirely when it is not visible to them, keeping the
  // authority sequence on everything else. Measured on a two-player fog
  // match - one player received sequences [2..8, 10, 11, 12] and the
  // other [2..7, 9, 10, 11, 12]; each is missing precisely the event
  // the other could see. Holding at the first gap would have stalled
  // both clients permanently.
  //
  // Contiguity cannot be enforced on the AUTHORITY sequence at all,
  // which is exactly why the spec asks for a per-viewer
  // `deliverySequence` that is gapless BY VIEWER (umbrella task 5.1,
  // `Authority and Viewer Sequences Are Separate`). Until that exists
  // on the wire, the client advances.
  return [event];
}

/**
 * How many applied sequences to remember for collision detection. Short
 * on purpose: a fork shows up immediately or not at all, and the map is
 * per-connection.
 */
const APPLIED_IDENTITY_WINDOW = 256;

/** Remember an applied event so a later repeat can be checked. */
function rememberApplied(state: IClientState, event: unknown): void {
  const sequence = sequenceOf(event);
  if (sequence === null) return;
  state.appliedIdentityBySeq.set(sequence, identityOf(event));
  while (state.appliedIdentityBySeq.size > APPLIED_IDENTITY_WINDOW) {
    const oldest = state.appliedIdentityBySeq.keys().next().value;
    if (oldest === undefined) break;
    state.appliedIdentityBySeq.delete(oldest);
  }
}

/**
 * What distinguishes one event from another at the same sequence. Its
 * `id` when it has one, else its type - enough to catch a fork without
 * digesting a payload on every frame.
 */
function identityOf(event: unknown): string {
  if (typeof event !== 'object' || event === null) return '';
  const record = event as { id?: unknown; type?: unknown };
  if (typeof record.id === 'string' && record.id.length > 0) return record.id;
  return typeof record.type === 'string' ? `type:${record.type}` : '';
}

/** An event's sequence, or null when it carries none. */
function sequenceOf(event: unknown): number | null {
  if (
    typeof event === 'object' &&
    event !== null &&
    'sequence' in event &&
    typeof (event as { sequence?: unknown }).sequence === 'number'
  ) {
    return (event as { sequence: number }).sequence;
  }
  return null;
}

/**
 * Track this connection's delivery sequence and report a hole exactly
 * once per occurrence.
 *
 * Returns true when the frame skipped ahead of the expected next value.
 * Frames without a delivery sequence are pre-rollout frames and are NOT
 * a gap - they simply carry no information about ordering.
 */
function noteDeliveryGap(
  state: IClientState,
  deliverySequence: number | undefined,
): boolean {
  if (typeof deliverySequence !== 'number') return false;
  const previous = state.lastDeliverySequence;
  state.lastDeliverySequence = deliverySequence;
  if (previous === null) return false;
  return deliverySequence !== previous + 1;
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
  const nextAttempt = runtime.state.reconnectAttempt + 1;
  const maxAttempts = runtime.options.maxReconnectAttempts;
  if (maxAttempts != null && nextAttempt > maxAttempts) {
    runtime.state.closedByCaller = true;
    emitClientEvent(runtime, 'close', {
      code: 'RECONNECT_LIMIT',
      reason: 'Unable to reconnect to multiplayer session',
    });
    return;
  }

  runtime.state.reconnectAttempt = nextAttempt;
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

/**
 * Start the client's half of the heartbeat.
 *
 * The server reaps a socket after `HEARTBEAT_TIMEOUT_MS` without
 * INBOUND traffic, and a player who is watching rather than acting -
 * a spectator, or anyone waiting out an opponent's turn - sends
 * nothing at all. Without this, a healthy connection was closed for
 * being quiet, and the client reconnected into the same silence.
 *
 * Sent at the server's own interval, so a single dropped frame still
 * leaves two more inside the timeout.
 */
function startHeartbeat(
  runtime: IClientRuntime,
  socket: IClientWebSocket,
): void {
  stopHeartbeat(runtime);
  stopLiveness(runtime);
  runtime.state.heartbeatTimer = setInterval(() => {
    // Only while this socket is still the live one AND open. A
    // reconnect swaps the socket out; writing to the old one would
    // throw on every tick forever.
    if (runtime.state.socket !== socket || socket.readyState !== 1) return;
    try {
      socket.send(
        JSON.stringify({
          kind: 'Heartbeat' as const,
          matchId: runtime.matchId,
          ts: nowIso(),
        }),
      );
    } catch {
      // A failed keepalive is not worth surfacing: the socket is
      // already dying and `onclose` reports that properly.
    }
  }, HEARTBEAT_INTERVAL_MS);
}

/**
 * Arm the deadline by which the server must have said something.
 *
 * `startHeartbeat` keeps the SERVER from reaping us for being quiet.
 * Nothing did the reverse: the inbound `Heartbeat` handler noted that
 * clients need not echo and then discarded it, so a server that stopped
 * talking - a half-open socket, a process killed without a FIN - was
 * indistinguishable from a healthy idle one, and the client waited in a
 * dead connection instead of reconnecting into a live one.
 *
 * Closing is the whole action: `onclose` already reports the drop and
 * schedules the reconnect, so this only has to make the silence visible
 * to machinery that is already there.
 *
 * Held to the SERVER's own timeout rather than a number of our own, so
 * the two halves cannot drift apart and start disagreeing about when a
 * connection is dead.
 */
function armLiveness(runtime: IClientRuntime, socket: IClientWebSocket): void {
  stopLiveness(runtime);
  runtime.state.livenessTimer = setTimeout(() => {
    // A reconnect swaps the socket out; closing the old one would drop
    // a connection that is already healthy.
    if (runtime.state.socket !== socket) return;
    try {
      socket.close();
    } catch {
      // Already dying. `onclose` reports it properly either way.
    }
  }, HEARTBEAT_TIMEOUT_MS);
}

/** Idempotent, and called from every path that ends a connection. */
function stopLiveness(runtime: IClientRuntime): void {
  if (runtime.state.livenessTimer === null) return;
  clearTimeout(runtime.state.livenessTimer);
  runtime.state.livenessTimer = null;
}

/** Idempotent, and called from every path that ends a connection. */
function stopHeartbeat(runtime: IClientRuntime): void {
  if (runtime.state.heartbeatTimer === null) return;
  clearInterval(runtime.state.heartbeatTimer);
  runtime.state.heartbeatTimer = null;
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
  stopHeartbeat(runtime);
  stopLiveness(runtime);
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
  return (url: string, protocols?: string[]) => {
    const Ctor =
      typeof globalThis !== 'undefined'
        ? (
            globalThis as {
              WebSocket?: new (
                url: string,
                protocols?: string[],
              ) => IClientWebSocket;
            }
          ).WebSocket
        : undefined;
    if (!Ctor) {
      throw new Error(
        'No WebSocket constructor available; pass options.socketFactory',
      );
    }
    return new Ctor(url, protocols);
  };
}
