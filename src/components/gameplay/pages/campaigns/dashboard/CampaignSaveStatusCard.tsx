/**
 * Campaign save-status card
 *
 * Surfaces campaign persistence metadata on the dashboard — the
 * last-saved timestamp, the save-state, and a manual "Save now" action
 * that issues an immediate `PUT` bypassing the auto-save debounce
 * (tasks 5.2). When the save-state is `conflict` it offers keep-local /
 * take-server resolution.
 *
 * @spec openspec/changes/add-campaign-persistence/specs/campaign-persistence/spec.md
 * @spec openspec/changes/add-campaign-persistence/design.md (D5, D6)
 */

import React, { useCallback } from 'react';

import { Badge, Button, Card } from '@/components/ui';
import { useCampaignPersistenceStore } from '@/stores/campaign/useCampaignPersistenceStore';

/** Human-readable label + badge variant per save-state. */
function describeSaveState(
  state: ReturnType<typeof useCampaignPersistenceStore.getState>['saveState'],
): {
  label: string;
  variant: 'success' | 'info' | 'warning' | 'red' | 'muted';
} {
  switch (state) {
    case 'saving':
      return { label: 'Saving…', variant: 'info' };
    case 'saved':
      return { label: 'Saved', variant: 'success' };
    case 'error':
      return { label: 'Save failed', variant: 'warning' };
    case 'conflict':
      return { label: 'Conflict', variant: 'red' };
    case 'idle':
    default:
      return { label: 'Idle', variant: 'muted' };
  }
}

/** Format an ISO timestamp for display, or a fallback when never saved. */
function formatLastSaved(lastSavedAt: string | null): string {
  if (!lastSavedAt) {
    return 'Never saved';
  }
  const date = new Date(lastSavedAt);
  if (Number.isNaN(date.getTime())) {
    return 'Never saved';
  }
  return date.toLocaleString();
}

export function CampaignSaveStatusCard(): React.ReactElement {
  const saveState = useCampaignPersistenceStore((s) => s.saveState);
  const dirty = useCampaignPersistenceStore((s) => s.dirty);
  const metadata = useCampaignPersistenceStore((s) => s.metadata);
  const errorMessage = useCampaignPersistenceStore((s) => s.errorMessage);
  const saveCampaign = useCampaignPersistenceStore((s) => s.saveCampaign);
  const resolveConflictKeepLocal = useCampaignPersistenceStore(
    (s) => s.resolveConflictKeepLocal,
  );
  const resolveConflictTakeServer = useCampaignPersistenceStore(
    (s) => s.resolveConflictTakeServer,
  );

  const handleSaveNow = useCallback(() => {
    void saveCampaign();
  }, [saveCampaign]);

  const handleKeepLocal = useCallback(() => {
    void resolveConflictKeepLocal();
  }, [resolveConflictKeepLocal]);

  const handleTakeServer = useCallback(() => {
    void resolveConflictTakeServer();
  }, [resolveConflictTakeServer]);

  const status = describeSaveState(saveState);

  return (
    <Card className="mb-6" data-testid="campaign-save-status-card">
      <div className="flex items-center justify-between">
        <div>
          <div className="mb-1 flex items-center gap-2">
            <h2 className="text-text-theme-primary text-lg font-semibold">
              Campaign Save
            </h2>
            <Badge variant={status.variant} size="sm">
              {status.label}
            </Badge>
            {dirty && saveState !== 'saving' && (
              <Badge variant="warning" size="sm">
                Unsaved changes
              </Badge>
            )}
          </div>
          <p
            className="text-text-theme-secondary text-sm"
            data-testid="campaign-last-saved"
          >
            Last saved: {formatLastSaved(metadata.lastSavedAt)}
          </p>
          {saveState === 'error' && errorMessage && (
            <p className="mt-1 text-sm text-yellow-400">
              {errorMessage} — playing offline; changes are kept locally.
            </p>
          )}
          {saveState === 'conflict' && (
            <p className="mt-1 text-sm text-red-400">
              This campaign was changed on another device. Choose which version
              to keep.
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {saveState === 'conflict' ? (
            <>
              <Button
                variant="secondary"
                onClick={handleTakeServer}
                data-testid="campaign-conflict-take-server-btn"
              >
                Use Server Version
              </Button>
              <Button
                variant="primary"
                onClick={handleKeepLocal}
                data-testid="campaign-conflict-keep-local-btn"
              >
                Keep My Version
              </Button>
            </>
          ) : (
            <Button
              variant="primary"
              onClick={handleSaveNow}
              disabled={saveState === 'saving'}
              data-testid="campaign-save-now-btn"
            >
              {saveState === 'saving' ? 'Saving…' : 'Save now'}
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}
