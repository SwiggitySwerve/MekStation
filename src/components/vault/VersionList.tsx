import React, { useState, useCallback, useEffect, useRef } from 'react';

import type {
  IVersionSnapshot,
  IVersionHistorySummary,
  ShareableContentType,
} from '@/types/vault';

import { errorMessageFromUnknown } from '@/components/common/runUiOperation';

import type { VersionHistoryPanelProps } from './VersionHistoryTypes';

import { buildResponseError } from './vaultDialogApi';
import {
  VersionErrorCard,
  VersionHistoryContent,
  VersionLoadingCard,
} from './VersionListContent';
import { VersionPreview } from './VersionPreviewModal';
import { VersionRollbackDialog } from './VersionRollbackDialog';

interface VersionHistoryResponse {
  versions: IVersionSnapshot[];
  summary: IVersionHistorySummary;
}

function versionHistoryUrl(
  itemId: string,
  contentType: ShareableContentType,
): string {
  return `/api/vault/versions?itemId=${encodeURIComponent(itemId)}&contentType=${encodeURIComponent(contentType)}`;
}

async function fetchVersionHistory(
  itemId: string,
  contentType: ShareableContentType,
): Promise<VersionHistoryResponse> {
  const response = await fetch(versionHistoryUrl(itemId, contentType));

  if (!response.ok) {
    throw await buildResponseError(
      response,
      'Response not JSON when fetching versions',
      'Failed to fetch versions',
    );
  }

  return (await response.json()) as VersionHistoryResponse;
}

async function rollbackToVersion(
  itemId: string,
  contentType: ShareableContentType,
  targetVersion: number,
): Promise<void> {
  const response = await fetch('/api/vault/versions/rollback', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      itemId,
      contentType,
      targetVersion,
    }),
  });

  if (!response.ok) {
    throw await buildResponseError(
      response,
      'Response not JSON when rolling back version',
      'Failed to rollback',
    );
  }
}

export function VersionHistoryPanel({
  itemId,
  contentType,
  onVersionSelect,
  onRollback,
  className = '',
}: VersionHistoryPanelProps): React.ReactElement {
  const [versions, setVersions] = useState<IVersionSnapshot[]>([]);
  const [summary, setSummary] = useState<IVersionHistorySummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [rollbackError, setRollbackError] = useState<string | null>(null);
  const [refreshError, setRefreshError] = useState<string | null>(null);
  const historyRunId = useRef(0);
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(
    null,
  );
  const [previewVersion, setPreviewVersion] = useState<IVersionSnapshot | null>(
    null,
  );
  const [rollbackVersion, setRollbackVersion] =
    useState<IVersionSnapshot | null>(null);

  // Fetch version history
  useEffect(() => {
    const sequence = historyRunId;
    const runId = ++sequence.current;
    setIsLoading(true);
    setLoadError(null);
    setRollbackError(null);
    setRefreshError(null);
    setRollbackVersion(null);
    setPreviewVersion(null);

    async function fetchVersions(): Promise<void> {
      try {
        const data = await fetchVersionHistory(itemId, contentType);
        if (runId === historyRunId.current) {
          setVersions(data.versions);
          setSummary(data.summary);
        }
      } catch (error) {
        if (runId === historyRunId.current) {
          setLoadError(
            errorMessageFromUnknown(error, 'Failed to load version history'),
          );
        }
      } finally {
        if (runId === historyRunId.current) {
          setIsLoading(false);
        }
      }
    }

    void fetchVersions();
    return () => {
      sequence.current++;
    };
  }, [itemId, contentType]);

  const handleVersionClick = useCallback(
    (version: IVersionSnapshot) => {
      setSelectedVersionId(version.id);
      onVersionSelect?.(version);
    },
    [onVersionSelect],
  );

  const handlePreview = useCallback((version: IVersionSnapshot) => {
    setPreviewVersion(version);
  }, []);

  const handleRollbackRequest = useCallback((version: IVersionSnapshot) => {
    setRollbackError(null);
    setRollbackVersion(version);
  }, []);

  const handleRollbackConfirm = useCallback(
    async (version: IVersionSnapshot) => {
      const runId = ++historyRunId.current;
      setRollbackError(null);

      try {
        await rollbackToVersion(itemId, contentType, version.version);
      } catch (error) {
        if (runId === historyRunId.current) {
          setRollbackError(
            errorMessageFromUnknown(error, 'Failed to rollback'),
          );
        }
        return;
      }

      if (runId !== historyRunId.current) return;
      setRollbackVersion(null);
      setRefreshError(null);
      onRollback?.(version);

      // A committed rollback remains successful even if the subsequent read fails.
      try {
        const data = await fetchVersionHistory(itemId, contentType);
        if (runId === historyRunId.current) {
          setVersions(data.versions);
          setSummary(data.summary);
        }
      } catch (error) {
        if (runId === historyRunId.current) {
          setRefreshError(
            errorMessageFromUnknown(error, 'Failed to load version history'),
          );
        }
      }
    },
    [itemId, contentType, onRollback],
  );

  if (isLoading) {
    return <VersionLoadingCard className={className} />;
  }

  if (loadError) {
    return <VersionErrorCard className={className} error={loadError} />;
  }

  return (
    <>
      <VersionHistoryContent
        className={className}
        contentType={contentType}
        versions={versions}
        summary={summary}
        selectedVersionId={selectedVersionId}
        onVersionClick={handleVersionClick}
        onPreview={handlePreview}
        onRollbackRequest={handleRollbackRequest}
      />

      {refreshError && (
        <p
          role="alert"
          className="mt-3 rounded-xl border border-red-500/30 bg-red-900/30 p-4 text-sm text-red-300"
        >
          Rollback succeeded, but history could not be refreshed. {refreshError}
        </p>
      )}

      {/* Preview Modal */}
      <VersionPreview
        isOpen={previewVersion !== null}
        onClose={() => setPreviewVersion(null)}
        version={previewVersion}
        onRollback={(v) => {
          setPreviewVersion(null);
          handleRollbackRequest(v);
        }}
      />

      {/* Rollback Dialog */}
      <VersionRollbackDialog
        isOpen={rollbackVersion !== null}
        onClose={() => setRollbackVersion(null)}
        version={rollbackVersion}
        currentVersion={summary?.currentVersion ?? 0}
        onConfirm={handleRollbackConfirm}
        error={rollbackError}
      />
    </>
  );
}
