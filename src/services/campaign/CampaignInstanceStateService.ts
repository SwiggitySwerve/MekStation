/**
 * Campaign Instance State Service
 *
 * High-level service for managing campaign instance state changes.
 * Handles damage application, XP awards, status transitions, and emits events.
 *
 * @spec openspec/changes/add-campaign-instances/specs/campaign-instances/spec.md
 */

import type {
  ICampaignUnitInstance,
  ICampaignPilotInstance,
  IUnitDamageState,
} from '../../types/campaign/CampaignInstanceInterfaces';
import type { ICausedBy } from '../../types/events';
import type { IPilotSkills } from '../../types/pilot/PilotInterfaces';

import {
  calculateDamagePercentage,
  determineUnitStatus,
} from '../../types/campaign/CampaignInstanceInterfaces';
import {
  CampaignUnitStatus,
  CampaignPilotStatus,
  XP_REWARDS,
  SKILL_IMPROVEMENT_COSTS,
} from '../../types/campaign/CampaignInterfaces';
import {
  emitUnitInstanceDamageApplied,
  emitUnitInstanceStatusChanged,
  emitUnitInstanceDestroyed,
  emitUnitInstancePilotAssigned,
  emitUnitInstancePilotUnassigned,
  emitUnitInstanceRepairStarted,
  emitUnitInstanceRepairCompleted,
  emitPilotInstanceXPGained,
  emitPilotInstanceSkillImproved,
  emitPilotInstanceWounded,
  emitPilotInstanceStatusChanged,
  emitPilotInstanceKillRecorded,
  emitPilotInstanceMissionCompleted,
  emitPilotInstanceDeceased,
} from '../../utils/events/campaignInstanceEvents';
import { getCampaignInstanceService } from '../persistence/CampaignInstanceService';

// =============================================================================
// Types
// =============================================================================

/**
 * Result of applying damage to a unit instance.
 */
export interface IApplyDamageResult {
  readonly instance: ICampaignUnitInstance;
  readonly previousDamagePercentage: number;
  readonly newDamagePercentage: number;
  readonly statusChanged: boolean;
  readonly destroyed: boolean;
  readonly eventId: string;
}

/**
 * Result of completing a mission for a pilot.
 */
export interface IMissionCompletionResult {
  readonly instance: ICampaignPilotInstance;
  readonly xpEarned: number;
  readonly eventIds: readonly string[];
}

/**
 * Result of applying wounds to a pilot.
 */
export interface IApplyWoundsResult {
  readonly instance: ICampaignPilotInstance;
  readonly previousWounds: number;
  readonly totalWounds: number;
  readonly statusChanged: boolean;
  readonly deceased: boolean;
  readonly eventId: string;
}

/**
 * Service interface for campaign instance state management.
 */
export interface ICampaignInstanceStateService {
  // Unit state changes
  applyDamage(
    instanceId: string,
    newDamageState: IUnitDamageState,
    options?: {
      damageSource?: string;
      attackerUnitId?: string;
      gameId?: string;
      causedBy?: ICausedBy;
    },
  ): Promise<IApplyDamageResult>;

  startRepair(
    instanceId: string,
    repairItems: readonly string[],
    estimatedCost: number,
    estimatedTime: number,
  ): Promise<ICampaignUnitInstance>;

  completeRepair(
    instanceId: string,
    actualCost: number,
    actualTime: number,
    newDamageState: IUnitDamageState,
  ): Promise<ICampaignUnitInstance>;

  // Pilot state changes
  awardXP(
    instanceId: string,
    xpAmount: number,
    source:
      | 'mission_participation'
      | 'kill'
      | 'victory'
      | 'objective'
      | 'survival'
      | 'other',
    options?: {
      details?: string;
      gameId?: string;
      causedBy?: ICausedBy;
    },
  ): Promise<ICampaignPilotInstance>;

  applyWounds(
    instanceId: string,
    woundsReceived: number,
    cause: string,
    options?: {
      gameId?: string;
      causedBy?: ICausedBy;
    },
  ): Promise<IApplyWoundsResult>;

  recordKill(
    instanceId: string,
    targetName: string,
    weaponUsed: string,
    options?: {
      targetUnitId?: string;
      gameId?: string;
      causedBy?: ICausedBy;
    },
  ): Promise<ICampaignPilotInstance>;

