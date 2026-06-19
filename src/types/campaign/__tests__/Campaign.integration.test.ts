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

describe('Integration Tests', () => {
  describe('campaign with personnel + forces + finances', () => {
    it('should correctly aggregate all entities', () => {
      const campaign = createTestCampaign();

      // Personnel — getTotalPersonnel(campaign, count) takes a roster pilot count
      // explicitly per PR4 of `wire-iperson-hard-cutover` (campaign.personnel deleted).
      expect(getTotalPersonnel(campaign, 4)).toBe(4);

      // Forces
      expect(getTotalForces(campaign)).toBe(3);
      expect(getAllUnits(campaign)).toHaveLength(4);

      // Missions
      expect(getTotalMissions(campaign)).toBe(3);
      expect(getActiveMissions(campaign)).toHaveLength(1);

      // Finances
      expect(getBalance(campaign).amount).toBe(1000000);
    });

    it('should support complex force hierarchies', () => {
      const forces = new Map<string, IForce>();
      forces.set(
        'battalion',
        createTestForce(
          'battalion',
          'Battalion',
          undefined,
          ['company-1', 'company-2'],
          [],
        ),
      );
      forces.set(
        'company-1',
        createTestForce(
          'company-1',
          'Company 1',
          'battalion',
          ['lance-1', 'lance-2'],
          [],
        ),
      );
      forces.set(
        'company-2',
        createTestForce('company-2', 'Company 2', 'battalion', ['lance-3'], []),
      );
      forces.set(
        'lance-1',
        createTestForce(
          'lance-1',
          'Lance 1',
          'company-1',
          [],
          ['unit-1', 'unit-2', 'unit-3', 'unit-4'],
        ),
      );
      forces.set(
        'lance-2',
        createTestForce(
          'lance-2',
          'Lance 2',
          'company-1',
          [],
          ['unit-5', 'unit-6', 'unit-7', 'unit-8'],
        ),
      );
      forces.set(
        'lance-3',
        createTestForce(
          'lance-3',
          'Lance 3',
          'company-2',
          [],
          ['unit-9', 'unit-10', 'unit-11', 'unit-12'],
        ),
      );

      const campaign = createCampaignWithData({
        id: 'campaign-1',
        name: 'Test',
        currentDate: new Date(),
        factionId: 'mercenary',
        forces,
        rootForceId: 'battalion',
        missions: new Map(),
        finances: { transactions: [], balance: Money.ZERO },
        options: createDefaultCampaignOptions(),
      });

      expect(getTotalForces(campaign)).toBe(6);
      expect(getAllUnits(campaign)).toHaveLength(12);
    });

    it('should handle empty campaign', () => {
      const campaign = createCampaign('Empty', 'mercenary');

      expect(getTotalPersonnel(campaign, 0)).toBe(0);
      expect(getTotalForces(campaign)).toBe(0);
      expect(getAllUnits(campaign)).toHaveLength(0);
      expect(getTotalMissions(campaign)).toBe(0);
      expect(getBalance(campaign).amount).toBe(0);
    });

    it('should support large personnel counts', () => {
      const campaign = createCampaignWithData({
        id: 'campaign-1',
        name: 'Large Campaign',
        currentDate: new Date(),
        factionId: 'mercenary',
        forces: new Map(),
        rootForceId: 'force-root',
        missions: new Map(),
        finances: { transactions: [], balance: Money.ZERO },
        options: createDefaultCampaignOptions(),
      });

      // Per PR4: getTotalPersonnel takes the live pilot count explicitly.
      expect(getTotalPersonnel(campaign, 100)).toBe(100);
    });

    it('should correctly calculate balance with starting funds', () => {
      const campaign = createCampaign('Funded', 'mercenary', {
        startingFunds: 25000000,
      });

      expect(getBalance(campaign).amount).toBe(25000000);
      expect(getBalance(campaign).format()).toBe('25,000,000.00 C-bills');
    });
  });
});
