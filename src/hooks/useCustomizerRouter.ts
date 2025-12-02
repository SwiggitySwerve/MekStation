/**
 * Customizer Router Hook
 * 
 * Provides URL-based routing for the unit customizer.
 * Enables shareable URLs and direct navigation to specific units/tabs.
 * 
 * URL Structure:
 * - /customizer - Main customizer (redirects to active unit or shows empty state)
 * - /customizer/[unitId] - Specific unit (defaults to structure tab)
 * - /customizer/[unitId]/[tabId] - Specific unit and tab
 * 
 * @spec openspec/specs/customizer-tabs/spec.md
 */

import { useRouter } from 'next/router';
import { useCallback, useMemo, useEffect, useRef } from 'react';
import { isValidUnitId } from '@/utils/uuid';

// =============================================================================
// Types
// =============================================================================

/**
 * Valid customizer tab identifiers
 */
export type CustomizerTabId = 
  | 'overview'
  | 'structure'
  | 'armor'
  | 'weapons'
  | 'equipment'
  | 'criticals'
  | 'fluff';

/**
 * All valid tab IDs for validation
 */
export const VALID_TAB_IDS: readonly CustomizerTabId[] = [
  'overview',
  'structure',
  'armor',
  'weapons',
  'equipment',
  'criticals',
  'fluff',
] as const;

/**
 * Default tab when none specified
 */
export const DEFAULT_TAB: CustomizerTabId = 'structure';

/**
 * Parsed route parameters
 */
export interface CustomizerRouteParams {
  /** Unit UUID from URL */
  unitId: string | null;
  /** Tab ID from URL */
  tabId: CustomizerTabId;
  /** Whether the route is valid */
  isValid: boolean;
  /** Whether we're on the index page (no unit specified) */
  isIndex: boolean;
}

/**
 * Router actions for navigation
 */
export interface CustomizerRouterActions {
  /** Navigate to a specific unit */
  navigateToUnit: (unitId: string, tabId?: CustomizerTabId) => void;
  /** Navigate to a specific tab (keeps current unit) */
  navigateToTab: (tabId: CustomizerTabId) => void;
  /** Navigate to the customizer index */
  navigateToIndex: () => void;
  /** Update URL without navigation (for syncing state) */
  syncUrl: (unitId: string, tabId: CustomizerTabId) => void;
}

/**
 * Combined hook return type
 */
export interface CustomizerRouterResult extends CustomizerRouteParams, CustomizerRouterActions {}

/**
 * Options for the customizer router hook
 */
export interface UseCustomizerRouterOptions {
  /**
   * Fallback unit ID to use when URL has no unit ID.
   * Typically the active tab ID from the tab manager store.
   * Enables tab navigation when on /customizer index page.
   */
  fallbackUnitId?: string | null;
}

// =============================================================================
// Validation Helpers
// =============================================================================

/**
 * Check if a string is a valid tab ID
 */
export function isValidTabId(id: string): id is CustomizerTabId {
  return VALID_TAB_IDS.includes(id as CustomizerTabId);
}

/**
 * Parse and validate tab ID from route
 */
function parseTabId(rawTabId: string | string[] | undefined): CustomizerTabId {
  if (!rawTabId) return DEFAULT_TAB;
  
  const tabId = Array.isArray(rawTabId) ? rawTabId[0] : rawTabId;
  
  if (isValidTabId(tabId)) {
    return tabId;
  }
  
  return DEFAULT_TAB;
}

/**
 * Parse and validate unit ID from route
 */
function parseUnitId(rawUnitId: string | string[] | undefined): string | null {
  if (!rawUnitId) return null;
  
  const unitId = Array.isArray(rawUnitId) ? rawUnitId[0] : rawUnitId;
  
  // Validate UUID format
  if (isValidUnitId(unitId)) {
    return unitId;
  }
  
  return null;
}

// =============================================================================
// Hook Implementation
// =============================================================================

/**
 * Hook for managing customizer URL routing
 * 
 * Usage:
 * ```tsx
 * // Basic usage
 * const { unitId, tabId, navigateToUnit, navigateToTab } = useCustomizerRouter();
 * 
 * // With fallback for index page navigation
 * const { navigateToTab } = useCustomizerRouter({ fallbackUnitId: activeTabId });
 * 
 * // Navigate to a specific unit
 * navigateToUnit('uuid-here', 'armor');
 * 
 * // Change tabs (stays on current unit, or uses fallback)
 * navigateToTab('weapons');
 * ```
 */
