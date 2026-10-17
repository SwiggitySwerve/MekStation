/**
 * Victory / Defeat Screen
 *
 * Wires the orphaned `derivePostBattleReport` engine helper into a
 * real route: shows VICTORY / DEFEAT / DRAW based on the report's
 * winner, the human-readable victory reason, the MVP card, and a
 * full per-unit summary table. Bottom CTA returns to the encounter
 * hub.
 *
 * Loads the session from the in-memory `useGameplayStore` (same
 * source the gameplay page wrote to) — mirrors `replay.tsx`'s
 * client-only hydration pattern so SSR builds cleanly.
 *
 * @spec openspec/changes/add-victory-and-post-battle-summary/tasks.md § 4, § 7, § 8
 */

import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useEffect, useMemo, useRef, useState } from 'react';

import type { IGameSession } from '@/types/gameplay';

import { MvpDisplay } from '@/components/gameplay/MvpDisplay';
import { Button } from '@/components/ui/Button';
import { useGameplayStore } from '@/stores/useGameplayStore';
import { GameSide } from '@/types/gameplay';
import {
  derivePostBattleReport,
  victoryReasonLabel,
} from '@/utils/gameplay/postBattleReport';

// =============================================================================
// Presentational Screen
// =============================================================================

export interface VictoryScreenProps {
  /** Completed game session — must contain a GameEnded event. */
  readonly session: IGameSession;
  /** Side this UI player controls (defaults to Player). */
  readonly playerSide?: GameSide;
  /** Pilot name lookup keyed by unit id. */
  readonly pilotNames?: Record<string, string>;
  /** Optional callback for the back button (defaults to a Link). */
  readonly onBack?: () => void;
  /**
   * Per `wire-encounter-to-campaign-round-trip` Wave 5 (task 4.1): when
   * the session is part of a campaign (config.contractId set), surface
   * a "Continue to Review" CTA that navigates to the post-battle
   * review screen. The Phase 1 victory screen stays available for
   * standalone matches via the existing "Back to Encounter Hub" CTA.
   */
  readonly reviewHref?: string | null;
}

/**
 * Renders the victory/defeat screen. Pure presentational: no store
 * or router access — the page wrapper handles those concerns. This
 * makes the smoke test render a synthetic session directly without
 * mocking Next's router.
 */
