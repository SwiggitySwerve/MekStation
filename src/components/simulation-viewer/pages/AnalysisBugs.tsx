import React, { useState, useCallback, useMemo } from 'react';

import type { IFilterDefinition } from '@/components/simulation-viewer/types';
import type { IAnomaly } from '@/types/simulation-viewer';

import { AnomalyAlertCard } from '@/components/simulation-viewer/AnomalyAlertCard';
import { FilterPanel } from '@/components/simulation-viewer/FilterPanel';
import { VirtualizedViolationLog } from '@/components/simulation-viewer/VirtualizedViolationLog';
import { FOCUS_RING_CLASSES, announce } from '@/utils/accessibility';

/* ========================================================================== */
/*  Types                                                                      */
/* ========================================================================== */

/** Status of an invariant check — pass or fail */
type InvariantStatus = 'pass' | 'fail';

/** Severity level for anomalies and violations */
type Severity = 'critical' | 'warning' | 'info';

/** Detector type identifiers matching Wave 3 detectors */
type DetectorType =
  | 'heat-suicide'
  | 'passive-unit'
  | 'no-progress'
  | 'long-game'
  | 'state-cycle';

/** Sort direction for table columns */
type SortDirection = 'asc' | 'desc';

/** Sortable columns in the violation log */
type ViolationSortKey = 'severity' | 'timestamp';

/**
 * Represents a single invariant check result.
 */
export interface IInvariant {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly status: InvariantStatus;
  readonly lastChecked: string;
  readonly failureCount: number;
}

/**
 * Represents a detected anomaly from a Wave 3 detector.
 */
export interface IPageAnomaly {
  readonly id: string;
  readonly detector: DetectorType;
  readonly severity: Severity;
  readonly title: string;
  readonly description: string;
  readonly battleId: string;
  readonly snapshotId: string;
  readonly timestamp: string;
  readonly dismissed: boolean;
}

/**
 * Represents a violation entry in the log.
 */
export interface IViolation {
  readonly id: string;
  readonly type: string;
  readonly severity: Severity;
  readonly message: string;
  readonly battleId: string;
  readonly timestamp: string;
}

/**
 * Threshold configuration for all five Wave 3 detectors.
 * Each value represents a sensitivity percentage (0–100).
 */
export interface IThresholds {
  readonly heatSuicide: number;
  readonly passiveUnit: number;
  readonly noProgress: number;
  readonly longGame: number;
  readonly stateCycle: number;
}

/**
 * Props for the Analysis & Bugs page component.
 *
 * @example
 * ```tsx
 * <AnalysisBugs
 *   campaignId="campaign-001"
 *   invariants={invariantData}
 *   anomalies={anomalyData}
 *   violations={violationData}
 *   thresholds={thresholdData}
 *   onThresholdChange={(detector, value) => updateThreshold(detector, value)}
 * />
 * ```
 */
export interface IAnalysisBugsProps {
  /** Campaign identifier */
  readonly campaignId: string;
  /** Array of invariant check results */
  readonly invariants: IInvariant[];
  /** Array of detected anomalies */
  readonly anomalies: IPageAnomaly[];
  /** Array of violation log entries */
  readonly violations: IViolation[];
  /** Current threshold configuration */
  readonly thresholds: IThresholds;
  /** Callback when a threshold slider is changed */
  readonly onThresholdChange?: (detector: string, value: number) => void;
  /** Callback when an anomaly is dismissed */
  readonly onDismissAnomaly?: (anomalyId: string) => void;
  /** Callback to view a snapshot */
  readonly onViewSnapshot?: (snapshotId: string) => void;
  /** Callback to view a battle */
  readonly onViewBattle?: (battleId: string) => void;
  /** Callback to configure a detector threshold */
  readonly onConfigureThreshold?: (detector: string) => void;
  /** Callback when an invariant card is clicked */
  readonly onViewInvariant?: (invariantId: string) => void;
}

/* ========================================================================== */
/*  Constants                                                                  */
/* ========================================================================== */

