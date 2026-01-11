/**
 * Compact Unit Info Banner Component
 *
 * Mobile-optimized version of UnitInfoBanner that shows only critical stats
 * (Weight, Armor, Heat) in a smaller footprint. Designed for use on mobile
 * devices where screen real estate is limited.
 *
 * @spec openspec/changes/pwa-implementation-tasks.md - Phase 3.6
 */

import React from 'react';
import type { UnitStats } from './UnitInfoBanner';

// =============================================================================
// Types
// =============================================================================

interface UnitInfoBannerCompactProps {
  /** Unit statistics (same as UnitInfoBanner) */
  stats: UnitStats;
  /** Additional CSS classes */
  className?: string;
  /** Callback when banner is tapped to expand (optional) */
  onExpand?: () => void;
}

// =============================================================================
// Styles
// =============================================================================

const styles = {
  label: 'text-[9px] font-medium text-text-theme-muted uppercase tracking-wider',
  value: {
    normal: 'text-text-theme-primary',
    warning: 'text-accent',
    error: 'text-red-400',
    success: 'text-green-400',
  },
} as const;

// =============================================================================
// Helper Components
// =============================================================================

interface CompactStatProps {
  label: string;
  current: number | string;
  max: number | string;
  unit?: string;
  status?: 'normal' | 'warning' | 'error' | 'success';
}

/**
 * Compact stat display with current/max format
 */
function CompactStat({ label, current, max, unit = '', status = 'normal' }: CompactStatProps) {
  const valueColor = styles.value[status];

  return (
    <div className="flex flex-col items-center">
      <span className={styles.label}>{label}</span>
      <div className="flex items-baseline gap-0.5">
        <span className={`text-sm font-bold ${valueColor}`}>
          {current}
          {unit}
        </span>
        <span className="text-[10px] text-border-theme">/</span>
        <span className="text-[10px] text-text-theme-muted">
          {max}
          {unit}
        </span>
      </div>
    </div>
  );
}

// =============================================================================
// Main Component
// =============================================================================

/**
 * Compact unit info banner for mobile devices.
 *
 * Shows only the most critical stats:
 * - Weight (used/max)
 * - Armor (points/max)
 * - Heat (generated/dissipation)
 *
 * Optionally supports tap-to-expand for full details.
 *
 * @example
 * ```tsx
 * <UnitInfoBannerCompact
 *   stats={unitStats}
 *   onExpand={() => setShowFullBanner(true)}
 * />
 * ```
 */
export function UnitInfoBannerCompact({
  stats,
  className = '',
  onExpand,
}: UnitInfoBannerCompactProps): React.ReactElement {
  // Calculate status colors
  const weightStatus: 'normal' | 'warning' | 'error' =
    stats.weightUsed > stats.tonnage
      ? 'error'
      : stats.weightRemaining < 0.5
        ? 'warning'
        : 'normal';

  const heatStatus: 'normal' | 'warning' | 'error' | 'success' =
    stats.heatGenerated > stats.heatDissipation
      ? 'error'
      : stats.heatGenerated === stats.heatDissipation
        ? 'warning'
        : 'success';

  return (
    <div
      className={`
        bg-surface-base/90 border border-border-theme-subtle rounded-lg px-3 py-2
        ${onExpand ? 'cursor-pointer active:bg-surface-raised/90' : ''}
        ${className}
      `}
      onClick={onExpand}
      role={onExpand ? 'button' : undefined}
      tabIndex={onExpand ? 0 : undefined}
      aria-label={onExpand ? 'Tap to view full unit info' : undefined}
    >
      <div className="flex items-center justify-between gap-4">
        {/* Unit Identity - Condensed */}
        <div className="flex-shrink-0 min-w-0 flex-1">
          <h2 className="text-sm font-bold text-text-theme-primary truncate">{stats.name}</h2>
          <div className="flex items-center gap-1.5 text-[10px] text-text-theme-secondary">
            <span>{stats.tonnage}t</span>
            <span className="text-border-theme">|</span>
            <span>
              {stats.walkMP}/{stats.runMP}/{stats.jumpMP}
            </span>
            {stats.validationStatus !== 'valid' && (
              <>
                <span className="text-border-theme">|</span>
                <span className="text-red-400">{stats.errorCount} err</span>
              </>
            )}
          </div>
        </div>

        {/* Critical Stats */}
        <div className="flex items-center gap-3">
          <CompactStat
            label="WT"
            current={stats.weightUsed.toFixed(1)}
            max={stats.tonnage.toFixed(0)}
            unit="t"
            status={weightStatus}
          />
          <CompactStat label="ARM" current={stats.armorPoints} max={stats.maxArmorPoints} />
          <CompactStat
            label="HEAT"
            current={stats.heatGenerated}
            max={stats.heatDissipation}
            status={heatStatus}
          />
        </div>

        {/* Expand indicator */}
        {onExpand && (
          <div className="flex-shrink-0 text-text-theme-muted text-xs">
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </div>
        )}
      </div>
    </div>
  );
}

export default UnitInfoBannerCompact;
