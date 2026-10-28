import React, { useState } from 'react';

import type {
  BundlePreview,
  UseVaultImportState,
} from '@/hooks/useVaultImport';
import type { IImportConflict, IImportResult } from '@/types/vault';

import { AppIcon } from '@/components/ui/AppIcon';

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
      className="border-border-theme-strong hover:border-border-theme-strong cursor-pointer rounded-lg border-2 border-dashed p-8 text-center transition-colors"
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
      <div className="text-text-theme-secondary">
        <AppIcon
          name="upload"
          size="hero"
          className="mb-2"
          aria-hidden="true"
        />
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
        <p className="text-text-theme-secondary text-sm">{preview.error}</p>
        <button
          onClick={onClearFile}
          className="bg-surface-raised text-text-theme-primary hover:bg-surface-raised mt-4 rounded px-4 py-2"
        >
          Try Another File
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-surface-raised rounded-lg p-4">
        <h3 className="text-text-theme-primary mb-2 font-medium">
          Bundle Preview
        </h3>
        <dl className="space-y-1 text-sm">
          <div className="flex justify-between">
            <dt className="text-text-theme-secondary">Content Type:</dt>
            <dd className="text-text-theme-primary capitalize">
              {preview.contentType}
            </dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-text-theme-secondary">Items:</dt>
            <dd className="text-text-theme-primary">{preview.itemCount}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-text-theme-secondary">Author:</dt>
            <dd className="text-text-theme-primary">{preview.authorName}</dd>
          </div>
          {preview.description && (
            <div className="flex justify-between">
              <dt className="text-text-theme-secondary">Description:</dt>
              <dd className="text-text-theme-primary">{preview.description}</dd>
            </div>
          )}
          {preview.createdAt && (
            <div className="flex justify-between">
              <dt className="text-text-theme-secondary">Created:</dt>
              <dd className="text-text-theme-primary">
                {new Date(preview.createdAt).toLocaleDateString()}
              </dd>
            </div>
          )}
        </dl>
      </div>

      <div className="flex gap-3">
        <button
          onClick={onClearFile}
          className="bg-surface-raised text-text-theme-primary hover:bg-surface-raised flex-1 rounded px-4 py-2"
        >
          Select Different File
        </button>
        <button
          onClick={onImport}
          disabled={importing}
          className="bg-accent text-on-accent hover:bg-accent-hover flex-1 rounded px-4 py-2 disabled:opacity-50"
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
      <AppIcon
        name="loader"
        size="hero"
        className="mb-4 animate-spin"
        aria-hidden="true"
      />
      <p className="text-text-theme-secondary">Importing...</p>
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
      <AppIcon
        name="check"
        size="hero"
        className="mb-4 text-green-400"
        aria-hidden="true"
      />
      <h3 className="text-text-theme-primary mb-2 font-medium">
        Import Complete
      </h3>
      <div className="text-text-theme-secondary space-y-1">
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
        className="bg-accent text-on-accent hover:bg-accent-hover mt-4 rounded px-4 py-2"
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
      <p className="text-text-theme-secondary">
        {conflicts.length} conflict{conflicts.length > 1 ? 's' : ''} found.
        Choose how to handle each:
      </p>

      <div className="max-h-64 space-y-3 overflow-y-auto">
        {resolutions.map((conflict, index) => (
          <div
            key={conflict.bundleItemId}
            className="bg-surface-raised rounded-lg p-3"
          >
            <div className="text-text-theme-primary mb-2 font-medium">
              {conflict.bundleItemName}
            </div>
            <div className="text-text-theme-secondary mb-2 text-sm">
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
              className="border-border-theme-strong bg-surface-raised text-text-theme-primary w-full rounded border px-3 py-2"
            >
              <option value="skip">Skip (Keep Existing)</option>
              <option value="replace">Replace Existing</option>
              <option value="rename">Import as Copy</option>
              <option value="keep_both">Keep Both</option>
            </select>
          </div>
        ))}
      </div>

      <div className="flex gap-3">
        <button
          onClick={onCancel}
          className="bg-surface-raised text-text-theme-primary hover:bg-surface-raised flex-1 rounded px-4 py-2"
        >
          Cancel
        </button>
        <button
          onClick={handleApply}
          className="bg-accent text-on-accent hover:bg-accent-hover flex-1 rounded px-4 py-2"
        >
          Apply & Import
        </button>
      </div>
    </div>
  );
}
