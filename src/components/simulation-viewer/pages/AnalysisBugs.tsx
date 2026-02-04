import React, { useState, useCallback, useMemo } from 'react';
import { AnomalyAlertCard } from '@/components/simulation-viewer/AnomalyAlertCard';
import { FilterPanel } from '@/components/simulation-viewer/FilterPanel';
import type { IFilterDefinition } from '@/components/simulation-viewer/types';
import type { IAnomaly } from '@/types/simulation-viewer';

/* ========================================================================== */
/*  Types                                                                      */
/* ========================================================================== */

/** Status of an invariant check — pass or fail */
type InvariantStatus = 'pass' | 'fail';

/** Severity level for anomalies and violations */
type Severity = 'critical' | 'warning' | 'info';

/** Detector type identifiers matching Wave 3 detectors */
type DetectorType = 'heat-suicide' | 'passive-unit' | 'no-progress' | 'long-game' | 'state-cycle';

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

const ITEMS_PER_PAGE = 20;

const SEVERITY_ORDER: Record<Severity, number> = {
  critical: 2,
  warning: 1,
  info: 0,
};

const SEVERITY_BADGE_CLASSES: Record<Severity, string> = {
  critical: 'bg-red-600 text-white',
  warning: 'bg-amber-500 text-white',
  info: 'bg-sky-500 text-white',
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
    configKey: anomaly.detector === 'heat-suicide' ? 'heatSuicideThreshold'
      : anomaly.detector === 'passive-unit' ? 'passiveUnitThreshold'
      : anomaly.detector === 'no-progress' ? 'noProgressThreshold'
      : anomaly.detector === 'long-game' ? 'longGameThreshold'
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
  const [activeFilters, setActiveFilters] = useState<Record<string, string[]>>({});
  const [violationSort, setViolationSort] = useState<{
    key: ViolationSortKey;
    direction: SortDirection;
  }>({ key: 'timestamp', direction: 'desc' });
  const [currentPage, setCurrentPage] = useState(1);
  const [localThresholds, setLocalThresholds] = useState<IThresholds>(thresholds);
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
      const diff = new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
      return violationSort.direction === 'asc' ? diff : -diff;
    });

    return result;
  }, [violations, activeFilters, violationSort]);

  const totalPages = Math.max(1, Math.ceil(filteredViolations.length / ITEMS_PER_PAGE));
  const safePage = Math.min(currentPage, totalPages);

  const paginatedViolations = useMemo(() => {
    const start = (safePage - 1) * ITEMS_PER_PAGE;
    return filteredViolations.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredViolations, safePage]);

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
  const handleFilterChange = useCallback((filters: Record<string, string[]>) => {
    setActiveFilters(filters);
    setCurrentPage(1);
  }, []);

  const handleSort = useCallback((key: ViolationSortKey) => {
    setViolationSort((prev) => ({
      key,
      direction: prev.key === key && prev.direction === 'desc' ? 'asc' : 'desc',
    }));
  }, []);

  const handleSliderChange = useCallback((detector: string, value: number) => {
    setLocalThresholds((prev) => ({ ...prev, [detector]: value }));
  }, []);

  const handleResetThresholds = useCallback(() => {
    setLocalThresholds(DEFAULT_THRESHOLDS);
  }, []);

  const handleSaveThresholds = useCallback(() => {
    if (!onThresholdChange) return;
    for (const [key, value] of Object.entries(localThresholds)) {
      onThresholdChange(key, value);
    }
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
      className="p-4 md:p-6 lg:p-8 min-h-screen bg-gray-50 dark:bg-gray-900"
      data-testid="analysis-bugs-page"
      data-campaign-id={campaignId}
    >
      <h1
        className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-gray-100 mb-6"
        data-testid="page-title"
      >
        Analysis & Bugs
      </h1>

      <div className="space-y-6">
        {/* ── 1. INVARIANT STATUS ──────────────────────────────────── */}
        <section aria-label="Invariant status" data-testid="invariant-section">
          <h2
            className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4"
            data-testid="invariant-heading"
          >
            Invariant Status
          </h2>

          {invariants.length === 0 ? (
            <p
              className="text-sm text-gray-500 dark:text-gray-400 italic"
              data-testid="invariant-empty"
            >
              No invariants configured.
            </p>
          ) : (
            <div
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"
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
          <div className="flex items-center justify-between mb-4">
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
                className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 transition-colors px-3 py-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800"
                data-testid="toggle-dismissed"
                aria-pressed={showDismissed}
              >
                {showDismissed ? 'Hide Dismissed' : 'Show Dismissed'}
              </button>
            )}
          </div>

          {visibleAnomalies.length === 0 ? (
            <p
              className="text-sm text-gray-500 dark:text-gray-400 italic"
              data-testid="anomaly-empty"
            >
              No anomalies detected.
            </p>
          ) : (
            <div
              className="overflow-x-auto pb-2"
              data-testid="anomaly-scroll-container"
            >
              <div className="flex gap-4 min-w-max">
                {visibleAnomalies.map((anomaly) => (
                  <div
                    key={anomaly.id}
                    className="w-80 flex-shrink-0"
                    data-testid={`anomaly-card-wrapper-${anomaly.id}`}
                  >
                    <AnomalyAlertCard
                      anomaly={mapToCardAnomaly(anomaly)}
                      onViewSnapshot={onViewSnapshot ? handleViewSnapshot : undefined}
                      onViewBattle={onViewBattle ? handleViewBattle : undefined}
                      onConfigureThreshold={onConfigureThreshold ? handleConfigureThreshold : undefined}
                      onDismiss={onDismissAnomaly ? handleDismissAnomaly : undefined}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* ── 3 & 4. VIOLATION LOG + THRESHOLD CONFIG ─────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Violation Log — 60% (3 cols) */}
          <section
            className="lg:col-span-3"
            aria-label="Violation log"
            data-testid="violation-section"
          >
            <h2
              className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4"
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

            {filteredViolations.length === 0 ? (
              <p
                className="text-sm text-gray-500 dark:text-gray-400 italic py-8 text-center"
                data-testid="violation-empty"
              >
                No violations match the current filters.
              </p>
            ) : (
              <>
                <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
                  <table
                    className="w-full text-sm text-left"
                    data-testid="violation-table"
                  >
                    <thead className="bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300">
                      <tr>
                        <th
                          scope="col"
                          className="px-4 py-3 font-medium cursor-pointer select-none hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                          onClick={() => handleSort('timestamp')}
                          data-testid="sort-timestamp"
                          aria-sort={
                            violationSort.key === 'timestamp'
                              ? violationSort.direction === 'asc'
                                ? 'ascending'
                                : 'descending'
                              : 'none'
                          }
                        >
                          Timestamp{' '}
                          {violationSort.key === 'timestamp' && (
                            <span aria-hidden="true">
                              {violationSort.direction === 'asc' ? '▲' : '▼'}
                            </span>
                          )}
                        </th>
                        <th scope="col" className="px-4 py-3 font-medium">
                          Type
                        </th>
                        <th
                          scope="col"
                          className="px-4 py-3 font-medium cursor-pointer select-none hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                          onClick={() => handleSort('severity')}
                          data-testid="sort-severity"
                          aria-sort={
                            violationSort.key === 'severity'
                              ? violationSort.direction === 'asc'
                                ? 'ascending'
                                : 'descending'
                              : 'none'
                          }
                        >
                          Severity{' '}
                          {violationSort.key === 'severity' && (
                            <span aria-hidden="true">
                              {violationSort.direction === 'asc' ? '▲' : '▼'}
                            </span>
                          )}
                        </th>
                        <th scope="col" className="px-4 py-3 font-medium">
                          Message
                        </th>
                        <th scope="col" className="px-4 py-3 font-medium">
                          Battle
                        </th>
                        <th scope="col" className="px-4 py-3 font-medium">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                      {paginatedViolations.map((violation) => (
                        <ViolationRow
                          key={violation.id}
                          violation={violation}
                          onViewBattle={onViewBattle}
                        />
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div
                    className="flex items-center justify-between mt-4"
                    data-testid="violation-pagination"
                  >
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      Page {safePage} of {totalPages}
                    </span>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                        disabled={safePage <= 1}
                        className="px-3 py-1 text-sm rounded-md border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                        data-testid="pagination-prev"
                        aria-label="Previous page"
                      >
                        Previous
                      </button>
                      <button
                        type="button"
                        onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                        disabled={safePage >= totalPages}
                        className="px-3 py-1 text-sm rounded-md border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                        data-testid="pagination-next"
                        aria-label="Next page"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </section>

          {/* Threshold Config — 40% (2 cols) */}
          <section
            className="lg:col-span-2"
            aria-label="Threshold configuration"
            data-testid="threshold-section"
          >
            <h2
              className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4"
              data-testid="threshold-heading"
            >
              Threshold Configuration
            </h2>

            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 space-y-5">
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
                className="flex gap-3 pt-2 border-t border-gray-200 dark:border-gray-700"
                data-testid="threshold-actions"
              >
                <button
                  type="button"
                  onClick={handleResetThresholds}
                  className="px-4 py-2 text-sm rounded-md border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  data-testid="threshold-reset"
                >
                  Reset to Defaults
                </button>
                <button
                  type="button"
                  onClick={handleSaveThresholds}
                  className="px-4 py-2 text-sm rounded-md bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 transition-colors"
                  data-testid="threshold-save"
                >
                  Save Thresholds
                </button>
              </div>

              {/* Auto-Snapshot Configuration */}
              <div
                className="pt-4 border-t border-gray-200 dark:border-gray-700"
                data-testid="auto-snapshot-config"
              >
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide mb-3">
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
      className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500"
      data-testid="invariant-card"
      data-status={invariant.status}
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      aria-label={`${invariant.name}: ${invariant.status}`}
    >
      <div className="flex items-center justify-between mb-2">
        <h3
          className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate mr-2"
          data-testid="invariant-name"
          title={invariant.name}
        >
          {invariant.name}
        </h3>
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold uppercase ${INVARIANT_STATUS_CLASSES[invariant.status]}`}
          data-testid="invariant-status-badge"
        >
          {invariant.status}
        </span>
      </div>
      <p
        className="text-xs text-gray-500 dark:text-gray-400 mb-2 line-clamp-2"
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
            className="text-red-600 dark:text-red-400 font-medium"
            data-testid="invariant-failure-count"
          >
            {invariant.failureCount} failure{invariant.failureCount !== 1 ? 's' : ''}
          </span>
        )}
      </div>
    </div>
  );
};

/**
 * Single row in the violation log table.
 */
const ViolationRow: React.FC<{
  violation: IViolation;
  onViewBattle?: (battleId: string) => void;
}> = ({ violation, onViewBattle }) => (
  <tr
    className="bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
    data-testid="violation-row"
    data-severity={violation.severity}
  >
    <td className="px-4 py-3 text-gray-700 dark:text-gray-300 whitespace-nowrap" data-testid="violation-timestamp">
      {formatTimestamp(violation.timestamp)}
    </td>
    <td className="px-4 py-3 text-gray-700 dark:text-gray-300" data-testid="violation-type">
      {violation.type}
    </td>
    <td className="px-4 py-3" data-testid="violation-severity">
      <span
        className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold uppercase ${SEVERITY_BADGE_CLASSES[violation.severity]}`}
        data-testid="violation-severity-badge"
      >
        {violation.severity}
      </span>
    </td>
    <td className="px-4 py-3 text-gray-700 dark:text-gray-300" data-testid="violation-message">
      {violation.message}
    </td>
    <td className="px-4 py-3 text-gray-500 dark:text-gray-400 whitespace-nowrap" data-testid="violation-battle">
      {violation.battleId}
    </td>
    <td className="px-4 py-3">
      {onViewBattle && (
        <button
          type="button"
          onClick={() => onViewBattle(violation.battleId)}
          className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
          data-testid="violation-view-battle"
          aria-label={`View battle ${violation.battleId}`}
        >
          View Battle
        </button>
      )}
    </td>
  </tr>
);

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
    <div className="flex items-center justify-between mb-1">
      <label
        htmlFor={`slider-${detectorKey}`}
        className="text-sm font-medium text-gray-700 dark:text-gray-300"
      >
        {label}
      </label>
      <span
        className="text-sm font-mono text-gray-900 dark:text-gray-100"
        data-testid={`threshold-value-${detectorKey}`}
      >
        {value}
      </span>
    </div>
    <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
      {description}
    </p>
    <input
      id={`slider-${detectorKey}`}
      type="range"
      min={0}
      max={100}
      value={value}
      onChange={(e) => onChange(detectorKey, Number(e.target.value))}
      className="w-full h-2 bg-gray-200 dark:bg-gray-600 rounded-lg appearance-none cursor-pointer accent-blue-600 dark:accent-blue-400"
      data-testid={`threshold-input-${detectorKey}`}
      aria-label={`${label} threshold`}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={value}
    />
    {affectedCount > 0 && (
      <p
        className="text-xs text-amber-600 dark:text-amber-400 mt-1"
        data-testid={`threshold-affected-${detectorKey}`}
      >
        {affectedCount} anomal{affectedCount === 1 ? 'y' : 'ies'} from this detector
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
    className="flex items-center justify-between cursor-pointer group"
    data-testid={`toggle-${id}`}
  >
    <span className="text-sm text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-gray-100 transition-colors">
      {label}
    </span>
    <div className="relative">
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="sr-only peer"
        data-testid={`toggle-input-${id}`}
        role="switch"
        aria-checked={checked}
        aria-label={label}
      />
      <div className="w-9 h-5 bg-gray-300 dark:bg-gray-600 rounded-full peer-checked:bg-blue-600 dark:peer-checked:bg-blue-500 peer-focus:ring-2 peer-focus:ring-blue-500 transition-colors" />
      <div className="absolute left-0.5 top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform peer-checked:translate-x-4" />
    </div>
  </label>
);
