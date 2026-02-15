import { useCallback, useEffect, useState } from 'react';

import type { DayReport } from '@/lib/campaign/dayAdvancement';

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
