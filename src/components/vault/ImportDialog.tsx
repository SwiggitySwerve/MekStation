/**
 * Import Dialog Component
 *
 * Dialog for importing bundles with preview, conflict resolution, and results.
 *
 * @spec openspec/changes/add-vault-sharing/specs/vault-sharing/spec.md
 */

import React, { useCallback, useRef } from 'react';

import type { IImportConflict, IImportHandlers } from '@/types/vault';

import { useVaultImport } from '@/hooks/useVaultImport';

import { ImportDialogSteps } from './ImportDialogSteps';

// =============================================================================
// Types
// =============================================================================

export interface ImportDialogProps<T> {
  /** Whether the dialog is open */
  isOpen: boolean;

  /** Close the dialog */
  onClose: () => void;

  /** Import handlers for the content type */
  handlers: IImportHandlers<T>;

  /** Callback when import completes successfully */
  onImportComplete?: (importedCount: number) => void;
}

// =============================================================================
// Component
// =============================================================================

export function ImportDialog<T>({
  isOpen,
  onClose,
  handlers,
  onImportComplete,
}: ImportDialogProps<T>): React.ReactElement | null {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    importing,
    preview,
    conflicts,
    result,
    error,
    step,
    selectFile,
    clearFile,
    importFile,
    resolveConflicts,
    reset,
  } = useVaultImport();

  const handleImport = useCallback(async () => {
    const importResult = await importFile<T>(handlers);
    if (importResult.success) {
      onImportComplete?.(importResult.data.importedCount);
    }
  }, [importFile, handlers, onImportComplete]);

  const handleResolveConflicts = useCallback(
    async (resolutions: IImportConflict[]) => {
      const importResult = await resolveConflicts<T>(resolutions, handlers);
      if (importResult.success) {
        onImportComplete?.(importResult.data.importedCount);
      }
    },
    [resolveConflicts, handlers, onImportComplete],
  );

  const handleClose = useCallback(() => {
    reset();
    onClose();
  }, [reset, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="mx-4 w-full max-w-lg rounded-lg bg-gray-800 p-6">
        {/* Header */}
        <h2 className="mb-4 text-xl font-bold text-white">Import Bundle</h2>

        {/* Error display */}
        {error && (
          <div className="mb-4 rounded border border-red-500 bg-red-900/50 px-4 py-2 text-red-200">
            {error}
          </div>
        )}

        <ImportDialogSteps
          step={step}
          preview={preview}
          conflicts={conflicts}
          result={result}
          importing={importing}
          fileInputRef={fileInputRef}
          onSelectFile={selectFile}
          onClearFile={clearFile}
          onImport={handleImport}
          onResolveConflicts={handleResolveConflicts}
          onClose={handleClose}
        />

        {/* Close button for idle/preview states */}
        {(step === 'idle' || step === 'preview') && (
          <div className="mt-4 flex justify-end">
            <button
              onClick={handleClose}
              className="rounded bg-gray-600 px-4 py-2 text-white hover:bg-gray-500"
            >
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default ImportDialog;
