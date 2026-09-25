/**
 * The host GM's correction controls on the networked surface
 * (roadmap U5b, E2E-25's client half).
 *
 * MOVED here from `NetworkedGameSurface.tsx`, unchanged in what it mounts
 * - same container test id, same two buttons - for the same reason the
 * rewind controls were extracted: the surface file sits close under the
 * `max-lines` bound, and this control now carries a third element.
 *
 * WHAT IS NEW is the private-reason field. E2E-25 has the GM finalize a
 * correction "with a private reason"; this is where that reason is typed.
 * It is deliberately UNCONTROLLED: the component never holds it, so it
 * cannot re-render it into the tree, and the only thing that happens to a
 * keystroke is that it is handed to `onPrivateReasonChange`. The field
 * appears only when a caller passes that handler, and the whole block
 * mounts only for the `host-gm` projection and never for a spectator -
 * both gates live in `NetworkedGameSurface` and are asserted there.
 *
 * The status line exists so the two buttons are not the defect-#15 shape
 * of a control that calls the server and says nothing. A caller whose
 * handlers answer nothing - the `/e2e/networked-command-proof` harness,
 * whose stubs return `void` and render their own text - sets no status
 * and gets exactly the DOM it had before.
 *
 * ONE PRESS, ONE REQUEST (U36). Each button ignores a press while the
 * request its previous press started is still pending, and renders
 * disabled for that time - the `GmRewindPreviewDialog` pattern: a ref
 * refuses the second of two clicks that land before React re-renders,
 * and state drives the `disabled` attribute. The reason field stops at
 * the commit route's reason bound.
 *
 * @spec openspec/changes/harden-gm-two-player-campaign-sessions/specs/e2e-testing/spec.md
 */

import React, { useCallback, useId, useRef, useState } from 'react';

import type { GmCombatRewindCommitResult } from '@/lib/multiplayer/server/history/GmCombatRewindCommit';

import type { GmRewindPreviewOutcome } from './gmRewindPreviewPhrasing';

import {
  describePreviewUnavailable,
  describeRewindBlastRadius,
  describeRewindCommitted,
  describeRewindRefusal,
} from './gmRewindPreviewPhrasing';

/**
 * A handler may answer with the producer's outcome or with nothing. The
 * `void` arm is what keeps the existing `() => void` callers assignable.
 */
export type GmCorrectionPreviewHandler =
  () => void | Promise<GmRewindPreviewOutcome | void>;

export type GmCorrectionApproveHandler =
  () => void | Promise<GmCombatRewindCommitResult | void>;

export interface INetworkedHostGmControlsProps {
  readonly onPreview: GmCorrectionPreviewHandler;
  readonly onApprove: GmCorrectionApproveHandler;
  /**
   * Carries what the GM typed to the producer that will attach it to the
   * commit. Absent means this caller has nowhere to put a private reason,
   * and the field is not rendered at all rather than rendered inert.
   */
  readonly onPrivateReasonChange?: (reason: string) => void;
}

/**
 * The longest private reason the rewind-commit route accepts:
 * `isRewindCommitBody` (src/pages-modules/api/rewindCommitDeps.ts)
 * refuses a reason whose trimmed length exceeds 2000 UTF-16 code units,
 * the same unit `maxLength` counts. Trimming only shortens, so any value
 * this bound lets the GM type passes that check's upper bound.
 */
const PRIVATE_REASON_MAX_LENGTH = 2000;

/** One authored sentence for whatever the preview producer answered. */
function describeCorrectionPreview(outcome: GmRewindPreviewOutcome): string {
  if (outcome.kind === 'preview') {
    return describeRewindBlastRadius(outcome).summary;
  }
  if (outcome.kind === 'refused') return describeRewindRefusal(outcome);
  return describePreviewUnavailable();
}

/** One authored sentence for whatever the commit producer answered. */
function describeCorrectionCommit(result: GmCombatRewindCommitResult): string {
  return result.kind === 'committed'
    ? describeRewindCommitted(result)
    : describeRewindRefusal(result);
}

/**
 * Renders Preview GM Fix and Approve GM Fix, each disabled while its own
 * request is pending, the private-reason field (only when
 * `onPrivateReasonChange` is supplied, capped at the route's bound), and
 * the status line once a handler has answered.
 */
