/**
 * Share Dialog Component
 *
 * Dialog for creating shareable links with configurable permissions,
 * expiration, and usage limits.
 *
 * @spec openspec/changes/add-vault-sharing/specs/vault-sharing/spec.md
 */

import React, { useState, useCallback } from 'react';
import type {
  PermissionLevel,
  PermissionScopeType,
  ContentCategory,
  IShareLink,
} from '@/types/vault';

// =============================================================================
// Types
// =============================================================================

export interface ShareDialogProps {
  /** Whether the dialog is open */
  isOpen: boolean;

  /** Close the dialog */
  onClose: () => void;

  /** Type of scope being shared */
  scopeType: PermissionScopeType;

  /** ID of the item/folder being shared (null for category/all) */
  scopeId?: string | null;

  /** Category for category-level shares */
  scopeCategory?: ContentCategory | null;

  /** Display name of the item being shared */
  itemName: string;

  /** Callback when share link is created successfully */
  onShareCreated?: (link: IShareLink, url: string) => void;
}

type ExpiryOption = 'none' | '1hour' | '1day' | '1week' | '1month' | 'custom';
type MaxUsesOption = 'unlimited' | '1' | '5' | '10' | 'custom';

interface ShareLinkResult {
  link: IShareLink;
  url: string;
}

// =============================================================================
// Helpers
// =============================================================================

function getExpiryDate(option: ExpiryOption, customDate?: string): string | null {
  if (option === 'none') return null;
  if (option === 'custom' && customDate) return new Date(customDate).toISOString();

  const now = new Date();
  switch (option) {
    case '1hour':
      return new Date(now.getTime() + 60 * 60 * 1000).toISOString();
    case '1day':
      return new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();
    case '1week':
      return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();
    case '1month':
      return new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();
    default:
      return null;
  }
}

function getMaxUses(option: MaxUsesOption, customValue?: number): number | null {
  if (option === 'unlimited') return null;
  if (option === 'custom' && customValue !== undefined) return customValue;
  return parseInt(option, 10);
}

// =============================================================================
// Component
// =============================================================================

