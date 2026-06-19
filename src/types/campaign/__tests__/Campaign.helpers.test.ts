/**
 * Campaign.test.ts - Comprehensive tests for Campaign aggregate
 *
 * Tests cover:
 * - ICampaign interface structure
 * - ICampaignOptions interface structure
 * - IMission interface structure
 * - Helper functions (personnel, forces, units, balance, missions)
 * - Type guards (isCampaign, isCampaignOptions, isMission)
 * - Factory functions (createCampaign, createMission, createDefaultCampaignOptions)
 * - Integration tests (campaign with personnel + forces + finances)
 */

import { MedicalSystem } from '@/lib/campaign/medical/medicalTypes';
import { useCampaignRosterStore } from '@/stores/campaign/useCampaignRosterStore';

import {
  ICampaign,
  IMission,
  getTotalPersonnel,
  getTotalForces,
  getAllUnits,
  getBalance,
  getTotalMissions,
  getMissionsByStatus,
  getActiveMissions,
  getForceById,
  getMissionById,
  getRootForce,
  isMission,
  isCampaignOptions,
  isCampaign,
  createDefaultCampaignOptions,
  createMission,
  createCampaign,
  createCampaignWithData,
} from '../Campaign';
import { CampaignType } from '../CampaignType';
import { MissionStatus, ForceRole, FormationLevel } from '../enums';
import { IForce } from '../Force';
import { IFinances } from '../IFinances';
import { Money } from '../Money';

// =============================================================================
// Test Fixtures
// =============================================================================

function createTestForce(
  id: string,
  name: string,
  parentForceId?: string,
  subForceIds: string[] = [],
  unitIds: string[] = [],
): IForce {
  return {
    id,
    name,
    parentForceId,
    subForceIds,
    unitIds,
    forceType: ForceRole.STANDARD,
    formationLevel: FormationLevel.LANCE,
    createdAt: '2026-01-26T10:00:00Z',
    updatedAt: '2026-01-26T10:00:00Z',
  };
}

function createTestMission(
  id: string,
  name: string,
  status: MissionStatus = MissionStatus.PENDING,
): IMission {
  return {
    id,
    name,
    status,
    type: 'mission',
    systemId: 'Unknown System',
    scenarioIds: [],
    createdAt: '2026-01-26T10:00:00Z',
    updatedAt: '2026-01-26T10:00:00Z',
  };
}

function createTestCampaign(): ICampaign {
  const forces = new Map<string, IForce>();
  forces.set(
    'force-root',
    createTestForce(
      'force-root',
      'Root Force',
      undefined,
      ['force-1', 'force-2'],
      [],
    ),
  );
  forces.set(
    'force-1',
    createTestForce(
      'force-1',
      'Alpha Lance',
      'force-root',
      [],
      ['unit-1', 'unit-2'],
    ),
  );
  forces.set(
    'force-2',
    createTestForce(
      'force-2',
      'Beta Lance',
      'force-root',
      [],
      ['unit-3', 'unit-4'],
    ),
  );

  const missions = new Map<string, IMission>();
  missions.set(
    'mission-1',
    createTestMission('mission-1', 'Raid Mission', MissionStatus.ACTIVE),
  );
  missions.set(
    'mission-2',
    createTestMission('mission-2', 'Defense Mission', MissionStatus.PENDING),
  );
  missions.set(
    'mission-3',
    createTestMission('mission-3', 'Completed Mission', MissionStatus.SUCCESS),
  );

  const finances: IFinances = {
    transactions: [],
    balance: new Money(1000000),
  };

  return {
    id: 'campaign-001',
    name: "Wolf's Dragoons",
    currentDate: new Date('3025-01-01'),
    factionId: 'mercenary',
    forces,
    rootForceId: 'force-root',
    missions,
    finances,
    factionStandings: {},
    shoppingList: { items: [] },
    options: createDefaultCampaignOptions(),
    campaignType: CampaignType.MERCENARY,
    campaignStartDate: new Date('3025-01-01'),
    createdAt: '2026-01-26T10:00:00Z',
    updatedAt: '2026-01-26T10:00:00Z',
    // Per canonicalize-unit-combat-state PR-A: required ICampaign field.
    unitCombatStates: {},
  };
}

// =============================================================================
// ICampaign Interface Tests
// =============================================================================

