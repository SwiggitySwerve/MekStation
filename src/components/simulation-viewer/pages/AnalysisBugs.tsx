import React, { useCallback, useMemo, useState } from 'react';

import type { IViolation } from '@/types/simulation-viewer/IViolation';

import { announce } from '@/utils/accessibility';

import type {
  IAnalysisBugsProps,
  IInvariant,
  IPageAnomaly,
  IThresholds,
  SortDirection,
  ViolationSortKey,
} from './AnalysisBugs.types';

import { DEFAULT_THRESHOLDS, SEVERITY_ORDER } from './AnalysisBugs.constants';
import {
  AnomalyAlertsSection,
  InvariantStatusSection,
  ThresholdConfigurationSection,
  ViolationLogSection,
} from './AnalysisBugs.sections';
import {
  buildViolationFilters,
  formatTimestamp,
  getThresholdKeyForDetector,
} from './AnalysisBugs.utils';

export type {
  IAnalysisBugsProps,
  IInvariant,
  IPageAnomaly,
  IThresholds,
  IViolation,
};
export { formatTimestamp };

export const AnalysisBugs: React.FC<IAnalysisBugsProps> = ({
  campaignId,
  invariants,
  anomalies,
  violations,
  thresholds,
  onThresholdChange,
  onDismissAnomaly,
  onViewSnapshot,
  onViewBattle,
  onConfigureThreshold,
  onViewInvariant,
}) => {
  const [showDismissed, setShowDismissed] = useState(false);
  const [activeFilters, setActiveFilters] = useState<Record<string, string[]>>(
    {},
  );
  const [violationSort] = useState<{
    key: ViolationSortKey;
    direction: SortDirection;
  }>({ key: 'timestamp', direction: 'desc' });
  const [localThresholds, setLocalThresholds] =
    useState<IThresholds>(thresholds);
  const [autoSnapshotCritical, setAutoSnapshotCritical] = useState(true);
  const [autoSnapshotWarning, setAutoSnapshotWarning] = useState(false);
  const [autoSnapshotInfo, setAutoSnapshotInfo] = useState(false);

  const visibleAnomalies = useMemo(() => {
    if (showDismissed) {
      return anomalies;
    }
    return anomalies.filter((anomaly) => !anomaly.dismissed);
  }, [anomalies, showDismissed]);

  const violationFilters = useMemo(
    () => buildViolationFilters(violations),
    [violations],
  );

  const filteredViolations = useMemo(() => {
    let result = [...violations];

    const severityFilter = activeFilters['severity'];
    if (severityFilter && severityFilter.length > 0) {
      result = result.filter((violation) =>
        severityFilter.includes(violation.severity),
      );
    }

    const typeFilter = activeFilters['type'];
    if (typeFilter && typeFilter.length > 0) {
      result = result.filter((violation) =>
        typeFilter.includes(violation.type),
      );
    }

    const battleFilter = activeFilters['battle'];
    if (battleFilter && battleFilter.length > 0) {
      result = result.filter((violation) =>
        battleFilter.includes(violation.battleId),
      );
    }

    result.sort((a, b) => {
      if (violationSort.key === 'severity') {
        const diff = SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity];
        return violationSort.direction === 'asc' ? diff : -diff;
      }

      const diff =
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
      return violationSort.direction === 'asc' ? diff : -diff;
    });

    return result;
  }, [violations, activeFilters, violationSort]);

  const affectedAnomalyCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const key of Object.keys(localThresholds)) {
      counts[key] = 0;
    }

    for (const anomaly of anomalies) {
      const thresholdKey = getThresholdKeyForDetector(anomaly.detector);
      counts[thresholdKey] = (counts[thresholdKey] || 0) + 1;
    }

    return counts;
  }, [anomalies, localThresholds]);

  const handleFilterChange = useCallback(
    (filters: Record<string, string[]>) => {
      setActiveFilters(filters);
    },
    [],
  );

  const handleSliderChange = useCallback((detector: string, value: number) => {
    setLocalThresholds((previous) => ({ ...previous, [detector]: value }));
  }, []);

  const handleResetThresholds = useCallback(() => {
    setLocalThresholds(DEFAULT_THRESHOLDS);
    announce('Thresholds reset to defaults');
  }, []);

  const handleSaveThresholds = useCallback(() => {
    if (!onThresholdChange) {
      return;
    }
    for (const [key, value] of Object.entries(localThresholds)) {
      onThresholdChange(key, value);
    }
    announce('Thresholds saved');
  }, [localThresholds, onThresholdChange]);

  return (
    <main
      className="min-h-screen bg-gray-50 p-4 md:p-6 lg:p-8 dark:bg-gray-900"
      data-testid="analysis-bugs-page"
      data-campaign-id={campaignId}
    >
      <h1
        className="mb-6 text-2xl font-bold text-gray-900 md:text-3xl dark:text-gray-100"
        data-testid="page-title"
      >
        Analysis & Bugs
      </h1>

      <div className="space-y-6">
        <InvariantStatusSection
          invariants={invariants}
          onViewInvariant={onViewInvariant}
        />
        <AnomalyAlertsSection
          anomalies={anomalies}
          visibleAnomalies={visibleAnomalies}
          showDismissed={showDismissed}
          onToggleDismissed={() => setShowDismissed((previous) => !previous)}
          onDismissAnomaly={onDismissAnomaly}
          onViewSnapshot={onViewSnapshot}
          onViewBattle={onViewBattle}
          onConfigureThreshold={onConfigureThreshold}
        />

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
          <ViolationLogSection
            violationFilters={violationFilters}
            activeFilters={activeFilters}
            onFilterChange={handleFilterChange}
            filteredViolations={filteredViolations}
            onViewBattle={onViewBattle}
          />
          <ThresholdConfigurationSection
            localThresholds={localThresholds}
            affectedAnomalyCounts={affectedAnomalyCounts}
            onSliderChange={handleSliderChange}
            onResetThresholds={handleResetThresholds}
            onSaveThresholds={handleSaveThresholds}
            autoSnapshotCritical={autoSnapshotCritical}
            autoSnapshotWarning={autoSnapshotWarning}
            autoSnapshotInfo={autoSnapshotInfo}
            setAutoSnapshotCritical={setAutoSnapshotCritical}
            setAutoSnapshotWarning={setAutoSnapshotWarning}
            setAutoSnapshotInfo={setAutoSnapshotInfo}
          />
        </div>
      </div>
    </main>
  );
};

export default AnalysisBugs;