  improveSkill(
    instanceId: string,
    skill: 'gunnery' | 'piloting',
  ): Promise<ICampaignPilotInstance>;

  completeMission(
    instanceId: string,
    missionId: string,
    missionName: string,
    outcome: 'victory' | 'defeat' | 'draw',
    kills: number,
    options?: {
      survivedCritical?: boolean;
      optionalObjectivesCompleted?: number;
    },
  ): Promise<IMissionCompletionResult>;

  // Assignment changes
  assignPilotToUnit(
    pilotInstanceId: string,
    unitInstanceId: string,
  ): Promise<{ pilot: ICampaignPilotInstance; unit: ICampaignUnitInstance }>;

  unassignPilot(
    pilotInstanceId: string,
    reason?: 'manual' | 'pilot_wounded' | 'pilot_kia' | 'unit_destroyed',
  ): Promise<ICampaignPilotInstance>;
}

// =============================================================================
// Constants
// =============================================================================

/** Recovery time in days per wound level */
const RECOVERY_DAYS_PER_WOUND = 7;

// =============================================================================
// Implementation
// =============================================================================

/**
 * Calculate recovery time based on wounds.
 */
function calculateRecoveryTime(wounds: number): number {
  return wounds * RECOVERY_DAYS_PER_WOUND;
}

/**
 * Campaign Instance State Service implementation.
 */
export class CampaignInstanceStateService implements ICampaignInstanceStateService {
  // ---------------------------------------------------------------------------
  // Unit State Changes
  // ---------------------------------------------------------------------------

  async applyDamage(
    instanceId: string,
    newDamageState: IUnitDamageState,
    options: {
      damageSource?: string;
      attackerUnitId?: string;
      gameId?: string;
      causedBy?: ICausedBy;
    } = {},
  ): Promise<IApplyDamageResult> {
    const service = getCampaignInstanceService();
    const instance = await service.getUnitInstance(instanceId);

    if (!instance) {
      throw new Error(`Unit instance not found: ${instanceId}`);
    }

    const previousDamagePercentage = calculateDamagePercentage(
      instance.damageState,
    );
    const newDamagePercentage = calculateDamagePercentage(newDamageState);
    const damagePercentageChange =
      newDamagePercentage - previousDamagePercentage;

    // Emit damage applied event
    const damageEvent = emitUnitInstanceDamageApplied(
      {
        instanceId,
        campaignId: instance.campaignId,
        previousDamageState: instance.damageState,
        newDamageState,
        damagePercentageChange,
        damageSource: options.damageSource,
        attackerUnitId: options.attackerUnitId,
        gameId: options.gameId,
      },
      options.causedBy,
    );

    // Determine new status
    const newStatus = determineUnitStatus(newDamageState);
    const statusChanged = newStatus !== instance.status;
    const destroyed = newStatus === CampaignUnitStatus.Destroyed;

    // Update instance
    let updated = await service.updateUnitInstance(instanceId, {
      damageState: newDamageState,
      status: newStatus,
    });

    // Emit status changed event if needed
    if (statusChanged) {
      emitUnitInstanceStatusChanged(
        {
          instanceId,
          campaignId: instance.campaignId,
          previousStatus: instance.status,
          newStatus,
          reason: destroyed ? 'Structure destroyed' : 'Damage received',
        },
        { eventId: damageEvent.id, relationship: 'triggered' },
      );
    }

    // Handle destruction
    if (destroyed) {
      let pilotFate: 'survived' | 'wounded' | 'kia' | undefined;

      // Handle pilot if assigned
      if (instance.assignedPilotInstanceId) {
        const pilot = await service.getPilotInstance(
          instance.assignedPilotInstanceId,
        );
        if (pilot) {
          // Determine pilot fate based on current wounds (simplified)
          // In a real implementation, this would consider cockpit hits, etc.
          if (pilot.wounds >= 5) {
            pilotFate = 'kia';
          } else if (pilot.wounds >= 2) {
            pilotFate = 'wounded';
          } else {
            pilotFate = 'survived';
          }

          // Unassign pilot from destroyed unit
          await this.unassignPilot(pilot.id, 'unit_destroyed');

          // Handle pilot death if KIA
          if (pilotFate === 'kia') {
            await service.updatePilotInstance(pilot.id, {
              status: CampaignPilotStatus.KIA,
            });
            emitPilotInstanceDeceased(
              {
                instanceId: pilot.id,
                campaignId: pilot.campaignId,
                pilotName: pilot.pilotName,
                cause: 'Unit destroyed',
                unitInstanceId: instanceId,
                unitName: instance.unitName,
                totalKills: pilot.killCount,
                totalMissions: pilot.missionsParticipated,
                gameId: options.gameId,
              },
              { eventId: damageEvent.id, relationship: 'triggered' },
            );
          }
        }
      }

      emitUnitInstanceDestroyed(
        {
          instanceId,
          campaignId: instance.campaignId,
          unitName: instance.unitName,
          cause: options.damageSource ?? 'Combat damage',
          pilotInstanceId: instance.assignedPilotInstanceId,
          pilotFate,
          gameId: options.gameId,
        },
        { eventId: damageEvent.id, relationship: 'triggered' },
      );

      // Refresh instance after updates
      updated = (await service.getUnitInstance(instanceId))!;
    }

    return {
      instance: updated,
      previousDamagePercentage,
      newDamagePercentage,
      statusChanged,
      destroyed,
      eventId: damageEvent.id,
    };
  }