export function ShareDialog({
  isOpen,
  onClose,
  scopeType,
  scopeId,
  scopeCategory,
  itemName,
  onShareCreated,
}: ShareDialogProps): React.ReactElement | null {
  // Form state
  const [level, setLevel] = useState<PermissionLevel>('read');
  const [expiryOption, setExpiryOption] = useState<ExpiryOption>('none');
  const [customExpiry, setCustomExpiry] = useState('');
  const [maxUsesOption, setMaxUsesOption] = useState<MaxUsesOption>('unlimited');
  const [customMaxUses, setCustomMaxUses] = useState<number>(25);
  const [label, setLabel] = useState('');

  // Operation state
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ShareLinkResult | null>(null);
  const [copied, setCopied] = useState(false);

  const resetForm = useCallback(() => {
    setLevel('read');
    setExpiryOption('none');
    setCustomExpiry('');
    setMaxUsesOption('unlimited');
    setCustomMaxUses(25);
    setLabel('');
    setError(null);
    setResult(null);
    setCopied(false);
  }, []);

  const handleCreate = useCallback(async () => {
    setCreating(true);
    setError(null);

    try {
      const expiresAt = getExpiryDate(expiryOption, customExpiry);
      const maxUses = getMaxUses(maxUsesOption, customMaxUses);

      const response = await fetch('/api/vault/share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scopeType,
          scopeId: scopeId ?? null,
          scopeCategory: scopeCategory ?? null,
          level,
          expiresAt,
          maxUses,
          label: label.trim() || undefined,
        }),
      });

      if (!response.ok) {
        const errorData = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(errorData.error || `Failed to create share link (${response.status})`);
      }

      const data = (await response.json()) as ShareLinkResult;
      setResult(data);
      onShareCreated?.(data.link, data.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create share link');
    } finally {
      setCreating(false);
    }
  }, [
    scopeType,
    scopeId,
    scopeCategory,
    level,
    expiryOption,
    customExpiry,
    maxUsesOption,
    customMaxUses,
    label,
    onShareCreated,
  ]);

  const handleCopy = useCallback(async () => {
    if (!result?.url) return;

    try {
      await navigator.clipboard.writeText(result.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const textarea = document.createElement('textarea');
      textarea.value = result.url;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [result]);

  const handleClose = useCallback(() => {
    resetForm();
    onClose();
  }, [resetForm, onClose]);

  const handleCreateAnother = useCallback(() => {
    resetForm();
  }, [resetForm]);

  if (!isOpen) return null;

  // Success state - show generated link
  if (result) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
          <h2 className="text-xl font-bold text-green-400 mb-4">Share Link Created</h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Share Link</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  readOnly
                  value={result.url}
                  className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white font-mono text-sm"
                />
                <button
                  onClick={handleCopy}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-500 whitespace-nowrap"
                >
                  {copied ? 'Copied!' : 'Copy'}
                </button>
              </div>
            </div>

            <div className="bg-gray-700 rounded-lg p-4">
              <h3 className="text-white font-medium mb-2">Link Settings</h3>
              <dl className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <dt className="text-gray-400">Permission:</dt>
                  <dd className="text-white capitalize">{result.link.level}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-400">Expires:</dt>
                  <dd className="text-white">
                    {result.link.expiresAt
                      ? new Date(result.link.expiresAt).toLocaleString()
                      : 'Never'}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-400">Max Uses:</dt>
                  <dd className="text-white">
                    {result.link.maxUses ?? 'Unlimited'}
                  </dd>
                </div>
                {result.link.label && (
                  <div className="flex justify-between">
                    <dt className="text-gray-400">Label:</dt>
                    <dd className="text-white">{result.link.label}</dd>
                  </div>
                )}
              </dl>
            </div>

            <div className="flex flex-col gap-3">
              <button
                onClick={handleCreateAnother}
                className="w-full px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-500"
              >
                Create Another Link
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
      </div>
    );
  }

  // Main form
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
        <h2 className="text-xl font-bold text-white mb-4">
          Share {itemName}
        </h2>

        {error && (
          <div className="bg-red-900/50 border border-red-500 text-red-200 px-4 py-2 rounded mb-4">
            {error}
          </div>
        )}

        <div className="space-y-4">
          {/* Permission Level */}
          <div>
            <label className="block text-sm text-gray-400 mb-1">
              Permission Level
            </label>
            <select
              value={level}
              onChange={(e) => setLevel(e.target.value as PermissionLevel)}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white"
            >
              <option value="read">Read - View and copy content</option>
              <option value="write">Write - View, copy, and edit</option>
              <option value="admin">Admin - Full access including re-share</option>
            </select>
          </div>

          {/* Expiration */}
          <div>
            <label className="block text-sm text-gray-400 mb-1">
              Link Expiration
            </label>
            <select
              value={expiryOption}
              onChange={(e) => setExpiryOption(e.target.value as ExpiryOption)}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white"
            >
              <option value="none">Never expires</option>
              <option value="1hour">1 hour</option>
              <option value="1day">1 day</option>
              <option value="1week">1 week</option>
              <option value="1month">1 month</option>
              <option value="custom">Custom date</option>
            </select>
            {expiryOption === 'custom' && (
              <input
                type="datetime-local"
                value={customExpiry}
                onChange={(e) => setCustomExpiry(e.target.value)}
                className="w-full mt-2 px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white"
              />
            )}
          </div>

          {/* Max Uses */}
          <div>
            <label className="block text-sm text-gray-400 mb-1">
              Maximum Uses
            </label>
            <select
              value={maxUsesOption}
              onChange={(e) => setMaxUsesOption(e.target.value as MaxUsesOption)}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white"
            >
              <option value="unlimited">Unlimited</option>
              <option value="1">1 use</option>
              <option value="5">5 uses</option>
              <option value="10">10 uses</option>
              <option value="custom">Custom</option>
            </select>
            {maxUsesOption === 'custom' && (
              <input
                type="number"
                min="1"
                value={customMaxUses}
                onChange={(e) => setCustomMaxUses(parseInt(e.target.value, 10) || 1)}
                className="w-full mt-2 px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white"
                placeholder="Enter max uses"
              />
            )}
          </div>

          {/* Label */}
          <div>
            <label className="block text-sm text-gray-400 mb-1">
              Label (optional)
            </label>
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="e.g., For Discord server"
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-500"
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={handleClose}
            disabled={creating}
            className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-500 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={creating || (expiryOption === 'custom' && !customExpiry)}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-500 disabled:opacity-50"
          >
            {creating ? 'Creating...' : 'Create Link'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ShareDialog;
