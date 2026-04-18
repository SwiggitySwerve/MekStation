/**
 * Multiplayer Transport Protocol
 *
 * Wave 1 of Phase 4 (multiplayer foundation). Defines the wire-level
 * envelopes exchanged between the WebSocket server (`ServerMatchHost`)
 * and any client (`src/lib/multiplayer/client.ts`). Every message is
 * JSON-encoded and validated through the zod schemas exported below.
 *
 * Why discriminated unions: zod's `discriminatedUnion` keeps the parse
 * step O(1) on the `kind` field and produces excellent inference for
 * downstream consumers (no manual narrowing required).
 *
 * Stability contract:
 *   - `kind`, `matchId`, and `ts` (ISO timestamp) are present on EVERY
 *     envelope so any router/observability layer can correlate without
 *     parsing the payload.
 *   - The unions are *open for extension* (Wave 3b will add lobby
 *     intents, Wave 4 will add reconnect-resume framing). Adding a new
 *     variant is a non-breaking change for older clients only if the
 *     server keeps emitting the variants the older client already knows.
 *
 * @spec openspec/changes/add-multiplayer-server-infrastructure/specs/multiplayer-server/spec.md
 */

import { z } from 'zod';

import { MatchSeatSchema } from './Lobby';

// =============================================================================
// Shared envelope fragments
// =============================================================================

/**
 * Every envelope carries `kind`, `matchId`, and `ts`. The base schema is
 * a `z.object` factory so each discriminated variant can `.merge()` it
 * without losing literal narrowing on `kind`.
 */
const matchIdSchema = z.string().min(1);
const tsSchema = z.string().min(1); // ISO-8601 timestamp; we don't validate format strictly here

// =============================================================================
// Client -> Server messages
// =============================================================================

/**
 * SessionJoin — first message a client sends after the WebSocket opens.
 * Server uses it to authenticate the player against the match's
 * participants list and to start replay streaming.
 *
 * `lastSeq` is optional in Wave 1 and used by Wave 4 (reconnect): if
 * provided, the server streams events strictly AFTER `lastSeq`. If
 * omitted, the server streams from sequence 0.
 */
export const SessionJoinSchema = z.object({
  kind: z.literal('SessionJoin'),
  matchId: matchIdSchema,
  ts: tsSchema,
  playerId: z.string().min(1),
  token: z.string().min(1),
  lastSeq: z.number().int().nonnegative().optional(),
});
export type ISessionJoin = z.infer<typeof SessionJoinSchema>;

/**
 * Intent — a player's request to mutate the engine. The server validates
 * (out-of-phase, wrong side, unknown unit, etc.) and either applies +
 * broadcasts the resulting events or replies with an `Error` envelope.
 *
 * Wave 1 supports `Move`, `Attack`, `AdvancePhase`, `Concede`. Lobby
 * intents (`OccupySeat`, `LeaveSeat`, `Ready`, `LaunchMatch`) land in
 * Wave 3b and slot in here as additional discriminants.
 */
export const MoveIntentSchema = z.object({
  kind: z.literal('Move'),
  unitId: z.string().min(1),
  to: z.object({ q: z.number().int(), r: z.number().int() }),
  facing: z.number().int().min(0).max(5),
  movementType: z.string().min(1),
});
export type IMoveIntent = z.infer<typeof MoveIntentSchema>;

export const AttackIntentSchema = z.object({
  kind: z.literal('Attack'),
  attackerId: z.string().min(1),
  targetId: z.string().min(1),
  weaponIds: z.array(z.string().min(1)).min(1),
});
export type IAttackIntent = z.infer<typeof AttackIntentSchema>;

export const AdvancePhaseIntentSchema = z.object({
  kind: z.literal('AdvancePhase'),
});
export type IAdvancePhaseIntent = z.infer<typeof AdvancePhaseIntentSchema>;

export const ConcedeIntentSchema = z.object({
  kind: z.literal('Concede'),
  side: z.enum(['player', 'opponent']),
});
export type IConcedeIntent = z.infer<typeof ConcedeIntentSchema>;

// ---------------------------------------------------------------------------
// Wave 3b lobby intents
// ---------------------------------------------------------------------------

/**
 * Lobby intents drive seat occupancy / readiness / launch. They share
 * the same `Intent` envelope as engine intents — the server's intent
 * dispatcher routes by `kind` to either the engine handler (Wave 1) or
 * the lobby handler (Wave 3b).
 *
 * Authorization: `ReassignSeat`, `SetAiSlot`, `SetHumanSlot`, and
 * `LaunchMatch` are host-only and the host check happens in the
 * dispatcher (the per-socket `playerId` from auth is compared to
 * `meta.hostPlayerId`). `OccupySeat`/`LeaveSeat`/`SetReady` are
 * scoped to the requesting player.
 */
export const OccupySeatIntentSchema = z.object({
  kind: z.literal('OccupySeat'),
  slotId: z.string().min(1),
});
export type IOccupySeatIntent = z.infer<typeof OccupySeatIntentSchema>;

