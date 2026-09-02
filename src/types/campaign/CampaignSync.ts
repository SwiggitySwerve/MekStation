/**
 * Shared Campaign State — sync types (CO1).
 *
 * Co-op campaign state is a transactional ledger, not a CRDT. Per the
 * `add-shared-campaign-state` design (D1) it rides the same
 * server-authoritative `intent → validate → commit → broadcast` loop
 * the combat `ServerMatchHost` uses, NOT the Yjs `useSyncedVaultStore`.
 *
 * This module defines the wire contracts:
 *   - `ICampaignEvent` — one ordered, typed, replayable committed
 *     mutation (the campaign-tier analogue of an `IGameEvent`).
 *   - the per-`CampaignEventType` payload shapes.
 *   - `ICampaignIntent` — what a guest sends; the host validates it.
 *   - `CampaignIntentResult` — the result of validating one intent.
 *   - `ICampaignAuthoritativeState` — the host's authoritative ledger
 *     projection, also the `CampaignSnapshotPublished` payload body and
 *     the shape the guest mirror replays into.
 *
 * Every shape is JSON-safe — `JSON.parse(JSON.stringify(x))` reproduces
 * it without loss — so events survive the WebSocket transport and the
 * persisted log round-trip.
 *
 * @spec openspec/changes/add-shared-campaign-state/specs/coop-campaign-sync/spec.md
 * @spec openspec/changes/add-shared-campaign-state/design.md (D2, D3, D8)
 */

import type { ICoopBattleConsequences } from '@/lib/campaign/coop/reconcileCoopBattle';

// =============================================================================
// Authoritative campaign state — the ledger projection
// =============================================================================

/**
 * One owned roster unit in the shared-campaign ledger projection. The
 * full unit design lives in the content vault; the ledger only tracks
 * the campaign-relevant facts a co-op guest must mirror.
 */
export interface ICampaignRosterUnit {
  /** Stable unit id (matches the vault / campaign roster id). */
  readonly unitId: string;
  /** Display designation, e.g. "Atlas AS7-D". */
  readonly designation: string;
  /** Coarse repair status of the unit in the campaign. */
  readonly status: 'operational' | 'damaged' | 'destroyed';
  /** Exact canonical or saved-design catalog reference. */
  readonly unitRef?: string;
  /** Parsed roster source identity preserved through co-op. */
  readonly unitSource?: 'canonical' | 'custom';
  /** Pinned library version at enroll; omitted on legacy projections. */
  readonly sourceVersion?: number;
}

/**
 * One hired pilot in the ledger projection.
 */
export interface ICampaignRosterPilot {
  /** Stable pilot id. */
  readonly pilotId: string;
  /** Pilot display name. */
  readonly name: string;
}

/**
 * One accepted contract in the ledger projection.
 */
export interface ICampaignAcceptedContract {
  /** Stable contract id. */
  readonly contractId: string;
  /** Contract display name. */
  readonly name: string;
  /** Employer faction id (drives the faction-standing check). */
  readonly employerFactionId: string;
}

/**
 * The host's authoritative campaign ledger state. This is the single
 * source of truth a `CampaignMatchHost` validates intents against, the
 * body of the `CampaignSnapshotPublished` event, and the shape the
 * guest mirror is reconstructed into by replaying the event log.
 *
 * It is deliberately a flat, JSON-safe projection — NOT the full
 * `ICampaign` aggregate. CO1 syncs the ledger-mutating facts; the rest
 * of the campaign content stays in `useCampaignStore` / the vault.
 */
