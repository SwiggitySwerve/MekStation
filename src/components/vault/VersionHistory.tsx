/**
 * Version History Components
 *
 * Components for viewing and managing version history of shared vault items.
 * Re-exports sub-components: VersionList, VersionDiffView, VersionPreviewModal,
 * and VersionRollbackDialog.
 *
 * @spec openspec/changes/add-vault-sharing/specs/vault-sharing/spec.md
 */

export type {
  VersionDiffViewProps,
  VersionHistoryPanelProps,
  VersionPreviewProps,
  VersionRollbackDialogProps,
} from './VersionHistoryTypes';

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
