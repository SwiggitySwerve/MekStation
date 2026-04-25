/**
 * Post-Battle Match Report Viewer
 *
 * Per `add-victory-and-post-battle-summary` tasks 5.x: renders a
 * stored `IPostBattleReport` fetched via GET /api/matches/[id]. Used
 * after a page reload (when the in-memory session is gone) and as
 * the campaign-side "view this old match" entry point.
 *
 * Layout:
 *  - Header: winner banner + reason label + turn count
 *  - MVP card (reuses MvpDisplay) — hidden when winner === 'draw' or
 *    no damage dealt by the winning side (mvpUnitId === null)
 *  - Per-unit table (one row per unit, both sides)
 *    - Damage Dealt / Damage Taken / Kills / Heat Problems / Phys Atks
 *    - XP column shows the "pending campaign integration" placeholder
 *      per task 5.4
 *  - MVP row carries a highlighted background per task 5.3
 *  - Collapsible event log below (all events from the match) per
 *    task 5.5
 *
 * @spec openspec/changes/add-victory-and-post-battle-summary/tasks.md § 5, § 6.4
 */

import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useEffect, useMemo, useState } from 'react';

import { MvpDisplay } from '@/components/gameplay/MvpDisplay';
import {
  victoryReasonLabel,
  type IPostBattleReport,
} from '@/utils/gameplay/postBattleReport';

// =============================================================================
// Page
// =============================================================================

interface FetchState {
  readonly status: 'loading' | 'ok' | 'error';
  readonly report?: IPostBattleReport;
  readonly errorMessage?: string;
}

