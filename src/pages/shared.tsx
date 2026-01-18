/**
 * Shared Items Page
 * View items shared with you and items you've shared with others.
 */
import { useEffect, useState, useCallback } from 'react';
import Head from 'next/head';
import {
  PageLayout,
  PageLoading,
  PageError,
  EmptyState,
  Card,
  Button,
  Badge,
} from '@/components/ui';
import type {
  PermissionLevel,
  ShareableContentType,
} from '@/types/vault';

// =============================================================================
// Types
// =============================================================================

/**
 * A shared item (either shared with me or shared by me)
 */
interface ISharedItem {
  /** Unique ID */
  id: string;

  /** Item name */
  name: string;

  /** Type of content */
  type: ShareableContentType | 'folder';

  /** Permission level */
  level: PermissionLevel;

  /** Owner's friend code (null if I own it) */
  ownerId: string | null;

  /** Owner's display name */
  ownerName: string;

  /** Recipients (for items I shared) */
  sharedWith?: {
    friendCode: string;
    name: string;
    level: PermissionLevel;
  }[];

  /** When sharing was established */
  sharedAt: string;

  /** Last sync time */
  lastSyncAt: string | null;

  /** Sync status */
  syncStatus: 'synced' | 'pending' | 'conflict' | 'offline';
}

interface SharedItemsResponse {
  sharedWithMe: ISharedItem[];
  mySharedItems: ISharedItem[];
}

type ViewMode = 'received' | 'shared';

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Format date for display
 */
function formatDate(isoDate: string): string {
  const date = new Date(isoDate);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/**
 * Format relative time
 */
function formatRelativeTime(isoDate: string | null): string {
  if (!isoDate) return 'Never';

  const date = new Date(isoDate);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMinutes < 1) return 'Just now';
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return formatDate(isoDate);
}

/**
 * Get content type icon and label
 */
function getTypeDisplay(type: ShareableContentType | 'folder'): {
  icon: React.ReactNode;
  label: string;
  color: string;
} {
  switch (type) {
    case 'unit':
      return { icon: <MechIcon className="w-5 h-5" />, label: 'Unit', color: 'text-cyan-400' };
    case 'pilot':
      return { icon: <PilotIcon className="w-5 h-5" />, label: 'Pilot', color: 'text-violet-400' };
    case 'force':
      return { icon: <ForceIcon className="w-5 h-5" />, label: 'Force', color: 'text-amber-400' };
    case 'encounter':
      return { icon: <EncounterIcon className="w-5 h-5" />, label: 'Encounter', color: 'text-rose-400' };
    case 'folder':
      return { icon: <FolderIcon className="w-5 h-5" />, label: 'Folder', color: 'text-emerald-400' };
    default:
      return { icon: <DocumentIcon className="w-5 h-5" />, label: 'Item', color: 'text-slate-400' };
  }
}

/**
 * Get permission level badge variant
 */
function getLevelVariant(level: PermissionLevel): 'emerald' | 'amber' | 'violet' {
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
 * Get sync status badge
 */
function getSyncStatusDisplay(status: ISharedItem['syncStatus']): {
  variant: 'emerald' | 'amber' | 'red' | 'slate';
  label: string;
} {
  switch (status) {
    case 'synced':
      return { variant: 'emerald', label: 'Synced' };
    case 'pending':
      return { variant: 'amber', label: 'Pending' };
    case 'conflict':
      return { variant: 'red', label: 'Conflict' };
    case 'offline':
    default:
      return { variant: 'slate', label: 'Offline' };
  }
}

// =============================================================================
// Icons
// =============================================================================

function MechIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 17.25v1.007a3 3 0 01-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0115 18.257V17.25m6-12V15a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 15V5.25m18 0A2.25 2.25 0 0018.75 3H5.25A2.25 2.25 0 003 5.25m18 0V12a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 12V5.25" />
    </svg>
  );
}

function PilotIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
    </svg>
  );
}

function ForceIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
    </svg>
  );
}

function EncounterIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
    </svg>
  );
}

function FolderIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
    </svg>
  );
}

function DocumentIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
    </svg>
  );
}

function ShareIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z" />
    </svg>
  );
}

function InboxIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 13.5h3.86a2.25 2.25 0 012.012 1.244l.256.512a2.25 2.25 0 002.013 1.244h3.218a2.25 2.25 0 002.013-1.244l.256-.512a2.25 2.25 0 012.013-1.244h3.859m-19.5.338V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18v-4.162c0-.224-.034-.447-.1-.661L19.24 5.338a2.25 2.25 0 00-2.15-1.588H6.911a2.25 2.25 0 00-2.15 1.588L2.35 13.177a2.25 2.25 0 00-.1.661z" />
    </svg>
  );
}

function RefreshIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
    </svg>
  );
}

function EyeIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}

function TrashIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
    </svg>
  );
}

function CheckIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
    </svg>
  );
}

// =============================================================================
// Shared Item Card Component
// =============================================================================

interface SharedItemCardProps {
  item: ISharedItem;
  viewMode: ViewMode;
  isProcessing: boolean;
  showRevokeConfirm: boolean;
  onView: () => void;
  onRevoke: () => void;
  onConfirmRevoke: () => void;
  onCancelRevoke: () => void;
}

