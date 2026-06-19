/**
 * Post-Battle Match Report Viewer
 *
 * Renders a stored IPostBattleReport fetched via GET /api/matches/[id].
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

interface FetchState {
  readonly status: 'loading' | 'ok' | 'error';
  readonly report?: IPostBattleReport;
  readonly errorMessage?: string;
}

function MatchReportLoading(): React.ReactElement {
  return (
    <div
      className="flex h-screen items-center justify-center bg-gray-900"
      data-testid="match-report-loading"
    >
      <p className="text-gray-400">Loading post-battle report...</p>
    </div>
  );
}

function MatchReportError({
  message,
}: {
  readonly message?: string;
}): React.ReactElement {
  return (
    <div
      className="flex h-screen flex-col items-center justify-center gap-4 bg-gray-900 px-6 text-center"
      data-testid="match-report-error"
    >
      <h2 className="text-xl font-semibold text-white">
        Could not load match report
      </h2>
      <p className="text-sm text-gray-400">{message ?? 'unknown error'}</p>
      <Link
        href="/gameplay/encounters"
        className="inline-flex min-h-[44px] items-center rounded-lg bg-blue-600 px-5 py-3 text-sm font-medium text-white hover:bg-blue-700"
      >
        Back to Encounter Hub
      </Link>
    </div>
  );
}

function matchOutcome(report: IPostBattleReport): {
  readonly label: string;
  readonly color: string;
} {
  if (report.winner === 'draw') {
    return { label: 'DRAW', color: 'text-gray-300' };
  }

  if (report.winner === 'player') {
    return { label: 'VICTORY', color: 'text-emerald-400' };
  }

  return { label: 'DEFEAT', color: 'text-red-500' };
}

function MatchReportHeader({
  report,
}: {
  readonly report: IPostBattleReport;
}): React.ReactElement {
  const outcome = matchOutcome(report);

  return (
    <div className="mb-8 text-center">
      <h1
        className={`text-5xl font-black tracking-tight ${outcome.color}`}
        data-testid="match-report-outcome"
        data-outcome={report.winner}
      >
        {outcome.label}
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
        {report.turnCount} {report.turnCount === 1 ? 'turn' : 'turns'} played
      </p>
    </div>
  );
}

function MvpSection({
  report,
}: {
  readonly report: IPostBattleReport;
}): React.ReactElement | null {
  if (!report.mvpUnitId) return null;

  return (
    <div className="mb-8">
      <MvpDisplay report={report} />
    </div>
  );
}

function UnitSummaryTable({
  report,
  mvpIds,
}: {
  readonly report: IPostBattleReport;
  readonly mvpIds: ReadonlySet<string>;
}): React.ReactElement {
  return (
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
                <td className="px-4 py-3 font-medium">{unit.designation}</td>
                <td className="px-4 py-3 capitalize">{unit.side}</td>
                <td className="px-4 py-3 text-right">{unit.damageDealt}</td>
                <td className="px-4 py-3 text-right">{unit.damageReceived}</td>
                <td className="px-4 py-3 text-right">{unit.kills}</td>
                <td className="px-4 py-3 text-right">{unit.heatProblems}</td>
                <td className="px-4 py-3 text-right">{unit.physicalAttacks}</td>
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
  );
}

function EventLogSection({
  report,
  eventLogOpen,
  onToggle,
}: {
  readonly report: IPostBattleReport;
  readonly eventLogOpen: boolean;
  readonly onToggle: () => void;
}): React.ReactElement {
  return (
    <div className="mt-6">
      <button
        type="button"
        onClick={onToggle}
        className="hover:bg-gray-750 flex w-full items-center justify-between rounded-lg border border-gray-700 bg-gray-800 px-4 py-3 text-left text-sm font-medium text-gray-200"
        data-testid="match-report-log-toggle"
        aria-expanded={eventLogOpen}
      >
        <span>
          Event Log ({report.log.length}{' '}
          {report.log.length === 1 ? 'event' : 'events'})
        </span>
        <span aria-hidden="true">{eventLogOpen ? 'v' : '>'}</span>
      </button>
      {eventLogOpen ? (
        <div
          className="mt-2 max-h-[400px] overflow-y-auto rounded-lg border border-gray-700 bg-gray-900 p-4 font-mono text-xs"
          data-testid="match-report-log"
        >
          <ul className="space-y-1 text-gray-300">
            {report.log.map((event) => (
              <li key={event.id} data-testid={`match-report-log-${event.id}`}>
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
  );
}

function MatchReportFooter(): React.ReactElement {
  return (
    <div className="mt-10 flex items-center justify-center">
      <Link
        href="/gameplay/encounters"
        className="inline-flex min-h-[44px] items-center rounded-lg bg-blue-600 px-6 py-3 text-base font-medium text-white hover:bg-blue-700"
        data-testid="match-report-back"
      >
        Back to Encounter Hub
      </Link>
    </div>
  );
}

export default function MatchReportPage(): React.ReactElement {
  const router = useRouter();
  const { id } = router.query;
  const matchId = typeof id === 'string' ? id : '';

  const [state, setState] = useState<FetchState>({ status: 'loading' });
  const [eventLogOpen, setEventLogOpen] = useState(false);

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

  const mvpIds = useMemo(() => {
    if (!state.report?.mvpUnitId) return new Set<string>();
    return new Set([state.report.mvpUnitId]);
  }, [state.report?.mvpUnitId]);

  if (state.status === 'loading') {
    return <MatchReportLoading />;
  }

  if (state.status === 'error' || !state.report) {
    return <MatchReportError message={state.errorMessage} />;
  }

  const report = state.report;

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
          <MatchReportHeader report={report} />
          <MvpSection report={report} />
          <UnitSummaryTable report={report} mvpIds={mvpIds} />
          <EventLogSection
            report={report}
            eventLogOpen={eventLogOpen}
            onToggle={() => setEventLogOpen((open) => !open)}
          />
          <MatchReportFooter />
        </div>
      </div>
    </>
  );
}
