/**
 * Version Preview Modal Component
 *
 * Full-screen modal displaying formatted version content with metadata,
 * copy-to-clipboard action, and optional rollback trigger.
 *
 * @spec openspec/changes/add-vault-sharing/specs/vault-sharing/spec.md
 */

import React, { useState, useCallback } from 'react';

import { Button } from '@/components/ui/Button';
import {
  formatBytes,
  formatRelativeTime,
  formatFullDateTime,
} from '@/utils/formatting';

import type { VersionPreviewProps } from './VersionHistoryTypes';

import {
  ClockIcon,
  ArrowPathIcon,
  DocumentDuplicateIcon,
  XMarkIcon,
  CheckIcon,
  ServerStackIcon,
  UserCircleIcon,
} from './VersionHistoryIcons';

function getCreatorDisplay(createdBy: string): string {
  if (createdBy === 'local') return 'You';
  if (createdBy.length > 12) return createdBy.slice(0, 8) + '...';
  return createdBy;
}

export function VersionPreview({
  isOpen,
  onClose,
  version,
  onRollback,
}: VersionPreviewProps): React.ReactElement | null {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    if (!version) return;

    try {
      await navigator.clipboard.writeText(version.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = version.content;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [version]);

  const handleClose = useCallback(() => {
    setCopied(false);
    onClose();
  }, [onClose]);

  if (!isOpen || !version) return null;

  let formattedContent = version.content;
  try {
    const parsed = JSON.parse(version.content) as unknown;
    formattedContent = JSON.stringify(parsed, null, 2);
  } catch {
    // Keep as-is if not valid JSON
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="mx-4 flex max-h-[85vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-gray-700/50 bg-gray-800 shadow-2xl shadow-black/50">
        {/* Header */}
        <div className="relative flex-shrink-0 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/20 via-teal-500/10 to-transparent" />
          <div className="relative border-b border-gray-700/50 p-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500/30 to-teal-500/20 shadow-lg shadow-cyan-500/10">
                  <span className="font-mono text-2xl font-bold text-cyan-300">
                    {version.version}
                  </span>
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">
                    Version Preview
                  </h2>
                  <p className="mt-0.5 text-sm text-gray-400">
                    {version.message || 'No description'} &middot;{' '}
                    {formatRelativeTime(version.createdAt)}
                  </p>
                </div>
              </div>
              <button
                onClick={handleClose}
                className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-700/50 hover:text-white"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
          </div>
        </div>

        {/* Meta info */}
        <div className="flex-shrink-0 border-b border-gray-700/50 bg-gray-800/50 p-4">
          <div className="flex items-center gap-6 text-sm">
            <div className="flex items-center gap-2 text-gray-400">
              <UserCircleIcon className="h-4 w-4" />
              <span>Created by {getCreatorDisplay(version.createdBy)}</span>
            </div>
            <div className="flex items-center gap-2 text-gray-400">
              <ClockIcon className="h-4 w-4" />
              <span title={formatFullDateTime(version.createdAt)}>
                {formatFullDateTime(version.createdAt)}
              </span>
            </div>
            <div className="flex items-center gap-2 text-gray-400">
              <ServerStackIcon className="h-4 w-4" />
              <span>{formatBytes(version.sizeBytes)}</span>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-4">
          <div className="relative">
            <pre className="overflow-x-auto rounded-xl border border-gray-700/50 bg-gray-900/50 p-4 font-mono text-sm leading-relaxed whitespace-pre text-gray-300">
              {formattedContent}
            </pre>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-shrink-0 items-center justify-between gap-4 border-t border-gray-700/50 bg-gray-800/80 p-4">
          <div className="flex items-center gap-2 font-mono text-xs text-gray-500">
            Hash: {version.contentHash.slice(0, 16)}...
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="secondary"
              onClick={handleCopy}
              leftIcon={
                copied ? (
                  <CheckIcon className="h-4 w-4 text-green-400" />
                ) : (
                  <DocumentDuplicateIcon className="h-4 w-4" />
                )
              }
            >
              {copied ? 'Copied!' : 'Copy JSON'}
            </Button>
            {onRollback && (
              <Button
                variant="primary"
                onClick={() => onRollback(version)}
                leftIcon={<ArrowPathIcon className="h-4 w-4" />}
              >
                Rollback to This
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