  async startRepair(
    instanceId: string,
    repairItems: readonly string[],
    estimatedCost: number,
    estimatedTime: number,
  ): Promise<ICampaignUnitInstance> {
    const service = getCampaignInstanceService();
    const instance = await service.getUnitInstance(instanceId);

    if (!instance) {
      throw new Error(`Unit instance not found: ${instanceId}`);
    }

    if (instance.status === CampaignUnitStatus.Destroyed) {
      throw new Error('Cannot repair a destroyed unit');
    }

    // Update status to repairing
    const updated = await service.updateUnitInstance(instanceId, {
      status: CampaignUnitStatus.Repairing,
      estimatedRepairCost: estimatedCost,
      estimatedRepairTime: estimatedTime,
    });

    // Emit repair started event
    const repairEvent = emitUnitInstanceRepairStarted({
      instanceId,
      campaignId: instance.campaignId,
      estimatedCost,
      estimatedTime,
      repairItems,
    });

    // Emit status changed (linked to repair event)
    emitUnitInstanceStatusChanged(
      {
        instanceId,
        campaignId: instance.campaignId,
        previousStatus: instance.status,
        newStatus: CampaignUnitStatus.Repairing,
        reason: 'Repair initiated',
      },
      { eventId: repairEvent.id, relationship: 'triggered' },
    );

    return updated;
  }

  async completeRepair(
    instanceId: string,
    actualCost: number,
    actualTime: number,
    newDamageState: IUnitDamageState,
  ): Promise<ICampaignUnitInstance> {
    const service = getCampaignInstanceService();
    const instance = await service.getUnitInstance(instanceId);

    if (!instance) {
      throw new Error(`Unit instance not found: ${instanceId}`);
    }

    if (instance.status !== CampaignUnitStatus.Repairing) {
      throw new Error('Unit is not currently being repaired');
    }

    const newStatus = determineUnitStatus(newDamageState);

    // Update instance
    const updated = await service.updateUnitInstance(instanceId, {
      status: newStatus,
      damageState: newDamageState,
      estimatedRepairCost: 0,
      estimatedRepairTime: 0,
    });

    // Emit repair completed event
    const repairEvent = emitUnitInstanceRepairCompleted({
      instanceId,
      campaignId: instance.campaignId,
      actualCost,
      actualTime,
      newStatus,
    });

    // Emit status changed
    emitUnitInstanceStatusChanged(
      {
        instanceId,
        campaignId: instance.campaignId,
        previousStatus: CampaignUnitStatus.Repairing,
        newStatus,
        reason: 'Repair completed',
      },
      { eventId: repairEvent.id, relationship: 'triggered' },
    );

    return updated;
  }

  // ---------------------------------------------------------------------------
  // Pilot State Changes
  // ---------------------------------------------------------------------------

