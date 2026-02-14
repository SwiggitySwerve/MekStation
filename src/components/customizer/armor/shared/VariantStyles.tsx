/**
 * Armor Diagram Variant Styles
 *
 * Shared styling utilities for applying visual variants across all diagram types.
 * Each variant has distinct container, header, button, legend, and instructions styling.
 */

import React from 'react';

import { ARMOR_STATUS } from '@/constants/armorStatus';
import { ArmorDiagramVariant } from '@/stores/useAppSettingsStore';

/**
 * Variant-specific styling configuration
 */
export interface VariantStyleConfig {
  // Container
  containerBg: string;
  containerBorder: string;

  // Header
  headerTextClass: string;
  headerTextStyle?: React.CSSProperties;

  // Auto-allocate button
  buttonNormalClass: string;
  buttonOverClass: string;
  buttonNormalStyle?: React.CSSProperties;
  buttonOverStyle?: React.CSSProperties;

  // Legend
  legendDotClass: string;
  legendDotStyle?: (color: string) => React.CSSProperties;
  legendTextClass: string;
  unallocatedTextClass: (isOver: boolean) => string;

  // Instructions
  instructionsClass: string;
  instructionsText: string;

  // SVG decorations
  showScanlines?: boolean;
  showGrid?: boolean;
  showTargetingReticle?: boolean;
}

/**
 * CleanTech variant - Maximum readability and usability
 */
const CLEAN_TECH_STYLE: VariantStyleConfig = {
  containerBg: 'bg-surface-base',
  containerBorder: 'border-border-theme-subtle',

  headerTextClass: 'text-lg font-semibold text-white',

  buttonNormalClass: 'bg-accent hover:bg-accent text-white',
  buttonOverClass: 'bg-red-600 hover:bg-red-500 text-white',

  legendDotClass: 'w-3 h-3 rounded',
  legendTextClass: 'text-text-theme-secondary',
  unallocatedTextClass: () => 'text-text-theme-secondary',

  instructionsClass: 'text-xs text-text-theme-secondary text-center mt-2',
  instructionsText: 'Click a location to edit armor values',

  showGrid: true,
};

/**
 * Neon Operator variant - Sci-fi aesthetic with glowing effects
 */
const NEON_OPERATOR_STYLE: VariantStyleConfig = {
  containerBg: 'bg-surface-deep',
  containerBorder: 'border-cyan-900/50',

  headerTextClass: 'text-lg font-semibold text-cyan-400',
  headerTextStyle: { textShadow: '0 0 10px rgba(34, 211, 238, 0.5)' },

  buttonNormalClass:
    'border border-cyan-500 text-cyan-400 hover:bg-cyan-500/20',
  buttonOverClass: 'border border-red-500 text-red-400 hover:bg-red-500/20',
  buttonNormalStyle: { boxShadow: '0 0 10px rgba(34, 211, 238, 0.3)' },
  buttonOverStyle: { boxShadow: '0 0 10px rgba(239, 68, 68, 0.3)' },

  legendDotClass: 'w-2.5 h-2.5 rounded-full',
  legendDotStyle: (color: string) => ({ boxShadow: `0 0 6px ${color}` }),
  legendTextClass: 'text-text-theme-secondary',
  unallocatedTextClass: (isOver: boolean) =>
    isOver ? 'text-red-400' : 'text-cyan-400',

  instructionsClass: 'text-xs text-cyan-600/50 text-center mt-2',
  instructionsText: 'SELECT TARGET LOCATION',

  showScanlines: true,
  showTargetingReticle: true,
};

/**
 * Tactical HUD variant - Military information density
 */
const TACTICAL_HUD_STYLE: VariantStyleConfig = {
  containerBg: 'bg-slate-950',
  containerBorder: 'border-cyan-900/30',

  headerTextClass: 'text-lg font-bold text-cyan-400 tracking-wider',
  headerTextStyle: {
    fontFamily: "'Courier New', monospace",
    textShadow: '0 0 8px rgba(34, 211, 238, 0.5)',
  },

  buttonNormalClass:
    'border border-cyan-600 text-cyan-400 hover:bg-cyan-600/20 font-mono',
  buttonOverClass:
    'border border-red-600 text-red-400 hover:bg-red-600/20 font-mono',
  buttonNormalStyle: { textShadow: '0 0 4px rgba(34, 211, 238, 0.5)' },
  buttonOverStyle: { textShadow: '0 0 4px rgba(239, 68, 68, 0.5)' },

  legendDotClass: 'w-2 h-2',
  legendDotStyle: (color: string) => ({
    backgroundColor: color,
    boxShadow: `0 0 4px ${color}`,
  }),
  legendTextClass: 'text-cyan-600/70 font-mono text-[10px]',
  unallocatedTextClass: (isOver: boolean) =>
    isOver ? 'text-red-400 font-mono' : 'text-cyan-400 font-mono',

  instructionsClass:
    'text-xs text-cyan-700/50 text-center mt-2 font-mono tracking-wider',
  instructionsText: '[ SELECT LOCATION ]',

  showScanlines: true,
};

/**
 * Premium Material variant - Modern app polish with tactile feel
 */
