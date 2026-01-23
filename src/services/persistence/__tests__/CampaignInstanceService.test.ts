/**
 * Campaign Instance Service Tests
 *
 * Tests for the CampaignInstanceService CRUD operations.
 * Uses fake-indexeddb for browser storage simulation.
 */

// Polyfill structuredClone for Node.js < 17
if (typeof structuredClone === 'undefined') {
  Object.defineProperty(global, 'structuredClone', {
    value: <T>(obj: T): T => JSON.parse(JSON.stringify(obj)) as T,
    writable: true,
    configurable: true,
  });
}

import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';
import {
  CampaignInstanceService,
  _resetCampaignInstanceService,
} from '../CampaignInstanceService';
import { _resetIndexedDBService } from '../IndexedDBService';
import { CampaignUnitStatus, CampaignPilotStatus } from '../../../types/campaign/CampaignInterfaces';
import type { ICampaignUnitInstance, ICampaignPilotInstance } from '../../../types/campaign/CampaignInstanceInterfaces';

// Reset singletons and IndexedDB before each test
beforeEach(() => {
  // Create a fresh IndexedDB for each test
  Object.defineProperty(global, 'indexedDB', {
    value: new IDBFactory(),
    writable: true,
    configurable: true,
  });
  _resetIndexedDBService();
  _resetCampaignInstanceService();
});

// =============================================================================
// Unit Instance Tests
// =============================================================================

