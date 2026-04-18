/**
 * SPATooltip — wraps an SPA badge to expose the canonical description and
 * source rulebook on hover/focus.
 *
 * Implementation notes:
 *   - No external tooltip library — a plain `role="tooltip"` div is shown
 *     via local state on `mouseenter`/`focusin` and hidden on the matching
 *     leave/blur events. Keeps the dependency surface flat and lets the
 *     same chrome render on the gameplay map (where a heavier popper
 *     library would trip on the canvas overlay layout).
 *   - The tooltip is positioned via absolute CSS in the trigger's relative
 *     wrapper. We bias up + center; consumers concerned about clipping can
 *     wrap in a `relative` container with sufficient room above. For most
 *     use sites (pilot mech card, pilot detail page) the badges live in a
 *     scrollable list with comfortable overhead.
 *   - `aria-describedby` ties the trigger to the tooltip so screen readers
 *     announce the description when focus lands on the badge.
 */

import React, { useId, useState, useCallback } from 'react';

interface SPATooltipProps {
  /** The trigger node (typically `<SPABadge>`). */
  children: React.ReactNode;
  /** Tooltip body — usually the SPA description + source line. */
  content: React.ReactNode;
  /** Optional class for the wrapper span. */
  className?: string;
}

/**
 * Render `children` with a hover/focus tooltip overlay. Visibility is
 * controlled via the four pointer/focus events so keyboard users get the
 * same affordance.
 */
export function SPATooltip({
  children,
  content,
  className = '',
}: SPATooltipProps): React.ReactElement {
  const tooltipId = useId();
  const [visible, setVisible] = useState(false);

  // Three handlers share one state setter. `useCallback` is overkill for
  // such tiny closures but keeps render-stable for nested memo trees.
  const show = useCallback(() => setVisible(true), []);
  const hide = useCallback(() => setVisible(false), []);

  // Inject the aria-describedby onto the immediate child so screen readers
  // announce the tooltip when the badge gains focus. Falling back to the
  // wrapper span when children aren't a single React element keeps the
  // component permissive.
  const child = React.isValidElement(children)
    ? React.cloneElement(
        children as React.ReactElement<{ 'aria-describedby'?: string }>,
        {
          'aria-describedby': visible ? tooltipId : undefined,
        },
      )
    : children;

  return (
    <span
      className={`relative inline-block ${className}`}
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
    >
      {child}
      {visible && (
        <span
          role="tooltip"
          id={tooltipId}
          className="border-border-theme-subtle bg-surface-deep text-text-theme-primary pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 w-64 -translate-x-1/2 rounded-lg border p-3 text-xs shadow-lg"
        >
          {content}
        </span>
      )}
    </span>
  );
}

export default SPATooltip;
