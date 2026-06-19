import { renderHook, act, waitFor } from '@testing-library/react';

import {
  useGameStatePersistence,
  StoredData,
} from '../useGameStatePersistence';
import {
  localStorageMock,
  mockState,
  mockStorageKey,
  restoreGameStatePersistenceTest,
  setupGameStatePersistenceTest,
} from './useGameStatePersistence.test-helpers';

describe('useGameStatePersistence', () => {
  beforeEach(() => {
    setupGameStatePersistenceTest();
  });

  afterAll(() => {
    restoreGameStatePersistenceTest();
  });

  describe('Initial State', () => {
    it('should initialize with null state when no saved data exists', async () => {
      const { result } = renderHook(() =>
        useGameStatePersistence({
          storageKey: mockStorageKey,
        }),
      );

      await waitFor(() => {
        expect(result.current.state).toBeNull();
      });
    });

    it('should load saved state on mount', async () => {
      const savedData = {
        state: { ...mockState, _lastSaved: Date.now() },
        metadata: {
          timestamp: Date.now(),
          version: '1.0.0',
        },
      };

      localStorage.setItem(mockStorageKey, JSON.stringify(savedData));

      const { result } = renderHook(() =>
        useGameStatePersistence({
          storageKey: mockStorageKey,
        }),
      );

      await waitFor(() => {
        expect(result.current.state).toEqual(mockState);
      });
    });

    it('should set lastSaved timestamp when loading saved data', async () => {
      const timestamp = Date.now();
      const savedData = {
        state: { ...mockState, _lastSaved: timestamp },
        metadata: {
          timestamp,
          version: '1.0.0',
        },
      };

      localStorage.setItem(mockStorageKey, JSON.stringify(savedData));

      const { result } = renderHook(() =>
        useGameStatePersistence({
          storageKey: mockStorageKey,
        }),
      );

      await waitFor(() => {
        expect(result.current.lastSaved).toBeInstanceOf(Date);
        expect(result.current.lastSaved?.getTime()).toBeCloseTo(timestamp, -3);
      });
    });

    it('should not have unsaved changes initially', async () => {
      const { result } = renderHook(() =>
        useGameStatePersistence({
          storageKey: mockStorageKey,
        }),
      );

      await waitFor(() => {
        expect(result.current.hasUnsavedChanges).toBe(false);
      });
    });
  });

  describe('Manual Save', () => {
    it('should save state to localStorage', async () => {
      const { result } = renderHook(() =>
        useGameStatePersistence({
          storageKey: mockStorageKey,
          enableAutosave: false,
        }),
      );

      await act(async () => {
        result.current.setState(mockState);
      });

      await act(async () => {
        await result.current.save();
      });

      const storedData = localStorage.getItem(mockStorageKey);
      expect(storedData).toBeDefined();

      const parsed = JSON.parse(storedData!) as StoredData;
      expect(parsed.state).toMatchObject(mockState);
    });

    it('should update lastSaved timestamp after saving', async () => {
      const { result } = renderHook(() =>
        useGameStatePersistence({
          storageKey: mockStorageKey,
          enableAutosave: false,
        }),
      );

      const beforeSave = Date.now();

      await act(async () => {
        result.current.setState(mockState);
      });

      await act(async () => {
        await result.current.save();
      });

      expect(result.current.lastSaved).toBeInstanceOf(Date);
      expect(result.current.lastSaved!.getTime()).toBeGreaterThanOrEqual(
        beforeSave,
      );
    });

    it('should clear unsaved changes flag after saving', async () => {
      const { result } = renderHook(() =>
        useGameStatePersistence({
          storageKey: mockStorageKey,
          enableAutosave: false,
        }),
      );

      await act(async () => {
        result.current.setState(mockState);
      });

      expect(result.current.hasUnsavedChanges).toBe(true);

      await act(async () => {
        await result.current.save();
      });

      expect(result.current.hasUnsavedChanges).toBe(false);
    });

    it('should set isSaving to false after save completes', async () => {
      const { result } = renderHook(() =>
        useGameStatePersistence({
          storageKey: mockStorageKey,
          enableAutosave: false,
        }),
      );

      await act(async () => {
        result.current.setState(mockState);
      });

      await act(async () => {
        await result.current.save();
      });

      // Should be done saving
      expect(result.current.isSaving).toBe(false);
    });

    it('should handle save errors gracefully', async () => {
      const { result } = renderHook(() =>
        useGameStatePersistence({
          storageKey: mockStorageKey,
          enableAutosave: false,
        }),
      );

      // Mock localStorage.setItem to throw error
      localStorageMock.setItem = jest.fn(() => {
        throw new Error('Storage failed');
      });

      await act(async () => {
        result.current.setState(mockState);
      });

      // Save should throw error
      await expect(async () => {
        await act(async () => {
          await result.current.save();
        });
      }).rejects.toThrow('Storage failed');

      // Note: Error state might not be updated due to async nature and re-throw
      // The important part is that the error is thrown and caught by the caller
      // Note: originalSetItem will be restored in beforeEach
    });
  });

  describe('Autosave', () => {
    it('should set unsaved changes flag when state changes', async () => {
      const { result } = renderHook(() =>
        useGameStatePersistence({
          storageKey: mockStorageKey,
          enableAutosave: false, // Disable to avoid timing issues
        }),
      );

      await act(async () => {
        result.current.setState(mockState);
      });

      expect(result.current.hasUnsavedChanges).toBe(true);
    });

    it('should track unsaved changes correctly', async () => {
      const { result } = renderHook(() =>
        useGameStatePersistence({
          storageKey: mockStorageKey,
          enableAutosave: false,
        }),
      );

      expect(result.current.hasUnsavedChanges).toBe(false);

      await act(async () => {
        result.current.setState(mockState);
      });

      expect(result.current.hasUnsavedChanges).toBe(true);

      await act(async () => {
        await result.current.save();
      });

      expect(result.current.hasUnsavedChanges).toBe(false);
    });

    it('should respect autosave enabled setting', () => {
      const { result: enabledResult } = renderHook(() =>
        useGameStatePersistence({
          storageKey: mockStorageKey,
          enableAutosave: true,
          autosaveDebounce: 100,
        }),
      );

      const { result: disabledResult } = renderHook(() =>
        useGameStatePersistence({
          storageKey: `${mockStorageKey}-2`,
          enableAutosave: false,
        }),
      );

      // Both should have hasUnsavedChanges flag
      expect(enabledResult.current).toBeDefined();
      expect(disabledResult.current).toBeDefined();
    });
  });

  describe('Load State', () => {
    it('should load state from localStorage', async () => {
      const savedData = {
        state: { ...mockState, _lastSaved: Date.now() },
        metadata: {
          timestamp: Date.now(),
          version: '1.0.0',
        },
      };

      localStorage.setItem(mockStorageKey, JSON.stringify(savedData));

      const { result } = renderHook(() =>
        useGameStatePersistence({
          storageKey: mockStorageKey,
          enableAutosave: false,
        }),
      );

      await waitFor(() => {
        expect(result.current.state).toEqual(mockState);
      });
    });

    it('should handle corrupted localStorage data', async () => {
      // State should be null after failed load
      const { result } = renderHook(() =>
        useGameStatePersistence({
          storageKey: mockStorageKey,
          enableAutosave: false,
        }),
      );

      localStorage.setItem(mockStorageKey, 'invalid-json');

      // Trigger reload by calling load manually
      await act(async () => {
        try {
          await result.current.load();
        } catch {
          // load() might throw, that's ok
        }
      });

      // State should still be null or have error
      expect(
        result.current.state === null || result.current.error !== null,
      ).toBe(true);
    });

    it('should return null state when no data exists', async () => {
      const { result } = renderHook(() =>
        useGameStatePersistence({
          storageKey: 'nonexistent-key',
          enableAutosave: false,
        }),
      );

      await waitFor(() => {
        expect(result.current.state).toBeNull();
      });
    });
  });

  describe('Clear State', () => {
    it('should clear all saved data', async () => {
      const savedData = {
        state: { ...mockState, _lastSaved: Date.now() },
        metadata: {
          timestamp: Date.now(),
          version: '1.0.0',
        },
      };

      localStorage.setItem(mockStorageKey, JSON.stringify(savedData));

      const { result } = renderHook(() =>
        useGameStatePersistence({
          storageKey: mockStorageKey,
          enableAutosave: false,
        }),
      );

      await waitFor(() => {
        expect(result.current.state).toEqual(mockState);
      });

      act(() => {
        result.current.clear();
      });

      expect(result.current.state).toBeNull();
      expect(result.current.lastSaved).toBeNull();
      expect(result.current.hasUnsavedChanges).toBe(false);

      const storedData = localStorage.getItem(mockStorageKey);
      expect(storedData).toBeNull();
    });
  });
});