describe('CampaignInstanceService - Unit Instances', () => {
  let service: CampaignInstanceService;

  beforeEach(() => {
    service = new CampaignInstanceService();
  });

  describe('createUnitInstance', () => {
    it('should create a new unit instance', async () => {
      const instance = await service.createUnitInstance(
        {
          campaignId: 'campaign-1',
          vaultUnitId: 'vault-unit-1',
        },
        {
          version: 1,
          name: 'Atlas AS7-D',
          chassis: 'Atlas',
          variant: 'AS7-D',
        }
      );

      expect(instance.id).toBeTruthy();
      expect(instance.campaignId).toBe('campaign-1');
      expect(instance.vaultUnitId).toBe('vault-unit-1');
      expect(instance.vaultUnitVersion).toBe(1);
      expect(instance.unitName).toBe('Atlas AS7-D');
      expect(instance.unitChassis).toBe('Atlas');
      expect(instance.unitVariant).toBe('AS7-D');
      expect(instance.status).toBe(CampaignUnitStatus.Operational);
      expect(instance.damageState).toBeDefined();
      expect(instance.totalKills).toBe(0);
      expect(instance.missionsParticipated).toBe(0);
      expect(instance.createdAt).toBeTruthy();
      expect(instance.updatedAt).toBeTruthy();
    });

    it('should create with optional force assignment', async () => {
      const instance = await service.createUnitInstance(
        {
          campaignId: 'campaign-1',
          vaultUnitId: 'vault-unit-1',
          forceId: 'force-1',
          forceSlot: 2,
          notes: 'Test notes',
        },
        {
          version: 1,
          name: 'Marauder MAD-3R',
          chassis: 'Marauder',
          variant: 'MAD-3R',
        }
      );

      expect(instance.forceId).toBe('force-1');
      expect(instance.forceSlot).toBe(2);
      expect(instance.notes).toBe('Test notes');
    });
  });

  describe('getUnitInstance', () => {
    it('should retrieve a created unit instance', async () => {
      const created = await service.createUnitInstance(
        { campaignId: 'campaign-1', vaultUnitId: 'vault-1' },
        { version: 1, name: 'Test', chassis: 'Test', variant: 'T-1' }
      );

      const retrieved = await service.getUnitInstance(created.id);

      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(created.id);
      expect(retrieved?.unitName).toBe('Test');
    });

    it('should return undefined for non-existent instance', async () => {
      const result = await service.getUnitInstance('non-existent');
      expect(result).toBeUndefined();
    });
  });

  describe('updateUnitInstance', () => {
    it('should update unit instance fields', async () => {
      const created = await service.createUnitInstance(
        { campaignId: 'campaign-1', vaultUnitId: 'vault-1' },
        { version: 1, name: 'Test', chassis: 'Test', variant: 'T-1' }
      );

      const updated = await service.updateUnitInstance(created.id, {
        status: CampaignUnitStatus.Damaged,
        totalKills: 3,
        missionsParticipated: 5,
        notes: 'Updated notes',
      });

      expect(updated.status).toBe(CampaignUnitStatus.Damaged);
      expect(updated.totalKills).toBe(3);
      expect(updated.missionsParticipated).toBe(5);
      expect(updated.notes).toBe('Updated notes');
      // updatedAt should be set (may be same as createdAt if very fast)
      expect(updated.updatedAt).toBeTruthy();
    });

    it('should throw for non-existent instance', async () => {
      await expect(
        service.updateUnitInstance('non-existent', { status: CampaignUnitStatus.Damaged })
      ).rejects.toThrow('Unit instance not found');
    });
  });

  describe('deleteUnitInstance', () => {
    it('should delete a unit instance', async () => {
      const created = await service.createUnitInstance(
        { campaignId: 'campaign-1', vaultUnitId: 'vault-1' },
        { version: 1, name: 'Test', chassis: 'Test', variant: 'T-1' }
      );

      await service.deleteUnitInstance(created.id);

      const retrieved = await service.getUnitInstance(created.id);
      expect(retrieved).toBeUndefined();
    });
  });

  describe('listUnitInstances', () => {
    beforeEach(async () => {
      // Create test instances
      await service.createUnitInstance(
        { campaignId: 'campaign-1', vaultUnitId: 'vault-1', forceId: 'force-1' },
        { version: 1, name: 'Unit 1', chassis: 'Atlas', variant: 'AS7-D' }
      );
      await service.createUnitInstance(
        { campaignId: 'campaign-1', vaultUnitId: 'vault-2', forceId: 'force-2' },
        { version: 1, name: 'Unit 2', chassis: 'Marauder', variant: 'MAD-3R' }
      );
      await service.createUnitInstance(
        { campaignId: 'campaign-2', vaultUnitId: 'vault-3' },
        { version: 1, name: 'Unit 3', chassis: 'Warhammer', variant: 'WHM-6R' }
      );
    });

    it('should list all unit instances', async () => {
      const instances = await service.listUnitInstances();
      expect(instances).toHaveLength(3);
    });

    it('should filter by campaign ID', async () => {
      const instances = await service.listUnitInstances({ campaignId: 'campaign-1' });
      expect(instances).toHaveLength(2);
      expect(instances.every((i) => i.campaignId === 'campaign-1')).toBe(true);
    });

    it('should filter by force ID', async () => {
      const instances = await service.listUnitInstances({ forceId: 'force-1' });
      expect(instances).toHaveLength(1);
      expect(instances[0].forceId).toBe('force-1');
    });

    it('should filter available only', async () => {
      // Update one to destroyed
      const all = await service.listUnitInstances({ campaignId: 'campaign-1' });
      await service.updateUnitInstance(all[0].id, { status: CampaignUnitStatus.Destroyed });

      const available = await service.listUnitInstances({
        campaignId: 'campaign-1',
        availableOnly: true,
      });
      expect(available).toHaveLength(1);
    });
  });
});

// =============================================================================
// Pilot Instance Tests
// =============================================================================

