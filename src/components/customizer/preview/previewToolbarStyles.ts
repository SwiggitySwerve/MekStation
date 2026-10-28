/**
 * Shared look of every control in the record-sheet preview toolbar (paper size,
 * zoom, Print, Download), so they sit on one baseline with one treatment.
 */

/** Height shared by every toolbar control; also the 44px touch target. */
const CONTROL_BOX =
  'min-h-11 rounded-md border border-border-theme bg-surface-raised text-[13px] font-medium leading-none text-text-theme-primary';

const CONTROL_FOCUS =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent';

/** A standalone bordered control (select, Print). */
export const PREVIEW_CONTROL_CLASS = `${CONTROL_BOX} ${CONTROL_FOCUS} px-3 hover:border-border-theme-strong disabled:cursor-not-allowed disabled:opacity-70`;

/** A bordered box that holds several joined segments (zoom stepper, fit modes). */
export const PREVIEW_SEGMENT_GROUP_CLASS = `${CONTROL_BOX} inline-flex items-stretch divide-x divide-border-theme overflow-hidden p-0`;

/**
 * One segment inside a segment group. `aria-pressed` marks the active one with
 * a tint, accent text and an underline bar, so it never relies on colour alone.
 */
export const PREVIEW_SEGMENT_CLASS = `${CONTROL_FOCUS} inline-flex min-h-11 min-w-11 items-center justify-center px-2.5 text-[13px] font-medium text-text-theme-secondary transition-colors hover:bg-surface-base hover:text-text-theme-primary aria-pressed:bg-accent/20 aria-pressed:font-semibold aria-pressed:text-accent aria-pressed:shadow-[inset_0_-3px_0_var(--accent-primary)] sm:px-3`;

/**
 * One part of a joined control (the zoom stepper): no box of its own, square
 * corners and a hover fill, inside a `PREVIEW_SEGMENT_GROUP_CLASS` box.
 */
export const PREVIEW_JOINED_SEGMENT_CLASS = `${CONTROL_FOCUS} inline-flex min-h-11 items-center justify-center rounded-none! bg-transparent text-[13px] font-medium text-text-theme-primary transition-colors hover:bg-surface-base`;
