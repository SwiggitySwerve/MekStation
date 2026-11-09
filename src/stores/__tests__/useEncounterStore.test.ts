import { act, renderHook } from '@testing-library/react';
/**
 * useEncounterStore — rawForceIds Slot Tests
 *
 * Pin the Phase D contract from `repair-broken-encounter-drafts` PR 2:
 *   - `loadEncounters()` reads `data.rawForceIds` from the API response and
 *     populates the store's `rawForceIds` slot.
 *   - `getEncounterRawForceIds(id)` returns the entry or null if not loaded.
 *   - Older server builds that omit `rawForceIds` from the GET response
 *     leave the slot empty without crashing the loader.
 *
 * @spec openspec/changes/repair-broken-encounter-drafts/specs/game-session-management/spec.md
 *       (Requirement: Encounter List Surfaces Broken-Reference State)
 */

import {
  EncounterStatus,
  ScenarioTemplateType,
  TerrainPreset,
  VictoryConditionType,
  type IEncounter,
} from '@/types/encounter';
import { createGameSession } from '@/utils/gameplay/gameSessionCore';

import type { EncounterStore } from '../useEncounterStoreTypes';

import { useEncounterStore } from '../useEncounterStore';

// =============================================================================
// Fetch mock
// =============================================================================

const mockFetch = jest.fn();
global.fetch = mockFetch as unknown as typeof fetch;

function mockFetchResponse(response: unknown, ok = true, status = 200): void {
  mockFetch.mockResolvedValueOnce({
    ok,
    status,
    statusText: ok ? 'OK' : 'Error',
    json: async () => response,
  });
}

function makeEncounter(id: string, name: string): IEncounter {
  return {
    id,
    name,
    status: EncounterStatus.Draft,
    template: ScenarioTemplateType.Custom,
    playerForce: undefined,
    opponentForce: undefined,
    opForConfig: undefined,
    mapConfig: {
      radius: 6,
      terrain: TerrainPreset.Clear,
      playerDeploymentZone: 'south',
      opponentDeploymentZone: 'north',
    },
    victoryConditions: [{ type: VictoryConditionType.DestroyAll }],
    optionalRules: [],
    createdAt: '2026-04-01T00:00:00.000Z',
    updatedAt: '2026-04-01T00:00:00.000Z',
  };
}

// Reset store + fetch mocks between tests
beforeEach(() => {
  mockFetch.mockClear();
  useEncounterStore.setState({
    encounters: [],
    rawForceIds: {},
    selectedEncounterId: null,
    isLoading: false,
    error: null,
    statusFilter: 'all',
    searchQuery: '',
    validations: new Map(),
  });
});

// =============================================================================
// Suite
// =============================================================================

describe('useEncounterStore — rawForceIds slot', () => {
  it('populates rawForceIds from the API response on loadEncounters', async () => {
    const enc1 = makeEncounter('enc-1', 'First');
    const enc2 = makeEncounter('enc-2', 'Second');
    mockFetchResponse({
      encounters: [enc1, enc2],
      count: 2,
      rawForceIds: {
        'enc-1': { playerForceId: 'force-A', opponentForceId: null },
        'enc-2': { playerForceId: null, opponentForceId: 'force-B' },
      },
    });

    const { result } = renderHook(() => useEncounterStore());
    await act(async () => {
      await result.current.loadEncounters();
    });

    expect(result.current.encounters).toHaveLength(2);
    expect(result.current.rawForceIds).toEqual({
      'enc-1': { playerForceId: 'force-A', opponentForceId: null },
      'enc-2': { playerForceId: null, opponentForceId: 'force-B' },
    });
  });

  it('getEncounterRawForceIds returns the matching entry after load', async () => {
    const enc = makeEncounter('enc-X', 'Single');
    mockFetchResponse({
      encounters: [enc],
      count: 1,
      rawForceIds: {
        'enc-X': { playerForceId: 'f-1', opponentForceId: 'f-2' },
      },
    });

    const { result } = renderHook(() => useEncounterStore());
    await act(async () => {
      await result.current.loadEncounters();
    });

    expect(result.current.getEncounterRawForceIds('enc-X')).toEqual({
      playerForceId: 'f-1',
      opponentForceId: 'f-2',
    });
  });

  it('getEncounterRawForceIds returns null for an unknown id', () => {
    const { result } = renderHook(() => useEncounterStore());
    expect(result.current.getEncounterRawForceIds('missing-id')).toBeNull();
  });

  it('falls back to empty rawForceIds when the API response omits the field', async () => {
    // Server build prior to the PR 2 cutover may not return rawForceIds.
    // The loader must default to {} so the list page degrades gracefully
    // (broken-pill rendering simply no-ops, no crash on undefined access).
    const enc = makeEncounter('enc-legacy', 'Legacy');
    mockFetchResponse({
      encounters: [enc],
      count: 1,
      // rawForceIds intentionally omitted
    });

    const { result } = renderHook(() => useEncounterStore());
    await act(async () => {
      await result.current.loadEncounters();
    });

    expect(result.current.encounters).toHaveLength(1);
    expect(result.current.rawForceIds).toEqual({});
    expect(result.current.getEncounterRawForceIds('enc-legacy')).toBeNull();
  });
});

