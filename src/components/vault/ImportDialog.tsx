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

  const handleFileSelect = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const selectedFile = event.target.files?.[0];
      if (selectedFile) {
        selectFile(selectedFile);
      }
    },
    [selectFile],
  );

  const handleDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      const droppedFile = event.dataTransfer.files[0];
      if (droppedFile) {
        selectFile(droppedFile);
      }
    },
    [selectFile],
  );

  const handleDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
  }, []);

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

        {/* Step: File Selection */}
        {step === 'idle' && (
          <div
            className="cursor-pointer rounded-lg border-2 border-dashed border-gray-600 p-8 text-center transition-colors hover:border-gray-500"
            onClick={() => fileInputRef.current?.click()}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".mekbundle,.json"
              onChange={handleFileSelect}
              className="hidden"
            />
            <div className="text-gray-400">
              <div className="mb-2 text-4xl">📦</div>
              <p>Drop a .mekbundle file here</p>
              <p className="mt-1 text-sm">or click to select</p>
            </div>
          </div>
        )}

        {/* Step: Preview */}
        {step === 'preview' && preview && (
          <div className="space-y-4">
            {preview.valid ? (
              <>
                <div className="rounded-lg bg-gray-700 p-4">
                  <h3 className="mb-2 font-medium text-white">
                    Bundle Preview
                  </h3>
                  <dl className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <dt className="text-gray-400">Content Type:</dt>
                      <dd className="text-white capitalize">
                        {preview.contentType}
                      </dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-gray-400">Items:</dt>
                      <dd className="text-white">{preview.itemCount}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-gray-400">Author:</dt>
                      <dd className="text-white">{preview.authorName}</dd>
                    </div>
                    {preview.description && (
                      <div className="flex justify-between">
                        <dt className="text-gray-400">Description:</dt>
                        <dd className="text-white">{preview.description}</dd>
                      </div>
                    )}
                    {preview.createdAt && (
                      <div className="flex justify-between">
                        <dt className="text-gray-400">Created:</dt>
                        <dd className="text-white">
                          {new Date(preview.createdAt).toLocaleDateString()}
                        </dd>
                      </div>
                    )}
                  </dl>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={clearFile}
                    className="flex-1 rounded bg-gray-600 px-4 py-2 text-white hover:bg-gray-500"
                  >
                    Select Different File
                  </button>
                  <button
                    onClick={handleImport}
                    disabled={importing}
                    className="flex-1 rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-500 disabled:opacity-50"
                  >
                    {importing ? 'Importing...' : 'Import'}
                  </button>
                </div>
              </>
            ) : (
              <div className="py-4 text-center">
                <div className="mb-2 text-red-400">Invalid Bundle</div>
                <p className="text-sm text-gray-400">{preview.error}</p>
                <button
                  onClick={clearFile}
                  className="mt-4 rounded bg-gray-600 px-4 py-2 text-white hover:bg-gray-500"
                >
                  Try Another File
                </button>
              </div>
            )}
          </div>
        )}

        {/* Step: Conflict Resolution */}
        {step === 'conflicts' && conflicts.length > 0 && (
          <ConflictResolver
            conflicts={conflicts}
            onResolve={handleResolveConflicts}
            onCancel={clearFile}
          />
        )}

        {/* Step: Importing */}
        {step === 'importing' && (
          <div className="py-8 text-center">
            <div className="mb-4 animate-spin text-4xl">⏳</div>
            <p className="text-gray-300">Importing...</p>
          </div>
        )}

        {/* Step: Complete */}
        {step === 'complete' && result && (
          <div className="py-4 text-center">
            <div className="mb-4 text-4xl text-green-400">✓</div>
            <h3 className="mb-2 font-medium text-white">Import Complete</h3>
            <div className="space-y-1 text-gray-300">
              <p>Imported: {result.success ? result.data.importedCount : 0}</p>
              {result.success && result.data.skippedCount > 0 && (
                <p>Skipped: {result.data.skippedCount}</p>
              )}
              {result.success && result.data.replacedCount > 0 && (
                <p>Replaced: {result.data.replacedCount}</p>
              )}
            </div>
            <button
              onClick={handleClose}
              className="mt-4 rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-500"
            >
              Done
            </button>
          </div>
        )}

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

// =============================================================================
// Conflict Resolver Sub-component
// =============================================================================

interface ConflictResolverProps {
  conflicts: IImportConflict[];
  onResolve: (resolutions: IImportConflict[]) => void;
  onCancel: () => void;
}

function ConflictResolver({
  conflicts,
  onResolve,
  onCancel,
}: ConflictResolverProps) {
  const [resolutions, setResolutions] =
    React.useState<IImportConflict[]>(conflicts);

  const handleResolutionChange = (
    index: number,
    resolution: IImportConflict['resolution'],
  ) => {
    const updated = [...resolutions];
    updated[index] = { ...updated[index], resolution };
    setResolutions(updated);
  };

  const handleApply = () => {
    onResolve(resolutions);
  };

  return (
    <div className="space-y-4">
      <p className="text-gray-300">
        {conflicts.length} conflict{conflicts.length > 1 ? 's' : ''} found.
        Choose how to handle each:
      </p>

      <div className="max-h-64 space-y-3 overflow-y-auto">
        {resolutions.map((conflict, index) => (
          <div
            key={conflict.bundleItemId}
            className="rounded-lg bg-gray-700 p-3"
          >
            <div className="mb-2 font-medium text-white">
              {conflict.bundleItemName}
            </div>
            <div className="mb-2 text-sm text-gray-400">
              Conflicts with: {conflict.existingItemName}
            </div>
            <select
              value={conflict.resolution}
              onChange={(e) =>
                handleResolutionChange(
                  index,
                  e.target.value as IImportConflict['resolution'],
                )
              }
              className="w-full rounded border border-gray-500 bg-gray-600 px-3 py-2 text-white"
            >
              <option value="skip">Skip (keep existing)</option>
              <option value="replace">Replace existing</option>
              <option value="rename">Import as copy</option>
              <option value="keep_both">Keep both</option>
            </select>
          </div>
        ))}
      </div>

      <div className="flex gap-3">
        <button
          onClick={onCancel}
          className="flex-1 rounded bg-gray-600 px-4 py-2 text-white hover:bg-gray-500"
        >
          Cancel
        </button>
        <button
          onClick={handleApply}
          className="flex-1 rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-500"
        >
          Apply & Import
        </button>
      </div>
    </div>
  );
}

export default ImportDialog;
