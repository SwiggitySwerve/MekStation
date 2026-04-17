/**
 * Unit Card Actions Hook
 *
 * Provides action handlers for unit cards (export, share, edit, duplicate, delete).
 * Integrates with unit services for persistence.
 */

import { useRouter } from 'next/router';
import { useCallback, useRef, useState } from 'react';

import {
  getCanonicalUnitService,
  getCustomUnitService,
  type IFullUnit,
} from '@/services/units';

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
  /** Callback when duplication fails */
  onDuplicateError?: (error: Error) => void;
  /** Callback after successful deletion */
  onDeleteSuccess?: () => void;
  /** Callback when deletion fails */
  onDeleteError?: (error: Error) => void;
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
  /** Whether a duplicate operation is in-flight */
  isDuplicating: boolean;
  /** Whether a delete operation is in-flight */
  isDeleting: boolean;
  /** Close export dialog */
  closeExportDialog: () => void;
  /** Close share dialog */
  closeShareDialog: () => void;
  /** Confirm deletion */
  confirmDelete: () => void;
  /** Cancel deletion */
  cancelDelete: () => void;
}

function stripIdentity(unit: IFullUnit): Omit<IFullUnit, 'id'> {
  const { id: _id, ...rest } = unit;
  return rest;
}

async function loadFullUnit(unitId: string): Promise<IFullUnit | null> {
  const custom = await getCustomUnitService().getById(unitId);
  if (custom) return custom;
  return getCanonicalUnitService().getById(unitId);
}

/**
 * Hook for unit card action handlers
 */
export function useUnitCardActions({
  unitId,
  unitType = 'mech',
  onDuplicateSuccess,
  onDuplicateError,
  onDeleteSuccess,
  onDeleteError,
}: UseUnitCardActionsOptions): UnitCardActions {
  const router = useRouter();

  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);
  const [isDeletePending, setIsDeletePending] = useState(false);
  const [isDuplicating, setIsDuplicating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  // Synchronous guards against rapid double-invocations — state won't update
  // fast enough when two clicks fire in the same tick.
  const duplicatingRef = useRef(false);
  const deletingRef = useRef(false);

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

  // Duplicate unit: load full data (custom first, canonical fallback), save as new custom unit
  const handleDuplicate = useCallback(() => {
    if (duplicatingRef.current) return;
    duplicatingRef.current = true;
    setIsDuplicating(true);

    (async () => {
      try {
        const source = await loadFullUnit(unitId);
        if (!source) {
          throw new Error(`Unit not found: ${unitId}`);
        }
        // New custom unit: strip id so CustomUnitService.create assigns a fresh one.
        // Mark variant as a copy so the user sees it's a duplicate.
        const suffix = source.variant ? `${source.variant} (Copy)` : '(Copy)';
        const clone: IFullUnit = {
          ...stripIdentity(source),
          id: '',
          variant: suffix,
        } as IFullUnit;
        const newId = await getCustomUnitService().create(clone);
        onDuplicateSuccess?.(newId);
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        onDuplicateError?.(error);
      } finally {
        duplicatingRef.current = false;
        setIsDuplicating(false);
      }
    })();
  }, [unitId, onDuplicateSuccess, onDuplicateError]);

  // Request delete confirmation
  const handleDelete = useCallback(() => {
    setIsDeletePending(true);
  }, []);

  // Confirm deletion: delete the custom unit via CustomUnitService.
  // Canonical units cannot be deleted — surface an error in that case.
  const confirmDelete = useCallback(() => {
    if (deletingRef.current) return;
    deletingRef.current = true;
    setIsDeleting(true);

    (async () => {
      try {
        const service = getCustomUnitService();
        const existsAsCustom = await service.exists(unitId);
        if (!existsAsCustom) {
          throw new Error(
            'Cannot delete a canonical unit — only custom units can be removed.',
          );
        }
        await service.delete(unitId);
        onDeleteSuccess?.();
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        onDeleteError?.(error);
      } finally {
        deletingRef.current = false;
        setIsDeleting(false);
        setIsDeletePending(false);
      }
    })();
  }, [unitId, onDeleteSuccess, onDeleteError]);

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
    isDuplicating,
    isDeleting,
    closeExportDialog,
    closeShareDialog,
    confirmDelete,
    cancelDelete,
  };
}
