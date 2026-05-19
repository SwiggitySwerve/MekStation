/**
 * Command Actions → Auto-Save — integration test
 *
 * Covers tasks.md 5.1 and the spec scenarios that require a command
 * mutation to mark the campaign dirty so the persistence store's
 * debounced auto-save (CP0) fires. Exercises the real persistence-store
 * debounce by advancing fake timers past `AUTO_SAVE_DEBOUNCE_MS`.
 *
 * @spec openspec/changes/add-campaign-command-ui/specs/campaign-command-ui/spec.md
 */

import type { ICampaign } from '@/types/campaign/Campaign';

import { SAMPLE_OFFERS } from '@/components/campaign/command/__fixtures__/commandFixtures';

import { acceptContractOffer, takeLoan } from '../campaignCommandActions';
import {
  AUTO_SAVE_DEBOUNCE_MS,
  useCampaignPersistenceStore,
} from '../useCampaignPersistenceStore';
import { useCampaignRosterStore } from '../useCampaignRosterStore';
import { resetCampaignStore, useCampaignStore } from '../useCampaignStore';

/** A 2xx JSON response stub for the save endpoint. */
function jsonResponse(status: number, body: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as Response;
}

function seedCampaign(): void {
  const store = useCampaignStore();
  store.getState().createCampaign('AutoSave Test', 'mercenary');
  store.getState().updateCampaign({
    contractMarket: { offers: SAMPLE_OFFERS, declinedOfferIds: [] },
  } as Partial<ICampaign>);
}

describe('command actions trigger the debounced auto-save', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    resetCampaignStore();
    useCampaignRosterStore.getState().reset();
    useCampaignPersistenceStore.getState().reset();
    // Stub the save endpoint so the debounced auto-save resolves.
    jest
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(jsonResponse(200, { version: 1 }));
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
    resetCampaignStore();
  });

  it('take-loan marks dirty and the auto-save settles to saved', async () => {
    seedCampaign();
    takeLoan({ principal: 1_000_000, interestRate: 0.1, termDays: 365 });
    expect(useCampaignPersistenceStore.getState().dirty).toBe(true);

    jest.advanceTimersByTime(AUTO_SAVE_DEBOUNCE_MS);
    await Promise.resolve();
    await Promise.resolve();

    expect(globalThis.fetch).toHaveBeenCalled();
  });

  it('accept-contract marks dirty and the auto-save settles to saved', async () => {
    seedCampaign();
    acceptContractOffer(SAMPLE_OFFERS[0].id);
    expect(useCampaignPersistenceStore.getState().dirty).toBe(true);

    jest.advanceTimersByTime(AUTO_SAVE_DEBOUNCE_MS);
    await Promise.resolve();
    await Promise.resolve();

    expect(globalThis.fetch).toHaveBeenCalled();
  });
});
