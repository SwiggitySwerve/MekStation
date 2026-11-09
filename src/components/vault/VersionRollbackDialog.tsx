/**
 * Version Rollback Dialog Component
 *
 * Confirmation dialog for rolling back to a previous version, showing
 * current vs target version comparison and warning about the operation.
 *
 * @spec openspec/changes/add-vault-sharing/specs/vault-sharing/spec.md
 */

import React, { useState, useCallback } from 'react';

import { runBusyOperation } from '@/components/common/runUiOperation';
import { Button } from '@/components/ui/Button';
import { SvgIcon } from '@/components/ui/SvgIcon';

import type { VersionRollbackDialogProps } from './VersionHistoryTypes';

import { VaultDialogFrame } from './VaultDialogFrame';
import { ArrowPathIcon, ExclamationTriangleIcon } from './VersionHistoryIcons';

export function VersionRollbackDialog({
  isOpen,
  onClose,
  version,
  currentVersion,
  onConfirm,
  error,
}: VersionRollbackDialogProps): React.ReactElement | null {
  const [isRollingBack, setIsRollingBack] = useState(false);

  const handleConfirm = useCallback(async () => {
    if (!version || !onConfirm) return;

    await runBusyOperation(setIsRollingBack, async () => {
      await onConfirm(version);
    });
  }, [version, onConfirm]);

  if (!isOpen || !version) return null;

  return (
    <VaultDialogFrame
      overlayClassName="bg-black/70 backdrop-blur-sm"
      panelClassName="mx-4 w-full max-w-md rounded-2xl border border-border-theme/50 bg-surface-base p-6 shadow-2xl shadow-black/50"
    >
      {/* Warning icon */}
      <div className="mb-5 flex items-center justify-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500/30 to-orange-500/20">
          <ExclamationTriangleIcon size="feature" className="text-amber-400" />
        </div>
      </div>

      {/* Title */}
      <h2 className="text-text-theme-primary mb-2 text-center text-xl font-bold">
        Confirm Rollback
      </h2>
      <p className="text-text-theme-secondary mb-6 text-center text-sm">
        This will restore the content to a previous version
      </p>

      {/* Version info */}
      <div className="border-border-theme/50 bg-surface-deep/50 mb-6 rounded-xl border p-4">
        <div className="mb-3 flex items-center justify-between">
          <span className="text-text-theme-secondary text-sm">
            Rolling back from
          </span>
          <span className="text-text-theme-secondary text-sm">
            Restoring to
          </span>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-500/20">
              <span className="font-mono font-bold text-red-400">
                v{currentVersion}
              </span>
            </div>
            <span className="text-text-theme-muted text-sm">Current</span>
          </div>
          <div className="text-text-theme-muted flex items-center gap-2">
            <SvgIcon
              size="control"
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M17.25 8.25L21 12m0 0l-3.75 3.75M21 12H3"
              />
            </SvgIcon>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-text-theme-muted text-sm">Target</span>
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-500/20">
              <span className="font-mono font-bold text-green-400">
                v{version.version}
              </span>
            </div>
          </div>
        </div>

        {version.message && (
          <div className="border-border-theme/50 mt-4 border-t pt-3">
            <p className="text-text-theme-muted mb-1 text-xs">
              Version message
            </p>
            <p className="text-text-theme-secondary text-sm">
              {version.message}
            </p>
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

      {error && (
        <p
          role="alert"
          className="mb-4 rounded-xl border border-red-500/30 bg-red-900/30 p-4 text-sm text-red-300"
        >
          {error}
        </p>
      )}

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
    </VaultDialogFrame>
  );
}
