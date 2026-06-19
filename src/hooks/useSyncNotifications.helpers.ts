import type { ToastConfig, ToastVariant } from '@/components/shared/Toast';
import type { ISyncConflict, ShareableContentType } from '@/types/vault';

import type {
  ConnectionChangedData,
  ShareReceivedData,
  SyncCompleteData,
} from './useSyncNotifications';

type ToastInput = Omit<ToastConfig, 'id'>;

export function getContentTypeLabel(
  type: ShareableContentType | 'folder',
): string {
  switch (type) {
    case 'unit':
      return 'unit';
    case 'pilot':
      return 'pilot';
    case 'force':
      return 'force';
    case 'encounter':
      return 'encounter';
    case 'folder':
      return 'folder';
    default:
      return 'item';
  }
}

export function getNotificationKey(type: string, ...args: string[]): string {
  return `${type}:${args.join(':')}`;
}

export function wasRecentlyShown(
  recentNotifications: Set<string>,
  key: string,
): boolean {
  if (recentNotifications.has(key)) {
    return true;
  }
  recentNotifications.add(key);
  return false;
}

export function buildShareReceivedToast(
  data: ShareReceivedData,
  onViewShare?: (
    itemId: string,
    itemType: ShareableContentType | 'folder',
  ) => void,
): ToastInput {
  const typeLabel = getContentTypeLabel(data.itemType);
  const message =
    data.itemCount && data.itemCount > 1
      ? `${data.fromContactName} shared ${data.itemCount} ${pluralize(data.itemCount, typeLabel)} with you`
      : `${data.fromContactName} shared "${data.itemName}" with you`;

  return {
    message,
    variant: 'info',
    duration: 5000,
    action: onViewShare
      ? {
          label: 'View',
          onClick: () => onViewShare('', data.itemType),
        }
      : undefined,
  };
}

export function buildConflictToast(
  conflict: ISyncConflict,
  onResolveConflict?: (conflict: ISyncConflict) => void,
): ToastInput {
  const typeLabel = getContentTypeLabel(conflict.contentType);

  return {
    message: `Sync conflict detected for ${typeLabel} "${conflict.itemName}"`,
    variant: 'warning',
    duration: 8000,
    action: onResolveConflict
      ? {
          label: 'Resolve',
          onClick: () => onResolveConflict(conflict),
        }
      : undefined,
  };
}

export function buildSyncCompleteToast(
  data: SyncCompleteData,
  onViewSyncDetails?: () => void,
): ToastInput | null {
  const totalChanges = data.changesReceived + data.changesSent;
  if (totalChanges === 0) return null;

  const parts: string[] = [];
  if (data.changesReceived > 0) {
    parts.push(`received ${data.changesReceived}`);
  }
  if (data.changesSent > 0) {
    parts.push(`sent ${data.changesSent}`);
  }

  return {
    message: `Synced with ${data.peerName}: ${parts.join(', ')} ${pluralize(totalChanges, 'change')}`,
    variant: 'success',
    duration: 4000,
    action: onViewSyncDetails
      ? {
          label: 'Details',
          onClick: onViewSyncDetails,
        }
      : undefined,
  };
}

export function buildConnectionChangedToast(
  data: ConnectionChangedData,
): ToastInput | null {
  if (data.state === 'connecting') return null;

  const config = getConnectionToastConfig(data);
  if (!config) return null;

  return {
    message: `${config.message} ${data.peerName}`,
    variant: config.variant,
    duration: 3000,
  };
}

function getConnectionToastConfig(
  data: ConnectionChangedData,
): { message: string; variant: ToastVariant } | null {
  switch (data.state) {
    case 'connected':
      return { message: 'Connected to', variant: 'success' };
    case 'disconnected':
      return { message: 'Disconnected from', variant: 'info' };
    case 'failed':
      return { message: 'Failed to connect to', variant: 'warning' };
    default:
      return null;
  }
}

function pluralize(count: number, singular: string, plural?: string): string {
  return count === 1 ? singular : plural || `${singular}s`;
}
