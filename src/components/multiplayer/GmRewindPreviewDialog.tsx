/**
 * The GM's rewind preview and confirmation (umbrella 19.3).
 *
 * A rewind is the destructive authority action on a match: it takes the
 * history back and everything derived from the part it removes goes stale.
 * So the GM is shown the blast radius the preview computed - which costs
 * nothing, because previewing commits nothing - and asked before anything
 * is applied.
 *
 * WHY NOT `DialogTemplate`, and why this is a second dialog rather than a
 * reuse of `VetoConfirmationDialog`: the shipped modal stack puts
 * `aria-labelledby` on the content div rather than on the element carrying
 * `role="dialog"` (so the dialog has no accessible name) and never
 * restores focus on close. `VetoConfirmationDialog` was built in the
 * campaign tree to avoid both, and this follows its SHAPE deliberately -
 * same trap, same Escape scope, same restore-with-fallback - but it is a
 * different dialog: its body has three states (in flight, a preview, a
 * refusal), it swaps between them without closing, and its primary action
 * is disabled for a reason it must render. Importing across into the
 * campaign tree to share a shell would couple two surfaces that answer
 * different questions.
 *
 * The focus trap is NOT re-implemented: `trapFocus` already exists in
 * `src/utils/accessibility.ts`, and a third copy is how copies drift.
 *
 * A REFUSAL DOES NOT CLOSE THE DIALOG. Closing on a refusal would drop the
 * GM back to the surface with no statement of what happened, and the thing
 * they need next - asking the server again - would be a control they have
 * to rediscover. The body swaps in place, focus moves to the sentence, and
 * the primary becomes the recovery, which commits nothing: it clears the
 * local answer so the server is asked again.
 *
 * @spec openspec/changes/harden-gm-two-player-campaign-sessions/tasks.md
 */

import React, { useEffect, useId, useRef } from 'react';

import { trapFocus } from '@/utils/accessibility';

import type {
  GmRewindPreviewOutcome,
  IGmRewindArm,
} from './gmRewindPreviewPhrasing';

import {
  describePreviewUnavailable,
  describeRewindBlastRadius,
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
   * Applies the previewed rewind. Absent until task 3b-iv builds a commit
   * path; while absent the confirm renders disabled with the reason.
   */
  readonly onConfirmRewind?: () => void;
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

  const confirmArm: IGmRewindArm = rewindConfirmArm(
    outcome,
    onConfirmRewind !== undefined,
  );
  const refused = outcome !== null && outcome.kind !== 'preview';

  useEffect(() => {
    // Plain locals, not refs: the effect runs once, so the closure carries
    // these to cleanup, and reading a ref inside cleanup is the unreliable
    // pattern the hooks lint warns about.
    const opener = document.activeElement;
    const fallback = fallbackFocusRef;
    const dialog = dialogRef.current;
    // Focus the primary control that can actually be used. When confirm is
    // disabled that is the way out, not the greyed-out action - a keyboard
    // user landing on something inert has to guess where they are.
    primaryRef.current?.focus();
    const release = dialog ? trapFocus(dialog) : null;

    // Escape on the document, matching the shipped modals: focus sits on a
    // button inside, so a container-scoped listener would miss the key.
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
    // A refusal arriving while the dialog is open leaves the GM's focus on
    // a control that no longer exists or no longer means anything. Move it
    // to the sentence that says what happened, which is also how a screen
    // reader hears the swap at all - the body changed, the dialog did not.
    if (!refused) return;
    refusalRef.current?.focus();
  }, [refused]);

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

        {outcome === null && (
          <p
            id={descriptionId}
            data-testid="gm-rewind-pending"
            className="mt-2 text-xs text-slate-400"
          >
            Working out what a rewind would touch. Nothing has been changed.
          </p>
        )}

        {outcome !== null && outcome.kind === 'preview' && (
          <RewindPreviewBody descriptionId={descriptionId} outcome={outcome} />
        )}

        {refused && outcome !== null && (
          <p
            ref={refusalRef}
            id={descriptionId}
            data-testid="gm-rewind-refusal"
            // Focusable so focus can land on the statement itself, never in
            // the tab order - it is a sentence, not a control.
            tabIndex={-1}
            className="mt-2 text-xs text-amber-200"
          >
            {outcome.kind === 'refused'
              ? describeRewindRefusal(outcome)
              : describePreviewUnavailable()}
          </p>
        )}

        {/* The reason the confirm is unavailable, rendered rather than
            implied: an `aria-describedby` pointing at nothing describes
            nothing, and a disabled control is out of the tab order so
            hover cannot rescue it. */}
        {confirmArm.disabledReason !== null && !refused && (
          <p
            id={confirmReasonId}
            data-testid="gm-rewind-confirm-reason"
            className="mt-2 text-xs text-slate-500"
          >
            {confirmArm.disabledReason}
          </p>
        )}

        {/* Wraps rather than scrolls, so every answer stays reachable on a
            narrow viewport. */}
        <div
          data-testid="gm-rewind-preview-actions"
          className="mt-4 flex flex-wrap justify-end gap-2"
        >
          <button
            ref={refused || !confirmArm.enabled ? primaryRef : null}
            type="button"
            data-testid="gm-rewind-cancel"
            onClick={onCancel}
            className={`${BUTTON_BASE} border-slate-600 bg-slate-800 text-slate-200 hover:bg-slate-700 focus:ring-slate-400`}
          >
            {refused ? 'Close' : 'Leave history alone'}
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
              ref={confirmArm.enabled ? primaryRef : null}
              type="button"
              data-testid="gm-rewind-confirm"
              disabled={!confirmArm.enabled}
              aria-describedby={
                confirmArm.disabledReason !== null ? confirmReasonId : undefined
              }
              onClick={() => dispatchWhenArmed(confirmArm, onConfirmRewind)}
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

function RewindPreviewBody({
  descriptionId,
  outcome,
}: {
  readonly descriptionId: string;
  readonly outcome: Extract<GmRewindPreviewOutcome, { kind: 'preview' }>;
}): React.ReactElement {
  const radius = describeRewindBlastRadius(outcome);
  return (
    <div
      id={descriptionId}
      data-testid="gm-rewind-preview-blast-radius"
      className="mt-2 text-xs text-slate-400"
    >
      <p>{radius.summary}</p>
      {radius.artifactLines.length > 0 && (
        <ul className="mt-2 list-disc pl-5">
          {radius.artifactLines.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      )}
      <p className="mt-2 text-slate-500">
        Nothing has been changed yet. Looking costs nothing.
      </p>
    </div>
  );
}

export default GmRewindPreviewDialog;
