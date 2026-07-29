import { useCampaignRosterStore } from '../useCampaignRosterStore';

describe('useCampaignRosterStore mission identity', () => {
  beforeEach(() => {
    useCampaignRosterStore.getState().reset();
    useCampaignRosterStore.getState().initRoster('campaign-alpha');
  });

  it('uses the supplied mission id when campaign launch already owns the identity', () => {
    // Given: the campaign launch flow has already minted the shared mission id.
    const missionId = 'mission-shared';

    // When: the roster mission projection is created for that encounter.
    const createdMissionId = useCampaignRosterStore
      .getState()
      .createMission('Mission 1', ['unit-alpha'], 'encounter-ready', missionId);

    // Then: the roster projection preserves the campaign-owned identity.
    expect(createdMissionId).toBe(missionId);
    expect(
      useCampaignRosterStore.getState().getMissionHistory(),
    ).toContainEqual(
      expect.objectContaining({
        id: missionId,
        encounterId: 'encounter-ready',
      }),
    );
  });
});
