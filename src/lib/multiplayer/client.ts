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
  /**
   * Authority high-water the client has observed, or `-1` before any
   * event carrying `sequence`. SessionJoin still quotes this alongside
   * `deliveryCursor` (removing `lastSeq` is slice B). Admission itself
   * is delivery-first when the live frame carries `deliverySequence`.
   */
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
  /**
   * Commands sent but not yet answered, keyed by the id they went out
   * with. A reconnect re-sends these AS THEY ARE: minting a fresh id
   * would let authority apply the same command twice when the first
   * attempt landed before the socket died.
   */
  pendingIntents: Map<string, unknown>;
  replayBuffer: unknown[];
  /**
   * Identity of recently applied AUTHORITY sequences. Secondary fork
   * check while `event.sequence` is still on the wire (slice B removes
   * it). Bounded and evicted oldest-first.
   */
  appliedIdentityBySeq: Map<number, string>;
  /**
   * Identity of recently applied DELIVERY numbers. Primary admission
   * key for live frames. Same window as the authority map.
   */
  appliedIdentityByDelivery: Map<number, string>;
  /**
   * Recently applied event identities, for ReplayChunk items that carry
   * neither a delivery number nor `event.sequence`. Arrival order in
   * the chunk is the ordering; this set is the exactly-once check.
   */
  appliedIdentities: Map<string, true>;
  /**
   * Set once a sequence collision was seen. The stream forked, so
   * nothing after it can be trusted and application stops.
   */
  blockedBySequenceCollision: boolean;
  lastSeq: number;
  /**
   * Highest delivery number this client has applied, or `-1` before the
   * first numbered live frame. Twin of `lastSeq` on the delivery axis
   * (transitional dual-key awaiting slice B).
   */
  lastAppliedDelivery: number;
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
   * The delivery sequence a resync may quote: the last one with NOTHING
   * MISSING BEFORE IT.
   *
   * Deliberately not the same number as `lastDeliverySequence`. That one
   * is the highest frame SEEN and is what gap detection compares
   * against; this one is what the client may honestly claim to hold. A
   * hole moves the first and pins the second, which is the entire
   * difference between a cursor that can describe a loss and one that
   * cannot.
   */
  deliveryResumeCursor: number | null;
  /**
   * The AUTHORITY sequence of the frame that revealed the newest hole
   * still pinning `deliveryResumeCursor`, or null when nothing is
   * pinned.
   *
   * The delivery sequence cannot say whether a recovery worked -
   * `ReplayChunk` frames carry no `deliverySequence` at all, because
   * only the live broadcast stamps one. The authority sequence can:
   * `ReplayEnd.toSeq` is the highest authority sequence the replay
   * carried, and a hole always sits strictly before the frame that
   * revealed it. So `toSeq >= this` is the client's only evidence that
   * what it asked for actually arrived.
   */
  deliveryHoleRevealSeq: number | null;
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
  /** Re-send every command still waiting for an answer. */
  readonly resendPending: () => void;
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
      // ReplayChunk items have no `deliverySequence`. Dual-key falls
      // back to `event.sequence` when present, else arrival order plus
      // event identity (sequence-free path for slice B).
      for (const admitted of admitLiveEvent(state, evt)) {
        state.replayBuffer.push(admitted);
        updateLastSeq(admitted);
        rememberApplied(state, admitted);
      }
    }
  },
  ReplayEnd: ({ message, state, emit, resendPending }) => {
    const end = message as Extract<IServerMessage, { kind: 'ReplayEnd' }>;
    // Whatever asked for this replay has been served - including a gap
    // recovery, so the next hole is allowed to ask again.
    const answeredGapRecovery = state.recoveringFromGap;
    state.recoveringFromGap = false;
    // ...and this is the ONLY place the delivery cursor may move past a
    // hole, because it is the only place the client learns that what it
    // asked for was actually sent.
    if (answeredGapRecovery) releaseDeliveryPin(state, end.toSeq);
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
    // Caught up, so anything still unanswered can be asked again - with
    // the id it originally carried, which is what lets authority
    // recognise a retry instead of applying a second command.
    resendPending();
  },
  Event: ({ message, state, emit, updateLastSeq, requestResync }) => {
    const eventMessage = message as Extract<IServerMessage, { kind: 'Event' }>;
    const wasBlocked = state.blockedBySequenceCollision;
    for (const event of admitLiveEvent(
      state,
      eventMessage.event,
      eventMessage.deliverySequence,
    )) {
      // Authority stamps the id onto the first event a command
      // produces, so this is the client learning its command landed.
      settlePendingIntent(
        state,
        (event as { payload?: { intentId?: unknown } }).payload?.intentId,
      );
      updateLastSeq(event);
      rememberApplied(state, event, eventMessage.deliverySequence);
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
    if (
      noteDeliveryGap(
        state,
        eventMessage.deliverySequence,
        sequenceOf(eventMessage.event),
      )
    ) {
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
      //
      // A hole opening WHILE a recovery is in flight is therefore not
      // asked about on its own, and it is not assumed recovered either.
      // The answer already coming is a tail replay from the earlier
      // hole, so it covers this one whenever the server had the frame
      // by the time it snapshotted - and `noteDeliveryGap` has moved
      // the evidence watermark up to this frame, so the cursor un-pins
      // only if `ReplayEnd` proves that. Otherwise the pin holds and
      // the next hole asks from the earlier point.
      if (!state.recoveringFromGap) {
        state.recoveringFromGap = true;
        requestResync();
      }
    }
  },
  Heartbeat: () => {
    // Server liveness ping; clients do not need to echo.
  },
  Error: ({ message, state, emit }) => {
    const error = message as Extract<IServerMessage, { kind: 'Error' }>;
    // A refusal is an answer. Rejected, vetoed, duplicate, refused for
    // scope - the command is settled either way, and retrying it on the
    // next reconnect would just be refused again forever.
    settlePendingIntent(state, error.intentId);
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
  const wireToken: string = encodeMatchSocketToken(auth.token);
  const listeners = new Map<IClientEventName, Set<IClientEventHandler>>();

  const state: IClientState = {
    socket: null,
    closedByCaller: false,
    ready: false,
    pendingLiveEvents: [],
    pendingIntents: new Map(),
    replayBuffer: [],
    appliedIdentityBySeq: new Map(),
    appliedIdentityByDelivery: new Map(),
    appliedIdentities: new Map(),
    blockedBySequenceCollision: false,
    lastSeq: options.lastSeq ?? -1,
    lastAppliedDelivery: -1,
    reconnectAttempt: 0,
    reconnectTimer: null,
    heartbeatTimer: null,
    livenessTimer: null,
    lastDeliverySequence: null,
    deliveryResumeCursor: null,
    deliveryHoleRevealSeq: null,
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

function encodeMatchSocketToken(token: IPlayerToken | string): string {
  return typeof token === 'string' ? token : encodeTokenForWire(token);
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
    // Gap DETECTION restarts here; the quotable CURSOR deliberately
    // does not.
    //
    // `lastDeliverySequence` resets because the frames the server wrote
    // to the dying socket consumed their numbers, so the first frame of
    // the new connection would otherwise read as a hole - one the
    // `SessionJoin` below has already asked about.
    //
    // `deliveryResumeCursor` survives, and that is the whole point of
    // it. The server does NOT renumber a reconnecting viewer's stream
    // (`ViewerDeliveryCursors.forget` is teardown-only), so the record
    // this cursor indexes into is still there to resume against.
    // Clearing it would make every reconnect quote no delivery cursor
    // at all and the server would fall back to `lastSeq` - the
    // authority high-water this change exists to stop resuming from -
    // which turns a hole that was open when the socket died into one
    // nobody can ever ask about again.
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
    // The LAST CONTIGUOUS one, never the highest seen. Quoting the
    // highest is how a resume silently skips the frame it lost.
    ...(runtime.state.deliveryResumeCursor !== null
      ? { deliveryCursor: runtime.state.deliveryResumeCursor }
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
    resendPending: () => resendPendingIntents(runtime),
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
 * Decide what a newly-arrived event lets the client apply. Both inbound
 * paths use it - live `Event` frames and `ReplayChunk` frames - so
 * duplicate suppression and collision blocking apply to each.
 *
 * Dual-key, delivery-first (transitional, awaiting slice B):
 *
 *   - live frames with `deliverySequence` admit on the delivery number;
 *     `event.sequence`, when present, is a secondary fork check;
 *   - frames without a delivery number fall back to `event.sequence`
 *     (today's ReplayChunk path, and pre-rollout live frames);
 *   - neither number: arrival order plus event identity, so a
 *     sequence-stripped recovery tail still applies exactly-once.
 *
 * Contiguity is NOT enforced on the authority sequence, and cannot be:
 * a fog viewer's slice of it is legitimately sparse. An event ahead of
 * the high-water is therefore applied, not held. The number that CAN be
 * checked for holes is the per-viewer `deliverySequence`, which
 * `noteDeliveryGap` tracks separately.
 */
function admitLiveEvent(
  state: IClientState,
  event: unknown,
  deliverySequence?: number,
): readonly unknown[] {
  if (state.blockedBySequenceCollision) return [];
  if (typeof deliverySequence === 'number') {
    return admitByDelivery(state, event, deliverySequence);
  }
  const sequence = sequenceOf(event);
  if (sequence !== null) return admitByAuthority(state, event, sequence);
  return admitByIdentity(state, event);
}

function admitByDelivery(
  state: IClientState,
  event: unknown,
  deliverySequence: number,
): readonly unknown[] {
  const identity = identityOf(event);
  if (deliverySequence <= state.lastAppliedDelivery) {
    const known = state.appliedIdentityByDelivery.get(deliverySequence);
    if (known !== undefined) {
      if (known !== identity) state.blockedBySequenceCollision = true;
      return [];
    }
    if (!state.recoveringFromGap) return [];
    if (
      state.lastAppliedDelivery - deliverySequence >=
      APPLIED_IDENTITY_WINDOW
    ) {
      return [];
    }
  }
  // Secondary consistency check while `event.sequence` is still on the
  // wire. A new delivery number whose authority sequence was already
  // applied is a fork, even though delivery-first admission would
  // otherwise take it. Slice B drops this once the field is gone.
  const authoritySeq = sequenceOf(event);
  if (authoritySeq !== null) {
    const knownAuth = state.appliedIdentityBySeq.get(authoritySeq);
    if (knownAuth !== undefined) {
      state.blockedBySequenceCollision = true;
      return [];
    }
  }
  return [event];
}

function admitByAuthority(
  state: IClientState,
  event: unknown,
  sequence: number,
): readonly unknown[] {
  if (sequence <= state.lastSeq) {
    const known = state.appliedIdentityBySeq.get(sequence);
    if (known !== undefined) {
      // Already applied - ordinarily a duplicate, which is fine. But if
      // this sequence carries a DIFFERENT event than the one applied
      // under it, the stream forked, and silently ignoring the second
      // would hide the fork rather than report it.
      if (known !== identityOf(event)) state.blockedBySequenceCollision = true;
      return [];
    }
    // Below the high-water yet never applied. THIS IS THE RECOVERED
    // FRAME, and dropping it is what made the whole gap recovery a
    // no-op end to end: a lost frame's sequence is by definition below
    // the high-water, because the frame that revealed the hole already
    // advanced it. The server resumed from exactly the right event and
    // the client threw it away on arrival - measured against the real
    // fog server before this guard existed.
    //
    // Two conditions keep the opening narrow. It only applies while a
    // gap recovery is in flight, which is the one inbound path that
    // legitimately carries something older than the high-water; and it
    // only reaches back as far as the identity window, because beyond
    // that "not remembered" stops meaning "never applied" and starts
    // meaning "evicted" - re-admitting there would apply an old event
    // twice.
    if (!state.recoveringFromGap) return [];
    if (state.lastSeq - sequence >= APPLIED_IDENTITY_WINDOW) return [];
    return [event];
  }
  // AHEAD OF THE CURSOR IS NORMAL. A fog-of-war viewer's authority
  // stream is LEGITIMATELY SPARSE: the server skips the send for events
  // the viewer may not see and keeps the authority sequence on the
  // rest. Contiguity is enforced on `deliverySequence` instead.
  return [event];
}

function admitByIdentity(
  state: IClientState,
  event: unknown,
): readonly unknown[] {
  // Sequence-free ReplayChunk (slice B future, and the slice A proof).
  // `ReplayStart.fromSeq` / `ReplayEnd.toSeq` are still authority-space
  // bounds and cannot number individual items, so arrival order in the
  // chunk is the ordering and identity is the exactly-once key.
  const identity = identityOf(event);
  if (identity.length > 0 && state.appliedIdentities.has(identity)) {
    return [];
  }
  return [event];
}

/**
 * How many applied sequences to remember for collision detection. Short
 * on purpose: a fork shows up immediately or not at all, and the map is
 * per-connection.
 */
const APPLIED_IDENTITY_WINDOW = 256;

/** Remember an applied event so a later repeat can be checked. */
function rememberApplied(
  state: IClientState,
  event: unknown,
  deliverySequence?: number,
): void {
  const identity = identityOf(event);
  if (typeof deliverySequence === 'number') {
    state.appliedIdentityByDelivery.set(deliverySequence, identity);
    if (deliverySequence > state.lastAppliedDelivery) {
      state.lastAppliedDelivery = deliverySequence;
    }
    evictOldest(state.appliedIdentityByDelivery);
  }
  const sequence = sequenceOf(event);
  if (sequence !== null) {
    state.appliedIdentityBySeq.set(sequence, identity);
    evictOldest(state.appliedIdentityBySeq);
  }
  if (identity.length > 0) {
    state.appliedIdentities.set(identity, true);
    evictOldest(state.appliedIdentities);
  }
}

function evictOldest<K>(map: Map<K, unknown>): void {
  while (map.size > APPLIED_IDENTITY_WINDOW) {
    const oldest = map.keys().next().value;
    if (oldest === undefined) break;
    map.delete(oldest);
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
  authoritySequence: number | null,
): boolean {
  if (typeof deliverySequence !== 'number') return false;
  const previous = state.lastDeliverySequence;
  state.lastDeliverySequence = deliverySequence;
  if (previous === null) {
    // First numbered frame of THIS connection - and it arrives behind
    // this connection's own `SessionJoin` replay, on the same socket,
    // so it is ordered after it. That join quoted whatever cursor was
    // pinned, so the server has already resumed this viewer from the
    // hole and everything before this frame has been served. The cursor
    // is honest here, which is what stops a reconnect from dragging an
    // old pin forward for the rest of the match.
    state.deliveryResumeCursor = deliverySequence;
    state.deliveryHoleRevealSeq = null;
    return false;
  }
  if (deliverySequence === previous + 1) {
    // A contiguous step - but the cursor follows it ONLY when it was
    // already sitting on `previous`.
    //
    // That condition is the whole difference between "nothing missing
    // before it" and "nothing missing since the last thing that went
    // missing". A cursor pinned behind an unfilled hole must not leap
    // forward just because the stream downstream of the loss runs
    // contiguously again: those in-between frames were never received,
    // and quoting past them tells the server to resume after events
    // this client does not hold. Un-pinning is evidence-based instead
    // and happens in `releaseDeliveryPin`, once the replay that was
    // asked for has actually been served.
    if (state.deliveryResumeCursor === previous) {
      state.deliveryResumeCursor = deliverySequence;
    }
    return false;
  }
  // A HOLE, so the resume cursor STAYS BEHIND IT - and that is the
  // whole fix. The server resolves `deliveryCursor` through this
  // viewer's delivery record and replays from the first frame it
  // LACKS, so a cursor that had advanced to the frame AFTER the loss
  // asked for the tail past the hole: the missing frame was excluded
  // from the very replay fetched to recover it. Leaving the cursor at
  // the last frame with nothing missing before it is what makes the
  // hole askable.
  //
  // The revealing frame's AUTHORITY sequence is remembered because a
  // later `ReplayEnd` is checked against it: the hole sits strictly
  // earlier in the stream than the frame that exposed it, so a replay
  // reaching that sequence covered the hole too. Frames carrying no
  // authority sequence fall back to the high-water, the most recent
  // thing known to be held.
  state.deliveryHoleRevealSeq = Math.max(
    state.deliveryHoleRevealSeq ?? Number.NEGATIVE_INFINITY,
    authoritySequence ?? state.lastSeq,
  );
  return true;
}

/**
 * Un-pin the delivery cursor - but only on evidence that the hole was
 * filled.
 *
 * A gap recovery asks the server to resume from the frame this client
 * LACKS, and the answer covers authority sequences up to
 * `ReplayEnd.toSeq`. The hole sits strictly before the frame that
 * revealed it, so a `toSeq` reaching that revealing sequence is proof
 * the hole was inside the replay - and the client now genuinely holds
 * everything up to the highest delivery frame it has seen.
 *
 * Short of that the replay was snapshotted before the loss reached the
 * store, nothing has been proven, and the cursor stays where it is. The
 * next hole then asks from the earlier point, which costs a longer
 * replay and never costs correctness.
 *
 * Delivery numbering cannot supply this evidence itself: `ReplayChunk`
 * frames carry no `deliverySequence`, because only the live broadcast
 * stamps one (`ServerMatchHostEvents`). The authority sequence is the
 * only number both paths share.
 */
function releaseDeliveryPin(state: IClientState, toSeq: number): void {
  const revealed = state.deliveryHoleRevealSeq;
  if (revealed === null) return;
  if (toSeq < revealed) return;
  if (state.lastDeliverySequence === null) return;
  state.deliveryResumeCursor = state.lastDeliverySequence;
  state.deliveryHoleRevealSeq = null;
}

function updateLastSeq(state: IClientState, event: unknown): void {
  // Authority high-water only. Delivery is tracked on
  // `lastAppliedDelivery`; mixing the two number spaces into `lastSeq`
  // would make SessionJoin quote a delivery number as an authority
  // cursor. When `event.sequence` is absent, lastSeq stays put and
  // resume relies on `deliveryCursor` (slice B's remaining wire field).
  const seq = sequenceOf(event);
  if (seq !== null && seq > state.lastSeq) state.lastSeq = seq;
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

/**
 * Mint the identity the server dedupes on.
 *
 * `Protocol.ts` states that the M2 client always stamps an `intentId`,
 * and until now this function did not: every intent went out unstamped.
 * That is not a cosmetic omission, because the field is optional for
 * pre-M2 clients and the server SKIPS the duplicate check when it is
 * absent — so an unstamped intent is exempt from replay protection, and
 * a replayed envelope could re-trigger a movement or attack, which is
 * the exact thing design D7 exists to prevent.
 *
 * Minted per send rather than per payload: two deliberate identical
 * commands are two commands, and giving them one id would have the
 * server refuse the second as a replay. Reusing an id across a RETRY of
 * the same attempt is the opposite case and is task 5.2, which will
 * hold onto this value rather than mint a new one.
 */
function mintIntentId(): string {
  if (
    typeof crypto !== 'undefined' &&
    typeof crypto.randomUUID === 'function'
  ) {
    return crypto.randomUUID();
  }
  // Older runtimes: timestamp plus two random segments. Not RFC-4122,
  // but the server only needs it to be unique within a match.
  const rand = (): string => Math.random().toString(36).slice(2, 10);
  return `intent-${Date.now().toString(36)}-${rand()}-${rand()}`;
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
    intentId: mintIntentId(),
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
  // Remembered BEFORE the write, because a send that throws is exactly
  // the case this exists for: the command is pending either way, and
  // only a receipt says otherwise.
  runtime.state.pendingIntents.set(envelope.intentId, parsed.data);
  try {
    runtime.state.socket.send(JSON.stringify(parsed.data));
  } catch (e) {
    emitClientEvent(runtime, 'error', e);
  }
}

/**
 * Re-send everything still waiting for an answer, oldest first.
 *
 * Fired once the replay window closes, not on socket open: until then
 * the client is still being caught up, and a command sent into that
 * window races the very replay meant to tell it whether the command
 * already landed.
 */
function resendPendingIntents(runtime: IClientRuntime): void {
  const socket = runtime.state.socket;
  if (socket === null) return;
  for (const envelope of Array.from(runtime.state.pendingIntents.values())) {
    try {
      socket.send(JSON.stringify(envelope));
    } catch (e) {
      emitClientEvent(runtime, 'error', e);
      // Stop at the first failure: the socket is dying, and the rest
      // stay pending for the next reconnect rather than being dropped.
      return;
    }
  }
}

/**
 * A command has been answered. Clears ONLY that one.
 *
 * Both terminal shapes carry the id back: authority stamps it onto the
 * first event a command produces, and a refusal correlates its Error
 * frame with it. Anything else - another player's events, an
 * unrelated error - leaves this command pending, which is the whole
 * point of keying on the id rather than clearing on any traffic.
 */
function settlePendingIntent(state: IClientState, intentId: unknown): void {
  if (typeof intentId !== 'string') return;
  state.pendingIntents.delete(intentId);
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
