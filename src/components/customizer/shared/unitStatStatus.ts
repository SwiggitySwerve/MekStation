/**
 * Unit readout states
 *
 * Presentation states for the customizer's budget readouts (weight, slots,
 * heat, armor) and the notes derived from them. Every surface that colors
 * these readouts reads its state and color from here so the thresholds and
 * the readout hue stay in one place.
 *
 * Running hot is legal but worth fixing, so heat above dissipation is a
 * warning, never an error. A readout in that legal-but-high state shows its
 * value and bar in the warning hue, the same color the build status, the
 * panel and the Overview readiness rows use for that warning, so one
 * condition never reads as two severities. Red stays reserved for errors.
 * The hues themselves belong to the severity vocabulary (`BuildStatusLabel`).
 * This is a presentation tier only; the validator does not report it.
 *
 * @spec openspec/specs/unit-info-banner/spec.md
 */

import type { ValidationNote } from './buildStatusSummary';

import {
  BUILD_STATUS_KIND_FILL_COLOR,
  BUILD_STATUS_KIND_TEXT_CLASS,
} from './BuildStatusLabel';

/** Readout state: in budget, legal but high (a warning), or over its cap. */
export type StatStatus = 'normal' | 'warning' | 'error';

/** Text color for a readout value by state. */
export const STAT_STATUS_TEXT_CLASS: Record<StatStatus, string> = {
  normal: 'text-text-theme-primary',
  warning: BUILD_STATUS_KIND_TEXT_CLASS.warning,
  error: BUILD_STATUS_KIND_TEXT_CLASS.error,
};

/**
 * Fill-bar colors by state; normal keeps the neutral bar. Inline values win
 * over module CSS, so the bar always matches its value's text color.
 */
export const STAT_STATUS_FILL_COLOR: Record<StatStatus, string | undefined> = {
  normal: undefined,
  warning: BUILD_STATUS_KIND_FILL_COLOR.warning,
  error: BUILD_STATUS_KIND_FILL_COLOR.error,
};

/** Using the full tonnage is normal; only exceeding it is a problem. */
export function getWeightStatus(used: number, max: number): StatStatus {
  return used > max ? 'error' : 'normal';
}

/** Used beyond the maximum (slots, armor) is an error; anything else is in budget. */
export function getCapacityStatus(used: number, max: number): StatStatus {
  return used > max ? 'error' : 'normal';
}

/** Slot budget figures behind the Slots readout. */
export interface ISlotFill {
  /** Slots the build needs: system slots plus every mounted item's slots. */
  readonly used: number;
  readonly total: number;
  /** Slots actually filled; defaults to `used` when nothing is pending. */
  readonly placed?: number;
  /** Slots needed by mounted items that are not placed yet. */
  readonly pendingSlots?: number;
  /** Mounted items that are not placed yet. */
  readonly unplacedItems?: number;
}

/**
 * Slots readout state: only over capacity is a problem. Slots reserved by
 * unplaced items are not a second issue: the unplaced items are the warning
 * (Unplaced equipment in the build status), so the budget itself stays
 * neutral and one condition is never counted twice.
 */
export function getSlotFillStatus(fill: ISlotFill): StatStatus {
  return getCapacityStatus(fill.used, fill.total);
}

/**
 * Slots filled by placed items, not the slots reserved by unplaced ones, so
 * the figure matches what a tabletop player would count on the sheet. The
 * item count is added to the header tooltip only (`withItems`); the readiness
 * row leaves it to the Unplaced equipment row beside it.
 */
export function describeSlotFill(fill: ISlotFill, withItems = true): string {
  const pending = fill.pendingSlots ?? 0;
  const placed = fill.placed ?? fill.used;
  if (pending <= 0) {
    return `${placed} of ${fill.total} slots filled, ${fill.total - placed} free.`;
  }
  const items = fill.unplacedItems ?? 0;
  const itemNote =
    withItems && items > 0
      ? ` (${items} unplaced item${items === 1 ? '' : 's'})`
      : '';
  return `${placed} of ${fill.total} slots filled \u00b7 ${pending} pending${itemNote}.`;
}

/** Heat generated at full fire beyond dissipation; zero when in budget. */
export function getHeatExcess(generated: number, dissipation: number): number {
  return Math.max(0, generated - dissipation);
}

export function getHeatStatus(
  generated: number,
  dissipation: number,
): StatStatus {
  return getHeatExcess(generated, dissipation) > 0 ? 'warning' : 'normal';
}

/** Share of a budget in use, clamped to 0..1 for fill bars. */
export function getBudgetFill(used: number, max: number): number {
  if (!(max > 0)) return used > 0 ? 1 : 0;
  return Math.min(1, Math.max(0, used / max));
}

/** What the two heat numbers mean, e.g. "33 heat at full fire / 22 dissipation". */
export function describeHeatBalance(
  generated: number,
  dissipation: number,
): string {
  return `${generated} heat at full fire / ${dissipation} dissipation`;
}

/** Plain-language explanation of running hot, shared by tooltip and panel. */
export function describeHeatExcess(excess: number): string {
  return `${excess} over: legal; add heat sinks to run cool.`;
}

/** Full heat explanation for the readout's tooltip and accessible name. */
export function describeHeat(generated: number, dissipation: number): string {
  const excess = getHeatExcess(generated, dissipation);
  const balance = `${describeHeatBalance(generated, dissipation)}.`;
  return excess > 0 ? `${balance} ${describeHeatExcess(excess)}` : balance;
}

/**
 * Build-status warning for running hot. It restates the heat readout already
 * shown and points to the heat sinks; it is not a validation result.
 */
export function getHeatNote(
  generated: number,
  dissipation: number,
): ValidationNote | null {
  const excess = getHeatExcess(generated, dissipation);
  if (excess === 0) return null;
  return {
    id: 'heat-over-dissipation',
    label: 'Runs hot',
    amount: `+${excess}`,
    heading: `Runs ${excess} heat over dissipation`,
    message: `Heat ${generated} at full fire vs ${dissipation} dissipation: ${excess} over.`,
    suggestion:
      'Legal; add heat sinks in Structure to run cool, or fire fewer weapons each turn.',
    action: 'add heat sinks in Cooling',
    tabId: 'structure',
  };
}

/**
 * Readout warnings the build status lists with the rule warnings. Every
 * status surface takes them from here.
 */
export function getStatusNotes(
  heatGenerated: number,
  heatDissipation: number,
): ValidationNote[] {
  const heatNote = getHeatNote(heatGenerated, heatDissipation);
  return heatNote ? [heatNote] : [];
}
