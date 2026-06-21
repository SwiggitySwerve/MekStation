import { createCampaignStore, resetCampaignStore } from '../useCampaignStore';

describe('useCampaignStore multi-campaign switcher', () => {
  beforeEach(() => {
    resetCampaignStore();
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
