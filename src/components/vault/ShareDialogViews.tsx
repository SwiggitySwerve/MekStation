import React from 'react';

import type { IShareLink, PermissionLevel } from '@/types/vault';

import { InlineErrorMessage } from '@/components/common/InlineErrorMessage';

export type ExpiryOption =
  | 'none'
  | '1hour'
  | '1day'
  | '1week'
  | '1month'
  | 'custom';
export type MaxUsesOption = 'unlimited' | '1' | '5' | '10' | 'custom';

export interface ShareLinkResult {
  link: IShareLink;
  url: string;
}

interface ShareDialogSuccessProps {
  result: ShareLinkResult;
  copied: boolean;
  onCopy: () => void | Promise<void>;
  onCreateAnother: () => void;
  onClose: () => void;
}

export function ShareDialogSuccess({
  result,
  copied,
  onCopy,
  onCreateAnother,
  onClose,
}: ShareDialogSuccessProps): React.ReactElement {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="mx-4 w-full max-w-md rounded-lg bg-gray-800 p-6">
        <h2 className="mb-4 text-xl font-bold text-green-400">
          Share Link Created
        </h2>

        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm text-gray-400">
              Share Link
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                readOnly
                value={result.url}
                className="flex-1 rounded border border-gray-600 bg-gray-700 px-3 py-2 font-mono text-sm text-white"
              />
              <button
                onClick={onCopy}
                className="rounded bg-blue-600 px-4 py-2 whitespace-nowrap text-white hover:bg-blue-500"
              >
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
          </div>

          <div className="rounded-lg bg-gray-700 p-4">
            <h3 className="mb-2 font-medium text-white">Link Settings</h3>
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
              onClick={onCreateAnother}
              className="w-full rounded bg-gray-600 px-4 py-2 text-white hover:bg-gray-500"
            >
              Create Another Link
            </button>
            <button
              onClick={onClose}
              className="w-full rounded bg-gray-700 px-4 py-2 text-white hover:bg-gray-600"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

interface ShareDialogFormProps {
  itemName: string;
  level: PermissionLevel;
  expiryOption: ExpiryOption;
  customExpiry: string;
  maxUsesOption: MaxUsesOption;
  customMaxUses: number;
  label: string;
  creating: boolean;
  error: string | null;
  onLevelChange: (level: PermissionLevel) => void;
  onExpiryOptionChange: (option: ExpiryOption) => void;
  onCustomExpiryChange: (value: string) => void;
  onMaxUsesOptionChange: (option: MaxUsesOption) => void;
  onCustomMaxUsesChange: (value: number) => void;
  onLabelChange: (value: string) => void;
  onClose: () => void;
  onCreate: () => void | Promise<void>;
}

export function ShareDialogForm({
  itemName,
  level,
  expiryOption,
  customExpiry,
  maxUsesOption,
  customMaxUses,
  label,
  creating,
  error,
  onLevelChange,
  onExpiryOptionChange,
  onCustomExpiryChange,
  onMaxUsesOptionChange,
  onCustomMaxUsesChange,
  onLabelChange,
  onClose,
  onCreate,
}: ShareDialogFormProps): React.ReactElement {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="mx-4 w-full max-w-md rounded-lg bg-gray-800 p-6">
        <h2 className="mb-4 text-xl font-bold text-white">Share {itemName}</h2>

        <InlineErrorMessage message={error} variant="dialog" />

        <div className="space-y-4">
          {/* Permission Level */}
          <div>
            <label className="mb-1 block text-sm text-gray-400">
              Permission Level
            </label>
            <select
              value={level}
              onChange={(event) =>
                onLevelChange(event.target.value as PermissionLevel)
              }
              className="w-full rounded border border-gray-600 bg-gray-700 px-3 py-2 text-white"
            >
              <option value="read">Read - View and copy content</option>
              <option value="write">Write - View, copy, and edit</option>
              <option value="admin">
                Admin - Full access including re-share
              </option>
            </select>
          </div>

          {/* Expiration */}
          <div>
            <label className="mb-1 block text-sm text-gray-400">
              Link Expiration
            </label>
            <select
              value={expiryOption}
              onChange={(event) =>
                onExpiryOptionChange(event.target.value as ExpiryOption)
              }
              className="w-full rounded border border-gray-600 bg-gray-700 px-3 py-2 text-white"
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
                onChange={(event) => onCustomExpiryChange(event.target.value)}
                className="mt-2 w-full rounded border border-gray-600 bg-gray-700 px-3 py-2 text-white"
              />
            )}
          </div>

          {/* Max Uses */}
          <div>
            <label className="mb-1 block text-sm text-gray-400">
              Maximum Uses
            </label>
            <select
              value={maxUsesOption}
              onChange={(event) =>
                onMaxUsesOptionChange(event.target.value as MaxUsesOption)
              }
              className="w-full rounded border border-gray-600 bg-gray-700 px-3 py-2 text-white"
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
                onChange={(event) =>
                  onCustomMaxUsesChange(parseInt(event.target.value, 10) || 1)
                }
                className="mt-2 w-full rounded border border-gray-600 bg-gray-700 px-3 py-2 text-white"
                placeholder="Enter max uses"
              />
            )}
          </div>

          {/* Label */}
          <div>
            <label className="mb-1 block text-sm text-gray-400">
              Label (optional)
            </label>
            <input
              type="text"
              value={label}
              onChange={(event) => onLabelChange(event.target.value)}
              placeholder="e.g., For Discord server"
              className="w-full rounded border border-gray-600 bg-gray-700 px-3 py-2 text-white placeholder-gray-500"
            />
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={onClose}
            disabled={creating}
            className="rounded bg-gray-600 px-4 py-2 text-white hover:bg-gray-500 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onCreate}
            disabled={creating || (expiryOption === 'custom' && !customExpiry)}
            className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-500 disabled:opacity-50"
          >
            {creating ? 'Creating...' : 'Create Link'}
          </button>
        </div>
      </div>
    </div>
  );
}
