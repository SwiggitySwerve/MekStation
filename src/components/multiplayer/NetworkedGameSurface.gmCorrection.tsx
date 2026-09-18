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
 * @spec openspec/changes/harden-gm-two-player-campaign-sessions/specs/e2e-testing/spec.md
 */

import React, { useCallback, useId, useState } from 'react';

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

export function NetworkedHostGmControls({
  onPreview,
  onApprove,
  onPrivateReasonChange,
}: INetworkedHostGmControlsProps): React.ReactElement {
  const reasonId = useId();
  const [status, setStatus] = useState<string | null>(null);

  const askForPreview = useCallback((): void => {
    void (async () => {
      let outcome: GmRewindPreviewOutcome | void;
      try {
        outcome = await onPreview();
      } catch {
        // What threw is a fact about a socket, not about this match.
        setStatus(describePreviewUnavailable());
        return;
      }
      // A caller that answers nothing says nothing: no state is touched,
      // so a `() => void` handler leaves this control exactly as it was.
      if (outcome === undefined) return;
      setStatus(describeCorrectionPreview(outcome));
    })();
  }, [onPreview]);

  const applyCorrection = useCallback((): void => {
    void (async () => {
      let result: GmCombatRewindCommitResult | void;
      try {
        result = await onApprove();
      } catch {
        setStatus(describePreviewUnavailable());
        return;
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
        className="rounded border border-sky-500/50 bg-sky-600/20 px-3 py-1.5 text-sm font-medium text-sky-200 hover:bg-sky-600/30"
      >
        Preview GM Fix
      </button>
      <button
        type="button"
        data-testid="networked-gm-approve-btn"
        onClick={applyCorrection}
        className="rounded border border-violet-500/50 bg-violet-600/20 px-3 py-1.5 text-sm font-medium text-violet-200 hover:bg-violet-600/30"
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
