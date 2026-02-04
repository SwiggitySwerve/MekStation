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
  importFromString,
  readBundleFromFile,
  validateBundleFile,
  previewBundle,
} from '@/services/vault/ImportService';

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
    options?: IImportOptions
  ) => Promise<IImportResult>;

  /** Import from a string */
  importString: <T>(
    data: string,
    handlers: IImportHandlers<T>,
    options?: IImportOptions
  ) => Promise<IImportResult>;

  /** Resolve conflicts and continue import */
  resolveConflicts: <T>(
    resolutions: IImportConflict[],
    handlers: IImportHandlers<T>
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
    setError(null);
    setResult(null);
    setConflicts([]);

    // Validate file
    const validationError = validateBundleFile(selectedFile);
    if (validationError) {
      setError(validationError);
      setStep('idle');
      return;
    }

    setFile(selectedFile);
    setStep('preview');

    try {
      // Read and preview
      const content = await readBundleFromFile(selectedFile);
      setFileContent(content);

      const previewResult = await previewBundle(content);

      if (previewResult.valid && previewResult.metadata) {
        setPreview({
          valid: true,
          contentType: previewResult.metadata.contentType,
          itemCount: previewResult.itemCount,
          authorName: previewResult.metadata.author.displayName,
          description: previewResult.metadata.description,
          createdAt: previewResult.metadata.createdAt,
        });
      } else {
        setPreview({
          valid: false,
          error: previewResult.error,
        });
        setError(previewResult.error || 'Invalid bundle');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to read file';
      setError(message);
      setPreview({ valid: false, error: message });
    }
  }, []);

  const handleClearFile = useCallback(() => {
    setFile(null);
    setFileContent(null);
    setPreview(null);
    setConflicts([]);
    setResult(null);
    setError(null);
    setStep('idle');
  }, []);

  const handleImportFile = useCallback(
    async <T>(
      handlers: IImportHandlers<T>,
      options: IImportOptions = { conflictResolution: 'ask' }
    ): Promise<IImportResult> => {
      if (!fileContent) {
        const err: IImportResult = { success: false, error: { message: 'No file content' } };
        setError(err.error.message);
        return err;
      }

      setImporting(true);
      setError(null);
      setStep('importing');

      try {
        const importResult = await importFromString<T>(fileContent, handlers, options);

        // Check for conflicts that need resolution
        if (importResult.success && importResult.data.conflicts && importResult.data.conflicts.length > 0) {
          setConflicts(importResult.data.conflicts);
          setStep('conflicts');
          setImporting(false);
          return importResult;
        }

        setResult(importResult);
        setStep('complete');

        if (!importResult.success) {
          setError(importResult.error.message || 'Import failed');
        }

        return importResult;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Import failed';
        setError(message);
        setStep('preview');
        return { success: false, error: { message } };
      } finally {
        setImporting(false);
      }
    },
    [fileContent]
  );

  const handleImportString = useCallback(
    async <T>(
      data: string,
      handlers: IImportHandlers<T>,
      options: IImportOptions = { conflictResolution: 'ask' }
    ): Promise<IImportResult> => {
      setImporting(true);
      setError(null);
      setStep('importing');

      try {
        const importResult = await importFromString<T>(data, handlers, options);

        if (importResult.success && importResult.data.conflicts && importResult.data.conflicts.length > 0) {
          setConflicts(importResult.data.conflicts);
          setStep('conflicts');
          setImporting(false);
          return importResult;
        }

        setResult(importResult);
        setStep('complete');

        if (!importResult.success) {
          setError(importResult.error.message || 'Import failed');
        }

        return importResult;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Import failed';
        setError(message);
        setStep('idle');
        return { success: false, error: { message } };
      } finally {
        setImporting(false);
      }
    },
    []
  );

  const handleResolveConflicts = useCallback(
    async <T>(
      resolutions: IImportConflict[],
      handlers: IImportHandlers<T>
    ): Promise<IImportResult> => {
      if (!fileContent) {
        const err: IImportResult = { success: false, error: { message: 'No file content' } };
        setError(err.error.message);
        return err;
      }

      return handleImportFile<T>(handlers, {
        conflictResolution: 'ask',
        resolvedConflicts: resolutions,
      });
    },
    [fileContent, handleImportFile]
  );

  const handleReset = useCallback(() => {
    setFile(null);
    setFileContent(null);
    setPreview(null);
    setConflicts([]);
    setResult(null);
    setError(null);
    setStep('idle');
    setImporting(false);
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