  async awardXP(
    instanceId: string,
    xpAmount: number,
    source:
      | 'mission_participation'
      | 'kill'
      | 'victory'
      | 'objective'
      | 'survival'
      | 'other',
    options: {
      details?: string;
      gameId?: string;
      causedBy?: ICausedBy;
    } = {},
  ): Promise<ICampaignPilotInstance> {
    const service = getCampaignInstanceService();
    const instance = await service.getPilotInstance(instanceId);

    if (!instance) {
      throw new Error(`Pilot instance not found: ${instanceId}`);
    }

    const newXP = instance.currentXP + xpAmount;
    const newCampaignXP = instance.campaignXPEarned + xpAmount;

    const updated = await service.updatePilotInstance(instanceId, {
      currentXP: newXP,
      campaignXPEarned: newCampaignXP,
    });

    emitPilotInstanceXPGained(
      {
        instanceId,
        campaignId: instance.campaignId,
        xpGained: xpAmount,
        totalXP: newXP,
        source,
        details: options.details,
        gameId: options.gameId,
      },
      options.causedBy,
    );

    return updated;
  }

  async applyWounds(
    instanceId: string,
    woundsReceived: number,
    cause: string,
    options: {
      gameId?: string;
      causedBy?: ICausedBy;
    } = {},
  ): Promise<IApplyWoundsResult> {
    const service = getCampaignInstanceService();
    const instance = await service.getPilotInstance(instanceId);

    if (!instance) {
      throw new Error(`Pilot instance not found: ${instanceId}`);
    }

    const previousWounds = instance.wounds;
    const totalWounds = previousWounds + woundsReceived;
    const deceased = totalWounds >= 6;
    const recoveryTime = deceased ? 0 : calculateRecoveryTime(totalWounds);

    // Determine new status
    let newStatus: CampaignPilotStatus;
    if (deceased) {
      newStatus = CampaignPilotStatus.KIA;
    } else if (totalWounds >= 4) {
      newStatus = CampaignPilotStatus.Critical;
    } else if (totalWounds >= 1) {
      newStatus = CampaignPilotStatus.Wounded;
    } else {
      newStatus = CampaignPilotStatus.Active;
    }

    const statusChanged = newStatus !== instance.status;

    // Update instance
    let updated = await service.updatePilotInstance(instanceId, {
      wounds: totalWounds,
      status: newStatus,
      recoveryTime,
    });

    // Emit wounded event
    const woundEvent = emitPilotInstanceWounded(
      {
        instanceId,
        campaignId: instance.campaignId,
        woundsReceived,
        totalWounds,
        cause,
        recoveryTime,
        gameId: options.gameId,
      },
      options.causedBy,
    );

    // Emit status changed if needed
    if (statusChanged) {
      emitPilotInstanceStatusChanged(
        {
          instanceId,
          campaignId: instance.campaignId,
          previousStatus: instance.status,
          newStatus,
          reason: deceased ? 'Fatal wounds' : 'Wounds received',
        },
        { eventId: woundEvent.id, relationship: 'triggered' },
      );
    }

    // Handle death
    if (deceased) {
      // Unassign from unit if assigned
      if (instance.assignedUnitInstanceId) {
        const unit = await service.getUnitInstance(
          instance.assignedUnitInstanceId,
        );
        if (unit) {
          await service.updateUnitInstance(unit.id, {
            assignedPilotInstanceId: null, // Use null to explicitly clear
          });
          emitUnitInstancePilotUnassigned({
            unitInstanceId: unit.id,
            pilotInstanceId: instanceId,
            pilotName: instance.pilotName,
            campaignId: instance.campaignId,
            reason: 'pilot_kia',
          });
        }
      }

      emitPilotInstanceDeceased(
        {
          instanceId,
          campaignId: instance.campaignId,
          pilotName: instance.pilotName,
          cause,
          unitInstanceId: instance.assignedUnitInstanceId,
          totalKills: instance.killCount,
          totalMissions: instance.missionsParticipated,
          gameId: options.gameId,
        },
        { eventId: woundEvent.id, relationship: 'triggered' },
      );

      // Refresh instance
      updated = (await service.getPilotInstance(instanceId))!;
    }

    return {
      instance: updated,
      previousWounds,
      totalWounds,
      statusChanged,
      deceased,
      eventId: woundEvent.id,
    };
  }

