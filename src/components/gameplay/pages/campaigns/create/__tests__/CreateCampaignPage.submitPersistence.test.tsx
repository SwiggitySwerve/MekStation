import type { NextRouter } from 'next/router';

import * as fs from 'node:fs';
import * as path from 'node:path';

import type { SerializedCampaign } from '@/types/campaign/SerializedCampaign';

import { useCampaignPersistenceStore } from '@/stores/campaign/useCampaignPersistenceStore';
import { useCampaignRosterStore } from '@/stores/campaign/useCampaignRosterStore';
import {
  resetCampaignStore,
  useCampaignStore,
} from '@/stores/campaign/useCampaignStore';
import { clientSafeStorage } from '@/stores/utils/clientSafeStorage';
import { CampaignPreset } from '@/types/campaign/CampaignPreset';
import { CampaignType } from '@/types/campaign/CampaignType';

import {
  resetCampaignCreationSubmitState,
  submitCampaignCreation,
} from '../CreateCampaignPage.submit';

const originalFetch = global.fetch;
const savedId = 'custom-whm-6r-saved';

function resetWorld(): void {
  resetCampaignCreationSubmitState();
  resetCampaignStore();
  useCampaignPersistenceStore.getState().reset();
  useCampaignRosterStore.getState().reset();
  clientSafeStorage.removeItem('campaign-store');
  clientSafeStorage.removeItem('campaign-roster-store');
}

describe('CreateCampaignPage submit persistence', () => {
  afterEach(() => {
    resetWorld();
    global.fetch = originalFetch;
  });

  it('PUTs once, retries the same id, and keeps 409 from overwriting', async () => {
    const puts: Array<{ envelope: SerializedCampaign; baseVersion: number }> =
      [];
    let phase: 'fail' | 'conflict' | 'accept' = 'fail';
    global.fetch = jest.fn(
      async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = typeof input === 'string' ? input : input.toString();
        const method = (init?.method ?? 'GET').toUpperCase();
        const respond = (status: number, body: unknown) =>
          ({
            ok: status >= 200 && status < 300,
            status,
            json: async () => body,
          }) as Response;
        if (!url.startsWith('/api/campaigns/') || method !== 'PUT') {
          return respond(200, { success: true });
        }
        const body = JSON.parse(String(init?.body)) as (typeof puts)[number];
        puts.push(body);
        if (phase === 'fail') return respond(500, { error: 'persist failed' });
        if (phase === 'conflict') {
          return respond(409, {
            ...body.envelope,
            version: 9,
            body: { ...body.envelope.body, name: 'Server Wins' },
          });
        }
        return respond(200, {
          ...body.envelope,
          version: body.baseVersion + 1,
        });
      },
    ) as jest.MockedFunction<typeof fetch>;

    resetWorld();
    const router = {
      push: jest.fn().mockResolvedValue(true),
    } as unknown as NextRouter;
    const input = {
      campaignType: CampaignType.MERCENARY,
      description: '',
      name: 'CAMP-01F Persist Co.',
      pilotAssignments: {},
      router,
      selectedPilots: [],
      selectedPreset: CampaignPreset.STANDARD,
      selectedUnits: [
        {
          id: 'unit-custom-1',
          name: 'Warhammer WHM-6R Custom',
          tonnage: 70,
          unitRef: savedId,
          unitSource: 'custom' as const,
        },
      ],
      setIsSubmitting: jest.fn(),
      setLocalError: jest.fn(),
      showToast: jest.fn(),
      store: useCampaignStore(),
    };

    await submitCampaignCreation(input);
    const firstId = useCampaignStore().getState().campaign?.id;
    phase = 'conflict';
    await submitCampaignCreation(input);
    const conflictPuts = puts.slice(1);
    phase = 'accept';
    await submitCampaignCreation(input);
    const accepted = puts.at(-1)?.envelope;
    const rosterUnit = accepted?.body.rosterProjection?.units[0];
    const rootForce = accepted?.body.forces.find(
      ([, force]) => force.id === accepted.body.rootForceId,
    )?.[1];
    // prettier-ignore
    const assertions = { 'campaignIdMatched===true': accepted?.campaignId === firstId && puts.every((entry) => entry.envelope.campaignId === firstId), 'conflictOverwritePrevented===true': conflictPuts.length === 1 && conflictPuts[0]?.baseVersion === 0 && useCampaignStore().getState().campaign?.name === 'CAMP-01F Persist Co.', 'conflictSameIdRetried===true': conflictPuts[0]?.envelope.campaignId === firstId, 'constructionPayloadAbsent===true': !accepted?.body.unitConfigurations || Object.keys(accepted.body.unitConfigurations).length === 0, 'requestMethodPut===true': puts.length >= 3, 'responseAccepted===true': useCampaignPersistenceStore.getState().saveState === 'saved', 'rootForceContainsInstance===true': Boolean(rosterUnit?.unitId) && (rootForce?.unitIds.includes(rosterUnit?.unitId ?? '') ?? false), 'rosterInstanceIdPresent===true': Boolean(rosterUnit?.unitId) && rosterUnit?.unitId !== savedId, 'sameIdRetried===true': puts.length >= 3, 'successSuppressedOnFailure===true': (router.push as jest.Mock).mock.calls.length === 1, 'unitRefMatched===true': rosterUnit?.unitRef === savedId, 'unitSourceCustom===true': rosterUnit?.unitSource === 'custom' };
    expect(Object.values(assertions).every((value) => value === true)).toBe(
      true,
    );

    const artifactDir = process.env.CAMP01_ARTIFACT_DIR;
    const runId = process.env.CAMP01_RUN_ID;
    if (!artifactDir || !runId) return;
    const wavePath = path.join(artifactDir, 'wave-result.json');
    if (fs.existsSync(wavePath)) return;
    // prettier-ignore
    fs.writeFileSync(wavePath, `${JSON.stringify({ schema: 'camp01-wave-result/v1', wave: 'camp-01f', runId, status: 'passed', assertions })}\n`, { flag: 'wx' });
  });
});
