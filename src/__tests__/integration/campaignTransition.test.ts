import { useCampaignStore, CampaignViewMode, IMissionContext } from '@/stores/useCampaignStore';
import {
  CampaignStatus,
  CampaignMissionStatus,
  CampaignUnitStatus,
  CampaignPilotStatus,
  DEFAULT_CAMPAIGN_RESOURCES,
} from '@/types/campaign';
import { GameStatus, GamePhase } from '@/types/gameplay';

function createTestCampaign() {
  const store = useCampaignStore.getState();
  
  const campaignId = store.createCampaign({
    name: 'Test Campaign',
    description: 'Campaign for transition testing',
    unitIds: ['unit-1', 'unit-2'],
    pilotIds: ['pilot-1', 'pilot-2'],
    resources: DEFAULT_CAMPAIGN_RESOURCES,
  });

  store.addMission(campaignId, {
    name: 'First Mission',
    description: 'Test mission',
    order: 1,
    prerequisites: [],
    isFinal: false,
  });

  store.selectCampaign(campaignId);
  
  return campaignId;
}

describe('Campaign to Tactical Transition', () => {
  beforeEach(() => {
    useCampaignStore.setState({
      campaigns: [],
      selectedCampaignId: null,
      isLoading: false,
      error: null,
      statusFilter: 'all',
      searchQuery: '',
      validations: new Map(),
      viewMode: 'starmap' as CampaignViewMode,
      activeGameSession: null,
      activeMissionContext: null,
    });
  });

  describe('Mission Launch', () => {
    it('should transition from starmap to tactical view when mission starts', () => {
      const campaignId = createTestCampaign();
      const store = useCampaignStore.getState();
      const campaign = store.getCampaign(campaignId)!;
      const mission = campaign.missions[0];

      expect(store.viewMode).toBe('starmap');
      expect(store.activeGameSession).toBeNull();

      const result = store.launchMission(mission.id);

      expect(result).toBe(true);
      
      const updatedStore = useCampaignStore.getState();
      expect(updatedStore.viewMode).toBe('tactical');
      expect(updatedStore.activeGameSession).not.toBeNull();
      expect(updatedStore.activeMissionContext).not.toBeNull();
    });

    it('should generate terrain when launching mission', () => {
      const campaignId = createTestCampaign();
      const store = useCampaignStore.getState();
      const campaign = store.getCampaign(campaignId)!;
      const mission = campaign.missions[0];

      store.launchMission(mission.id);
      
      const updatedStore = useCampaignStore.getState();
      const context = updatedStore.activeMissionContext!;
      
      expect(context.terrain).toBeDefined();
      expect(context.terrain.length).toBeGreaterThan(0);
    });

    it('should include roster units in game session', () => {
      const campaignId = createTestCampaign();
      const store = useCampaignStore.getState();
      const campaign = store.getCampaign(campaignId)!;
      const mission = campaign.missions[0];

      store.launchMission(mission.id);
      
      const updatedStore = useCampaignStore.getState();
      const session = updatedStore.activeGameSession!;
      
      const playerUnits = session.units.filter(u => u.side === 'player');
      expect(playerUnits.length).toBeGreaterThan(0);
    });

    it('should set mission status to in progress', () => {
      const campaignId = createTestCampaign();
      const store = useCampaignStore.getState();
      const campaign = store.getCampaign(campaignId)!;
      const mission = campaign.missions[0];

      store.launchMission(mission.id);
      
      const updatedStore = useCampaignStore.getState();
      const updatedCampaign = updatedStore.getCampaign(campaignId)!;
      const updatedMission = updatedCampaign.missions.find(m => m.id === mission.id)!;
      
      expect(updatedMission.status).toBe(CampaignMissionStatus.InProgress);
    });

    it('should fail to launch unavailable mission', () => {
      const campaignId = createTestCampaign();
      const store = useCampaignStore.getState();
      
      store.addMission(campaignId, {
        name: 'Locked Mission',
        description: 'A locked mission',
        order: 2,
        prerequisites: ['nonexistent'],
        isFinal: false,
      });

      const campaign = store.getCampaign(campaignId)!;
      const lockedMission = campaign.missions.find(m => m.name === 'Locked Mission')!;

      const result = store.launchMission(lockedMission.id);

      expect(result).toBe(false);
      expect(useCampaignStore.getState().viewMode).toBe('starmap');
    });

    it('should fail without selected campaign', () => {
      useCampaignStore.setState({ selectedCampaignId: null });
      const store = useCampaignStore.getState();
      
      const result = store.launchMission('any-mission');
      
      expect(result).toBe(false);
      expect(useCampaignStore.getState().error).toBe('No campaign selected');
    });
  });

  describe('Mission End', () => {
    it('should return to starmap after victory', () => {
      const campaignId = createTestCampaign();
      let store = useCampaignStore.getState();
      const campaign = store.getCampaign(campaignId)!;
      const mission = campaign.missions[0];

      store.launchMission(mission.id);
      store = useCampaignStore.getState();
      expect(store.viewMode).toBe('tactical');

      store.endMission('victory');
      
      const finalStore = useCampaignStore.getState();
      expect(finalStore.viewMode).toBe('starmap');
      expect(finalStore.activeGameSession).toBeNull();
      expect(finalStore.activeMissionContext).toBeNull();
    });

    it('should return to starmap after defeat', () => {
      const campaignId = createTestCampaign();
      let store = useCampaignStore.getState();
      const campaign = store.getCampaign(campaignId)!;
      const mission = campaign.missions[0];

      store.launchMission(mission.id);
      store = useCampaignStore.getState();
      store.endMission('defeat');
      
      const finalStore = useCampaignStore.getState();
      expect(finalStore.viewMode).toBe('starmap');
    });

    it('should return to starmap after withdraw', () => {
      const campaignId = createTestCampaign();
      let store = useCampaignStore.getState();
      const campaign = store.getCampaign(campaignId)!;
      const mission = campaign.missions[0];

      store.launchMission(mission.id);
      store = useCampaignStore.getState();
      store.endMission('withdraw');
      
      const finalStore = useCampaignStore.getState();
      expect(finalStore.viewMode).toBe('starmap');
    });

    it('should update mission status after combat ends', () => {
      const campaignId = createTestCampaign();
      let store = useCampaignStore.getState();
      const campaign = store.getCampaign(campaignId)!;
      const mission = campaign.missions[0];

      store.launchMission(mission.id);
      store = useCampaignStore.getState();
      store.endMission('victory');
      
      const finalStore = useCampaignStore.getState();
      const updatedCampaign = finalStore.getCampaign(campaignId)!;
      const updatedMission = updatedCampaign.missions.find(m => m.id === mission.id)!;
      
      expect(updatedMission.status).toBe(CampaignMissionStatus.Victory);
    });

    it('should record defeat status after defeat', () => {
      const campaignId = createTestCampaign();
      let store = useCampaignStore.getState();
      const campaign = store.getCampaign(campaignId)!;
      const mission = campaign.missions[0];

      store.launchMission(mission.id);
      store = useCampaignStore.getState();
      store.endMission('defeat');
      
      const finalStore = useCampaignStore.getState();
      const updatedCampaign = finalStore.getCampaign(campaignId)!;
      const updatedMission = updatedCampaign.missions.find(m => m.id === mission.id)!;
      
      expect(updatedMission.status).toBe(CampaignMissionStatus.Defeat);
    });

    it('should fail to end mission when not in tactical mode', () => {
      useCampaignStore.setState({
        viewMode: 'starmap',
        activeGameSession: null,
        activeMissionContext: null,
        selectedCampaignId: 'test',
      });
      
      const store = useCampaignStore.getState();
      const result = store.endMission('victory');
      
      expect(result).toBe(false);
      expect(useCampaignStore.getState().error).toBe('No active mission to end');
    });
  });

  describe('Campaign State After Combat', () => {
    it('should award C-Bills for victory', () => {
      const campaignId = createTestCampaign();
      let store = useCampaignStore.getState();
      const campaign = store.getCampaign(campaignId)!;
      const mission = campaign.missions[0];
      const initialCBills = campaign.resources.cBills;

      store.launchMission(mission.id);
      store = useCampaignStore.getState();
      store.endMission('victory');
      
      const finalStore = useCampaignStore.getState();
      const updatedCampaign = finalStore.getCampaign(campaignId)!;
      
      expect(updatedCampaign.resources.cBills).toBeGreaterThan(initialCBills);
    });

    it('should deduct C-Bills for defeat', () => {
      const campaignId = createTestCampaign();
      let store = useCampaignStore.getState();
      const campaign = store.getCampaign(campaignId)!;
      const mission = campaign.missions[0];
      const initialCBills = campaign.resources.cBills;

      store.launchMission(mission.id);
      store = useCampaignStore.getState();
      store.endMission('defeat');
      
      const finalStore = useCampaignStore.getState();
      const updatedCampaign = finalStore.getCampaign(campaignId)!;
      
      expect(updatedCampaign.resources.cBills).toBeLessThan(initialCBills);
    });

    it('should increment mission completion count after victory', () => {
      const campaignId = createTestCampaign();
      let store = useCampaignStore.getState();
      const campaign = store.getCampaign(campaignId)!;
      const mission = campaign.missions[0];

      store.launchMission(mission.id);
      store = useCampaignStore.getState();
      store.endMission('victory');
      
      const finalStore = useCampaignStore.getState();
      const updatedCampaign = finalStore.getCampaign(campaignId)!;
      
      expect(updatedCampaign.progress.missionsCompleted).toBe(1);
      expect(updatedCampaign.progress.victories).toBe(1);
    });

    it('should track defeat in progress', () => {
      const campaignId = createTestCampaign();
      let store = useCampaignStore.getState();
      const campaign = store.getCampaign(campaignId)!;
      const mission = campaign.missions[0];

      store.launchMission(mission.id);
      store = useCampaignStore.getState();
      store.endMission('defeat');
      
      const finalStore = useCampaignStore.getState();
      const updatedCampaign = finalStore.getCampaign(campaignId)!;
      
      expect(updatedCampaign.progress.missionsCompleted).toBe(1);
      expect(updatedCampaign.progress.defeats).toBe(1);
    });
  });

  describe('Map Component Selection', () => {
    it('should return StarmapDisplay in starmap mode', () => {
      useCampaignStore.setState({ viewMode: 'starmap' as CampaignViewMode });
      const store = useCampaignStore.getState();
      
      expect(store.getCurrentMapComponent()).toBe('StarmapDisplay');
    });

    it('should return HexMapDisplay in tactical mode', () => {
      useCampaignStore.setState({ viewMode: 'tactical' as CampaignViewMode });
      const store = useCampaignStore.getState();
      
      expect(store.getCurrentMapComponent()).toBe('HexMapDisplay');
    });
  });
});
