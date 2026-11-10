import { createCampaignStore, resetCampaignStore } from '../useCampaignStore';
import {
  deserializeCampaign,
  serializeCampaign,
} from '../useCampaignStore.persistence';

describe('useCampaignStore multi-campaign switcher', () => {
  beforeEach(() => {
    resetCampaignStore();
  });

  it('resets processed, reviewed, and error state on create and replaces them on switch', () => {
    const store = createCampaignStore();
    store.getState().createCampaign('Alpha', 'mercenary');
    store.setState({
      processedBattleIds: ['alpha-battle'],
      reviewedBattleIds: { 'alpha-review': 1 },
      outcomeApplyErrors: { alpha: 'failed' },
    });
    store.getState().saveCampaign();
    const alpha = store.getState().campaign!;
    store.getState().createCampaign('Bravo', 'davion');
    const bravo = store.getState().campaign!;
    expect(store.getState().processedBattleIds).toEqual([]);
    expect(store.getState().reviewedBattleIds).toEqual({});
    expect(store.getState().outcomeApplyErrors).toEqual({});

    store.getState().switchCampaign(alpha);
    expect(store.getState().processedBattleIds).toEqual(['alpha-battle']);
    expect(store.getState().reviewedBattleIds).toEqual({ 'alpha-review': 1 });
    store.getState().switchCampaign(bravo);
    expect(store.getState().processedBattleIds).toEqual([]);
    expect(store.getState().reviewedBattleIds).toEqual({});

    store.setState({ outcomeApplyErrors: { bravo: 'failed' } });
    // Load alpha as the persistence store does: deserialize the saved
    // campaign, then switch to it.
    store
      .getState()
      .switchCampaign(
        deserializeCampaign(serializeCampaign(alpha), new Map(), new Map()),
      );
    expect(store.getState().outcomeApplyErrors).toEqual({});
    expect(store.getState().campaign?.processedBattleIds).toEqual([
      'alpha-battle',
    ]);
  });

  it('switches the active campaign without deleting the previously active campaign object', () => {
    const store = createCampaignStore();
    const alphaId = store.getState().createCampaign('Alpha Lance', 'mercenary');
    const alpha = store.getState().campaign;
    const bravoId = store.getState().createCampaign('Bravo Lance', 'davion');
    const bravo = store.getState().campaign;

    expect(alpha?.id).toBe(alphaId);
    expect(bravo?.id).toBe(bravoId);
    expect(alpha).not.toBeNull();
    expect(bravo).not.toBeNull();
    expect(
      typeof (store.getState() as { switchCampaign?: unknown }).switchCampaign,
    ).toBe('function');

    (
      store.getState() as { switchCampaign: (campaign: typeof alpha) => void }
    ).switchCampaign(alpha);

    expect(store.getState().campaign?.id).toBe(alphaId);

    (
      store.getState() as { switchCampaign: (campaign: typeof bravo) => void }
    ).switchCampaign(bravo);

    expect(store.getState().campaign?.id).toBe(bravoId);
    expect(alpha?.name).toBe('Alpha Lance');
  });
});