const SEVERITY_ORDER: Record<Severity, number> = {
  critical: 2,
  warning: 1,
  info: 0,
};

const INVARIANT_STATUS_CLASSES: Record<InvariantStatus, string> = {
  pass: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
  fail: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
};

const DEFAULT_THRESHOLDS: IThresholds = {
  heatSuicide: 80,
  passiveUnit: 60,
  noProgress: 70,
  longGame: 90,
  stateCycle: 75,
};

const DETECTOR_LABELS: Record<string, string> = {
  heatSuicide: 'Heat Suicide',
  passiveUnit: 'Passive Unit',
  noProgress: 'No Progress',
  longGame: 'Long Game',
  stateCycle: 'State Cycle',
};

const DETECTOR_DESCRIPTIONS: Record<string, string> = {
  heatSuicide: 'Threshold for heat suicide detection',
  passiveUnit: 'Threshold for passive unit detection',
  noProgress: 'Threshold for no progress detection',
  longGame: 'Threshold for long game detection',
  stateCycle: 'Threshold for state cycle detection',
};

/* ========================================================================== */
/*  Utility functions                                                          */
/* ========================================================================== */

/**
 * Format an ISO timestamp into a human-readable date-time string.
 */
export function formatTimestamp(iso: string): string {
  try {
    const date = new Date(iso);
    if (isNaN(date.getTime())) return iso;
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

/**
 * Map a page-level anomaly to the IAnomaly shape expected by AnomalyAlertCard.
 */
function mapToCardAnomaly(anomaly: IPageAnomaly): IAnomaly {
  return {
    id: anomaly.id,
    type: anomaly.detector,
    severity: anomaly.severity,
    battleId: anomaly.battleId,
    turn: null,
    unitId: null,
    message: anomaly.description,
    configKey:
      anomaly.detector === 'heat-suicide'
        ? 'heatSuicideThreshold'
        : anomaly.detector === 'passive-unit'
          ? 'passiveUnitThreshold'
          : anomaly.detector === 'no-progress'
            ? 'noProgressThreshold'
            : anomaly.detector === 'long-game'
              ? 'longGameThreshold'
              : 'stateCycleThreshold',
    timestamp: Date.parse(anomaly.timestamp) || Date.now(),
  };
}

/**
 * Build the filter definitions for the violation log.
 */
function buildViolationFilters(violations: IViolation[]): IFilterDefinition[] {
  const types = Array.from(new Set(violations.map((v) => v.type))).sort();
  const battles = Array.from(new Set(violations.map((v) => v.battleId))).sort();

  return [
    {
      id: 'severity',
      label: 'Severity',
      options: ['critical', 'warning', 'info'],
      optionLabels: { critical: 'Critical', warning: 'Warning', info: 'Info' },
    },
    {
      id: 'type',
      label: 'Type',
      options: types,
    },
    {
      id: 'battle',
      label: 'Battle',
      options: battles,
    },
  ];
}

/* ========================================================================== */
/*  Component                                                                  */
/* ========================================================================== */

/**
 * Analysis & Bugs page — invariant status, anomaly cards, violation log,
 * and threshold configuration for the simulation viewer.
 *
 * Renders four sections:
 * 1. Invariant Status — grid of 12 invariant check cards
 * 2. Anomaly Cards — horizontal scrollable AnomalyAlertCard list
 * 3. Violation Log — filterable, sortable table with pagination
 * 4. Threshold Configuration — 5 detector sliders + auto-snapshot toggles
 */
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
  /* ---- state ---- */
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

  /* ---- derived data ---- */
  const visibleAnomalies = useMemo(() => {
    if (showDismissed) return anomalies;
    return anomalies.filter((a) => !a.dismissed);
  }, [anomalies, showDismissed]);

  const violationFilters = useMemo(
    () => buildViolationFilters(violations),
    [violations],
  );

  const filteredViolations = useMemo(() => {
    let result = [...violations];

    const severityFilter = activeFilters['severity'];
    if (severityFilter && severityFilter.length > 0) {
      result = result.filter((v) => severityFilter.includes(v.severity));
    }

    const typeFilter = activeFilters['type'];
    if (typeFilter && typeFilter.length > 0) {
      result = result.filter((v) => typeFilter.includes(v.type));
    }

    const battleFilter = activeFilters['battle'];
    if (battleFilter && battleFilter.length > 0) {
      result = result.filter((v) => battleFilter.includes(v.battleId));
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
    const detectorMap: Record<string, keyof IThresholds> = {
      'heat-suicide': 'heatSuicide',
      'passive-unit': 'passiveUnit',
      'no-progress': 'noProgress',
      'long-game': 'longGame',
      'state-cycle': 'stateCycle',
    };

    for (const key of Object.keys(localThresholds)) {
      counts[key] = 0;
    }

    for (const anomaly of anomalies) {
      const thresholdKey = detectorMap[anomaly.detector];
      if (thresholdKey) {
        counts[thresholdKey] = (counts[thresholdKey] || 0) + 1;
      }
    }

    return counts;
  }, [anomalies, localThresholds]);

  /* ---- handlers ---- */
  const handleFilterChange = useCallback(
    (filters: Record<string, string[]>) => {
      setActiveFilters(filters);
    },
    [],
  );

  const handleSliderChange = useCallback((detector: string, value: number) => {
    setLocalThresholds((prev) => ({ ...prev, [detector]: value }));
  }, []);

  const handleResetThresholds = useCallback(() => {
    setLocalThresholds(DEFAULT_THRESHOLDS);
    announce('Thresholds reset to defaults');
  }, []);

  const handleSaveThresholds = useCallback(() => {
    if (!onThresholdChange) return;
    for (const [key, value] of Object.entries(localThresholds)) {
      onThresholdChange(key, value);
    }
    announce('Thresholds saved');
  }, [localThresholds, onThresholdChange]);

  const handleDismissAnomaly = useCallback(
    (anomalyId: string) => {
      onDismissAnomaly?.(anomalyId);
    },
    [onDismissAnomaly],
  );

  const handleViewSnapshot = useCallback(
    (anomaly: IAnomaly) => {
      const pageAnomaly = anomalies.find((a) => a.id === anomaly.id);
      if (pageAnomaly) {
        onViewSnapshot?.(pageAnomaly.snapshotId);
      }
    },
    [anomalies, onViewSnapshot],
  );

  const handleViewBattle = useCallback(
    (battleId: string) => {
      onViewBattle?.(battleId);
    },
    [onViewBattle],
  );

  const handleConfigureThreshold = useCallback(
    (configKey: string) => {
      onConfigureThreshold?.(configKey);
    },
    [onConfigureThreshold],
  );

  /* ---- render ---- */
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
        {/* ── 1. INVARIANT STATUS ──────────────────────────────────── */}
        <section aria-label="Invariant status" data-testid="invariant-section">
          <h2
            className="mb-4 text-lg font-semibold text-gray-800 dark:text-gray-200"
            data-testid="invariant-heading"
          >
            Invariant Status
          </h2>

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
              {invariants.map((inv) => (
                <InvariantCard
                  key={inv.id}
                  invariant={inv}
                  onClick={onViewInvariant}
                />
              ))}
            </div>
          )}
        </section>

        {/* ── 2. ANOMALY CARDS ─────────────────────────────────────── */}
        <section aria-label="Anomaly alerts" data-testid="anomaly-section">
          <div className="mb-4 flex items-center justify-between">
            <h2
              className="text-lg font-semibold text-gray-800 dark:text-gray-200"
              data-testid="anomaly-heading"
            >
              Anomaly Alerts
              {anomalies.length > 0 && (
                <span className="ml-2 text-sm font-normal text-gray-500 dark:text-gray-400">
                  ({visibleAnomalies.length})
                </span>
              )}
            </h2>

            {anomalies.some((a) => a.dismissed) && (
              <button
                type="button"
                onClick={() => setShowDismissed((prev) => !prev)}
                className={`min-h-[44px] rounded-md px-3 py-2 text-sm text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900 md:min-h-0 md:py-1 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200 ${FOCUS_RING_CLASSES}`}
                data-testid="toggle-dismissed"
                aria-pressed={showDismissed}
              >
                {showDismissed ? 'Hide Dismissed' : 'Show Dismissed'}
              </button>
            )}
          </div>

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
                      onViewBattle={onViewBattle ? handleViewBattle : undefined}
                      onConfigureThreshold={
                        onConfigureThreshold
                          ? handleConfigureThreshold
                          : undefined
                      }
                      onDismiss={
                        onDismissAnomaly ? handleDismissAnomaly : undefined
                      }
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* ── 3 & 4. VIOLATION LOG + THRESHOLD CONFIG ─────────────── */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
          {/* Violation Log — 60% (3 cols) */}
          <section
            className="lg:col-span-3"
            aria-label="Violation log"
            data-testid="violation-section"
          >
            <h2
              className="mb-4 text-lg font-semibold text-gray-800 dark:text-gray-200"
              data-testid="violation-heading"
            >
              Violation Log
              {filteredViolations.length > 0 && (
                <span className="ml-2 text-sm font-normal text-gray-500 dark:text-gray-400">
                  ({filteredViolations.length})
                </span>
              )}
            </h2>

            <FilterPanel
              filters={violationFilters}
              activeFilters={activeFilters}
              onFilterChange={handleFilterChange}
              className="mb-4"
            />

            <VirtualizedViolationLog
              violations={filteredViolations}
              height={480}
              itemHeight={56}
              onViewBattle={onViewBattle}
            />
          </section>

          {/* Threshold Config — 40% (2 cols) */}
          <section
            className="lg:col-span-2"
            aria-label="Threshold configuration"
            data-testid="threshold-section"
          >
            <h2
              className="mb-4 text-lg font-semibold text-gray-800 dark:text-gray-200"
              data-testid="threshold-heading"
            >
              Threshold Configuration
            </h2>

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
                    onChange={handleSliderChange}
                  />
                ),
              )}

              {/* Action Buttons */}
              <div
                className="flex gap-3 border-t border-gray-200 pt-2 dark:border-gray-700"
                data-testid="threshold-actions"
              >
                <button
                  type="button"
                  onClick={handleResetThresholds}
                  className={`min-h-[44px] rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-100 md:min-h-0 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700 ${FOCUS_RING_CLASSES}`}
                  data-testid="threshold-reset"
                >
                  Reset to Defaults
                </button>
                <button
                  type="button"
                  onClick={handleSaveThresholds}
                  className={`min-h-[44px] rounded-md bg-blue-600 px-4 py-2 text-sm text-white transition-colors hover:bg-blue-700 md:min-h-0 dark:bg-blue-500 dark:hover:bg-blue-600 ${FOCUS_RING_CLASSES}`}
                  data-testid="threshold-save"
                >
                  Save Thresholds
                </button>
              </div>

              {/* Auto-Snapshot Configuration */}
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
          </section>
        </div>
      </div>
    </main>
  );
};