export interface ICampaignAuthoritativeState {
  /** Campaign id this state belongs to. */
  readonly campaignId: string;
  /** In-game day counter; advanced by `CampaignDayAdvanced`. */
  readonly day: number;
  /** C-bill balance; the invariant `balance >= 0` is host-enforced. */
  readonly balance: number;
  /** Owned roster units, keyed by `unitId`. */
  readonly rosterUnits: Readonly<Record<string, ICampaignRosterUnit>>;
  /** Deterministic `forceId -> unitIds` membership. */
  readonly forceUnits?: Readonly<Record<string, readonly string[]>>;
  /** Hired pilots, keyed by `pilotId`. */
  readonly pilots: Readonly<Record<string, ICampaignRosterPilot>>;
  /** Accepted contracts, keyed by `contractId`. */
  readonly contracts: Readonly<Record<string, ICampaignAcceptedContract>>;
  /**
   * Faction standing by faction id. A higher value is friendlier; a
   * contract intent is rejected when the employer's standing is below
   * `CONTRACT_MIN_STANDING`. Absent factions are treated as neutral (0).
   */
  readonly factionStanding: Readonly<Record<string, number>>;
  /**
   * Unallocated post-battle salvage value, in C-bills. An
   * `AllocateSalvage` intent draws from this pool.
   */
  readonly salvagePool: number;
}

/**
 * The minimum employer faction standing required to accept a contract.
 * Standing below this rejects an `AcceptContract` intent.
 */
export const CONTRACT_MIN_STANDING = 0;

/**
 * Build the empty authoritative state for a fresh shared campaign.
 */
export function createEmptyCampaignState(
  campaignId: string,
): ICampaignAuthoritativeState {
  return {
    campaignId,
    day: 0,
    balance: 0,
    rosterUnits: {},
    forceUnits: {},
    pilots: {},
    contracts: {},
    factionStanding: {},
    salvagePool: 0,
  };
}

// =============================================================================
// Campaign event payloads
// =============================================================================

/**
 * The set of ledger-mutating campaign event types. Each carries a
 * committed result, never a request. Per design D3.
 */
export type CampaignEventType =
  | 'CampaignDayAdvanced'
  | 'FundsChanged'
  | 'PilotHired'
  | 'ContractAccepted'
  | 'RosterUnitChanged'
  | 'SalvageAllocated'
  | 'ParticipantRemoved'
  | 'CampaignSnapshotPublished';

/**
 * Runtime list of every `CampaignEventType` member. The two-way
 * completeness pin below fails to compile if the union gains or loses a
 * member without this list being updated.
 */
export const CAMPAIGN_EVENT_TYPES = [
  'CampaignDayAdvanced',
  'FundsChanged',
  'PilotHired',
  'ContractAccepted',
  'RosterUnitChanged',
  'SalvageAllocated',
  'ParticipantRemoved',
  'CampaignSnapshotPublished',
] as const satisfies readonly CampaignEventType[];

const CAMPAIGN_EVENT_TYPES_COMPLETE: Exclude<
  CampaignEventType,
  (typeof CAMPAIGN_EVENT_TYPES)[number]
> extends never
  ? true
  : never = true;
void CAMPAIGN_EVENT_TYPES_COMPLETE;

const CAMPAIGN_EVENT_TYPE_SET: ReadonlySet<string> = new Set(
  CAMPAIGN_EVENT_TYPES,
);

/**
 * Closed access-scope vocabulary stamped on every campaign event at
 * emission (design D3). Team and player forms carry a non-empty id;
 * empty ids (`team:` / `player:` alone) are rejected by
 * `isCampaignEventScope` even though the template-literal type cannot
 * express that constraint.
 */
export type CampaignEventScope =
  | 'gm'
  | 'campaign'
  | `team:${string}`
  | `player:${string}`;

/** `CampaignDayAdvanced` — the day counter moved forward. */
export interface ICampaignDayAdvancedPayload {
  /** The new day index after the advance. */
  readonly newDay: number;
}

/**
 * `FundsChanged` — the C-bill balance changed. Carries the resulting
 * balance (not just the delta) so a guest that missed an event can
 * detect a gap. Per design D3.
 */
export interface IFundsChangedPayload {
  /** Signed C-bill delta applied (negative = spend). */
  readonly delta: number;
  /** Human-readable reason for the change. */
  readonly reason: string;
  /** The C-bill balance AFTER the change. */
  readonly balance: number;
}

