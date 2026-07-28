import type { NextRouter } from 'next/router';

import { waitFor } from '@testing-library/react';

import type { CampaignCommitResult } from '@/stores/campaign/useCampaignStore.types';

import { useCampaignRosterStore } from '@/stores/campaign/useCampaignRosterStore';
import {
  resetCampaignStore,
  useCampaignStore,
} from '@/stores/campaign/useCampaignStore';
import { clientSafeStorage } from '@/stores/utils/clientSafeStorage';
import { CampaignPreset } from '@/types/campaign/CampaignPreset';
import { CampaignType } from '@/types/campaign/CampaignType';

import type { SelectedUnit } from '../CreateCampaignPage.types';

import { submitCampaignCreation } from '../CreateCampaignPage.submit';

const selectedUnit: SelectedUnit = {
  id: 'unit-light',
  name: 'Locust LCT-1V',
  tonnage: 25,
  unitRef: 'locust-lct-1v',
};

function makeRouter(): NextRouter {
  return {
    push: jest.fn().mockResolvedValue(true),
  } as unknown as NextRouter;
}

function resetWorld(campaignId?: string): void {
  resetCampaignStore();
  useCampaignRosterStore.getState().reset();
  clientSafeStorage.removeItem('campaign-store');
  clientSafeStorage.removeItem('campaign-roster-store');

  if (campaignId) {
    clientSafeStorage.removeItem(`campaign-${campaignId}`);
    clientSafeStorage.removeItem(`forces-${campaignId}`);
    clientSafeStorage.removeItem(`missions-${campaignId}`);
  }
}

function submitSingleUnit(router: NextRouter): Promise<void> {
  return submitCampaignCreation({
    campaignType: CampaignType.MERCENARY,
    description: '',
    name: 'Force Reconciliation Co.',
    pilotAssignments: {},
    router,
    selectedPilots: [],
    selectedPreset: CampaignPreset.STANDARD,
    selectedUnits: [selectedUnit],
    setIsSubmitting: jest.fn(),
    setLocalError: jest.fn(),
    showToast: jest.fn(),
    store: useCampaignStore(),
  });
}

describe('CreateCampaignPage force reconciliation', () => {
  let campaignId: string | undefined;

  beforeEach(() => {
    campaignId = undefined;
    resetWorld();
  });

  afterEach(() => {
    resetWorld(campaignId);
  });

  it('reconciles selected roster units into the campaign root force before navigation', async () => {
    // Given a campaign wizard roster with one selected unit
    const router = makeRouter();

    // When the wizard creates the campaign
    await submitSingleUnit(router);

    // Then both the editable force store and route-facing campaign agree
    const state = useCampaignStore().getState();
    campaignId = state.campaign?.id;
    const rootForceId = state.campaign?.rootForceId;

    expect(
      state.getForcesStore()?.getState().getRootForce()?.unitIds,
    ).toContain(selectedUnit.id);
    expect(rootForceId).toBeDefined();
    expect(state.campaign?.forces.get(rootForceId!)?.unitIds).toContain(
      selectedUnit.id,
    );
    expect(router.push).toHaveBeenCalledWith(
      `/gameplay/campaigns/${campaignId}`,
    );
  });

  it('waits for campaign persistence before navigating', async () => {
    // Given a campaign save that has started but not committed
    const router = makeRouter();
    let resolveSave: ((result: CampaignCommitResult) => void) | undefined;
    const savePromise = new Promise<CampaignCommitResult>((resolve) => {
      resolveSave = resolve;
    });
    const saveCampaign = jest.fn(() => savePromise);
    useCampaignStore().setState({ saveCampaign });

    // When the wizard reaches its persistence boundary
    const submission = submitSingleUnit(router);
    await waitFor(() => {
      expect(saveCampaign).toHaveBeenCalledTimes(1);
    });

    // Then navigation remains blocked until the save resolves
    expect(router.push).not.toHaveBeenCalled();
    resolveSave?.({ committed: true });
    await submission;

    campaignId = useCampaignStore().getState().campaign?.id;
    expect(router.push).toHaveBeenCalledWith(
      `/gameplay/campaigns/${campaignId}`,
    );
  });
});
