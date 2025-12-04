/**
 * Unit Store Provider
 * 
 * React component that provides the active unit's store via context.
 * Child components can use useUnitStore() to access the current unit's state.
 * 
 * @spec openspec/specs/unit-store-architecture/spec.md
 */

import React, { useMemo } from 'react';
import { StoreApi } from 'zustand';
import { UnitStoreContext } from './useUnitStore';
import type { UnitStore } from './useUnitStore';
import { TechBase } from '@/types/enums/TechBase';
// Registry has SSR guards internally, safe to import directly
import { hydrateOrCreateUnit } from './unitStoreRegistry';

// =============================================================================
// Types
// =============================================================================

export interface ActiveTabInfo {
  id: string;
  name: string;
  tonnage: number;
  techBase: TechBase;
}

interface UnitStoreProviderProps {
  children: React.ReactNode;
  /** The currently active tab - passed from parent to avoid hook ordering issues */
  activeTab: ActiveTabInfo | null;
  /** Fallback UI when no unit is selected */
  fallback?: React.ReactNode;
}

// =============================================================================
// Provider Component
// =============================================================================

/**
 * Provides the active unit's store to child components
 * 
 * Key design decisions:
 * - Receives activeTab as prop (not from hooks) to avoid hook ordering issues
 * - Registry functions have internal SSR guards
 * - Uses useMemo to create store only when activeTab changes
 */
export function UnitStoreProvider({
  children,
  activeTab,
  fallback,
}: UnitStoreProviderProps): React.ReactElement {
  // Create/get store based on activeTab
  // useMemo ensures we don't recreate on every render
  const currentStore = useMemo<StoreApi<UnitStore> | null>(() => {
    // No active tab - no store
    if (!activeTab) {
      return null;
    }
    
    // SSR check - don't create stores on server
    if (typeof window === 'undefined') {
      return null;
    }
    
    // Get or create the store for this tab
    try {
      return hydrateOrCreateUnit(activeTab.id, {
        name: activeTab.name,
        tonnage: activeTab.tonnage,
        techBase: activeTab.techBase,
      });
    } catch (e) {
      console.error('Error creating unit store:', e);
      return null;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- only recreate store when specific tab properties change, not on every activeTab reference change
  }, [activeTab?.id, activeTab?.name, activeTab?.tonnage, activeTab?.techBase]);
  
  // No active tab selected - show fallback
  if (!activeTab) {
    return <>{fallback}</>;
  }
  
  // Store not yet created (SSR or error)
  if (!currentStore) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-slate-400">Loading unit...</div>
      </div>
    );
  }
  
  // Provide store to children
  return (
    <UnitStoreContext.Provider value={currentStore}>
      {children}
    </UnitStoreContext.Provider>
  );
}

/**
 * Hook to check if we're inside a UnitStoreProvider with a valid store
 */
export function useHasUnitStore(): boolean {
  const store = React.useContext(UnitStoreContext);
  return store !== null;
}
