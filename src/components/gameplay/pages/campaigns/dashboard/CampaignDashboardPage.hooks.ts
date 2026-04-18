import { useCallback, useEffect, useState } from 'react';

import type { DayReport } from '@/lib/campaign/dayAdvancement';
import type { ICombatOutcome } from '@/types/combat/CombatOutcome';

import { useCampaignStore } from '@/stores/campaign/useCampaignStore';

interface UseCampaignDayReportsOptions {
  dayReportNotificationsEnabled: boolean | undefined;
  onAdvanceDay: () => DayReport | null;
  onAdvanceDays: (days: number) => DayReport[] | null;
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

  const handleAdvanceDay = useCallback(() => {
    const report = onAdvanceDay();
    if (report && dayReportNotificationsEnabled) {
      setDayReports([report]);
    }
  }, [dayReportNotificationsEnabled, onAdvanceDay]);

  const handleAdvanceWeek = useCallback(() => {
    const reports = onAdvanceDays(7);
    if (reports && dayReportNotificationsEnabled) {
      setDayReports(reports);
    }
  }, [dayReportNotificationsEnabled, onAdvanceDays]);

  const handleAdvanceMonth = useCallback(() => {
    const reports = onAdvanceDays(30);
    if (reports && dayReportNotificationsEnabled) {
      setDayReports(reports);
    }
  }, [dayReportNotificationsEnabled, onAdvanceDays]);

  return {
    dayReports,
    setDayReports,
    handleAdvanceDay,
    handleAdvanceWeek,
    handleAdvanceMonth,
  };
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
