/**
 * Salvage Types
 *
 * Salvage = the right to recover battlefield equipment after a contract
 * battle. Phase 3 Wave 3 (`add-salvage-rules-engine`) introduces the
 * canonical post-battle data shapes used by the salvage engine and the
 * day-pipeline `salvageProcessor`.
 *
 * Reading order:
 *
 *   1. `DamageLevel` + `SalvageStatus` + `SalvageDisposition` enums.
 *   2. `ISalvageCandidate` — one candidate per recoverable unit / part.
 *   3. `ISalvagePool` — every candidate produced by a single battle.
 *   4. `ISalvageAward` — the per-side bundle (employer or mercenary).
 *   5. `ISalvageAllocation` — the splitter output (pool + both awards).
 *   6. `ISalvageReport` — UI-facing summary view (DTO).
 *
 * The engine and processor live under `src/lib/campaign/salvage/`.
 *
 * @spec openspec/changes/add-salvage-rules-engine/specs/salvage-rules/spec.md
 * @module types/campaign/Salvage
 */

// =============================================================================
// Enums
// =============================================================================

/**
 * Damage classification for a salvage candidate. Mirrors the Total
 * Warfare / Campaign Operations recovery table — `computeRecoveryPercentage`
 * maps each level to a canonical percentage.
 */
export enum DamageLevel {
  Intact = 'intact',
  Light = 'light',
  Moderate = 'moderate',
  Heavy = 'heavy',
  Destroyed = 'destroyed',
}

/**
 * Lifecycle of a salvage candidate from the moment it lands in a pool to
 * the moment the campaign actually owns the resulting equipment.
 *
 * - `pending` — candidate is in a pool but not yet allocated.
 * - `auctioned` — candidate is on the auction draft pile.
 * - `awarded` — candidate has been allocated to a side and is ready to be
 *   converted into inventory by the processor.
 * - `declined` — candidate has been deliberately skipped (Wave 4 UI).
 */
export type SalvageStatus = 'pending' | 'auctioned' | 'awarded' | 'declined';

/**
 * Final disposition of a salvage candidate after split. Captures both the
 * recipient (mercenary | employer) and *how* it was awarded (contract
 * clause vs. auction draft) so reports and audit logs can explain the
 * outcome to the player without re-running the engine.
 */
export type SalvageDisposition =
  | 'mercenary'
  | 'employer'
  | 'auction-mercenary'
  | 'auction-employer';

/**
 * Source of a candidate — full unit chassis vs. an individual part picked
 * out of a destroyed mech's crit slots.
 */
export type SalvageCandidateSource = 'unit' | 'part';

/**
 * Method used to split a pool. Mirrors the spec's
 * `splitMethod` field.
 */
export type SalvageSplitMethod =
  | 'contract'
  | 'auction'
  | 'hostile_withdrawal'
  | 'standalone';

// =============================================================================
// Recovery Percentage Table (canonical)
// =============================================================================

/**
 * Canonical recovery percentages keyed by `DamageLevel`. Pulled out into
 * a typed map so the engine and any downstream consumers (UI, repair
 * estimator) read from a single source of truth.
 */
export const RECOVERY_PERCENTAGE_BY_DAMAGE: Readonly<
  Record<DamageLevel, number>
> = Object.freeze({
  [DamageLevel.Intact]: 1.0,
  [DamageLevel.Light]: 0.75,
  [DamageLevel.Moderate]: 0.5,
  [DamageLevel.Heavy]: 0.25,
  [DamageLevel.Destroyed]: 0.0,
});

/**
 * Canonical Campaign Ops C-Bills-per-ton repair cost factor by damage
 * level. These are MVP placeholders sized so unit tests have stable
 * arithmetic; Wave 4 / repair pipeline will tune to canon tables.
 */
export const REPAIR_COST_PER_TON_BY_DAMAGE: Readonly<
  Record<DamageLevel, number>
> = Object.freeze({
  [DamageLevel.Intact]: 0,
  [DamageLevel.Light]: 5_000,
  [DamageLevel.Moderate]: 15_000,
  [DamageLevel.Heavy]: 35_000,
  [DamageLevel.Destroyed]: 0, // chassis is gone; parts handled separately
});

/**
 * Default C-Bills per Battle Value used when estimating raw chassis
 * value. Tuned for MVP — production will swap to a price book lookup.
 */
export const CBILLS_PER_BATTLE_VALUE = 2_500;

