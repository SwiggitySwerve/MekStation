import { useEffect, type MutableRefObject } from 'react';

import type { GameState, StoredData } from './useGameStatePersistence';

interface SaveGameStateParams {
  readonly state: GameState;
  readonly storageKey: string;
  readonly version: string;
  readonly initialState: GameState | null;
  readonly lastSavedTimestamp: number;
}

interface SavedGameState {
  readonly savedAt: number;
  readonly snapshot: GameState;
}

interface LoadedGameState {
  readonly hasStoredData: boolean;
  readonly state: GameState | null;
  readonly lastSaved: Date | null;
  readonly snapshot: GameState | null;
  readonly lastSavedTimestamp: number;
}

interface AutosaveOptions {
  readonly autosaveDebounce: number;
  readonly autosaveInterval: number;
  readonly autosaveTimerRef: MutableRefObject<NodeJS.Timeout | null>;
  readonly debounceTimerRef: MutableRefObject<NodeJS.Timeout | null>;
  readonly enableAutosave: boolean;
  readonly hasUnsavedChanges: boolean;
  readonly save: () => Promise<void>;
  readonly state: GameState | null;
}

export function saveGameStateToLocalStorage(
  params: SaveGameStateParams,
): SavedGameState {
  const stored = readStoredData(params.storageKey);
  assertNoSaveConflict(stored, params.initialState, params.lastSavedTimestamp);

  const savedAt = Date.now();
  const dataToStore: StoredData = {
    state: {
      ...params.state,
      _lastSaved: savedAt,
    },
    metadata: {
      timestamp: savedAt,
      version: params.version,
    },
  };

  localStorage.setItem(params.storageKey, JSON.stringify(dataToStore));
  return { savedAt, snapshot: { ...params.state } };
}

export function loadGameStateFromLocalStorage(
  storageKey: string,
): LoadedGameState {
  const storedData = localStorage.getItem(storageKey);
  if (!storedData) {
    return {
      hasStoredData: false,
      state: null,
      lastSaved: null,
      snapshot: null,
      lastSavedTimestamp: 0,
    };
  }

  const parsed = JSON.parse(storedData) as StoredData;
  const { _lastSaved, ...cleanState } = parsed.state;
  void _lastSaved;

  return {
    hasStoredData: true,
    state: cleanState,
    lastSaved: new Date(parsed.metadata.timestamp),
    snapshot: { ...cleanState },
    lastSavedTimestamp: parsed.metadata.timestamp,
  };
}

export function toPersistenceError(
  error: unknown,
  fallbackMessage: string,
): Error {
  return error instanceof Error ? error : new Error(fallbackMessage);
}

export function useGameStateAutosave(options: AutosaveOptions): void {
  useEffect(() => {
    if (!shouldAutosave(options)) return;

    clearTimeoutRef(options.debounceTimerRef);
    options.debounceTimerRef.current = setTimeout(() => {
      if (options.state !== null) {
        void options.save();
      }
    }, options.autosaveDebounce);

    return () => clearTimeoutRef(options.debounceTimerRef);
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, [
    options.hasUnsavedChanges,
    options.enableAutosave,
    options.autosaveDebounce,
  ]);

  useEffect(() => {
    if (!shouldAutosave(options)) return;

    clearIntervalRef(options.autosaveTimerRef);
    options.autosaveTimerRef.current = setInterval(() => {
      if (options.state !== null && options.hasUnsavedChanges) {
        void options.save();
      }
    }, options.autosaveInterval);

    return () => clearIntervalRef(options.autosaveTimerRef);
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, [
    options.hasUnsavedChanges,
    options.enableAutosave,
    options.autosaveInterval,
  ]);
}

export function useBeforeUnloadWarning(hasUnsavedChanges: boolean): void {
  useEffect(() => {
    if (!hasUnsavedChanges) return;

    const handleBeforeUnload = (e: BeforeUnloadEvent): string => {
      e.preventDefault();
      const message =
        'You have unsaved changes. Are you sure you want to leave?';
      e.returnValue = message;
      return message;
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [hasUnsavedChanges]);
}

export function useLoadGameState(load: () => Promise<void>): void {
  useEffect(() => {
    void load();
  }, [load]);
}

function readStoredData(storageKey: string): StoredData | null {
  const existingData = localStorage.getItem(storageKey);
  return existingData ? (JSON.parse(existingData) as StoredData) : null;
}

function assertNoSaveConflict(
  stored: StoredData | null,
  initialState: GameState | null,
  lastSavedTimestamp: number,
): void {
  if (!stored || !initialState) return;

  const storedTimestamp = new Date(stored.metadata.timestamp).getTime();
  if (storedTimestamp <= lastSavedTimestamp) return;

  throw new Error(
    'Save conflict: Local storage has newer data than current state',
  );
}

function shouldAutosave(options: AutosaveOptions): boolean {
  return (
    options.enableAutosave &&
    options.hasUnsavedChanges &&
    options.state !== null
  );
}

function clearTimeoutRef(
  timerRef: MutableRefObject<NodeJS.Timeout | null>,
): void {
  if (!timerRef.current) return;
  clearTimeout(timerRef.current);
  timerRef.current = null;
}

function clearIntervalRef(
  timerRef: MutableRefObject<NodeJS.Timeout | null>,
): void {
  if (!timerRef.current) return;
  clearInterval(timerRef.current);
  timerRef.current = null;
}
