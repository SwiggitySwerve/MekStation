import Head from 'next/head';
import { useCallback, useEffect, useState } from 'react';

import type {
  ActionState,
  ShareLinksResponse,
} from '@/pages-modules/share/types';
import type { IShareLink } from '@/types/vault';

import {
  Badge,
  Button,
  Card,
  EmptyState,
  PageError,
  PageLayout,
  PageLoading,
} from '@/components/ui';
import {
  buildShareUrl,
  getLevelVariant,
  getLinkStatus,
  getScopeDisplay,
} from '@/pages-modules/share/helpers';
import {
  CheckIcon,
  CopyIcon,
  LinkIcon,
  ToggleOnIcon,
  TrashIcon,
} from '@/pages-modules/share/icons';
import { formatExpiry } from '@/utils/formatting';
import { logger } from '@/utils/logger';

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

  const handleCopy = async (link: IShareLink) => {
    setActionState({ linkId: link.id, type: 'copy' });
    try {
      const url = buildShareUrl(link.token);
      await navigator.clipboard.writeText(url);
      setCopiedId(link.id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      logger.error('Failed to copy:', err);
    } finally {
      setActionState({ linkId: null, type: null });
    }
  };

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

      setLinks((prev) =>
        prev.map((l) =>
          l.id === link.id ? { ...l, isActive: !l.isActive } : l,
        ),
      );
    } catch (err) {
      logger.error('Failed to toggle:', err);
    } finally {
      setActionState({ linkId: null, type: null });
    }
  };

  const handleDelete = async (link: IShareLink) => {
    setActionState({ linkId: link.id, type: 'delete' });
    try {
      const response = await fetch(`/api/vault/share/${link.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete link');
      }

      setLinks((prev) => prev.filter((l) => l.id !== link.id));
      setDeleteConfirmId(null);
    } catch (err) {
      logger.error('Failed to delete:', err);
    } finally {
      setActionState({ linkId: null, type: null });
    }
  };

  if (loading) {
    return <PageLoading message="Loading share links..." />;
  }

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
        {links.length === 0 ? (
          <EmptyState
            icon={
              <LinkIcon className="text-text-theme-muted mx-auto h-12 w-12" />
            }
            title="No share links yet"
            message="Share links you create will appear here. Use the Share button on any vault item to get started."
          />
        ) : (
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

                        <td className="px-4 py-3">
                          <span className="text-text-theme-secondary text-sm">
                            {getScopeDisplay(link)}
                          </span>
                        </td>

                        <td className="px-4 py-3">
                          <Badge
                            variant={getLevelVariant(link.level)}
                            size="sm"
                          >
                            {link.level.charAt(0).toUpperCase() +
                              link.level.slice(1)}
                          </Badge>
                        </td>

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

                        <td className="px-4 py-3">
                          <Badge variant={status.variant} size="sm">
                            {status.label}
                          </Badge>
                        </td>

                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-1">
                            {showDeleteConfirm ? (
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
                              <>
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