export const LeaveSeatIntentSchema = z.object({
  kind: z.literal('LeaveSeat'),
  slotId: z.string().min(1),
});
export type ILeaveSeatIntent = z.infer<typeof LeaveSeatIntentSchema>;

export const ReassignSeatIntentSchema = z.object({
  kind: z.literal('ReassignSeat'),
  slotId: z.string().min(1),
  toSide: z.string().min(1),
  toSeat: z.number().int().positive(),
});
export type IReassignSeatIntent = z.infer<typeof ReassignSeatIntentSchema>;

export const SetAiSlotIntentSchema = z.object({
  kind: z.literal('SetAiSlot'),
  slotId: z.string().min(1),
  aiProfile: z.string().min(1).optional(),
});
export type ISetAiSlotIntent = z.infer<typeof SetAiSlotIntentSchema>;

export const SetHumanSlotIntentSchema = z.object({
  kind: z.literal('SetHumanSlot'),
  slotId: z.string().min(1),
});
export type ISetHumanSlotIntent = z.infer<typeof SetHumanSlotIntentSchema>;

export const SetReadyIntentSchema = z.object({
  kind: z.literal('SetReady'),
  slotId: z.string().min(1),
  ready: z.boolean(),
});
export type ISetReadyIntent = z.infer<typeof SetReadyIntentSchema>;

export const LaunchMatchIntentSchema = z.object({
  kind: z.literal('LaunchMatch'),
});
export type ILaunchMatchIntent = z.infer<typeof LaunchMatchIntentSchema>;

export const IntentPayloadSchema = z.discriminatedUnion('kind', [
  MoveIntentSchema,
  AttackIntentSchema,
  AdvancePhaseIntentSchema,
  ConcedeIntentSchema,
  OccupySeatIntentSchema,
  LeaveSeatIntentSchema,
  ReassignSeatIntentSchema,
  SetAiSlotIntentSchema,
  SetHumanSlotIntentSchema,
  SetReadyIntentSchema,
  LaunchMatchIntentSchema,
]);
export type IIntentPayload = z.infer<typeof IntentPayloadSchema>;

/**
 * Per `add-authoritative-roll-arbitration` (Wave 3a): the server is the
 * SOLE source of randomness. Any intent that smuggles dice values
 * (`roll`, `rolls`, `diceValue`, etc.) must be rejected at the parse
 * step so a malicious or misbehaving client can't bias outcomes by
 * pre-supplying results. We test the entire intent payload as an
 * unknown record because zod's `discriminatedUnion` does not strip
 * unknown keys by default — extra fields would otherwise sail through
 * unchallenged.
 */
const FORBIDDEN_DICE_KEYS = [
  'roll',
  'rolls',
  'diceValue',
  'diceValues',
  'dice',
  'rollResult',
  'rollResults',
] as const;

/**
 * Returns true iff the parsed intent payload carries any of the
 * server-forbidden dice fields. Exported so tests can drive it
 * directly.
 */
export function intentHasForbiddenDiceField(payload: unknown): boolean {
  if (!payload || typeof payload !== 'object') return false;
  const record = payload as Record<string, unknown>;
  for (const key of FORBIDDEN_DICE_KEYS) {
    if (key in record) return true;
  }
  return false;
}

export const IntentSchema = z
  .object({
    kind: z.literal('Intent'),
    matchId: matchIdSchema,
    ts: tsSchema,
    playerId: z.string().min(1),
    intent: IntentPayloadSchema,
  })
  .refine((envelope) => !intentHasForbiddenDiceField(envelope.intent), {
    message: 'client-rolls-forbidden',
    path: ['intent'],
  });
export type IIntent = z.infer<typeof IntentSchema>;

/**
 * Heartbeat — keepalive, sent in BOTH directions. Server emits every
 * 20s; the client also responds to inbound heartbeats so the server can
 * detect a one-way stall (e.g., a TCP black hole on the client uplink).
 */
export const HeartbeatSchema = z.object({
  kind: z.literal('Heartbeat'),
  matchId: matchIdSchema,
  ts: tsSchema,
});
export type IHeartbeat = z.infer<typeof HeartbeatSchema>;

export const ClientMessageSchema = z.discriminatedUnion('kind', [
  SessionJoinSchema,
  IntentSchema,
  HeartbeatSchema,
]);
export type IClientMessage = z.infer<typeof ClientMessageSchema>;

// =============================================================================
// Server -> Client messages
// =============================================================================

/**
 * ReplayStart / ReplayChunk / ReplayEnd — the replay stream the server
 * sends right after a successful `SessionJoin`. The chunked shape lets
 * us stream large match histories without a single megabyte payload.
 *
 * Wave 1 always sends a single chunk because matches are short and
 * in-memory; Wave 4 (reconnect) MAY chunk by event count when matches
 * grow.
 */
