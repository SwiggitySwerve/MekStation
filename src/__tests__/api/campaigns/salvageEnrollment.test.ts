/** Real accept -> persistence -> PUT -> SQLite/journal regression seam. */
import type { ICampaign } from '@/types/campaign/Campaign';
import type { ISalvageCandidate } from '@/types/campaign/Salvage';

import { authoritativeStateFromSerializedCampaign } from '@/lib/campaign/authority/campaignSourceGenesis';
import {
  storeCoopCampaignToken,
  readCoopCampaignToken,
} from '@/lib/campaign/coop/coopCampaignAuthTokenStore';
import { _resetActiveCoopHosts } from '@/lib/campaign/coop/coopHostRegistry';
import { aggregateSalvageCandidates } from '@/lib/campaign/salvage/salvageEngine';
import {
  _resetCampaignHostRegistry,
  getCampaignHostRegistry,
  type ICampaignHostRegistryEntry,
} from '@/lib/multiplayer/server/CampaignHostRegistry';
import { readCampaign } from '@/services/campaignPersistence/CampaignPersistenceService';
import { getCanonicalUnitService } from '@/services/units/CanonicalUnitService';
import { mapRawIndexEntry } from '@/services/units/unitIndexMapper';
import { setSalvageItemStatus } from '@/stores/campaign/campaignBayActions';
import { selectSalvageBay } from '@/stores/campaign/campaignBaySelectors';
import { useCampaignPersistenceStore } from '@/stores/campaign/useCampaignPersistenceStore';
import { useCampaignRosterStore } from '@/stores/campaign/useCampaignRosterStore';
import {
  resetCampaignStore,
  useCampaignStore as getCampaignStore,
} from '@/stores/campaign/useCampaignStore';
import { createHostCoopSession } from '@/types/campaign/CoopSession';
import {
  CombatEndReason,
  COMBAT_OUTCOME_VERSION,
  PilotFinalStatus,
  UnitFinalStatus,
} from '@/types/combat/CombatOutcome';
import { GameSide } from '@/types/gameplay/GameSessionInterfaces';

import {
  bearerOf,
  callId,
  mintIdentity,
  replayed,
  useTempCampaignDatabase as registerTempCampaignDatabase,
} from './campaignJournalEffectsFixture';

const REF = 'atlas-as7-d';
const UNIT = {
  id: REF,
  chassis: 'Atlas',
  variant: 'AS7-D',
  tonnage: 100,
  techBase: 'Inner Sphere',
  era: '3025',
  unitType: 'BattleMech',
};

function candidateForBattle(unitId = 'enemy-atlas'): ISalvageCandidate {
  return aggregateSalvageCandidates(
    {
      version: COMBAT_OUTCOME_VERSION,
      matchId: 'salvage-battle',
      contractId: null,
      scenarioId: null,
      endReason: CombatEndReason.Destruction,
      capturedAt: '2026-11-07T00:00:00Z',
      report: {
        version: 1,
        matchId: 'salvage-battle',
        winner: GameSide.Player,
        reason: 'destruction',
        turnCount: 1,
        units: [],
        mvpUnitId: null,
        log: [],
      },
      unitDeltas: [
        {
          unitId,
          unitRef: REF,
          side: GameSide.Opponent,
          destroyed: false,
          finalStatus: UnitFinalStatus.Crippled,
          armorRemaining: { CT: 3, LT: 0 },
          internalsRemaining: { CT: 7, LT: 0 },
          destroyedLocations: ['LT'],
          destroyedComponents: ['Medium Laser'],
          heatEnd: 8,
          ammoRemaining: { ac20: 2 },
          pilotState: {
            conscious: true,
            wounds: 0,
            killed: false,
            finalStatus: PilotFinalStatus.Active,
          },
        },
      ],
    },
    {
      lookup: () => ({
        designation: 'Atlas AS7-D',
        tonnage: 100,
        battleValue: 1000,
      }),
    },
  ).candidates[0];
}

registerTempCampaignDatabase('mekstation-salvage-enrollment-');
let statuses: number[];
let rejectPut: number | undefined;
let lastAnswer: unknown;
let liveEntry: ICampaignHostRegistryEntry | undefined;
const originalFetch = global.fetch;

