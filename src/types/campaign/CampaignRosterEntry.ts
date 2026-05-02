/**
 * Campaign Roster Entry
 *
 * The single per-campaign roster entry type that holds the employment
 * relationship between a vault `IPilot` (or inline NPC statblock) and a
 * specific campaign. Replaces the legacy `ICampaignPilotState` (renamed,
 * extended) and supersedes the never-seeded `IPerson` substrate for
 * runtime storage. The `IPerson` TYPE remains in tree as a parameter
 * signature for the 72 helper files that still expect it; the
 * `rosterEntryToPerson(rosterEntry, vaultPilot)` shim bridges the two
 * during the narrow-scope migration.
 *
 * The full type-side migration of helper signatures to consume
 * `ICampaignRosterEntry` directly lives in the follow-up change
 * `refactor-helper-signatures-to-roster-entry`.
 *
 * @spec openspec/changes/migrate-personnel-to-roster-employment/specs/personnel-management/spec.md
 * @spec openspec/changes/archive/2026-05-01-decide-campaign-personnel-architecture/design.md
 */

import type { IPilotStatblock } from "@/types/pilot/PilotInterfaces";

import type { CampaignPilotStatus } from "./CampaignInterfaces.types";
import type { Money } from "./Money";

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

  /** Recovery time remaining in mission cycles (was `healingTime` on IPerson) */
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
}