export function VictoryScreen({
  session,
  playerSide = GameSide.Player,
  pilotNames = {},
  onBack,
  reviewHref = null,
}: VictoryScreenProps): React.ReactElement {
  const report = useMemo(() => derivePostBattleReport(session), [session]);

  // Outcome from the player's perspective. Drives banner color +
  // copy. Draw uses neutral gray styling.
  const outcome: 'victory' | 'defeat' | 'draw' =
    report.winner === 'draw'
      ? 'draw'
      : report.winner === playerSide
        ? 'victory'
        : 'defeat';

  const outcomeLabel =
    outcome === 'victory'
      ? 'VICTORY'
      : outcome === 'defeat'
        ? 'DEFEAT'
        : 'DRAW';

  // Tailwind colors are explicit per outcome so screenreaders get the
  // correct semantic word + sighted users get the visual cue.
  const outcomeColorClass =
    outcome === 'victory'
      ? 'text-emerald-400'
      : outcome === 'defeat'
        ? 'text-red-500'
        : 'text-text-theme-secondary';

  // victoryReasonLabel takes 'winner'|'loser' perspective. The loser
  // gets the personalized "You conceded" copy.
  const perspective: 'winner' | 'loser' =
    outcome === 'defeat' ? 'loser' : 'winner';
  const reasonText = victoryReasonLabel(report.reason, perspective);

  return (
    <div
      className="bg-surface-deep min-h-screen px-6 py-10"
      data-testid="victory-screen"
    >
      <div className="mx-auto max-w-5xl">
        {/* Outcome banner */}
        <div className="mb-8 text-center">
          <h1
            className={`text-6xl font-black tracking-tight ${outcomeColorClass}`}
            data-testid="victory-outcome"
            data-outcome={outcome}
          >
            {outcomeLabel}
          </h1>
          <p
            className="text-text-theme-secondary mt-3 text-lg"
            data-testid="victory-reason"
          >
            {reasonText}
          </p>
        </div>

        {/* MVP card */}
        <div className="mb-8">
          <MvpDisplay report={report} pilotNames={pilotNames} />
        </div>

        {/* Per-unit summary table */}
        <div
          className="bg-surface-base border-border-theme-subtle overflow-hidden rounded-lg border"
          data-testid="victory-unit-summary"
        >
          <table className="w-full text-sm">
            <thead className="bg-surface-raised text-text-theme-secondary text-xs tracking-wider uppercase">
              <tr>
                <th className="px-4 py-3 text-left">Unit</th>
                <th className="px-4 py-3 text-left">Side</th>
                <th className="px-4 py-3 text-right">Damage Dealt</th>
                <th className="px-4 py-3 text-right">Damage Taken</th>
                <th className="px-4 py-3 text-right">Kills</th>
                <th className="px-4 py-3 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="text-text-theme-primary">
              {report.units.map((unit) => {
                const state = session.currentState.units[unit.unitId];
                const status = state?.destroyed
                  ? 'Destroyed'
                  : state?.shutdown
                    ? 'Shutdown'
                    : 'Operational';
                const statusClass = state?.destroyed
                  ? 'text-red-400'
                  : state?.shutdown
                    ? 'text-amber-400'
                    : 'text-emerald-400';
                return (
                  <tr
                    key={unit.unitId}
                    className="border-border-theme-subtle border-t"
                    data-testid={`victory-unit-row-${unit.unitId}`}
                  >
                    <td className="px-4 py-3 font-medium">
                      {unit.designation}
                    </td>
                    <td className="px-4 py-3 capitalize">{unit.side}</td>
                    <td className="px-4 py-3 text-right">{unit.damageDealt}</td>
                    <td className="px-4 py-3 text-right">
                      {unit.damageReceived}
                    </td>
                    <td className="px-4 py-3 text-right">{unit.kills}</td>
                    <td
                      className={`px-4 py-3 text-right font-medium ${statusClass}`}
                    >
                      {status}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Wave 5: when this match is part of a campaign, surface a
            primary "Continue to Review" CTA — the player flows into the
            post-battle review page where the outcome is applied to the
            campaign and the contract closes out. The encounter-hub link
            stays available as a secondary action. */}
        <div className="mt-10 flex flex-col items-center gap-3">
          {reviewHref ? (
            <Link
              href={reviewHref}
              className="inline-flex min-h-[44px] items-center rounded-lg bg-emerald-600 px-6 py-3 text-base font-semibold text-white hover:bg-emerald-700"
              data-testid="victory-continue-to-review"
            >
              Continue to Review
            </Link>
          ) : null}
          {onBack ? (
            <Button
              variant={reviewHref ? 'secondary' : 'primary'}
              onClick={onBack}
              data-testid="victory-back"
            >
              Back to Encounter Hub
            </Button>
          ) : (
            <Link
              href="/gameplay/encounters"
              className={
                reviewHref
                  ? 'text-text-theme-secondary inline-flex min-h-[44px] items-center px-3 py-2 text-sm hover:underline'
                  : 'bg-accent text-on-accent hover:bg-accent-hover inline-flex min-h-[44px] items-center rounded-lg px-6 py-3 text-base font-medium'
              }
              data-testid="victory-back"
            >
              Back to Encounter Hub
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// Page Wrapper
// =============================================================================

/**
 * V211-02: after a reload the in-memory session is gone, but completed
 * matches are persisted server-side. Probe `GET /api/matches/:id` (the
 * loader the reload-safe `/gameplay/matches/<id>` report uses) and hand
 * off to that route; only fall back to the no-session guidance when
 * nothing was persisted.
 *
 * @spec openspec/specs/game-session-management/spec.md "Session Publishes
 *   Outcome Ready Event" (completed outcome is POSTed to /api/matches)
 */
function usePersistedReportRecovery(
  needsRecovery: boolean,
  matchId: string,
): 'idle' | 'probing' | 'missing' {
  const router = useRouter();
  const replaceRef = useRef(router.replace);
  replaceRef.current = router.replace;
  const [state, setState] = useState<'idle' | 'probing' | 'missing'>('idle');

  useEffect(() => {
    if (!needsRecovery) {
      setState('idle');
      return;
    }
    let cancelled = false;
    setState('probing');
    const reportRoute = `/gameplay/matches/${matchId}`;
    fetch(`/api/matches/${matchId}`)
      .then((res) => {
        if (cancelled) return;
        if (res.ok) {
          void replaceRef.current(reportRoute);
          return;
        }
        setState('missing');
      })
      .catch(() => {
        if (!cancelled) setState('missing');
      });
    return () => {
      cancelled = true;
    };
  }, [needsRecovery, matchId]);

  // The first client render precedes the probe effect; never flash the
  // no-session guidance before the persisted copy has been checked.
  return needsRecovery && state === 'idle' ? 'probing' : state;
}

export default function VictoryPage(): React.ReactElement {
  const router = useRouter();
  const { id } = router.query;
  const sessionId = typeof id === 'string' ? id : '';

  // Hydration guard — store reads happen client-side only so SSR
  // never renders a half-formed report.
  const [isClient, setIsClient] = useState(false);
  useEffect(() => {
    setIsClient(true);
  }, []);

  const session = useGameplayStore((s) => s.session);
  const pilotNames = useGameplayStore((s) => s.pilotNames);
  const recovery = usePersistedReportRecovery(
    isClient && Boolean(sessionId) && (!session || session.id !== sessionId),
    sessionId,
  );

  if (!isClient || recovery === 'probing') {
    return (
      <div
        className="bg-surface-deep flex h-screen items-center justify-center"
        data-testid="victory-loading"
      >
        <p className="text-text-theme-secondary">
          Loading post-battle report...
        </p>
      </div>
    );
  }

  // No session in the store → the user navigated here directly.
  // Bounce them back to the game session page so the engine can
  // re-hydrate the in-memory session.
  if (!session || (sessionId && session.id !== sessionId)) {
    return (
      <div
        className="bg-surface-deep flex h-screen flex-col items-center justify-center gap-4 px-6 text-center"
        data-testid="victory-no-session"
      >
        <h2 className="text-text-theme-primary text-xl font-semibold">
          No active session
        </h2>
        <p className="text-text-theme-secondary text-sm">
          The post-battle report needs the in-memory session. Return to the game
          and concede from there.
        </p>
        <Link
          href={
            sessionId ? `/gameplay/games/${sessionId}` : '/gameplay/encounters'
          }
          className="bg-accent text-on-accent hover:bg-accent-hover inline-flex min-h-[44px] items-center rounded-lg px-5 py-3 text-sm font-medium"
        >
          Back to game
        </Link>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Post-Battle Report - MekStation</title>
      </Head>
      <VictoryScreen
        session={session}
        playerSide={GameSide.Player}
        pilotNames={pilotNames}
        reviewHref={
          // Wave 5: campaign-bound matches show the "Continue to Review"
          // CTA. Standalone encounters keep the legacy hub-only layout.
          session.config.contractId
            ? `/gameplay/games/${session.id}/review`
            : null
        }
      />
    </>
  );
}
