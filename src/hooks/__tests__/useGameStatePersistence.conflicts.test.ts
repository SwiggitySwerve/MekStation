import { act, renderHook, waitFor } from '@testing-library/react';

import {
  StoredData,
  useGameStatePersistence,
} from '../useGameStatePersistence';
import {
  mockBeforeUnload,
  mockState,
  mockStorageKey,
  restoreGameStatePersistenceTest,
  setupGameStatePersistenceTest,
} from './useGameStatePersistence.test-helpers';

describe('useGameStatePersistence conflict and edge cases', () => {
  beforeEach(() => {
    setupGameStatePersistenceTest();
  });

  afterAll(() => {
    restoreGameStatePersistenceTest();
  });

  describe('Conflict Detection', () => {
    it('should detect save conflict when localStorage has newer data', async () => {
      const oldTimestamp = Date.now() - 10000;
      const newTimestamp = Date.now();
      const oldEditorState = { ...mockState.editorState, activeTab: 'armor' };
      const newEditorState = { ...mockState.editorState, activeTab: 'weapons' };

      localStorage.setItem(
        mockStorageKey,
        JSON.stringify({
          state: {
            ...mockState,
            editorState: oldEditorState,
            _lastSaved: oldTimestamp,
          },
          metadata: {
            timestamp: oldTimestamp,
            version: '1.0.0',
          },
        }),
      );

      const { result } = renderHook(() =>
        useGameStatePersistence({
          storageKey: mockStorageKey,
          enableAutosave: false,
        }),
      );

      await waitFor(() => {
        expect(result.current.state).toEqual({
          ...mockState,
          editorState: oldEditorState,
        });
      });

      localStorage.setItem(
        mockStorageKey,
        JSON.stringify({
          state: {
            ...mockState,
            editorState: newEditorState,
            _lastSaved: newTimestamp,
          },
          metadata: {
            timestamp: newTimestamp,
            version: '1.0.0',
          },
        }),
      );

      await act(async () => {
        result.current.setState({
          ...mockState,
          editorState: { ...oldEditorState, activeTab: 'equipment' },
        });
      });

      await expect(async () => {
        await act(async () => {
          await result.current.save();
        });
      }).rejects.toThrow('Save conflict');
    });

    it('should allow save when local state is newer', async () => {
      const timestamp = Date.now();

      localStorage.setItem(
        mockStorageKey,
        JSON.stringify({
          state: { ...mockState, _lastSaved: timestamp },
          metadata: {
            timestamp,
            version: '1.0.0',
          },
        }),
      );

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
        result.current.setState({
          ...mockState,
          editorState: { ...mockState.editorState, activeTab: 'equipment' },
        });
      });

      await act(async () => {
        await result.current.save();
      });

      expect(result.current.error).toBeNull();
      expect(result.current.hasUnsavedChanges).toBe(false);
    });
  });

  describe('Unsaved Changes Warning', () => {
    it('should add beforeunload listener when there are unsaved changes', () => {
      const { result } = renderHook(() =>
        useGameStatePersistence({
          storageKey: mockStorageKey,
          enableAutosave: false,
        }),
      );

      expect(mockBeforeUnload).not.toHaveBeenCalled();

      act(() => {
        result.current.setState(mockState);
      });

      expect(result.current.hasUnsavedChanges).toBe(true);
    });

    it('should remove beforeunload listener when changes are saved', async () => {
      const { result } = renderHook(() =>
        useGameStatePersistence({
          storageKey: mockStorageKey,
          enableAutosave: false,
        }),
      );

      act(() => {
        result.current.setState(mockState);
      });

      expect(result.current.hasUnsavedChanges).toBe(true);

      await act(async () => {
        await result.current.save();
      });

      expect(result.current.hasUnsavedChanges).toBe(false);
      expect(window.removeEventListener).toHaveBeenCalled();
    });
  });

  describe('Edge Cases', () => {
    it('should handle null state gracefully', async () => {
      const { result } = renderHook(() =>
        useGameStatePersistence({
          storageKey: mockStorageKey,
          enableAutosave: false,
        }),
      );

      await act(async () => {
        await result.current.save();
      });

      expect(result.current.error).toBeNull();
    });

    it('should handle version upgrades', async () => {
      localStorage.setItem(
        mockStorageKey,
        JSON.stringify({
          state: { ...mockState, _lastSaved: Date.now() },
          metadata: {
            timestamp: Date.now(),
            version: '0.9.0',
          },
        }),
      );

      const { result } = renderHook(() =>
        useGameStatePersistence({
          storageKey: mockStorageKey,
          version: '1.0.0',
          enableAutosave: false,
        }),
      );

      await waitFor(() => {
        expect(result.current.state).toEqual(mockState);
      });

      await act(async () => {
        result.current.setState({
          ...mockState,
          editorState: { ...mockState.editorState, activeTab: 'criticals' },
        });
        await result.current.save();
      });

      const storedData = JSON.parse(
        localStorage.getItem(mockStorageKey)!,
      ) as StoredData;
      expect(storedData.metadata.version).toBe('1.0.0');
    });
  });
});
