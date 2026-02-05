import Head from 'next/head';
/**
 * Manage Share Links Page
 * View and manage existing vault share links with status indicators and actions.
 */
import { useEffect, useState, useCallback } from 'react';

import type { IShareLink } from '@/types/vault';

import {
  PageLayout,
  PageLoading,
  PageError,
  EmptyState,
  Card,
  Button,
  Badge,
} from '@/components/ui';
import { formatExpiry } from '@/utils/formatting';

// =============================================================================
// Types
// =============================================================================

interface ShareLinksResponse {
  links: IShareLink[];
  count: number;
}

interface ActionState {
  linkId: string | null;
  type: 'copy' | 'toggle' | 'delete' | null;
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Build share URL from token
 */
function buildShareUrl(token: string): string {
  return `mekstation://share/${token}`;
}

/**
 * Get scope display text
 */
function getScopeDisplay(link: IShareLink): string {
  switch (link.scopeType) {
    case 'all':
      return 'All Content';
    case 'category':
      return link.scopeCategory
        ? link.scopeCategory.charAt(0).toUpperCase() +
            link.scopeCategory.slice(1)
        : 'Category';
    case 'folder':
      return 'Folder';
    case 'item':
      return 'Single Item';
    default:
      return link.scopeType;
  }
}

/**
 * Get permission level badge variant
 */
function getLevelVariant(level: string): 'emerald' | 'amber' | 'violet' {
  switch (level) {
    case 'read':
      return 'emerald';
    case 'write':
      return 'amber';
    case 'admin':
      return 'violet';
    default:
      return 'emerald';
  }
}

/**
 * Determine link status
 */
function getLinkStatus(link: IShareLink): {
  label: string;
  variant: 'emerald' | 'red' | 'amber' | 'slate';
} {
  if (!link.isActive) {
    return { label: 'Inactive', variant: 'slate' };
  }

  const expiry = formatExpiry(link.expiresAt);
  if (expiry.isExpired) {
    return { label: 'Expired', variant: 'red' };
  }

  if (link.maxUses !== null && link.useCount >= link.maxUses) {
    return { label: 'Max Uses', variant: 'amber' };
  }

  return { label: 'Active', variant: 'emerald' };
}

// =============================================================================
// Icons
// =============================================================================

function CopyIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      className={className}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184"
      />
    </svg>
  );
}

function CheckIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={2}
      stroke="currentColor"
      className={className}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M4.5 12.75l6 6 9-13.5"
      />
    </svg>
  );
}

function ToggleOnIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      className={className}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M5.636 5.636a9 9 0 1012.728 0M12 3v9"
      />
    </svg>
  );
}

function TrashIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      className={className}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
      />
    </svg>
  );
}

function LinkIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      className={className}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244"
      />
    </svg>
  );
}

// =============================================================================
// Main Component
// =============================================================================

