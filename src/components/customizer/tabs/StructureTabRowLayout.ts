import { customizerStyles as cs } from '../styles';

/**
 * One label | control | meta grid shared by every row in the Chassis,
 * Mobility and Cooling cards, so every control starts on the same vertical
 * line and every control has the same right edge.
 *
 * Wide card (container >= 32rem): 140px label, a control column that grows
 * from 240px to at most 360px, and an 88px meta column directly after the
 * control. Cost meta ("19t · 6 slots") is right-aligned inside that column so
 * the numbers line up; "-> n final" readouts start at the control's edge.
 * Helper text sits under the control and may use the meta column too. Narrow
 * card: one column - label, control, meta and helper text stack at the full
 * card width (controls still stop at 360px). The host card must be an
 * `@container`.
 */
export const STRUCTURE_CARD = '@container';

export const STRUCTURE_ROW_GRID =
  'grid grid-cols-1 items-center gap-x-3 gap-y-0.5 @[32rem]:grid-cols-[8.75rem_minmax(15rem,22.5rem)_5.5rem]';

export const STRUCTURE_ROW_LABEL = `${cs.text.label} font-medium`;

/** Every select fills the control column (never wider than 360px). */
export const STRUCTURE_SELECT = `${cs.select.full} max-w-[22.5rem]`;

/** Width of every control: fills the control column, never wider than 360px. */
export const STRUCTURE_CONTROL_WIDTH = 'w-full max-w-[22.5rem]';

/**
 * Read-only value field: the same outline, height, width and value colour as
 * a stepper (the full control column), with no buttons. The lock icon and the
 * helper line say why it cannot be edited; the value itself is not muted.
 */
export const STRUCTURE_READONLY_FIELD = `border-border-theme-subtle text-text-theme-primary inline-flex min-h-11 ${STRUCTURE_CONTROL_WIDTH} items-center justify-center gap-2 rounded border bg-transparent px-3 text-sm font-semibold tabular-nums`;

/** Meta readout (weight / slots, "-> n final") beside the control. */
export const STRUCTURE_META =
  'text-[13px] whitespace-nowrap text-text-theme-secondary tabular-nums @[32rem]:col-start-3';

/** Cost meta (weight / slots), right-aligned in the 88px meta column. */
export const STRUCTURE_META_END = `${STRUCTURE_META} @[32rem]:justify-self-end @[32rem]:text-right`;

/** Helper text (ranges, hints) directly under its control. */
export const STRUCTURE_HELP =
  'text-[13px] leading-snug text-text-theme-secondary @[32rem]:col-start-2 @[32rem]:col-end-4';

/** Vertical rhythm between rows in a card (one 44px control plus its helper line). */
export const STRUCTURE_ROW_STACK = 'space-y-2';
