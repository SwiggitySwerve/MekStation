/**
 * Roster Entry → IPerson shim.
 *
 * Bridges the new `ICampaignRosterEntry` substrate (the source of truth
 * for campaign-scoped pilot state) to the legacy `IPerson` parameter
 * signature still used by 72 helper files (`salaryService`, `taxService`,
 * `turnoverCheck`, medical/awards/events/progression/ranks/skills, etc.).
 *
 * The 12 features being repointed in `migrate-personnel-to-roster-employment`
 * iterate the new substrate, call this shim per entry, and pass the
 * synthesized `IPerson` to existing helpers unchanged. Helper formulas are
 * preserved exactly — only the data source changes.
 *
 * The shim is removed in the follow-up change
 * `refactor-helper-signatures-to-roster-entry` once helpers consume
 * `ICampaignRosterEntry` directly.
 *
 * @spec openspec/changes/migrate-personnel-to-roster-employment/specs/personnel-management/spec.md
 */

import type { ICampaignRosterEntry } from '@/types/campaign/CampaignRosterEntry';
import type { IPerson } from '@/types/campaign/Person';
import type { IAttributes } from '@/types/campaign/skills/IAttributes';
import type { IPilot, IPilotStatblock } from '@/types/pilot/PilotInterfaces';

import { CampaignPilotStatus } from '@/types/campaign/CampaignInterfaces.types';
import { CampaignPersonnelRole } from '@/types/campaign/enums/CampaignPersonnelRole';
import { PersonnelStatus } from '@/types/campaign/enums/PersonnelStatus';

// =============================================================================
// Defaults
// =============================================================================

/**
 * Default attributes for synthesized persons. Matches MekHQ's "regular" baseline.
 * Used when neither vault `IPilot` nor `IPilotStatblock` carries attribute data
 * (the current production case — vault pilots don't store IAttributes).
 */
const DEFAULT_ATTRIBUTES: IAttributes = {
  STR: 5,
  BOD: 5,
  REF: 5,
  DEX: 5,
  INT: 5,
  WIL: 5,
  CHA: 5,
  Edge: 2,
};

/**
 * Map the 5-value `CampaignPilotStatus` (campaign-scoped) to the 37-value
 * `PersonnelStatus` (legacy). The mapping is conservative: Wounded and
 * Critical both map to WOUNDED because the legacy enum lacks a separate
 * "critical" tier; helpers that need critical-tier behavior read `wounds`
 * directly instead of branching on status.
 */
function mapStatus(status: CampaignPilotStatus): PersonnelStatus {
  switch (status) {
    case CampaignPilotStatus.Active:
      return PersonnelStatus.ACTIVE;
    case CampaignPilotStatus.Wounded:
      return PersonnelStatus.WOUNDED;
    case CampaignPilotStatus.Critical:
      return PersonnelStatus.WOUNDED;
    case CampaignPilotStatus.MIA:
      return PersonnelStatus.MIA;
    case CampaignPilotStatus.KIA:
      return PersonnelStatus.KIA;
    default:
      return PersonnelStatus.ACTIVE;
  }
}

/**
 * Split a single-string display name into first/last components.
 * Used when vault/statblock identity provides only `name`.
 */
function splitName(name: string): { first: string; last: string } {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0) return { first: '', last: '' };
  if (parts.length === 1) return { first: parts[0], last: '' };
  return { first: parts[0], last: parts.slice(1).join(' ') };
}

// =============================================================================
// Shim
// =============================================================================

/**
 * Synthesize an `IPerson` shape from a roster entry plus optional vault
 * pilot. Used by repointed campaign processors so existing helpers (which
 * still take `IPerson` parameters) continue to work without modification.
 *
 * @param rosterEntry - The campaign roster entry (source of truth for
 *   employment, status, and campaign-scoped statistics).
 * @param vaultPilot - The vault `IPilot` joined via `rosterEntry.pilotId`,
 *   or `null` if the entry is an NPC (identity comes from `statblockData`).
 * @returns A synthesized `IPerson` whose fields the legacy helpers can
 *   read without crashing. Field accuracy: identity (skills, abilities,
 *   career counts) is correct; aspirational fields (lifestyle, contract,
 *   attributes-beyond-defaults) are filled with safe defaults.
 * @throws Error if both vaultPilot and statblockData are missing.
 */
