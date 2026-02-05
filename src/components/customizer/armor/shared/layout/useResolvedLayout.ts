/**
 * useResolvedLayout Hook
 *
 * React hook for accessing resolved layout configurations.
 * Handles memoization and provides easy access to layout positions.
 */

import { useMemo } from 'react';

import { MechLocation } from '@/types/construction';

import { resolveLayout } from './LayoutEngine';
import {
  GEOMETRIC_BIPED_LAYOUT,
  REALISTIC_BIPED_LAYOUT,
  MEGAMEK_BIPED_LAYOUT,
  BATTLEMECH_BIPED_LAYOUT,
  getBipedLayout,
  GEOMETRIC_QUAD_LAYOUT,
  BATTLEMECH_QUAD_LAYOUT,
  getQuadLayout,
  GEOMETRIC_TRIPOD_LAYOUT,
  BATTLEMECH_TRIPOD_LAYOUT,
  getTripodLayout,
  GEOMETRIC_LAM_LAYOUT,
  BATTLEMECH_LAM_LAYOUT,
  getLAMLayout,
  GEOMETRIC_QUADVEE_LAYOUT,
  BATTLEMECH_QUADVEE_LAYOUT,
  getQuadVeeLayout,
} from './layouts';
import {
  LayoutResolveOptions,
  MechLayoutConfig,
  ResolvedLayout,
  ResolvedPosition,
  ValidationResult,
} from './LayoutTypes';
import { validateLayout } from './LayoutValidator';

// ============================================================================
// Layout Registry
// ============================================================================

/**
 * All available layout configurations
 */
const LAYOUT_REGISTRY: Map<string, MechLayoutConfig> = new Map([
  // Biped layouts
  ['geometric-biped', GEOMETRIC_BIPED_LAYOUT],
  ['realistic-biped', REALISTIC_BIPED_LAYOUT],
  ['megamek-biped', MEGAMEK_BIPED_LAYOUT],
  ['battlemech-biped', BATTLEMECH_BIPED_LAYOUT],
  // Quad layouts
  ['geometric-quad', GEOMETRIC_QUAD_LAYOUT],
  ['battlemech-quad', BATTLEMECH_QUAD_LAYOUT],
  // Tripod layouts
  ['geometric-tripod', GEOMETRIC_TRIPOD_LAYOUT],
  ['battlemech-tripod', BATTLEMECH_TRIPOD_LAYOUT],
  // LAM layouts
  ['geometric-lam', GEOMETRIC_LAM_LAYOUT],
  ['battlemech-lam', BATTLEMECH_LAM_LAYOUT],
  // QuadVee layouts
  ['geometric-quadvee', GEOMETRIC_QUADVEE_LAYOUT],
  ['battlemech-quadvee', BATTLEMECH_QUADVEE_LAYOUT],
]);

/**
 * Register a new layout configuration
 */
export function registerLayout(config: MechLayoutConfig): void {
  LAYOUT_REGISTRY.set(config.id, config);
}

/**
 * Get a layout configuration by ID
 */
export function getLayoutConfig(id: string): MechLayoutConfig | undefined {
  return (
    LAYOUT_REGISTRY.get(id) ??
    getBipedLayout(id) ??
    getQuadLayout(id) ??
    getTripodLayout(id) ??
    getLAMLayout(id) ??
    getQuadVeeLayout(id)
  );
}

/**
 * Get all registered layout IDs
 */
export function getLayoutIds(): string[] {
  return Array.from(LAYOUT_REGISTRY.keys());
}

/**
 * Mech configuration types for layout selection
 */
export type MechConfigType = 'biped' | 'quad' | 'tripod' | 'lam' | 'quadvee';

/**
 * Display names for mech configurations
 */
export const MECH_CONFIG_DISPLAY_NAMES: Record<MechConfigType, string> = {
  biped: 'Biped',
  quad: 'Quad',
  tripod: 'Tripod',
  lam: 'LAM',
  quadvee: 'QuadVee',
};

/**
 * Get all available mech configuration types
 */
export function getMechConfigTypes(): MechConfigType[] {
  return ['biped', 'quad', 'tripod', 'lam', 'quadvee'];
}

/**
 * Get layout ID for a mech configuration and style
 */
