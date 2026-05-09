/**
 * Encounter Detail Page — Broken-Reference Repair Banner
 *
 * Renders above the existing form when either side of the encounter has
 * a broken force reference (a forceId is stored on the row but the
 * hydrated `playerForce`/`opponentForce` came back null because the
 * referenced force was deleted).
 *
 * Per affected slot:
 *  - One banner row with the broken-id called out by name.
 *  - One "Clear missing X force" button that routes through the
 *    relevant clear-action on `useEncounterStore`:
 *      * Player slot   → `clearPlayerForce(id)` → DELETE
 *                        `/api/encounters/[id]/player-force`
 *      * Opponent slot → `clearOpponentForce(id)` (existing).
 *  - After a successful click, the banner reloads the encounter list
 *    so the cleared row's banner disappears (the hydrated encounter no
 *    longer reports either side as missing).
 *
 * @spec openspec/changes/repair-broken-encounter-drafts/specs/game-session-management/spec.md
 *       (Requirement: Encounter Detail Page Repair Banner)
 */

import { useCallback, useState } from 'react';

import { Button } from '@/components/ui';
import { useEncounterSelector } from '@/stores/useEncounterStore';

export interface EncounterRepairBannerProps {
  readonly encounterId: string;
  /** Stored player forceId — non-null when the slot is broken. */
  readonly missingPlayerForceId: string | null;
  /** Stored opponent forceId — non-null when the slot is broken. */
  readonly missingOpponentForceId: string | null;
}

export function EncounterRepairBanner({
  encounterId,
  missingPlayerForceId,
  missingOpponentForceId,
}: EncounterRepairBannerProps): React.ReactElement | null {
  const clearPlayerForce = useEncounterSelector(
    (state) => state.clearPlayerForce,
  );
  const clearOpponentForce = useEncounterSelector(
    (state) => state.clearOpponentForce,
  );

  // Per-side "in flight" flags so the operator can't double-click the
  // same button while the DELETE is mid-air. Tracked independently
  // because clearing one side does not block clearing the other.
  const [isClearingPlayer, setIsClearingPlayer] = useState(false);
  const [isClearingOpponent, setIsClearingOpponent] = useState(false);

  const handleClearPlayer = useCallback(async () => {
    setIsClearingPlayer(true);
    try {
      // The store action calls `loadEncounters()` on success, which
      // refreshes the cached encounter — `playerForce` flips back to
      // undefined and the banner condition no longer matches, so the
      // banner unmounts on next render.
      await clearPlayerForce(encounterId);
    } finally {
      setIsClearingPlayer(false);
    }
  }, [clearPlayerForce, encounterId]);

  const handleClearOpponent = useCallback(async () => {
    setIsClearingOpponent(true);
    try {
      await clearOpponentForce(encounterId);
    } finally {
      setIsClearingOpponent(false);
    }
  }, [clearOpponentForce, encounterId]);

  // Render nothing when both sides are clean — keeps the banner from
  // claiming vertical space on the detail page in the common case.
  if (!missingPlayerForceId && !missingOpponentForceId) {
    return null;
  }

  return (
    <div
      className="mb-6 rounded-lg border border-yellow-600/40 bg-yellow-900/20 p-4"
      data-testid="encounter-repair-banner"
      role="alert"
    >
      <h3 className="mb-2 text-sm font-semibold text-yellow-300">
        Broken force reference
      </h3>
      <div className="flex flex-col gap-3">
        {missingPlayerForceId && (
          <div
            className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"
            data-testid="repair-banner-player"
          >
            <p className="text-sm text-yellow-200">
              This encounter has a broken force reference. The force{' '}
              <code className="rounded bg-yellow-900/40 px-1 py-0.5 text-xs">
                {missingPlayerForceId}
              </code>{' '}
              was deleted.
            </p>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleClearPlayer}
              disabled={isClearingPlayer}
              data-testid="clear-missing-player-force-btn"
            >
              {isClearingPlayer ? 'Clearing...' : 'Clear missing player force'}
            </Button>
          </div>
        )}

        {missingOpponentForceId && (
          <div
            className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"
            data-testid="repair-banner-opponent"
          >
            <p className="text-sm text-yellow-200">
              This encounter has a broken force reference. The force{' '}
              <code className="rounded bg-yellow-900/40 px-1 py-0.5 text-xs">
                {missingOpponentForceId}
              </code>{' '}
              was deleted.
            </p>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleClearOpponent}
              disabled={isClearingOpponent}
              data-testid="clear-missing-opponent-force-btn"
            >
              {isClearingOpponent
                ? 'Clearing...'
                : 'Clear missing opponent force'}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
