/**
 * Vault Components Index
 *
 * @spec openspec/changes/add-vault-sharing/specs/vault-sharing/spec.md
 */

export { ExportDialog } from './ExportDialog';
export type { ExportDialogProps, ExportContentType } from './ExportDialog';

export { ImportDialog } from './ImportDialog';
export type { ImportDialogProps } from './ImportDialog';

export { ShareDialog } from './ShareDialog';
export type { ShareDialogProps } from './ShareDialog';

export { ConflictResolutionDialog } from './ConflictResolutionDialog';
export type { ConflictResolutionDialogProps } from './ConflictResolutionDialog';

export {
  FolderList,
  FolderCreateDialog,
  FolderEditDialog,
  FolderSharePanel,
  FolderItemsPanel,
  FolderManager,
} from './FolderManager';
export type {
  FolderListProps,
  FolderCreateDialogProps,
  FolderEditDialogProps,
  FolderSharePanelProps,
  FolderItemsPanelProps,
} from './FolderManager';

export {
  VersionHistoryPanel,
  VersionDiffView,
  VersionPreview,
  VersionRollbackDialog,
} from './VersionHistory';
export type {
  VersionHistoryPanelProps,
  VersionDiffViewProps,
  VersionPreviewProps,
  VersionRollbackDialogProps,
} from './VersionHistory';

export {
  SyncStatusIndicator,
  SyncStatusPanel,
  PeerSyncRow,
} from './SyncStatus';
export type {
  SyncConnectionState,
  SyncStatusIndicatorProps,
  SyncStatusPanelProps,
  PeerSyncRowProps,
} from './SyncStatus';
