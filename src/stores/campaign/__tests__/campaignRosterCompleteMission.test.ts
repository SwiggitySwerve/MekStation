/**
 * T1 (review R6): `postBattleProcessor` is the one writer of campaign
 * `unitCombatStates`. Completing a mission from the game page records the
 * mission result and refreshes the roster projection's readiness, but no
 * longer writes canonical combat state. Its old write keyed game units by
 * roster id (never equal to a campaign session unit id) and computed
 * damage as max minus current from the same record (always zero).
 */
import { createDefaultCampaignOptions } from '@/types/campaign/Campaign';
import { CampaignType } from '@/types/campaign/CampaignType';
import { Money } from '@/types/campaign/Money';

import { useCampaignRosterStore } from '../useCampaignRosterStore';
import { resetCampaignStore, useCampaignStore } from '../useCampaignStore';

describe('completeMission leaves canonical combat state to postBattleProcessor', () => {
  afterEach(() => {
    resetCampaignStore();
    useCampaignRosterStore.getState().reset();
  });

  it('records the mission result without writing unitCombatStates', () => {
    resetCampaignStore();
    useCampaignStore().setState({
      campaign: {
        id: 'camp-r6',
        name: 'R6',
        currentDate: new Date('3025-06-15T00:00:00.000Z'),
        factionId: 'mercenary',
        forces: new Map(),
        rootForceId: 'root',
        missions: new Map(),
        finances: { transactions: [], balance: new Money(0) },
        factionStandings: {},
        shoppingList: { items: [] },
        options: createDefaultCampaignOptions(),
        campaignType: CampaignType.MERCENARY,
        createdAt: '3025-01-01T00:00:00Z',
        updatedAt: '3025-01-01T00:00:00Z',
        unitCombatStates: {},
      } as never,
    });
    useCampaignRosterStore.setState({
      campaignId: 'camp-r6',
      units: [
        { unitId: 'roster-a', unitName: 'Atlas', readiness: 'Ready' },
      ] as never,
      missions: [
        {
          id: 'mission-1',
          name: 'Raid',
          result: 'pending',
          deployedUnitIds: ['roster-a'],
        },
      ] as never,
      activeMissionId: 'mission-1',
    });

    useCampaignRosterStore.getState().completeMission(
      'mission-1',
      'victory',
      [
        {
          unitId: 'roster-a',
          armorDamage: { CT: 5 },
          structureDamage: {},
          destroyedComponents: [],
        },
      ] as never,
      'game-1',
    );

    expect(useCampaignStore().getState().campaign?.unitCombatStates).toEqual(
      {},
    );
    expect(useCampaignRosterStore.getState().missions[0]).toMatchObject({
      result: 'victory',
      gameSessionId: 'game-1',
    });
  });
});
