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
 * card: one column - the meta shares the label's line, right-aligned, then
 * the control and helper text stack at the full card width (controls still
 * stop at 360px). The host card must be an `@container`.
 */
export const STRUCTURE_CARD = '@container';

export const STRUCTURE_ROW_GRID =
  'grid grid-cols-1 items-center gap-x-3 gap-y-0.5 @[32rem]:grid-cols-[8.75rem_minmax(15rem,22.5rem)_5.5rem]';

/**
 * The label's cell: row 1, column 1 at every width. A narrow card puts the
 * meta in the same cell (right-aligned), so the label must claim it
 * explicitly or auto-placement would push the label below the meta.
 */
export const STRUCTURE_LABEL_CELL = 'col-start-1 row-start-1';

export const STRUCTURE_ROW_LABEL = `${cs.text.label} font-medium ${STRUCTURE_LABEL_CELL}`;

/** Every select fills the control column (never wider than 360px). */
export const STRUCTURE_SELECT = `${cs.select.full} max-w-[22.5rem]`;

/** Width of every control: fills the control column, never wider than 360px. */
export const STRUCTURE_CONTROL_WIDTH = 'w-full max-w-[22.5rem]';

/**
 * Derived readout laid out like a stepper: the row has the stepper's width,
 * and the value sits in a read-only box exactly where a stepper's value field
 * is, between two spacers as wide as the stepper's - and + buttons (16px icon,
 * the global 1rem button padding, 1px borders). The box is a recessed,
 * borderless well (deep surface) with the lock icon, so it reads as read-only
 * rather than as an outlined disabled control, and the helper explains why it
 * cannot be edited.
 */
export const STRUCTURE_READONLY_ROW = `flex shrink-0 items-center ${STRUCTURE_CONTROL_WIDTH}`;

export const STRUCTURE_READONLY_SPACER = 'w-[50px] shrink-0';

export const STRUCTURE_READONLY_FIELD =
  'text-text-theme-primary bg-surface-deep inline-flex min-h-11 min-w-11 flex-1 items-center justify-center gap-2 rounded border border-transparent px-2 text-sm tabular-nums';

/**
 * Meta readout (weight / slots, "-> n final") beside the control. Narrow cards
 * put it on the label's line, right-aligned, where it uses the 14px body step.
 */
const STRUCTURE_META_BASE =
  'text-sm whitespace-nowrap text-text-theme-secondary tabular-nums col-start-1 row-start-1 justify-self-end @[32rem]:col-start-3 @[32rem]:text-[13px]';

export const STRUCTURE_META = `${STRUCTURE_META_BASE} @[32rem]:justify-self-auto`;

/** Cost meta (weight / slots), right-aligned in the 88px meta column. */
export const STRUCTURE_META_END = `${STRUCTURE_META_BASE} @[32rem]:text-right`;

/** Helper text (ranges, hints) directly under its control. */
export const STRUCTURE_HELP =
  'text-[13px] leading-snug text-text-theme-secondary @[32rem]:col-start-2 @[32rem]:col-end-4';

/** Vertical rhythm between rows in a card (one 44px control plus its helper line). */
export const STRUCTURE_ROW_STACK = 'space-y-2';
