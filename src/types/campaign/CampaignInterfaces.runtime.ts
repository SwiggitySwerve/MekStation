import type {
  ICampaign,
  ICampaignMission,
  ICampaignPilotState,
  ICampaignRoster,
  ICampaignUnitState,
  ICampaignValidationResult,
} from './CampaignInterfaces.types';

import {
  CampaignMissionStatus,
  CampaignPilotStatus,
  CampaignStatus,
  CampaignUnitStatus,
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

  // Required: roster has units or pilots
  if (
    (!campaign.roster.units || campaign.roster.units.length === 0) &&
    (!campaign.roster.pilots || campaign.roster.pilots.length === 0)
  ) {
    errors.push('Campaign must have at least one unit or pilot');
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

  // Warning: units without pilots
  const assignedPilots = new Set(
    campaign.roster.units.map((u) => u.pilotId).filter(Boolean),
  );
  const totalPilots = campaign.roster.pilots.length;
  const operationalUnits = campaign.roster.units.filter(
    (u) =>
      u.status === CampaignUnitStatus.Operational ||
      u.status === CampaignUnitStatus.Damaged,
  ).length;
  if (operationalUnits > assignedPilots.size && totalPilots > 0) {
    warnings.push(
      `${operationalUnits - assignedPilots.size} operational units have no assigned pilot`,
    );
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
 * Get operational units from roster.
 */
export function getOperationalUnits(
  roster: ICampaignRoster,
): readonly ICampaignUnitState[] {
  return roster.units.filter(
    (u) =>
      u.status === CampaignUnitStatus.Operational ||
      u.status === CampaignUnitStatus.Damaged,
  );
}

/**
 * Get available pilots from roster.
 */
export function getAvailablePilots(
  roster: ICampaignRoster,
): readonly ICampaignPilotState[] {
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
