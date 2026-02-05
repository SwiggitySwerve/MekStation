/**
 * FilterButton Component
 *
 * Reusable toggle button for filter controls.
 * Supports multiple variants for different use cases:
 * - category: For equipment category filters with accent colors
 * - toggle: For binary on/off filters with red "active" state
 * - control: For action buttons like "Show All" or "Clear"
 */

import React from 'react';

// =============================================================================
// Types
// =============================================================================

export type FilterButtonVariant = 'category' | 'toggle' | 'control';

export interface FilterButtonProps {
  /** Whether the filter is currently active */
  isActive: boolean;
  /** Click handler */
  onClick: (event: React.MouseEvent) => void;
  /** Button label */
  children: React.ReactNode;
  /** Tooltip text */
  title?: string;
  /** Visual variant */
  variant?: FilterButtonVariant;
  /** Custom active background color (for category variants) */
  activeBg?: string;
  /** Custom active text color (for category variants) */
  activeText?: string;
  /** Custom active border color (for category variants) */
  activeBorder?: string;
  /** Additional class names */
  className?: string;
  /** Disable the button */
  disabled?: boolean;
}

// =============================================================================
// Component
// =============================================================================

/**
 * Reusable filter button with consistent styling across the app.
 *
 * @example
 * // Category filter with custom colors
 * <FilterButton
 *   isActive={activeCategories.has('energy')}
 *   onClick={handleClick}
 *   variant="category"
 *   activeBg="bg-cyan-900/50"
 *   activeText="text-cyan-300"
 *   title="Energy Weapons"
 * >
 *   <span>⚡</span>
 *   <span>Energy</span>
 * </FilterButton>
 *
 * @example
 * // Toggle filter (hide items)
 * <FilterButton
 *   isActive={hidePrototype}
 *   onClick={onTogglePrototype}
 *   variant="toggle"
 *   title="Hide prototype equipment"
 * >
 *   Proto
 * </FilterButton>
 */
export function FilterButton({
  isActive,
  onClick,
  children,
  title,
  variant = 'category',
  activeBg,
  activeText,
  activeBorder,
  className = '',
  disabled = false,
}: FilterButtonProps): React.ReactElement {
  // Base styles shared by all variants
  const baseStyles = 'px-1.5 py-0.5 text-[10px] rounded transition-all';

  // Inactive styles (same for all variants)
  const inactiveStyles =
    'bg-surface-raised/60 text-text-theme-secondary hover:text-white hover:bg-surface-raised';

  // Active styles by variant
  const getActiveStyles = (): string => {
    switch (variant) {
      case 'category':
        // Custom colors for category filters
        const bg = activeBg || 'bg-accent/20';
        const text = activeText || 'text-accent';
        const border = activeBorder || 'ring-accent/50';
        return `${bg} ${text} ring-1 ${border} shadow-sm`;

      case 'toggle':
        // Red theme for "hide" toggles
        return 'bg-red-900/50 text-red-300 ring-1 ring-red-700';

      case 'control':
        // Accent theme for control buttons
        return 'bg-accent text-white ring-1 ring-accent shadow-sm';

      default:
        return `${activeBg || 'bg-accent/20'} ${activeText || 'text-accent'}`;
    }
  };

  const activeStyles = getActiveStyles();

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={` ${baseStyles} ${isActive ? activeStyles : inactiveStyles} ${disabled ? 'cursor-not-allowed opacity-50' : ''} ${className} `}
      title={title}
    >
      {children}
    </button>
  );
}

// =============================================================================
// Specialized Variants
// =============================================================================

export interface HideToggleProps {
  /** Short label displayed on the button */
  label: string;
  /** Full label for tooltip */
  fullLabel: string;
  /** Whether the filter is active (hiding items) */
  isActive: boolean;
  /** Click handler */
  onClick: () => void;
  /** Additional class names */
  className?: string;
}

/**
 * Specialized toggle button for "hide" filters.
 * Shows red styling when active to indicate items are being hidden.
 */
export function HideToggle({
  label,
  fullLabel,
  isActive,
  onClick,
  className = '',
}: HideToggleProps): React.ReactElement {
  return (
    <FilterButton
      isActive={isActive}
      onClick={onClick}
      variant="toggle"
      title={`${isActive ? 'Show' : 'Hide'} ${fullLabel.toLowerCase()}`}
      className={className}
    >
      {label}
    </FilterButton>
  );
}

export default FilterButton;