export function getLayoutIdForConfig(
  configType: MechConfigType,
  style: 'geometric' | 'battlemech' | 'realistic' | 'megamek' = 'geometric',
): string {
  // Map style to prefix
  const stylePrefix =
    style === 'realistic'
      ? 'realistic'
      : style === 'megamek'
        ? 'megamek'
        : style === 'battlemech'
          ? 'battlemech'
          : 'geometric';

  return `${stylePrefix}-${configType}`;
}

// ============================================================================
// Main Hook
// ============================================================================

export interface UseResolvedLayoutResult {
  /** The resolved layout with all positions calculated */
  layout: ResolvedLayout;
  /** Get position for a specific location */
  getPosition: (location: MechLocation) => ResolvedPosition | undefined;
  /** The viewBox string for SVG */
  viewBox: string;
  /** Layout bounds */
  bounds: ResolvedLayout['bounds'];
  /** Validation result */
  validation: ValidationResult;
  /** Whether the layout is valid */
  isValid: boolean;
  /** The original config */
  config: MechLayoutConfig;
}

/**
 * Hook to get a resolved layout for a mech configuration
 *
 * @param layoutId - The layout configuration ID (e.g., 'geometric-biped')
 * @param options - Optional resolution options
 * @returns Resolved layout with helper functions
 *
 * @example
 * ```tsx
 * const { layout, getPosition, viewBox } = useResolvedLayout('geometric-biped');
 *
 * return (
 *   <svg viewBox={viewBox}>
 *     {Object.entries(layout.positions).map(([loc, pos]) => (
 *       <rect key={loc} x={pos.x} y={pos.y} width={pos.width} height={pos.height} />
 *     ))}
 *   </svg>
 * );
 * ```
 */
export function useResolvedLayout(
  layoutId: string,
  options: LayoutResolveOptions = {},
): UseResolvedLayoutResult {
  const config = useMemo(() => {
    const cfg = getLayoutConfig(layoutId);
    if (!cfg) {
      console.warn(
        `Layout '${layoutId}' not found, falling back to geometric-biped`,
      );
      return GEOMETRIC_BIPED_LAYOUT;
    }
    return cfg;
  }, [layoutId]);

  const layout = useMemo(() => {
    return resolveLayout(config, options);
  }, [config, options]);

  const validation = useMemo(() => {
    return validateLayout(layout, config);
  }, [layout, config]);

  const getPosition = useMemo(() => {
    return (location: MechLocation): ResolvedPosition | undefined => {
      return layout.positions[location];
    };
  }, [layout.positions]);

  return {
    layout,
    getPosition,
    viewBox: layout.viewBox,
    bounds: layout.bounds,
    validation,
    isValid: validation.valid,
    config,
  };
}

// ============================================================================
// Utility Hooks
// ============================================================================

/**
 * Hook to get just the viewBox from a layout
 */
export function useLayoutViewBox(layoutId: string): string {
  const { viewBox } = useResolvedLayout(layoutId);
  return viewBox;
}

/**
 * Hook to get a single position from a layout
 */
export function useLayoutPosition(
  layoutId: string,
  location: MechLocation,
): ResolvedPosition | undefined {
  const { getPosition } = useResolvedLayout(layoutId);
  return getPosition(location);
}

/**
 * Hook to check if a layout configuration exists
 */
export function useLayoutExists(layoutId: string): boolean {
  return useMemo(() => {
    return getLayoutConfig(layoutId) !== undefined;
  }, [layoutId]);
}

// ============================================================================
// Direct Functions (for non-React contexts)
// ============================================================================

/**
 * Resolve a layout by ID (non-hook version)
 */
export function resolveLayoutById(
  layoutId: string,
  options: LayoutResolveOptions = {},
): ResolvedLayout | null {
  const config = getLayoutConfig(layoutId);
  if (!config) {
    return null;
  }
  return resolveLayout(config, options);
}

/**
 * Validate a layout by ID (non-hook version)
 */
export function validateLayoutById(layoutId: string): ValidationResult | null {
  const config = getLayoutConfig(layoutId);
  if (!config) {
    return null;
  }
  const layout = resolveLayout(config);
  return validateLayout(layout, config);
}