describe('encounter store lifecycle transport', () => {
  const session = () =>
    createGameSession(
      {
        mapRadius: 6,
        turnLimit: 10,
        victoryConditions: [],
        optionalRules: [],
        encounterId: 'enc-1',
      },
      [],
    );
  it.each(['linkSession', 'completeSession'] as const)(
    'reloads server state after %s',
    async (operation) => {
      const game = session();
      mockFetchResponse({ success: true });
      const expected = {
        ...makeEncounter('enc-1', 'Local'),
        status:
          operation === 'linkSession'
            ? EncounterStatus.Launched
            : EncounterStatus.Completed,
        gameSessionId: game.id,
      };
      mockFetchResponse({ encounters: [expected] });
      expect(await useEncounterStore.getState()[operation](game)).toBe(true);
      expect(mockFetch).toHaveBeenNthCalledWith(
        1,
        '/api/encounters/enc-1/session',
        expect.objectContaining({
          method: operation === 'linkSession' ? 'POST' : 'PATCH',
        }),
      );
      expect(useEncounterStore.getState().encounters).toEqual([expected]);
    },
  );
  it('keeps server state and surfaces a rejected link', async () => {
    mockFetchResponse(
      { success: false, error: 'Already launched' },
      false,
      400,
    );
    expect(await useEncounterStore.getState().linkSession(session())).toBe(
      false,
    );
    expect(useEncounterStore.getState().error).toBe('Already launched');
    expect(useEncounterStore.getState().encounters).toEqual([]);
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });
});

