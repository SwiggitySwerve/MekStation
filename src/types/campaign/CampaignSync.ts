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
  | 'CampaignSnapshotPublished';

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

/**
 * `CampaignSnapshotPublished` — a full-state baseline for a joining or
 * resyncing guest. The only event whose payload is a whole-campaign
 * state object. Per design D3.
 */
export interface ICampaignSnapshotPublishedPayload {
  /** The whole authoritative campaign state at snapshot time. */
  readonly state: ICampaignAuthoritativeState;
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
 * Structural type guard for a raw broadcast payload. The WebSocket
 * layer types inbound payloads as `unknown`; this narrows a candidate
 * to `ICampaignEvent` before it is applied to a mirror or a log.
 */
export function isCampaignEvent(value: unknown): value is ICampaignEvent {
  if (typeof value !== 'object' || value === null) return false;
  const event = value as Partial<ICampaignEvent>;
  return (
    typeof event.type === 'string' &&
    isCampaignEventType(event.type) &&
    typeof event.sequence === 'number' &&
    Number.isInteger(event.sequence) &&
    event.sequence >= 0 &&
    typeof event.campaignId === 'string' &&
    typeof event.ts === 'string' &&
    typeof event.authorPlayerId === 'string' &&
    typeof event.payload === 'object' &&
    event.payload !== null
  );
}

/** True iff `value` is one of the seven `CampaignEventType` strings. */
export function isCampaignEventType(value: string): value is CampaignEventType {
  return (
    value === 'CampaignDayAdvanced' ||
    value === 'FundsChanged' ||
    value === 'PilotHired' ||
    value === 'ContractAccepted' ||
    value === 'RosterUnitChanged' ||
    value === 'SalvageAllocated' ||
    value === 'CampaignSnapshotPublished'
  );
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

/** Discriminated map from intent kind to its payload shape. */
export interface ICampaignIntentPayloadMap {
  readonly HirePilot: IHirePilotIntentPayload;
  readonly AcceptContract: IAcceptContractIntentPayload;
  readonly SpendFunds: ISpendFundsIntentPayload;
  readonly AllocateSalvage: IAllocateSalvageIntentPayload;
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
  | 'malformed-intent'
  | 'session-closed'
  | 'campaign-mismatch';

/**
 * The result of validating one campaign intent against authoritative
 * state. Per design D8.
 */
export type CampaignIntentResult =
  | { readonly ok: true; readonly events: readonly ICampaignEvent[] }
  | {
      readonly ok: false;
      readonly code: typeof INVALID_CAMPAIGN_INTENT;
      readonly reason: CampaignIntentRejectionReason;
    };

/**
 * A typed error envelope for a rejected campaign intent — the campaign
 * analogue of the combat `Error` server message. Carries the originating
 * `intentId` so the guest can correlate the rejection.
 */
export interface ICampaignIntentError {
  readonly ok: false;
  readonly code: typeof INVALID_CAMPAIGN_INTENT;
  readonly reason: CampaignIntentRejectionReason;
  readonly intentId: string;
}
