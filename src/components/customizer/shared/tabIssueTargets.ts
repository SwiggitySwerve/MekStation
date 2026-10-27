/**
 * Tab issue targets
 *
 * An issue notice can name a control that fixes it ("add heat sinks in
 * Cooling"). The note carries the DOM id of that section; this module owns the
 * ids and the one behavior that follows a link to them: scroll the section
 * into view and focus its control.
 *
 * @spec openspec/specs/customizer-tabs/spec.md
 */

/** Section a notice can link to, and the words in the hint that name it. */
export interface IssueTarget {
  /** Words inside the hint that become the link, e.g. "Cooling". */
  readonly text: string;
  /** DOM id of the section to bring into view. */
  readonly id: string;
}

/** Structure tab Cooling card. */
export const COOLING_CARD_ID = 'structure-cooling-card';

/** Controls a section may point at with `data-focus-target`, else the first. */
const FOCUSABLE =
  'input:not([disabled]), select:not([disabled]), button:not([disabled])';

/**
 * Scrolls the target section into view and moves focus to its control: the
 * element named by the section's `data-focus-target`, or its first enabled
 * control. Does nothing when the section is not on screen.
 */
export function focusIssueTarget(id: string): void {
  const section = document.getElementById(id);
  if (!section) return;
  const reduceMotion = window.matchMedia?.(
    '(prefers-reduced-motion: reduce)',
  ).matches;
  section.scrollIntoView?.({
    block: 'center',
    behavior: reduceMotion ? 'auto' : 'smooth',
  });
  const focusId = section.dataset.focusTarget;
  const control =
    (focusId ? document.getElementById(focusId) : null) ??
    section.querySelector<HTMLElement>(FOCUSABLE);
  control?.focus({ preventScroll: true });
}