/** `PilotHired` — a pilot joined the roster. */
export interface IPilotHiredPayload {
  /** The hired pilot. */
  readonly pilot: ICampaignRosterPilot;
  /** C-bill hiring cost (already debited; see the paired FundsChanged). */
  readonly cost: number;
}

/** `ContractAccepted` — a contract was accepted. */
export interface IContractAcceptedPayload {
  /** The accepted contract. */
  readonly contract: ICampaignAcceptedContract;
}

/** `RosterUnitChanged` — a unit was added / removed / repaired. */
export interface IRosterUnitChangedPayload {
  /** What happened to the unit. */
  readonly change: 'added' | 'removed' | 'repaired';
  /** The unit after the change (for `added` / `repaired`). */
  readonly unit: ICampaignRosterUnit;
}

/** `SalvageAllocated` — post-battle salvage assigned to the campaign. */
export interface ISalvageAllocatedPayload {
  /** C-bill value drawn from the salvage pool. */
  readonly value: number;
  /** Salvage pool remaining after the allocation. */
  readonly poolRemaining: number;
  /** Optional roster unit recovered from the salvage. */
  readonly recoveredUnit?: ICampaignRosterUnit;
}

/** `ParticipantRemoved` — the GM revoked a campaign-session participant. */
export interface IParticipantRemovedPayload {
  /** Durable participant identity removed from this campaign session. */
  readonly participantId: string;
  /** Optional audited GM rationale. */
  readonly reason?: string;
}

/**
 * `CampaignSnapshotPublished` — a full-state baseline for a joining or
 * resyncing guest. The only event whose payload is a whole-campaign
 * state object. Per design D3.
 */
export interface ICampaignSnapshotPublishedPayload {
  /** The whole authoritative campaign state at snapshot time. */
  readonly state: ICampaignAuthoritativeState;
  /** Match id bound at co-op registration. */
  readonly matchId?: string;
  /** Inclusive high-water sequence represented by `state`. */
  readonly revision?: number;
}

/**
 * Discriminated map from `CampaignEventType` to its payload shape. Used
 * to narrow `ICampaignEvent.payload` per type.
 */
export interface ICampaignEventPayloadMap {
  readonly CampaignDayAdvanced: ICampaignDayAdvancedPayload;
  readonly FundsChanged: IFundsChangedPayload;
  readonly PilotHired: IPilotHiredPayload;
  readonly ContractAccepted: IContractAcceptedPayload;
  readonly RosterUnitChanged: IRosterUnitChangedPayload;
  readonly SalvageAllocated: ISalvageAllocatedPayload;
  readonly ParticipantRemoved: IParticipantRemovedPayload;
  readonly CampaignSnapshotPublished: ICampaignSnapshotPublishedPayload;
}

// =============================================================================
// Campaign event
// =============================================================================

/**
 * The fields every campaign event carries regardless of type. Merged
 * into each per-type variant below.
 */
interface ICampaignEventBase {
  /** Ascending, gap-free, host-assigned sequence number. */
  readonly sequence: number;
  /** Campaign id this event belongs to. */
  readonly campaignId: string;
  /** Host wall-clock ISO 8601 timestamp. */
  readonly ts: string;
  /** Player id that committed the event (host id for host-driven events). */
  readonly authorPlayerId: string;
  /**
   * Access scope chosen by the emitting domain action (design D3).
   * REQUIRED so an unstamped emission is a compile error: an optional
   * field would let a constructor omit the classification, which task
   * 3.1 forbids. Immutable after emission; reclassification is a new
   * revelation event referencing the original, never an edit of this
   * field.
   */
  readonly scope: CampaignEventScope;
}

/**
 * One typed campaign-event variant — the base fields plus the `type`
 * discriminant and the narrowed `payload`. The distributive mapped type
 * over `CampaignEventType` below produces the discriminated union
 * `ICampaignEvent`, so a `switch (event.type)` narrows `payload`
 * exactly.
 */
