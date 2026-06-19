import React, { useState, useCallback, useEffect } from 'react';

import type {
  IVersionSnapshot,
  IVersionHistorySummary,
  ShareableContentType,
} from '@/types/vault';

import {
  runBusyErrorOperation,
  runErrorOperation,
} from '@/components/common/runUiOperation';

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

async function refreshVersionHistory(
  itemId: string,
  contentType: ShareableContentType,
): Promise<VersionHistoryResponse | null> {
  const response = await fetch(versionHistoryUrl(itemId, contentType));
  return response.ok
    ? ((await response.json()) as VersionHistoryResponse)
    : null;
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
  const [error, setError] = useState<string | null>(null);
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
    async function fetchVersions(): Promise<void> {
      await runBusyErrorOperation(
        setIsLoading,
        setError,
        'Failed to load version history',
        async () => {
          const data = await fetchVersionHistory(itemId, contentType);
          setVersions(data.versions);
          setSummary(data.summary);
        },
      );
    }

    fetchVersions();
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
    setRollbackVersion(version);
  }, []);

  const handleRollbackConfirm = useCallback(
    async (version: IVersionSnapshot) => {
      await runErrorOperation(setError, 'Failed to rollback', async () => {
        await rollbackToVersion(itemId, contentType, version.version);

        // Refresh the version list
        const data = await refreshVersionHistory(itemId, contentType);
        if (data) {
          setVersions(data.versions);
          setSummary(data.summary);
        }

        onRollback?.(version);
        setRollbackVersion(null);
      });
    },
    [itemId, contentType, onRollback],
  );

  if (isLoading) {
    return <VersionLoadingCard className={className} />;
  }

  if (error) {
    return <VersionErrorCard className={className} error={error} />;
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
      />
    </>
  );
}
