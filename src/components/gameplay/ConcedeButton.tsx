/**
 * Concede Button
 *
 * Always-visible "Concede" control rendered in the gameplay HUD.
 * Wires the orphaned `InteractiveSession.concede(side)` engine helper
 * into a real user flow: opens a confirm modal, calls `concede()` on
 * the player's side, then navigates to `/gameplay/games/[id]/victory`
 * once the engine emits the `GameEnded` event.
 *
 * The button is a no-op (and rendered disabled) when the match has
 * already ended so a player cannot concede twice.
 *
 * @spec openspec/changes/add-victory-and-post-battle-summary/tasks.md § 1.3
 */

import { useRouter } from 'next/router';
import React, { useCallback, useEffect, useState } from 'react';

import type { InteractiveSession } from '@/engine/InteractiveSession';

import { DialogTemplate } from '@/components/ui/DialogTemplate';
import { GameEventType, GameSide } from '@/types/gameplay';

// =============================================================================
// Types
// =============================================================================

export interface ConcedeButtonProps {
  /** Live interactive session — provides `concede(side)` + event log. */
  readonly interactiveSession: InteractiveSession;
  /** Session id used to build the post-battle / victory route. */
  readonly sessionId: string;
  /** Side this UI player controls. Concede ends the match for this side. */
  readonly playerSide: GameSide;
  /**
   * Optional override for navigation. Defaults to Next router.push().
   * Exposed for tests so the smoke test does not need to mock router.
   */
  readonly onNavigate?: (path: string) => void;
  /** Optional className for layout overrides. */
  readonly className?: string;
}

// =============================================================================
// Component
// =============================================================================

/**
 * Renders the "Concede" button + confirm modal. Subscribes to the
 * session's event log via polling once the modal is dismissed so we
 * can detect the `GameEnded` event regardless of how it was emitted
 * (concede vs. AI destruction). Polling is cheap (one read per
 * animation frame at most) and avoids coupling to a global pub/sub.
 */
export function ConcedeButton({
  interactiveSession,
  sessionId,
  playerSide,
  onNavigate,
  className = '',
}: ConcedeButtonProps): React.ReactElement {
  const router = useRouter();
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [hasNavigated, setHasNavigated] = useState(false);

  // Determine whether the match is already over so we can disable
  // the control instead of letting the player click into a no-op.
  const isGameOver = interactiveSession.isGameOver();

  // Centralized navigation helper — uses the override if provided so
  // tests can assert without a real router.
  const navigateToVictory = useCallback(() => {
    const path = `/gameplay/games/${sessionId}/victory`;
    if (onNavigate) {
      onNavigate(path);
    } else {
      void router.push(path);
    }
  }, [onNavigate, router, sessionId]);

  const handleOpenConfirm = useCallback(() => {
    if (isGameOver) return;
    setIsConfirmOpen(true);
  }, [isGameOver]);

  const handleCancel = useCallback(() => {
    setIsConfirmOpen(false);
  }, []);

  const handleConfirm = useCallback(() => {
    // Defensive: re-check before mutating in case the game ended
    // between opening the modal and clicking confirm.
    if (interactiveSession.isGameOver()) {
      setIsConfirmOpen(false);
      return;
    }
    interactiveSession.concede(playerSide);
    setIsConfirmOpen(false);
    // The session is now Completed; navigate immediately. We also
    // run the GameEnded effect below as a safety net for any other
    // game-end source (e.g. opponent destruction during AI turn).
    navigateToVictory();
  }, [interactiveSession, playerSide, navigateToVictory]);

  // Watch for `GameEnded` events that originate from sources OTHER
  // than this button (AI turn, destruction). The browser's
  // requestAnimationFrame loop is cheap and avoids a second event
  // bus dependency.
  useEffect(() => {
    if (hasNavigated) return;
    let frameId: number | null = null;
    let cancelled = false;

    const tick = () => {
      if (cancelled) return;
      const session = interactiveSession.getSession();
      const ended = session.events.some(
        (e) => e.type === GameEventType.GameEnded,
      );
      if (ended) {
        setHasNavigated(true);
        navigateToVictory();
        return;
      }
      frameId = requestAnimationFrame(tick);
    };

    // requestAnimationFrame is unavailable in some test environments;
    // gracefully fall back to setTimeout so this component still works
    // under jest/jsdom without explicit polyfills.
    if (typeof requestAnimationFrame === 'function') {
      frameId = requestAnimationFrame(tick);
    } else {
      const id = setTimeout(tick, 50);
      return () => {
        cancelled = true;
        clearTimeout(id);
      };
    }
    return () => {
      cancelled = true;
      if (frameId !== null && typeof cancelAnimationFrame === 'function') {
        cancelAnimationFrame(frameId);
      }
    };
  }, [hasNavigated, interactiveSession, navigateToVictory]);

  return (
    <>
      <button
        type="button"
        onClick={handleOpenConfirm}
        disabled={isGameOver}
        className={`min-h-[44px] rounded bg-red-700 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-red-600 focus:ring-2 focus:ring-red-400 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
        data-testid="concede-button"
        aria-label="Concede match"
        title={isGameOver ? 'Match already ended' : 'Concede the match'}
      >
        Concede
      </button>

      <DialogTemplate
        isOpen={isConfirmOpen}
        onClose={handleCancel}
        title="Concede match?"
        ariaDescribedBy="concede-confirm-description"
      >
        <p
          id="concede-confirm-description"
          className="text-text-theme-primary text-sm"
          data-testid="concede-confirm-text"
        >
          Concede match? Your forces will withdraw. This cannot be undone.
        </p>
        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={handleCancel}
            className="bg-surface-raised hover:bg-surface-deep text-text-theme-primary min-h-[44px] rounded px-4 py-2 text-sm font-medium"
            data-testid="concede-cancel"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className="min-h-[44px] rounded bg-red-700 px-4 py-2 text-sm font-medium text-white hover:bg-red-600"
            data-testid="concede-confirm"
          >
            Concede
          </button>
        </div>
      </DialogTemplate>
    </>
  );
}

export default ConcedeButton;
