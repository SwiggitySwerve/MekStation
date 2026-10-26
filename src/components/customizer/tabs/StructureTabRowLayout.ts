import { customizerStyles as cs } from '../styles';

/**
 * One label | control | meta grid shared by every row in the Chassis,
 * Mobility and Cooling cards, so every control starts on the same vertical
 * line, every control has the same right edge, and every meta readout starts
 * a fixed gap after it.
 *
 * Wide card (container >= 32rem): 140px label, 240px control, meta in the
 * remaining space; helper text sits under the control and may use the meta
 * column too. Narrow card: one column - label, control, meta and helper text
 * stack at the full card width. The host card must be an `@container`.
 */
export const STRUCTURE_CARD = '@container';

export const STRUCTURE_ROW_GRID =
  'grid grid-cols-1 items-center gap-x-3 gap-y-1 @[32rem]:grid-cols-[8.75rem_15rem_minmax(0,1fr)]';

export const STRUCTURE_ROW_LABEL = `${cs.text.label} font-medium`;

/** Every select is exactly the control column wide (never wider). */
export const STRUCTURE_SELECT = `${cs.select.full} max-w-60`;

/** Width of every control: fills the 240px control column, never wider. */
export const STRUCTURE_CONTROL_WIDTH = 'w-full max-w-60';

/**
 * Read-only value field: the same outline, height and width as a stepper
 * (the full control column), with muted text and no buttons.
 */
export const STRUCTURE_READONLY_FIELD = `border-border-theme-subtle text-text-theme-secondary inline-flex min-h-11 ${STRUCTURE_CONTROL_WIDTH} items-center justify-center gap-2 rounded border bg-transparent px-3 text-sm font-semibold tabular-nums`;

/** Meta readout (weight / slots, "-> n final") beside the control. */
export const STRUCTURE_META =
  'text-[13px] text-text-theme-secondary tabular-nums @[32rem]:col-start-3';

/** Helper text (ranges, hints) directly under its control. */
export const STRUCTURE_HELP =
  'text-[13px] leading-snug text-text-theme-secondary @[32rem]:col-start-2 @[32rem]:col-end-4';
