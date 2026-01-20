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

  const sizeClasses = size === 'sm' 
    ? 'w-5 h-5 text-xs' 
    : 'w-6 h-6 text-sm';

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
        className={`
          ${sizeClasses}
          inline-flex items-center justify-center
          rounded-full font-semibold
          bg-cyan-600/20 text-cyan-400 border border-cyan-500/30
          hover:bg-cyan-600/30 hover:border-cyan-400/50 hover:text-cyan-300
          focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/50
          disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-cyan-600/20
          transition-all duration-150
        `}
        aria-label="Show why this changed"
      >
        ?
      </button>

      {/* Tooltip */}
      {showTooltip && !disabled && (
        <div className="
          absolute left-1/2 -translate-x-1/2 bottom-full mb-2
          px-2.5 py-1.5
          bg-surface-raised text-xs text-text-theme-secondary
          border border-border-theme-subtle
          rounded-lg shadow-xl shadow-black/30
          whitespace-nowrap z-50
          animate-in fade-in-0 zoom-in-95 duration-150
        ">
          <span className="text-text-theme-primary">Show why</span>
          <span className="text-text-theme-muted"> this changed</span>
          
          {/* Tooltip arrow */}
          <div className="
            absolute left-1/2 -translate-x-1/2 top-full
            w-0 h-0
            border-l-[6px] border-l-transparent
            border-r-[6px] border-r-transparent
            border-t-[6px] border-t-surface-raised
          " />
        </div>
      )}
    </div>
  );
}

export default WhyButton;
