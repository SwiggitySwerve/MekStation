import React from 'react';

import type { IFilterDefinition } from '@/components/simulation-viewer/types';
import type { IAnomaly } from '@/types/simulation-viewer';
import type { IViolation } from '@/types/simulation-viewer/IViolation';

import { AnomalyAlertCard } from '@/components/simulation-viewer/AnomalyAlertCard';
import { FilterPanel } from '@/components/simulation-viewer/FilterPanel';
import { VirtualizedViolationLog } from '@/components/simulation-viewer/VirtualizedViolationLog';
import { FOCUS_RING_CLASSES } from '@/utils/accessibility';

import type {
  IInvariant,
  IPageAnomaly,
  IThresholds,
} from './AnalysisBugs.types';

import {
  InvariantCard,
  ThresholdSlider,
  ToggleSwitch,
} from './AnalysisBugs.cards';
import {
  DETECTOR_DESCRIPTIONS,
  DETECTOR_LABELS,
} from './AnalysisBugs.constants';
import { mapToCardAnomaly } from './AnalysisBugs.utils';
import { ViewerSection } from './SectionFrame';

interface InvariantStatusSectionProps {
  invariants: IInvariant[];
  onViewInvariant?: (invariantId: string) => void;
}

export const InvariantStatusSection: React.FC<InvariantStatusSectionProps> = ({
  invariants,
  onViewInvariant,
}) => (
  <ViewerSection
    ariaLabel="Invariant status"
    headingTestId="invariant-heading"
    testId="invariant-section"
    title="Invariant Status"
  >
    {invariants.length === 0 ? (
      <p
        className="text-sm text-gray-500 italic dark:text-gray-400"
        data-testid="invariant-empty"
      >
        No invariants configured.
      </p>
    ) : (
      <div
        className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4"
        data-testid="invariant-grid"
      >
        {invariants.map((invariant) => (
          <InvariantCard
            key={invariant.id}
            invariant={invariant}
            onClick={onViewInvariant}
          />
        ))}
      </div>
    )}
  </ViewerSection>
);

interface AnomalyAlertsSectionProps {
  anomalies: IPageAnomaly[];
  visibleAnomalies: IPageAnomaly[];
  showDismissed: boolean;
  onToggleDismissed: () => void;
  onDismissAnomaly?: (anomalyId: string) => void;
  onViewSnapshot?: (snapshotId: string) => void;
  onViewBattle?: (battleId: string) => void;
  onConfigureThreshold?: (detector: string) => void;
}

