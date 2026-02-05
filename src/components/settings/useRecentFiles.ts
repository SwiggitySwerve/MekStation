/**
 * useRecentFiles Hook
 *
 * Provides access to recently opened units list.
 * Handles loading, updating, and real-time updates.
 */

import { useState, useEffect, useCallback } from 'react';

import {
  useElectron,
  IRecentFile,
  IAddRecentFileParams,
  IServiceResult,
} from './useElectron';

interface UseRecentFilesResult {
  /** List of recent files (most recent first) */
  recentFiles: readonly IRecentFile[];
  /** Whether recent files are loading */
  isLoading: boolean;
  /** Last error message */
  error: string | null;
  /** Whether running in Electron */
  isElectron: boolean;
  /** Add a file to recent files */
  addRecentFile: (params: IAddRecentFileParams) => Promise<IServiceResult>;
  /** Remove a file from recent files */
  removeRecentFile: (id: string) => Promise<IServiceResult>;
  /** Clear all recent files */
  clearRecentFiles: () => Promise<IServiceResult>;
  /** Reload recent files from disk */
  reloadRecentFiles: () => Promise<void>;
}

/**
 * Hook for managing recent files
 */
export function useRecentFiles(): UseRecentFilesResult {
  const api = useElectron();
  const [recentFiles, setRecentFiles] = useState<readonly IRecentFile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load recent files on mount
  const loadRecentFiles = useCallback(async () => {
    if (!api) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      const files = await api.getRecentFiles();
      setRecentFiles(files);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to load recent files';
      setError(message);
      console.error('Failed to load recent files:', err);
    } finally {
      setIsLoading(false);
    }
  }, [api]);

  // Initial load
  useEffect(() => {
    loadRecentFiles();
  }, [loadRecentFiles]);

  // Subscribe to recent files updates
  useEffect(() => {
    if (!api) return;

    const handleRecentFilesUpdate = (files: readonly IRecentFile[]) => {
      setRecentFiles(files);
    };

    api.onRecentFilesUpdate(handleRecentFilesUpdate);

    return () => {
      api.removeAllListeners('recent-files:on-update');
    };
  }, [api]);

  // Add a file to recent files
  const addRecentFile = useCallback(
    async (params: IAddRecentFileParams): Promise<IServiceResult> => {
      if (!api) {
        return { success: false, error: 'Not running in Electron' };
      }

      try {
        const result = await api.addRecentFile(params);
        if (!result.success) {
          setError(result.error ?? 'Failed to add recent file');
        }
        return result;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Failed to add recent file';
        setError(message);
        return { success: false, error: message };
      }
    },
    [api],
  );

  // Remove a file from recent files
  const removeRecentFile = useCallback(
    async (id: string): Promise<IServiceResult> => {
      if (!api) {
        return { success: false, error: 'Not running in Electron' };
      }

      try {
        const result = await api.removeRecentFile(id);
        if (!result.success) {
          setError(result.error ?? 'Failed to remove recent file');
        }
        return result;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Failed to remove recent file';
        setError(message);
        return { success: false, error: message };
      }
    },
    [api],
  );

  // Clear all recent files
  const clearRecentFiles = useCallback(async (): Promise<IServiceResult> => {
    if (!api) {
      return { success: false, error: 'Not running in Electron' };
    }

    try {
      const result = await api.clearRecentFiles();
      if (!result.success) {
        setError(result.error ?? 'Failed to clear recent files');
      }
      return result;
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to clear recent files';
      setError(message);
      return { success: false, error: message };
    }
  }, [api]);

  return {
    recentFiles,
    isLoading,
    error,
    isElectron: api !== null,
    addRecentFile,
    removeRecentFile,
    clearRecentFiles,
    reloadRecentFiles: loadRecentFiles,
  };
}