export function useCustomizerRouter(
  options: UseCustomizerRouterOptions = {}
): CustomizerRouterResult {
  const { fallbackUnitId } = options;
  const router = useRouter();
  const isNavigatingRef = useRef(false);
  
  // Parse route parameters
  const params = useMemo((): CustomizerRouteParams => {
    // Handle catch-all route: /customizer/[[...slug]]
    const { slug } = router.query;
    
    if (!slug || !Array.isArray(slug) || slug.length === 0) {
      // /customizer - index page
      return {
        unitId: null,
        tabId: DEFAULT_TAB,
        isValid: true,
        isIndex: true,
      };
    }
    
    // /customizer/[unitId] or /customizer/[unitId]/[tabId]
    const rawUnitId = slug[0];
    const rawTabId = slug[1];
    
    const unitId = parseUnitId(rawUnitId);
    const tabId = parseTabId(rawTabId);
    
    // Invalid unit ID in URL
    if (!unitId) {
      return {
        unitId: null,
        tabId: DEFAULT_TAB,
        isValid: false,
        isIndex: false,
      };
    }
    
    return {
      unitId,
      tabId,
      isValid: true,
      isIndex: false,
    };
  }, [router.query]);
  
  // ==========================================================================
  // Navigation Actions
  // ==========================================================================
  
  const navigateToUnit = useCallback((unitId: string, tabId: CustomizerTabId = DEFAULT_TAB) => {
    if (!isValidUnitId(unitId)) {
      console.warn('navigateToUnit: Invalid unit ID', unitId);
      return;
    }
    
    isNavigatingRef.current = true;
    router.push(`/customizer/${unitId}/${tabId}`, undefined, { shallow: true });
  }, [router]);
  
  const navigateToTab = useCallback((tabId: CustomizerTabId) => {
    // Use URL unit ID first, then fallback to provided unit ID (e.g., active tab)
    const effectiveUnitId = params.unitId || (fallbackUnitId && isValidUnitId(fallbackUnitId) ? fallbackUnitId : null);
    
    if (!effectiveUnitId) {
      console.warn('navigateToTab: No current unit and no valid fallback');
      return;
    }
    
    if (!isValidTabId(tabId)) {
      console.warn('navigateToTab: Invalid tab ID', tabId);
      return;
    }
    
    isNavigatingRef.current = true;
    router.push(`/customizer/${effectiveUnitId}/${tabId}`, undefined, { shallow: true });
  }, [router, params.unitId, fallbackUnitId]);
  
  const navigateToIndex = useCallback(() => {
    isNavigatingRef.current = true;
    router.push('/customizer', undefined, { shallow: true });
  }, [router]);
  
  const syncUrl = useCallback((unitId: string, tabId: CustomizerTabId) => {
    if (!isValidUnitId(unitId) || !isValidTabId(tabId)) {
      return;
    }
    
    // Only sync if the URL doesn't already match
    if (params.unitId === unitId && params.tabId === tabId) {
      return;
    }
    
    isNavigatingRef.current = true;
    router.replace(`/customizer/${unitId}/${tabId}`, undefined, { shallow: true });
  }, [router, params.unitId, params.tabId]);
  
  return {
    ...params,
    navigateToUnit,
    navigateToTab,
    navigateToIndex,
    syncUrl,
  };
}

/**
 * Build a customizer URL for a unit
 */
export function buildCustomizerUrl(unitId: string, tabId?: CustomizerTabId): string {
  if (tabId && isValidTabId(tabId)) {
    return `/customizer/${unitId}/${tabId}`;
  }
  return `/customizer/${unitId}`;
}

/**
 * Build a shareable URL for the current origin
 */
export function buildShareableUrl(unitId: string, tabId?: CustomizerTabId): string {
  if (typeof window === 'undefined') {
    return buildCustomizerUrl(unitId, tabId);
  }
  return `${window.location.origin}${buildCustomizerUrl(unitId, tabId)}`;
}