beforeEach(() => {
  window.localStorage.clear();
  resetCampaignStore();
  useCampaignRosterStore.getState().reset();
  useCampaignPersistenceStore.getState().reset();
  statuses = [];
  rejectPut = undefined;
  liveEntry = undefined;
  window.sessionStorage.clear();
  jest.spyOn(getCanonicalUnitService(), 'getIndex').mockResolvedValue([
    mapRawIndexEntry({
      id: UNIT.id,
      chassis: UNIT.chassis,
      model: UNIT.variant,
      tonnage: UNIT.tonnage,
      techBase: 'INNER_SPHERE',
      path: 'fixture.json',
    }),
  ]);
  global.fetch = jest.fn(
    async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (!url.startsWith('/api/campaigns/'))
        throw new Error(`Unexpected fetch ${url}`);
      const method = init?.method === 'PUT' ? 'PUT' : 'GET';
      const response =
        rejectPut && method === 'PUT'
          ? { status: rejectPut, json: { error: 'injected save refusal' } }
          : await callId(
              method,
              decodeURIComponent(url.split('/').at(-1)!),
              init?.body ? JSON.parse(String(init.body)) : undefined,
              undefined,
              {
                authorization:
                  new Headers(init?.headers).get('Authorization') ?? undefined,
              },
            );
      lastAnswer = response;
      statuses.push(response.status);
      return {
        ok: response.status >= 200 && response.status < 300,
        status: response.status,
        json: async () => response.json,
      } as Response;
    },
  );
});

afterEach(() => {
  useCampaignPersistenceStore.getState().reset();
  resetCampaignStore();
  useCampaignRosterStore.getState().reset();
  global.fetch = originalFetch;
  _resetCampaignHostRegistry();
  _resetActiveCoopHosts();
});

async function seed(coop = false): Promise<ICampaign> {
  const store = getCampaignStore();
  const campaignId = store
    .getState()
    .createCampaign('Salvage regression', 'mercenary');
  const base = store.getState().campaign!;
  const candidate = { ...candidateForBattle(), status: 'awarded' as const };
  const award = {
    side: 'mercenary' as const,
    candidates: [candidate],
    totalValue: candidate.recoveredValue,
    estimatedRepairCost: candidate.repairCostEstimate,
  };
  const root = base.forces.get(base.rootForceId)!;
  const campaign: ICampaign = {
    ...base,
    ...(coop ? { coopSession: createHostCoopSession('SALVAGE') } : {}),
    forces: new Map([[root.id, { ...root, unitIds: ['existing-unit'] }]]),
    salvageAllocations: {
      'salvage-battle': {
        pool: {
          battleId: 'salvage-battle',
          contractId: null,
          candidates: [candidate],
          totalEstimatedValue: candidate.recoveredValue,
          hostileTerritory: false,
        },
        mercenaryAward: award,
        employerAward: {
          side: 'employer',
          candidates: [],
          totalValue: 0,
          estimatedRepairCost: 0,
        },
        splitMethod: 'contract',
        processed: true,
      },
    },
  };
  store.getState().switchCampaign(campaign);
  useCampaignRosterStore.getState().initRoster(campaignId);
  useCampaignRosterStore.getState().addUnit({
    unitId: 'existing-unit',
    unitRef: REF,
    unitSource: 'canonical',
    unitName: 'Existing Atlas',
    chassisVariant: 'AS7-D',
    readiness: 'Ready',
  });
  expect(
    (await useCampaignPersistenceStore.getState().saveCampaign()).status,
  ).toBe('saved');
  if (coop) {
    const read = readCampaign(campaignId);
    if (read.kind !== 'ok') throw new Error(`Expected campaign: ${read.kind}`);
    const bearer = await bearerOf(await mintIdentity('salvage-host'));
    liveEntry = await getCampaignHostRegistry().register('salvage-host-match', {
      campaignId,
      hostPlayerId: bearer.playerId,
      roomCode: 'SALVAGE',
      state: authoritativeStateFromSerializedCampaign(read.record),
    });
    storeCoopCampaignToken({
      matchId: liveEntry.matchId,
      playerId: bearer.playerId,
      wireToken: bearer.wire,
      displayName: 'Salvage host',
    });
    store.getState().switchCampaign({
      ...campaign,
      coopSession: createHostCoopSession('SALVAGE', liveEntry.matchId),
    });
    expect(
      (await useCampaignPersistenceStore.getState().saveCampaign()).status,
    ).toBe('saved');
  }
  return campaign;
}

