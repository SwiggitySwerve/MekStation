import React, { useState } from 'react';

import type {
  BundlePreview,
  UseVaultImportState,
} from '@/hooks/useVaultImport';
import type { IImportConflict, IImportResult } from '@/types/vault';

type ImportStep = UseVaultImportState['step'];

interface ImportDialogStepsProps {
  step: ImportStep;
  preview: BundlePreview | null;
  conflicts: IImportConflict[];
  result: IImportResult | null;
  importing: boolean;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  onSelectFile: (file: File) => void | Promise<void>;
  onClearFile: () => void;
  onImport: () => void | Promise<void>;
  onResolveConflicts: (resolutions: IImportConflict[]) => void | Promise<void>;
  onClose: () => void;
}

export function ImportDialogSteps({
  step,
  preview,
  conflicts,
  result,
  importing,
  fileInputRef,
  onSelectFile,
  onClearFile,
  onImport,
  onResolveConflicts,
  onClose,
}: ImportDialogStepsProps): React.ReactElement | null {
  switch (step) {
    case 'idle':
      return (
        <FileSelectionStep
          fileInputRef={fileInputRef}
          onSelectFile={onSelectFile}
        />
      );
    case 'preview':
      return preview ? (
        <PreviewStep
          preview={preview}
          importing={importing}
          onClearFile={onClearFile}
          onImport={onImport}
        />
      ) : null;
    case 'conflicts':
      return conflicts.length > 0 ? (
        <ConflictResolver
          conflicts={conflicts}
          onResolve={onResolveConflicts}
          onCancel={onClearFile}
        />
      ) : null;
    case 'importing':
      return <ImportingStep />;
    case 'complete':
      return result ? <CompleteStep result={result} onClose={onClose} /> : null;
  }
}

interface FileSelectionStepProps {
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  onSelectFile: (file: File) => void | Promise<void>;
}

function FileSelectionStep({
  fileInputRef,
  onSelectFile,
}: FileSelectionStepProps): React.ReactElement {
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      onSelectFile(selectedFile);
    }
  };

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    const droppedFile = event.dataTransfer.files[0];
    if (droppedFile) {
      onSelectFile(droppedFile);
    }
  };

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault();
  };

  return (
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
  );
}

interface PreviewStepProps {
  preview: BundlePreview;
  importing: boolean;
  onClearFile: () => void;
  onImport: () => void | Promise<void>;
}

function PreviewStep({
  preview,
  importing,
  onClearFile,
  onImport,
}: PreviewStepProps): React.ReactElement {
  if (!preview.valid) {
    return (
      <div className="py-4 text-center">
        <div className="mb-2 text-red-400">Invalid Bundle</div>
        <p className="text-sm text-gray-400">{preview.error}</p>
        <button
          onClick={onClearFile}
          className="mt-4 rounded bg-gray-600 px-4 py-2 text-white hover:bg-gray-500"
        >
          Try Another File
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg bg-gray-700 p-4">
        <h3 className="mb-2 font-medium text-white">Bundle Preview</h3>
        <dl className="space-y-1 text-sm">
          <div className="flex justify-between">
            <dt className="text-gray-400">Content Type:</dt>
            <dd className="text-white capitalize">{preview.contentType}</dd>
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
          onClick={onClearFile}
          className="flex-1 rounded bg-gray-600 px-4 py-2 text-white hover:bg-gray-500"
        >
          Select Different File
        </button>
        <button
          onClick={onImport}
          disabled={importing}
          className="flex-1 rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-500 disabled:opacity-50"
        >
          {importing ? 'Importing...' : 'Import'}
        </button>
      </div>
    </div>
  );
}

function ImportingStep(): React.ReactElement {
  return (
    <div className="py-8 text-center">
      <div className="mb-4 animate-spin text-4xl">⏳</div>
      <p className="text-gray-300">Importing...</p>
    </div>
  );
}

interface CompleteStepProps {
  result: IImportResult;
  onClose: () => void;
}

function CompleteStep({
  result,
  onClose,
}: CompleteStepProps): React.ReactElement {
  return (
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
        onClick={onClose}
        className="mt-4 rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-500"
      >
        Done
      </button>
    </div>
  );
}

interface ConflictResolverProps {
  conflicts: IImportConflict[];
  onResolve: (resolutions: IImportConflict[]) => void | Promise<void>;
  onCancel: () => void;
}

function ConflictResolver({
  conflicts,
  onResolve,
  onCancel,
}: ConflictResolverProps): React.ReactElement {
  const [resolutions, setResolutions] = useState<IImportConflict[]>(conflicts);

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
              onChange={(event) =>
                handleResolutionChange(
                  index,
                  event.target.value as IImportConflict['resolution'],
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
