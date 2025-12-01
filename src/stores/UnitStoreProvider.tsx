/**
 * Unit Store Provider
 * 
 * React component that provides the active unit's store via context.
 * Child components can use useUnitStore() to access the current unit's state.
 * 
 * @spec openspec/changes/add-customizer-ui-components/specs/unit-store-architecture/spec.md
 */

import React, { useEffect, useState, useRef } from 'react';
import { StoreApi } from 'zustand';
import { UnitStoreContext } from './useUnitStore';
import type { UnitStore } from './useUnitStore';
import { TechBase } from '@/types/enums/TechBase';

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

// Type for the registry module
type RegistryModule = typeof import('./unitStoreRegistry');

// =============================================================================
// Provider Component
// =============================================================================

/**
 * Provides the active unit's store to child components
 * 
 * Key design decisions:
 * - Receives activeTab as prop (not from hooks) to avoid hook ordering issues
 * - Lazily imports unitStoreRegistry to avoid SSR module evaluation
 * - Uses refs to prevent re-render loops during registry loading
 */
export function UnitStoreProvider({
  children,
  activeTab,
  fallback,
}: UnitStoreProviderProps) {
  // Track the current store
  const [currentStore, setCurrentStore] = useState<StoreApi<UnitStore> | null>(null);
  
  // Track registry loading state
  const [registryReady, setRegistryReady] = useState(false);
  const registryRef = useRef<RegistryModule | null>(null);
  const loadingRef = useRef(false);
  
  // Load the registry module once on mount
  useEffect(() => {
    // Prevent double-loading
    if (loadingRef.current || registryReady) return;
    loadingRef.current = true;
    
    import('./unitStoreRegistry')
      .then((module) => {
        registryRef.current = module;
        setRegistryReady(true);
      })
      .catch((err) => {
        console.error('Failed to load unit store registry:', err);
        loadingRef.current = false;
      });
  }, [registryReady]);
  
  // Create/update store when activeTab changes
  useEffect(() => {
    // Wait for registry to be ready
    if (!registryReady || !registryRef.current) {
      return;
    }
    
    // No active tab - clear the store
    if (!activeTab) {
      setCurrentStore(null);
      return;
    }
    
    // Get or create the store for this tab
    try {
      const store = registryRef.current.hydrateOrCreateUnit(activeTab.id, {
        name: activeTab.name,
        tonnage: activeTab.tonnage,
        techBase: activeTab.techBase,
      });
      setCurrentStore(store);
    } catch (e) {
      console.error('Error creating unit store:', e);
      setCurrentStore(null);
    }
  }, [activeTab?.id, activeTab?.name, activeTab?.tonnage, activeTab?.techBase, registryReady]);
  
  // Loading state - registry not yet loaded
  if (!registryReady) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-slate-400">Loading unit system...</div>
      </div>
    );
  }
  
  // No active tab selected - show fallback
  if (!activeTab) {
    return <>{fallback}</>;
  }
  
  // Active tab but store not yet created - brief loading
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
