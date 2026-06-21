/**
 * Campaign Roster Entry
 *
 * The single per-campaign roster entry type that holds the employment
 * relationship between a vault `IPilot` (or inline NPC statblock) and a
 * specific campaign. Replaces the legacy `ICampaignPilotState` (renamed,
 * extended) and is now the sole runtime storage for personnel. As of
 * `wire-iperson-hard-cutover` PR5, every helper takes `(entry, pilot)`
 * directly — the legacy god-type and its bridge are gone.
 *
 * @spec openspec/changes/migrate-personnel-to-roster-employment/specs/personnel-management/spec.md
 * @spec openspec/changes/archive/2026-05-01-decide-campaign-personnel-architecture/design.md
 */

import type { IPilotStatblock } from '@/types/pilot/PilotInterfaces';

import type { CampaignPilotStatus } from './CampaignPilotStatus';
import type { CampaignPersonnelRole } from './enums/CampaignPersonnelRole';
import type { Money } from './Money';
import type { IInjury } from './Person';
import type { IPersonTraits } from './progression/progressionTypes';

// =============================================================================
// Roster Entry Interface
// =============================================================================

/**
 * Per-campaign roster entry. Holds employment relationship + campaign-scoped
 * state, statistics, assignment, and training. Identity (skills/XP/abilities)
 * is resolved via `pilotId` join to vault `IPilot` (PC case) or via inline
 * `statblockData` (NPC case).
 *
 * **Discriminator (PR-1 scope, soft):** PC entries set `pilotId` to a vault
 * `IPilot.id`; NPC entries set both `pilotId` (a roster-local identifier)
 * AND `statblockData` (the source of truth for NPC identity). The strict
 * XOR enforced at type level is a future-state goal — see
 * `refactor-helper-signatures-to-roster-entry`.
 *
 * **Field provenance (employment):** `salary`, `hireDate` are the only new
 * employment fields wired in this PR cycle. Additional fields (`lifestyle`,
 * `contractTerms`, `fatigue`, `prisonerStatus`, `campaignAwards`) are
 * documented in the ADR but deferred — none of the 12 features being
 * repointed in this change read those fields. They land in a follow-up.
 */
export interface ICampaignRosterEntry {
  // ===========================================================================
  // Identity reference
  // ===========================================================================

  /**
   * Reference to vault pilot ID (PC case) or roster-local identifier (NPC case).
   * Always present. For NPC entries, the authoritative identity lives on
   * `statblockData` — `pilotId` is a stable handle for persistence + assignment.
   */
  readonly pilotId: string;

  /**
   * Display name (cached for list views without a vault join).
   * Source of truth: vault `IPilot.name` (PC) or `statblockData.name` (NPC).
   */
  readonly pilotName: string;

  /**
   * Inline frozen statblock for NPC entries. Undefined for PC entries
   * (whose identity lives on vault `IPilot`).
   */
  readonly statblockData?: IPilotStatblock;

  // ===========================================================================
  // Current campaign state
  // ===========================================================================

  /** Current operational status (campaign-scoped) */
  readonly status: CampaignPilotStatus;

  /** Current wounds (0-6 for MechWarriors) */
  readonly wounds: number;

  /** Recovery time remaining in mission cycles (formerly `healingTime`) */
  readonly recoveryTime: number;

  // ===========================================================================
  // Campaign-scoped statistics
  //
  // These fields are scoped to THIS campaign. Lifetime aggregates live on
  // vault `IPilot.career.*` for PC entries.
  // ===========================================================================

  /** Current XP pool available for spending */
  readonly xp: number;

  /** XP earned in THIS campaign (vault stores total XP across all campaigns) */
  readonly campaignXpEarned: number;

  /** Kills this campaign */
  readonly campaignKills: number;

  /** Missions completed this campaign */
  readonly campaignMissions: number;

  // ===========================================================================
  // Assignment
  // ===========================================================================

  /**
   * Currently assigned unit ID. Mirrors the Force-slot assignment from
   * `useForceStore` for read convenience; the Force slot is authoritative.
   */
  readonly assignedUnitId?: string;

  // ===========================================================================
  // Employment (added in this change for the 12 repointed features)
  // ===========================================================================