it('accepts into a nonempty roster, saves through the live PUT route, and reloads recovered damage', async () => {
  const campaign = await seed();
  expect(useCampaignRosterStore.getState().units).toHaveLength(1);
  await setSalvageItemStatus('enemy-atlas', 'accepted');
  const saved = await useCampaignPersistenceStore.getState().saveCampaign();
  if (saved.status !== 'saved')
    throw new Error(
      `accept -> saveCampaign -> PUT: ${JSON.stringify(lastAnswer)}`,
    );
  expect(statuses.at(-1)).toBe(200);
  expect(saved.status).toBe('saved');
  const projected = await replayed(campaign.id);
  expect(projected.rosterUnits['enemy-atlas']).toMatchObject({
    unitRef: REF,
    unitSource: 'canonical',
    status: 'damaged',
  });
  expect(projected.forceUnits?.[campaign.rootForceId]).toContain('enemy-atlas');
  window.localStorage.clear();
  resetCampaignStore();
  useCampaignRosterStore.getState().reset();
  useCampaignPersistenceStore.getState().reset();
  expect(
    await useCampaignPersistenceStore.getState().loadCampaign(campaign.id),
  ).toBe(true);
  expect(
    useCampaignRosterStore.getState().units.map((unit) => unit.unitId),
  ).toEqual(['existing-unit', 'enemy-atlas']);
  expect(
    getCampaignStore().getState().campaign?.unitCombatStates['enemy-atlas'],
  ).toEqual(candidateForBattle().recovery?.combatState);
});

it.each([false, true])(
  'keeps awarded salvage reviewable until acceptance and refuses decline after reload (co-op: %s)',
  async (coop) => {
    const campaign = await seed(coop);
    expect(
      selectSalvageBay(getCampaignStore().getState().campaign)[0].status,
    ).toBe('pending');
    expect(
      (await setSalvageItemStatus('enemy-atlas', 'accepted')).applied,
    ).toBe(true);
    expect(
      selectSalvageBay(getCampaignStore().getState().campaign)[0].status,
    ).toBe('accepted');
    window.localStorage.clear();
    resetCampaignStore();
    useCampaignRosterStore.getState().reset();
    useCampaignPersistenceStore.getState().reset();
    expect(
      await useCampaignPersistenceStore.getState().loadCampaign(campaign.id),
    ).toBe(true);
    const before = getCampaignStore().getState().campaign;
    const requests = statuses.length;
    expect(await setSalvageItemStatus('enemy-atlas', 'declined')).toMatchObject(
      { applied: false, reason: expect.any(String) },
    );
    expect(getCampaignStore().getState().campaign).toBe(before);
    expect(statuses).toHaveLength(requests);
    expect(selectSalvageBay(before)[0].status).toBe('accepted');
    expect(
      (await replayed(campaign.id)).forceUnits?.[campaign.rootForceId],
    ).toContain('enemy-atlas');
  },
);

it.each(['accepted', 'declined'] as const)(
  'refuses a guest %s decision without a save',
  async (decision) => {
    const campaign = await seed();
    getCampaignStore()
      .getState()
      .switchCampaign({
        ...campaign,
        coopSession: {
          mode: 'guest',
          roomCode: 'SALVAGE',
          hostMatchId: 'host-match',
        },
      });
    const before = getCampaignStore().getState().campaign;
    const requests = statuses.length;
    expect(await setSalvageItemStatus('enemy-atlas', decision)).toMatchObject({
      applied: false,
      reason: expect.any(String),
    });
    expect(getCampaignStore().getState().campaign).toBe(before);
    expect(statuses).toHaveLength(requests);
  },
);

it.each([false, true])(
  'co-op acceptance retains force membership (reload without child store: %s)',
  async (reload) => {
    const campaign = await seed(true);
    if (reload) {
      window.localStorage.clear();
      resetCampaignStore();
      useCampaignRosterStore.getState().reset();
      useCampaignPersistenceStore.getState().reset();
      expect(
        await useCampaignPersistenceStore.getState().loadCampaign(campaign.id),
      ).toBe(true);
      // Persisted-store rehydration can leave the child store unattached.
      getCampaignStore().setState({ forcesStore: null });
    }
    expect(
      useCampaignRosterStore.getState().units.map((unit) => unit.unitId),
    ).toEqual(['existing-unit']);
    await setSalvageItemStatus('enemy-atlas', 'accepted');
    expect(
      (await useCampaignPersistenceStore.getState().saveCampaign()).status,
    ).toBe('saved');
    const current = getCampaignStore().getState();
    expect(current.campaign?.forces.get(campaign.rootForceId)?.unitIds).toEqual(
      ['existing-unit', 'enemy-atlas'],
    );
    if (!reload)
      expect(
        current.forcesStore?.getState().getForce(campaign.rootForceId)?.unitIds,
      ).toEqual(['existing-unit', 'enemy-atlas']);
    expect(
      (await replayed(campaign.id)).forceUnits?.[campaign.rootForceId],
    ).toContain('enemy-atlas');
    expect(liveEntry?.host.getState().rosterUnits['enemy-atlas']).toMatchObject(
      { unitRef: REF },
    );
  },
);

