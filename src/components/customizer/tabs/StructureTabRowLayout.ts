import { customizerStyles as cs } from '../styles';

/**
 * One label | control | meta grid shared by every row in the Chassis and
 * Mobility cards, so every control starts on the same vertical line and every
 * meta readout starts a fixed gap after its control.
 *
 * Wide card (container >= 32rem): 140px label, 240px control, meta in the
 * remaining space. Narrow card: label and control only; meta and helper text
 * drop under the control. The host card must be an `@container`.
 */
export const STRUCTURE_CARD = '@container';

export const STRUCTURE_ROW_GRID =
  'grid grid-cols-[6rem_minmax(0,1fr)] items-center gap-x-3 gap-y-1 @[32rem]:grid-cols-[8.75rem_15rem_minmax(0,1fr)]';

export const STRUCTURE_ROW_LABEL = `${cs.text.label} font-medium`;

/** Every select is exactly the control column wide (never wider). */
export const STRUCTURE_SELECT = `${cs.select.full} max-w-60`;

/** One stepper group is 44 + 48 + 44px, left-aligned inside the control column. */
export const STRUCTURE_STEPPER =
  'flex w-[8.5rem] shrink-0 items-center justify-self-start';

/** Read-only value box the same size as a stepper's value box, with no buttons. */
export const STRUCTURE_READONLY_VALUE = `${STRUCTURE_STEPPER} justify-center`;

/** Meta readout (range, weight / slots, "→ n final") beside the control. */
export const STRUCTURE_META =
  'col-start-2 text-[13px] text-text-theme-secondary tabular-nums @[32rem]:col-start-3';

/** Helper text directly under its control. */
export const STRUCTURE_HELP =
  'col-start-2 text-[13px] leading-snug text-text-theme-secondary @[32rem]:col-end-4';