export type ICampaignEventOf<T extends CampaignEventType> =
  ICampaignEventBase & {
    /** The event type discriminant. */
    readonly type: T;
    /** Per-type payload, narrowed by `T`. */
    readonly payload: ICampaignEventPayloadMap[T];
  };

/**
 * One committed campaign mutation. The campaign-tier analogue of
 * `IGameEvent` — ordered, typed, replayable. Per design D3.
 *
 * This is a discriminated union over `CampaignEventType`, so a
 * `switch (event.type)` narrows `payload` to the exact per-type shape.
 * `ICampaignEvent<'FundsChanged'>` selects a single variant — the
 * distributive conditional below maps each member of `T` to its
 * `ICampaignEventOf` variant and unions the result.
 */
export type ICampaignEvent<T extends CampaignEventType = CampaignEventType> =
  T extends CampaignEventType ? ICampaignEventOf<T> : never;

/** Narrowed alias for a `FundsChanged` campaign event. */
export type ICampaignFundsChangedEvent = ICampaignEvent<'FundsChanged'>;
/** Narrowed alias for a `CampaignSnapshotPublished` campaign event. */
export type ICampaignSnapshotEvent =
  ICampaignEvent<'CampaignSnapshotPublished'>;

/**
 * True iff `value` is a closed-vocabulary campaign event scope. Rejects
 * empty team/player ids, unknown prefixes, non-strings, and objects.
 */
export function isCampaignEventScope(
  value: unknown,
): value is CampaignEventScope {
  if (typeof value !== 'string') return false;
  if (value === 'gm' || value === 'campaign') return true;
  return (
    isPrefixedCampaignEventScope(value, 'team:') ||
    isPrefixedCampaignEventScope(value, 'player:')
  );
}

/**
 * True for `prefix` plus a non-empty id with no leading or trailing
 * whitespace. `team:` / `player:` alone fail because the id is empty.
 */
function isPrefixedCampaignEventScope(
  value: string,
  prefix: 'team:' | 'player:',
): boolean {
  if (!value.startsWith(prefix)) return false;
  const id = value.slice(prefix.length);
  return id.length > 0 && id.trim() === id;
}

/**
 * Shared envelope shape check. Log events use `minSequence` 0; wire
 * baseline frames use -1 so a `CampaignSnapshotPublished` hydration
 * frame is accepted without being mistaken for a journal row.
 */
function isCampaignEventShape(
  value: unknown,
  minSequence: number,
): value is ICampaignEvent {
  if (typeof value !== 'object' || value === null) return false;
  const event = value as Partial<ICampaignEvent>;
  return (
    typeof event.type === 'string' &&
    isCampaignEventType(event.type) &&
    typeof event.sequence === 'number' &&
    Number.isInteger(event.sequence) &&
    event.sequence >= minSequence &&
    typeof event.campaignId === 'string' &&
    typeof event.ts === 'string' &&
    typeof event.authorPlayerId === 'string' &&
    isCampaignEventScope(event.scope) &&
    typeof event.payload === 'object' &&
    event.payload !== null
  );
}

/**
 * Structural type guard for a raw log/broadcast payload. Sequence must
 * be a non-negative journal position (baseline frames with sequence -1
 * use `isCampaignWireEvent`).
 */
export function isCampaignEvent(value: unknown): value is ICampaignEvent {
  return isCampaignEventShape(value, 0);
}

/**
 * Envelope guard for campaign-sync wire frames, including the sequence
 * -1 snapshot baseline that is never a journal row.
 */
export function isCampaignWireEvent(value: unknown): value is ICampaignEvent {
  return isCampaignEventShape(value, -1);
}

/** True iff `value` is one of the eight `CampaignEventType` strings. */
export function isCampaignEventType(value: string): value is CampaignEventType {
  return CAMPAIGN_EVENT_TYPE_SET.has(value);
}

// =============================================================================
// Campaign intents
// =============================================================================

/**
 * The kinds of campaign intent a guest may send. The host validates
 * each against authoritative state before committing any event.
 */
export type CampaignIntentKind =
  | 'HirePilot'
  | 'AcceptContract'
  | 'SpendFunds'
  | 'AllocateSalvage'
  | 'RemoveParticipant'
  | 'AdvanceDay';

