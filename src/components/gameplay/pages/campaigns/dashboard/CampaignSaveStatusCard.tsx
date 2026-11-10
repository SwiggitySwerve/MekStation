/**
 * Campaign save-status card
 *
 * Surfaces campaign persistence metadata on the dashboard — the
 * last-saved timestamp, the save-state, and a manual "Save now" action
 * that issues an immediate `PUT` bypassing the auto-save debounce
 * (tasks 5.2). When the save-state is `conflict` it reports the server's
 * typed refusal and offers the one safe recovery: take the server's
 * version. Keep-local was removed with umbrella 8.3 - it re-sent the
 * same stale envelope at the server's version, which is an overwrite of
 * whoever committed in between, not a resolution.
 *
 * A write the server REFUSES for want of the host's co-op sign-in (a window
 * without the session token, or an expired one) is not a conflict and not
 * an offline failure: the server's reason is shown and the unsaved changes
 * are kept, so it never reads "playing offline; changes are kept locally".
 *
 * The badge is ONE derived state (`describeSaveState`): unsaved edits outrank
 * `saved`, a failed or refused save reads "Save failed", and a copy recovered
 * from an earlier document reads "Recovered unsaved changes".
 *
 * A reload that finds unsaved edits the server has moved past
 * (`local-edits-predate-server`) shows what each side holds - the browser's
 * campaign date and base version, the server's date and version - and offers
 * only "Use Server Version". Nothing is pushed and nothing is replaced until
 * the player chooses, so the local state is kept as long as they take.
 * DESIGN NOTE / OPEN: there is no way today to keep a copy of the local state
 * before choosing (no campaign export or download exists), so the choice is
 * one-way and the card says so rather than promising otherwise.
 *
 * It also surfaces a LAUNCH conflict (umbrella 10.3): a launch the
 * authority refused because the campaign moved under this client. It
 * shares this card because it is the same question - "your view is
 * stale" - but it is deliberately a separate block with a separate
 * action. A save conflict has two versions and the user must choose;
 * a stale head has exactly one honest move, which is to resync to the
 * head the authority holds. Offering "Keep My Version" for a branch
 * head would invite insisting on a world that no longer exists.
 *
 * @spec openspec/changes/add-campaign-persistence/specs/campaign-persistence/spec.md
 * @spec openspec/changes/add-campaign-persistence/design.md (D5, D6)
 */

import React, { useCallback } from 'react';
import { useStore } from 'zustand';

import { Badge, Button, Card } from '@/components/ui';
import { PENDING_WRITE_CONFLICT_REASON } from '@/lib/campaign/persistence/campaignPendingWrite';
import { useCampaignPersistenceStore } from '@/stores/campaign/useCampaignPersistenceStore';
import { useCampaignStore } from '@/stores/campaign/useCampaignStore';

type PersistenceState = ReturnType<typeof useCampaignPersistenceStore.getState>;

/**
 * The ONE badge for the copy's state. Unsaved edits outrank `saved`, so a copy
 * that still owes the server work can never read Saved (the reducer holds the
 * same line: `saved` implies `!dirty`). A failed or refused save is shown as
 * failed even while edits are pending, so it is visibly not saved.
 */
function describeSaveState(
  state: Pick<
    PersistenceState,
    'saveState' | 'dirty' | 'recoveredPendingWrite'
  >,
): {
  label: string;
  variant: 'success' | 'info' | 'warning' | 'red' | 'muted';
} {
  if (state.saveState === 'conflict')
    return { label: 'Conflict', variant: 'red' };
  if (state.saveState === 'saving')
    return { label: 'Saving…', variant: 'info' };
  if (state.saveState === 'error') {
    return { label: 'Save failed', variant: 'warning' };
  }
  if (state.dirty) {
    return {
      label: state.recoveredPendingWrite
        ? 'Recovered unsaved changes'
        : 'Unsaved changes',
      variant: 'warning',
    };
  }
  if (state.saveState === 'saved')
    return { label: 'Saved', variant: 'success' };
  return { label: 'Idle', variant: 'muted' };
}

/** The date the dashboard header shows, for the same instant. */
function formatCampaignDate(value: Date | string | null | undefined): string {
  if (!value) return 'unknown';
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? 'unknown' : date.toLocaleDateString();
}

/**
 * What the browser holds against what the server holds, for a reload that
 * found unsaved edits it must not push and must not throw away. The local date
 * is read live, so it stays true if the player keeps playing before choosing.
 */
