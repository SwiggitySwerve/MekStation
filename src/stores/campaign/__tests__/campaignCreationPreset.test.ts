/**
 * D-3 store-seam pin (2026-06-09 audit, W3.3): `createCampaign`'s
 * `options` parameter is the production seam the wizard threads
 * `applyPreset(...)` output through. These tests pin that seam at the
 * store/service level: preset-derived options land on
 * `campaign.options` and campaign-type defaults layer underneath the
 * preset overrides, exactly as `applyPreset` documents.
 *
 * The red-first proof that the WIZARD passes these options lives in
 * `CreateCampaignPage.preset.test.tsx` — this file guards the store
 * half of the seam so a future signature change can't silently strand
 * the wizard's options argument again.
 */

import { applyPreset } from '@/lib/campaign/presetService';
import {
  resetCampaignStore,
  useCampaignStore,
} from '@/stores/campaign/useCampaignStore';
import { clientSafeStorage } from '@/stores/utils/clientSafeStorage';
import {
  CampaignPreset,
  PRESET_STARTING_FUNDS,
} from '@/types/campaign/CampaignPreset';
import { CampaignType } from '@/types/campaign/CampaignType';

function resetWorld(): void {
  resetCampaignStore();
  clientSafeStorage.removeItem('campaign-store');
}

describe('createCampaign — preset-derived options seam (D-3)', () => {
  beforeEach(resetWorld);
  afterEach(resetWorld);

  it('threads applyPreset output onto campaign.options', () => {
    const store = useCampaignStore();
    store
      .getState()
      .createCampaign(
        'Casual Co.',
        CampaignType.MERCENARY,
        applyPreset(CampaignPreset.CASUAL, CampaignType.MERCENARY),
      );

    const options = store.getState().getCampaign()?.options;
    expect(options?.healingRateMultiplier).toBe(2.0);
    expect(options?.maintenanceCycleDays).toBe(0);
    expect(options?.payForMaintenance).toBe(false);
    expect(options?.useTaxes).toBe(false);
    expect(options?.useTurnover).toBe(false);
    expect(options?.startingFunds).toBe(
      PRESET_STARTING_FUNDS[CampaignPreset.CASUAL],
    );
  });

  it('initializes the created campaign balance from preset startingFunds', () => {
    const store = useCampaignStore();
    store
      .getState()
      .createCampaign(
        'Standard Co.',
        CampaignType.MERCENARY,
        applyPreset(CampaignPreset.STANDARD, CampaignType.MERCENARY),
      );

    const campaign = store.getState().getCampaign();
    expect(campaign?.options.startingFunds).toBe(
      PRESET_STARTING_FUNDS[CampaignPreset.STANDARD],
    );
    expect(campaign?.finances.balance.amount).toBe(
      PRESET_STARTING_FUNDS[CampaignPreset.STANDARD],
    );
  });

  it('layers campaign-type defaults under the preset overrides', () => {
    const store = useCampaignStore();
    // CUSTOM has no overrides, so the PIRATE type defaults shine through.
    store
      .getState()
      .createCampaign(
        'Black Marauders',
        CampaignType.PIRATE,
        applyPreset(CampaignPreset.CUSTOM, CampaignType.PIRATE),
      );

    const options = store.getState().getCampaign()?.options;
    expect(options?.startingFunds).toBe(500000);
    expect(options?.trackFactionStanding).toBe(false);
  });
});
