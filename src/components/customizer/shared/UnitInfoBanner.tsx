/**
 * Unit Info Banner Component
 *
 * Unit identity and grouped readouts: seven equal-width cells at one value
 * size, a 1px rule between every pair on wide screens. The budget stats (weight, slots, heat, armor) add fill bars against
 * their caps; movement (walk / run / jump in one cell), engine and BV show the
 * value alone. Detailed phone readouts expand without displacing the editor.
 *
 * @spec openspec/specs/unit-info-banner/spec.md
 */

import React, { useId, useState } from 'react';

import { AppIcon } from '@/components/ui/AppIcon';
import { CustomizerTabId } from '@/hooks/useCustomizerRouter';
import { UnitValidationState } from '@/hooks/useUnitValidation';
import { TechBaseMode } from '@/types/construction/TechBaseConfiguration';
import { ValidationStatus } from '@/utils/colors/statusColors';

import workbenchStyles from '../CustomizerWorkbench.module.css';
import { TechBaseBadge } from './TechBaseBadge';
import {
  describeHeat,
  getBudgetFill,
  getCapacityStatus,
  getHeatStatus,
  getWeightStatus,
  STAT_STATUS_FILL_COLOR,
  STAT_STATUS_TEXT_CLASS,
  type StatStatus,
} from './unitStatStatus';
import { ValidationSummary } from './ValidationSummary';

// =============================================================================
// Types
// =============================================================================

export interface UnitStats {
  name: string;
  tonnage: number;
  techBaseMode: TechBaseMode;
  engineRating: number;
  walkMP: number;
  runMP: number;
  jumpMP: number;
  maxRunMP?: number;
  weightUsed: number;
  weightRemaining: number;
  armorPoints: number;
  maxArmorPoints: number;
  criticalSlotsUsed: number;
  criticalSlotsTotal: number;
  heatGenerated: number;
  heatDissipation: number;
  battleValue?: number;
  validationStatus: ValidationStatus;
  errorCount: number;
  warningCount: number;
}

interface UnitInfoBannerProps {
  stats: UnitStats;
  validation?: UnitValidationState;
  onValidationNavigate?: (tabId: CustomizerTabId) => void;
  className?: string;
  actions?: React.ReactNode;
  compact?: boolean;
  /** Compact only: a status control that shares the metrics band. */
  status?: React.ReactNode;
}

// =============================================================================
// Styles
// =============================================================================

const styles = {
  /** Labels, caps and captions share a 12px minimum, legible at phone size. */
  label:
    'text-xs leading-[14px] font-medium text-text-theme-secondary uppercase tracking-wide',
  /** One value size for every metric, budget or not. */
  value: 'text-base leading-6 font-bold sm:text-lg',
  status: STAT_STATUS_TEXT_CLASS,
  muted: 'text-xs text-text-theme-secondary',
  box: 'flex min-w-0 flex-col items-center gap-0.5 text-center tabular-nums',
} as const;

function statTestId(label: string): string {
  const normalized = label
    .toLowerCase()
    .replace(/\+/g, 'plus')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  return `unit-info-stat-${normalized}`;
}

// =============================================================================
// Stat Box Components
// =============================================================================

interface SimpleStatProps {
  label: string;
  value: number | string;
}

/** Value-only readout; a bar-height spacer keeps it level with budget stats. */
function SimpleStat({ label, value }: SimpleStatProps) {
  return (
    <div className={styles.box} data-testid={statTestId(label)}>
      <span className={styles.label}>{label}</span>
      <span className="flex flex-col items-stretch gap-[3px]">
        <span
          className={`${styles.value} ${workbenchStyles.budgetValue} ${styles.status.normal}`}
        >
          {value}
        </span>
        <span aria-hidden="true" className="block h-[3px]" />
      </span>
    </div>
  );
}

interface MovementStatProps {
  walk: number;
  run: number;
  /** Top run speed with a movement enhancement, when above `run`. */
  runPlus?: number;
  jump: number;
}

const slash = <span className={`${styles.muted} font-normal`}>/</span>;

/**
 * Walk, run and jump as one cell ("3 / 5 / 0"), so the strip reads as one
 * row of evenly spaced cells. Each part keeps its own test id.
 */
