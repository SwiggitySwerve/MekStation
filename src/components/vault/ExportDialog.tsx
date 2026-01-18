/**
 * Export Dialog Component
 *
 * Dialog for exporting units, pilots, or forces as shareable bundles.
 * Requires password for server-side signing.
 *
 * @spec openspec/changes/add-vault-sharing/specs/vault-sharing/spec.md
 */

import React, { useState, useCallback } from 'react';
import { useVaultExport, type ExportOptions } from '@/hooks/useVaultExport';
import { useIdentityStore } from '@/stores/useIdentityStore';
import type {
  IExportableUnit,
  IExportablePilot,
  IExportableForce,
} from '@/types/vault';

// =============================================================================
// Types
// =============================================================================

export type ExportContentType = 'unit' | 'units' | 'pilot' | 'pilots' | 'force' | 'forces';

export interface ExportDialogProps {
  /** Whether the dialog is open */
  isOpen: boolean;

  /** Close the dialog */
  onClose: () => void;

  /** Type of content being exported */
  contentType: ExportContentType;

  /** Content to export */
  content: IExportableUnit | IExportableUnit[] | IExportablePilot | IExportablePilot[] | IExportableForce | IExportableForce[];

  /** Callback when export completes successfully */
  onExportComplete?: () => void;
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

  const { publicIdentity, isUnlocked } = useIdentityStore();
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

    // Normalize content to array
    const normalizeToArray = <T,>(item: T | T[]): T[] =>
      Array.isArray(item) ? item : [item];

    let exportResult;

    switch (contentType) {
      case 'unit':
      case 'units':
        exportResult = await exportUnits(
          normalizeToArray(content as IExportableUnit | IExportableUnit[]),
          options
        );
        break;
      case 'pilot':
      case 'pilots':
        exportResult = await exportPilots(
          normalizeToArray(content as IExportablePilot | IExportablePilot[]),
          options
        );
        break;
      case 'force':
      case 'forces':
        exportResult = await exportForces(
          normalizeToArray(content as IExportableForce | IExportableForce[]),
          options
        );
        break;
    }

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
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
          <h2 className="text-xl font-bold text-white mb-4">Export {contentLabel}</h2>
          <p className="text-gray-300 mb-4">
            You need to unlock your vault identity to export content.
          </p>
          <div className="flex justify-end">
            <button
              onClick={handleClose}
              className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-500"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Export complete state
  if (result?.success) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
          <h2 className="text-xl font-bold text-green-400 mb-4">Export Complete</h2>
          <p className="text-gray-300 mb-4">
            Successfully exported {itemCount} {itemCount === 1 ? contentLabel : `${contentLabel}s`}.
          </p>
          <div className="flex flex-col gap-3">
            <button
              onClick={handleDownload}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-500"
            >
              Download File
            </button>
            <button
              onClick={handleCopy}
              className="w-full px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-500"
            >
              {copied ? 'Copied!' : 'Copy to Clipboard'}
            </button>
            <button
              onClick={handleClose}
              className="w-full px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-600"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Main export form
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
        <h2 className="text-xl font-bold text-white mb-4">
          Export {itemCount} {itemCount === 1 ? contentLabel : `${contentLabel}s`}
        </h2>

        {error && (
          <div className="bg-red-900/50 border border-red-500 text-red-200 px-4 py-2 rounded mb-4">
            {error}
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">
              Description (optional)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add a description for this export..."
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-500 resize-none"
              rows={3}
            />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">
              Password (required to sign)
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your vault password"
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-500"
            />
          </div>

          <div className="text-sm text-gray-400">
            Signed by: <span className="text-white">{publicIdentity.displayName}</span>
            <br />
            Friend code: <span className="font-mono text-xs">{publicIdentity.friendCode}</span>
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={handleClose}
            disabled={exporting}
            className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-500 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleExport}
            disabled={exporting || !password}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-500 disabled:opacity-50"
          >
            {exporting ? 'Exporting...' : 'Export'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ExportDialog;