export default function ManageShareLinksPage(): React.ReactElement {
  const [links, setLinks] = useState<IShareLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionState, setActionState] = useState<ActionState>({
    linkId: null,
    type: null,
  });
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Fetch links
  const fetchLinks = useCallback(async () => {
    try {
      const response = await fetch('/api/vault/share');
      if (!response.ok) {
        throw new Error('Failed to fetch share links');
      }
      const data = (await response.json()) as ShareLinksResponse;
      setLinks(data.links);
      setError(null);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to load share links',
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLinks();
  }, [fetchLinks]);

  // Copy URL to clipboard
  const handleCopy = async (link: IShareLink) => {
    setActionState({ linkId: link.id, type: 'copy' });
    try {
      const url = buildShareUrl(link.token);
      await navigator.clipboard.writeText(url);
      setCopiedId(link.id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    } finally {
      setActionState({ linkId: null, type: null });
    }
  };

  // Toggle active status
  const handleToggleActive = async (link: IShareLink) => {
    setActionState({ linkId: link.id, type: 'toggle' });
    try {
      const response = await fetch(`/api/vault/share/${link.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !link.isActive }),
      });

      if (!response.ok) {
        throw new Error('Failed to update link');
      }

      // Update local state
      setLinks((prev) =>
        prev.map((l) =>
          l.id === link.id ? { ...l, isActive: !l.isActive } : l,
        ),
      );
    } catch (err) {
      console.error('Failed to toggle:', err);
    } finally {
      setActionState({ linkId: null, type: null });
    }
  };

  // Delete link
  const handleDelete = async (link: IShareLink) => {
    setActionState({ linkId: link.id, type: 'delete' });
    try {
      const response = await fetch(`/api/vault/share/${link.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete link');
      }

      // Remove from local state
      setLinks((prev) => prev.filter((l) => l.id !== link.id));
      setDeleteConfirmId(null);
    } catch (err) {
      console.error('Failed to delete:', err);
    } finally {
      setActionState({ linkId: null, type: null });
    }
  };

  // Loading state
  if (loading) {
    return <PageLoading message="Loading share links..." />;
  }

  // Error state
  if (error) {
    return (
      <PageError
        title="Error Loading Share Links"
        message={error}
        backLink="/"
        backLabel="Return Home"
      />
    );
  }

  return (
    <>
      <Head>
        <title>Manage Share Links | MekStation</title>
      </Head>

      <PageLayout
        title="Share Links"
        subtitle={`Manage ${links.length} share link${links.length !== 1 ? 's' : ''} for your vault content`}
        maxWidth="wide"
        backLink={{ href: '/', label: 'Home' }}
      >
        {/* Empty State */}
        {links.length === 0 ? (
          <EmptyState
            icon={
              <LinkIcon className="text-text-theme-muted mx-auto h-12 w-12" />
            }
            title="No share links yet"
            message="Share links you create will appear here. Use the Share button on any vault item to get started."
          />
        ) : (
          /* Links Table */
          <Card variant="dark" className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px]">
                <thead className="bg-surface-base">
                  <tr className="text-text-theme-secondary text-left text-xs tracking-wide uppercase">
                    <th className="px-4 py-3 font-medium">Label</th>
                    <th className="px-4 py-3 font-medium">Scope</th>
                    <th className="px-4 py-3 font-medium">Level</th>
                    <th className="px-4 py-3 text-center font-medium">Uses</th>
                    <th className="px-4 py-3 font-medium">Expires</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 text-right font-medium">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-border-theme-subtle/50 divide-y">
                  {links.map((link) => {
                    const status = getLinkStatus(link);
                    const expiry = formatExpiry(link.expiresAt);
                    const isProcessing = actionState.linkId === link.id;
                    const showDeleteConfirm = deleteConfirmId === link.id;

                    return (
                      <tr
                        key={link.id}
                        className={`transition-colors ${!link.isActive ? 'opacity-60' : 'hover:bg-surface-raised/30'} `}
                      >
                        {/* Label */}
                        <td className="px-4 py-3">
                          <div className="flex flex-col">
                            <span className="text-text-theme-primary text-sm font-medium">
                              {link.label || 'Untitled'}
                            </span>
                            <span className="text-text-theme-muted mt-0.5 font-mono text-xs">
                              {link.token.slice(0, 12)}...
                            </span>
                          </div>
                        </td>

                        {/* Scope */}
                        <td className="px-4 py-3">
                          <span className="text-text-theme-secondary text-sm">
                            {getScopeDisplay(link)}
                          </span>
                        </td>

                        {/* Level */}
                        <td className="px-4 py-3">
                          <Badge
                            variant={getLevelVariant(link.level)}
                            size="sm"
                          >
                            {link.level.charAt(0).toUpperCase() +
                              link.level.slice(1)}
                          </Badge>
                        </td>

                        {/* Uses */}
                        <td className="px-4 py-3 text-center">
                          <span className="text-text-theme-secondary font-mono text-sm">
                            {link.useCount}
                            {link.maxUses !== null && (
                              <span className="text-text-theme-muted">
                                /{link.maxUses}
                              </span>
                            )}
                          </span>
                        </td>

                        {/* Expires */}
                        <td className="px-4 py-3">
                          <span
                            className={`text-sm ${
                              expiry.isExpired
                                ? 'text-red-400'
                                : 'text-text-theme-secondary'
                            }`}
                          >
                            {expiry.text}
                          </span>
                        </td>

                        {/* Status */}
                        <td className="px-4 py-3">
                          <Badge variant={status.variant} size="sm">
                            {status.label}
                          </Badge>
                        </td>

                        {/* Actions */}
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-1">
                            {showDeleteConfirm ? (
                              /* Delete Confirmation */
                              <>
                                <Button
                                  variant="danger"
                                  size="sm"
                                  onClick={() => handleDelete(link)}
                                  disabled={isProcessing}
                                  isLoading={
                                    isProcessing &&
                                    actionState.type === 'delete'
                                  }
                                  className="text-xs"
                                >
                                  Confirm
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setDeleteConfirmId(null)}
                                  disabled={isProcessing}
                                  className="text-xs"
                                >
                                  Cancel
                                </Button>
                              </>
                            ) : (
                              /* Normal Actions */
                              <>
                                {/* Copy */}
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleCopy(link)}
                                  disabled={isProcessing}
                                  title="Copy share URL"
                                  className={
                                    copiedId === link.id
                                      ? 'text-emerald-400'
                                      : ''
                                  }
                                >
                                  {copiedId === link.id ? (
                                    <CheckIcon className="h-4 w-4" />
                                  ) : (
                                    <CopyIcon className="h-4 w-4" />
                                  )}
                                </Button>

                                {/* Toggle Active */}
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleToggleActive(link)}
                                  disabled={isProcessing}
                                  isLoading={
                                    isProcessing &&
                                    actionState.type === 'toggle'
                                  }
                                  title={
                                    link.isActive
                                      ? 'Deactivate link'
                                      : 'Activate link'
                                  }
                                  className={
                                    link.isActive
                                      ? 'text-amber-400'
                                      : 'text-text-theme-muted'
                                  }
                                >
                                  <ToggleOnIcon className="h-4 w-4" />
                                </Button>

                                {/* Delete */}
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setDeleteConfirmId(link.id)}
                                  disabled={isProcessing}
                                  title="Delete link"
                                  className="text-red-400/70 hover:text-red-400"
                                >
                                  <TrashIcon className="h-4 w-4" />
                                </Button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Summary Footer */}
            <div className="bg-surface-base/50 border-border-theme-subtle/50 border-t px-4 py-3">
              <div className="text-text-theme-muted flex items-center justify-between text-xs">
                <span>
                  {links.filter((l) => l.isActive).length} active •{' '}
                  {links.filter((l) => !l.isActive).length} inactive
                </span>
                <span>
                  Total uses: {links.reduce((sum, l) => sum + l.useCount, 0)}
                </span>
              </div>
            </div>
          </Card>
        )}
      </PageLayout>
    </>
  );
}