export default function MatchReportPage(): React.ReactElement {
  const router = useRouter();
  const { id } = router.query;
  const matchId = typeof id === 'string' ? id : '';

  const [state, setState] = useState<FetchState>({ status: 'loading' });
  const [eventLogOpen, setEventLogOpen] = useState(false);

  // Fetch the stored report. Mirrors the standard SWR-style "loading
  // / ok / error" projection without pulling in a new dependency. We
  // intentionally do NOT retry on 400 — those are version-mismatch
  // surfaces the user can't recover from.
  useEffect(() => {
    if (!matchId) return;
    let cancelled = false;
    setState({ status: 'loading' });
    void fetch(`/api/matches/${matchId}`)
      .then(async (res) => {
        if (cancelled) return;
        if (res.ok) {
          const report = (await res.json()) as IPostBattleReport;
          setState({ status: 'ok', report });
          return;
        }
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        setState({
          status: 'error',
          errorMessage:
            body.error ?? `request failed with status ${res.status}`,
        });
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setState({
          status: 'error',
          errorMessage: err instanceof Error ? err.message : String(err),
        });
      });
    return () => {
      cancelled = true;
    };
  }, [matchId]);

  // Derive a Set of unit ids that should be highlighted as MVP. Only
  // ever 0 or 1, but Set keeps the lookup O(1) and survives future
  // multi-MVP variants without ceremony.
  const mvpIds = useMemo(() => {
    if (!state.report?.mvpUnitId) return new Set<string>();
    return new Set([state.report.mvpUnitId]);
  }, [state.report?.mvpUnitId]);

  if (state.status === 'loading') {
    return (
      <div
        className="flex h-screen items-center justify-center bg-gray-900"
        data-testid="match-report-loading"
      >
        <p className="text-gray-400">Loading post-battle report...</p>
      </div>
    );
  }

  if (state.status === 'error' || !state.report) {
    return (
      <div
        className="flex h-screen flex-col items-center justify-center gap-4 bg-gray-900 px-6 text-center"
        data-testid="match-report-error"
      >
        <h2 className="text-xl font-semibold text-white">
          Could not load match report
        </h2>
        <p className="text-sm text-gray-400">
          {state.errorMessage ?? 'unknown error'}
        </p>
        <Link
          href="/gameplay/encounters"
          className="inline-flex min-h-[44px] items-center rounded-lg bg-blue-600 px-5 py-3 text-sm font-medium text-white hover:bg-blue-700"
        >
          Back to Encounter Hub
        </Link>
      </div>
    );
  }

  const report = state.report;
  const winnerLabel =
    report.winner === 'draw'
      ? 'DRAW'
      : report.winner === 'player'
        ? 'VICTORY'
        : 'DEFEAT';
  const winnerColor =
    report.winner === 'draw'
      ? 'text-gray-300'
      : report.winner === 'player'
        ? 'text-emerald-400'
        : 'text-red-500';

  return (
    <>
      <Head>
        <title>Match Report - MekStation</title>
      </Head>
      <div
        className="min-h-screen bg-gray-900 px-6 py-10"
        data-testid="match-report"
      >
        <div className="mx-auto max-w-5xl">
          {/* Header */}
          <div className="mb-8 text-center">
            <h1
              className={`text-5xl font-black tracking-tight ${winnerColor}`}
              data-testid="match-report-outcome"
              data-outcome={report.winner}
            >
              {winnerLabel}
            </h1>
            <p
              className="mt-3 text-lg text-gray-300"
              data-testid="match-report-reason"
            >
              {victoryReasonLabel(report.reason)}
            </p>
            <p
              className="mt-1 text-sm text-gray-400"
              data-testid="match-report-turn-count"
            >
              {report.turnCount} {report.turnCount === 1 ? 'turn' : 'turns'}{' '}
              played
            </p>
          </div>

          {/* MVP card (hidden when no MVP — draw or zero damage) */}
          {report.mvpUnitId ? (
            <div className="mb-8">
              <MvpDisplay report={report} />
            </div>
          ) : null}

          {/* Per-unit summary table */}
          <div
            className="overflow-hidden rounded-lg border border-gray-700 bg-gray-800"
            data-testid="match-report-units"
          >
            <table className="w-full text-sm">
              <thead className="bg-gray-900 text-xs tracking-wider text-gray-400 uppercase">
                <tr>
                  <th className="px-4 py-3 text-left">Unit</th>
                  <th className="px-4 py-3 text-left">Side</th>
                  <th className="px-4 py-3 text-right">Damage Dealt</th>
                  <th className="px-4 py-3 text-right">Damage Taken</th>
                  <th className="px-4 py-3 text-right">Kills</th>
                  <th className="px-4 py-3 text-right">Heat Problems</th>
                  <th className="px-4 py-3 text-right">Physical Attacks</th>
                  <th className="px-4 py-3 text-right">XP</th>
                </tr>
              </thead>
              <tbody className="text-gray-100">
                {report.units.map((unit) => {
                  const isMvp = mvpIds.has(unit.unitId);
                  return (
                    <tr
                      key={unit.unitId}
                      className={
                        isMvp
                          ? 'border-t border-amber-500/40 bg-amber-500/10'
                          : 'border-t border-gray-700'
                      }
                      data-testid={`match-report-row-${unit.unitId}`}
                      data-mvp={isMvp || undefined}
                    >
                      <td className="px-4 py-3 font-medium">
                        {unit.designation}
                      </td>
                      <td className="px-4 py-3 capitalize">{unit.side}</td>
                      <td className="px-4 py-3 text-right">
                        {unit.damageDealt}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {unit.damageReceived}
                      </td>
                      <td className="px-4 py-3 text-right">{unit.kills}</td>
                      <td className="px-4 py-3 text-right">
                        {unit.heatProblems}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {unit.physicalAttacks}
                      </td>
                      <td
                        className="px-4 py-3 text-right text-xs text-gray-400 italic"
                        data-testid={`match-report-xp-${unit.unitId}`}
                      >
                        pending campaign integration
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Collapsible event log (task 5.5) */}
          <div className="mt-6">
            <button
              type="button"
              onClick={() => setEventLogOpen((open) => !open)}
              className="hover:bg-gray-750 flex w-full items-center justify-between rounded-lg border border-gray-700 bg-gray-800 px-4 py-3 text-left text-sm font-medium text-gray-200"
              data-testid="match-report-log-toggle"
              aria-expanded={eventLogOpen}
            >
              <span>
                Event Log ({report.log.length}{' '}
                {report.log.length === 1 ? 'event' : 'events'})
              </span>
              <span aria-hidden="true">{eventLogOpen ? '▼' : '▶'}</span>
            </button>
            {eventLogOpen ? (
              <div
                className="mt-2 max-h-[400px] overflow-y-auto rounded-lg border border-gray-700 bg-gray-900 p-4 font-mono text-xs"
                data-testid="match-report-log"
              >
                <ul className="space-y-1 text-gray-300">
                  {report.log.map((event) => (
                    <li
                      key={event.id}
                      data-testid={`match-report-log-${event.id}`}
                    >
                      <span className="text-gray-500">
                        T{event.turn}/{event.phase}
                      </span>{' '}
                      <span className="text-amber-300">{event.type}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>

          {/* Footer */}
          <div className="mt-10 flex items-center justify-center">
            <Link
              href="/gameplay/encounters"
              className="inline-flex min-h-[44px] items-center rounded-lg bg-blue-600 px-6 py-3 text-base font-medium text-white hover:bg-blue-700"
              data-testid="match-report-back"
            >
              Back to Encounter Hub
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