/** @spec openspec/changes/fix-store-mutation-reload-failures/specs/encounter-system/spec.md */
describe('encounter mutation refresh outcomes', () => {
  const encounter = makeEncounter('enc-1', 'Cached encounter');
  const session = createGameSession(
    {
      mapRadius: 6,
      turnLimit: 10,
      victoryConditions: [],
      optionalRules: [],
      encounterId: encounter.id,
    },
    [],
  );
  type MutationResult = boolean | string | readonly string[] | null;
  const mutations: ReadonlyArray<{
    name: string;
    run: (store: EncounterStore) => Promise<MutationResult>;
    success: MutationResult;
    failure: false | null;
  }> = [
    {
      name: 'createEncounter',
      run: (s) => s.createEncounter({ name: 'New encounter' }),
      success: 'new-id',
      failure: null,
    },
    {
      name: 'updateEncounter',
      run: (s) => s.updateEncounter(encounter.id, { name: 'Updated' }),
      success: true,
      failure: false,
    },
    {
      name: 'deleteEncounter',
      run: (s) => s.deleteEncounter(encounter.id),
      success: true,
      failure: false,
    },
    {
      name: 'setPlayerForce',
      run: (s) => s.setPlayerForce(encounter.id, 'force-1'),
      success: true,
      failure: false,
    },
    {
      name: 'clearPlayerForce',
      run: (s) => s.clearPlayerForce(encounter.id),
      success: true,
      failure: false,
    },
    {
      name: 'setOpponentForce',
      run: (s) => s.setOpponentForce(encounter.id, 'force-2'),
      success: true,
      failure: false,
    },
    {
      name: 'clearOpponentForce',
      run: (s) => s.clearOpponentForce(encounter.id),
      success: true,
      failure: false,
    },
    {
      name: 'applyTemplate',
      run: (s) => s.applyTemplate(encounter.id, ScenarioTemplateType.Duel),
      success: true,
      failure: false,
    },
    {
      name: 'seedSampleEncounters',
      run: (s) => s.seedSampleEncounters(),
      success: ['new-id'],
      failure: null,
    },
    {
      name: 'launchEncounter',
      run: (s) => s.launchEncounter(encounter.id),
      success: 'session-id',
      failure: null,
    },
    {
      name: 'cloneEncounter',
      run: (s) => s.cloneEncounter(encounter.id, 'Clone'),
      success: 'new-id',
      failure: null,
    },
    {
      name: 'linkSession',
      run: (s) => s.linkSession(session),
      success: true,
      failure: false,
    },
    {
      name: 'completeSession',
      run: (s) => s.completeSession(session),
      success: true,
      failure: false,
    },
  ];

  beforeEach(() => {
    mockFetch.mockReset();
    useEncounterStore.setState({
      encounters: [encounter],
      selectedEncounterId: encounter.id,
      rawForceIds: {
        [encounter.id]: { playerForceId: 'force-1', opponentForceId: null },
      },
    });
  });

  describe.each(mutations)('$name', ({ name, run, success, failure }) => {
    it.each(['populated', 'empty'] as const)(
      'returns success after a %s reload',
      async (list) => {
        mockFetchResponse({
          success: true,
          id: 'new-id',
          ids: ['new-id'],
          gameSessionId: 'session-id',
        });
        const reloaded =
          list === 'empty' ? [] : [makeEncounter('new-id', 'Reloaded')];
        mockFetchResponse({ encounters: reloaded, count: reloaded.length });

        expect(await run(useEncounterStore.getState())).toEqual(success);
        expect(useEncounterStore.getState().encounters).toEqual(reloaded);
        expect(useEncounterStore.getState().error).toBeNull();
        expect(useEncounterStore.getState().isLoading).toBe(false);
        expect(mockFetch).toHaveBeenCalledTimes(2);
      },
    );

    it.each(['http', 'network', 'json'] as const)(
      'returns failure after a saved mutation and %s reload failure',
      async (fault) => {
        mockFetchResponse({
          success: true,
          id: 'new-id',
          ids: ['new-id'],
          gameSessionId: 'session-id',
        });
        const detail =
          fault === 'http' ? 'Failed to load encounters' : 'Reload unavailable';
        if (fault === 'http') {
          mockFetchResponse({}, false, 503);
        } else if (fault === 'network') {
          mockFetch.mockRejectedValueOnce(new Error(detail));
        } else {
          mockFetch.mockResolvedValueOnce({
            ok: true,
            json: () => Promise.reject(new Error(detail)),
          });
        }

        const result = await run(useEncounterStore.getState());
        const state = useEncounterStore.getState();
        // This wording also covers creation: the server write must not be repeated.
        expect(state.error).toBe(
          `Encounter saved, but the list could not be refreshed. Reload to see it. ${detail}`,
        );
        expect(result).toBe(failure);
        expect(state.isLoading).toBe(false);
        expect(state.encounters).toEqual([encounter]);
        expect(state.rawForceIds).toEqual({
          [encounter.id]: { playerForceId: 'force-1', opponentForceId: null },
        });
        expect(state.selectedEncounterId).toBe(
          name === 'deleteEncounter' ? null : encounter.id,
        );
        expect(mockFetch).toHaveBeenCalledTimes(2);
        expect(mockFetch).toHaveBeenNthCalledWith(2, '/api/encounters');
      },
    );

    it('preserves mutation rejection without reloading or claiming a saved change', async () => {
      mockFetchResponse(
        { success: false, error: 'Mutation rejected' },
        false,
        400,
      );
      expect(await run(useEncounterStore.getState())).toBe(failure);
      expect(useEncounterStore.getState().error).toBe('Mutation rejected');
      expect(useEncounterStore.getState().isLoading).toBe(false);
      expect(useEncounterStore.getState().selectedEncounterId).toBe(
        encounter.id,
      );
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
  });

  it('keeps standalone load failures nonthrowing without claiming a saved mutation', async () => {
    mockFetchResponse({}, false, 503);
    await expect(
      useEncounterStore.getState().loadEncounters(),
    ).resolves.toBeUndefined();
    expect(useEncounterStore.getState().error).toBe(
      'Failed to load encounters',
    );
    expect(useEncounterStore.getState().isLoading).toBe(false);
    expect(useEncounterStore.getState().encounters).toEqual([encounter]);
  });
});