function SharedItemCard({
  item,
  viewMode,
  isProcessing,
  showRevokeConfirm,
  onView,
  onRevoke,
  onConfirmRevoke,
  onCancelRevoke,
}: SharedItemCardProps): React.ReactElement {
  const typeDisplay = getTypeDisplay(item.type);
  const syncStatus = getSyncStatusDisplay(item.syncStatus);

  return (
    <Card variant="dark" className="group relative overflow-hidden hover:border-border-theme transition-all duration-200">
      {/* Gradient overlay on hover */}
      <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/0 to-violet-500/0 group-hover:from-cyan-500/5 group-hover:to-violet-500/5 transition-all duration-300 pointer-events-none" />

      <div className="relative">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            {/* Type Icon */}
            <div className={`flex-shrink-0 w-10 h-10 rounded-lg bg-surface-raised/50 flex items-center justify-center ${typeDisplay.color}`}>
              {typeDisplay.icon}
            </div>

            {/* Name & Type */}
            <div className="min-w-0">
              <h3 className="font-semibold text-text-theme-primary truncate">
                {item.name}
              </h3>
              <p className="text-xs text-text-theme-muted">
                {typeDisplay.label}
              </p>
            </div>
          </div>

          {/* Sync Status */}
          <Badge variant={syncStatus.variant} size="sm">
            {syncStatus.label}
          </Badge>
        </div>

        {/* Info Grid */}
        <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
          {/* Owner / Recipients */}
          <div>
            <span className="text-text-theme-muted text-xs block mb-1">
              {viewMode === 'received' ? 'From' : 'Shared with'}
            </span>
            {viewMode === 'received' ? (
              <span className="text-text-theme-secondary font-medium">
                {item.ownerName}
              </span>
            ) : (
              <span className="text-text-theme-secondary font-medium">
                {item.sharedWith && item.sharedWith.length > 0
                  ? item.sharedWith.length === 1
                    ? item.sharedWith[0].name
                    : `${item.sharedWith.length} contacts`
                  : 'No one'}
              </span>
            )}
          </div>

          {/* Permission Level */}
          <div>
            <span className="text-text-theme-muted text-xs block mb-1">Permission</span>
            <Badge variant={getLevelVariant(item.level)} size="sm">
              {item.level.charAt(0).toUpperCase() + item.level.slice(1)}
            </Badge>
          </div>

          {/* Shared Date */}
          <div>
            <span className="text-text-theme-muted text-xs block mb-1">Shared</span>
            <span className="text-text-theme-secondary">
              {formatDate(item.sharedAt)}
            </span>
          </div>

          {/* Last Sync */}
          <div>
            <span className="text-text-theme-muted text-xs block mb-1">Last sync</span>
            <span className="text-text-theme-secondary">
              {formatRelativeTime(item.lastSyncAt)}
            </span>
          </div>
        </div>

        {/* Shared With List (for items I shared) */}
        {viewMode === 'shared' && item.sharedWith && item.sharedWith.length > 0 && (
          <div className="mt-3 pt-3 border-t border-border-theme-subtle/50">
            <span className="text-text-theme-muted text-xs block mb-2">Recipients</span>
            <div className="flex flex-wrap gap-1.5">
              {item.sharedWith.slice(0, 3).map((recipient) => (
                <span
                  key={recipient.friendCode}
                  className="text-xs px-2 py-0.5 bg-surface-raised/50 rounded text-text-theme-secondary"
                >
                  {recipient.name}
                </span>
              ))}
              {item.sharedWith.length > 3 && (
                <span className="text-xs px-2 py-0.5 bg-surface-raised/50 rounded text-text-theme-muted">
                  +{item.sharedWith.length - 3} more
                </span>
              )}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="mt-4 pt-4 border-t border-border-theme-subtle/50 flex items-center justify-end gap-2">
          {showRevokeConfirm ? (
            <>
              <span className="text-sm text-text-theme-muted mr-2">
                {viewMode === 'received' ? 'Remove from library?' : 'Revoke sharing?'}
              </span>
              <Button
                variant="danger"
                size="sm"
                onClick={onConfirmRevoke}
                disabled={isProcessing}
                isLoading={isProcessing}
              >
                <CheckIcon className="w-4 h-4" />
                Confirm
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={onCancelRevoke}
                disabled={isProcessing}
              >
                Cancel
              </Button>
            </>
          ) : (
            <>
              {/* View */}
              <Button
                variant="ghost"
                size="sm"
                onClick={onView}
                disabled={isProcessing}
                title="View item"
              >
                <EyeIcon className="w-4 h-4" />
              </Button>

              {/* Revoke / Remove */}
              <Button
                variant="ghost"
                size="sm"
                onClick={onRevoke}
                disabled={isProcessing}
                title={viewMode === 'received' ? 'Remove from library' : 'Revoke sharing'}
                className="text-red-400/70 hover:text-red-400"
              >
                <TrashIcon className="w-4 h-4" />
              </Button>
            </>
          )}
        </div>
      </div>
    </Card>
  );
}

// =============================================================================
// Main Component
// =============================================================================

export default function SharedPage(): React.ReactElement {
  const [sharedWithMe, setSharedWithMe] = useState<ISharedItem[]>([]);
  const [mySharedItems, setMySharedItems] = useState<ISharedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('received');
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [revokeConfirmId, setRevokeConfirmId] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  // Fetch shared items
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
      setError(err instanceof Error ? err.message : 'Failed to load shared items');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSharedItems();
  }, [fetchSharedItems]);

  // Trigger sync
  const handleSync = async () => {
    setIsSyncing(true);
    try {
      await fetch('/api/vault/sync', { method: 'POST' });
      await fetchSharedItems();
    } catch (err) {
      console.error('Sync failed:', err);
    } finally {
      setIsSyncing(false);
    }
  };

  // View item
  const handleView = (item: ISharedItem) => {
    // Navigate to item detail page based on type
    const basePath = item.type === 'folder' ? '/folders' : `/${item.type}s`;
    window.location.href = `${basePath}/${item.id}`;
  };

  // Revoke/remove sharing
  const handleRevoke = async (item: ISharedItem) => {
    setProcessingId(item.id);
    try {
      const endpoint = viewMode === 'received'
        ? `/api/vault/shared/received/${item.id}`
        : `/api/vault/shared/mine/${item.id}`;

      const response = await fetch(endpoint, { method: 'DELETE' });
      if (!response.ok) {
        throw new Error('Failed to revoke sharing');
      }

      // Update local state
      if (viewMode === 'received') {
        setSharedWithMe((prev) => prev.filter((i) => i.id !== item.id));
      } else {
        setMySharedItems((prev) => prev.filter((i) => i.id !== item.id));
      }
      setRevokeConfirmId(null);
    } catch (err) {
      console.error('Failed to revoke:', err);
    } finally {
      setProcessingId(null);
    }
  };

  // Current items based on view mode
  const currentItems = viewMode === 'received' ? sharedWithMe : mySharedItems;

  // Loading state
  if (loading) {
    return <PageLoading message="Loading shared items..." />;
  }

  // Error state
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
            leftIcon={<RefreshIcon className="w-4 h-4" />}
          >
            Sync Now
          </Button>
        }
      >
        {/* View Toggle */}
        <div className="mb-6 flex gap-2">
          <Button
            variant={viewMode === 'received' ? 'primary' : 'secondary'}
            onClick={() => setViewMode('received')}
            leftIcon={<InboxIcon className="w-4 h-4" />}
            className={viewMode === 'received' ? '!bg-cyan-600 hover:!bg-cyan-500' : ''}
          >
            Shared with Me
            {sharedWithMe.length > 0 && (
              <span className="ml-2 px-1.5 py-0.5 text-xs rounded bg-white/20">
                {sharedWithMe.length}
              </span>
            )}
          </Button>
          <Button
            variant={viewMode === 'shared' ? 'primary' : 'secondary'}
            onClick={() => setViewMode('shared')}
            leftIcon={<ShareIcon className="w-4 h-4" />}
            className={viewMode === 'shared' ? '!bg-violet-600 hover:!bg-violet-500' : ''}
          >
            My Shared Items
            {mySharedItems.length > 0 && (
              <span className="ml-2 px-1.5 py-0.5 text-xs rounded bg-white/20">
                {mySharedItems.length}
              </span>
            )}
          </Button>
        </div>

        {/* Empty State */}
        {currentItems.length === 0 ? (
          <EmptyState
            icon={
              viewMode === 'received' ? (
                <InboxIcon className="w-12 h-12 text-text-theme-muted mx-auto" />
              ) : (
                <ShareIcon className="w-12 h-12 text-text-theme-muted mx-auto" />
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
            {/* Stats Summary */}
            <div className="mb-6 flex flex-wrap gap-4">
              <div className="flex items-center gap-2 px-4 py-2 bg-surface-base/30 rounded-lg border border-border-theme-subtle">
                <div className="w-2 h-2 rounded-full bg-emerald-500" />
                <span className="text-sm text-text-theme-secondary">
                  <span className="font-medium text-text-theme-primary">
                    {currentItems.filter((i) => i.syncStatus === 'synced').length}
                  </span>{' '}
                  synced
                </span>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 bg-surface-base/30 rounded-lg border border-border-theme-subtle">
                <div className="w-2 h-2 rounded-full bg-amber-500" />
                <span className="text-sm text-text-theme-secondary">
                  <span className="font-medium text-text-theme-primary">
                    {currentItems.filter((i) => i.syncStatus === 'pending').length}
                  </span>{' '}
                  pending
                </span>
              </div>
              {currentItems.filter((i) => i.syncStatus === 'conflict').length > 0 && (
                <div className="flex items-center gap-2 px-4 py-2 bg-surface-base/30 rounded-lg border border-border-theme-subtle">
                  <div className="w-2 h-2 rounded-full bg-red-500" />
                  <span className="text-sm text-text-theme-secondary">
                    <span className="font-medium text-text-theme-primary">
                      {currentItems.filter((i) => i.syncStatus === 'conflict').length}
                    </span>{' '}
                    conflicts
                  </span>
                </div>
              )}
            </div>

            {/* Items Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
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
