/**
 * Export Dialog Component
 *
 * Dialog for exporting units, pilots, or forces as shareable bundles.
 * Requires password for server-side signing.
 *
 * @spec openspec/changes/add-vault-sharing/specs/vault-sharing/spec.md
 */

import React, { useState, useCallback } from 'react';

import type {
  IExportableUnit,
  IExportablePilot,
  IExportableForce,
  IExportResult,
} from '@/types/vault';

import { InlineErrorMessage } from '@/components/common/InlineErrorMessage';
import { DialogTemplate } from '@/components/ui/DialogTemplate';
import { useVaultExport, type ExportOptions } from '@/hooks/useVaultExport';
import { useIdentitySelector } from '@/stores/useIdentityStore';

// =============================================================================
// Types
// =============================================================================

export type ExportContentType =
  | 'unit'
  | 'units'
  | 'pilot'
  | 'pilots'
  | 'force'
  | 'forces';

export interface ExportDialogProps {
  /** Whether the dialog is open */
  isOpen: boolean;

  /** Close the dialog */
  onClose: () => void;

  /** Type of content being exported */
  contentType: ExportContentType;

  /** Content to export */
  content:
    | IExportableUnit
    | IExportableUnit[]
    | IExportablePilot
    | IExportablePilot[]
    | IExportableForce
    | IExportableForce[];

  /** Callback when export completes successfully */
  onExportComplete?: () => void;
}

interface ExportContentHandlers {
  exportUnits: (
    units: IExportableUnit[],
    options: ExportOptions,
  ) => Promise<IExportResult>;
  exportPilots: (
    pilots: IExportablePilot[],
    options: ExportOptions,
  ) => Promise<IExportResult>;
  exportForces: (
    forces: IExportableForce[],
    options: ExportOptions,
  ) => Promise<IExportResult>;
}

function normalizeToArray<T>(item: T | T[]): T[] {
  return Array.isArray(item) ? item : [item];
}

async function exportDialogContent(
  contentType: ExportContentType,
  content: ExportDialogProps['content'],
  options: ExportOptions,
  handlers: ExportContentHandlers,
): Promise<IExportResult | undefined> {
  switch (contentType) {
    case 'unit':
    case 'units':
      return handlers.exportUnits(
        normalizeToArray(content as IExportableUnit | IExportableUnit[]),
        options,
      );
    case 'pilot':
    case 'pilots':
      return handlers.exportPilots(
        normalizeToArray(content as IExportablePilot | IExportablePilot[]),
        options,
      );
    case 'force':
    case 'forces':
      return handlers.exportForces(
        normalizeToArray(content as IExportableForce | IExportableForce[]),
        options,
      );
  }
}

// =============================================================================
// Component
// =============================================================================

