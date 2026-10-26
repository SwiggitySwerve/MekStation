/**
 * Unit Info Banner stat cells
 *
 * The readout cells used by UnitInfoBanner: a value-only cell, the combined
 * walk / run / jump movement cell, and the budget cell with its fill bar.
 *
 * @spec openspec/specs/unit-info-banner/spec.md
 */

import React, { useId } from 'react';

import workbenchStyles from '../CustomizerWorkbench.module.css';
import {
  getBudgetFill,
  STAT_STATUS_FILL_COLOR,
  STAT_STATUS_TEXT_CLASS,
  type StatStatus,
} from './unitStatStatus';

// =============================================================================
// Styles
// =============================================================================

const styles = {
  /** Labels, caps and captions share a 12px minimum, legible at phone size. */
  label:
    'text-xs leading-[14px] font-medium text-text-theme-secondary uppercase tracking-wide',
  /** One value size for every metric, budget or not. */
  value: 'text-base leading-6 font-bold max-md:text-lg! sm:text-lg',
  status: STAT_STATUS_TEXT_CLASS,
  muted: 'text-[13px] text-text-theme-secondary',
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
export function SimpleStat({
  label,
  value,
}: SimpleStatProps): React.ReactElement {
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
export function MovementStat({
  walk,
  run,
  runPlus,
  jump,
}: MovementStatProps): React.ReactElement {
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
export function BudgetStat({
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
}: BudgetStatProps): React.ReactElement {
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