function PendingWriteConflictDetail({
  conflict,
  serverRecord,
}: {
  conflict: NonNullable<PersistenceState['saveConflict']>;
  serverRecord: PersistenceState['conflictServerRecord'];
}): React.ReactElement {
  const campaignStore = useCampaignStore();
  const localDate = useStore(campaignStore, (s) => s.campaign?.currentDate);
  return (
    <div
      className="mt-1 space-y-1 text-sm text-red-400"
      data-testid="campaign-pending-write-conflict"
    >
      <p>
        Unsaved changes from your last session were not saved, and the server
        has moved on since. Nothing was sent and nothing was replaced.
      </p>
      <p data-testid="campaign-pending-write-local">
        This browser: campaign date {formatCampaignDate(localDate)}, built on
        version {conflict.localBaseVersion ?? 'unknown'}.
      </p>
      <p data-testid="campaign-pending-write-server">
        The server: campaign date{' '}
        {formatCampaignDate(serverRecord?.body.currentDate)}, at version{' '}
        {conflict.currentVersion}.
      </p>
      <p>
        Your changes stay in this window until you choose. Using the
        server&apos;s version discards them for good.
      </p>
    </div>
  );
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
  const recoveredPendingWrite = useCampaignPersistenceStore(
    (s) => s.recoveredPendingWrite,
  );
  const flushSkip = useCampaignPersistenceStore((s) => s.flushSkip);
  const conflictServerRecord = useCampaignPersistenceStore(
    (s) => s.conflictServerRecord,
  );
  const metadata = useCampaignPersistenceStore((s) => s.metadata);
  const errorMessage = useCampaignPersistenceStore((s) => s.errorMessage);
  const saveCampaign = useCampaignPersistenceStore((s) => s.saveCampaign);
  const saveConflict = useCampaignPersistenceStore((s) => s.saveConflict);
  const saveRefusal = useCampaignPersistenceStore((s) => s.saveRefusal);
  const resolveConflictTakeServer = useCampaignPersistenceStore(
    (s) => s.resolveConflictTakeServer,
  );
  const launchConflict = useCampaignPersistenceStore((s) => s.launchConflict);
  const clearLaunchConflict = useCampaignPersistenceStore(
    (s) => s.clearLaunchConflict,
  );

  const handleSaveNow = useCallback(() => {
    void saveCampaign();
  }, [saveCampaign]);

  const handleTakeServer = useCallback(() => {
    void resolveConflictTakeServer();
  }, [resolveConflictTakeServer]);

  // `resync-to-active-head` in this app is take-server: discard the
  // stale local view and adopt the record the authority holds. Reusing
  // the existing action rather than inventing a second resync keeps one
  // definition of "catch up to the server".
  const handleResyncLaunch = useCallback(() => {
    void resolveConflictTakeServer().then((adopted) => {
      if (adopted) clearLaunchConflict();
    });
  }, [clearLaunchConflict, resolveConflictTakeServer]);

  const status = describeSaveState({
    saveState,
    dirty,
    recoveredPendingWrite,
  });
  const isPendingWriteConflict =
    saveState === 'conflict' &&
    saveConflict?.reason === PENDING_WRITE_CONFLICT_REASON;

  return (
    <Card className="mb-6" data-testid="campaign-save-status-card">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <div className="mb-1 flex flex-wrap items-center gap-2">
            <h2 className="text-text-theme-primary text-lg font-semibold">
              Campaign Save
            </h2>
            <Badge variant={status.variant} size="sm">
              {status.label}
            </Badge>
          </div>
          <p
            className="text-text-theme-secondary text-sm"
            data-testid="campaign-last-saved"
          >
            Last saved: {formatLastSaved(metadata.lastSavedAt)}
          </p>
          {dirty && saveState === 'idle' && (
            <p
              className="text-text-theme-secondary text-sm"
              data-testid="campaign-save-pending-detail"
            >
              {recoveredPendingWrite
                ? 'Found changes from your last session that the server does not have. Saving now.'
                : 'Saving automatically in a moment.'}
            </p>
          )}
          {dirty && saveState !== 'saving' && flushSkip && (
            <p
              className="mt-1 text-sm text-yellow-400"
              data-testid="campaign-flush-skipped"
            >
              Too large to save when closing. Use Save now.
            </p>
          )}
          {saveState === 'error' && errorMessage && !saveRefusal && (
            <p className="mt-1 text-sm text-yellow-400">
              {errorMessage} — playing offline; changes are kept locally.
            </p>
          )}
          {saveState === 'error' && saveRefusal && (
            <p
              className="mt-1 text-sm text-red-400"
              data-testid="campaign-save-refused"
            >
              Save refused ({saveRefusal.code}): {saveRefusal.message}. Your
              unsaved changes are kept in this window.
            </p>
          )}
          {isPendingWriteConflict && saveConflict && (
            <PendingWriteConflictDetail
              conflict={saveConflict}
              serverRecord={conflictServerRecord}
            />
          )}
          {saveState === 'conflict' && !isPendingWriteConflict && (
            <p
              className="mt-1 text-sm text-red-400"
              data-testid="campaign-save-conflict"
            >
              Save refused
              {saveConflict ? ` (${saveConflict.reason})` : ''}: this campaign
              was changed elsewhere
              {saveConflict
                ? ` and is now at version ${saveConflict.currentVersion}`
                : ''}
              . Your unsaved edits cannot be applied on top of it - take the
              server version and redo them.
            </p>
          )}
          {launchConflict && (
            <p
              className="mt-1 text-sm text-red-400"
              data-testid="campaign-launch-conflict"
            >
              Launch refused ({launchConflict.code}): the campaign has moved on
              to revision {launchConflict.activeHead.revision}. Resync to launch
              from the current state.
            </p>
          )}
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {launchConflict && (
            <Button
              variant="primary"
              onClick={handleResyncLaunch}
              data-testid="campaign-launch-resync-btn"
            >
              Resync to Current
            </Button>
          )}
          {saveState === 'conflict' ? (
            // One action, because there is one honest move. The removed
            // "Keep My Version" re-sent the stale envelope at the server's
            // version, which silently discarded the other writer's change.
            <Button
              variant="primary"
              onClick={handleTakeServer}
              data-testid="campaign-conflict-take-server-btn"
            >
              Use Server Version
            </Button>
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
