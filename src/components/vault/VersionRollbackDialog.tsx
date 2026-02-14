/**
 * Version Rollback Dialog Component
 *
 * Confirmation dialog for rolling back to a previous version, showing
 * current vs target version comparison and warning about the operation.
 *
 * @spec openspec/changes/add-vault-sharing/specs/vault-sharing/spec.md
 */

import React, { useState, useCallback } from 'react';

import { Button } from '@/components/ui/Button';

import type { VersionRollbackDialogProps } from './VersionHistoryTypes';

import { ArrowPathIcon, ExclamationTriangleIcon } from './VersionHistoryIcons';

export function VersionRollbackDialog({
  isOpen,
  onClose,
  version,
  currentVersion,
  onConfirm,
}: VersionRollbackDialogProps): React.ReactElement | null {
  const [isRollingBack, setIsRollingBack] = useState(false);

  const handleConfirm = useCallback(async () => {
    if (!version || !onConfirm) return;

    setIsRollingBack(true);
    try {
      await onConfirm(version);
    } finally {
      setIsRollingBack(false);
    }
  }, [version, onConfirm]);

  if (!isOpen || !version) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="mx-4 w-full max-w-md rounded-2xl border border-gray-700/50 bg-gray-800 p-6 shadow-2xl shadow-black/50">
        {/* Warning icon */}
        <div className="mb-5 flex items-center justify-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500/30 to-orange-500/20">
            <ExclamationTriangleIcon className="h-8 w-8 text-amber-400" />
          </div>
        </div>

        {/* Title */}
        <h2 className="mb-2 text-center text-xl font-bold text-white">
          Confirm Rollback
        </h2>
        <p className="mb-6 text-center text-sm text-gray-400">
          This will restore the content to a previous version
        </p>

        {/* Version info */}
        <div className="mb-6 rounded-xl border border-gray-700/50 bg-gray-900/50 p-4">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-sm text-gray-400">Rolling back from</span>
            <span className="text-sm text-gray-400">Restoring to</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-500/20">
                <span className="font-mono font-bold text-red-400">
                  v{currentVersion}
                </span>
              </div>
              <span className="text-sm text-gray-500">Current</span>
            </div>
            <div className="flex items-center gap-2 text-gray-600">
              <svg
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M17.25 8.25L21 12m0 0l-3.75 3.75M21 12H3"
                />
              </svg>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">Target</span>
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-500/20">
                <span className="font-mono font-bold text-green-400">
                  v{version.version}
                </span>
              </div>
            </div>
          </div>

          {version.message && (
            <div className="mt-4 border-t border-gray-700/50 pt-3">
              <p className="mb-1 text-xs text-gray-500">Version message</p>
              <p className="text-sm text-gray-300">{version.message}</p>
            </div>
          )}
        </div>

        {/* Warning message */}
        <div className="mb-6 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
          <div className="flex items-start gap-3">
            <ExclamationTriangleIcon className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-400" />
            <div className="text-sm">
              <p className="font-medium text-amber-300">Important</p>
              <p className="mt-1 text-amber-400/80">
                This will create a new version (v{currentVersion + 1}) with the
                content from v{version.version}. Your current version will be
                preserved in history.
              </p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <Button
            variant="secondary"
            fullWidth
            onClick={onClose}
            disabled={isRollingBack}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            fullWidth
            onClick={handleConfirm}
            isLoading={isRollingBack}
            disabled={isRollingBack}
            leftIcon={<ArrowPathIcon className="h-4 w-4" />}
          >
            Rollback
          </Button>
        </div>
      </div>
    </div>
  );
}
