/**
 * U95: the campaign host registry lives in ONE globalThis slot, so Next's
 * API module graph (the match create route registers into it) and the
 * socket runtime's tsx graph (server.js; bindCampaignSyncConnection looks
 * entries up in it) see the same entries.
 *
 * jest.isolateModules stands in for the second module graph, the way
 * MatchHostRegistry.globalSlot.test.ts pins the match host registry's slot.
 */

import { createEmptyCampaignState } from '@/types/campaign/CampaignSync';

type RegistryModule = typeof import('../CampaignHostRegistry');

/** Loads CampaignHostRegistry in a fresh module graph and returns its exports. */
function loadRegistryModuleInNewGraph(): RegistryModule {
  let loaded: RegistryModule | undefined;
  jest.isolateModules(() => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    loaded = require('../CampaignHostRegistry') as RegistryModule;
  });
  if (!loaded) {
    throw new Error('isolated CampaignHostRegistry load returned nothing');
  }
  return loaded;
}

/** A minimal co-op campaign registration, as the create route sends one. */
function snapshot() {
  return {
    campaignId: 'campaign-slot',
    hostPlayerId: 'pid_host',
    roomCode: 'ABC234',
    state: createEmptyCampaignState('campaign-slot'),
  };
}

describe('CampaignHostRegistry process slot', () => {
  afterEach(() => {
    loadRegistryModuleInNewGraph()._resetCampaignHostRegistry();
  });

  it('two module graphs get one registry', () => {
    const apiGraph = loadRegistryModuleInNewGraph();
    const socketGraph = loadRegistryModuleInNewGraph();

    expect(apiGraph.getCampaignHostRegistry()).toBe(
      socketGraph.getCampaignHostRegistry(),
    );
  });

  it('the socket graph finds the entry the API graph registered', async () => {
    const apiGraph = loadRegistryModuleInNewGraph();
    const socketGraph = loadRegistryModuleInNewGraph();

    const entry = await apiGraph
      .getCampaignHostRegistry()
      .register('match-slot', snapshot());

    expect(socketGraph.getCampaignHostRegistry().get('match-slot')).toBe(entry);
  });

  it('_resetCampaignHostRegistry closes the entries and clears the slot for every graph', async () => {
    const apiGraph = loadRegistryModuleInNewGraph();
    const before = apiGraph.getCampaignHostRegistry();
    const entry = await before.register('match-slot', snapshot());

    loadRegistryModuleInNewGraph()._resetCampaignHostRegistry();

    expect(entry.host.isClosed()).toBe(true);
    expect(apiGraph.getCampaignHostRegistry()).not.toBe(before);
    expect(apiGraph.getCampaignHostRegistry().size()).toBe(0);
  });
});
