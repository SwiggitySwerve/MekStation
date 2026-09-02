/**
 * The GM's rewind preview and confirmation (umbrella 19.3).
 *
 * A rewind is the destructive authority action on a match: it takes the
 * history back and everything derived from the part it removes goes stale.
 * So the GM is shown the blast radius the preview computed - which costs
 * nothing, because previewing commits nothing - and asked before anything
 * is applied.
 *
 * A REFUSAL DOES NOT CLOSE THE DIALOG. Closing on a refusal would drop the
 * GM back to the surface with no statement of what happened. Confirm stays
 * disabled while a commit is in flight and after a committed result so a
 * second press cannot apply the same rewind twice.
 *
 * @spec openspec/changes/harden-gm-two-player-campaign-sessions/tasks.md
 */

import React, { useEffect, useId, useRef, useState } from 'react';

import type { GmCombatRewindCommitResult } from '@/lib/multiplayer/server/history/GmCombatRewindCommit';

import { trapFocus } from '@/utils/accessibility';

import type {
  GmRewindPreviewOutcome,
  IGmRewindArm,
} from './gmRewindPreviewPhrasing';

import { RewindPreviewBody } from './GmRewindPreviewDialog.body';
import {
  describePreviewUnavailable,
  describeRewindCommitted,
  describeRewindRefusal,
  dispatchWhenArmed,
  rewindConfirmArm,
} from './gmRewindPreviewPhrasing';

export type { GmRewindPreviewOutcome };

export interface GmRewindPreviewDialogProps {
  /** The producer's answer; `null` while the request is in flight. */
  readonly outcome: GmRewindPreviewOutcome | null;
  /** Asks the server again. Commits nothing - the recovery after a refusal. */
  readonly onRetryPreview: () => void;
  /**
   * Applies the previewed rewind. Absent until a page binds the commit
   * producer; while absent the confirm renders disabled with the reason.
   */
  readonly onConfirmRewind?: () => Promise<GmCombatRewindCommitResult>;
  /** Backs out, applying nothing. */
  readonly onCancel: () => void;
  /**
   * Where focus goes when the opener has left the DOM by the time the
   * dialog closes. Without it focus lands on a detached node, which
   * silently means <body>.
   */
  readonly fallbackFocusRef: React.RefObject<HTMLElement | null>;
}

const BUTTON_BASE =
  'min-h-[44px] rounded-lg border px-3 py-1.5 text-sm font-medium focus:ring-2 focus:outline-none';

