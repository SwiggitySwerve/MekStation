import React from 'react';

import { useUIBehaviorStore } from '@/stores/useUIBehaviorStore';

/**
 * Instant hover/focus hint for a header icon button. Place it inside a
 * `group relative` button. It repeats what the button's accessible name and
 * description already say, so it is hidden from assistive tech, and it stays
 * closed while the button's own menu is open. Honors the "show tooltips"
 * setting.
 */
export function ToolbarHint({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}): React.ReactElement | null {
  const showTooltips = useUIBehaviorStore((state) => state.showTooltips);
  if (!showTooltips) return null;
  return (
    <span
      aria-hidden="true"
      data-toolbar-hint
      className={`border-border-theme bg-surface-raised text-text-theme-primary pointer-events-none absolute top-full right-0 z-50 mt-1.5 hidden w-max max-w-64 rounded-md border px-2.5 py-1.5 text-left text-xs leading-4 font-medium whitespace-normal shadow-lg group-hover:block group-focus-visible:block group-aria-expanded:!hidden ${className}`}
    >
      {children}
    </span>
  );
}