/** `HirePilot` intent payload. */
export interface IHirePilotIntentPayload {
  /** The pilot to hire. */
  readonly pilot: ICampaignRosterPilot;
  /** C-bill hiring cost; validated against the balance. */
  readonly cost: number;
}

/** `AcceptContract` intent payload. */
export interface IAcceptContractIntentPayload {
  /** The contract to accept. */
  readonly contract: ICampaignAcceptedContract;
}

/** `SpendFunds` intent payload. */
export interface ISpendFundsIntentPayload {
  /** C-bill amount to spend; validated against the balance. */
  readonly amount: number;
  /** Human-readable reason for the spend. */
  readonly reason: string;
}

/** `AllocateSalvage` intent payload. */
export interface IAllocateSalvageIntentPayload {
  /** C-bill value to draw from the salvage pool. */
  readonly value: number;
  /** Optional roster unit recovered from the salvage. */
  readonly recoveredUnit?: ICampaignRosterUnit;
}

/** `AdvanceDay` intent payload. Empty — the host computes the new day. */
export interface IAdvanceDayIntentPayload {
  /** Number of days to advance (defaults to 1 when omitted). */
  readonly days?: number;
}

/** `RemoveParticipant` intent payload. Only the authenticated GM may use it. */
export interface IRemoveParticipantIntentPayload {
  /** Durable participant identity to revoke from this session. */
  readonly participantId: string;
  /** Optional audited GM rationale. */
  readonly reason?: string;
}

/** Discriminated map from intent kind to its payload shape. */
export interface ICampaignIntentPayloadMap {
  readonly HirePilot: IHirePilotIntentPayload;
  readonly AcceptContract: IAcceptContractIntentPayload;
  readonly SpendFunds: ISpendFundsIntentPayload;
  readonly AllocateSalvage: IAllocateSalvageIntentPayload;
  readonly RemoveParticipant: IRemoveParticipantIntentPayload;
  readonly AdvanceDay: IAdvanceDayIntentPayload;
}

/** The fields every campaign intent carries regardless of kind. */
interface ICampaignIntentBase {
  /** Campaign id the intent targets. */
  readonly campaignId: string;
  /** Client-generated id, for error correlation. */
  readonly intentId: string;
}

/**
 * One typed campaign-intent variant — the base fields plus the `kind`
 * discriminant and the narrowed `payload`.
 */
export type ICampaignIntentOf<K extends CampaignIntentKind> =
  ICampaignIntentBase & {
    /** The intent kind discriminant. */
    readonly kind: K;
    /** Per-kind payload, narrowed by `K`. */
    readonly payload: ICampaignIntentPayloadMap[K];
  };

/**
 * A campaign intent — what a guest sends. The host validates it against
 * authoritative state and may reject it. Per design D8.
 *
 * A discriminated union over `CampaignIntentKind`, so a
 * `switch (intent.kind)` narrows `payload` to the exact per-kind shape.
 */
export type ICampaignIntent<K extends CampaignIntentKind = CampaignIntentKind> =
  K extends CampaignIntentKind ? ICampaignIntentOf<K> : never;

/**
 * Host-only post-battle reconciliation request carried by the campaign-sync
 * host-intent frame. This intentionally stays outside the guest-proposable
 * `ICampaignIntent` union.
 */
export interface ICampaignReconcileBattleIntent {
  readonly kind: 'ReconcileBattle';
  readonly campaignId: string;
  readonly intentId: string;
  readonly payload: ICoopBattleConsequences;
}

// =============================================================================
// Campaign intent result
// =============================================================================

/**
 * The error code returned for a rejected campaign intent. A single
 * stable code; the specific cause is in `reason`. Per design D4.
 */
export const INVALID_CAMPAIGN_INTENT = 'INVALID_CAMPAIGN_INTENT' as const;

/**
 * Stable rejection reasons for an invalid campaign intent. `reason` on a
 * rejection envelope is one of these strings so the guest UI and tests
 * can branch on it.
 */