  async recordKill(
    instanceId: string,
    targetName: string,
    weaponUsed: string,
    options: {
      targetUnitId?: string;
      gameId?: string;
      causedBy?: ICausedBy;
    } = {},
  ): Promise<ICampaignPilotInstance> {
    const service = getCampaignInstanceService();
    const instance = await service.getPilotInstance(instanceId);

    if (!instance) {
      throw new Error(`Pilot instance not found: ${instanceId}`);
    }

    const newKillCount = instance.killCount + 1;

    const updated = await service.updatePilotInstance(instanceId, {
      killCount: newKillCount,
    });

    // Emit kill recorded
    const killEvent = emitPilotInstanceKillRecorded(
      {
        instanceId,
        campaignId: instance.campaignId,
        targetName,
        targetUnitId: options.targetUnitId,
        weaponUsed,
        totalKills: newKillCount,
        gameId: options.gameId,
      },
      options.causedBy,
    );

    // Award XP for kill
    await this.awardXP(instanceId, XP_REWARDS.KILL, 'kill', {
      details: `Destroyed ${targetName}`,
      gameId: options.gameId,
      causedBy: { eventId: killEvent.id, relationship: 'derived' },
    });

    // Refresh and return
    return (await service.getPilotInstance(instanceId))!;
  }

  async improveSkill(
    instanceId: string,
    skill: 'gunnery' | 'piloting',
  ): Promise<ICampaignPilotInstance> {
    const service = getCampaignInstanceService();
    const instance = await service.getPilotInstance(instanceId);

    if (!instance) {
      throw new Error(`Pilot instance not found: ${instanceId}`);
    }

    const currentValue = instance.currentSkills[skill];
    const xpCost =
      skill === 'gunnery'
        ? SKILL_IMPROVEMENT_COSTS.GUNNERY_IMPROVEMENT
        : SKILL_IMPROVEMENT_COSTS.PILOTING_IMPROVEMENT;

    // Validate
    if (currentValue <= SKILL_IMPROVEMENT_COSTS.MIN_SKILL) {
      throw new Error(
        `${skill} is already at maximum (${SKILL_IMPROVEMENT_COSTS.MIN_SKILL})`,
      );
    }
    if (instance.currentXP < xpCost) {
      throw new Error(
        `Not enough XP. Need ${xpCost}, have ${instance.currentXP}`,
      );
    }

    const newValue = currentValue - 1;
    const newSkills: IPilotSkills = {
      ...instance.currentSkills,
      [skill]: newValue,
    };

    const updated = await service.updatePilotInstance(instanceId, {
      currentSkills: newSkills,
      currentXP: instance.currentXP - xpCost,
    });

    emitPilotInstanceSkillImproved({
      instanceId,
      campaignId: instance.campaignId,
      skill,
      previousValue: currentValue,
      newValue,
      xpSpent: xpCost,
    });

    return updated;
  }

  async completeMission(
    instanceId: string,
    missionId: string,
    missionName: string,
    outcome: 'victory' | 'defeat' | 'draw',
    kills: number,
    options: {
      survivedCritical?: boolean;
      optionalObjectivesCompleted?: number;
    } = {},
  ): Promise<IMissionCompletionResult> {
    const service = getCampaignInstanceService();
    const instance = await service.getPilotInstance(instanceId);

    if (!instance) {
      throw new Error(`Pilot instance not found: ${instanceId}`);
    }

    const eventIds: string[] = [];

    // Calculate XP earned
    let xpEarned = XP_REWARDS.MISSION_PARTICIPATION;
    if (outcome === 'victory') {
      xpEarned += XP_REWARDS.VICTORY_BONUS;
    }
    if (options.survivedCritical) {
      xpEarned += XP_REWARDS.SURVIVAL_BONUS;
    }
    if (options.optionalObjectivesCompleted) {
      xpEarned +=
        options.optionalObjectivesCompleted * XP_REWARDS.OPTIONAL_OBJECTIVE;
    }
    // Note: Kill XP is awarded separately via recordKill

    // Update missions participated
    const newMissionCount = instance.missionsParticipated + 1;
    await service.updatePilotInstance(instanceId, {
      missionsParticipated: newMissionCount,
    });

    // Emit mission completed event
    const missionEvent = emitPilotInstanceMissionCompleted({
      instanceId,
      campaignId: instance.campaignId,
      missionId,
      missionName,
      outcome,
      kills,
      xpEarned,
      totalMissions: newMissionCount,
    });
    eventIds.push(missionEvent.id);

    // Award XP
    const xpUpdated = await this.awardXP(
      instanceId,
      xpEarned,
      'mission_participation',
      {
        details: `${missionName} - ${outcome}`,
        causedBy: { eventId: missionEvent.id, relationship: 'derived' },
      },
    );

    return {
      instance: xpUpdated,
      xpEarned,
      eventIds,
    };
  }

