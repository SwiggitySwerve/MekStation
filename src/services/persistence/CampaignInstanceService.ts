/**
 * Campaign Instance Persistence Service
 *
 * Provides CRUD operations for campaign unit and pilot instances.
 * Uses IndexedDB for browser storage and SQLite for desktop/server.
 *
 * @spec openspec/changes/add-campaign-instances/specs/campaign-instances/spec.md
 */

import { getIndexedDBService, STORES } from './IndexedDBService';
import type {
  ICampaignUnitInstance,
  ICampaignPilotInstance,
  ICreateUnitInstanceInput,
  ICreatePilotInstanceFromVaultInput,
  ICreatePilotInstanceFromStatblockInput,
  IUnitDamageState,
} from '../../types/campaign/CampaignInstanceInterfaces';
import {
  createUnitInstance,
  createPilotInstanceFromVault,
  createPilotInstanceFromStatblock,
  createEmptyDamageState,
} from '../../types/campaign/CampaignInstanceInterfaces';
import { CampaignUnitStatus, CampaignPilotStatus } from '../../types/campaign/CampaignInterfaces';
import type { IPilotSkills } from '../../types/pilot/PilotInterfaces';

// =============================================================================
// Types
// =============================================================================

/**
 * Query options for listing instances
 */
export interface IInstanceQueryOptions {
  /** Filter by campaign ID */
  readonly campaignId?: string;
  /** Filter by status */
  readonly status?: CampaignUnitStatus | CampaignPilotStatus;
  /** Filter by force ID */
  readonly forceId?: string;
  /** Include only available (deployable) instances */
  readonly availableOnly?: boolean;
}

/**
 * Unit instance update input
 */
export interface IUpdateUnitInstanceInput {
  readonly status?: CampaignUnitStatus;
  readonly damageState?: IUnitDamageState;
  readonly assignedPilotInstanceId?: string | null;
  readonly forceId?: string | null;
  readonly forceSlot?: number | null;
  readonly totalKills?: number;
  readonly missionsParticipated?: number;
  readonly estimatedRepairCost?: number;
  readonly estimatedRepairTime?: number;
  readonly notes?: string;
}

/**
 * Pilot instance update input
 */
export interface IUpdatePilotInstanceInput {
  readonly status?: CampaignPilotStatus;
  readonly currentSkills?: IPilotSkills;
  readonly wounds?: number;
  readonly currentXP?: number;
  readonly campaignXPEarned?: number;
  readonly killCount?: number;
  readonly missionsParticipated?: number;
  readonly assignedUnitInstanceId?: string | null;
  readonly recoveryTime?: number;
  readonly notes?: string;
}

// =============================================================================
// Service Interface
// =============================================================================

/**
 * Campaign Instance Service interface
 */
export interface ICampaignInstanceService {
  // Unit Instances
  createUnitInstance(input: ICreateUnitInstanceInput, unitData: {
    version: number;
    name: string;
    chassis: string;
    variant: string;
    damageState?: IUnitDamageState;
  }): Promise<ICampaignUnitInstance>;
  getUnitInstance(id: string): Promise<ICampaignUnitInstance | undefined>;
  updateUnitInstance(id: string, updates: IUpdateUnitInstanceInput): Promise<ICampaignUnitInstance>;
  deleteUnitInstance(id: string): Promise<void>;
  listUnitInstances(options?: IInstanceQueryOptions): Promise<ICampaignUnitInstance[]>;

  // Pilot Instances
  createPilotInstanceFromVault(input: ICreatePilotInstanceFromVaultInput, pilotData: {
    name: string;
    callsign?: string;
    skills: IPilotSkills;
  }): Promise<ICampaignPilotInstance>;
  createPilotInstanceFromStatblock(input: ICreatePilotInstanceFromStatblockInput): Promise<ICampaignPilotInstance>;
  getPilotInstance(id: string): Promise<ICampaignPilotInstance | undefined>;
  updatePilotInstance(id: string, updates: IUpdatePilotInstanceInput): Promise<ICampaignPilotInstance>;
  deletePilotInstance(id: string): Promise<void>;
  listPilotInstances(options?: IInstanceQueryOptions): Promise<ICampaignPilotInstance[]>;