function MovementStat({ walk, run, runPlus, jump }: MovementStatProps) {
  const label = `Movement: walk ${walk}, run ${run}${
    runPlus ? ` (${runPlus} with enhancement)` : ''
  }, jump ${jump} MP`;
  return (
    <div
      className={styles.box}
      data-testid="unit-info-stat-movement"
      role="group"
      aria-label={label}
      title={label}
    >
      <span className="flex items-baseline justify-center gap-1.5">
        <span className={styles.label}>Movement</span>
        <span
          aria-hidden="true"
          className={`${styles.muted} leading-[14px] whitespace-nowrap max-xl:hidden`}
        >
          {runPlus ? 'walk / run (max) / jump' : 'walk / run / jump'}
        </span>
      </span>
      <span className="flex flex-col items-stretch gap-[3px]">
        <span
          aria-hidden="true"
          className={`${styles.value} ${workbenchStyles.budgetValue} ${styles.status.normal} flex items-baseline justify-center gap-1.5`}
        >
          <span data-testid="unit-info-stat-walk">{walk}</span>
          {slash}
          <span data-testid="unit-info-stat-run">
            {run}
            {runPlus ? (
              <span
                data-testid="unit-info-stat-run-plus"
                className={`${styles.muted} ml-0.5 font-normal`}
              >
                ({runPlus})
              </span>
            ) : null}
          </span>
          {slash}
          <span data-testid="unit-info-stat-jump">{jump}</span>
        </span>
        <span aria-hidden="true" className="block h-[3px]" />
      </span>
    </div>
  );
}

interface BudgetStatProps {
  label: string;
  current: number;
  max: number;
  /** Display text for the current value. */
  format?: (value: number) => string;
  /** Display text for the maximum; defaults to `format`. */
  formatMax?: (value: number) => string;
  unit?: string;
  status?: StatStatus;
  /** Hover/focus explanation; also makes the readout focusable. */
  title?: string;
  /** Short wide-screen hint naming the two numbers, e.g. "gen / diss". */
  caption?: string;
  /** Phone: show only when all readouts are expanded. */
  phoneDetail?: boolean;
}

/** Primary budget readout: value against its cap with a state-colored fill bar. */
function BudgetStat({
  label,
  current,
  max,
  format = String,
  formatMax = format,
  unit = '',
  status = 'normal',
  title,
  caption,
  phoneDetail = false,
}: BudgetStatProps) {
  const tooltipId = useId();
  const currentText = `${format(current)}${unit}`;
  const maxText = `${formatMax(max)}${unit}`;
  return (
    <div
      className={`${styles.box} ${workbenchStyles.budgetStat} ${title ? workbenchStyles.explainedStat : ''}`}
      data-testid={statTestId(label)}
      data-status={status}
      data-phone-detail={phoneDetail || undefined}
      title={title}
      role={title ? 'group' : undefined}
      aria-label={
        title ? `${label}: ${currentText} / ${maxText}. ${title}` : undefined
      }
      aria-describedby={title ? tooltipId : undefined}
      tabIndex={title ? 0 : undefined}
    >
      {caption ? (
        <span className="flex items-baseline justify-center gap-1.5">
          <span className={styles.label}>{label}</span>
          <span
            aria-hidden="true"
            className={`${styles.muted} leading-[14px] whitespace-nowrap max-md:hidden`}
          >
            {caption}
          </span>
        </span>
      ) : (
        <span className={styles.label}>{label}</span>
      )}
      <span className="flex flex-col items-stretch gap-[3px]">
        <span className="flex items-baseline justify-center gap-0.5">
          <span
            className={`${styles.value} ${workbenchStyles.budgetValue} ${styles.status[status]}`}
          >
            {currentText}
          </span>
          <span className={styles.muted}>/</span>
          <span className={styles.muted}>{maxText}</span>
        </span>
        <span aria-hidden="true" className={workbenchStyles.budgetTrack}>
          <span
            className={workbenchStyles.budgetFill}
            data-status={status}
            style={{
              width: `${getBudgetFill(current, max) * 100}%`,
              background: STAT_STATUS_FILL_COLOR[status],
            }}
          />
        </span>
      </span>
      {title && (
        <span
          id={tooltipId}
          role="tooltip"
          className={workbenchStyles.statTooltip}
        >
          {title}
        </span>
      )}
    </div>
  );
}

// =============================================================================
// Main Component
// =============================================================================

