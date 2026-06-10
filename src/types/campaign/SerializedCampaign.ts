/**
 * Campaign Persistence Types
 *
 * Wire and storage types for server-side campaign persistence. The
 * `SerializedCampaign` envelope wraps a JSON-safe `SerializedCampaignBody`
 * with a schema version, ids, save timestamp, origin device, and a
 * monotonic write `version` used for optimistic-concurrency conflict
 * detection.
 *
 * @spec openspec/changes/add-campaign-persistence/specs/campaign-persistence/spec.md
 * @spec openspec/changes/add-campaign-persistence/design.md (D2, D5, D7)
 */

import type { IShoppingList } from './acquisition/acquisitionTypes';
import type { ICampaignLoan } from './CampaignLoan';
import type { ICampaignOptions } from './CampaignOptions';
import type { CampaignType } from './CampaignType';
import type { IFactionStanding } from './factionStanding/IFactionStanding';
import type { IForce } from './Force';
import type { IMission } from './Mission';
import type { IUnitCombatState } from './UnitCombatState';

// =============================================================================
// Serialized campaign body
// =============================================================================

/**
 * JSON-safe transaction shape. The live `Transaction` carries a `Money`
 * instance and a `Date`; both are flattened here so the body survives
 * `JSON.stringify` / `JSON.parse` without custom revivers.
 */
export interface SerializedTransaction {
  readonly id: string;
  readonly type: string;
  /** Amount in C-bills (the `Money.amount` scalar). */
  readonly amount: number;
  /** ISO 8601 string. */
  readonly date: string;
  readonly description: string;
}

/**
 * JSON-safe finances shape — `Money` instances replaced by C-bill
 * scalars, transaction `Date`s replaced by ISO strings.
 */
export interface SerializedFinances {
  readonly transactions: readonly SerializedTransaction[];
  /** Balance in C-bills. */
  readonly balance: number;
}

/**
 * `ICampaign` with every `Map` field replaced by an array of
 * `[key, value]` pairs and every `Date` field replaced by an ISO 8601
 * string. This is the JSON-safe campaign body wrapped by the envelope.
 *
 * Per design D2/D3: when `ICampaign` gains a new `Map` or `Date` field,
 * this interface AND the `CAMPAIGN_MAP_FIELDS` / `CAMPAIGN_DATE_FIELDS`
 * constants must be updated together — a type-level test fails the build
 * on drift.
 */
export interface SerializedCampaignBody {
  readonly id: string;
  readonly name: string;
  /** `ICampaign.currentDate` as an ISO 8601 string. */
  readonly currentDate: string;
  readonly factionId: string;
  /** `ICampaign.forces` as an array of `[forceId, force]` pairs. */
  readonly forces: ReadonlyArray<readonly [string, IForce]>;
  readonly rootForceId: string;
  /** `ICampaign.missions` as an array of `[missionId, mission]` pairs. */
  readonly missions: ReadonlyArray<readonly [string, IMission]>;
  readonly finances: SerializedFinances;
  readonly factionStandings: Record<string, IFactionStanding>;
  readonly shoppingList?: IShoppingList;
  readonly options: ICampaignOptions;
  readonly campaignType: CampaignType;
  readonly activePreset?: string;
  /** `ICampaign.campaignStartDate` as an ISO 8601 string (when present). */
  readonly campaignStartDate?: string;
  readonly description?: string;
  readonly iconUrl?: string;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly unitCombatStates: Readonly<Record<string, IUnitCombatState>>;
  /**
   * The campaign's loan ledger (CP2b — `add-campaign-command-ui`,
   * design D4). Optional and absent on pre-CP2b snapshots. Every
   * `ICampaignLoan` field is already a JSON-safe scalar, so the ledger
   * serializes directly with no flattening.
   */
  readonly loans?: readonly ICampaignLoan[];
  /**
   * Campaign RNG seed for replayable daily rolls (audit D-10, 2026-06-09
   * remediation W3.4). Optional and absent on pre-fix snapshots —
   * consumers fall back to an id-derived seed.
   */
  readonly rngSeed?: number;
}

// =============================================================================
// Serialized campaign envelope
// =============================================================================

/**
 * The wire and storage format for a persisted campaign. Fully
 * JSON-serializable — `JSON.parse(JSON.stringify(envelope))` reproduces
 * it without loss.
 */
export interface SerializedCampaign {
  /** Schema version of `body`; drives the migration ladder on read. */
  readonly schemaVersion: number;
  /** Campaign id — matches `body.id` and the server keyspace key. */
  readonly campaignId: string;
  /** ISO 8601 timestamp the snapshot was written. */
  readonly savedAt: string;
  /** Stable id of the device that wrote this snapshot. */
  readonly originDeviceId: string;
  /** Monotonic write counter — incremented on every clean server write. */
  readonly version: number;
  /** The JSON-safe campaign body. */
  readonly body: SerializedCampaignBody;
}

// =============================================================================
// List + metadata projections
// =============================================================================

/**
 * Lightweight campaign summary returned by `GET /api/campaigns`. Carries
 * only the fields a campaign-list view needs — never the full body.
 */
export interface ICampaignSummary {
  readonly id: string;
  readonly name: string;
  readonly factionId: string;
  /** Campaign in-game date as an ISO 8601 string. */
  readonly currentDate: string;
  /** Balance in C-bills. */
  readonly balance: number;
  /** ISO 8601 timestamp of the last server write. */
  readonly updatedAt: string;
}

/**
 * Save-metadata surfaced to the dashboard — describes the most recent
 * server write without the campaign body.
 */
export interface ICampaignSaveMetadata {
  /** ISO 8601 timestamp of the last successful save, or `null` if never saved. */
  readonly lastSavedAt: string | null;
  /** Schema version of the last saved snapshot. */
  readonly schemaVersion: number;
  /** Device that produced the last saved snapshot, or `null` if never saved. */
  readonly originDeviceId: string | null;
  /** Monotonic version of the last saved snapshot. */
  readonly version: number;
}
