/**
 * Unit readout states
 *
 * Presentation states for the customizer's budget readouts (weight, slots,
 * heat, armor) and the cautions derived from them. Every surface that colors
 * these readouts reads its state and color from here so the thresholds and
 * the caution hue stay in one place.
 *
 * Running hot is legal, so heat above dissipation is a caution, never an error.
 * Cautions use orange so they never read as the amber accent that marks the
 * selected tab and primary actions; red stays reserved for errors.
 *
 * @spec openspec/specs/unit-info-banner/spec.md
 */

import type { ValidationNote } from './ValidationSummary';

export type StatStatus = 'normal' | 'warning' | 'error';

/** Text color for a readout value by state. */
export const STAT_STATUS_TEXT_CLASS: Record<StatStatus, string> = {
  normal: 'text-text-theme-primary',
  warning: 'text-orange-400',
  error: 'text-red-400',
};

/** Caution text: legal states worth a look, such as running hot. */
export const CAUTION_TEXT_CLASS = STAT_STATUS_TEXT_CLASS.warning;

/** Tinted pill for an explicit caution amount, e.g. heat "+11 over". */
export const CAUTION_PILL_CLASS =
  'bg-orange-400/15 text-orange-300 ring-1 ring-inset ring-orange-400/40';

/**
 * Fill-bar colors by state; normal keeps the neutral bar. Inline values win
 * over module CSS, so the bar always matches its value's text color.
 */
export const STAT_STATUS_FILL_COLOR: Record<StatStatus, string | undefined> = {
  normal: undefined,
  warning: 'var(--color-orange-400, #fb923c)',
  error: 'var(--color-red-400, #f87171)',
};

/** Overweight is an error; under half a ton of headroom is a caution. */
export function getWeightStatus(used: number, max: number): StatStatus {
  if (used > max) return 'error';
  if (max - used < 0.5) return 'warning';
  return 'normal';
}

/** Used beyond the maximum (slots, armor) is an error; anything else is in budget. */
export function getCapacityStatus(used: number, max: number): StatStatus {
  return used > max ? 'error' : 'normal';
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

/** Plain-language explanation of running hot, shared by tooltip and notes. */
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
 * Status-control note for running hot. It restates the heat readout already
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
    icon: 'flame',
    message: `Heat ${generated} at full fire vs ${dissipation} dissipation: ${excess} over.`,
    suggestion:
      'Legal; add heat sinks in Structure to run cool, or fire fewer weapons each turn.',
    tabId: 'structure',
  };
}
