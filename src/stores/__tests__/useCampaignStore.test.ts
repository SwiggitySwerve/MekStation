/**
 * Campaign Store Tests
 */

import { act, renderHook } from '@testing-library/react';
import { useCampaignStore } from '../useCampaignStore';
import {
  CampaignStatus,
  CampaignMissionStatus,
  CampaignUnitStatus,
  CAMPAIGN_TEMPLATES,
} from '@/types/campaign';

// Reset store before each test
beforeEach(() => {
  const { result } = renderHook(() => useCampaignStore());
  act(() => {
    // Clear all campaigns
    result.current.campaigns.forEach((c) => {
      result.current.deleteCampaign(c.id);
    });
    result.current.clearError();
    result.current.selectCampaign(null);
    result.current.setStatusFilter('all');
    result.current.setSearchQuery('');
  });
});

describe('useCampaignStore', () => {
  // ===========================================================================
  // Campaign CRUD
  // ===========================================================================

  describe('createCampaign', () => {
    it('should create a new campaign with provided input', () => {
      const { result } = renderHook(() => useCampaignStore());

      let campaignId = '';
      act(() => {
        campaignId = result.current.createCampaign({
          name: 'Test Campaign',
          description: 'A test campaign',
          unitIds: ['unit-1', 'unit-2'],
          pilotIds: ['pilot-1'],
        });
      });

      expect(campaignId).toBeTruthy();
      const campaign = result.current.getCampaign(campaignId!);
      expect(campaign).toBeDefined();
      expect(campaign?.name).toBe('Test Campaign');
      expect(campaign?.status).toBe(CampaignStatus.Setup);
      expect(campaign?.roster.units).toHaveLength(2);
      expect(campaign?.roster.pilots).toHaveLength(1);
    });

    it('should set default resources', () => {
      const { result } = renderHook(() => useCampaignStore());

      let campaignId = '';
      act(() => {
        campaignId = result.current.createCampaign({
          name: 'Test',
          unitIds: [],
          pilotIds: [],
        });
      });

      const campaign = result.current.getCampaign(campaignId);
      expect(campaign?.resources.cBills).toBeGreaterThan(0);
      expect(campaign?.resources.morale).toBeGreaterThan(0);
    });

    it('should override resources when provided', () => {
      const { result } = renderHook(() => useCampaignStore());

      let campaignId = '';
      act(() => {
        campaignId = result.current.createCampaign({
          name: 'Test',
          unitIds: [],
          pilotIds: [],
          resources: { cBills: 999999 },
        });
      });

      const campaign = result.current.getCampaign(campaignId);
      expect(campaign?.resources.cBills).toBe(999999);
    });
  });

  describe('createCampaignFromTemplate', () => {
    it('should create campaign from template with missions', () => {
      const { result } = renderHook(() => useCampaignStore());
      const template = CAMPAIGN_TEMPLATES[0];

      let campaignId: string | null = null;
      act(() => {
        campaignId = result.current.createCampaignFromTemplate(template.id, {
          name: 'From Template',
          unitIds: ['u1'],
          pilotIds: ['p1'],
        });
      });

      expect(campaignId).toBeTruthy();
      const campaign = result.current.getCampaign(campaignId!);
      expect(campaign?.name).toBe('From Template');
      expect(campaign?.missions.length).toBe(template.missions.length);
    });

    it('should return null for invalid template', () => {
      const { result } = renderHook(() => useCampaignStore());

      let campaignId: string | null = null;
      act(() => {
        campaignId = result.current.createCampaignFromTemplate('invalid-template', {
          name: 'Test',
          unitIds: [],
          pilotIds: [],
        });
      });

      expect(campaignId).toBeNull();
      expect(result.current.error).toBeTruthy();
    });
  });

  describe('getCampaign', () => {
    it('should return campaign by ID', () => {
      const { result } = renderHook(() => useCampaignStore());

      let campaignId = '';
      act(() => {
        campaignId = result.current.createCampaign({
          name: 'Test',
          unitIds: [],
          pilotIds: [],
        });
      });

      const campaign = result.current.getCampaign(campaignId);
      expect(campaign).toBeDefined();
      expect(campaign?.id).toBe(campaignId);
    });

    it('should return undefined for non-existent ID', () => {
      const { result } = renderHook(() => useCampaignStore());
      expect(result.current.getCampaign('nonexistent')).toBeUndefined();
    });
  });

  describe('updateCampaign', () => {
    it('should update campaign fields', () => {
      const { result } = renderHook(() => useCampaignStore());

      let campaignId = '';
      act(() => {
        campaignId = result.current.createCampaign({
          name: 'Original',
          unitIds: [],
          pilotIds: [],
        });
      });

      act(() => {
        result.current.updateCampaign(campaignId, { name: 'Updated' });
      });

      const campaign = result.current.getCampaign(campaignId);
      expect(campaign?.name).toBe('Updated');
    });

    it('should return false for non-existent campaign', () => {
      const { result } = renderHook(() => useCampaignStore());

      let success = true;
      act(() => {
        success = result.current.updateCampaign('nonexistent', { name: 'Test' });
      });

      expect(success).toBe(false);
    });
  });

  describe('deleteCampaign', () => {
    it('should remove campaign', () => {
      const { result } = renderHook(() => useCampaignStore());

      let campaignId = '';
      act(() => {
        campaignId = result.current.createCampaign({
          name: 'Test',
          unitIds: [],
          pilotIds: [],
        });
      });

      act(() => {
        result.current.deleteCampaign(campaignId);
      });

      expect(result.current.getCampaign(campaignId)).toBeUndefined();
    });

    it('should clear selection if deleted campaign was selected', () => {
      const { result } = renderHook(() => useCampaignStore());

      let campaignId = '';
      act(() => {
        campaignId = result.current.createCampaign({
          name: 'Test',
          unitIds: [],
          pilotIds: [],
        });
        result.current.selectCampaign(campaignId);
      });

      expect(result.current.selectedCampaignId).toBe(campaignId);

      act(() => {
        result.current.deleteCampaign(campaignId);
      });

      expect(result.current.selectedCampaignId).toBeNull();
    });
  });

  // ===========================================================================
  // Selection
  // ===========================================================================

  describe('selectCampaign', () => {
    it('should set selected campaign ID', () => {
      const { result } = renderHook(() => useCampaignStore());

      let campaignId = '';
      act(() => {
        campaignId = result.current.createCampaign({
          name: 'Test',
          unitIds: [],
          pilotIds: [],
        });
        result.current.selectCampaign(campaignId);
      });

      expect(result.current.selectedCampaignId).toBe(campaignId);
    });

    it('should allow clearing selection with null', () => {
      const { result } = renderHook(() => useCampaignStore());

      act(() => {
        result.current.selectCampaign(null);
      });

      expect(result.current.selectedCampaignId).toBeNull();
    });
  });

  describe('getSelectedCampaign', () => {
    it('should return selected campaign', () => {
      const { result } = renderHook(() => useCampaignStore());

      let campaignId = '';
      act(() => {
        campaignId = result.current.createCampaign({
          name: 'Test',
          unitIds: [],
          pilotIds: [],
        });
        result.current.selectCampaign(campaignId);
      });

      const selected = result.current.getSelectedCampaign();
      expect(selected?.id).toBe(campaignId);
    });

    it('should return null if nothing selected', () => {
      const { result } = renderHook(() => useCampaignStore());
      expect(result.current.getSelectedCampaign()).toBeNull();
    });
  });

  // ===========================================================================
  // Mission Management
  // ===========================================================================

  describe('addMission', () => {
    it('should add mission to campaign', () => {
      const { result } = renderHook(() => useCampaignStore());

      let campaignId = '';
      act(() => {
        campaignId = result.current.createCampaign({
          name: 'Test',
          unitIds: [],
          pilotIds: [],
        });
      });

      let missionId: string | null = null;
      act(() => {
        missionId = result.current.addMission(campaignId, {
          name: 'Mission 1',
          description: 'First mission',
          order: 1,
        });
      });

      expect(missionId).toBeTruthy();
      const campaign = result.current.getCampaign(campaignId);
      expect(campaign?.missions).toHaveLength(1);
      expect(campaign?.missions[0].name).toBe('Mission 1');
    });

    it('should set first mission as available', () => {
      const { result } = renderHook(() => useCampaignStore());

      let campaignId = '';
      act(() => {
        campaignId = result.current.createCampaign({
          name: 'Test',
          unitIds: [],
          pilotIds: [],
        });
      });

      act(() => {
        result.current.addMission(campaignId, {
          name: 'Mission 1',
          description: 'First mission',
          order: 1,
        });
      });

      const campaign = result.current.getCampaign(campaignId);
      expect(campaign?.missions[0].status).toBe(CampaignMissionStatus.Available);
    });

    it('should set subsequent missions with prerequisites as locked', () => {
      const { result } = renderHook(() => useCampaignStore());

      let campaignId = '';
      let mission1Id: string | null = null;
      act(() => {
        campaignId = result.current.createCampaign({
          name: 'Test',
          unitIds: [],
          pilotIds: [],
        });
        mission1Id = result.current.addMission(campaignId, {
          name: 'Mission 1',
          description: 'First',
          order: 1,
        });
      });

      act(() => {
        result.current.addMission(campaignId, {
          name: 'Mission 2',
          description: 'Second',
          order: 2,
          prerequisites: [mission1Id!],
        });
      });

      const campaign = result.current.getCampaign(campaignId);
      expect(campaign?.missions[1].status).toBe(CampaignMissionStatus.Locked);
    });
  });

  describe('startMission', () => {
    it('should set mission as in progress', () => {
      const { result } = renderHook(() => useCampaignStore());

      let campaignId = '';
      let missionId: string | null = null;
      act(() => {
        campaignId = result.current.createCampaign({
          name: 'Test',
          unitIds: ['u1'],
          pilotIds: ['p1'],
        });
        missionId = result.current.addMission(campaignId, {
          name: 'Mission 1',
          description: 'Test',
          order: 1,
        });
      });

      act(() => {
        result.current.startMission(campaignId, missionId!);
      });

      const campaign = result.current.getCampaign(campaignId);
      const mission = campaign?.missions.find((m) => m.id === missionId);
      expect(mission?.status).toBe(CampaignMissionStatus.InProgress);
      expect(campaign?.progress.currentMissionId).toBe(missionId);
    });

    it('should take roster snapshot', () => {
      const { result } = renderHook(() => useCampaignStore());

      let campaignId = '';
      let missionId: string | null = null;
      act(() => {
        campaignId = result.current.createCampaign({
          name: 'Test',
          unitIds: ['u1'],
          pilotIds: ['p1'],
        });
        missionId = result.current.addMission(campaignId, {
          name: 'Mission 1',
          description: 'Test',
          order: 1,
        });
      });

      act(() => {
        result.current.startMission(campaignId, missionId!);
      });

      const campaign = result.current.getCampaign(campaignId);
      const mission = campaign?.missions.find((m) => m.id === missionId);
      expect(mission?.rosterSnapshot).toBeDefined();
      expect(mission?.rosterSnapshot?.units).toHaveLength(1);
    });

    it('should set campaign to active if in setup', () => {
      const { result } = renderHook(() => useCampaignStore());

      let campaignId = '';
      let missionId: string | null = null;
      act(() => {
        campaignId = result.current.createCampaign({
          name: 'Test',
          unitIds: ['u1'],
          pilotIds: ['p1'],
        });
        missionId = result.current.addMission(campaignId, {
          name: 'Mission 1',
          description: 'Test',
          order: 1,
        });
      });

      expect(result.current.getCampaign(campaignId)?.status).toBe(CampaignStatus.Setup);

      act(() => {
        result.current.startMission(campaignId, missionId!);
      });

      expect(result.current.getCampaign(campaignId)?.status).toBe(CampaignStatus.Active);
    });

    it('should fail for locked mission', () => {
      const { result } = renderHook(() => useCampaignStore());

      let campaignId = '';
      let mission1Id: string | null = null;
      let mission2Id: string | null = null;
      act(() => {
        campaignId = result.current.createCampaign({
          name: 'Test',
          unitIds: ['u1'],
          pilotIds: ['p1'],
        });
        mission1Id = result.current.addMission(campaignId, {
          name: 'Mission 1',
          description: 'First',
          order: 1,
        });
        mission2Id = result.current.addMission(campaignId, {
          name: 'Mission 2',
          description: 'Second',
          order: 2,
          prerequisites: [mission1Id!],
        });
      });

      let success = true;
      act(() => {
        success = result.current.startMission(campaignId, mission2Id!);
      });

      expect(success).toBe(false);
    });
  });

  describe('recordMissionOutcome', () => {
    it('should record victory and update state', () => {
      const { result } = renderHook(() => useCampaignStore());

      let campaignId = '';
      let missionId: string | null = null;
      act(() => {
        campaignId = result.current.createCampaign({
          name: 'Test',
          unitIds: ['u1'],
          pilotIds: ['p1'],
        });
        missionId = result.current.addMission(campaignId, {
          name: 'Mission 1',
          description: 'Test',
          order: 1,
        });
        result.current.startMission(campaignId, missionId!);
      });

      act(() => {
        result.current.recordMissionOutcome(campaignId, {
          missionId: missionId!,
          outcome: {
            result: 'victory',
            enemyUnitsDestroyed: 2,
            enemyBVDestroyed: 3000,
            playerUnitsDestroyed: 0,
            playerBVLost: 0,
            salvage: ['Hunchback'],
            cBillsReward: 100000,
            turnsPlayed: 10,
          },
          unitUpdates: [],
          pilotUpdates: [],
        });
      });

      const campaign = result.current.getCampaign(campaignId);
      const mission = campaign?.missions.find((m) => m.id === missionId);
      expect(mission?.status).toBe(CampaignMissionStatus.Victory);
      expect(mission?.outcome?.result).toBe('victory');
      expect(campaign?.progress.victories).toBe(1);
      expect(campaign?.progress.missionsCompleted).toBe(1);
    });

    it('should award XP to pilots', () => {
      const { result } = renderHook(() => useCampaignStore());

      let campaignId = '';
      let missionId: string | null = null;
      act(() => {
        campaignId = result.current.createCampaign({
          name: 'Test',
          unitIds: ['u1'],
          pilotIds: ['p1'],
        });
        missionId = result.current.addMission(campaignId, {
          name: 'Mission 1',
          description: 'Test',
          order: 1,
        });
        result.current.startMission(campaignId, missionId!);
      });

      const pilotXpBefore = result.current.getCampaign(campaignId)?.roster.pilots[0].xp ?? 0;

      act(() => {
        result.current.recordMissionOutcome(campaignId, {
          missionId: missionId!,
          outcome: {
            result: 'victory',
            enemyUnitsDestroyed: 1,
            enemyBVDestroyed: 1500,
            playerUnitsDestroyed: 0,
            playerBVLost: 0,
            salvage: [],
            cBillsReward: 50000,
            turnsPlayed: 8,
          },
          unitUpdates: [],
          pilotUpdates: [],
        });
      });

      const pilotXpAfter = result.current.getCampaign(campaignId)?.roster.pilots[0].xp ?? 0;
      expect(pilotXpAfter).toBeGreaterThan(pilotXpBefore);
    });

    it('should end campaign on final mission victory', () => {
      const { result } = renderHook(() => useCampaignStore());

      let campaignId = '';
      let missionId: string | null = null;
      act(() => {
        campaignId = result.current.createCampaign({
          name: 'Test',
          unitIds: ['u1'],
          pilotIds: ['p1'],
        });
        missionId = result.current.addMission(campaignId, {
          name: 'Final Mission',
          description: 'The end',
          order: 1,
          isFinal: true,
        });
        result.current.startMission(campaignId, missionId!);
      });

      act(() => {
        result.current.recordMissionOutcome(campaignId, {
          missionId: missionId!,
          outcome: {
            result: 'victory',
            enemyUnitsDestroyed: 1,
            enemyBVDestroyed: 1500,
            playerUnitsDestroyed: 0,
            playerBVLost: 0,
            salvage: [],
            cBillsReward: 100000,
            turnsPlayed: 12,
          },
          unitUpdates: [],
          pilotUpdates: [],
        });
      });

      expect(result.current.getCampaign(campaignId)?.status).toBe(CampaignStatus.Victory);
    });
  });

  // ===========================================================================
  // Roster Management
  // ===========================================================================

  describe('addUnitToRoster', () => {
    it('should add unit to roster', () => {
      const { result } = renderHook(() => useCampaignStore());

      let campaignId = '';
      act(() => {
        campaignId = result.current.createCampaign({
          name: 'Test',
          unitIds: [],
          pilotIds: [],
        });
      });

      act(() => {
        result.current.addUnitToRoster(campaignId, {
          unitId: 'new-unit',
          unitName: 'New Mech',
          status: CampaignUnitStatus.Operational,
          armorDamage: {},
          structureDamage: {},
          destroyedComponents: [],
          ammoExpended: {},
          currentHeat: 0,
          repairCost: 0,
          repairTime: 0,
        });
      });

      const campaign = result.current.getCampaign(campaignId);
      expect(campaign?.roster.units).toHaveLength(1);
      expect(campaign?.roster.units[0].unitId).toBe('new-unit');
    });

    it('should reject duplicate unit', () => {
      const { result } = renderHook(() => useCampaignStore());

      let campaignId = '';
      act(() => {
        campaignId = result.current.createCampaign({
          name: 'Test',
          unitIds: ['existing'],
          pilotIds: [],
        });
      });

      let success = true;
      act(() => {
        success = result.current.addUnitToRoster(campaignId, {
          unitId: 'existing',
          unitName: 'Duplicate',
          status: CampaignUnitStatus.Operational,
          armorDamage: {},
          structureDamage: {},
          destroyedComponents: [],
          ammoExpended: {},
          currentHeat: 0,
          repairCost: 0,
          repairTime: 0,
        });
      });

      expect(success).toBe(false);
    });
  });

  describe('updateUnitState', () => {
    it('should update unit state', () => {
      const { result } = renderHook(() => useCampaignStore());

      let campaignId = '';
      act(() => {
        campaignId = result.current.createCampaign({
          name: 'Test',
          unitIds: ['u1'],
          pilotIds: [],
        });
      });

      act(() => {
        result.current.updateUnitState(campaignId, 'u1', {
          status: CampaignUnitStatus.Damaged,
          armorDamage: { 'Center Torso': 10 },
        });
      });

      const campaign = result.current.getCampaign(campaignId);
      expect(campaign?.roster.units[0].status).toBe(CampaignUnitStatus.Damaged);
      expect(campaign?.roster.units[0].armorDamage['Center Torso']).toBe(10);
    });
  });

  describe('awardXp', () => {
    it('should add XP to pilot', () => {
      const { result } = renderHook(() => useCampaignStore());

      let campaignId = '';
      act(() => {
        campaignId = result.current.createCampaign({
          name: 'Test',
          unitIds: [],
          pilotIds: ['p1'],
        });
      });

      const xpBefore = result.current.getCampaign(campaignId)?.roster.pilots[0].xp ?? 0;

      act(() => {
        result.current.awardXp(campaignId, 'p1', 5);
      });

      const xpAfter = result.current.getCampaign(campaignId)?.roster.pilots[0].xp ?? 0;
      expect(xpAfter).toBe(xpBefore + 5);
    });
  });

  // ===========================================================================
  // Filtering
  // ===========================================================================

  describe('getFilteredCampaigns', () => {
    it('should filter by status', () => {
      const { result } = renderHook(() => useCampaignStore());

      act(() => {
        const id1 = result.current.createCampaign({ name: 'Active', unitIds: [], pilotIds: [] });
        const id2 = result.current.createCampaign({ name: 'Victory', unitIds: [], pilotIds: [] });
        result.current.setCampaignStatus(id1, CampaignStatus.Active);
        result.current.setCampaignStatus(id2, CampaignStatus.Victory);
      });

      act(() => {
        result.current.setStatusFilter(CampaignStatus.Active);
      });

      const filtered = result.current.getFilteredCampaigns();
      expect(filtered.every((c) => c.status === CampaignStatus.Active)).toBe(true);
    });

    it('should filter by search query', () => {
      const { result } = renderHook(() => useCampaignStore());

      act(() => {
        result.current.createCampaign({ name: 'Alpha Campaign', unitIds: [], pilotIds: [] });
        result.current.createCampaign({ name: 'Beta Campaign', unitIds: [], pilotIds: [] });
        result.current.setSearchQuery('alpha');
      });

      const filtered = result.current.getFilteredCampaigns();
      expect(filtered).toHaveLength(1);
      expect(filtered[0].name).toBe('Alpha Campaign');
    });
  });

  // ===========================================================================
  // Validation
  // ===========================================================================

  describe('validateCampaign', () => {
    it('should return validation result', () => {
      const { result } = renderHook(() => useCampaignStore());

      let campaignId = '';
      act(() => {
        campaignId = result.current.createCampaign({
          name: 'Test',
          unitIds: ['u1'],
          pilotIds: ['p1'],
        });
        result.current.addMission(campaignId, {
          name: 'Mission',
          description: 'Test',
          order: 1,
          isFinal: true,
        });
      });

      let validation: ReturnType<typeof result.current.validateCampaign> = { valid: false, errors: [], warnings: [] };
      act(() => {
        validation = result.current.validateCampaign(campaignId);
      });

      expect(validation.valid).toBe(true);
    });

    it('should return error for non-existent campaign', () => {
      const { result } = renderHook(() => useCampaignStore());

      let validation: ReturnType<typeof result.current.validateCampaign> = { valid: true, errors: [], warnings: [] };
      act(() => {
        validation = result.current.validateCampaign('nonexistent');
      });

      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('Campaign not found: nonexistent');
    });
  });
});