it('accepting twice preserves one roster entry, one force membership, and recovered damage', async () => {
  const campaign = await seed();
  await Promise.all([
    setSalvageItemStatus('enemy-atlas', 'accepted'),
    setSalvageItemStatus('enemy-atlas', 'accepted'),
  ]);
  expect(
    useCampaignRosterStore
      .getState()
      .units.filter((unit) => unit.unitId === 'enemy-atlas'),
  ).toHaveLength(1);
  expect(
    getCampaignStore().getState().campaign?.forces.get(campaign.rootForceId)
      ?.unitIds,
  ).toEqual(['existing-unit', 'enemy-atlas']);
  expect(
    getCampaignStore().getState().campaign?.unitCombatStates['enemy-atlas'],
  ).toEqual(candidateForBattle().recovery?.combatState);
});

it.each([false, true])(
  'a failed save leaves no partial enrollment (co-op: %s)',
  async (coop) => {
    const campaign = await seed(coop);
    rejectPut = 500;
    const result = await setSalvageItemStatus('enemy-atlas', 'accepted');
    expect(result.applied).toBe(false);
    expect(
      useCampaignRosterStore.getState().units.map((unit) => unit.unitId),
    ).toEqual(['existing-unit']);
    expect(
      getCampaignStore().getState().campaign?.forces.get(campaign.rootForceId)
        ?.unitIds,
    ).toEqual(['existing-unit']);
    expect(
      getCampaignStore().getState().campaign?.unitCombatStates['enemy-atlas'],
    ).toBeUndefined();
    expect(
      getCampaignStore()
        .getState()
        .forcesStore?.getState()
        .getForce(campaign.rootForceId)?.unitIds,
    ).toEqual(['existing-unit']);
    const cache = JSON.parse(
      window.localStorage.getItem(`campaign-${campaign.id}`)!,
    );
    expect(cache.state.unitCombatStates['enemy-atlas']).toBeUndefined();
    expect(
      (await replayed(campaign.id)).rosterUnits['enemy-atlas'],
    ).toBeUndefined();
  },
);

it.each([false, true])(
  'a real stale-version conflict leaves no partial enrollment (co-op: %s)',
  async (coop) => {
    const campaign = await seed(coop);
    const read = readCampaign(campaign.id);
    if (read.kind !== 'ok') throw new Error('Campaign was not saved');
    const wire = liveEntry
      ? readCoopCampaignToken(liveEntry.matchId)?.wireToken
      : undefined;
    const changed = await callId(
      'PUT',
      campaign.id,
      {
        envelope: {
          ...read.record,
          body: { ...read.record.body, name: 'Changed elsewhere' },
        },
        baseVersion: read.record.version,
      },
      wire,
    );
    expect(changed.status).toBe(200);
    expect(await setSalvageItemStatus('enemy-atlas', 'accepted')).toMatchObject(
      { applied: false, reason: expect.any(String) },
    );
    expect(
      getCampaignStore().getState().campaign?.forces.get(campaign.rootForceId)
        ?.unitIds,
    ).toEqual(['existing-unit']);
    expect(
      useCampaignRosterStore.getState().units.map((unit) => unit.unitId),
    ).toEqual(['existing-unit']);
    expect(
      (await replayed(campaign.id)).rosterUnits['enemy-atlas'],
    ).toBeUndefined();
  },
);

it('a repeated acceptance never resets damage from a later battle', async () => {
  await seed();
  expect((await setSalvageItemStatus('enemy-atlas', 'accepted')).applied).toBe(
    true,
  );
  const campaign = getCampaignStore().getState().campaign!;
  const later = {
    ...campaign.unitCombatStates['enemy-atlas'],
    currentArmorPerLocation: { CT: 0, LT: 0 },
    lastCombatOutcomeId: 'later-battle',
  };
  getCampaignStore()
    .getState()
    .updateCampaign({
      unitCombatStates: { ...campaign.unitCombatStates, 'enemy-atlas': later },
    });
  expect((await setSalvageItemStatus('enemy-atlas', 'accepted')).applied).toBe(
    true,
  );
  expect(
    getCampaignStore().getState().campaign?.unitCombatStates['enemy-atlas'],
  ).toBe(later);
});

