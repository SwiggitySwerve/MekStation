import type { ISharedItem, ViewMode } from '@/pages-modules/shared/types';

import { Badge, Button, Card } from '@/components/ui';
import {
  getLevelVariant,
  getSyncStatusDisplay,
  getTypeDisplay,
} from '@/pages-modules/shared/helpers';
import { CheckIcon, EyeIcon, TrashIcon } from '@/pages-modules/shared/icons';
import { formatDate, formatRelativeTime } from '@/utils/formatting';

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

export function SharedItemCard({
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
    <Card
      variant="dark"
      className="group hover:border-border-theme relative overflow-hidden transition-all duration-200"
    >
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-cyan-500/0 to-violet-500/0 transition-all duration-300 group-hover:from-cyan-500/5 group-hover:to-violet-500/5" />

      <div className="relative">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <div
              className={`bg-surface-raised/50 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg ${typeDisplay.color}`}
            >
              {typeDisplay.icon}
            </div>

            <div className="min-w-0">
              <h3 className="text-text-theme-primary truncate font-semibold">
                {item.name}
              </h3>
              <p className="text-text-theme-muted text-xs">
                {typeDisplay.label}
              </p>
            </div>
          </div>

          <Badge variant={syncStatus.variant} size="sm">
            {syncStatus.label}
          </Badge>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
          <div>
            <span className="text-text-theme-muted mb-1 block text-xs">
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

          <div>
            <span className="text-text-theme-muted mb-1 block text-xs">
              Permission
            </span>
            <Badge variant={getLevelVariant(item.level)} size="sm">
              {item.level.charAt(0).toUpperCase() + item.level.slice(1)}
            </Badge>
          </div>

          <div>
            <span className="text-text-theme-muted mb-1 block text-xs">
              Shared
            </span>
            <span className="text-text-theme-secondary">
              {formatDate(item.sharedAt)}
            </span>
          </div>

          <div>
            <span className="text-text-theme-muted mb-1 block text-xs">
              Last sync
            </span>
            <span className="text-text-theme-secondary">
              {formatRelativeTime(item.lastSyncAt)}
            </span>
          </div>
        </div>

        {viewMode === 'shared' &&
          item.sharedWith &&
          item.sharedWith.length > 0 && (
            <div className="border-border-theme-subtle/50 mt-3 border-t pt-3">
              <span className="text-text-theme-muted mb-2 block text-xs">
                Recipients
              </span>
              <div className="flex flex-wrap gap-1.5">
                {item.sharedWith.slice(0, 3).map((recipient) => (
                  <span
                    key={recipient.friendCode}
                    className="bg-surface-raised/50 text-text-theme-secondary rounded px-2 py-0.5 text-xs"
                  >
                    {recipient.name}
                  </span>
                ))}
                {item.sharedWith.length > 3 && (
                  <span className="bg-surface-raised/50 text-text-theme-muted rounded px-2 py-0.5 text-xs">
                    +{item.sharedWith.length - 3} more
                  </span>
                )}
              </div>
            </div>
          )}

        <div className="border-border-theme-subtle/50 mt-4 flex items-center justify-end gap-2 border-t pt-4">
          {showRevokeConfirm ? (
            <>
              <span className="text-text-theme-muted mr-2 text-sm">
                {viewMode === 'received'
                  ? 'Remove from library?'
                  : 'Revoke sharing?'}
              </span>
              <Button
                variant="danger"
                size="sm"
                onClick={onConfirmRevoke}
                disabled={isProcessing}
                isLoading={isProcessing}
              >
                <CheckIcon className="h-4 w-4" />
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
              <Button
                variant="ghost"
                size="sm"
                onClick={onView}
                disabled={isProcessing}
                title="View item"
              >
                <EyeIcon className="h-4 w-4" />
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={onRevoke}
                disabled={isProcessing}
                title={
                  viewMode === 'received'
                    ? 'Remove from library'
                    : 'Revoke sharing'
                }
                className="text-red-400/70 hover:text-red-400"
              >
                <TrashIcon className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>
      </div>
    </Card>
  );
}