export const ReplayStartSchema = z.object({
  kind: z.literal('ReplayStart'),
  matchId: matchIdSchema,
  ts: tsSchema,
  fromSeq: z.number().int().nonnegative(),
  totalEvents: z.number().int().nonnegative(),
});
export type IReplayStart = z.infer<typeof ReplayStartSchema>;

/**
 * ReplayChunk — one batch of historical events. We keep `events` as
 * unknown[] at the wire layer because the engine's `IGameEvent` shape is
 * a deeply nested discriminated union we don't want to re-validate per
 * message; the client trusts the server's invariants and casts.
 */
export const ReplayChunkSchema = z.object({
  kind: z.literal('ReplayChunk'),
  matchId: matchIdSchema,
  ts: tsSchema,
  events: z.array(z.unknown()),
});
export type IReplayChunk = z.infer<typeof ReplayChunkSchema>;

export const ReplayEndSchema = z.object({
  kind: z.literal('ReplayEnd'),
  matchId: matchIdSchema,
  ts: tsSchema,
  toSeq: z.number().int().nonnegative(),
});
export type IReplayEnd = z.infer<typeof ReplayEndSchema>;

/**
 * Event — a single live game event broadcast to every socket attached
 * to the match (including the originator, so client state-sync is
 * driven by broadcasts not optimistic local mutations).
 */
export const EventMessageSchema = z.object({
  kind: z.literal('Event'),
  matchId: matchIdSchema,
  ts: tsSchema,
  event: z.unknown(),
});
export type IEventMessage = z.infer<typeof EventMessageSchema>;

/**
 * Error — typed error frame. `code` is a stable string so clients can
 * branch on it; `reason` is a human-readable detail. Connection stays
 * OPEN unless the server also follows up with `Close`.
 */
export const ErrorCodeSchema = z.enum([
  'BAD_ENVELOPE',
  'PROTOCOL_VIOLATION',
  'INVALID_INTENT',
  'UNKNOWN_INTENT',
  'UNKNOWN_MATCH',
  'AUTH_REJECTED',
  'STORE_FAILURE',
  'INTERNAL_ERROR',
]);
export type IErrorCode = z.infer<typeof ErrorCodeSchema>;

export const ErrorMessageSchema = z.object({
  kind: z.literal('Error'),
  matchId: matchIdSchema,
  ts: tsSchema,
  code: ErrorCodeSchema,
  reason: z.string().optional(),
});
export type IErrorMessage = z.infer<typeof ErrorMessageSchema>;

/**
 * Close — server-initiated terminal frame. After this, the server will
 * drop the underlying socket. Clients should not attempt to reconnect
 * for the same match unless `code` is `STORE_FAILURE` or transient.
 */
export const CloseSchema = z.object({
  kind: z.literal('Close'),
  matchId: matchIdSchema,
  ts: tsSchema,
  code: ErrorCodeSchema.optional(),
  reason: z.string().optional(),
});
export type IClose = z.infer<typeof CloseSchema>;

/**
 * LobbyUpdated — Wave 3b. Broadcast to all sockets in the match
 * whenever the seats array or status changes (occupy, leave, reassign,
 * AI toggle, ready, launch). Joiners haven't built an
 * `InteractiveSession` yet but still need to render the lobby grid, so
 * this envelope is intentionally separate from `Event`.
 */
export const LobbyUpdatedSchema = z.object({
  kind: z.literal('LobbyUpdated'),
  matchId: matchIdSchema,
  ts: tsSchema,
  seats: z.array(MatchSeatSchema),
  status: z.enum(['lobby', 'active', 'completed']),
  hostPlayerId: z.string().min(1),
});
export type ILobbyUpdated = z.infer<typeof LobbyUpdatedSchema>;

export const ServerMessageSchema = z.discriminatedUnion('kind', [
  ReplayStartSchema,
  ReplayChunkSchema,
  ReplayEndSchema,
  EventMessageSchema,
  HeartbeatSchema,
  ErrorMessageSchema,
  CloseSchema,
  LobbyUpdatedSchema,
]);
export type IServerMessage = z.infer<typeof ServerMessageSchema>;

// =============================================================================
// Constants
// =============================================================================

/**
 * Heartbeat interval: server sends one every 20s.
 * Missed-heartbeat timeout: 60s without an inbound message = treat the
 * connection as dead. The 3x ratio absorbs a one-tick TCP retransmit
 * blip without a false positive.
 */
export const HEARTBEAT_INTERVAL_MS = 20_000;
export const HEARTBEAT_TIMEOUT_MS = 60_000;

/**
 * Reconnect backoff: capped exponential. Used by `client.ts`.
 */
export const RECONNECT_INITIAL_MS = 500;
export const RECONNECT_MAX_MS = 30_000;
export const RECONNECT_MULTIPLIER = 2;

// =============================================================================
// Helper builders
// =============================================================================

/**
 * Stamp `ts` once at the call site; helps tests inject a fixed clock
 * without monkey-patching `Date.now`.
 */
export function nowIso(): string {
  return new Date().toISOString();
}