it('accepts successive units without losing the first enrollment or child-store synchronization', async () => {
  const campaign = await seed();
  const allocation = campaign.salvageAllocations!['salvage-battle'];
  const second = candidateForBattle('enemy-second');
  getCampaignStore()
    .getState()
    .switchCampaign({
      ...campaign,
      salvageAllocations: {
        'salvage-battle': {
          ...allocation,
          mercenaryAward: {
            ...allocation.mercenaryAward,
            candidates: [...allocation.mercenaryAward.candidates, second],
          },
        },
      },
    });
  expect((await setSalvageItemStatus('enemy-atlas', 'accepted')).applied).toBe(
    true,
  );
  expect((await setSalvageItemStatus('enemy-second', 'accepted')).applied).toBe(
    true,
  );
  expect(
    useCampaignRosterStore.getState().units.map((unit) => unit.unitId),
  ).toEqual(['existing-unit', 'enemy-atlas', 'enemy-second']);
  expect(
    (await replayed(campaign.id)).forceUnits?.[campaign.rootForceId],
  ).toEqual(['enemy-atlas', 'enemy-second', 'existing-unit']);
});

it.each([
  'legacy',
  'custom-unpinned',
  'employer',
  'wrong-roster',
  'missing-root',
  'identity-conflict',
  'guest',
])('refuses %s before making any enrollment writes', async (failure) => {
  const campaign = await seed();
  const allocation = campaign.salvageAllocations!['salvage-battle'];
  const candidate = allocation.mercenaryAward.candidates[0];
  let replacement = candidate;
  if (failure === 'legacy') replacement = { ...candidate, recovery: undefined };
  if (failure === 'custom-unpinned')
    replacement = {
      ...candidate,
      recovery: { ...candidate.recovery!, unitSource: 'custom' },
    };
  if (failure === 'employer')
    replacement = { ...candidate, disposition: 'employer' };
  getCampaignStore()
    .getState()
    .switchCampaign({
      ...campaign,
      ...(failure === 'missing-root' ? { rootForceId: 'absent-root' } : {}),
      ...(failure === 'guest'
        ? {
            coopSession: {
              mode: 'guest' as const,
              roomCode: 'SALVAGE',
              hostMatchId: 'host-match',
            },
          }
        : {}),
      salvageAllocations: {
        'salvage-battle': {
          ...allocation,
          mercenaryAward: {
            ...allocation.mercenaryAward,
            candidates: [replacement],
          },
        },
      },
    });
  if (failure === 'wrong-roster')
    useCampaignRosterStore.getState().initRoster('different-campaign');
  if (failure === 'identity-conflict')
    useCampaignRosterStore.getState().addUnit({
      unitId: 'enemy-atlas',
      unitRef: 'different-ref',
      unitSource: 'canonical',
      unitName: 'Existing other design',
      chassisVariant: 'Other',
      readiness: 'Ready',
    });
  const before = getCampaignStore().getState().campaign;
  const beforeRoster = useCampaignRosterStore.getState().units;
  const requests = statuses.length;
  expect(await setSalvageItemStatus('enemy-atlas', 'accepted')).toMatchObject({
    applied: false,
    reason: expect.any(String),
  });
  expect(getCampaignStore().getState().campaign).toBe(before);
  expect(useCampaignRosterStore.getState().units).toBe(beforeRoster);
  expect(statuses).toHaveLength(requests);
});

it('can retry acceptance after a save failure without leaving a stale force projection', async () => {
  await seed();
  rejectPut = 500;
  expect((await setSalvageItemStatus('enemy-atlas', 'accepted')).applied).toBe(
    false,
  );
  rejectPut = undefined;
  expect((await setSalvageItemStatus('enemy-atlas', 'accepted')).applied).toBe(
    true,
  );
  expect(
    useCampaignRosterStore.getState().units.map((unit) => unit.unitId),
  ).toEqual(['existing-unit', 'enemy-atlas']);
});

it('a local commit exception restores roster and force membership before any PUT', async () => {
  const campaign = await seed();
  const requests = statuses.length;
  const forces = getCampaignStore().getState().forcesStore!;
  jest.spyOn(forces.getState(), 'updateForce').mockImplementationOnce(() => {
    throw new Error('injected force write failure');
  });
  expect(await setSalvageItemStatus('enemy-atlas', 'accepted')).toMatchObject({
    applied: false,
    reason: expect.any(String),
  });
  expect(
    useCampaignRosterStore.getState().units.map((unit) => unit.unitId),
  ).toEqual(['existing-unit']);
  expect(
    getCampaignStore().getState().campaign?.forces.get(campaign.rootForceId)
      ?.unitIds,
  ).toEqual(['existing-unit']);
  expect(statuses).toHaveLength(requests);
});