export function NetworkedHostGmControls({
  onPreview,
  onApprove,
  onPrivateReasonChange,
}: INetworkedHostGmControlsProps): React.ReactElement {
  const reasonId = useId();
  const [status, setStatus] = useState<string | null>(null);
  const [previewPending, setPreviewPending] = useState(false);
  const [approvePending, setApprovePending] = useState(false);
  // WHY refs beside the state: two clicks can land before React disables
  // the button. The ref is read synchronously by the second click; the
  // state only drives the `disabled` attribute on the next render.
  const previewInFlightRef = useRef(false);
  const approveInFlightRef = useRef(false);

  /**
   * Calls `onPreview` once per press. A press while the previous preview
   * is still pending returns without calling it. The pending flags are
   * set before the call and cleared when its promise settles (resolved or
   * rejected); the answer, if any, becomes the status line.
   */
  const askForPreview = useCallback((): void => {
    if (previewInFlightRef.current) return;
    previewInFlightRef.current = true;
    setPreviewPending(true);
    void (async () => {
      let outcome: GmRewindPreviewOutcome | void;
      try {
        outcome = await onPreview();
      } catch {
        // What threw is a fact about a socket, not about this match.
        setStatus(describePreviewUnavailable());
        return;
      } finally {
        previewInFlightRef.current = false;
        setPreviewPending(false);
      }
      // A caller that answers nothing says nothing: no status is set, so
      // a `() => void` handler leaves this control as it was once the
      // pending flag clears, which for a `void` answer is straight after
      // the call returns.
      if (outcome === undefined) return;
      setStatus(describeCorrectionPreview(outcome));
    })();
  }, [onPreview]);

  /**
   * Calls `onApprove` once per press. A press while the previous commit
   * is still pending returns without calling it, so a double click sends
   * one commit. The pending flags are set before the call and cleared
   * when its promise settles; the answer, if any, becomes the status line.
   */
  const applyCorrection = useCallback((): void => {
    if (approveInFlightRef.current) return;
    approveInFlightRef.current = true;
    setApprovePending(true);
    void (async () => {
      let result: GmCombatRewindCommitResult | void;
      try {
        result = await onApprove();
      } catch {
        setStatus(describePreviewUnavailable());
        return;
      } finally {
        approveInFlightRef.current = false;
        setApprovePending(false);
      }
      if (result === undefined) return;
      setStatus(describeCorrectionCommit(result));
    })();
  }, [onApprove]);

  return (
    <div
      data-testid="networked-host-gm-controls"
      className="flex flex-wrap items-center gap-2 rounded-lg border border-violet-700/60 bg-violet-950/30 p-2"
    >
      <button
        type="button"
        data-testid="networked-gm-preview-btn"
        onClick={askForPreview}
        disabled={previewPending}
        className="rounded border border-sky-500/50 bg-sky-600/20 px-3 py-1.5 text-sm font-medium text-sky-200 hover:bg-sky-600/30 disabled:cursor-not-allowed disabled:opacity-50"
      >
        Preview GM Fix
      </button>
      <button
        type="button"
        data-testid="networked-gm-approve-btn"
        onClick={applyCorrection}
        disabled={approvePending}
        className="rounded border border-violet-500/50 bg-violet-600/20 px-3 py-1.5 text-sm font-medium text-violet-200 hover:bg-violet-600/30 disabled:cursor-not-allowed disabled:opacity-50"
      >
        Approve GM Fix
      </button>

      {onPrivateReasonChange !== undefined && (
        <span className="flex flex-wrap items-center gap-2">
          <label
            htmlFor={reasonId}
            className="text-text-theme-secondary text-xs"
          >
            Private reason (GM only)
          </label>
          <input
            id={reasonId}
            type="text"
            data-testid="networked-gm-private-reason"
            // The route answers a longer reason with a 400 after the GM
            // has pressed Approve; stopping the typing here avoids that
            // refusal instead of reporting it afterwards.
            maxLength={PRIVATE_REASON_MAX_LENGTH}
            // Uncontrolled on purpose: the reason must not become state
            // this component can render or a parent can read back.
            onChange={(event) => {
              onPrivateReasonChange(event.target.value);
            }}
            className="border-border-theme bg-surface-deep text-text-theme-primary min-h-[44px] rounded border px-2 py-1 text-sm focus:border-violet-500 focus:outline-none"
          />
        </span>
      )}

      {status !== null && (
        <p
          data-testid="networked-gm-correction-status"
          role="status"
          className="text-text-theme-secondary basis-full text-xs"
        >
          {status}
        </p>
      )}
    </div>
  );
}

export default NetworkedHostGmControls;
