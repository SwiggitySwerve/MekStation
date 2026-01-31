/**
 * Campaign Store Tests
 *
 * Comprehensive test suite for useCampaignStore with campaign management,
 * sub-store composition, persistence, and day advancement coverage.
 */

import {
  createCampaignStore,
  useCampaignStore,
  resetCampaignStore,
} from '../useCampaignStore';
import { ICampaignOptions } from '@/types/campaign/Campaign';
import { IPerson, createDefaultAttributes } from '@/types/campaign/Person';
import { IForce } from '@/types/campaign/Force';
import { IMission } from '@/types/campaign/Campaign';
import {
  PersonnelStatus,
  CampaignPersonnelRole,
  ForceType,
  FormationLevel,
  MissionStatus,
} from '@/types/campaign/enums';

// =============================================================================
// Test Data Helpers
// =============================================================================

let personIdCounter = 0;
let forceIdCounter = 0;
let missionIdCounter = 0;

const createTestPerson = (overrides?: Partial<IPerson>): IPerson => {
  const id = `person-${Date.now()}-${personIdCounter++}`;
  const now = new Date().toISOString();

  return {
    id,
    name: 'Test Person',
    createdAt: now,
    updatedAt: now,
    status: PersonnelStatus.ACTIVE,
    primaryRole: CampaignPersonnelRole.PILOT,
    rank: 'MechWarrior',
    recruitmentDate: new Date(),
    missionsCompleted: 0,
    totalKills: 0,
    xp: 0,
    totalXpEarned: 0,
    xpSpent: 0,
    hits: 0,
    injuries: [],
    daysToWaitForHealing: 0,
    skills: {},
    attributes: createDefaultAttributes(),
    pilotSkills: { gunnery: 4, piloting: 5 },
    ...overrides,
  };
};

