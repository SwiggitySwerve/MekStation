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

import { act, renderHook } from '@testing-library/react';

import {
  EncounterStatus,
  ScenarioTemplateType,
  TerrainPreset,
  VictoryConditionType,
  type IEncounter,
} from '@/types/encounter';

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