  // Assignments
  assignPilotToUnit(pilotInstanceId: string, unitInstanceId: string): Promise<void>;
  unassignPilot(pilotInstanceId: string): Promise<void>;

  // Bulk Operations
  deleteInstancesForCampaign(campaignId: string): Promise<void>;
}

// =============================================================================
// IndexedDB Implementation
// =============================================================================

/**
 * Generate a unique ID for instances
 */
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
}

/**
 * Campaign Instance Service implementation using IndexedDB
 */
export class CampaignInstanceService implements ICampaignInstanceService {
  private initialized = false;

  /**
   * Ensure the database is initialized
   */
  private async ensureInitialized(): Promise<void> {
    if (this.initialized) return;
    await getIndexedDBService().initialize();
    this.initialized = true;
  }

  // ---------------------------------------------------------------------------
  // Unit Instances
  // ---------------------------------------------------------------------------

  async createUnitInstance(
    input: ICreateUnitInstanceInput,
    unitData: {
      version: number;
      name: string;
      chassis: string;
      variant: string;
      damageState?: IUnitDamageState;
    }
  ): Promise<ICampaignUnitInstance> {
    await this.ensureInitialized();

    const id = generateId();
    const damageState = unitData.damageState ?? createEmptyDamageState();

    const instance = createUnitInstance(
      id,
      input.campaignId,
      input.vaultUnitId,
      unitData.version,
      unitData.name,
      unitData.chassis,
      unitData.variant,
      damageState
    );

    // Apply optional fields from input
    const fullInstance: ICampaignUnitInstance = {
      ...instance,
      forceId: input.forceId,
      forceSlot: input.forceSlot,
      notes: input.notes,
    };

    await getIndexedDBService().put(
      STORES.CAMPAIGN_UNIT_INSTANCES,
      id,
      fullInstance
    );

    return fullInstance;
  }

  async getUnitInstance(id: string): Promise<ICampaignUnitInstance | undefined> {
    await this.ensureInitialized();
    return getIndexedDBService().get<ICampaignUnitInstance>(
      STORES.CAMPAIGN_UNIT_INSTANCES,
      id
    );
  }

  async updateUnitInstance(
    id: string,
    updates: IUpdateUnitInstanceInput
  ): Promise<ICampaignUnitInstance> {
    await this.ensureInitialized();

    const existing = await this.getUnitInstance(id);
    if (!existing) {
      throw new Error(`Unit instance not found: ${id}`);
    }

    const updated: ICampaignUnitInstance = {
      ...existing,
      ...updates,
      // Handle null values for optional fields
      assignedPilotInstanceId:
        updates.assignedPilotInstanceId === null
          ? undefined
          : updates.assignedPilotInstanceId ?? existing.assignedPilotInstanceId,
      forceId:
        updates.forceId === null
          ? undefined
          : updates.forceId ?? existing.forceId,
      forceSlot:
        updates.forceSlot === null
          ? undefined
          : updates.forceSlot ?? existing.forceSlot,
      updatedAt: new Date().toISOString(),
    };

    await getIndexedDBService().put(
      STORES.CAMPAIGN_UNIT_INSTANCES,
      id,
      updated
    );

    return updated;
  }

  async deleteUnitInstance(id: string): Promise<void> {
    await this.ensureInitialized();

    // Unassign any pilot first
    const instance = await this.getUnitInstance(id);
    if (instance?.assignedPilotInstanceId) {
      await this.unassignPilot(instance.assignedPilotInstanceId);
    }

    await getIndexedDBService().delete(STORES.CAMPAIGN_UNIT_INSTANCES, id);
  }

