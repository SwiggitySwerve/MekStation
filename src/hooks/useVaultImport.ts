/**
 * Vault Import Hook
 *
 * Provides import functionality for bundles.
 *
 * @spec openspec/changes/add-vault-sharing/specs/vault-sharing/spec.md
 */

import { useState, useCallback } from 'react';

import type {
  IImportOptions,
  IImportResult,
  IImportConflict,
  IImportHandlers,
} from '@/types/vault';

import {
  clearVaultImportFile,
  createMissingContentResult,
  importVaultContent,
  resetVaultImportState,
  selectVaultImportFile,
} from './useVaultImport.helpers';

// =============================================================================
// Types
// =============================================================================

export interface BundlePreview {
  valid: boolean;
  contentType?: string;
  itemCount?: number;
  authorName?: string;
  description?: string;
  createdAt?: string;
  error?: string;
}

export interface UseVaultImportState {
  /** Whether an import is in progress */
  importing: boolean;

  /** Selected file */
  file: File | null;

  /** Bundle preview data */
  preview: BundlePreview | null;

  /** Detected conflicts */
  conflicts: IImportConflict[];

  /** Last import result */
  result: IImportResult | null;

  /** Error message */
  error: string | null;

  /** Current step in import flow */
  step: 'idle' | 'preview' | 'conflicts' | 'importing' | 'complete';
}

export interface UseVaultImportActions {
  /** Select a file for import */
  selectFile: (file: File) => Promise<void>;

  /** Clear the selected file */
  clearFile: () => void;

  /** Import from the selected file */
  importFile: <T>(
    handlers: IImportHandlers<T>,
    options?: IImportOptions,
  ) => Promise<IImportResult>;

  /** Import from a string */
  importString: <T>(
    data: string,
    handlers: IImportHandlers<T>,
    options?: IImportOptions,
  ) => Promise<IImportResult>;

  /** Resolve conflicts and continue import */
  resolveConflicts: <T>(
    resolutions: IImportConflict[],
    handlers: IImportHandlers<T>,
  ) => Promise<IImportResult>;

  /** Reset the import state */
  reset: () => void;
}

// =============================================================================
// Hook
// =============================================================================

export function useVaultImport(): UseVaultImportState & UseVaultImportActions {
  const [importing, setImporting] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [fileContent, setFileContent] = useState<string | null>(null);
  const [preview, setPreview] = useState<BundlePreview | null>(null);
  const [conflicts, setConflicts] = useState<IImportConflict[]>([]);
  const [result, setResult] = useState<IImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<UseVaultImportState['step']>('idle');

  const handleSelectFile = useCallback(async (selectedFile: File) => {
    await selectVaultImportFile({
      selectedFile,
      setConflicts,
      setError,
      setFile,
      setFileContent,
      setImporting,
      setPreview,
      setResult,
      setStep,
    });
  }, []);

  const handleClearFile = useCallback(() => {
    clearVaultImportFile({
      setConflicts,
      setError,
      setFile,
      setFileContent,
      setImporting,
      setPreview,
      setResult,
      setStep,
    });
  }, []);

  const handleImportFile = useCallback(
    async <T>(
      handlers: IImportHandlers<T>,
      options: IImportOptions = { conflictResolution: 'ask' },
    ): Promise<IImportResult> => {
      if (!fileContent) {
        return createMissingContentResult(setError);
      }

      return importVaultContent<T>({
        data: fileContent,
        failureStep: 'preview',
        handlers,
        options,
        setConflicts,
        setError,
        setImporting,
        setResult,
        setStep,
      });
    },
    [fileContent],
  );

  const handleImportString = useCallback(
    async <T>(
      data: string,
      handlers: IImportHandlers<T>,
      options: IImportOptions = { conflictResolution: 'ask' },
    ): Promise<IImportResult> => {
      return importVaultContent<T>({
        data,
        failureStep: 'idle',
        handlers,
        options,
        setConflicts,
        setError,
        setImporting,
        setResult,
        setStep,
      });
    },
    [],
  );

  const handleResolveConflicts = useCallback(
    async <T>(
      resolutions: IImportConflict[],
      handlers: IImportHandlers<T>,
    ): Promise<IImportResult> => {
      if (!fileContent) {
        return createMissingContentResult(setError);
      }

      return handleImportFile<T>(handlers, {
        conflictResolution: 'ask',
        resolvedConflicts: resolutions,
      });
    },
    [fileContent, handleImportFile],
  );

  const handleReset = useCallback(() => {
    resetVaultImportState({
      setConflicts,
      setError,
      setFile,
      setFileContent,
      setImporting,
      setPreview,
      setResult,
      setStep,
    });
  }, []);

  return {
    importing,
    file,
    preview,
    conflicts,
    result,
    error,
    step,
    selectFile: handleSelectFile,
    clearFile: handleClearFile,
    importFile: handleImportFile,
    importString: handleImportString,
    resolveConflicts: handleResolveConflicts,
    reset: handleReset,
  };
}
