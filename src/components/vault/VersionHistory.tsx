/**
 * Version History Components
 *
 * Components for viewing and managing version history of shared vault items.
 * Re-exports sub-components: VersionList, VersionDiffView, VersionPreviewModal,
 * and VersionRollbackDialog.
 *
 * @spec openspec/changes/add-vault-sharing/specs/vault-sharing/spec.md
 */

import type { IVersionSnapshot, ShareableContentType } from '@/types/vault';

// =============================================================================
// Types
// =============================================================================

export interface VersionHistoryPanelProps {
  itemId: string;
  contentType: ShareableContentType;
  onVersionSelect?: (version: IVersionSnapshot) => void;
  onRollback?: (version: IVersionSnapshot) => void;
  className?: string;
}

export interface VersionDiffViewProps {
  itemId: string;
  contentType: ShareableContentType;
  versions: IVersionSnapshot[];
  initialFromVersion?: number;
  initialToVersion?: number;
  className?: string;
}

export interface VersionPreviewProps {
  isOpen: boolean;
  onClose: () => void;
  version: IVersionSnapshot | null;
  onRollback?: (version: IVersionSnapshot) => void;
}

export interface VersionRollbackDialogProps {
  isOpen: boolean;
  onClose: () => void;
  version: IVersionSnapshot | null;
  currentVersion: number;
  onConfirm?: (version: IVersionSnapshot) => void;
}

// =============================================================================
// Re-exports
// =============================================================================

export { VersionHistoryPanel } from './VersionList';
export { VersionDiffView } from './VersionDiffView';
export { VersionPreview } from './VersionPreviewModal';
export { VersionRollbackDialog } from './VersionRollbackDialog';

// =============================================================================
// Namespace export
// =============================================================================

import { VersionDiffView as _VersionDiffView } from './VersionDiffView';
import { VersionHistoryPanel as _VersionHistoryPanel } from './VersionList';
import { VersionPreview as _VersionPreview } from './VersionPreviewModal';
import { VersionRollbackDialog as _VersionRollbackDialog } from './VersionRollbackDialog';

export const VersionHistory = {
  VersionHistoryPanel: _VersionHistoryPanel,
  VersionDiffView: _VersionDiffView,
  VersionPreview: _VersionPreview,
  VersionRollbackDialog: _VersionRollbackDialog,
};

export default VersionHistory;