  async listUnitInstances(
    options: IInstanceQueryOptions = {}
  ): Promise<ICampaignUnitInstance[]> {
    await this.ensureInitialized();

    const all = await getIndexedDBService().getAll<ICampaignUnitInstance>(
      STORES.CAMPAIGN_UNIT_INSTANCES
    );

    return all.filter((instance) => {
      if (options.campaignId && instance.campaignId !== options.campaignId) {
        return false;
      }
      if (options.status && instance.status !== options.status) {
        return false;
      }
      if (options.forceId && instance.forceId !== options.forceId) {
        return false;
      }
      if (options.availableOnly) {
        if (
          instance.status !== CampaignUnitStatus.Operational &&
          instance.status !== CampaignUnitStatus.Damaged
        ) {
          return false;
        }
      }
      return true;
    });
  }

  // ---------------------------------------------------------------------------
  // Pilot Instances
  // ---------------------------------------------------------------------------

  async createPilotInstanceFromVault(
    input: ICreatePilotInstanceFromVaultInput,
    pilotData: {
      name: string;
      callsign?: string;
      skills: IPilotSkills;
    }
  ): Promise<ICampaignPilotInstance> {
    await this.ensureInitialized();

    const id = generateId();

    const instance = createPilotInstanceFromVault(
      id,
      input.campaignId,
      input.vaultPilotId,
      pilotData.name,
      pilotData.callsign,
      pilotData.skills
    );

    const fullInstance: ICampaignPilotInstance = {
      ...instance,
      notes: input.notes,
    };

    await getIndexedDBService().put(
      STORES.CAMPAIGN_PILOT_INSTANCES,
      id,
      fullInstance
    );

    return fullInstance;
  }

  async createPilotInstanceFromStatblock(
    input: ICreatePilotInstanceFromStatblockInput
  ): Promise<ICampaignPilotInstance> {
    await this.ensureInitialized();

    const id = generateId();

    const instance = createPilotInstanceFromStatblock(
      id,
      input.campaignId,
      input.statblock
    );

    const fullInstance: ICampaignPilotInstance = {
      ...instance,
      notes: input.notes,
    };

    await getIndexedDBService().put(
      STORES.CAMPAIGN_PILOT_INSTANCES,
      id,
      fullInstance
    );

    return fullInstance;
  }

  async getPilotInstance(id: string): Promise<ICampaignPilotInstance | undefined> {
    await this.ensureInitialized();
    return getIndexedDBService().get<ICampaignPilotInstance>(
      STORES.CAMPAIGN_PILOT_INSTANCES,
      id
    );
  }

  async updatePilotInstance(
    id: string,
    updates: IUpdatePilotInstanceInput
  ): Promise<ICampaignPilotInstance> {
    await this.ensureInitialized();

    const existing = await this.getPilotInstance(id);
    if (!existing) {
      throw new Error(`Pilot instance not found: ${id}`);
    }

    const updated: ICampaignPilotInstance = {
      ...existing,
      ...updates,
      // Handle null values for optional fields
      assignedUnitInstanceId:
        updates.assignedUnitInstanceId === null
          ? undefined
          : updates.assignedUnitInstanceId ?? existing.assignedUnitInstanceId,
      updatedAt: new Date().toISOString(),
    };

    await getIndexedDBService().put(
      STORES.CAMPAIGN_PILOT_INSTANCES,
      id,
      updated
    );

    return updated;
  }

  async deletePilotInstance(id: string): Promise<void> {
    await this.ensureInitialized();

    // Unassign from unit first
    const instance = await this.getPilotInstance(id);
    if (instance?.assignedUnitInstanceId) {
      const unit = await this.getUnitInstance(instance.assignedUnitInstanceId);
      if (unit && unit.assignedPilotInstanceId === id) {
        await this.updateUnitInstance(unit.id, { assignedPilotInstanceId: null });
      }
    }

    await getIndexedDBService().delete(STORES.CAMPAIGN_PILOT_INSTANCES, id);
  }