const createTestForce = (overrides?: Partial<IForce>): IForce => {
  const id = `force-${Date.now()}-${forceIdCounter++}`;
  const now = new Date().toISOString();

  return {
    id,
    name: 'Test Force',
    parentForceId: undefined,
    subForceIds: [],
    unitIds: [],
    forceType: ForceType.STANDARD,
    formationLevel: FormationLevel.LANCE,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
};

const createTestMission = (overrides?: Partial<IMission>): IMission => {
  const id = `mission-${Date.now()}-${missionIdCounter++}`;
  const now = new Date().toISOString();

  return {
    id,
    name: 'Test Mission',
    status: MissionStatus.PENDING,
    type: 'mission',
    systemId: 'Unknown System',
    scenarioIds: [],
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
};

// =============================================================================
// Mock localStorage for persistence tests
// =============================================================================

const localStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
    getStore: () => store,
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

// =============================================================================
// Tests
// =============================================================================

describe('useCampaignStore', () => {
  let store: ReturnType<typeof createCampaignStore>;

  beforeEach(() => {
    personIdCounter = 0;
    forceIdCounter = 0;
    missionIdCounter = 0;
    localStorageMock.clear();
    resetCampaignStore();
    store = createCampaignStore();
  });

  // ===========================================================================
  // Store Creation
  // ===========================================================================

  describe('Store Creation', () => {
    it('should create store with factory function', () => {
      const testStore = createCampaignStore();
      expect(testStore).toBeDefined();
      expect(testStore.getState).toBeDefined();
    });

    it('should initialize with null campaign', () => {
      const state = store.getState();
      expect(state.campaign).toBeNull();
    });

    it('should initialize with null sub-stores', () => {
      const state = store.getState();
      expect(state.personnelStore).toBeNull();
      expect(state.forcesStore).toBeNull();
      expect(state.missionsStore).toBeNull();
    });

    it('should have all expected methods', () => {
      const state = store.getState();
      expect(typeof state.createCampaign).toBe('function');
      expect(typeof state.loadCampaign).toBe('function');
      expect(typeof state.saveCampaign).toBe('function');
      expect(typeof state.advanceDay).toBe('function');
      expect(typeof state.getCampaign).toBe('function');
      expect(typeof state.updateCampaign).toBe('function');
      expect(typeof state.getPersonnelStore).toBe('function');
      expect(typeof state.getForcesStore).toBe('function');
      expect(typeof state.getMissionsStore).toBe('function');
    });

    it('should provide singleton via useCampaignStore', () => {
      const store1 = useCampaignStore();
      const store2 = useCampaignStore();
      expect(store1).toBe(store2);
    });
  });

  // ===========================================================================
  // createCampaign
  // ===========================================================================

  describe('createCampaign', () => {
    it('should create campaign with name and factionId', () => {
      const campaignId = store.getState().createCampaign("Wolf's Dragoons", 'mercenary');

      expect(campaignId).toBeDefined();
      expect(campaignId).toMatch(/^campaign-\d+-[a-z0-9]+$/);

      const campaign = store.getState().getCampaign();
      expect(campaign).not.toBeNull();
      expect(campaign?.name).toBe("Wolf's Dragoons");
      expect(campaign?.factionId).toBe('mercenary');
    });

    it('should create campaign with default options', () => {
      store.getState().createCampaign('Test Campaign', 'davion');

      const campaign = store.getState().getCampaign();
      expect(campaign?.options).toBeDefined();
      expect(campaign?.options.salaryMultiplier).toBe(1.0);
      expect(campaign?.options.healingRateMultiplier).toBe(1.0);
      expect(campaign?.options.maxUnitsPerLance).toBe(4);
    });

    it('should create campaign with custom options', () => {
      store.getState().createCampaign('Custom Campaign', 'steiner', {
        salaryMultiplier: 1.5,
        startingFunds: 10000000,
        useAutoResolve: true,
      });

      const campaign = store.getState().getCampaign();
      expect(campaign?.options.salaryMultiplier).toBe(1.5);
      expect(campaign?.options.startingFunds).toBe(10000000);
      expect(campaign?.options.useAutoResolve).toBe(true);
      // Default values preserved
      expect(campaign?.options.healingRateMultiplier).toBe(1.0);
    });

    it('should create root force', () => {
      store.getState().createCampaign('Test Campaign', 'mercenary');

      const campaign = store.getState().getCampaign();
      expect(campaign?.rootForceId).toBeDefined();
      expect(campaign?.forces.size).toBe(1);

      const rootForce = campaign?.forces.get(campaign.rootForceId);
      expect(rootForce).toBeDefined();
      expect(rootForce?.name).toBe('Test Campaign');
      expect(rootForce?.parentForceId).toBeUndefined();
      expect(rootForce?.formationLevel).toBe(FormationLevel.REGIMENT);
    });

    it('should initialize sub-stores', () => {
      store.getState().createCampaign('Test Campaign', 'mercenary');

      expect(store.getState().getPersonnelStore()).not.toBeNull();
      expect(store.getState().getForcesStore()).not.toBeNull();
      expect(store.getState().getMissionsStore()).not.toBeNull();
    });

    it('should set current date to now', () => {
      const before = new Date();
      store.getState().createCampaign('Test Campaign', 'mercenary');
      const after = new Date();

      const campaign = store.getState().getCampaign();
      expect(campaign?.currentDate).toBeInstanceOf(Date);
      expect(campaign?.currentDate.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(campaign?.currentDate.getTime()).toBeLessThanOrEqual(after.getTime());
    });

    it('should initialize empty finances', () => {
      store.getState().createCampaign('Test Campaign', 'mercenary');

      const campaign = store.getState().getCampaign();
      expect(campaign?.finances).toBeDefined();
      expect(campaign?.finances.transactions).toEqual([]);
      expect(campaign?.finances.balance.amount).toBe(0);
    });

    it('should set timestamps', () => {
      store.getState().createCampaign('Test Campaign', 'mercenary');

      const campaign = store.getState().getCampaign();
      expect(campaign?.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
      expect(campaign?.updatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });
  });

  // ===========================================================================
  // loadCampaign
  // ===========================================================================

  describe('loadCampaign', () => {
    it('should return false for non-existent campaign', () => {
      const result = store.getState().loadCampaign('non-existent-id');
      expect(result).toBe(false);
    });

    it('should load saved campaign', () => {
      // Create and save a campaign
      const campaignId = store.getState().createCampaign('Saved Campaign', 'mercenary');
      store.getState().saveCampaign();

      // Create new store and load
      const newStore = createCampaignStore();
      const result = newStore.getState().loadCampaign(campaignId);

      expect(result).toBe(true);
      const campaign = newStore.getState().getCampaign();
      expect(campaign?.name).toBe('Saved Campaign');
      expect(campaign?.factionId).toBe('mercenary');
    });

    it('should restore sub-stores on load', () => {
      // Create campaign and add data to sub-stores
      const campaignId = store.getState().createCampaign('Test Campaign', 'mercenary');
      
      const personnelStore = store.getState().getPersonnelStore();
      const person = createTestPerson({ name: 'Test Pilot' });
      personnelStore?.getState().addPerson(person);
      
      store.getState().saveCampaign();

      // Create new store and load
      const newStore = createCampaignStore();
      newStore.getState().loadCampaign(campaignId);

      expect(newStore.getState().getPersonnelStore()).not.toBeNull();
      expect(newStore.getState().getForcesStore()).not.toBeNull();
      expect(newStore.getState().getMissionsStore()).not.toBeNull();
    });

    it('should handle corrupted storage gracefully', () => {
      // Write corrupted data
      localStorageMock.setItem('campaign-corrupted', 'not valid json');

      const result = store.getState().loadCampaign('corrupted');
      expect(result).toBe(false);
    });

    it('should restore campaign date correctly', () => {
      const campaignId = store.getState().createCampaign('Test Campaign', 'mercenary');
      
      // Advance a few days
      store.getState().advanceDay();
      store.getState().advanceDay();
      store.getState().advanceDay();
      
      const originalDate = store.getState().getCampaign()?.currentDate;
      store.getState().saveCampaign();

      // Create new store and load
      const newStore = createCampaignStore();
      newStore.getState().loadCampaign(campaignId);

      const loadedDate = newStore.getState().getCampaign()?.currentDate;
      expect(loadedDate?.toISOString()).toBe(originalDate?.toISOString());
    });
  });

  // ===========================================================================
  // saveCampaign
  // ===========================================================================

  describe('saveCampaign', () => {
    it('should do nothing if no campaign', () => {
      // Should not throw
      expect(() => store.getState().saveCampaign()).not.toThrow();
    });

    it('should persist campaign to storage', () => {
      const campaignId = store.getState().createCampaign('Test Campaign', 'mercenary');
      store.getState().saveCampaign();

      const stored = localStorageMock.getItem(`campaign-${campaignId}`);
      expect(stored).toBeTruthy();
    });

    it('should update updatedAt timestamp', async () => {
      store.getState().createCampaign('Test Campaign', 'mercenary');
      const originalUpdatedAt = store.getState().getCampaign()?.updatedAt;

      await new Promise((resolve) => setTimeout(resolve, 10));
      store.getState().saveCampaign();

      const newUpdatedAt = store.getState().getCampaign()?.updatedAt;
      expect(newUpdatedAt).not.toBe(originalUpdatedAt);
    });

    it('should sync sub-store data to campaign', () => {
      store.getState().createCampaign('Test Campaign', 'mercenary');

      // Add personnel via sub-store
      const personnelStore = store.getState().getPersonnelStore();
      const person = createTestPerson({ name: 'Synced Person' });
      personnelStore?.getState().addPerson(person);

      store.getState().saveCampaign();

      const campaign = store.getState().getCampaign();
      expect(campaign?.personnel.size).toBe(1);
      expect(campaign?.personnel.get(person.id)?.name).toBe('Synced Person');
    });
  });

  // ===========================================================================
  // advanceDay
  // ===========================================================================

  describe('advanceDay', () => {
    it('should do nothing if no campaign', () => {
      // Should not throw
      expect(() => store.getState().advanceDay()).not.toThrow();
    });

    it('should increment date by 1 day', () => {
      store.getState().createCampaign('Test Campaign', 'mercenary');
      const originalDate = new Date(store.getState().getCampaign()!.currentDate);

      store.getState().advanceDay();

      const newDate = store.getState().getCampaign()?.currentDate;
      // Compare timestamps: exactly 1 day (86400000 ms) should have passed
      expect(newDate?.getTime()).toBe(originalDate.getTime() + 86400000);
    });

    it('should handle month rollover', () => {
      store.getState().createCampaign('Test Campaign', 'mercenary');
      
      // Set date to end of month - need to advance from creation date
      // Create a campaign with a specific date by advancing to Jan 31
      const campaign = store.getState().getCampaign()!;
      const jan31 = new Date('2025-01-31T12:00:00Z');
      
      // Directly update the campaign state
      store.setState({
        ...store.getState(),
        campaign: { ...campaign, currentDate: jan31 },
      });

      store.getState().advanceDay();

      const newDate = store.getState().getCampaign()?.currentDate;
      expect(newDate?.getMonth()).toBe(1); // February (0-indexed)
      expect(newDate?.getDate()).toBe(1);
    });

    it('should handle year rollover', () => {
      store.getState().createCampaign('Test Campaign', 'mercenary');
      
      // Set date to end of year
      const campaign = store.getState().getCampaign()!;
      const dec31 = new Date('2025-12-31T12:00:00Z');
      
      // Directly update the campaign state
      store.setState({
        ...store.getState(),
        campaign: { ...campaign, currentDate: dec31 },
      });

      store.getState().advanceDay();

      const newDate = store.getState().getCampaign()?.currentDate;
      expect(newDate?.getFullYear()).toBe(2026);
      expect(newDate?.getMonth()).toBe(0); // January
      expect(newDate?.getDate()).toBe(1);
    });

    it('should auto-save after advancement', () => {
      const campaignId = store.getState().createCampaign('Test Campaign', 'mercenary');
      
      // Clear storage to verify save happens
      localStorageMock.clear();

      store.getState().advanceDay();

      const stored = localStorageMock.getItem(`campaign-${campaignId}`);
      expect(stored).toBeTruthy();
    });

    it('should update updatedAt timestamp', async () => {
      store.getState().createCampaign('Test Campaign', 'mercenary');
      const originalUpdatedAt = store.getState().getCampaign()?.updatedAt;

      await new Promise((resolve) => setTimeout(resolve, 10));
      store.getState().advanceDay();

      const newUpdatedAt = store.getState().getCampaign()?.updatedAt;
      expect(newUpdatedAt).not.toBe(originalUpdatedAt);
    });

    it('should advance multiple days correctly', () => {
      store.getState().createCampaign('Test Campaign', 'mercenary');
      const originalDate = new Date(store.getState().getCampaign()!.currentDate);

      // Advance 10 days
      for (let i = 0; i < 10; i++) {
        store.getState().advanceDay();
      }

      const newDate = store.getState().getCampaign()?.currentDate;
      const expectedDate = new Date(originalDate);
      expectedDate.setDate(expectedDate.getDate() + 10);

      expect(newDate?.toDateString()).toBe(expectedDate.toDateString());
    });
  });

  // ===========================================================================
  // getCampaign
  // ===========================================================================

  describe('getCampaign', () => {
    it('should return null when no campaign', () => {
      expect(store.getState().getCampaign()).toBeNull();
    });

    it('should return campaign after creation', () => {
      store.getState().createCampaign('Test Campaign', 'mercenary');
      
      const campaign = store.getState().getCampaign();
      expect(campaign).not.toBeNull();
      expect(campaign?.name).toBe('Test Campaign');
    });
  });

  // ===========================================================================
  // updateCampaign
  // ===========================================================================

  describe('updateCampaign', () => {
    it('should do nothing if no campaign', () => {
      // Should not throw
      expect(() => store.getState().updateCampaign({ name: 'New Name' })).not.toThrow();
    });

    it('should update campaign name', () => {
      store.getState().createCampaign('Original Name', 'mercenary');
      store.getState().updateCampaign({ name: 'Updated Name' });

      expect(store.getState().getCampaign()?.name).toBe('Updated Name');
    });

    it('should update campaign description', () => {
      store.getState().createCampaign('Test Campaign', 'mercenary');
      store.getState().updateCampaign({ description: 'A test campaign' });

      expect(store.getState().getCampaign()?.description).toBe('A test campaign');
    });

    it('should update campaign options', () => {
      store.getState().createCampaign('Test Campaign', 'mercenary');
      
      const newOptions: ICampaignOptions = {
        ...store.getState().getCampaign()!.options,
        salaryMultiplier: 2.0,
      };
      store.getState().updateCampaign({ options: newOptions });

      expect(store.getState().getCampaign()?.options.salaryMultiplier).toBe(2.0);
    });

    it('should update updatedAt timestamp', async () => {
      store.getState().createCampaign('Test Campaign', 'mercenary');
      const originalUpdatedAt = store.getState().getCampaign()?.updatedAt;

      await new Promise((resolve) => setTimeout(resolve, 10));
      store.getState().updateCampaign({ name: 'New Name' });

      const newUpdatedAt = store.getState().getCampaign()?.updatedAt;
      expect(newUpdatedAt).not.toBe(originalUpdatedAt);
    });

    it('should preserve other fields on partial update', () => {
      store.getState().createCampaign('Test Campaign', 'mercenary');
      const originalFactionId = store.getState().getCampaign()?.factionId;

      store.getState().updateCampaign({ name: 'New Name' });

      expect(store.getState().getCampaign()?.factionId).toBe(originalFactionId);
    });
  });

  // ===========================================================================
  // Sub-Store Composition
  // ===========================================================================

  describe('Sub-Store Composition', () => {
    it('should provide personnel store after campaign creation', () => {
      store.getState().createCampaign('Test Campaign', 'mercenary');

      const personnelStore = store.getState().getPersonnelStore();
      expect(personnelStore).not.toBeNull();
      expect(personnelStore?.getState().personnel).toBeInstanceOf(Map);
    });

    it('should provide forces store after campaign creation', () => {
      store.getState().createCampaign('Test Campaign', 'mercenary');

      const forcesStore = store.getState().getForcesStore();
      expect(forcesStore).not.toBeNull();
      expect(forcesStore?.getState().forces).toBeInstanceOf(Map);
    });

    it('should provide missions store after campaign creation', () => {
      store.getState().createCampaign('Test Campaign', 'mercenary');

      const missionsStore = store.getState().getMissionsStore();
      expect(missionsStore).not.toBeNull();
      expect(missionsStore?.getState().missions).toBeInstanceOf(Map);
    });

    it('should allow adding personnel via sub-store', () => {
      store.getState().createCampaign('Test Campaign', 'mercenary');

      const personnelStore = store.getState().getPersonnelStore();
      const person = createTestPerson({ name: 'New Pilot' });
      personnelStore?.getState().addPerson(person);

      expect(personnelStore?.getState().getPerson(person.id)?.name).toBe('New Pilot');
    });

    it('should allow adding forces via sub-store', () => {
      store.getState().createCampaign('Test Campaign', 'mercenary');

      const forcesStore = store.getState().getForcesStore();
      const force = createTestForce({ name: 'Alpha Lance' });
      forcesStore?.getState().addForce(force);

      expect(forcesStore?.getState().getForce(force.id)?.name).toBe('Alpha Lance');
    });

    it('should allow adding missions via sub-store', () => {
      store.getState().createCampaign('Test Campaign', 'mercenary');

      const missionsStore = store.getState().getMissionsStore();
      const mission = createTestMission({ name: 'Raid Mission' });
      missionsStore?.getState().addMission(mission);

      expect(missionsStore?.getState().getMission(mission.id)?.name).toBe('Raid Mission');
    });

    it('should sync sub-store data on save', () => {
      store.getState().createCampaign('Test Campaign', 'mercenary');

      // Add data to all sub-stores
      const personnelStore = store.getState().getPersonnelStore();
      const forcesStore = store.getState().getForcesStore();
      const missionsStore = store.getState().getMissionsStore();

      const person = createTestPerson({ name: 'Test Pilot' });
      const force = createTestForce({ name: 'Test Lance' });
      const mission = createTestMission({ name: 'Test Mission' });

      personnelStore?.getState().addPerson(person);
      forcesStore?.getState().addForce(force);
      missionsStore?.getState().addMission(mission);

      store.getState().saveCampaign();

      const campaign = store.getState().getCampaign();
      expect(campaign?.personnel.size).toBe(1);
      // Forces includes root force + added force
      expect(campaign?.forces.size).toBe(2);
      expect(campaign?.missions.size).toBe(1);
    });
  });

  // ===========================================================================
  // Persistence
  // ===========================================================================

  describe('Persistence', () => {
    it('should persist campaign to localStorage', () => {
      const campaignId = store.getState().createCampaign('Test Campaign', 'mercenary');
      store.getState().saveCampaign();

      const stored = localStorageMock.getItem(`campaign-${campaignId}`);
      expect(stored).toBeTruthy();
      
      const parsed = JSON.parse(stored!) as { state: Record<string, unknown> };
      expect(parsed.state).toBeDefined();
    });

    it('should serialize dates correctly', () => {
      const campaignId = store.getState().createCampaign('Test Campaign', 'mercenary');
      store.getState().saveCampaign();

      const stored = localStorageMock.getItem(`campaign-${campaignId}`);
      const parsed = JSON.parse(stored!) as { state: { currentDate: string; createdAt: string } };

      expect(parsed.state.currentDate).toMatch(/^\d{4}-\d{2}-\d{2}T/);
      expect(parsed.state.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });

    it('should serialize finances correctly', () => {
      const campaignId = store.getState().createCampaign('Test Campaign', 'mercenary');
      store.getState().saveCampaign();

      const stored = localStorageMock.getItem(`campaign-${campaignId}`);
      const parsed = JSON.parse(stored!) as { state: { finances: { balance: number; transactions: unknown[] } } };

      expect(parsed.state.finances).toBeDefined();
      expect(parsed.state.finances.balance).toBe(0);
      expect(parsed.state.finances.transactions).toEqual([]);
    });

    it('should deserialize dates correctly on load', () => {
      const campaignId = store.getState().createCampaign('Test Campaign', 'mercenary');
      store.getState().saveCampaign();

      const newStore = createCampaignStore();
      newStore.getState().loadCampaign(campaignId);

      const campaign = newStore.getState().getCampaign();
      expect(campaign?.currentDate).toBeInstanceOf(Date);
    });

    it('should persist sub-store data independently', () => {
      store.getState().createCampaign('Test Campaign', 'mercenary');

      const personnelStore = store.getState().getPersonnelStore();
      const person = createTestPerson({ name: 'Persisted Person' });
      personnelStore?.getState().addPerson(person);

      // Check personnel store has its own storage
      const personnelStored = localStorageMock.getItem(`personnel-${store.getState().getCampaign()?.id}`);
      expect(personnelStored).toBeTruthy();
    });
  });

  // ===========================================================================
  // Edge Cases
  // ===========================================================================

  describe('Edge Cases', () => {
    it('should handle empty campaign name', () => {
      store.getState().createCampaign('', 'mercenary');

      const campaign = store.getState().getCampaign();
      expect(campaign?.name).toBe('');
    });

    it('should handle special characters in campaign name', () => {
      store.getState().createCampaign("Wolf's Dragoons - Alpha Company", 'mercenary');

      const campaign = store.getState().getCampaign();
      expect(campaign?.name).toBe("Wolf's Dragoons - Alpha Company");
    });

    it('should handle rapid day advancement', () => {
      store.getState().createCampaign('Test Campaign', 'mercenary');
      const originalDate = new Date(store.getState().getCampaign()!.currentDate);

      // Advance 100 days rapidly
      for (let i = 0; i < 100; i++) {
        store.getState().advanceDay();
      }

      const newDate = store.getState().getCampaign()?.currentDate;
      const expectedDate = new Date(originalDate);
      expectedDate.setDate(expectedDate.getDate() + 100);

      expect(newDate?.toDateString()).toBe(expectedDate.toDateString());
    });

    it('should handle creating multiple campaigns (replaces previous)', () => {
      store.getState().createCampaign('First Campaign', 'davion');
      store.getState().createCampaign('Second Campaign', 'steiner');

      const campaign = store.getState().getCampaign();
      expect(campaign?.name).toBe('Second Campaign');
      expect(campaign?.factionId).toBe('steiner');
    });

    it('should handle large personnel roster', () => {
      store.getState().createCampaign('Test Campaign', 'mercenary');

      const personnelStore = store.getState().getPersonnelStore();
      
      // Add 100 personnel
      for (let i = 0; i < 100; i++) {
        const person = createTestPerson({ name: `Person ${i}` });
        personnelStore?.getState().addPerson(person);
      }

      store.getState().saveCampaign();

      const campaign = store.getState().getCampaign();
      expect(campaign?.personnel.size).toBe(100);
    });
  });

  // ===========================================================================
  // Integration Tests
  // ===========================================================================

  describe('Integration', () => {
    it('should support full campaign lifecycle', () => {
      // Create campaign
      const campaignId = store.getState().createCampaign("Wolf's Dragoons", 'mercenary');
      expect(campaignId).toBeDefined();

      // Add personnel
      const personnelStore = store.getState().getPersonnelStore();
      const pilot = createTestPerson({ name: 'Jaime Wolf', rank: 'Colonel' });
      personnelStore?.getState().addPerson(pilot);

      // Add force
      const forcesStore = store.getState().getForcesStore();
      const lance = createTestForce({ name: 'Command Lance' });
      forcesStore?.getState().addForce(lance);

      // Add mission
      const missionsStore = store.getState().getMissionsStore();
      const mission = createTestMission({ name: 'Contract: Garrison Duty' });
      missionsStore?.getState().addMission(mission);

      // Advance time
      store.getState().advanceDay();
      store.getState().advanceDay();

      // Save
      store.getState().saveCampaign();

      // Verify state
      const campaign = store.getState().getCampaign();
      expect(campaign?.name).toBe("Wolf's Dragoons");
      expect(campaign?.personnel.size).toBe(1);
      expect(campaign?.forces.size).toBe(2); // Root + Command Lance
      expect(campaign?.missions.size).toBe(1);
    });

    it('should support save and reload cycle', () => {
      // Create and populate campaign
      const campaignId = store.getState().createCampaign('Test Campaign', 'mercenary');
      
      const personnelStore = store.getState().getPersonnelStore();
      const pilot = createTestPerson({ name: 'Test Pilot' });
      personnelStore?.getState().addPerson(pilot);

      store.getState().advanceDay();
      store.getState().saveCampaign();

      // Create new store and reload
      const newStore = createCampaignStore();
      const loaded = newStore.getState().loadCampaign(campaignId);

      expect(loaded).toBe(true);
      
      const campaign = newStore.getState().getCampaign();
      expect(campaign?.name).toBe('Test Campaign');
    });
  });
});