describe('Helper Functions', () => {
  describe('getTotalPersonnel', () => {
    it('should return the pilots count passed in (per PR4 of wire-iperson-hard-cutover)', () => {
      const campaign = createTestCampaign();
      // Per PR4: getTotalPersonnel takes the live roster pilot count as
      // its second argument (decoupled from the deleted personnel Map).
      expect(getTotalPersonnel(campaign, 4)).toBe(4);
    });

    it('should return 0 when pilots count is 0', () => {
      const campaign = createCampaign('Empty', 'mercenary');
      expect(getTotalPersonnel(campaign, 0)).toBe(0);
    });
  });

  describe('getTotalForces', () => {
    it('should return total force count', () => {
      const campaign = createTestCampaign();
      expect(getTotalForces(campaign)).toBe(3);
    });

    it('should return 0 for empty campaign', () => {
      const campaign = createCampaign('Empty', 'mercenary');
      expect(getTotalForces(campaign)).toBe(0);
    });
  });

  describe('getAllUnits', () => {
    it('should collect all unit IDs from force tree', () => {
      const campaign = createTestCampaign();
      const units = getAllUnits(campaign);

      expect(units).toHaveLength(4);
      expect(units).toContain('unit-1');
      expect(units).toContain('unit-2');
      expect(units).toContain('unit-3');
      expect(units).toContain('unit-4');
    });

    it('should return empty array when root force not found', () => {
      const campaign = createCampaignWithData({
        id: 'campaign-1',
        name: 'Test',
        currentDate: new Date(),
        factionId: 'mercenary',
        forces: new Map(),
        rootForceId: 'non-existent',
        missions: new Map(),
        finances: { transactions: [], balance: Money.ZERO },
        options: createDefaultCampaignOptions(),
      });

      expect(getAllUnits(campaign)).toHaveLength(0);
    });

    it('should not include duplicate unit IDs', () => {
      const forces = new Map<string, IForce>();
      forces.set(
        'force-root',
        createTestForce(
          'force-root',
          'Root',
          undefined,
          ['force-1'],
          ['unit-1'],
        ),
      );
      forces.set(
        'force-1',
        createTestForce(
          'force-1',
          'Child',
          'force-root',
          [],
          ['unit-1', 'unit-2'],
        ),
      );

      const campaign = createCampaignWithData({
        id: 'campaign-1',
        name: 'Test',
        currentDate: new Date(),
        factionId: 'mercenary',
        forces,
        rootForceId: 'force-root',
        missions: new Map(),
        finances: { transactions: [], balance: Money.ZERO },
        options: createDefaultCampaignOptions(),
      });

      const units = getAllUnits(campaign);
      expect(units).toHaveLength(2);
    });
  });

  describe('getBalance', () => {
    it('should return current balance', () => {
      const campaign = createTestCampaign();
      const balance = getBalance(campaign);

      expect(balance.amount).toBe(1000000);
    });

    it('should return zero for new campaign', () => {
      const campaign = createCampaign('New', 'mercenary');
      const balance = getBalance(campaign);

      expect(balance.amount).toBe(0);
    });
  });

  describe('getTotalMissions', () => {
    it('should return total mission count', () => {
      const campaign = createTestCampaign();
      expect(getTotalMissions(campaign)).toBe(3);
    });

    it('should return 0 for empty campaign', () => {
      const campaign = createCampaign('Empty', 'mercenary');
      expect(getTotalMissions(campaign)).toBe(0);
    });
  });

  describe('getMissionsByStatus', () => {
    it('should filter by status', () => {
      const campaign = createTestCampaign();

      const active = getMissionsByStatus(campaign, MissionStatus.ACTIVE);
      expect(active).toHaveLength(1);
      expect(active[0].name).toBe('Raid Mission');

      const pending = getMissionsByStatus(campaign, MissionStatus.PENDING);
      expect(pending).toHaveLength(1);
      expect(pending[0].name).toBe('Defense Mission');
    });
  });

  describe('getActiveMissions', () => {
    it('should return only active missions', () => {
      const campaign = createTestCampaign();
      const active = getActiveMissions(campaign);

      expect(active).toHaveLength(1);
      expect(active[0].status).toBe(MissionStatus.ACTIVE);
    });
  });

  describe('getForceById', () => {
    it('should return force by ID', () => {
      const campaign = createTestCampaign();
      const force = getForceById(campaign, 'force-1');

      expect(force).toBeDefined();
      expect(force?.name).toBe('Alpha Lance');
    });

    it('should return undefined for non-existent ID', () => {
      const campaign = createTestCampaign();
      const force = getForceById(campaign, 'non-existent');

      expect(force).toBeUndefined();
    });
  });

  describe('getMissionById', () => {
    it('should return mission by ID', () => {
      const campaign = createTestCampaign();
      const mission = getMissionById(campaign, 'mission-1');

      expect(mission).toBeDefined();
      expect(mission?.name).toBe('Raid Mission');
    });

    it('should return undefined for non-existent ID', () => {
      const campaign = createTestCampaign();
      const mission = getMissionById(campaign, 'non-existent');

      expect(mission).toBeUndefined();
    });
  });

  describe('getRootForce', () => {
    it('should return root force', () => {
      const campaign = createTestCampaign();
      const rootForce = getRootForce(campaign);

      expect(rootForce).toBeDefined();
      expect(rootForce?.name).toBe('Root Force');
    });

    it('should return undefined when root force not found', () => {
      const campaign = createCampaignWithData({
        id: 'campaign-1',
        name: 'Test',
        currentDate: new Date(),
        factionId: 'mercenary',
        forces: new Map(),
        rootForceId: 'non-existent',
        missions: new Map(),
        finances: { transactions: [], balance: Money.ZERO },
        options: createDefaultCampaignOptions(),
      });

      expect(getRootForce(campaign)).toBeUndefined();
    });
  });
});