  async listPilotInstances(
    options: IInstanceQueryOptions = {}
  ): Promise<ICampaignPilotInstance[]> {
    await this.ensureInitialized();

    const all = await getIndexedDBService().getAll<ICampaignPilotInstance>(
      STORES.CAMPAIGN_PILOT_INSTANCES
    );

    return all.filter((instance) => {
      if (options.campaignId && instance.campaignId !== options.campaignId) {
        return false;
      }
      if (options.status && instance.status !== options.status) {
        return false;
      }
      if (options.availableOnly) {
        if (
          instance.status !== CampaignPilotStatus.Active ||
          instance.recoveryTime > 0 ||
          instance.assignedUnitInstanceId !== undefined
        ) {
          return false;
        }
      }
      return true;
    });
  }

  // ---------------------------------------------------------------------------
  // Assignments
  // ---------------------------------------------------------------------------

  async assignPilotToUnit(
    pilotInstanceId: string,
    unitInstanceId: string
  ): Promise<void> {
    await this.ensureInitialized();

    const pilot = await this.getPilotInstance(pilotInstanceId);
    const unit = await this.getUnitInstance(unitInstanceId);

    if (!pilot) {
      throw new Error(`Pilot instance not found: ${pilotInstanceId}`);
    }
    if (!unit) {
      throw new Error(`Unit instance not found: ${unitInstanceId}`);
    }

    // Unassign current pilot from unit if any
    if (unit.assignedPilotInstanceId && unit.assignedPilotInstanceId !== pilotInstanceId) {
      await this.updatePilotInstance(unit.assignedPilotInstanceId, {
        assignedUnitInstanceId: null,
      });
    }

    // Unassign pilot from current unit if any
    if (pilot.assignedUnitInstanceId && pilot.assignedUnitInstanceId !== unitInstanceId) {
      await this.updateUnitInstance(pilot.assignedUnitInstanceId, {
        assignedPilotInstanceId: null,
      });
    }

    // Create bidirectional assignment
    await this.updatePilotInstance(pilotInstanceId, {
      assignedUnitInstanceId: unitInstanceId,
    });
    await this.updateUnitInstance(unitInstanceId, {
      assignedPilotInstanceId: pilotInstanceId,
    });
  }

  async unassignPilot(pilotInstanceId: string): Promise<void> {
    await this.ensureInitialized();

    const pilot = await this.getPilotInstance(pilotInstanceId);
    if (!pilot) {
      throw new Error(`Pilot instance not found: ${pilotInstanceId}`);
    }

    if (pilot.assignedUnitInstanceId) {
      await this.updateUnitInstance(pilot.assignedUnitInstanceId, {
        assignedPilotInstanceId: null,
      });
    }

    await this.updatePilotInstance(pilotInstanceId, {
      assignedUnitInstanceId: null,
    });
  }

  // ---------------------------------------------------------------------------
  // Bulk Operations
  // ---------------------------------------------------------------------------

  async deleteInstancesForCampaign(campaignId: string): Promise<void> {
    await this.ensureInitialized();

    // Get all instances for this campaign
    const units = await this.listUnitInstances({ campaignId });
    const pilots = await this.listPilotInstances({ campaignId });

    // Delete all unit instances
    for (const unit of units) {
      await getIndexedDBService().delete(STORES.CAMPAIGN_UNIT_INSTANCES, unit.id);
    }

    // Delete all pilot instances
    for (const pilot of pilots) {
      await getIndexedDBService().delete(STORES.CAMPAIGN_PILOT_INSTANCES, pilot.id);
    }
  }
}

// =============================================================================
// Singleton
// =============================================================================

let _instance: CampaignInstanceService | null = null;

/**
 * Get the singleton CampaignInstanceService instance
 */
export function getCampaignInstanceService(): CampaignInstanceService {
  if (!_instance) {
    _instance = new CampaignInstanceService();
  }
  return _instance;
}

/**
 * Reset the singleton instance (for testing)
 * @internal
 */
export function _resetCampaignInstanceService(): void {
  _instance = null;
}
