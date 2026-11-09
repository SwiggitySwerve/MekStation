import {
  EncounterStatus,
  TerrainPreset,
  type IEncounter,
} from '@/types/encounter';

import { createEncounterApiLauncher } from '../encounterApiLauncher';
import { launchCampaignEncounter } from '../launchCampaignEncounter';

const encounter: IEncounter = {
  id: 'source-encounter',
  name: 'Co-op mission',
  status: EncounterStatus.Ready,
  playerForce: {
    forceId: 'force-1',
    forceName: 'Lance',
    totalBV: 0,
    unitCount: 1,
  },
  mapConfig: {
    radius: 8,
    terrain: TerrainPreset.Clear,
    playerDeploymentZone: 'south',
    opponentDeploymentZone: 'north',
  },
  victoryConditions: [],
  optionalRules: [],
  createdAt: '3025-01-01',
  updatedAt: '3025-01-01',
  campaignMeta: {
    campaignId: 'campaign-1',
    contractId: 'contract-1',
    scenarioId: 'scenario-1',
  },
};
const launched = {
  ...encounter,
  id: 'encounter/1',
  status: EncounterStatus.Launched,
  gameSessionId: 'session-1',
};
const reply = (body: unknown, status = 200) =>
  ({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  }) as Response;
const makeFetch = () =>
  jest.fn<ReturnType<typeof fetch>, Parameters<typeof fetch>>();

it('uses existing endpoints in order and returns the persisted session link', async () => {
  const fetchImpl = makeFetch().mockImplementation(async (url) =>
    String(url).endsWith('/encounter%2F1') && fetchImpl.mock.calls.length === 5
      ? reply({ encounter: launched })
      : reply({ success: true, id: 'encounter/1' }),
  );
  const result = await launchCampaignEncounter(
    encounter,
    createEncounterApiLauncher(fetchImpl),
  );
  expect(result).toEqual({
    success: true,
    encounterId: 'encounter/1',
    gameSessionId: 'session-1',
  });
  expect(
    fetchImpl.mock.calls.map(([url, init]) => [url, init?.method]),
  ).toEqual([
    ['/api/encounters', 'POST'],
    ['/api/encounters/encounter%2F1', 'PATCH'],
    ['/api/encounters/encounter%2F1/player-force', 'PUT'],
    ['/api/encounters/encounter%2F1/launch', 'POST'],
    ['/api/encounters/encounter%2F1', 'GET'],
  ]);
  expect(JSON.parse(String(fetchImpl.mock.calls[3][1]?.body))).toEqual(
    encounter.campaignMeta,
  );
  expect(JSON.parse(String(fetchImpl.mock.calls[1][1]?.body))).toEqual({
    mapConfig: encounter.mapConfig,
    victoryConditions: [],
    optionalRules: [],
  });
  expect(JSON.parse(String(fetchImpl.mock.calls[2][1]?.body))).toEqual({
    forceId: 'force-1',
  });
  expect(
    fetchImpl.mock.calls.every(
      ([, init]) => init?.signal instanceof AbortSignal,
    ),
  ).toBe(true);
});

it.each([0, 1, 2, 3])(
  'refuses HTTP 200 success:false at operation %s without continuing',
  async (failedStep) => {
    const fetchImpl = makeFetch().mockImplementation(async () =>
      reply(
        fetchImpl.mock.calls.length === failedStep + 1
          ? { success: false, error: 'operation refused' }
          : { success: true, id: 'encounter/1' },
      ),
    );
    const progress: { encounterId?: string } = {};
    expect(
      await launchCampaignEncounter(
        encounter,
        createEncounterApiLauncher(fetchImpl),
        progress,
      ),
    ).toEqual({
      success: false,
      error: 'operation refused',
      ...(failedStep === 0 ? {} : { encounterId: 'encounter/1' }),
    });
    expect(fetchImpl).toHaveBeenCalledTimes(failedStep + 1);
    expect(progress.encounterId).toBe(
      failedStep === 0 ? undefined : 'encounter/1',
    );
  },
);

it('retains an acknowledged encounter through a failed PATCH and reuses a launched receipt', async () => {
  const fetchImpl = makeFetch()
    .mockResolvedValueOnce(reply({ success: true, id: 'encounter/1' }))
    .mockResolvedValueOnce(reply({ error: 'configuration unavailable' }, 503))
    .mockResolvedValueOnce(reply({ encounter: launched }));
  const service = createEncounterApiLauncher(fetchImpl);
  const progress: { encounterId?: string } = {};
  expect(await launchCampaignEncounter(encounter, service, progress)).toEqual({
    success: false,
    encounterId: 'encounter/1',
    error: 'configuration unavailable',
  });
  expect(await launchCampaignEncounter(encounter, service, progress)).toEqual({
    success: true,
    encounterId: 'encounter/1',
    gameSessionId: 'session-1',
  });
  expect(fetchImpl.mock.calls.map(([, init]) => init?.method)).toEqual([
    'POST',
    'PATCH',
    'GET',
  ]);
});

it('returns null only for a missing encounter and rejects unavailable or malformed reads', async () => {
  const fetchImpl = makeFetch()
    .mockResolvedValueOnce(reply({ error: 'missing' }, 404))
    .mockResolvedValueOnce(reply({ error: 'offline' }, 503))
    .mockResolvedValueOnce(reply({ encounter: { ...launched, id: 'another' } }))
    .mockResolvedValueOnce(reply(null));
  const service = createEncounterApiLauncher(fetchImpl);
  expect(await service.getEncounter('encounter/1')).toBeNull();
  await expect(service.getEncounter('encounter/1')).rejects.toThrow('offline');
  await expect(service.getEncounter('encounter/1')).rejects.toThrow(
    'Invalid encounter response',
  );
  await expect(service.getEncounter('encounter/1')).rejects.toThrow(
    'Invalid encounter response',
  );
});

it('rejects malformed mutation success and preserves transport errors', async () => {
  const fetchImpl = makeFetch()
    .mockResolvedValueOnce(reply({ success: true }))
    .mockResolvedValueOnce(reply(null))
    .mockRejectedValueOnce(new Error('network unavailable'));
  const service = createEncounterApiLauncher(fetchImpl);
  expect(await service.createEncounter({ name: 'Mission' })).toEqual({
    success: false,
    error: 'Encounter creation did not return a valid id',
  });
  expect(await service.updateEncounter('encounter/1', {})).toEqual({
    success: false,
    error: 'Invalid encounter operation response',
  });
  expect(await service.launchEncounter('encounter/1')).toEqual({
    success: false,
    error: 'network unavailable',
  });
});
