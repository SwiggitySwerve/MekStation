import { useCallback, useEffect, useRef, useState } from 'react';

import {
  customUnitApiService,
  IVersionWithData,
} from '@/services/units/CustomUnitApiService';
import { IVersionMetadata } from '@/types/persistence/UnitPersistence';
import { logger } from '@/utils/logger';

export interface UseVersionHistoryDialogArgs {
  isOpen: boolean;
  unitId: string;
  currentVersion: number;
  onRevert: (version: number) => void;
  onClose: () => void;
  onRestoreDraft?: (version: number) => Promise<void>;
}

export function useVersionHistoryDialog({
  isOpen,
  unitId,
  currentVersion,
  onRevert,
  onClose,
  onRestoreDraft,
}: UseVersionHistoryDialogArgs): {
  versions: readonly IVersionMetadata[];
  selectedVersion: number | null;
  setSelectedVersion: (version: number) => void;
  previewData: IVersionWithData | null;
  previewError: string | null;
  isLoading: boolean;
  isLoadingPreview: boolean;
  isReverting: boolean;
  error: string | null;
  confirmError: string | null;
  handleConfirm: () => Promise<void>;
} {
  const [versions, setVersions] = useState<readonly IVersionMetadata[]>([]);
  const [selectedVersion, setSelectedVersion] = useState<number | null>(null);
  const [previewData, setPreviewData] = useState<IVersionWithData | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [isReverting, setIsReverting] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const revertingRef = useRef(false);
  const sessionRef = useRef(0);
  useEffect(() => {
    const session = sessionRef;
    session.current++;
    revertingRef.current = false;
    setIsReverting(false);
    return () => {
      session.current++;
    };
  }, [isOpen, unitId]);

  useEffect(() => {
    if (!isOpen || !unitId) return;

    let cancelled = false;
    setIsLoading(true);
    setHistoryError(null);
    setConfirmError(null);
    setSelectedVersion(null);
    setPreviewData(null);
    setPreviewError(null);

    customUnitApiService
      .getVersionHistory(unitId)
      .then((next) => {
        if (!cancelled) setVersions(next);
      })
      .catch((err) => {
        logger.error('Failed to load version history:', err);
        if (!cancelled) setHistoryError('Failed to load version history');
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isOpen, unitId]);

  useEffect(() => {
    if (!isOpen || !selectedVersion || !unitId) {
      setPreviewData(null);
      setPreviewError(null);
      setIsLoadingPreview(false);
      return;
    }

    let cancelled = false;
    const requestedVersion = selectedVersion;
    setIsLoadingPreview(true);
    setPreviewData(null);
    setPreviewError(null);

    customUnitApiService
      .getVersion(unitId, selectedVersion)
      .then((data) => {
        if (cancelled || requestedVersion !== selectedVersion) return;
        setPreviewData(data?.version === requestedVersion ? data : null);
        if (!data || data.version !== requestedVersion)
          setPreviewError('Failed to load preview');
      })
      .catch((err) => {
        logger.error('Failed to load version preview:', err);
        if (cancelled || requestedVersion !== selectedVersion) return;
        setPreviewData(null);
        setPreviewError('Failed to load preview');
      })
      .finally(() => {
        if (!cancelled && requestedVersion === selectedVersion) {
          setIsLoadingPreview(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [isOpen, unitId, selectedVersion]);

  const handleConfirm = useCallback(async () => {
    if (!selectedVersion || revertingRef.current) return;
    if (!onRestoreDraft && selectedVersion === currentVersion) return;

    const session = sessionRef.current;
    revertingRef.current = true;
    setIsReverting(true);
    setConfirmError(null);
    try {
      if (onRestoreDraft) {
        await onRestoreDraft(selectedVersion);
        if (session === sessionRef.current) onClose();
        return;
      }

      const result = await customUnitApiService.revert(unitId, selectedVersion);
      if (session !== sessionRef.current) return;
      if (result.success) {
        onRevert(selectedVersion);
        onClose();
      } else {
        setConfirmError(result.error.message || 'Failed to revert');
      }
    } catch (err) {
      if (session !== sessionRef.current) return;
      logger.error('Version history confirm error:', err);
      setConfirmError(
        err instanceof Error
          ? err.message
          : onRestoreDraft
            ? 'Failed to restore the selected version into this draft'
            : 'Failed to revert to selected version',
      );
    } finally {
      if (session === sessionRef.current) {
        revertingRef.current = false;
        setIsReverting(false);
      }
    }
  }, [
    unitId,
    selectedVersion,
    currentVersion,
    onRestoreDraft,
    onRevert,
    onClose,
  ]);

  return {
    versions,
    selectedVersion,
    setSelectedVersion: (version) => {
      if (version === selectedVersion) return;
      setSelectedVersion(version);
      setPreviewData(null);
      setIsLoadingPreview(true);
    },
    previewData,
    previewError,
    isLoading,
    isLoadingPreview,
    isReverting,
    error: historyError,
    confirmError,
    handleConfirm,
  };
}
