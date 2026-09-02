/**
 * Confirmation for the GM's veto (umbrella 19.3).
 *
 * Veto is the destructive authority action on the review surface: it
 * rejects another player's proposal, and unlike Preview / Manual / GM Fix
 * it is genuinely wired to a transport. So it asks first.
 *
 * WHY NOT `DialogTemplate`. The shipped modal stack (ModalOverlay ->
 * DialogTemplate) supplies the overlay, the Escape handler and a focus
 * trap, and it would have been the obvious base. Two things stopped it.
 * It puts `aria-labelledby` on the CONTENT div rather than on the element
 * carrying `role="dialog"`, so the dialog has no accessible name - a
 * screen reader announces "dialog" and nothing else. And it never
 * restores focus on close, which drops a keyboard user on <body>. Both
 * are real defects in shared UI with fifteen consumers; fixing them there
 * is the correct fix but not this seam's, so this dialog is built here
 * and the gaps are recorded rather than inherited silently.
 *
 * The focus trap itself is NOT re-implemented: `trapFocus` already exists
 * in `src/utils/accessibility.ts`. ModalOverlay duplicates it inline; a
 * third copy is how the three drift apart.
 */

import React, { useEffect, useId, useRef } from 'react';

import { trapFocus } from '@/utils/accessibility';

export interface VetoConfirmationDialogProps {
  /** Human-readable description of the proposal being rejected. */
  readonly effectSummary: string;
  /** Confirms the veto. */
  readonly onConfirm: () => void;
  /** Backs out, deciding nothing. */
  readonly onCancel: () => void;
  /**
   * Where focus goes when the opener is gone by the time the dialog
   * closes - the row a committed decision removed, typically. Without it
   * focus would be restored onto a detached node, which silently means
   * <body>.
   */
  readonly fallbackFocusRef: React.RefObject<HTMLElement | null>;
}

/** The veto confirmation. Renders only while a veto is pending. */
export function VetoConfirmationDialog({
  effectSummary,
  onConfirm,
  onCancel,
  fallbackFocusRef,
}: VetoConfirmationDialogProps): React.ReactElement {
  const dialogRef = useRef<HTMLDivElement>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    // Plain locals, not refs. The effect runs once, so the closure already
    // carries these to cleanup - and reading `someRef.current` inside a
    // cleanup is the unreliable pattern the hooks lint warns about, since
    // the ref can point somewhere else by the time cleanup runs.
    const opener = document.activeElement;
    const fallback = fallbackFocusRef;
    const dialog = dialogRef.current;
    // Focus the confirm control rather than the dialog container: the
    // keyboard user lands on the action, and Shift+Tab from there reaches
    // Cancel, so both answers are one key away.
    confirmRef.current?.focus();
    const release = dialog ? trapFocus(dialog) : null;

    // Escape lives on the document, matching the two shipped modals: the
    // dialog body is not focusable, so a container-scoped listener would
    // miss the key whenever focus sat on a button inside.
    const handleKey = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') onCancel();
    };
    document.addEventListener('keydown', handleKey);

    return () => {
      release?.();
      document.removeEventListener('keydown', handleKey);
      // Restore focus. The opener is preferred; when it has left the
      // document - the usual case after a decision commits and its row
      // disappears - fall back to the surface, which is made
      // programmatically focusable for exactly this.
      if (opener instanceof HTMLElement && document.contains(opener)) {
        opener.focus();
        return;
      }
      fallback.current?.focus();
    };
    // Mount/unmount only: re-running this would re-steal focus mid-dialog.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div
        ref={dialogRef}
        data-testid="veto-confirmation"
        role="dialog"
        aria-modal="true"
        // On the element carrying the role, so the dialog has a name.
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        className="bg-surface-base w-full max-w-md rounded-lg border border-slate-700 p-4 shadow-xl"
      >
        <h4 id={titleId} className="text-sm font-semibold text-slate-200">
          Veto this proposal?
        </h4>
        <p id={descriptionId} className="mt-2 text-xs text-slate-400">
          {effectSummary}
        </p>
        <p className="mt-2 text-xs text-slate-400">
          The proposing player is told their proposal was vetoed. This cannot be
          undone from here.
        </p>
        {/* Wraps rather than scrolls, so both answers stay reachable on a
            narrow viewport. */}
        <div className="mt-4 flex flex-wrap justify-end gap-2">
          <button
            type="button"
            data-testid="veto-cancel"
            onClick={onCancel}
            className="min-h-[44px] rounded-lg border border-slate-600 bg-slate-800 px-3 py-1.5 text-sm font-medium text-slate-200 hover:bg-slate-700 focus:ring-2 focus:ring-slate-400 focus:outline-none"
          >
            Keep proposal
          </button>
          <button
            ref={confirmRef}
            type="button"
            data-testid="veto-confirm"
            onClick={onConfirm}
            className="min-h-[44px] rounded-lg border border-red-500/50 bg-red-600/20 px-3 py-1.5 text-sm font-medium text-red-200 hover:bg-red-600/30 focus:ring-2 focus:ring-red-400 focus:outline-none"
          >
            Veto proposal
          </button>
        </div>
      </div>
    </div>
  );
}

export default VetoConfirmationDialog;
