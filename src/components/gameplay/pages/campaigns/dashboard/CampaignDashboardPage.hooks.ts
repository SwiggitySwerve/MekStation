import { useCallback, useEffect, useState } from 'react';

import type { DayReport } from '@/lib/campaign/dayAdvancement';
import type { MaybePromise } from '@/stores/campaign/useCampaignStore.types';
import type { IDailyBattleAuditEntry } from '@/types/campaign/IDailyBattleAuditEntry';
import type { ICombatOutcome } from '@/types/combat/CombatOutcome';

import { useCampaignStore } from '@/stores/campaign/useCampaignStore';

interface UseCampaignDayReportsOptions {
  dayReportNotificationsEnabled: boolean | undefined;
  onAdvanceDay: () => MaybePromise<DayReport | null>;
  onAdvanceDays: (days: number) => MaybePromise<DayReport[] | null>;
}

interface UseCampaignDayReportsResult {
  dayReports: DayReport[];
  setDayReports: (reports: DayReport[]) => void;
  handleAdvanceDay: () => void;
  handleAdvanceWeek: () => void;
  handleAdvanceMonth: () => void;
}

export function useClientReady(): boolean {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  return isClient;
}

export function useCampaignDayReports({
  dayReportNotificationsEnabled,
  onAdvanceDay,
  onAdvanceDays,
}: UseCampaignDayReportsOptions): UseCampaignDayReportsResult {
  const [dayReports, setDayReports] = useState<DayReport[]>([]);

  const showReports = useCallback(
    (reports: DayReport[] | null) => {
      if (reports && dayReportNotificationsEnabled) {
        setDayReports(reports);
      }
    },
    [dayReportNotificationsEnabled],
  );

  const handleAdvanceDay = useCallback(() => {
    const report = onAdvanceDay();
    if (isPromiseLike(report)) {
      void report.then((resolved) => showReports(resolved ? [resolved] : null));
      return;
    }
    showReports(report ? [report] : null);
  }, [onAdvanceDay, showReports]);

  const handleAdvanceWeek = useCallback(() => {
    const reports = onAdvanceDays(7);
    if (isPromiseLike(reports)) {
      void reports.then(showReports);
      return;
    }
    showReports(reports);
  }, [onAdvanceDays, showReports]);

  const handleAdvanceMonth = useCallback(() => {
    const reports = onAdvanceDays(30);
    if (isPromiseLike(reports)) {
      void reports.then(showReports);
      return;
    }
    showReports(reports);
  }, [onAdvanceDays, showReports]);

  return {
    dayReports,
    setDayReports,
    handleAdvanceDay,
    handleAdvanceWeek,
    handleAdvanceMonth,
  };
}

function isPromiseLike<T>(value: MaybePromise<T>): value is Promise<T> {
  return (
    typeof value === 'object' &&
    value !== null &&
    'then' in value &&
    typeof (value as { then?: unknown }).then === 'function'
  );
}

/**
 * Per `wire-encounter-to-campaign-round-trip` Wave 5: live snapshot of
 * `useCampaignStore.pendingBattleOutcomes` for the dashboard banner.
 *
 * Zustand stores already trigger React re-renders on `subscribe`. We
 * mirror the pending queue into local React state so the banner
 * re-renders when the engine bus → campaign store path enqueues a new
 * outcome, even if no other prop on the dashboard changed.
 */
export function usePendingOutcomes(): readonly ICombatOutcome[] {
  const store = useCampaignStore();
  const [outcomes, setOutcomes] = useState<readonly ICombatOutcome[]>(() =>
    store.getState().getPendingOutcomes(),
  );

  useEffect(() => {
    // Subscribe to the slice we care about. The default subscribe fires
    // on every state change; a small equality check on length + first
    // matchId keeps the banner from re-rendering when only unrelated
    // campaign fields change.
    return store.subscribe((next) => {
      setOutcomes((prev) => {
        const a = prev;
        const b = next.pendingBattleOutcomes;
        if (a.length === b.length) {
          let same = true;
          for (let i = 0; i < a.length; i++) {
            if (a[i].matchId !== b[i].matchId) {
              same = false;
              break;
            }
          }
          if (same) return prev;
        }
        return [...b];
      });
    });
  }, [store]);

  return outcomes;
}

/**
 * Per `wire-encounter-to-campaign-round-trip` Wave 5 §7.3: live snapshot
 * of the campaign's `dailyBattleAudit` ledger for the dashboard audit
 * feed. Mirrors the same subscribe + cheap-equality pattern as
 * `usePendingOutcomes` so the audit feed re-renders only when the
 * ledger length changes.
 */
export function useDailyBattleAudit(): readonly IDailyBattleAuditEntry[] {
  const store = useCampaignStore();
  const readLedger = useCallback((): readonly IDailyBattleAuditEntry[] => {
    const campaign = store.getState().campaign as
      | (ReturnType<typeof store.getState>['campaign'] & {
          dailyBattleAudit?: readonly IDailyBattleAuditEntry[];
        })
      | null;
    return campaign?.dailyBattleAudit ?? [];
  }, [store]);

  const [entries, setEntries] = useState<readonly IDailyBattleAuditEntry[]>(
    () => readLedger(),
  );

  useEffect(() => {
    return store.subscribe(() => {
      const next = readLedger();
      setEntries((prev) => {
        if (prev === next) return prev;
        if (prev.length === next.length) {
          // Cheap equality: same length AND same last-entry date avoids a
          // re-render when an unrelated campaign field churns.
          const lastA = prev[prev.length - 1]?.date;
          const lastB = next[next.length - 1]?.date;
          if (lastA === lastB) return prev;
        }
        return next;
      });
    });
  }, [store, readLedger]);

  return entries;
}

/**
 * Per `wire-encounter-to-campaign-round-trip` Wave 5 §11.2: live
 * snapshot of the campaign store's `outcomeApplyErrors` map. Drives the
 * banner's "N outcome(s) failed to apply" sub-line.
 */
export function useOutcomeApplyErrors(): Readonly<Record<string, string>> {
  const store = useCampaignStore();
  const [errors, setErrors] = useState<Readonly<Record<string, string>>>(
    () => store.getState().outcomeApplyErrors,
  );
  useEffect(() => {
    return store.subscribe((next) => {
      setErrors((prev) => {
        const a = prev;
        const b = next.outcomeApplyErrors;
        // Reference equality first; fall back to keys-length + key match.
        if (a === b) return prev;
        const aKeys = Object.keys(a);
        const bKeys = Object.keys(b);
        if (aKeys.length === bKeys.length) {
          let same = true;
          for (const k of aKeys) {
            if (a[k] !== b[k]) {
              same = false;
              break;
            }
          }
          if (same) return prev;
        }
        return { ...b };
      });
    });
  }, [store]);
  return errors;
}
