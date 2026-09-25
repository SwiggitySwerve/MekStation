/**
 * U22a clause (1): the match host registry and its boot-recovery flag
 * live in ONE globalThis slot, so Next's API module graph (the rewind
 * commit route) and the socket runtime's tsx graph (server.js) see the
 * same live hosts, and boot recovery runs once per process.
 *
 * jest.isolateModules stands in for the second module graph, the way
 * getDefaultMatchStore.test.ts pins the match store's slot.
 */

import type { IMatchStore } from '../IMatchStore';

import {
  _resetDefaultMatchStore,
  _setDefaultMatchStoreForTests,
} from '../getDefaultMatchStore';

type RegistryModule = typeof import('../MatchHostRegistry');

/** Loads MatchHostRegistry in a fresh module graph and returns its exports. */
function loadRegistryModuleInNewGraph(): RegistryModule {
  let loaded: RegistryModule | undefined;
  jest.isolateModules(() => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    loaded = require('../MatchHostRegistry') as RegistryModule;
  });
  if (!loaded) {
    throw new Error('isolated MatchHostRegistry load returned nothing');
  }
  return loaded;
}

describe('MatchHostRegistry process slot', () => {
  let listActiveMatches: jest.Mock;

  beforeEach(() => {
    // A recoverable store stub: boot recovery enumerates the store
    // through listActiveMatches and finds nothing, so each call counts
    // one recovery sweep in this process.
    listActiveMatches = jest.fn(async () => []);
    _setDefaultMatchStoreForTests({
      listActiveMatches,
    } as unknown as IMatchStore);
  });

  afterEach(() => {
    loadRegistryModuleInNewGraph()._resetMatchHostRegistry();
    _resetDefaultMatchStore();
  });

  it('two module graphs get one registry', () => {
    const apiGraph = loadRegistryModuleInNewGraph();
    const socketGraph = loadRegistryModuleInNewGraph();

    expect(apiGraph.getMatchHostRegistry()).toBe(
      socketGraph.getMatchHostRegistry(),
    );
  });

  it('boot recovery sweeps once per process, whichever graph asks', async () => {
    await loadRegistryModuleInNewGraph().bootstrapMultiplayerServer();
    await loadRegistryModuleInNewGraph().bootstrapMultiplayerServer();

    expect(listActiveMatches).toHaveBeenCalledTimes(1);
  });

  it('_resetMatchHostRegistry clears the shared slot for every graph', async () => {
    const graph = loadRegistryModuleInNewGraph();
    const before = graph.getMatchHostRegistry();
    await graph.bootstrapMultiplayerServer();

    loadRegistryModuleInNewGraph()._resetMatchHostRegistry();

    expect(graph.getMatchHostRegistry()).not.toBe(before);
    await graph.bootstrapMultiplayerServer();
    expect(listActiveMatches).toHaveBeenCalledTimes(2);
  });
});