  // ---------------------------------------------------------------------------
  // Assignment Changes
  // ---------------------------------------------------------------------------

  async assignPilotToUnit(
    pilotInstanceId: string,
    unitInstanceId: string,
  ): Promise<{ pilot: ICampaignPilotInstance; unit: ICampaignUnitInstance }> {
    const service = getCampaignInstanceService();

    const pilot = await service.getPilotInstance(pilotInstanceId);
    const unit = await service.getUnitInstance(unitInstanceId);

    if (!pilot) {
      throw new Error(`Pilot instance not found: ${pilotInstanceId}`);
    }
    if (!unit) {
      throw new Error(`Unit instance not found: ${unitInstanceId}`);
    }

    const previousPilotId = unit.assignedPilotInstanceId;

    // Handle previous pilot
    if (previousPilotId && previousPilotId !== pilotInstanceId) {
      const previousPilot = await service.getPilotInstance(previousPilotId);
      if (previousPilot) {
        emitUnitInstancePilotUnassigned({
          unitInstanceId,
          pilotInstanceId: previousPilotId,
          pilotName: previousPilot.pilotName,
          campaignId: unit.campaignId,
          reason: 'manual',
        });
      }
    }

    // Perform assignment
    await service.assignPilotToUnit(pilotInstanceId, unitInstanceId);

    // Emit assigned event
    emitUnitInstancePilotAssigned({
      unitInstanceId,
      pilotInstanceId,
      pilotName: pilot.pilotName,
      campaignId: unit.campaignId,
      previousPilotInstanceId: previousPilotId,
    });

    // Return updated instances
    const updatedPilot = (await service.getPilotInstance(pilotInstanceId))!;
    const updatedUnit = (await service.getUnitInstance(unitInstanceId))!;

    return { pilot: updatedPilot, unit: updatedUnit };
  }

  async unassignPilot(
    pilotInstanceId: string,
    reason:
      | 'manual'
      | 'pilot_wounded'
      | 'pilot_kia'
      | 'unit_destroyed' = 'manual',
  ): Promise<ICampaignPilotInstance> {
    const service = getCampaignInstanceService();

    const pilot = await service.getPilotInstance(pilotInstanceId);
    if (!pilot) {
      throw new Error(`Pilot instance not found: ${pilotInstanceId}`);
    }

    if (!pilot.assignedUnitInstanceId) {
      return pilot; // Already unassigned
    }

    const unitId = pilot.assignedUnitInstanceId;

    // Perform unassignment
    await service.unassignPilot(pilotInstanceId);

    // Emit event
    emitUnitInstancePilotUnassigned({
      unitInstanceId: unitId,
      pilotInstanceId,
      pilotName: pilot.pilotName,
      campaignId: pilot.campaignId,
      reason,
    });

    return (await service.getPilotInstance(pilotInstanceId))!;
  }
}

// =============================================================================
// Singleton
// =============================================================================

let _instance: CampaignInstanceStateService | null = null;

/**
 * Get the singleton CampaignInstanceStateService instance.
 */
export function getCampaignInstanceStateService(): CampaignInstanceStateService {
  if (!_instance) {
    _instance = new CampaignInstanceStateService();
  }
  return _instance;
}

/**
 * Reset the singleton instance (for testing).
 * @internal
 */
export function _resetCampaignInstanceStateService(): void {
  _instance = null;
}