describe('CampaignInstanceService - Pilot Instances', () => {
  let service: CampaignInstanceService;

  beforeEach(() => {
    service = new CampaignInstanceService();
  });

  describe('createPilotInstanceFromVault', () => {
    it('should create pilot instance from vault pilot', async () => {
      const instance = await service.createPilotInstanceFromVault(
        { campaignId: 'campaign-1', vaultPilotId: 'vault-pilot-1' },
        { name: 'John Doe', callsign: 'Maverick', skills: { gunnery: 3, piloting: 4 } }
      );

      expect(instance.id).toBeTruthy();
      expect(instance.campaignId).toBe('campaign-1');
      expect(instance.vaultPilotId).toBe('vault-pilot-1');
      expect(instance.statblockData).toBeNull();
      expect(instance.pilotName).toBe('John Doe');
      expect(instance.pilotCallsign).toBe('Maverick');
      expect(instance.currentSkills).toEqual({ gunnery: 3, piloting: 4 });
      expect(instance.status).toBe(CampaignPilotStatus.Active);
      expect(instance.wounds).toBe(0);
      expect(instance.currentXP).toBe(0);
    });
  });

  describe('createPilotInstanceFromStatblock', () => {
    it('should create pilot instance from statblock', async () => {
      const instance = await service.createPilotInstanceFromStatblock({
        campaignId: 'campaign-1',
        statblock: { name: 'Generic Pilot', gunnery: 4, piloting: 5 },
      });

      expect(instance.id).toBeTruthy();
      expect(instance.campaignId).toBe('campaign-1');
      expect(instance.vaultPilotId).toBeNull();
      expect(instance.statblockData).toEqual({ name: 'Generic Pilot', gunnery: 4, piloting: 5 });
      expect(instance.pilotName).toBe('Generic Pilot');
      expect(instance.currentSkills).toEqual({ gunnery: 4, piloting: 5 });
    });
  });

  describe('updatePilotInstance', () => {
    it('should update pilot instance fields', async () => {
      const created = await service.createPilotInstanceFromVault(
        { campaignId: 'campaign-1', vaultPilotId: 'vault-pilot-1' },
        { name: 'Test Pilot', skills: { gunnery: 4, piloting: 5 } }
      );

      const updated = await service.updatePilotInstance(created.id, {
        wounds: 2,
        currentXP: 10,
        killCount: 5,
        status: CampaignPilotStatus.Wounded,
      });

      expect(updated.wounds).toBe(2);
      expect(updated.currentXP).toBe(10);
      expect(updated.killCount).toBe(5);
      expect(updated.status).toBe(CampaignPilotStatus.Wounded);
    });
  });

  describe('listPilotInstances', () => {
    beforeEach(async () => {
      await service.createPilotInstanceFromVault(
        { campaignId: 'campaign-1', vaultPilotId: 'pilot-1' },
        { name: 'Pilot 1', skills: { gunnery: 4, piloting: 5 } }
      );
      await service.createPilotInstanceFromVault(
        { campaignId: 'campaign-1', vaultPilotId: 'pilot-2' },
        { name: 'Pilot 2', skills: { gunnery: 3, piloting: 4 } }
      );
      await service.createPilotInstanceFromStatblock({
        campaignId: 'campaign-2',
        statblock: { name: 'NPC', gunnery: 5, piloting: 6 },
      });
    });

    it('should list all pilot instances', async () => {
      const instances = await service.listPilotInstances();
      expect(instances).toHaveLength(3);
    });

    it('should filter by campaign ID', async () => {
      const instances = await service.listPilotInstances({ campaignId: 'campaign-1' });
      expect(instances).toHaveLength(2);
    });

    it('should filter available only', async () => {
      const all = await service.listPilotInstances({ campaignId: 'campaign-1' });
      await service.updatePilotInstance(all[0].id, { recoveryTime: 5 });

      const available = await service.listPilotInstances({
        campaignId: 'campaign-1',
        availableOnly: true,
      });
      expect(available).toHaveLength(1);
    });
  });
});

// =============================================================================
// Assignment Tests
// =============================================================================