export function UnitInfoBanner({
  stats,
  validation,
  onValidationNavigate,
  className = '',
  actions,
  compact = false,
  status,
}: UnitInfoBannerProps): React.ReactElement {
  const [showReadouts, setShowReadouts] = useState(false);
  const readoutsId = useId();
  const hasRunPlus = stats.maxRunMP && stats.maxRunMP > stats.runMP;

  const readouts = (
    <div
      id={readoutsId}
      className={`${workbenchStyles.readouts} ${showReadouts || compact ? workbenchStyles.readoutsExpanded : ''} ${compact && showReadouts ? workbenchStyles.readoutsDetailsOpen : ''}`}
    >
      <div
        role="group"
        aria-label="Capacity"
        className={`${workbenchStyles.readoutGroup} ${workbenchStyles.readoutGroupKey}`}
      >
        <span className={workbenchStyles.readoutHeading}>Capacity</span>
        <div className="grid auto-cols-fr grid-flow-col gap-4">
          <BudgetStat
            label="Weight"
            current={stats.weightUsed}
            max={stats.tonnage}
            format={(value) => value.toFixed(1)}
            formatMax={(value) => value.toFixed(0)}
            unit="t"
            status={getWeightStatus(stats.weightUsed, stats.tonnage)}
          />
          <BudgetStat
            label="Slots"
            current={stats.criticalSlotsUsed}
            max={stats.criticalSlotsTotal}
            status={getCapacityStatus(
              stats.criticalSlotsUsed,
              stats.criticalSlotsTotal,
            )}
          />
          <BudgetStat
            label="Heat"
            current={stats.heatGenerated}
            max={stats.heatDissipation}
            status={getHeatStatus(stats.heatGenerated, stats.heatDissipation)}
            caption="gen / diss"
            title={describeHeat(stats.heatGenerated, stats.heatDissipation)}
          />
          <BudgetStat
            label="Armor"
            current={stats.armorPoints}
            max={stats.maxArmorPoints}
            status={getCapacityStatus(stats.armorPoints, stats.maxArmorPoints)}
            phoneDetail
          />
        </div>
      </div>
      <div
        role="group"
        aria-label="Movement and engine"
        className={workbenchStyles.readoutGroup}
      >
        <span className={workbenchStyles.readoutHeading}>
          Movement and engine
        </span>
        <div className="grid auto-cols-fr grid-flow-col gap-4">
          <MovementStat
            walk={stats.walkMP}
            run={stats.runMP}
            runPlus={hasRunPlus ? stats.maxRunMP : undefined}
            jump={stats.jumpMP}
          />
          <SimpleStat label="Engine" value={stats.engineRating} />
        </div>
      </div>
      <div
        role="group"
        aria-label="Battle value"
        className={`${workbenchStyles.readoutGroup} ${workbenchStyles.readoutGroupAside}`}
      >
        <span className={workbenchStyles.readoutHeading}>Battle value</span>
        <div className="grid auto-cols-fr grid-flow-col gap-4">
          <SimpleStat
            label="BV"
            value={stats.battleValue?.toLocaleString() ?? '-'}
          />
        </div>
      </div>
    </div>
  );

  return (
    <section
      aria-label="Unit status"
      className={`${workbenchStyles.identityBanner} ${compact ? workbenchStyles.compactMetrics : ''} ${className}`}
    >
      {!compact && (
        <div className="flex min-w-0 items-center justify-between gap-3">
          <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
            <h2
              title={stats.name}
              className="text-text-theme-primary min-w-0 truncate text-lg font-semibold tracking-tight"
            >
              {stats.name}
            </h2>
            <TechBaseBadge techBaseMode={stats.techBaseMode} />
            {validation && (
              <ValidationSummary
                validation={validation}
                onNavigate={onValidationNavigate}
              />
            )}
          </div>
          {actions}
        </div>
      )}
      {!compact && (
        <button
          type="button"
          className="text-text-theme-secondary flex min-h-11 w-full items-center justify-between gap-2 text-xs sm:hidden"
          aria-expanded={showReadouts}
          aria-controls={readoutsId}
          onClick={() => setShowReadouts((value) => !value)}
        >
          <span className="tabular-nums">
            {stats.tonnage}t {'\u00b7'} {stats.walkMP} / {stats.runMP} /{' '}
            {stats.jumpMP} MP
          </span>
          <span>
            {showReadouts ? 'Hide readouts' : 'Show readouts'}{' '}
            <AppIcon
              name="chevron-down"
              size="inline"
              aria-hidden="true"
              className={showReadouts ? 'rotate-180' : ' '}
            />
          </span>
        </button>
      )}
      {compact ? (
        <div className={workbenchStyles.compactBar}>
          {readouts}
          {status && (
            <div className={workbenchStyles.compactStatus}>{status}</div>
          )}
          <button
            type="button"
            className={`text-text-theme-secondary hover:text-text-theme-primary hover:bg-surface-raised focus-visible:outline-accent flex h-11 w-11 items-center justify-center rounded focus-visible:outline-2 focus-visible:outline-offset-[-2px] md:hidden ${workbenchStyles.compactToggle}`}
            aria-expanded={showReadouts}
            aria-controls={readoutsId}
            aria-label={
              showReadouts ? 'Hide all unit readouts' : 'Show all unit readouts'
            }
            title={
              showReadouts ? 'Hide all unit readouts' : 'Show all unit readouts'
            }
            onClick={() => setShowReadouts((value) => !value)}
          >
            <AppIcon
              name="chevron-down"
              size="control"
              aria-hidden="true"
              className={showReadouts ? 'rotate-180' : ''}
            />
          </button>
        </div>
      ) : (
        readouts
      )}
    </section>
  );
}
