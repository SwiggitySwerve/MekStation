/**
 * The host GM's rewind controls on the networked lobby surface
 * (umbrella 19.3).
 *
 * REPLACES the two inert stubs as the host GM's control on the production
 * lobby route. `networked-gm-preview-btn` / `networked-gm-approve-btn`
 * called props that defaulted to no-ops, so on the lobby route - which
 * passes neither - pressing them did nothing and nothing said so, and the
 * GM's conclusion from pressing one is "the correction went through"
 * (defect #15). The defaults are gone, so that block now renders only for
 * the `/e2e/networked-command-proof` harness that actually wires it, and
 * this is what the host sees in production.
 *
 * REPLACED-WHEN-EMITTED - the preview producer is injected rather than
 * fetched here. The route that will answer, `POST
 * /api/matches/[id]/rewind-preview`, is task 3b-iii and does not exist on
 * any branch yet. Its contract is already fixed: the
 * `GmCombatRewindPreviewResult` union VERBATIM as the body (200 for a
 * preview, 403 / 404 / 409 for refusals), while a transport failure (400,
 * 401, 405, 500) answers `{ error, reason? }` with NO `kind` field. So the
 * adapter that lands with the page wiring branches on the presence of
 * `kind`; anything else - including a thrown fetch - reaches this component
 * as `unavailable`, which is phrased on its own and never shows what threw.
 *
 * Until a page passes a producer, the preview control renders DISABLED
 * with the reason, and the confirm arm is disabled for a second,
 * independent reason: the commit path itself is task 3b-iv.
 *
 * @spec openspec/changes/harden-gm-two-player-campaign-sessions/tasks.md
 */

import React, { useCallback, useId, useRef, useState } from 'react';

import type { GmRewindPreviewOutcome } from './gmRewindPreviewPhrasing';

import { GmRewindPreviewDialog } from './GmRewindPreviewDialog';
import { dispatchWhenArmed, rewindPreviewArm } from './gmRewindPreviewPhrasing';

export interface INetworkedGmRewindControlsProps {
  /** Asks the authority what a rewind would touch. Commits nothing. */
  readonly onPreviewRewind?: () => Promise<GmRewindPreviewOutcome>;
  /** Applies the previewed rewind. Absent until task 3b-iv builds one. */
  readonly onConfirmRewind?: () => void;
}

export function NetworkedGmRewindControls({
  onPreviewRewind,
  onConfirmRewind,
}: INetworkedGmRewindControlsProps): React.ReactElement {
  const surfaceRef = useRef<HTMLDivElement | null>(null);
  const previewReasonId = useId();
  const [open, setOpen] = useState(false);
  const [outcome, setOutcome] = useState<GmRewindPreviewOutcome | null>(null);

  const previewArm = rewindPreviewArm(onPreviewRewind !== undefined);

  const askForPreview = useCallback(async (): Promise<void> => {
    if (onPreviewRewind === undefined) return;
    // Clear first: the dialog opens on the in-flight body, so a second ask
    // never shows the previous answer as if it were the new one.
    setOutcome(null);
    setOpen(true);
    try {
      setOutcome(await onPreviewRewind());
    } catch {
      // What threw is a fact about a socket, not about this match, and it
      // is deliberately dropped rather than carried into the type.
      setOutcome({ kind: 'unavailable' });
    }
  }, [onPreviewRewind]);

  return (
    <div
      ref={surfaceRef}
      data-testid="networked-gm-rewind-controls"
      // Programmatically focusable so focus has somewhere to land when the
      // control the dialog was opened from is gone. Never in the tab order.
      tabIndex={-1}
      className="flex flex-wrap gap-2 rounded-lg border border-violet-700/60 bg-violet-950/30 p-2"
    >
      <button
        type="button"
        data-testid="networked-gm-rewind-preview-btn"
        disabled={!previewArm.enabled}
        aria-describedby={
          previewArm.disabledReason !== null ? previewReasonId : undefined
        }
        onClick={() => {
          dispatchWhenArmed(previewArm, () => {
            void askForPreview();
          });
        }}
        className="min-h-[44px] rounded border border-sky-500/50 bg-sky-600/20 px-3 py-1.5 text-sm font-medium text-sky-200 hover:bg-sky-600/30 focus:ring-2 focus:ring-sky-400 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
      >
        Preview a rewind
      </button>

      {previewArm.disabledReason !== null && (
        <p
          id={previewReasonId}
          data-testid="networked-gm-rewind-unavailable"
          className="self-center text-xs text-slate-400"
        >
          {previewArm.disabledReason}
        </p>
      )}

      {open && (
        <GmRewindPreviewDialog
          outcome={outcome}
          fallbackFocusRef={surfaceRef}
          onRetryPreview={() => {
            void askForPreview();
          }}
          onConfirmRewind={
            // Wrapped rather than forwarded so confirming closes the
            // dialog: the question has been answered, and leaving it open
            // over a decided rewind invites a second press. `undefined`
            // when no producer exists, because that absence IS what the
            // confirm arm reads to disable itself.
            onConfirmRewind === undefined
              ? undefined
              : () => {
                  onConfirmRewind();
                  setOpen(false);
                  setOutcome(null);
                }
          }
          onCancel={() => {
            setOpen(false);
            setOutcome(null);
          }}
        />
      )}
    </div>
  );
}

export default NetworkedGmRewindControls;