export function GmRewindPreviewDialog({
  outcome,
  onRetryPreview,
  onConfirmRewind,
  onCancel,
  fallbackFocusRef,
}: GmRewindPreviewDialogProps): React.ReactElement {
  const dialogRef = useRef<HTMLDivElement>(null);
  const primaryRef = useRef<HTMLButtonElement>(null);
  const refusalRef = useRef<HTMLParagraphElement>(null);
  const titleId = useId();
  const descriptionId = useId();
  const confirmReasonId = useId();
  const [commitResult, setCommitResult] =
    useState<GmCombatRewindCommitResult | null>(null);
  const [committing, setCommitting] = useState(false);
  const [commitUnavailable, setCommitUnavailable] = useState(false);
  const inFlightRef = useRef(false);

  const confirmArm: IGmRewindArm = rewindConfirmArm(
    outcome,
    onConfirmRewind !== undefined,
  );
  const confirmLocked =
    committing || commitResult?.kind === 'committed' || commitUnavailable;
  const confirmEnabled = confirmArm.enabled && !confirmLocked;
  const commitRefused = commitResult?.kind === 'refused';
  const refused =
    (outcome !== null && outcome.kind !== 'preview') ||
    commitRefused ||
    commitUnavailable;

  useEffect(() => {
    // A new preview (or a retry that cleared the last one) is a different
    // question. The previous commit answer must not linger as if it were
    // this one's.
    setCommitResult(null);
    setCommitting(false);
    setCommitUnavailable(false);
    inFlightRef.current = false;
  }, [outcome]);

  useEffect(() => {
    const opener = document.activeElement;
    const fallback = fallbackFocusRef;
    const dialog = dialogRef.current;
    primaryRef.current?.focus();
    const release = dialog ? trapFocus(dialog) : null;

    const handleKey = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') onCancel();
    };
    document.addEventListener('keydown', handleKey);

    return () => {
      release?.();
      document.removeEventListener('keydown', handleKey);
      if (opener instanceof HTMLElement && document.contains(opener)) {
        opener.focus();
        return;
      }
      fallback.current?.focus();
    };
    // Mount/unmount only: re-running would re-steal focus mid-dialog.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!refused) return;
    refusalRef.current?.focus();
  }, [refused]);

  const askToConfirm = async (): Promise<void> => {
    if (onConfirmRewind === undefined || inFlightRef.current) return;
    if (commitResult?.kind === 'committed') return;
    // WHY: two clicks can land before React disables the button. The ref
    // is the guard the disabled attribute cannot be; without it a pending
    // producer is called twice and the match is rewound twice.
    inFlightRef.current = true;
    setCommitting(true);
    try {
      const result = await onConfirmRewind();
      setCommitResult(result);
    } catch {
      setCommitUnavailable(true);
    } finally {
      inFlightRef.current = false;
      setCommitting(false);
    }
  };

  const armedForClick: IGmRewindArm = confirmEnabled
    ? { enabled: true, disabledReason: null }
    : {
        enabled: false,
        disabledReason: confirmArm.disabledReason ?? 'Commit already sent.',
      };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div
        ref={dialogRef}
        data-testid="gm-rewind-preview-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        className="bg-surface-base w-full max-w-lg rounded-lg border border-slate-700 p-4 shadow-xl"
      >
        <h4 id={titleId} className="text-sm font-semibold text-slate-200">
          Rewind this match?
        </h4>

        {outcome === null && commitResult === null && !commitUnavailable && (
          <p
            id={descriptionId}
            data-testid="gm-rewind-pending"
            className="mt-2 text-xs text-slate-400"
          >
            Working out what a rewind would touch. Nothing has been changed.
          </p>
        )}

        {outcome !== null &&
          outcome.kind === 'preview' &&
          commitResult === null &&
          !commitUnavailable && (
            <RewindPreviewBody
              descriptionId={descriptionId}
              outcome={outcome}
            />
          )}

        {commitResult?.kind === 'committed' && (
          <p
            id={descriptionId}
            data-testid="gm-rewind-committed"
            className="mt-2 text-xs text-emerald-200"
          >
            {describeRewindCommitted(commitResult)}
          </p>
        )}

        {refused && (
          <p
            ref={refusalRef}
            id={descriptionId}
            data-testid="gm-rewind-refusal"
            tabIndex={-1}
            className="mt-2 text-xs text-amber-200"
          >
            {commitResult?.kind === 'refused'
              ? describeRewindRefusal(commitResult)
              : outcome !== null && outcome.kind === 'refused'
                ? describeRewindRefusal(outcome)
                : describePreviewUnavailable()}
          </p>
        )}

        {armedForClick.disabledReason !== null && !refused && (
          <p
            id={confirmReasonId}
            data-testid="gm-rewind-confirm-reason"
            className="mt-2 text-xs text-slate-500"
          >
            {armedForClick.disabledReason}
          </p>
        )}

        <div
          data-testid="gm-rewind-preview-actions"
          className="mt-4 flex flex-wrap justify-end gap-2"
        >
          <button
            ref={refused || !confirmEnabled ? primaryRef : null}
            type="button"
            data-testid="gm-rewind-cancel"
            onClick={onCancel}
            className={`${BUTTON_BASE} border-slate-600 bg-slate-800 text-slate-200 hover:bg-slate-700 focus:ring-slate-400`}
          >
            {refused || commitResult?.kind === 'committed'
              ? 'Close'
              : 'Leave history alone'}
          </button>

          {refused ? (
            <button
              type="button"
              data-testid="gm-rewind-recovery"
              onClick={onRetryPreview}
              className={`${BUTTON_BASE} border-sky-500/50 bg-sky-600/20 text-sky-200 hover:bg-sky-600/30 focus:ring-sky-400`}
            >
              Ask the server again
            </button>
          ) : (
            <button
              ref={confirmEnabled ? primaryRef : null}
              type="button"
              data-testid="gm-rewind-confirm"
              disabled={!confirmEnabled}
              aria-describedby={
                armedForClick.disabledReason !== null
                  ? confirmReasonId
                  : undefined
              }
              onClick={() =>
                dispatchWhenArmed(armedForClick, () => {
                  void askToConfirm();
                })
              }
              className={`${BUTTON_BASE} border-red-500/50 bg-red-600/20 text-red-200 hover:bg-red-600/30 focus:ring-red-400 disabled:cursor-not-allowed disabled:opacity-50`}
            >
              Rewind the match
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default GmRewindPreviewDialog;