  /**
   * Date this character was hired into THIS campaign.
   * Required per hard-cutover policy (PR2 cluster J). Every roster entry
   * must declare a hire date at construction time so downstream helpers
   * (turnover modifiers, salary tenure bonuses, audit feeds) can rely on
   * its presence without fallback chains.
   */
  readonly hireDate: Date;

  /**
   * Campaign-specific salary override. `null`/undefined = use the
   * vault/role default from `BASE_MONTHLY_SALARY`.
   */
  readonly salary?: Money;

  /**
   * Reason for departure (populated when `status` transitions to `Departed`).
   * Used by the turnover processor for narrative + ledger entries.
   */
  readonly departureReason?: string;

  /**
   * Active injuries for advanced medical tracking.
   *
   * Optional + readonly. Defaults to `[]` (no injuries) when unset.
   * Wired in PR2 of `wire-iperson-hard-cutover` (Council #2 open
   * question #1) so medical helpers can read injuries from the roster
   * entry directly via the two-arg `(entry, pilot)` signature.
   *
   * @spec openspec/specs/campaign-personnel-architecture/spec.md
   */
  readonly injuries?: readonly IInjury[];

  /**
   * Standard medical-system Medicine skill target number. Lower is better,
   * matching BattleTech skill checks. Optional entries fall back to the
   * existing default target.
   */
  readonly medicineSkill?: number;

  /**
   * Current doctor assignment load. Used to apply shorthanded modifiers
   * when one doctor carries more active patients than their capacity.
   */
  readonly assignedPatientIds?: readonly string[];

  /** Maximum active patients this doctor can cover before overload. */
  readonly patientCapacity?: number;

  // ===========================================================================
  // Personnel role + rank (PR1.5 — Tier 1 live bug fixes, Council #4)
  // ===========================================================================

  /**
   * Primary role in the unit. Required — every entry must declare its role
   * so downstream helpers (doctorCapacity, salaryService) can filter and
   * categorize without synthesizing defaults.
   *
   * Live bug: bridge previously hardcoded `PILOT`, making DOCTOR/TECH entries
   * invisible to `getBestAvailableDoctor` and salary-role categorization.
   *
   * Backward compat: `useCampaignRosterStore` persist migration defaults
   * existing entries without this field to `CampaignPersonnelRole.PILOT`.
   *
   * @spec openspec/specs/campaign-personnel-architecture/spec.md
   */
  readonly primaryRole: CampaignPersonnelRole;

  /**
   * Numeric rank index (0-based position in the rank table).
   * Required — every entry must declare a rank index so the promotion gate
   * in `rankService` can compare `newRankIndex <= currentRankIndex` correctly.
   *
   * Live bug: bridge previously hardcoded 0, blocking all promotions because
   * `rankService.ts:208` compares `newRankIndex <= currentRankIndex` and 0
   * is always the floor.
   *
   * Backward compat: `useCampaignRosterStore` persist migration defaults
   * existing entries without this field to `0`.
   *
   * @spec openspec/specs/campaign-personnel-architecture/spec.md
   */
  readonly rankIndex: number;

  /**
   * Trait flags that modify skill costs and aging/progression mechanics.
   *
   * Optional. `aging.ts` and `vocationalTrainingProcessor.ts` read AND write
   * `traits.glassJaw`, `traits.slowLearner`, `traits.vocationalXPTimer`.
   * Without this field on the roster entry the bridge omitted traits entirely,
   * causing every write to discard prior flags — a silent per-pass data loss.
   *
   * Bridge forwards as `traits: entry.traits ?? {}`.
   *
   * @spec openspec/specs/campaign-personnel-architecture/spec.md
   */
  readonly traits?: IPersonTraits;

  /**
   * Date of last promotion. Optional.
   *
   * Live bug: bridge omitted this field, so `rankService.isRecentlyPromoted`
   * always returned `false` and the promotion-recency turnover modifier never
   * fired.
   */
  readonly lastPromotionDate?: Date;

  // ===========================================================================
  // Unit flags (PR1.5 — Tier 2 additive, no production write path today)
  // ===========================================================================

  /**
   * Whether this person is a founder of the unit (entitles +1 share).
   * Additive optional — no migration risk; existing entries without it
   * are treated as non-founders.
   */
  readonly isFounder?: boolean;

  /**
   * Whether this person is the unit commander.
   * Additive optional — existing entries without it treated as non-commander.
   */
  readonly isCommander?: boolean;
}
