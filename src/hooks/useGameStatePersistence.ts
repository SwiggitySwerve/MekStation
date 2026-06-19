import { useState, useCallback, useRef } from 'react';

import { IBattleMech } from '../types/unit/BattleMechInterfaces';
import {
  loadGameStateFromLocalStorage,
  saveGameStateToLocalStorage,
  toPersistenceError,
  useBeforeUnloadWarning,
  useGameStateAutosave,
  useLoadGameState,
} from './useGameStatePersistence.helpers';

/**
 * Game state for persistence
 * Stores the current unit and editor state
 */
export interface GameState {
  /** Currently active unit being edited */
  currentUnit?: IBattleMech;
  /** List of recently edited units (references by ID) */
  recentUnitIds?: string[];
  /** Editor UI state that should be preserved */
  editorState?: {
    activeTab?: string;
    selectedLocation?: string;
    panelState?: Record<string, boolean>;
  };
}

export interface SaveMetadata {
  timestamp: number;
  version: string;
}

/**
 * Internal state stored in localStorage
 * Includes _lastSaved timestamp for conflict detection
 */
interface InternalStoredState extends GameState {
  _lastSaved?: number;
}

export interface StoredData {
  state: InternalStoredState;
  metadata: SaveMetadata;
}

export interface UseGameStatePersistenceOptions {
  /**
   * Key to use for localStorage
   */
  storageKey: string;
  /**
   * Autosave interval in milliseconds (default: 30000 = 30 seconds)
   */
  autosaveInterval?: number;
  /**
   * Debounce delay in milliseconds before autosave after state change (default: 1000)
   */
  autosaveDebounce?: number;
  /**
   * Enable/disable autosave (default: true)
   */
  enableAutosave?: boolean;
  /**
   * Version of the game state schema (for migration)
   */
  version?: string;
}

export interface UseGameStatePersistenceReturn {
  /**
   * Current game state
   */
  state: GameState | null;
  /**
   * Whether state is currently being saved
   */
  isSaving: boolean;
  /**
   * Whether there are unsaved changes
   */
  hasUnsavedChanges: boolean;
  /**
   * Last saved timestamp (null if never saved)
   */
  lastSaved: Date | null;
  /**
   * Error from last save/load operation (null if no error)
   */
  error: Error | null;
  /**
   * Save state manually
   */
  save: () => Promise<void>;
  /**
   * Load state from storage
   */
  load: () => Promise<void>;
  /**
   * Clear all saved data
   */
  clear: () => void;
  /**
   * Update game state (triggers autosave if enabled)
   */
  setState: (state: GameState) => void;
}

const DEFAULT_AUTOSAVE_INTERVAL = 30000; // 30 seconds
const DEFAULT_AUTOSAVE_DEBOUNCE = 1000; // 1 second
const DEFAULT_VERSION = '1.0.0';

/**
 * Hook for persisting game state with autosave, manual save, and conflict detection
 *
 * @example
 * ```tsx
 * const { state, save, load, hasUnsavedChanges, lastSaved } = useGameStatePersistence({
 *   storageKey: 'mekstation-save',
 *   autosaveInterval: 30000,
 *   enableAutosave: true,
 * });
 * ```
 */
export function useGameStatePersistence(
  options: UseGameStatePersistenceOptions,
): UseGameStatePersistenceReturn {
  const {
    storageKey,
    autosaveInterval = DEFAULT_AUTOSAVE_INTERVAL,
    autosaveDebounce = DEFAULT_AUTOSAVE_DEBOUNCE,
    enableAutosave = true,
    version = DEFAULT_VERSION,
  } = options;

  const [state, setState] = useState<GameState | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [error, setError] = useState<Error | null>(null);

  // Refs for tracking changes and debounce timer
  const initialStateRef = useRef<GameState | null>(null);
  const lastSavedTimestampRef = useRef<number>(0);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const autosaveTimerRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * Save state to localStorage with metadata
   */
  const save = useCallback(async () => {
    if (state === null) return;

    setIsSaving(true);
    setError(null);

    try {
      const saved = saveGameStateToLocalStorage({
        state,
        storageKey,
        version,
        initialState: initialStateRef.current,
        lastSavedTimestamp: lastSavedTimestampRef.current,
      });
      setLastSaved(new Date(saved.savedAt));
      setHasUnsavedChanges(false);
      initialStateRef.current = saved.snapshot;
      lastSavedTimestampRef.current = saved.savedAt;
    } catch (err) {
      const error = toPersistenceError(err, 'Failed to save game state');
      setError(error);
      throw error;
    } finally {
      setIsSaving(false);
    }
  }, [state, storageKey, version]);

  /**
   * Load state from localStorage
   */
  const load = useCallback(async () => {
    setError(null);

    try {
      const loaded = loadGameStateFromLocalStorage(storageKey);
      setState(loaded.state);
      setLastSaved(loaded.lastSaved);
      if (!loaded.hasStoredData) return;
      setHasUnsavedChanges(false);
      initialStateRef.current = loaded.snapshot;
      lastSavedTimestampRef.current = loaded.lastSavedTimestamp;
    } catch (err) {
      const error = toPersistenceError(err, 'Failed to load game state');
      setError(error);
      throw error;
    }
  }, [storageKey]);

  /**
   * Clear all saved data from localStorage
   */
  const clear = useCallback(() => {
    localStorage.removeItem(storageKey);
    setState(null);
    setLastSaved(null);
    setHasUnsavedChanges(false);
    initialStateRef.current = null;
    lastSavedTimestampRef.current = 0;
  }, [storageKey]);

  /**
   * Update game state and trigger autosave (if enabled)
   */
  const setStateWithAutosave = useCallback((newState: GameState) => {
    setState(newState);
    setHasUnsavedChanges(true);
  }, []);

  useGameStateAutosave({
    autosaveDebounce,
    autosaveInterval,
    autosaveTimerRef,
    debounceTimerRef,
    enableAutosave,
    hasUnsavedChanges,
    save,
    state,
  });

  // Load saved state on mount
  useLoadGameState(load);

  // Warn before leaving if there are unsaved changes
  useBeforeUnloadWarning(hasUnsavedChanges);

  return {
    state,
    isSaving,
    hasUnsavedChanges,
    lastSaved,
    error,
    save,
    load,
    clear,
    setState: setStateWithAutosave,
  };
}