const PREMIUM_MATERIAL_STYLE: VariantStyleConfig = {
  containerBg: 'bg-gradient-to-b from-slate-800 to-slate-900',
  containerBorder: 'border-slate-600/50',

  headerTextClass: 'text-lg font-semibold text-slate-100',
  headerTextStyle: { textShadow: '0 1px 2px rgba(0,0,0,0.3)' },

  buttonNormalClass:
    'bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white shadow-lg',
  buttonOverClass:
    'bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white shadow-lg',
  buttonNormalStyle: { boxShadow: '0 4px 12px rgba(217, 119, 6, 0.3)' },
  buttonOverStyle: { boxShadow: '0 4px 12px rgba(220, 38, 38, 0.3)' },

  legendDotClass: 'w-3 h-3 rounded-full shadow-sm',
  legendTextClass: 'text-slate-400',
  unallocatedTextClass: (isOver: boolean) =>
    isOver ? 'text-red-400' : 'text-amber-400',

  instructionsClass: 'text-xs text-slate-500 text-center mt-2',
  instructionsText: 'Select a location to adjust armor',

  showGrid: true,
};

/**
 * MegaMek variant - Classic MegaMek-inspired look
 */
const MEGAMEK_STYLE: VariantStyleConfig = {
  containerBg: 'bg-gray-900',
  containerBorder: 'border-gray-700',

  headerTextClass: 'text-base font-bold text-gray-200',

  buttonNormalClass:
    'bg-gray-700 hover:bg-gray-600 text-gray-200 border border-gray-600',
  buttonOverClass:
    'bg-red-800 hover:bg-red-700 text-gray-200 border border-red-600',

  legendDotClass: 'w-3 h-3 border border-gray-600',
  legendTextClass: 'text-gray-400',
  unallocatedTextClass: (isOver: boolean) =>
    isOver ? 'text-red-400' : 'text-gray-300',

  instructionsClass: 'text-xs text-gray-500 text-center mt-2',
  instructionsText: 'Click location to edit',

  showGrid: true,
};

/**
 * Get style configuration for a given variant
 */
export function getVariantStyle(
  variant: ArmorDiagramVariant,
): VariantStyleConfig {
  switch (variant) {
    case 'clean-tech':
      return CLEAN_TECH_STYLE;
    case 'neon-operator':
      return NEON_OPERATOR_STYLE;
    case 'tactical-hud':
      return TACTICAL_HUD_STYLE;
    case 'premium-material':
      return PREMIUM_MATERIAL_STYLE;
    case 'megamek':
      return MEGAMEK_STYLE;
    default:
      return CLEAN_TECH_STYLE;
  }
}

/**
 * Status color mappings for legend
 */
export const LEGEND_COLORS = {
  healthy: '#22c55e', // green-500
  moderate: '#f59e0b', // amber-500
  low: '#f97316', // orange-500
  critical: '#ef4444', // red-500
};

/**
 * Render legend items with variant styling
 */
export function VariantLegend({
  variant,
  unallocatedPoints,
  showUnallocated = true,
}: {
  variant: ArmorDiagramVariant;
  unallocatedPoints: number;
  showUnallocated?: boolean;
}): React.ReactElement {
  const style = getVariantStyle(variant);
  const isNeonOrTactical =
    variant === 'neon-operator' || variant === 'tactical-hud';

  return (
    <div className="mt-4 flex items-center justify-center gap-3 text-xs">
      {Object.entries(LEGEND_COLORS).map(([status, color]) => (
        <div key={status} className="flex items-center gap-1.5">
          <div
            className={style.legendDotClass}
            style={{
              backgroundColor: color,
              ...(style.legendDotStyle?.(color) || {}),
            }}
          />
          <span className={style.legendTextClass}>
            {status === 'healthy'
              ? `${Math.round(ARMOR_STATUS.HEALTHY.min * 100)}%+`
              : status === 'moderate'
                ? `${Math.round(ARMOR_STATUS.MODERATE.min * 100)}%+`
                : status === 'low'
                  ? `${Math.round(ARMOR_STATUS.LOW.min * 100)}%+`
                  : `<${Math.round(ARMOR_STATUS.LOW.min * 100)}%`}
          </span>
        </div>
      ))}
      {showUnallocated && isNeonOrTactical && (
        <>
          <div className="bg-surface-raised h-3 w-px" />
          <span className={style.unallocatedTextClass(unallocatedPoints < 0)}>
            UNALLOC: {unallocatedPoints}
          </span>
        </>
      )}
    </div>
  );
}

/**
 * SVG decorations based on variant
 */
export function VariantSVGDecorations({
  variant,
  width = 300,
  height = 280,
}: {
  variant: ArmorDiagramVariant;
  width?: number;
  height?: number;
}): React.ReactElement | null {
  const style = getVariantStyle(variant);

  return (
    <>
      {style.showScanlines && (
        <rect
          x="0"
          y="0"
          width={width}
          height={height}
          fill="url(#armor-scanlines)"
          opacity="0.3"
        />
      )}
      {style.showGrid && (
        <rect
          x="0"
          y="0"
          width={width}
          height={height}
          fill="url(#armor-grid)"
          opacity="0.5"
        />
      )}
    </>
  );
}

/**
 * Targeting reticle component for neon variant
 */
export function TargetingReticle({
  cx,
  cy,
  visible,
}: {
  cx: number;
  cy: number;
  visible: boolean;
}): React.ReactElement | null {
  if (!visible) return null;

  return (
    <g className="pointer-events-none">
      <circle
        cx={cx}
        cy={cy}
        r={40}
        fill="none"
        stroke="rgba(34, 211, 238, 0.3)"
        strokeWidth="1"
        strokeDasharray="8 4"
        className="animate-spin"
        style={{ animationDuration: '8s' }}
      />
    </g>
  );
}
