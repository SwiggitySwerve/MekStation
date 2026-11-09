import type { ICampaignWithCommand } from '@/types/campaign/CampaignCommandExtensions';

import {
  deserializeCampaignBody,
  serializeCampaign as serializeCampaignBody,
} from '@/lib/campaign/persistence/serializeCampaign';
import { applyPreset } from '@/lib/campaign/presetService';
import { CampaignPreset } from '@/types/campaign/CampaignPreset';
import { CampaignType } from '@/types/campaign/CampaignType';
import { createHostCoopSession } from '@/types/campaign/CoopSession';
import { PersonnelMarketStyle } from '@/types/campaign/markets/marketTypes';

import { useCampaignPersistenceStore } from '../useCampaignPersistenceStore';
import { resetCampaignStore, useCampaignStore } from '../useCampaignStore';
import {
  deserializeCampaign,
  serializeCampaign,
} from '../useCampaignStore.persistence';

/** @spec openspec/changes/seed-initial-personnel-market/specs/markets-system/spec.md */
describe('initial personnel market at campaign creation', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    localStorage.clear();
    useCampaignPersistenceStore.getState().reset();
    resetCampaignStore();
  });

  afterEach(() => {
    useCampaignPersistenceStore.getState().reset();
    resetCampaignStore();
    jest.useRealTimers();
  });

  it.each(['local', 'host'] as const)(
    'publishes %s recruits before the first save or day advance, and both serializers retain them',
    (mode) => {
      const store = useCampaignStore();
      store
        .getState()
        .createCampaign(
          'Market Co.',
          'mercenary',
          { personnelMarketStyle: PersonnelMarketStyle.MEKHQ },
          mode === 'host'
            ? { coopSession: createHostCoopSession('ROOMBB', 'match-b') }
            : undefined,
        );
      const campaign = store.getState().campaign as ICampaignWithCommand;

      expect(campaign.personnelMarket?.length).toBeGreaterThanOrEqual(1);
      expect(campaign.personnelMarket?.length).toBeLessThanOrEqual(3);
      expect(campaign.currentDate).toEqual(campaign.campaignStartDate);
      expect(campaign.finances.transactions).toEqual([]);
      expect(useCampaignPersistenceStore.getState().baseVersion).toBe(0);

      const saved = serializeCampaign(campaign);
      const loaded = deserializeCampaign(
        saved,
        campaign.forces,
        campaign.missions,
      ) as ICampaignWithCommand;
      const body = serializeCampaignBody(campaign);
      const loadedBody = deserializeCampaignBody(body) as ICampaignWithCommand;
      for (const pool of [
        saved.personnelMarket,
        loaded.personnelMarket,
        body.personnelMarket,
        loadedBody.personnelMarket,
      ]) {
        expect(pool).toEqual(campaign.personnelMarket);
      }
    },
  );

  it('keeps the stock Standard co-op market disabled', () => {
    const store = useCampaignStore();
    store
      .getState()
      .createCampaign(
        'Standard host',
        CampaignType.MERCENARY,
        applyPreset(CampaignPreset.STANDARD, CampaignType.MERCENARY),
        { coopSession: createHostCoopSession('ROOMBB', 'match-b') },
      );
    const campaign = store.getState().campaign as ICampaignWithCommand;
    expect(campaign.options.personnelMarketStyle).toBe(
      PersonnelMarketStyle.DISABLED,
    );
    expect(campaign.personnelMarket).toBeUndefined();
  });

  it('never invents a personnel market for a guest mirror', () => {
    const store = useCampaignStore();
    store.getState().createGuestMirrorCampaign('match-b', {
      campaignId: 'host-campaign-b',
      campaignName: 'Market Co.',
      factionId: 'mercenary',
      roomCode: 'ROOMBB',
    });
    expect(
      (store.getState().campaign as ICampaignWithCommand).personnelMarket,
    ).toBeUndefined();
  });
});