export function ExportDialog({
  isOpen,
  onClose,
  contentType,
  content,
  onExportComplete,
}: ExportDialogProps): React.ReactElement | null {
  const [description, setDescription] = useState('');
  const [password, setPassword] = useState('');
  const [copied, setCopied] = useState(false);

  const publicIdentity = useIdentitySelector((state) => state.publicIdentity);
  const isUnlocked = useIdentitySelector((state) => state.isUnlocked);
  const {
    exporting,
    result,
    error,
    exportUnits,
    exportPilots,
    exportForces,
    downloadResult,
    copyToClipboard,
    clear,
  } = useVaultExport();

  const handleExport = useCallback(async () => {
    if (!password) {
      return;
    }

    const options: ExportOptions = {
      description: description || undefined,
      password,
    };

    const exportResult = await exportDialogContent(
      contentType,
      content,
      options,
      {
        exportUnits,
        exportPilots,
        exportForces,
      },
    );

    if (exportResult?.success) {
      setPassword(''); // Clear password after successful export
      onExportComplete?.();
    }
  }, [
    contentType,
    content,
    description,
    password,
    exportUnits,
    exportPilots,
    exportForces,
    onExportComplete,
  ]);

  const handleDownload = useCallback(() => {
    downloadResult();
  }, [downloadResult]);

  const handleCopy = useCallback(async () => {
    await copyToClipboard();
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [copyToClipboard]);

  const handleClose = useCallback(() => {
    clear();
    setDescription('');
    setPassword('');
    setCopied(false);
    onClose();
  }, [clear, onClose]);

  if (!isOpen) return null;

  const itemCount = Array.isArray(content) ? content.length : 1;
  const contentLabel = contentType.replace(/s$/, '');

  // Not unlocked state
  if (!isUnlocked || !publicIdentity) {
    return (
      <DialogTemplate
        isOpen={isOpen}
        onClose={handleClose}
        title={`Export ${contentLabel}`}
        className="mx-4 w-full max-w-md"
        footer={
          <button
            onClick={handleClose}
            className="bg-surface-raised text-text-theme-primary hover:bg-surface-raised rounded px-4 py-2"
          >
            Close
          </button>
        }
      >
        <p className="text-text-theme-secondary">
          You need to unlock your vault identity to export content.
        </p>
      </DialogTemplate>
    );
  }

  // Export complete state
  if (result?.success) {
    return (
      <DialogTemplate
        isOpen={isOpen}
        onClose={handleClose}
        title="Export Complete"
        className="mx-4 w-full max-w-md"
        footer={
          <button
            onClick={handleClose}
            className="bg-surface-raised text-text-theme-primary hover:bg-surface-raised rounded px-4 py-2"
          >
            Close
          </button>
        }
      >
        <p className="text-text-theme-secondary mb-4">
          Successfully exported {itemCount}{' '}
          {itemCount === 1 ? contentLabel : `${contentLabel}s`}.
        </p>
        <div className="flex flex-col gap-3">
          <button
            onClick={handleDownload}
            className="bg-accent text-on-accent hover:bg-accent-hover w-full rounded px-4 py-2"
          >
            Download File
          </button>
          <button
            onClick={handleCopy}
            className="bg-surface-raised text-text-theme-primary hover:bg-surface-raised w-full rounded px-4 py-2"
          >
            {copied ? 'Copied!' : 'Copy to Clipboard'}
          </button>
        </div>
      </DialogTemplate>
    );
  }

  // Main export form
  return (
    <DialogTemplate
      isOpen={isOpen}
      onClose={handleClose}
      title={`Export ${itemCount} ${itemCount === 1 ? contentLabel : `${contentLabel}s`}`}
      className="mx-4 w-full max-w-md"
      preventClose={exporting}
      footer={
        <>
          <button
            onClick={handleClose}
            disabled={exporting}
            className="bg-surface-raised text-text-theme-primary hover:bg-surface-raised rounded px-4 py-2 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleExport}
            disabled={exporting || !password}
            className="bg-accent text-on-accent hover:bg-accent-hover rounded px-4 py-2 disabled:opacity-50"
          >
            {exporting ? 'Exporting...' : 'Export'}
          </button>
        </>
      }
    >
      <InlineErrorMessage message={error} variant="dialog" />

      <div className="space-y-4">
        <div>
          <label className="text-text-theme-secondary mb-1 block text-sm">
            Description (Optional)
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Add a description for this export..."
            className="border-border-theme-strong bg-surface-raised text-text-theme-primary w-full resize-none rounded border px-3 py-2"
            rows={3}
          />
        </div>

        <div>
          <label className="text-text-theme-secondary mb-1 block text-sm">
            Password (Required to Sign)
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter your vault password"
            className="border-border-theme-strong bg-surface-raised text-text-theme-primary w-full rounded border px-3 py-2"
          />
        </div>

        <div className="text-text-theme-secondary text-sm">
          Signed by:{' '}
          <span className="text-text-theme-primary">
            {publicIdentity.displayName}
          </span>
          <br />
          Friend code:{' '}
          <span className="font-mono text-xs">{publicIdentity.friendCode}</span>
        </div>
      </div>
    </DialogTemplate>
  );
}

export default ExportDialog;