export function rosterEntryToPerson(
  rosterEntry: ICampaignRosterEntry,
  vaultPilot: IPilot | null,
): IPerson {
  // Resolve identity: prefer vault pilot (PC case); fall back to inline
  // statblock (NPC case). Throws if neither is available — degenerate
  // case that should never happen in production.
  const statblock: IPilotStatblock | null = rosterEntry.statblockData ?? null;
  if (!vaultPilot && !statblock) {
    throw new Error(
      `rosterEntryToPerson: roster entry "${rosterEntry.pilotId}" has neither vault pilot nor inline statblock`,
    );
  }

  // Identity fields (name, callsign, skills) — vault is authoritative for
  // PCs; statblock for NPCs. The cached `pilotName` on the roster entry
  // wins over vault if present (covers cases where vault was renamed
  // after the campaign was created).
  const displayName =
    rosterEntry.pilotName || vaultPilot?.name || statblock?.name || 'Unknown';
  const { first: firstName, last: lastName } = splitName(displayName);

  const gunnery = vaultPilot?.skills.gunnery ?? statblock?.gunnery ?? 4;
  const piloting = vaultPilot?.skills.piloting ?? statblock?.piloting ?? 5;

  // Career fields — vault pilots carry career data; NPCs (statblock) do not.
  const career = vaultPilot?.career;
  const totalXpEarned = career?.totalXpEarned ?? rosterEntry.campaignXpEarned;
  const xpSpent = Math.max(0, totalXpEarned - rosterEntry.xp);
  const rank = career?.rank ?? 'MechWarrior';

  // Recruitment date: per hard-cutover policy (PR2 cluster J),
  // `hireDate` is required on every roster entry, so we read it directly
  // without a fallback chain. Helpers like turnover modifiers can rely
  // on the field always being present.
  const recruitmentDate = rosterEntry.hireDate;

  // Awards — vault pilots carry awards; NPCs do not. Map to award IDs only.
  const awardIds = (vaultPilot?.awards ?? []).map((a) => a.awardId);

  // Special abilities (SPA IDs) — vault pilots carry abilities; NPC
  // statblocks may carry abilityIds.
  const specialAbilities =
    vaultPilot?.abilities.map((a) => a.abilityId) ??
    statblock?.abilityIds ??
    [];

  return {
    id: rosterEntry.pilotId,
    createdAt: vaultPilot?.createdAt ?? new Date().toISOString(),
    updatedAt: vaultPilot?.updatedAt ?? new Date().toISOString(),

    // Identity
    name: displayName,
    callsign: vaultPilot?.callsign,
    givenName: firstName,
    surname: lastName,

    // Status / role
    status: mapStatus(rosterEntry.status),
    primaryRole: CampaignPersonnelRole.PILOT,

    // Career
    rank,
    rankIndex: 0,
    recruitmentDate,
    missionsCompleted: rosterEntry.campaignMissions,
    totalKills: rosterEntry.campaignKills,
    awards: awardIds,
    departureReason: rosterEntry.departureReason,

    // Experience
    xp: rosterEntry.xp,
    totalXpEarned,
    xpSpent,

    // Combat state
    hits: rosterEntry.wounds,
    injuries: [],
    daysToWaitForHealing: rosterEntry.recoveryTime,

    // Skills + attributes (vault pilots don't carry IAttributes; default)
    skills: {},
    attributes: DEFAULT_ATTRIBUTES,
    pilotSkills: { gunnery, piloting },

    // Assignment
    unitId: rosterEntry.assignedUnitId,

    // Traits + abilities
    specialAbilities,
  };
}