export type CampaignIntentRejectionReason =
  | 'insufficient-funds'
  | 'insufficient-standing'
  | 'insufficient-salvage'
  | 'host-only'
  | 'malformed-intent'
  | 'session-closed'
  | 'campaign-mismatch'
  | 'intent-identity-conflict';

/**
 * The result of validating one campaign intent against authoritative
 * state. Per design D8.
 */
export const CAMPAIGN_STALE_HEAD = 'CAMPAIGN_STALE_HEAD' as const;

/**
 * A refusal that IS about the intent - it was malformed, unaffordable,
 * out of turn, or from the wrong seat.
 *
 * Named so a path that only ever validates can keep saying exactly that.
 * Validation touches no head, so it cannot produce a stale-head refusal,
 * and widening its signature to the whole union would invite a caller to
 * handle a case that cannot occur.
 */
export interface ICampaignMechanicalRejection {
  readonly ok: false;
  readonly code: typeof INVALID_CAMPAIGN_INTENT;
  readonly reason: CampaignIntentRejectionReason;
}

/** Where the authority's head actually is. */
export interface ICampaignHeadRef {
  readonly branchId: string;
  readonly revision: number;
}

/**
 * A refusal caused by the head moving, not by anything wrong with the
 * intent.
 *
 * Its own code, and that is the point: the intent was valid, nobody did
 * anything wrong, and the answer is to catch up and send it again. A
 * caller that could not tell this from `INVALID_CAMPAIGN_INTENT` would
 * either retry something that can never succeed or abandon something
 * that would.
 */
export interface ICampaignStaleHeadRefusal {
  readonly ok: false;
  readonly code: typeof CAMPAIGN_STALE_HEAD;
  /** Another writer committed between this command's replay and its append. */
  readonly reason: 'lost-race';
  /** Read from the FAILED append, so it is the head AFTER the race. */
  readonly head: ICampaignHeadRef;
  readonly recoveryAction: 'resync-to-active-head';
  /** Always empty: a lost race never got compared field by field. */
  readonly conflictingFields: readonly string[];
}

/**
 * Build the stale-head refusal.
 *
 * Beside the type rather than in the host: two surfaces now answer a
 * lost race - the socket host and the GM arbiter - and a second
 * hand-built copy is how the head or the action goes missing on one of
 * them.
 */
export function campaignStaleHeadRefusal(
  head: ICampaignHeadRef,
): ICampaignStaleHeadRefusal {
  return {
    ok: false,
    code: CAMPAIGN_STALE_HEAD,
    reason: 'lost-race',
    head,
    recoveryAction: 'resync-to-active-head',
    conflictingFields: [],
  };
}

export type CampaignIntentResult =
  | { readonly ok: true; readonly events: readonly ICampaignEvent[] }
  | {
      readonly ok: false;
      readonly code: typeof INVALID_CAMPAIGN_INTENT;
      readonly reason: CampaignIntentRejectionReason;
    }
  // ADDITIVE: every pre-existing refusal still carries
  // `INVALID_CAMPAIGN_INTENT`, so no existing construction site changes
  // shape. Only a lost race builds this one.
  | ICampaignStaleHeadRefusal;

/**
 * A typed error envelope for a rejected campaign intent — the campaign
 * analogue of the combat `Error` server message. Carries the originating
 * `intentId` so the guest can correlate the rejection.
 */
export type ICampaignIntentError =
  | {
      readonly ok: false;
      readonly code: typeof INVALID_CAMPAIGN_INTENT;
      readonly reason: CampaignIntentRejectionReason;
      readonly intentId: string;
    }
  /**
   * The stale-head refusal, correlated to its intent.
   *
   * The head and the action ride ALL the way to the wire. Dropping them
   * here would still compile - both arms carry `reason` - and the client
   * would be told only that something went wrong, which is the shape
   * this whole task exists to replace.
   */
  | (ICampaignStaleHeadRefusal & { readonly intentId: string });
