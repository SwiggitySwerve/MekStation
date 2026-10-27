/**
 * Tab badge tooltip
 *
 * The words behind a section tab's badge count ("1 warning: Runs hot"),
 * drawn in a portal so the tab strip's scroll container cannot clip it.
 *
 * @spec openspec/specs/customizer-tabs/spec.md
 */

import React from 'react';
import { createPortal } from 'react-dom';

/** Where the badge tooltip is drawn, in viewport pixels. */
export interface BadgeTooltip {
  readonly tabId: string;
  readonly lines: readonly string[];
  readonly x: number;
  readonly y: number;
}

const TOOLTIP_MAX_WIDTH = 280;
const VIEWPORT_MARGIN = 8;

/** Tooltip centred under `anchor`, kept inside the viewport. */
export function tooltipFor(
  tabId: string,
  lines: readonly string[],
  anchor: Element,
): BadgeTooltip {
  const rect = anchor.getBoundingClientRect();
  const half = TOOLTIP_MAX_WIDTH / 2;
  const centre = rect.left + rect.width / 2;
  return {
    tabId,
    lines,
    x: Math.min(
      Math.max(centre, half + VIEWPORT_MARGIN),
      window.innerWidth - half - VIEWPORT_MARGIN,
    ),
    y: rect.bottom + 6,
  };
}

/** Keyboard focus only: a pointer click on a tab should not pop the tooltip. */
export function hasKeyboardFocus(element: Element): boolean {
  try {
    return element.matches(':focus-visible');
  } catch {
    return true;
  }
}

export function TabIssueTooltip({
  id,
  tooltip,
}: {
  id: string;
  tooltip: BadgeTooltip;
}): React.ReactElement {
  return createPortal(
    <div
      id={id}
      role="tooltip"
      data-testid="customizer-tab-issue-tooltip"
      data-tab={tooltip.tabId}
      style={{
        position: 'fixed',
        left: tooltip.x,
        top: tooltip.y,
        width: 'max-content',
        maxWidth: TOOLTIP_MAX_WIDTH,
        transform: 'translateX(-50%)',
      }}
      className="border-border-theme bg-surface-raised text-text-theme-primary pointer-events-none z-[60] rounded-md border px-3 py-2 text-xs leading-[18px] shadow-lg"
    >
      {tooltip.lines.map((line) => (
        <p key={line}>{line}</p>
      ))}
    </div>,
    document.body,
  );
}
