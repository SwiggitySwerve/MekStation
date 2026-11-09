/**
 * useDesktopSettings Hook
 *
 * Provides access to desktop application settings.
 * Handles loading, saving, and real-time updates.
 */

import {
  useState,
  useEffect,
  useCallback,
  useLayoutEffect,
  useRef,
} from 'react';

import { logger } from '@/utils/logger';

import {
  useElectron,
  IDesktopSettings,
  ISettingsChangeEvent,
  IServiceResult,
} from './useElectron';

/**
 * Default settings for non-Electron environments
 */
const DEFAULT_SETTINGS: IDesktopSettings = {
  version: 1,
  launchAtLogin: false,
  startMinimized: false,
  reopenLastUnit: false,
  defaultSaveDirectory: '',
  rememberWindowState: true,
  windowBounds: {
    x: 100,
    y: 100,
    width: 1400,
    height: 900,
    isMaximized: false,
  },
  enableAutoBackup: true,
  backupIntervalMinutes: 5,
  maxBackupCount: 10,
  backupDirectory: '',
  checkForUpdatesAutomatically: true,
  updateChannel: 'stable',
  maxRecentFiles: 15,
  dataDirectory: '',
  enableDevTools: false,
};

interface UseDesktopSettingsResult {
  /** Current settings */
  settings: IDesktopSettings;
  /** Whether settings are loading */
  isLoading: boolean;
  /** Last error message */
  error: string | null;
  /** Whether running in Electron */
  isElectron: boolean;
  /** Update settings */
  updateSettings: (
    updates: Partial<IDesktopSettings>,
    canPublish?: () => boolean,
  ) => Promise<IServiceResult>;
  /** Reset settings to defaults */
  resetSettings: () => Promise<IServiceResult>;
  /** Reload settings from disk */
  reloadSettings: () => Promise<void>;
}

/**
 * Hook for managing desktop settings
 */
export function useDesktopSettings(): UseDesktopSettingsResult {
  const api = useElectron();
  const [settings, setSettings] = useState<IDesktopSettings>(DEFAULT_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const owner = useRef<{ readonly api: typeof api } | null>(null);

  useLayoutEffect(() => {
    owner.current = { api };
    return () => {
      owner.current = null;
    };
  }, [api]);

  // Load settings on mount
  const loadSettings = useCallback(async () => {
    const requestOwner = owner.current;
    if (!requestOwner || requestOwner.api !== api) return;
    const isCurrent = () => owner.current === requestOwner;
    if (!api) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      const loadedSettings = await api.getSettings();
      if (isCurrent() && loadedSettings) {
        setSettings(loadedSettings);
      }
    } catch (err) {
      if (!isCurrent()) return;
      const message =
        err instanceof Error ? err.message : 'Failed to load settings';
      setError(message);
      logger.error('Failed to load settings:', err);
    } finally {
      if (isCurrent()) setIsLoading(false);
    }
  }, [api]);

  // Initial load
  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  // Subscribe to settings changes
  useEffect(() => {
    if (!api) return;
    const requestOwner = owner.current;

    const handleSettingsChange = (event: ISettingsChangeEvent) => {
      if (owner.current !== requestOwner) return;
      setSettings((prev) => ({
        ...prev,
        [event.key]: event.newValue,
      }));
    };

    api.onSettingsChange(handleSettingsChange);

    return () => {
      api.removeAllListeners('settings:on-change');
    };
  }, [api]);

  // Update settings
  const updateSettings = useCallback(
    async (
      updates: Partial<IDesktopSettings>,
      canPublish: () => boolean = () => true,
    ): Promise<IServiceResult> => {
      const requestOwner = owner.current;
      if (!api || !requestOwner || requestOwner.api !== api) {
        return { success: false, error: 'Not running in Electron' };
      }
      const isCurrent = () => owner.current === requestOwner && canPublish();

      try {
        const result = await api.setSettings(updates);
        if (!isCurrent()) return result;
        if (result.success) {
          // Optimistically update local state
          setSettings((prev) => ({ ...prev, ...updates }));
        } else {
          setError(result.error ?? 'Failed to update settings');
        }
        return result;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Failed to update settings';
        if (isCurrent()) setError(message);
        return { success: false, error: message };
      }
    },
    [api],
  );

  // Reset settings
  const resetSettings = useCallback(async (): Promise<IServiceResult> => {
    const requestOwner = owner.current;
    if (!api || !requestOwner || requestOwner.api !== api) {
      return { success: false, error: 'Not running in Electron' };
    }
    const isCurrent = () => owner.current === requestOwner;

    try {
      const result = await api.resetSettings();
      if (!isCurrent()) return result;
      if (result.success) {
        // Reload settings to get defaults
        await loadSettings();
      } else {
        setError(result.error ?? 'Failed to reset settings');
      }
      return result;
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to reset settings';
      if (isCurrent()) setError(message);
      return { success: false, error: message };
    }
  }, [api, loadSettings]);

  return {
    settings,
    isLoading,
    error,
    isElectron: api !== null,
    updateSettings,
    resetSettings,
    reloadSettings: loadSettings,
  };
}
