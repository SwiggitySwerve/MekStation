/**
 * Unit Card Actions Hook
 *
 * Provides action handlers for unit cards (export, share, edit, duplicate, delete).
 * Integrates with existing vault services and navigation.
 */

import { useRouter } from 'next/router';
import { useCallback, useState } from 'react';

export interface UseUnitCardActionsOptions {
  /** Unit ID */
  unitId: string;
  /** Unit type for routing (default: 'mech') */
  unitType?:
    | 'mech'
    | 'vehicle'
    | 'aerospace'
    | 'battle-armor'
    | 'infantry'
    | 'protomech';
  /** Callback after successful duplication */
  onDuplicateSuccess?: (newUnitId: string) => void;
  /** Callback after successful deletion */
  onDeleteSuccess?: () => void;
}

export interface UnitCardActions {
  /** Navigate to unit editor */
  handleEdit: () => void;
  /** Open export dialog */
  handleExport: () => void;
  /** Open share dialog */
  handleShare: () => void;
  /** Duplicate the unit */
  handleDuplicate: () => void;
  /** Delete the unit with confirmation */
  handleDelete: () => void;
  /** Whether export dialog is open */
  isExportDialogOpen: boolean;
  /** Whether share dialog is open */
  isShareDialogOpen: boolean;
  /** Whether delete confirmation is pending */
  isDeletePending: boolean;
  /** Close export dialog */
  closeExportDialog: () => void;
  /** Close share dialog */
  closeShareDialog: () => void;
  /** Confirm deletion */
  confirmDelete: () => void;
  /** Cancel deletion */
  cancelDelete: () => void;
}

/**
 * Hook for unit card action handlers
 */
export function useUnitCardActions({
  unitId,
  unitType = 'mech',
  onDuplicateSuccess,
  onDeleteSuccess,
}: UseUnitCardActionsOptions): UnitCardActions {
  const router = useRouter();

  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);
  const [isDeletePending, setIsDeletePending] = useState(false);

  // Navigate to unit editor
  const handleEdit = useCallback(() => {
    const path =
      unitType === 'mech'
        ? `/customizer/${unitId}`
        : `/${unitType}/customizer/${unitId}`;
    router.push(path);
  }, [unitId, unitType, router]);

  // Open export dialog
  const handleExport = useCallback(() => {
    setIsExportDialogOpen(true);
  }, []);

  // Close export dialog
  const closeExportDialog = useCallback(() => {
    setIsExportDialogOpen(false);
  }, []);

  // Open share dialog
  const handleShare = useCallback(() => {
    setIsShareDialogOpen(true);
  }, []);

  // Close share dialog
  const closeShareDialog = useCallback(() => {
    setIsShareDialogOpen(false);
  }, []);

  // Duplicate unit
  const handleDuplicate = useCallback(() => {
    // For now, just navigate to a new unit with cloned data
    // This would need integration with the unit store to actually clone
    // TODO: Implement actual duplication via unit store
    const newId = `${unitId}-copy-${Date.now()}`;
    onDuplicateSuccess?.(newId);
  }, [unitId, onDuplicateSuccess]);

  // Request delete confirmation
  const handleDelete = useCallback(() => {
    setIsDeletePending(true);
  }, []);

  // Confirm deletion
  const confirmDelete = useCallback(() => {
    // TODO: Implement actual deletion via unit store
    setIsDeletePending(false);
    onDeleteSuccess?.();
  }, [onDeleteSuccess]);

  // Cancel deletion
  const cancelDelete = useCallback(() => {
    setIsDeletePending(false);
  }, []);

  return {
    handleEdit,
    handleExport,
    handleShare,
    handleDuplicate,
    handleDelete,
    isExportDialogOpen,
    isShareDialogOpen,
    isDeletePending,
    closeExportDialog,
    closeShareDialog,
    confirmDelete,
    cancelDelete,
  };
}
