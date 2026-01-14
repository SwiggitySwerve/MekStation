import { useState, useEffect, useCallback, useRef } from 'react';
import { IBattleMech } from '../types/unit/BattleMechInterfaces';

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
  options: UseGameStatePersistenceOptions
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
    if (state === null) {
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      // Check for conflicts by comparing with existing stored data
      const existingData = localStorage.getItem(storageKey);
      if (existingData) {
        const stored = JSON.parse(existingData) as StoredData;
        const storedTimestamp = new Date(stored.metadata.timestamp).getTime();

        // If existing data is newer than our initial state, we have a conflict
        if (
          initialStateRef.current &&
          storedTimestamp > lastSavedTimestampRef.current
        ) {
          throw new Error(
            'Save conflict: Local storage has newer data than current state'
          );
        }
      }

      // Prepare data with metadata
      const dataToStore: StoredData = {
        state: {
          ...state,
          _lastSaved: Date.now(),
        },
        metadata: {
          timestamp: Date.now(),
          version,
        },
      };

      localStorage.setItem(storageKey, JSON.stringify(dataToStore));
      setLastSaved(new Date());
      setHasUnsavedChanges(false);
      initialStateRef.current = { ...state };
      lastSavedTimestampRef.current = Date.now();
    } catch (err) {
      const error =
        err instanceof Error
          ? err
          : new Error('Failed to save game state');
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
      const storedData = localStorage.getItem(storageKey);
      if (!storedData) {
        // No saved data exists
        setState(null);
        setLastSaved(null);
        return;
      }

      const parsed = JSON.parse(storedData) as StoredData;

      // Remove internal metadata from state before setting it
      const { _lastSaved, ...cleanState } = parsed.state;

      // Version migration could be added here
      // For now, just load the state as-is
      setState(cleanState);
      setLastSaved(new Date(parsed.metadata.timestamp));
      setHasUnsavedChanges(false);
      initialStateRef.current = { ...cleanState };
      lastSavedTimestampRef.current = parsed.metadata.timestamp;
    } catch (err) {
      const error =
        err instanceof Error
          ? err
          : new Error('Failed to load game state');
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
  const setStateWithAutosave = useCallback(
    (newState: GameState) => {
      setState(newState);
      setHasUnsavedChanges(true);
    },
    []
  );

  // Debounced autosave after state changes
  useEffect(() => {
    if (!enableAutosave || !hasUnsavedChanges || state === null) {
      return;
    }

    // Clear existing debounce timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Set new debounce timer
    debounceTimerRef.current = setTimeout(() => {
      if (state !== null) {
        save();
      }
    }, autosaveDebounce);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasUnsavedChanges, enableAutosave, autosaveDebounce]);

  // Periodic autosave
  useEffect(() => {
    if (!enableAutosave || !hasUnsavedChanges || state === null) {
      return;
    }

    // Clear existing autosave timer
    if (autosaveTimerRef.current) {
      clearInterval(autosaveTimerRef.current);
    }

    // Set new autosave timer
    autosaveTimerRef.current = setInterval(() => {
      if (state !== null && hasUnsavedChanges) {
        save();
      }
    }, autosaveInterval);

    return () => {
      if (autosaveTimerRef.current) {
        clearInterval(autosaveTimerRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasUnsavedChanges, enableAutosave, autosaveInterval]);

  // Load saved state on mount
  useEffect(() => {
    load();
  }, [load]);

  // Warn before leaving if there are unsaved changes
  useEffect(() => {
    if (!hasUnsavedChanges) {
      return;
    }

    const handleBeforeUnload = (e: BeforeUnloadEvent): string => {
      e.preventDefault();
      const message = 'You have unsaved changes. Are you sure you want to leave?';
      e.returnValue = message;
      return message;
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [hasUnsavedChanges]);

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
