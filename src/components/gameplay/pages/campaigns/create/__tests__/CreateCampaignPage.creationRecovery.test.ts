import type { NextRouter } from 'next/router';

import type { SerializedCampaign } from '@/types/campaign/SerializedCampaign';

import { ensureCampaignUnitMaxStates } from '@/stores/campaign/campaignUnitMaxStates';
import { useCampaignPersistenceStore } from '@/stores/campaign/useCampaignPersistenceStore';
import { useCampaignRosterStore } from '@/stores/campaign/useCampaignRosterStore';
import {
  resetCampaignStore,
  useCampaignStore,
} from '@/stores/campaign/useCampaignStore';
import { usePilotStore } from '@/stores/usePilotStore';
import { CampaignPreset } from '@/types/campaign/CampaignPreset';
import { CampaignType } from '@/types/campaign/CampaignType';

import {
  resetCampaignCreationSubmitState,
  submitCampaignCreation,
} from '../CreateCampaignPage.submit';

jest.mock('@/stores/campaign/campaignUnitMaxStates', () => ({
  ensureCampaignUnitMaxStates: jest.fn(async () => undefined),
}));

/** @spec openspec/changes/fix-campaign-creation-recovery/specs/campaign-persistence/spec.md */
describe('campaign wizard creation recovery', () => {
  let puts: {
    url: string;
    envelope: SerializedCampaign;
    baseVersion: number;
  }[];
  let failSave: boolean;

  beforeEach(() => {
    localStorage.clear();
    resetCampaignCreationSubmitState();
    useCampaignPersistenceStore.getState().reset();
    useCampaignRosterStore.getState().reset();
    resetCampaignStore();
    puts = [];
    failSave = false;
    jest
      .mocked(ensureCampaignUnitMaxStates)
      .mockReset()
      .mockResolvedValue(undefined);
    jest.spyOn(global, 'fetch').mockImplementation(async (input, init) => {
      const url = String(input);
      const body = JSON.parse(String(init?.body)) as {
        envelope: SerializedCampaign;
        baseVersion: number;
      };
      puts.push({ url, ...body });
      return {
        ok: !failSave,
        status: failSave ? 500 : 200,
        json: async () => ({ ...body.envelope, version: body.baseVersion + 1 }),
      } as Response;
    });
  });

  afterEach(() => {
    useCampaignPersistenceStore.getState().reset();
    resetCampaignCreationSubmitState();
    resetCampaignStore();
    jest.restoreAllMocks();
  });

  function input() {
    const push = jest.fn().mockResolvedValue(true);
    return {
      campaignType: CampaignType.MERCENARY,
      description: '',
      name: 'Recovery Co.',
      pilotAssignments: { 'unit-a': 'pilot-a', 'unit-b': 'pilot-b' },
      router: { push } as unknown as NextRouter,
      selectedPilots: [
        { id: 'pilot-a', name: 'One' },
        { id: 'pilot-b', name: 'Two' },
      ],
      selectedPreset: CampaignPreset.STANDARD,
      selectedUnits: [
        { id: 'unit-a', name: 'Locust', tonnage: 20, unitRef: 'locust-lct-1v' },
        { id: 'unit-b', name: 'Locust', tonnage: 20, unitRef: 'locust-lct-1v' },
      ],
      setIsSubmitting: jest.fn(),
      setLocalError: jest.fn(),
      showToast: jest.fn(),
      store: useCampaignStore(),
    };
  }

  it('repopulates after the second pilot fails instead of saving an empty roster', async () => {
    const createPilot = jest
      .spyOn(usePilotStore.getState(), 'createPilot')
      .mockResolvedValueOnce('vault-first-attempt')
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce('vault-a')
      .mockResolvedValueOnce('vault-b');
    const submission = input();

    await submitCampaignCreation(submission);
    expect(puts).toHaveLength(0);
    expect(submission.router.push).not.toHaveBeenCalled();
    expect(submission.showToast).not.toHaveBeenCalledWith(
      expect.objectContaining({ variant: 'success' }),
    );

    await submitCampaignCreation(submission);

    expect(createPilot).toHaveBeenCalledTimes(4);
    expect(puts).toHaveLength(1);
    expect(
      puts[0].envelope.body.rosterProjection?.units.map((unit) => unit.pilotId),
    ).toEqual(['vault-a', 'vault-b']);
    expect(
      puts[0].envelope.body.rosterProjection?.pilots.map(
        (pilot) => pilot.pilotId,
      ),
    ).toEqual(['vault-a', 'vault-b']);
    expect(submission.router.push).toHaveBeenCalledTimes(1);
  });

  it('reuses the complete campaign after a save failure without registering pilots again', async () => {
    const createPilot = jest
      .spyOn(usePilotStore.getState(), 'createPilot')
      .mockResolvedValueOnce('vault-a')
      .mockResolvedValueOnce('vault-b');
    const submission = input();
    failSave = true;
    await submitCampaignCreation(submission);
    const first = puts[0].envelope;
    expect(submission.router.push).not.toHaveBeenCalled();

    failSave = false;
    await submitCampaignCreation(submission);

    expect(createPilot).toHaveBeenCalledTimes(2);
    expect(puts[1].envelope.campaignId).toBe(first.campaignId);
    expect(puts[1].envelope.body.rosterProjection).toEqual(
      first.body.rosterProjection,
    );
    expect(puts[1].envelope.body.rootForceId).toBe(first.body.rootForceId);
    expect(submission.router.push).toHaveBeenCalledTimes(1);
  });

  it('repopulates after maxima preparation fails partway through assembly', async () => {
    const createPilot = jest
      .spyOn(usePilotStore.getState(), 'createPilot')
      .mockResolvedValue('vault-a');
    jest
      .mocked(ensureCampaignUnitMaxStates)
      .mockRejectedValueOnce(new Error('Preparation failed'))
      .mockResolvedValueOnce(undefined);
    const submission = {
      ...input(),
      selectedPilots: [{ id: 'pilot-a', name: 'One' }],
    };

    await submitCampaignCreation(submission);
    expect(puts).toHaveLength(0);
    expect(submission.router.push).not.toHaveBeenCalled();

    await submitCampaignCreation(submission);

    expect(createPilot).toHaveBeenCalledTimes(2);
    expect(puts[0].envelope.body.rosterProjection?.pilots).toHaveLength(1);
    expect(puts[0].envelope.body.rosterProjection?.units).toHaveLength(2);
  });

  it('creates after viewing clean A using B in both the request URL and body', async () => {
    const store = useCampaignStore();
    const alphaId = store.getState().createCampaign('Alpha', 'mercenary');
    useCampaignPersistenceStore.setState({
      campaignId: alphaId,
      baseVersion: 8,
      saveState: 'saved',
    });
    const submission = { ...input(), selectedPilots: [] };

    await submitCampaignCreation(submission);

    expect(puts).toHaveLength(1);
    const put = puts[0];
    expect(put.envelope.campaignId).not.toBe(alphaId);
    expect(put.url).toBe(`/api/campaigns/${put.envelope.campaignId}`);
    expect(put.baseVersion).toBe(0);
  });

  it('surfaces dirty-A refusal through the wizard error channel without replacing A', async () => {
    const store = useCampaignStore();
    store.getState().createCampaign('Alpha', 'mercenary');
    useCampaignPersistenceStore.getState().markDirty();
    const alpha = store.getState();
    const submission = { ...input(), selectedPilots: [] };

    await submitCampaignCreation(submission);

    expect(store.getState()).toBe(alpha);
    expect(submission.setLocalError).toHaveBeenCalledWith(
      'Your current campaign is still saving. Try again in a moment.',
    );
    expect(submission.router.push).not.toHaveBeenCalled();
    expect(puts).toHaveLength(0);
  });
});
