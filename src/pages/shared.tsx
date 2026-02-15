import Head from 'next/head';
import { useCallback, useEffect, useState } from 'react';

import type {
  ISharedItem,
  SharedItemsResponse,
  ViewMode,
} from '@/pages-modules/shared/types';

import {
  Button,
  EmptyState,
  PageError,
  PageLayout,
  PageLoading,
} from '@/components/ui';
import {
  InboxIcon,
  RefreshIcon,
  ShareIcon,
} from '@/pages-modules/shared/icons';
import { SharedItemCard } from '@/pages-modules/shared/SharedItemCard';
import { logger } from '@/utils/logger';

export default function SharedPage(): React.ReactElement {
  const [sharedWithMe, setSharedWithMe] = useState<ISharedItem[]>([]);
  const [mySharedItems, setMySharedItems] = useState<ISharedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('received');
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [revokeConfirmId, setRevokeConfirmId] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  const fetchSharedItems = useCallback(async () => {
    try {
      const response = await fetch('/api/vault/shared');
      if (!response.ok) {
        throw new Error('Failed to fetch shared items');
      }
      const data = (await response.json()) as SharedItemsResponse;
      setSharedWithMe(data.sharedWithMe);
      setMySharedItems(data.mySharedItems);
      setError(null);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to load shared items',
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSharedItems();
  }, [fetchSharedItems]);

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      await fetch('/api/vault/sync', { method: 'POST' });
      await fetchSharedItems();
    } catch (err) {
      logger.error('Sync failed:', err);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleView = (item: ISharedItem) => {
    const basePath = item.type === 'folder' ? '/folders' : `/${item.type}s`;
    window.location.href = `${basePath}/${item.id}`;
  };

  const handleRevoke = async (item: ISharedItem) => {
    setProcessingId(item.id);
    try {
      const endpoint =
        viewMode === 'received'
          ? `/api/vault/shared/received/${item.id}`
          : `/api/vault/shared/mine/${item.id}`;

      const response = await fetch(endpoint, { method: 'DELETE' });
      if (!response.ok) {
        throw new Error('Failed to revoke sharing');
      }

      if (viewMode === 'received') {
        setSharedWithMe((prev) => prev.filter((i) => i.id !== item.id));
      } else {
        setMySharedItems((prev) => prev.filter((i) => i.id !== item.id));
      }
      setRevokeConfirmId(null);
    } catch (err) {
      logger.error('Failed to revoke:', err);
    } finally {
      setProcessingId(null);
    }
  };

  const currentItems = viewMode === 'received' ? sharedWithMe : mySharedItems;

  if (loading) {
    return <PageLoading message="Loading shared items..." />;
  }

  if (error) {
    return (
      <PageError
        title="Error Loading Shared Items"
        message={error}
        backLink="/"
        backLabel="Return Home"
      />
    );
  }

  return (
    <>
      <Head>
        <title>Shared Items | MekStation</title>
      </Head>

      <PageLayout
        title="Shared Items"
        subtitle="View items shared with you and manage your shared content"
        maxWidth="wide"
        backLink={{ href: '/', label: 'Home' }}
        headerContent={
          <Button
            variant="secondary"
            onClick={handleSync}
            disabled={isSyncing}
            isLoading={isSyncing}
            leftIcon={<RefreshIcon className="h-4 w-4" />}
          >
            Sync Now
          </Button>
        }
      >
        <div className="mb-6 flex gap-2">
          <Button
            variant={viewMode === 'received' ? 'primary' : 'secondary'}
            onClick={() => setViewMode('received')}
            leftIcon={<InboxIcon className="h-4 w-4" />}
            className={
              viewMode === 'received' ? '!bg-cyan-600 hover:!bg-cyan-500' : ''
            }
          >
            Shared with Me
            {sharedWithMe.length > 0 && (
              <span className="ml-2 rounded bg-white/20 px-1.5 py-0.5 text-xs">
                {sharedWithMe.length}
              </span>
            )}
          </Button>
          <Button
            variant={viewMode === 'shared' ? 'primary' : 'secondary'}
            onClick={() => setViewMode('shared')}
            leftIcon={<ShareIcon className="h-4 w-4" />}
            className={
              viewMode === 'shared' ? '!bg-violet-600 hover:!bg-violet-500' : ''
            }
          >
            My Shared Items
            {mySharedItems.length > 0 && (
              <span className="ml-2 rounded bg-white/20 px-1.5 py-0.5 text-xs">
                {mySharedItems.length}
              </span>
            )}
          </Button>
        </div>

        {currentItems.length === 0 ? (
          <EmptyState
            icon={
              viewMode === 'received' ? (
                <InboxIcon className="text-text-theme-muted mx-auto h-12 w-12" />
              ) : (
                <ShareIcon className="text-text-theme-muted mx-auto h-12 w-12" />
              )
            }
            title={
              viewMode === 'received'
                ? 'Nothing shared with you yet'
                : "You haven't shared anything yet"
            }
            message={
              viewMode === 'received'
                ? 'When contacts share items with you, they will appear here.'
                : 'Share units, pilots, or forces with your contacts from their detail pages.'
            }
          />
        ) : (
          <>
            <div className="mb-6 flex flex-wrap gap-4">
              <div className="bg-surface-base/30 border-border-theme-subtle flex items-center gap-2 rounded-lg border px-4 py-2">
                <div className="h-2 w-2 rounded-full bg-emerald-500" />
                <span className="text-text-theme-secondary text-sm">
                  <span className="text-text-theme-primary font-medium">
                    {
                      currentItems.filter((i) => i.syncStatus === 'synced')
                        .length
                    }
                  </span>{' '}
                  synced
                </span>
              </div>
              <div className="bg-surface-base/30 border-border-theme-subtle flex items-center gap-2 rounded-lg border px-4 py-2">
                <div className="h-2 w-2 rounded-full bg-amber-500" />
                <span className="text-text-theme-secondary text-sm">
                  <span className="text-text-theme-primary font-medium">
                    {
                      currentItems.filter((i) => i.syncStatus === 'pending')
                        .length
                    }
                  </span>{' '}
                  pending
                </span>
              </div>
              {currentItems.filter((i) => i.syncStatus === 'conflict').length >
                0 && (
                <div className="bg-surface-base/30 border-border-theme-subtle flex items-center gap-2 rounded-lg border px-4 py-2">
                  <div className="h-2 w-2 rounded-full bg-red-500" />
                  <span className="text-text-theme-secondary text-sm">
                    <span className="text-text-theme-primary font-medium">
                      {
                        currentItems.filter((i) => i.syncStatus === 'conflict')
                          .length
                      }
                    </span>{' '}
                    conflicts
                  </span>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {currentItems.map((item) => (
                <SharedItemCard
                  key={item.id}
                  item={item}
                  viewMode={viewMode}
                  isProcessing={processingId === item.id}
                  showRevokeConfirm={revokeConfirmId === item.id}
                  onView={() => handleView(item)}
                  onRevoke={() => setRevokeConfirmId(item.id)}
                  onConfirmRevoke={() => handleRevoke(item)}
                  onCancelRevoke={() => setRevokeConfirmId(null)}
                />
              ))}
            </div>
          </>
        )}
      </PageLayout>
    </>
  );
}
