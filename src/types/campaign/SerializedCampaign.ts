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

import type { MechBuildConfig } from '@/utils/construction/constructionRules/types';

import type { ICombatOutcome } from '../combat/CombatOutcome';
import type { IGmCampaignProjectedEffect } from '../interventions';
import type { IShoppingList } from './acquisition/acquisitionTypes';
import type {
  ICampaignActiveContract,
  ICampaignContractMarket,
} from './CampaignCommandExtensions';
import type { ICampaignLoan } from './CampaignLoan';
import type { ICampaignOptions } from './CampaignOptions';
import type { CampaignType } from './CampaignType';
import type { ICoopSession } from './CoopSession';
import type { IFactionStanding } from './factionStanding/IFactionStanding';
import type { IForce } from './Force';
import type {
  IPersonnelMarketOffer,
  IUnitMarketOffer,
} from './markets/marketTypes';
import type { IMission } from './Mission';
import type { IPartsInventoryItem } from './PartsInventory';
import type { IMoraleTransition, IUnitPrestige, MoraleState } from './Prestige';
import type { IRefitOrder } from './Refit';
import type { IRepairTicket } from './RepairTicket';
import type { ISalvageAllocation, ISalvageReport } from './Salvage';
import type { ICombatTeam } from './scenario/scenarioTypes';
import type { IUnitCombatState, IUnitMaxState } from './UnitCombatState';

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
 * JSON-safe form of the amortization-engine `ILoan` (`IFinances.loans`).
 * The live record carries `Money` instances and `Date`s; both are
 * flattened here (Money → C-bill scalar, Date → ISO string) so the
 * ledger survives `JSON.stringify`/`JSON.parse` without custom revivers —
 * the same convention `finances.transactions` already follows, mirroring
 * the store path's `SerializedAmortizedLoan`
 * (`useCampaignStore.persistence.ts`, audit D-1 / W3.1).
 */
export interface SerializedAmortizedLoan {
  readonly id: string;
  /** Principal in C-bills (the `Money.amount` scalar). */
  readonly principal: number;
  readonly annualRate: number;
  readonly termMonths: number;
  /** Monthly payment in C-bills. */
  readonly monthlyPayment: number;
  /** Remaining principal in C-bills. */
  readonly remainingPrincipal: number;
  /** ISO 8601 string. */
  readonly startDate: string;
  /** ISO 8601 string. */
  readonly nextPaymentDate: string;
  readonly paymentsRemaining: number;
  readonly isDefaulted: boolean;
}

/**
 * JSON-safe finances shape — `Money` instances replaced by C-bill
 * scalars, transaction `Date`s replaced by ISO strings.
 */
export interface SerializedFinances {
  readonly transactions: readonly SerializedTransaction[];
  /** Balance in C-bills. */
  readonly balance: number;
  /**
   * Amortization-engine loan ledger (`IFinances.loans`), flattened to
   * JSON-safe scalars (W3.1 follow-on T3, 2026-06-09 audit). Optional —
   * absent on pre-fix snapshots and on campaigns that never used the
   * loan system.
   */
  readonly loans?: readonly SerializedAmortizedLoan[];
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
  readonly partsInventory?: readonly IPartsInventoryItem[];
  readonly repairQueue?: readonly IRepairTicket[];
  readonly unitMaxStates?: Readonly<Record<string, IUnitMaxState>>;
  readonly salvageAllocations?: Readonly<Record<string, ISalvageAllocation>>;
  readonly salvageReports?: Readonly<Record<string, ISalvageReport>>;
  readonly pendingBattleOutcomes?: readonly ICombatOutcome[];
  readonly processedBattleIds?: readonly string[];
  readonly gmInterventionEvents?: readonly IGmCampaignProjectedEffect[];
  readonly recentlyAppliedOutcomes?: readonly ICombatOutcome[];
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
  // ---------------------------------------------------------------------------
  // W3.1 follow-on (T3, 2026-06-09 audit): the fields below mirror the store
  // path (`SerializedCampaignState` in useCampaignStore.persistence.ts) into
  // the server body. All optional — absent on pre-fix snapshots, which makes
  // a pre-fix payload indistinguishable from a post-fix payload that never
  // set the fields, so no schemaVersion bump / migration rung is needed.
  // Every shape is already JSON-safe (scalars, strings, plain records).
  // ---------------------------------------------------------------------------
  /** Combat teams for AtB scenario generation. */
  readonly combatTeams?: readonly ICombatTeam[];
  /** Refit orders (`add-campaign-refit-and-prestige` D2). */
  readonly refitOrders?: readonly IRefitOrder[];
  /** Per-unit campaign loadouts written by completed refits (D5). */
  readonly unitConfigurations?: Readonly<Record<string, MechBuildConfig>>;
  /** Per-unit prestige scores (D7). */
  readonly unitPrestige?: readonly IUnitPrestige[];
  /** Company morale state (D8). */
  readonly moraleState?: MoraleState;
  /** Company morale transition history (D9). */
  readonly moraleTransitions?: readonly IMoraleTransition[];
  /** Starmap "you are here" pin (`wire-starmap-into-campaign`). */
  readonly currentSystemId?: string;
  /**
   * Co-op session metadata (`wire-coop-campaign-route`, Wave 6.1). Absent
   * on single-player campaigns; present on host or guest mirror campaigns
   * so a server-restored campaign still mounts the co-op surfaces.
   */
  readonly coopSession?: ICoopSession;
  /** Personnel-market hiring offers (CP2b design D2). */
  readonly personnelMarket?: readonly IPersonnelMarketOffer[];
  /** Contract-market offers + declined ids (CP2b design D5). */
  readonly contractMarket?: ICampaignContractMarket;
  /** Active contract progress shown by the dashboard command card. */
  readonly activeContract?: ICampaignActiveContract;
  /** Unit-market offers stored by unitMarketProcessor (audit D-7, W3.4). */
  readonly unitMarket?: readonly IUnitMarketOffer[];
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