describe('CampaignInstanceService - Assignments', () => {
  let service: CampaignInstanceService;
  let unitInstance: ICampaignUnitInstance;
  let pilotInstance: ICampaignPilotInstance;

  beforeEach(async () => {
    service = new CampaignInstanceService();

    unitInstance = await service.createUnitInstance(
      { campaignId: 'campaign-1', vaultUnitId: 'vault-1' },
      { version: 1, name: 'Atlas', chassis: 'Atlas', variant: 'AS7-D' }
    );

    pilotInstance = await service.createPilotInstanceFromVault(
      { campaignId: 'campaign-1', vaultPilotId: 'pilot-1' },
      { name: 'Test Pilot', skills: { gunnery: 4, piloting: 5 } }
    );
  });

  describe('assignPilotToUnit', () => {
    it('should create bidirectional assignment', async () => {
      await service.assignPilotToUnit(pilotInstance.id, unitInstance.id);

      const updatedPilot = await service.getPilotInstance(pilotInstance.id);
      const updatedUnit = await service.getUnitInstance(unitInstance.id);

      expect(updatedPilot?.assignedUnitInstanceId).toBe(unitInstance.id);
      expect(updatedUnit?.assignedPilotInstanceId).toBe(pilotInstance.id);
    });

    it('should unassign previous pilot when assigning new one', async () => {
      // Create second pilot
      const pilot2 = await service.createPilotInstanceFromVault(
        { campaignId: 'campaign-1', vaultPilotId: 'pilot-2' },
        { name: 'Pilot 2', skills: { gunnery: 3, piloting: 4 } }
      );

      // Assign first pilot
      await service.assignPilotToUnit(pilotInstance.id, unitInstance.id);

      // Assign second pilot (should unassign first)
      await service.assignPilotToUnit(pilot2.id, unitInstance.id);

      const pilot1Updated = await service.getPilotInstance(pilotInstance.id);
      const pilot2Updated = await service.getPilotInstance(pilot2.id);
      const unitUpdated = await service.getUnitInstance(unitInstance.id);

      expect(pilot1Updated?.assignedUnitInstanceId).toBeUndefined();
      expect(pilot2Updated?.assignedUnitInstanceId).toBe(unitInstance.id);
      expect(unitUpdated?.assignedPilotInstanceId).toBe(pilot2.id);
    });
  });

  describe('unassignPilot', () => {
    it('should remove bidirectional assignment', async () => {
      await service.assignPilotToUnit(pilotInstance.id, unitInstance.id);
      await service.unassignPilot(pilotInstance.id);

      const updatedPilot = await service.getPilotInstance(pilotInstance.id);
      const updatedUnit = await service.getUnitInstance(unitInstance.id);

      expect(updatedPilot?.assignedUnitInstanceId).toBeUndefined();
      expect(updatedUnit?.assignedPilotInstanceId).toBeUndefined();
    });
  });
});

// =============================================================================
// Bulk Operations Tests
// =============================================================================

describe('CampaignInstanceService - Bulk Operations', () => {
  let service: CampaignInstanceService;

  beforeEach(async () => {
    service = new CampaignInstanceService();

    // Create instances for multiple campaigns
    await service.createUnitInstance(
      { campaignId: 'campaign-1', vaultUnitId: 'v1' },
      { version: 1, name: 'U1', chassis: 'C', variant: 'V' }
    );
    await service.createUnitInstance(
      { campaignId: 'campaign-1', vaultUnitId: 'v2' },
      { version: 1, name: 'U2', chassis: 'C', variant: 'V' }
    );
    await service.createUnitInstance(
      { campaignId: 'campaign-2', vaultUnitId: 'v3' },
      { version: 1, name: 'U3', chassis: 'C', variant: 'V' }
    );

    await service.createPilotInstanceFromVault(
      { campaignId: 'campaign-1', vaultPilotId: 'p1' },
      { name: 'P1', skills: { gunnery: 4, piloting: 5 } }
    );
    await service.createPilotInstanceFromVault(
      { campaignId: 'campaign-2', vaultPilotId: 'p2' },
      { name: 'P2', skills: { gunnery: 4, piloting: 5 } }
    );
  });

  describe('deleteInstancesForCampaign', () => {
    it('should delete all instances for a campaign', async () => {
      await service.deleteInstancesForCampaign('campaign-1');

      const units1 = await service.listUnitInstances({ campaignId: 'campaign-1' });
      const pilots1 = await service.listPilotInstances({ campaignId: 'campaign-1' });
      const units2 = await service.listUnitInstances({ campaignId: 'campaign-2' });
      const pilots2 = await service.listPilotInstances({ campaignId: 'campaign-2' });

      expect(units1).toHaveLength(0);
      expect(pilots1).toHaveLength(0);
      expect(units2).toHaveLength(1); // Other campaign unaffected
      expect(pilots2).toHaveLength(1);
    });
  });
});
