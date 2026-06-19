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

import { runBusyErrorOperation } from '@/components/common/runUiOperation';

import {
  ShareDialogForm,
  ShareDialogSuccess,
  type ExpiryOption,
  type MaxUsesOption,
  type ShareLinkResult,
} from './ShareDialogViews';
import { buildResponseError } from './vaultDialogApi';

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

// =============================================================================
// Helpers
// =============================================================================

function getExpiryDate(
  option: ExpiryOption,
  customDate?: string,
): string | null {
  if (option === 'none') return null;
  if (option === 'custom' && customDate)
    return new Date(customDate).toISOString();

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

function getMaxUses(
  option: MaxUsesOption,
  customValue?: number,
): number | null {
  if (option === 'unlimited') return null;
  if (option === 'custom' && customValue !== undefined) return customValue;
  return parseInt(option, 10);
}

interface CreateShareLinkRequest {
  scopeType: PermissionScopeType;
  scopeId?: string | null;
  scopeCategory?: ContentCategory | null;
  level: PermissionLevel;
  expiresAt: string | null;
  maxUses: number | null;
  label: string;
}

async function createShareLink({
  scopeType,
  scopeId,
  scopeCategory,
  level,
  expiresAt,
  maxUses,
  label,
}: CreateShareLinkRequest): Promise<ShareLinkResult> {
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
    throw await buildResponseError(
      response,
      'Response not JSON when creating share link',
      'Failed to create share link',
    );
  }

  return (await response.json()) as ShareLinkResult;
}

async function copyShareUrl(url: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(url);
  } catch {
    // Fallback for older browsers
    const textarea = document.createElement('textarea');
    textarea.value = url;
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
  }
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
  const [maxUsesOption, setMaxUsesOption] =
    useState<MaxUsesOption>('unlimited');
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
    await runBusyErrorOperation(
      setCreating,
      setError,
      'Failed to create share link',
      async () => {
        const expiresAt = getExpiryDate(expiryOption, customExpiry);
        const maxUses = getMaxUses(maxUsesOption, customMaxUses);

        const data = await createShareLink({
          scopeType,
          scopeId,
          scopeCategory,
          level,
          expiresAt,
          maxUses,
          label,
        });
        setResult(data);
        onShareCreated?.(data.link, data.url);
      },
    );
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

    await copyShareUrl(result.url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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
      <ShareDialogSuccess
        result={result}
        copied={copied}
        onCopy={handleCopy}
        onCreateAnother={handleCreateAnother}
        onClose={handleClose}
      />
    );
  }

  // Main form
  return (
    <ShareDialogForm
      itemName={itemName}
      level={level}
      expiryOption={expiryOption}
      customExpiry={customExpiry}
      maxUsesOption={maxUsesOption}
      customMaxUses={customMaxUses}
      label={label}
      creating={creating}
      error={error}
      onLevelChange={setLevel}
      onExpiryOptionChange={setExpiryOption}
      onCustomExpiryChange={setCustomExpiry}
      onMaxUsesOptionChange={setMaxUsesOption}
      onCustomMaxUsesChange={setCustomMaxUses}
      onLabelChange={setLabel}
      onClose={handleClose}
      onCreate={handleCreate}
    />
  );
}

export default ShareDialog;