// =============================================================================
// Candidates
// =============================================================================

/**
 * One salvageable item from a battle. Either a complete enemy unit (with
 * `source = 'unit'`) or a single part (`source = 'part'`) recovered from
 * an enemy unit's destroyed crit slots.
 *
 * `recoveryPercentage` and `recoveredValue` already account for damage —
 * they represent the value the side that wins this candidate would
 * actually receive after the salvage table is applied. `originalValue`
 * preserves the pre-damage figure so audit displays can show "saved 40%
 * from original 1.2M C-Bill chassis" style breakdowns.
 */
export interface ISalvageCandidate {
  /** Source classification. */
  readonly source: SalvageCandidateSource;
  /** Stable identifier for the unit this candidate came from. */
  readonly unitId: string;
  /** Display designation (e.g. "Atlas AS7-D") for UI / reports. */
  readonly designation: string;
  /** matchId that produced this candidate (for audit and dedupe). */
  readonly destroyedFromBattle: string;
  /** Final status of the originating unit at battle end. */
  readonly finalStatus:
    | 'damaged'
    | 'crippled'
    | 'destroyed'
    | 'intact'
    | 'ejected';
  /** Damage classification used by the salvage table. */
  readonly damageLevel: DamageLevel;
  /** Pre-damage raw value in C-Bills (chassis or part). */
  readonly originalValue: number;
  /** Post-damage recoverable value (originalValue × recoveryPercentage). */
  readonly recoveredValue: number;
  /** Multiplier from `RECOVERY_PERCENTAGE_BY_DAMAGE`. */
  readonly recoveryPercentage: number;
  /** Estimated C-Bill cost to repair into combat-ready condition. */
  readonly repairCostEstimate: number;
  /** Optional part-specific fields (only set when source = 'part'). */
  readonly partId?: string;
  readonly location?: string;
  /** Disposition + status after splitter has run; defaults to mercenary/pending. */
  readonly disposition: SalvageDisposition;
  readonly status: SalvageStatus;
}

// =============================================================================
// Pool / Award / Allocation
// =============================================================================

/**
 * The raw output of `aggregateSalvageCandidates`: every candidate produced
 * by a single battle plus the metadata the splitter needs (was the
 * battle in hostile territory? what's the total estimated value?).
 */
export interface ISalvagePool {
  /** matchId of the source battle. */
  readonly battleId: string;
  /** contractId the battle resolved (null for standalone skirmishes). */
  readonly contractId: string | null;
  /** Every candidate aggregated from the outcome. */
  readonly candidates: readonly ISalvageCandidate[];
  /** Sum of `recoveredValue` across all candidates. */
  readonly totalEstimatedValue: number;
  /** Whether the battle was fought in hostile territory. */
  readonly hostileTerritory: boolean;
}

/**
 * One side's share of a pool after the splitter runs.
 */
export interface ISalvageAward {
  /** Side that owns this award. */
  readonly side: 'mercenary' | 'employer';
  /** Candidates allocated to this side. */
  readonly candidates: readonly ISalvageCandidate[];
  /** Sum of `recoveredValue` across this side's candidates. */
  readonly totalValue: number;
  /** Sum of `repairCostEstimate` across this side's candidates. */
  readonly estimatedRepairCost: number;
}

/**
 * Splitter output. Exposes the original pool plus both awards plus the
 * method used so audit logs and tests can verify which branch was taken.
 */
export interface ISalvageAllocation {
  readonly pool: ISalvagePool;
  readonly employerAward: ISalvageAward;
  readonly mercenaryAward: ISalvageAward;
  readonly splitMethod: SalvageSplitMethod;
  /** True after the day processor has converted this allocation into inventory. */
  readonly processed: boolean;
}

// =============================================================================
// Report (UI / DTO)
// =============================================================================

/**
 * UI-facing summary of a single battle's salvage. The processor persists
 * this alongside the full `ISalvageAllocation` so report screens can
 * render without re-deriving anything.
 */
export interface ISalvageReport {
  readonly matchId: string;
  readonly contractId: string | null;
  readonly candidates: readonly ISalvageCandidate[];
  readonly totalValueEmployer: number;
  readonly totalValueMercenary: number;
  /** Multiplier applied to mercenary award by hostile-territory rules (0..1). */
  readonly hostileTerritoryPenalty: number;
  /** True when the contract clause routes through the auction branch. */
  readonly auctionRequired: boolean;
}
