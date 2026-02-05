/**
 * Pilot Store Tests
 *
 * Tests for usePilotStore Zustand store with mocked API responses.
 */

import { act, renderHook, waitFor } from '@testing-library/react';

import type {
  IPilot,
  ICreatePilotOptions,
  IPilotIdentity,
} from '@/types/pilot';

import { PilotStatus, PilotType, PilotExperienceLevel } from '@/types/pilot';

import {
  usePilotStore,
  useFilteredPilots,
  usePilotById,
} from '../usePilotStore';

// =============================================================================
// Test Data
// =============================================================================

const createMockPilot = (overrides: Partial<IPilot> = {}): IPilot => ({
  id: `pilot-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
  name: 'Test Pilot',
  callsign: 'Tester',
  type: PilotType.Persistent,
  status: PilotStatus.Active,
  skills: { gunnery: 4, piloting: 5 },
  wounds: 0,
  abilities: [],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides,
});

const mockPilots: IPilot[] = [
  createMockPilot({
    id: 'pilot-1',
    name: 'John Doe',
    callsign: 'Ace',
    status: PilotStatus.Active,
  }),
  createMockPilot({
    id: 'pilot-2',
    name: 'Jane Smith',
    callsign: 'Viper',
    status: PilotStatus.Active,
  }),
  createMockPilot({
    id: 'pilot-3',
    name: 'Bob Wilson',
    callsign: 'Ghost',
    status: PilotStatus.Injured,
  }),
  createMockPilot({
    id: 'pilot-4',
    name: 'Alice Brown',
    callsign: 'Storm',
    status: PilotStatus.KIA,
  }),
];

// =============================================================================
// Mock Setup
// =============================================================================

// Mock fetch globally
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Helper to set up fetch mock responses
function mockFetchResponse(response: unknown, ok = true, status = 200) {
  mockFetch.mockResolvedValueOnce({
    ok,
    status,
    statusText: ok ? 'OK' : 'Error',
    json: async () => response,
  });
}

function mockFetchError(message: string) {
  mockFetch.mockRejectedValueOnce(new Error(message));
}

// Reset store and mocks before each test
beforeEach(() => {
  mockFetch.mockClear();
  usePilotStore.setState({
    pilots: [],
    selectedPilotId: null,
    isLoading: false,
    error: null,
    showActiveOnly: false,
    searchQuery: '',
  });
});

// =============================================================================
// Tests
// =============================================================================

describe('usePilotStore', () => {
  // ===========================================================================
  // loadPilots
  // ===========================================================================

  describe('loadPilots', () => {
    it('should load pilots from API', async () => {
      mockFetchResponse({ pilots: mockPilots, count: mockPilots.length });

      const { result } = renderHook(() => usePilotStore());

      await act(async () => {
        await result.current.loadPilots();
      });

      expect(result.current.pilots).toHaveLength(4);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('should set loading state during fetch', async () => {
      let resolvePromise: (value: unknown) => void;
      const promise = new Promise((resolve) => {
        resolvePromise = resolve;
      });

      mockFetch.mockReturnValueOnce(
        promise.then(() => ({
          ok: true,
          json: async () => ({ pilots: mockPilots, count: mockPilots.length }),
        })),
      );

      const { result } = renderHook(() => usePilotStore());

      // Start loading (don't await)
      act(() => {
        result.current.loadPilots();
      });

      // Should be loading
      expect(result.current.isLoading).toBe(true);

      // Resolve the promise
      await act(async () => {
        resolvePromise!(null);
        await promise;
      });

      // Should be done loading
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });

    it('should handle API error response', async () => {
      mockFetchResponse({}, false, 500);

      const { result } = renderHook(() => usePilotStore());

      await act(async () => {
        await result.current.loadPilots();
      });

      expect(result.current.error).toContain('Failed to load pilots');
      expect(result.current.isLoading).toBe(false);
    });

    it('should handle network error', async () => {
      mockFetchError('Network error');

      const { result } = renderHook(() => usePilotStore());

      await act(async () => {
        await result.current.loadPilots();
      });

      expect(result.current.error).toBe('Network error');
      expect(result.current.isLoading).toBe(false);
    });
  });

  // ===========================================================================
  // createPilot
  // ===========================================================================

  describe('createPilot', () => {
    it('should create pilot and reload list', async () => {
      const newPilot = createMockPilot({
        id: 'new-pilot-1',
        name: 'New Pilot',
      });

      // Mock create response
      mockFetchResponse({ success: true, id: newPilot.id, pilot: newPilot });
      // Mock reload response
      mockFetchResponse({ pilots: [newPilot], count: 1 });

      const { result } = renderHook(() => usePilotStore());

      const options: ICreatePilotOptions = {
        identity: { name: 'New Pilot', callsign: 'Rookie' },
        type: PilotType.Persistent,
        skills: { gunnery: 4, piloting: 5 },
      };

      let createdId: string | null = null;
      await act(async () => {
        createdId = await result.current.createPilot(options);
      });

      expect(createdId).toBe(newPilot.id);
      expect(result.current.selectedPilotId).toBe(newPilot.id);
      expect(result.current.pilots).toHaveLength(1);
    });

    it('should handle create failure', async () => {
      mockFetchResponse({ success: false, error: 'Validation failed' });

      const { result } = renderHook(() => usePilotStore());

      let createdId: string | null = null;
      await act(async () => {
        createdId = await result.current.createPilot({
          identity: { name: '' },
          type: PilotType.Persistent,
          skills: { gunnery: 4, piloting: 5 },
        });
      });

      expect(createdId).toBeNull();
      expect(result.current.error).toBe('Validation failed');
    });

    it('should handle network error during create', async () => {
      mockFetchError('Connection refused');

      const { result } = renderHook(() => usePilotStore());

      let createdId: string | null = null;
      await act(async () => {
        createdId = await result.current.createPilot({
          identity: { name: 'Test' },
          type: PilotType.Persistent,
          skills: { gunnery: 4, piloting: 5 },
        });
      });

      expect(createdId).toBeNull();
      expect(result.current.error).toBe('Connection refused');
    });
  });

  // ===========================================================================
  // createFromTemplate
  // ===========================================================================

  describe('createFromTemplate', () => {
    it('should create pilot from experience template', async () => {
      const newPilot = createMockPilot({
        id: 'template-pilot-1',
        name: 'Veteran Pilot',
        skills: { gunnery: 3, piloting: 4 },
      });

      mockFetchResponse({ success: true, id: newPilot.id, pilot: newPilot });
      mockFetchResponse({ pilots: [newPilot], count: 1 });

      const { result } = renderHook(() => usePilotStore());

      const identity: IPilotIdentity = {
        name: 'Veteran Pilot',
        callsign: 'Vet',
      };

      let createdId: string | null = null;
      await act(async () => {
        createdId = await result.current.createFromTemplate(
          PilotExperienceLevel.Veteran,
          identity,
        );
      });

      expect(createdId).toBe(newPilot.id);
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/pilots',
        expect.objectContaining({
          method: 'POST',
          // oxlint-disable-next-line @typescript-eslint/no-unsafe-assignment
          body: expect.stringContaining('template'),
        }),
      );
    });
  });

  // ===========================================================================
  // createRandom
  // ===========================================================================

  describe('createRandom', () => {
    it('should create random pilot', async () => {
      const newPilot = createMockPilot({
        id: 'random-pilot-1',
        name: 'Random Pilot',
      });

      mockFetchResponse({ success: true, id: newPilot.id, pilot: newPilot });
      mockFetchResponse({ pilots: [newPilot], count: 1 });

      const { result } = renderHook(() => usePilotStore());

      let createdId: string | null = null;
      await act(async () => {
        createdId = await result.current.createRandom({ name: 'Random Pilot' });
      });

      expect(createdId).toBe(newPilot.id);
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/pilots',
        expect.objectContaining({
          method: 'POST',
          // oxlint-disable-next-line @typescript-eslint/no-unsafe-assignment
          body: expect.stringContaining('random'),
        }),
      );
    });
  });

  // ===========================================================================
  // createStatblock
  // ===========================================================================

  describe('createStatblock', () => {
    it('should create statblock pilot in memory (no API call)', () => {
      const { result } = renderHook(() => usePilotStore());

      let pilot: IPilot | null = null;
      act(() => {
        pilot = result.current.createStatblock({
          name: 'Statblock Pilot',
          gunnery: 3,
          piloting: 4,
          abilityIds: ['ability-1'],
        });
      });

      expect(pilot).toBeDefined();
      expect(pilot!.name).toBe('Statblock Pilot');
      expect(pilot!.type).toBe(PilotType.Statblock);
      expect(pilot!.skills.gunnery).toBe(3);
      expect(pilot!.skills.piloting).toBe(4);
      expect(pilot!.abilities).toHaveLength(1);
      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  // ===========================================================================
  // updatePilot
  // ===========================================================================

  describe('updatePilot', () => {
    it('should update pilot and reload list', async () => {
      const updatedPilot = createMockPilot({
        id: 'pilot-1',
        name: 'Updated Name',
      });

      mockFetchResponse({ success: true, pilot: updatedPilot });
      mockFetchResponse({ pilots: [updatedPilot], count: 1 });

      const { result } = renderHook(() => usePilotStore());

      let success = false;
      await act(async () => {
        success = await result.current.updatePilot('pilot-1', {
          name: 'Updated Name',
        });
      });

      expect(success).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/pilots/pilot-1',
        expect.objectContaining({
          method: 'PUT',
        }),
      );
    });

    it('should handle update failure', async () => {
      mockFetchResponse({ success: false, error: 'Pilot not found' });

      const { result } = renderHook(() => usePilotStore());

      let success = false;
      await act(async () => {
        success = await result.current.updatePilot('nonexistent', {
          name: 'Test',
        });
      });

      expect(success).toBe(false);
      expect(result.current.error).toBe('Pilot not found');
    });
  });

  // ===========================================================================
  // deletePilot
  // ===========================================================================

  describe('deletePilot', () => {
    it('should delete pilot and reload list', async () => {
      mockFetchResponse({ success: true });
      mockFetchResponse({ pilots: [], count: 0 });

      const { result } = renderHook(() => usePilotStore());

      let success = false;
      await act(async () => {
        success = await result.current.deletePilot('pilot-1');
      });

      expect(success).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/pilots/pilot-1',
        expect.objectContaining({
          method: 'DELETE',
        }),
      );
    });

    it('should clear selection if deleted pilot was selected', async () => {
      usePilotStore.setState({ selectedPilotId: 'pilot-1' });

      mockFetchResponse({ success: true });
      mockFetchResponse({ pilots: [], count: 0 });

      const { result } = renderHook(() => usePilotStore());

      expect(result.current.selectedPilotId).toBe('pilot-1');

      await act(async () => {
        await result.current.deletePilot('pilot-1');
      });

      expect(result.current.selectedPilotId).toBeNull();
    });

    it('should handle delete failure', async () => {
      mockFetchResponse({ success: false, error: 'Cannot delete' });

      const { result } = renderHook(() => usePilotStore());

      let success = false;
      await act(async () => {
        success = await result.current.deletePilot('pilot-1');
      });

      expect(success).toBe(false);
      expect(result.current.error).toBe('Cannot delete');
    });
  });

  // ===========================================================================
  // selectPilot / getSelectedPilot
  // ===========================================================================

  describe('selectPilot and getSelectedPilot', () => {
    it('should select and retrieve pilot', () => {
      usePilotStore.setState({ pilots: mockPilots });

      const { result } = renderHook(() => usePilotStore());

      act(() => {
        result.current.selectPilot('pilot-2');
      });

      expect(result.current.selectedPilotId).toBe('pilot-2');

      const selected = result.current.getSelectedPilot();
      expect(selected).toBeDefined();
      expect(selected?.name).toBe('Jane Smith');
    });

    it('should return null for no selection', () => {
      const { result } = renderHook(() => usePilotStore());

      const selected = result.current.getSelectedPilot();
      expect(selected).toBeNull();
    });

    it('should return null for invalid selection', () => {
      usePilotStore.setState({
        pilots: mockPilots,
        selectedPilotId: 'nonexistent',
      });

      const { result } = renderHook(() => usePilotStore());

      const selected = result.current.getSelectedPilot();
      expect(selected).toBeNull();
    });

    it('should clear selection with null', () => {
      usePilotStore.setState({ selectedPilotId: 'pilot-1' });

      const { result } = renderHook(() => usePilotStore());

      act(() => {
        result.current.selectPilot(null);
      });

      expect(result.current.selectedPilotId).toBeNull();
    });
  });

  // ===========================================================================
  // improveGunnery / improvePiloting
  // ===========================================================================

  describe('improveGunnery', () => {
    it('should call improve-gunnery endpoint', async () => {
      mockFetchResponse({ success: true });
      mockFetchResponse({ pilots: mockPilots, count: mockPilots.length });

      const { result } = renderHook(() => usePilotStore());

      let success = false;
      await act(async () => {
        success = await result.current.improveGunnery('pilot-1');
      });

      expect(success).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/pilots/pilot-1/improve-gunnery',
        expect.objectContaining({
          method: 'POST',
        }),
      );
    });

    it('should handle improvement failure', async () => {
      mockFetchResponse({ success: false, error: 'Insufficient XP' });

      const { result } = renderHook(() => usePilotStore());

      let success = false;
      await act(async () => {
        success = await result.current.improveGunnery('pilot-1');
      });

      expect(success).toBe(false);
      expect(result.current.error).toBe('Insufficient XP');
    });
  });

  describe('improvePiloting', () => {
    it('should call improve-piloting endpoint', async () => {
      mockFetchResponse({ success: true });
      mockFetchResponse({ pilots: mockPilots, count: mockPilots.length });

      const { result } = renderHook(() => usePilotStore());

      let success = false;
      await act(async () => {
        success = await result.current.improvePiloting('pilot-1');
      });

      expect(success).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/pilots/pilot-1/improve-piloting',
        expect.objectContaining({
          method: 'POST',
        }),
      );
    });
  });

  // ===========================================================================
  // purchaseAbility
  // ===========================================================================

  describe('purchaseAbility', () => {
    it('should call purchase-ability endpoint', async () => {
      mockFetchResponse({ success: true });
      mockFetchResponse({ pilots: mockPilots, count: mockPilots.length });

      const { result } = renderHook(() => usePilotStore());

      let success = false;
      await act(async () => {
        success = await result.current.purchaseAbility(
          'pilot-1',
          'ability-1',
          100,
        );
      });

      expect(success).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/pilots/pilot-1/purchase-ability',
        expect.objectContaining({
          method: 'POST',
          // oxlint-disable-next-line @typescript-eslint/no-unsafe-assignment
          body: expect.stringContaining('ability-1'),
        }),
      );
    });

    it('should handle purchase failure', async () => {
      mockFetchResponse({ success: false, error: 'Prerequisite not met' });

      const { result } = renderHook(() => usePilotStore());

      let success = false;
      await act(async () => {
        success = await result.current.purchaseAbility(
          'pilot-1',
          'advanced-ability',
          200,
        );
      });

      expect(success).toBe(false);
      expect(result.current.error).toBe('Prerequisite not met');
    });
  });

  // ===========================================================================
  // applyWound / healWounds
  // ===========================================================================

  describe('applyWound', () => {
    it('should apply wound and update status', async () => {
      usePilotStore.setState({ pilots: mockPilots });

      mockFetchResponse({ success: true });
      mockFetchResponse({ pilots: mockPilots, count: mockPilots.length });

      const { result } = renderHook(() => usePilotStore());

      let success = false;
      await act(async () => {
        success = await result.current.applyWound('pilot-1');
      });

      expect(success).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/pilots/pilot-1',
        expect.objectContaining({
          method: 'PUT',
          // oxlint-disable-next-line @typescript-eslint/no-unsafe-assignment
          body: expect.stringContaining('wounds'),
        }),
      );
    });

    it('should handle pilot not found', async () => {
      usePilotStore.setState({ pilots: [] });

      const { result } = renderHook(() => usePilotStore());

      let success = false;
      await act(async () => {
        success = await result.current.applyWound('nonexistent');
      });

      expect(success).toBe(false);
      expect(result.current.error).toBe('Pilot not found');
    });
  });

  describe('healWounds', () => {
    it('should heal wounds and set active status', async () => {
      const injuredPilot = createMockPilot({
        id: 'pilot-injured',
        status: PilotStatus.Injured,
        wounds: 3,
      });
      usePilotStore.setState({ pilots: [injuredPilot] });

      mockFetchResponse({ success: true });
      mockFetchResponse({ pilots: [injuredPilot], count: 1 });

      const { result } = renderHook(() => usePilotStore());

      let success = false;
      await act(async () => {
        success = await result.current.healWounds('pilot-injured');
      });

      expect(success).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/pilots/pilot-injured',
        expect.objectContaining({
          method: 'PUT',
          // oxlint-disable-next-line @typescript-eslint/no-unsafe-assignment
          body: expect.stringContaining('"wounds":0'),
        }),
      );
    });

    it('should not heal KIA pilots', async () => {
      const kiaPilot = createMockPilot({
        id: 'pilot-kia',
        status: PilotStatus.KIA,
        wounds: 6,
      });
      usePilotStore.setState({ pilots: [kiaPilot] });

      const { result } = renderHook(() => usePilotStore());

      let success = false;
      await act(async () => {
        success = await result.current.healWounds('pilot-kia');
      });

      expect(success).toBe(false);
      expect(result.current.error).toBe('Cannot heal a KIA pilot');
    });
  });

  // ===========================================================================
  // Filter Actions
  // ===========================================================================

  describe('filter actions', () => {
    it('should set showActiveOnly filter', () => {
      const { result } = renderHook(() => usePilotStore());

      act(() => {
        result.current.setShowActiveOnly(true);
      });

      expect(result.current.showActiveOnly).toBe(true);
    });

    it('should set search query', () => {
      const { result } = renderHook(() => usePilotStore());

      act(() => {
        result.current.setSearchQuery('test query');
      });

      expect(result.current.searchQuery).toBe('test query');
    });

    it('should clear error', () => {
      usePilotStore.setState({ error: 'Some error' });

      const { result } = renderHook(() => usePilotStore());

      expect(result.current.error).toBe('Some error');

      act(() => {
        result.current.clearError();
      });

      expect(result.current.error).toBeNull();
    });
  });
});

// =============================================================================
// Selector Tests
// =============================================================================

describe('useFilteredPilots', () => {
  beforeEach(() => {
    usePilotStore.setState({
      pilots: mockPilots,
      showActiveOnly: false,
      searchQuery: '',
    });
  });

  it('should return all pilots when no filters applied', () => {
    const { result } = renderHook(() => useFilteredPilots());

    expect(result.current).toHaveLength(4);
  });

  it('should filter by active status', () => {
    usePilotStore.setState({ showActiveOnly: true });

    const { result } = renderHook(() => useFilteredPilots());

    expect(result.current).toHaveLength(2);
    expect(result.current.every((p) => p.status === PilotStatus.Active)).toBe(
      true,
    );
  });

  it('should filter by search query (name)', () => {
    usePilotStore.setState({ searchQuery: 'john' });

    const { result } = renderHook(() => useFilteredPilots());

    expect(result.current).toHaveLength(1);
    expect(result.current[0].name).toBe('John Doe');
  });

  it('should filter by search query (callsign)', () => {
    usePilotStore.setState({ searchQuery: 'viper' });

    const { result } = renderHook(() => useFilteredPilots());

    expect(result.current).toHaveLength(1);
    expect(result.current[0].callsign).toBe('Viper');
  });

  it('should combine filters', () => {
    // Only active pilots matching search
    const pilotsWithAffiliation = mockPilots.map((p, i) => ({
      ...p,
      affiliation: i < 2 ? 'House Steiner' : 'House Davion',
    }));
    usePilotStore.setState({
      pilots: pilotsWithAffiliation,
      showActiveOnly: true,
      searchQuery: 'steiner',
    });

    const { result } = renderHook(() => useFilteredPilots());

    expect(result.current).toHaveLength(2);
  });

  it('should handle empty search query', () => {
    usePilotStore.setState({ searchQuery: '   ' });

    const { result } = renderHook(() => useFilteredPilots());

    expect(result.current).toHaveLength(4);
  });
});

describe('usePilotById', () => {
  beforeEach(() => {
    usePilotStore.setState({ pilots: mockPilots });
  });

  it('should return pilot by ID', () => {
    const { result } = renderHook(() => usePilotById('pilot-2'));

    expect(result.current).toBeDefined();
    expect(result.current?.name).toBe('Jane Smith');
  });

  it('should return null for null ID', () => {
    const { result } = renderHook(() => usePilotById(null));

    expect(result.current).toBeNull();
  });

  it('should return null for nonexistent ID', () => {
    const { result } = renderHook(() => usePilotById('nonexistent'));

    expect(result.current).toBeNull();
  });
});