export default AnalysisBugs;

/* ========================================================================== */
/*  Sub-components                                                             */
/* ========================================================================== */

/**
 * Card showing a single invariant check result.
 */
const InvariantCard: React.FC<{
  invariant: IInvariant;
  onClick?: (invariantId: string) => void;
}> = ({ invariant, onClick }) => {
  const handleClick = () => onClick?.(invariant.id);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onClick?.(invariant.id);
    }
  };

  return (
    <div
      className={`cursor-pointer rounded-lg border border-gray-200 bg-white p-4 transition-shadow hover:shadow-md dark:border-gray-700 dark:bg-gray-800 ${FOCUS_RING_CLASSES}`}
      data-testid="invariant-card"
      data-status={invariant.status}
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      aria-label={`${invariant.name}: ${invariant.status}`}
    >
      <div className="mb-2 flex items-center justify-between">
        <h3
          className="mr-2 truncate text-sm font-semibold text-gray-900 dark:text-gray-100"
          data-testid="invariant-name"
          title={invariant.name}
        >
          {invariant.name}
        </h3>
        <span
          className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-bold uppercase ${INVARIANT_STATUS_CLASSES[invariant.status]}`}
          data-testid="invariant-status-badge"
        >
          {invariant.status}
        </span>
      </div>
      <p
        className="mb-2 line-clamp-2 text-xs text-gray-500 dark:text-gray-400"
        data-testid="invariant-description"
      >
        {invariant.description}
      </p>
      <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
        <span data-testid="invariant-last-checked">
          {formatTimestamp(invariant.lastChecked)}
        </span>
        {invariant.failureCount > 0 && (
          <span
            className="font-medium text-red-600 dark:text-red-400"
            data-testid="invariant-failure-count"
          >
            {invariant.failureCount} failure
            {invariant.failureCount !== 1 ? 's' : ''}
          </span>
        )}
      </div>
    </div>
  );
};

/**
 * Slider for configuring a single detector threshold.
 */
const ThresholdSlider: React.FC<{
  detectorKey: string;
  label: string;
  description: string;
  value: number;
  affectedCount: number;
  onChange: (detector: string, value: number) => void;
}> = ({ detectorKey, label, description, value, affectedCount, onChange }) => (
  <div data-testid={`threshold-slider-${detectorKey}`}>
    <div className="mb-1 flex items-center justify-between">
      <label
        htmlFor={`slider-${detectorKey}`}
        className="text-sm font-medium text-gray-700 dark:text-gray-300"
      >
        {label}
      </label>
      <span
        className="font-mono text-sm text-gray-900 dark:text-gray-100"
        data-testid={`threshold-value-${detectorKey}`}
      >
        {value}
      </span>
    </div>
    <p className="mb-2 text-xs text-gray-500 dark:text-gray-400">
      {description}
    </p>
    <input
      id={`slider-${detectorKey}`}
      type="range"
      min={0}
      max={100}
      value={value}
      onChange={(e) => onChange(detectorKey, Number(e.target.value))}
      className={`h-2 w-full cursor-pointer appearance-none rounded-lg bg-gray-200 accent-blue-600 dark:bg-gray-600 dark:accent-blue-400 ${FOCUS_RING_CLASSES}`}
      data-testid={`threshold-input-${detectorKey}`}
      aria-label={`${label} threshold`}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={value}
    />
    {affectedCount > 0 && (
      <p
        className="mt-1 text-xs text-amber-600 dark:text-amber-400"
        data-testid={`threshold-affected-${detectorKey}`}
      >
        {affectedCount} anomal{affectedCount === 1 ? 'y' : 'ies'} from this
        detector
      </p>
    )}
  </div>
);

/**
 * Toggle switch for auto-snapshot configuration.
 */
const ToggleSwitch: React.FC<{
  id: string;
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}> = ({ id, label, checked, onChange }) => (
  <label
    htmlFor={id}
    className="group flex cursor-pointer items-center justify-between"
    data-testid={`toggle-${id}`}
  >
    <span className="text-sm text-gray-700 transition-colors group-hover:text-gray-900 dark:text-gray-300 dark:group-hover:text-gray-100">
      {label}
    </span>
    <div className="relative">
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="peer sr-only"
        data-testid={`toggle-input-${id}`}
        role="switch"
        aria-checked={checked}
        aria-label={label}
      />
      <div className="h-5 w-9 rounded-full bg-gray-300 transition-colors peer-checked:bg-blue-600 peer-focus:ring-2 peer-focus:ring-blue-500 dark:bg-gray-600 dark:peer-checked:bg-blue-500" />
      <div className="absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform peer-checked:translate-x-4" />
    </div>
  </label>
);
