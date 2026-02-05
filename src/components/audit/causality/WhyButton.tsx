/**
 * WhyButton Component
 * Small "?" button to show causality for a state change.
 *
 * @spec openspec/changes/add-audit-timeline/specs/audit-timeline/spec.md
 */

import React, { useState } from 'react';

// =============================================================================
// Types
// =============================================================================

export interface WhyButtonProps {
  /** Click handler to open causality view */
  onClick: () => void;
  /** Whether the button is disabled */
  disabled?: boolean;
  /** Button size */
  size?: 'sm' | 'md';
}

// =============================================================================
// Component
// =============================================================================

export function WhyButton({
  onClick,
  disabled = false,
  size = 'sm',
}: WhyButtonProps): React.ReactElement {
  const [showTooltip, setShowTooltip] = useState(false);

  const sizeClasses = size === 'sm' ? 'w-5 h-5 text-xs' : 'w-6 h-6 text-sm';

  return (
    <div className="relative inline-flex">
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        onFocus={() => setShowTooltip(true)}
        onBlur={() => setShowTooltip(false)}
        className={` ${sizeClasses} inline-flex items-center justify-center rounded-full border border-cyan-500/30 bg-cyan-600/20 font-semibold text-cyan-400 transition-all duration-150 hover:border-cyan-400/50 hover:bg-cyan-600/30 hover:text-cyan-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/50 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-cyan-600/20`}
        aria-label="Show why this changed"
      >
        ?
      </button>

      {/* Tooltip */}
      {showTooltip && !disabled && (
        <div className="bg-surface-raised text-text-theme-secondary border-border-theme-subtle animate-in fade-in-0 zoom-in-95 absolute bottom-full left-1/2 z-50 mb-2 -translate-x-1/2 rounded-lg border px-2.5 py-1.5 text-xs whitespace-nowrap shadow-xl shadow-black/30 duration-150">
          <span className="text-text-theme-primary">Show why</span>
          <span className="text-text-theme-muted"> this changed</span>

          {/* Tooltip arrow */}
          <div className="border-t-surface-raised absolute top-full left-1/2 h-0 w-0 -translate-x-1/2 border-t-[6px] border-r-[6px] border-l-[6px] border-r-transparent border-l-transparent" />
        </div>
      )}
    </div>
  );
}

export default WhyButton;
