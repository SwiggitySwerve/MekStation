import type {
  ICampaign,
  ICampaignMission,
  ICampaignRoster,
  ICampaignValidationResult,
} from './CampaignInterfaces.types';
import type { ICampaignRosterEntry } from './CampaignRosterEntry';

import {
  CampaignMissionStatus,
  CampaignPilotStatus,
  CampaignStatus,
  XP_REWARDS,
} from './CampaignInterfaces.types';

/**
 * Calculate XP earned for a mission.
 */
export function calculateMissionXp(
  kills: number,
  victory: boolean,
  survivedCritical: boolean,
  optionalObjectivesCompleted: number,
): number {
  let xp = XP_REWARDS.MISSION_PARTICIPATION;
  xp += kills * XP_REWARDS.KILL;
  if (victory) xp += XP_REWARDS.VICTORY_BONUS;
  if (survivedCritical) xp += XP_REWARDS.SURVIVAL_BONUS;
  xp += optionalObjectivesCompleted * XP_REWARDS.OPTIONAL_OBJECTIVE;
  return xp;
}

/**
 * Validate a campaign.
 */
export function validateCampaign(
  campaign: ICampaign,
): ICampaignValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Required: name
  if (!campaign.name || campaign.name.trim().length === 0) {
    errors.push('Campaign name is required');
  }

  // Required: at least one mission
  if (!campaign.missions || campaign.missions.length === 0) {
    errors.push('Campaign must have at least one mission');
  }

  // Required: roster has at least one pilot.
  // Per `canonicalize-unit-combat-state` PR-C: `ICampaignRoster.units`
  // (the legacy roster-unit array) was deleted. The unit roster lives on
  // `useCampaignRosterStore` as `IRosterUnitProjection[]` and is
  // validated independently by the store; campaign-level validation is
  // now pilot-only.
  if (!campaign.roster.pilots || campaign.roster.pilots.length === 0) {
    errors.push('Campaign must have at least one pilot');
  }

  // Validate mission graph
  const missionIds = new Set(campaign.missions.map((m) => m.id));
  for (const mission of campaign.missions) {
    // Check prerequisites exist
    for (const prereq of mission.prerequisites) {
      if (!missionIds.has(prereq)) {
        errors.push(
          `Mission "${mission.name}" references non-existent prerequisite: ${prereq}`,
        );
      }
    }
    // Check branches exist
    for (const branch of mission.branches) {
      if (!missionIds.has(branch.targetMissionId)) {
        errors.push(
          `Mission "${mission.name}" branches to non-existent mission: ${branch.targetMissionId}`,
        );
      }
    }
  }

  // Warning: no final mission
  const hasFinalMission = campaign.missions.some((m) => m.isFinal);
  if (!hasFinalMission) {
    warnings.push('Campaign has no final mission - it may never end');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Type guard for ICampaign.
 */
export function isCampaign(obj: unknown): obj is ICampaign {
  if (typeof obj !== 'object' || obj === null) return false;
  const campaign = obj as ICampaign;
  return (
    typeof campaign.id === 'string' &&
    typeof campaign.name === 'string' &&
    typeof campaign.status === 'string' &&
    Array.isArray(campaign.missions) &&
    typeof campaign.roster === 'object' &&
    typeof campaign.resources === 'object' &&
    typeof campaign.progress === 'object'
  );
}

/**
 * Type guard for ICampaignMission.
 */
export function isCampaignMission(obj: unknown): obj is ICampaignMission {
  if (typeof obj !== 'object' || obj === null) return false;
  const mission = obj as ICampaignMission;
  return (
    typeof mission.id === 'string' &&
    typeof mission.name === 'string' &&
    typeof mission.status === 'string' &&
    typeof mission.order === 'number' &&
    Array.isArray(mission.prerequisites)
  );
}

/**
 * Get available missions (unlocked and not completed).
 */
export function getAvailableMissions(
  campaign: ICampaign,
): readonly ICampaignMission[] {
  return campaign.missions.filter(
    (m) =>
      m.status === CampaignMissionStatus.Available ||
      m.status === CampaignMissionStatus.InProgress,
  );
}

/**
 * Get available pilots from roster.
 */
export function getAvailablePilots(
  roster: ICampaignRoster,
): readonly ICampaignRosterEntry[] {
  return roster.pilots.filter((p) => p.status === CampaignPilotStatus.Active);
}

/**
 * Check if campaign is complete (won or lost).
 */
export function isCampaignComplete(campaign: ICampaign): boolean {
  return (
    campaign.status === CampaignStatus.Victory ||
    campaign.status === CampaignStatus.Defeat ||
    campaign.status === CampaignStatus.Abandoned
  );
}

/**
 * Calculate total campaign value.
 */
export function calculateCampaignValue(campaign: ICampaign): number {
  return (
    campaign.resources.cBills +
    campaign.resources.supplies * 100 +
    campaign.resources.salvageParts * 1000
  );
}