export const AnomalyAlertsSection: React.FC<AnomalyAlertsSectionProps> = ({
  anomalies,
  visibleAnomalies,
  showDismissed,
  onToggleDismissed,
  onDismissAnomaly,
  onViewSnapshot,
  onViewBattle,
  onConfigureThreshold,
}) => {
  const handleViewSnapshot = (anomaly: IAnomaly) => {
    const pageAnomaly = anomalies.find((item) => item.id === anomaly.id);
    if (pageAnomaly) {
      onViewSnapshot?.(pageAnomaly.snapshotId);
    }
  };

  const dismissedToggle = anomalies.some((anomaly) => anomaly.dismissed) ? (
    <button
      type="button"
      onClick={onToggleDismissed}
      className={`min-h-[44px] rounded-md px-3 py-2 text-sm text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900 md:min-h-0 md:py-1 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200 ${FOCUS_RING_CLASSES}`}
      data-testid="toggle-dismissed"
      aria-pressed={showDismissed}
    >
      {showDismissed ? 'Hide Dismissed' : 'Show Dismissed'}
    </button>
  ) : null;

  return (
    <ViewerSection
      ariaLabel="Anomaly alerts"
      count={anomalies.length > 0 ? visibleAnomalies.length : undefined}
      headerAction={dismissedToggle}
      headingTestId="anomaly-heading"
      testId="anomaly-section"
      title="Anomaly Alerts"
    >
      {visibleAnomalies.length === 0 ? (
        <p
          className="text-sm text-gray-500 italic dark:text-gray-400"
          data-testid="anomaly-empty"
        >
          No anomalies detected.
        </p>
      ) : (
        <div
          className="overflow-x-auto pb-2"
          data-testid="anomaly-scroll-container"
        >
          <div className="flex min-w-max gap-4">
            {visibleAnomalies.map((anomaly) => (
              <div
                key={anomaly.id}
                className="w-80 flex-shrink-0"
                data-testid={`anomaly-card-wrapper-${anomaly.id}`}
              >
                <AnomalyAlertCard
                  anomaly={mapToCardAnomaly(anomaly)}
                  onViewSnapshot={
                    onViewSnapshot ? handleViewSnapshot : undefined
                  }
                  onViewBattle={onViewBattle}
                  onConfigureThreshold={onConfigureThreshold}
                  onDismiss={onDismissAnomaly}
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </ViewerSection>
  );
};

interface ViolationLogSectionProps {
  violationFilters: IFilterDefinition[];
  activeFilters: Record<string, string[]>;
  onFilterChange: (filters: Record<string, string[]>) => void;
  filteredViolations: IViolation[];
  onViewBattle?: (battleId: string) => void;
}

export const ViolationLogSection: React.FC<ViolationLogSectionProps> = ({
  violationFilters,
  activeFilters,
  onFilterChange,
  filteredViolations,
  onViewBattle,
}) => (
  <ViewerSection
    ariaLabel="Violation log"
    className="lg:col-span-3"
    count={
      filteredViolations.length > 0 ? filteredViolations.length : undefined
    }
    headingTestId="violation-heading"
    testId="violation-section"
    title="Violation Log"
  >
    <FilterPanel
      filters={violationFilters}
      activeFilters={activeFilters}
      onFilterChange={onFilterChange}
      className="mb-4"
    />

    <VirtualizedViolationLog
      violations={filteredViolations}
      height={480}
      itemHeight={56}
      onViewBattle={onViewBattle}
    />
  </ViewerSection>
);

interface ThresholdConfigurationSectionProps {
  localThresholds: IThresholds;
  affectedAnomalyCounts: Record<string, number>;
  onSliderChange: (detector: string, value: number) => void;
  onResetThresholds: () => void;
  onSaveThresholds: () => void;
  autoSnapshotCritical: boolean;
  autoSnapshotWarning: boolean;
  autoSnapshotInfo: boolean;
  setAutoSnapshotCritical: (checked: boolean) => void;
  setAutoSnapshotWarning: (checked: boolean) => void;
  setAutoSnapshotInfo: (checked: boolean) => void;
}

export const ThresholdConfigurationSection: React.FC<
  ThresholdConfigurationSectionProps
> = ({
  localThresholds,
  affectedAnomalyCounts,
  onSliderChange,
  onResetThresholds,
  onSaveThresholds,
  autoSnapshotCritical,
  autoSnapshotWarning,
  autoSnapshotInfo,
  setAutoSnapshotCritical,
  setAutoSnapshotWarning,
  setAutoSnapshotInfo,
}) => (
  <ViewerSection
    ariaLabel="Threshold configuration"
    className="lg:col-span-2"
    headingTestId="threshold-heading"
    testId="threshold-section"
    title="Threshold Configuration"
  >
    <div className="space-y-5 rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
      {(Object.keys(DETECTOR_LABELS) as Array<keyof IThresholds>).map(
        (detectorKey) => (
          <ThresholdSlider
            key={detectorKey}
            detectorKey={detectorKey}
            label={DETECTOR_LABELS[detectorKey]}
            description={DETECTOR_DESCRIPTIONS[detectorKey]}
            value={localThresholds[detectorKey]}
            affectedCount={affectedAnomalyCounts[detectorKey] ?? 0}
            onChange={onSliderChange}
          />
        ),
      )}

      <div
        className="flex gap-3 border-t border-gray-200 pt-2 dark:border-gray-700"
        data-testid="threshold-actions"
      >
        <button
          type="button"
          onClick={onResetThresholds}
          className={`min-h-[44px] rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-100 md:min-h-0 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700 ${FOCUS_RING_CLASSES}`}
          data-testid="threshold-reset"
        >
          Reset to Defaults
        </button>
        <button
          type="button"
          onClick={onSaveThresholds}
          className={`min-h-[44px] rounded-md bg-blue-600 px-4 py-2 text-sm text-white transition-colors hover:bg-blue-700 md:min-h-0 dark:bg-blue-500 dark:hover:bg-blue-600 ${FOCUS_RING_CLASSES}`}
          data-testid="threshold-save"
        >
          Save Thresholds
        </button>
      </div>

      <div
        className="border-t border-gray-200 pt-4 dark:border-gray-700"
        data-testid="auto-snapshot-config"
      >
        <h3 className="mb-3 text-sm font-semibold tracking-wide text-gray-700 uppercase dark:text-gray-300">
          Auto-Snapshot
        </h3>
        <div className="space-y-2">
          <ToggleSwitch
            id="auto-snapshot-critical"
            label="Critical anomalies"
            checked={autoSnapshotCritical}
            onChange={setAutoSnapshotCritical}
          />
          <ToggleSwitch
            id="auto-snapshot-warning"
            label="Warning anomalies"
            checked={autoSnapshotWarning}
            onChange={setAutoSnapshotWarning}
          />
          <ToggleSwitch
            id="auto-snapshot-info"
            label="Info anomalies"
            checked={autoSnapshotInfo}
            onChange={setAutoSnapshotInfo}
          />
        </div>
      </div>
    </div>
  </ViewerSection>
);
