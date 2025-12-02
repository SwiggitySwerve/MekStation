/**
 * Multi-Unit Tabs Component
 * 
 * Browser-like tabs for editing multiple units.
 * Uses the new TabManagerStore for tab lifecycle management.
 * Integrates with URL routing for shareable links.
 * 
 * @spec openspec/specs/multi-unit-tabs/spec.md
 * @spec openspec/specs/unit-store-architecture/spec.md
 */

import React, { useCallback, useMemo, useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { TabBar } from './TabBar';
import { NewTabModal } from './NewTabModal';
import { UnsavedChangesDialog } from '@/components/customizer/dialogs/UnsavedChangesDialog';
import { SaveUnitDialog } from '@/components/customizer/dialogs/SaveUnitDialog';
import { UnitLoadDialog } from '@/components/customizer/dialogs/UnitLoadDialog';
import { useTabManagerStore, UNIT_TEMPLATES, TabInfo } from '@/stores/useTabManagerStore';
import { IUnitIndexEntry } from '@/services/common/types';
import { getUnitStore } from '@/stores/unitStoreRegistry';
import { customUnitApiService } from '@/services/units/CustomUnitApiService';
import { TechBase } from '@/types/enums/TechBase';
import { DEFAULT_TAB } from '@/hooks/useCustomizerRouter';

// =============================================================================
// Types
// =============================================================================

interface MultiUnitTabsProps {
  /** Content to render for the active tab */
  children: React.ReactNode;
  /** Additional CSS classes */
  className?: string;
}

interface CloseDialogState {
  isOpen: boolean;
  tabId: string | null;
  tabName: string;
}

interface SaveDialogState {
  isOpen: boolean;
  tabId: string | null;
  chassis: string;
  variant: string;
  closeAfterSave: boolean;
}

// =============================================================================
// Component
// =============================================================================

/**
 * Multi-unit tab container with tab bar and content area
 */
export function MultiUnitTabs({
  children,
  className = '',
}: MultiUnitTabsProps) {
  const router = useRouter();
  
  // Close dialog state
  const [closeDialog, setCloseDialog] = useState<CloseDialogState>({
    isOpen: false,
    tabId: null,
    tabName: '',
  });
  
  // Save dialog state
  const [saveDialog, setSaveDialog] = useState<SaveDialogState>({
    isOpen: false,
    tabId: null,
    chassis: '',
    variant: '',
    closeAfterSave: false,
  });
  
  // Load dialog state
  const [isLoadDialogOpen, setIsLoadDialogOpen] = useState(false);
  
  // Use individual selectors for primitives and stable references
  // This avoids creating new objects on each render
  const tabs = useTabManagerStore((s) => s.tabs);
  const activeTabId = useTabManagerStore((s) => s.activeTabId);
  const isLoading = useTabManagerStore((s) => s.isLoading);
  const isNewTabModalOpen = useTabManagerStore((s) => s.isNewTabModalOpen);
  
  // Actions are stable references from the store
  const storeSelectTab = useTabManagerStore((s) => s.selectTab);
  const storeCloseTab = useTabManagerStore((s) => s.closeTab);
  const renameTab = useTabManagerStore((s) => s.renameTab);
  const createTab = useTabManagerStore((s) => s.createTab);
  const openNewTabModal = useTabManagerStore((s) => s.openNewTabModal);
  const closeNewTabModal = useTabManagerStore((s) => s.closeNewTabModal);
  
  // Select tab with URL navigation
  const selectTab = useCallback((tabId: string) => {
    storeSelectTab(tabId);
    // Navigate to the unit URL
    router.push(`/customizer/${tabId}/${DEFAULT_TAB}`, undefined, { shallow: true });
  }, [storeSelectTab, router]);
  
  // Actually close the tab and navigate
  const performCloseTab = useCallback((tabId: string) => {
    // Close the tab in the store
    storeCloseTab(tabId);
    
    // Get updated state after closing
    const newState = useTabManagerStore.getState();
    
    if (newState.tabs.length === 0) {
      // All tabs closed - navigate to index (empty state)
      router.push('/customizer', undefined, { shallow: true });
    } else if (newState.activeTabId && newState.activeTabId !== tabId) {
      // A different tab is now active - navigate to it
      router.push(`/customizer/${newState.activeTabId}/${DEFAULT_TAB}`, undefined, { shallow: true });
    }
  }, [storeCloseTab, router]);
  
  // Close tab with unsaved changes check
  const closeTab = useCallback((tabId: string) => {
    // Check if the unit has unsaved changes
    const unitStore = getUnitStore(tabId);
    const isModified = unitStore?.getState().isModified ?? false;
    const tabInfo = tabs.find((t) => t.id === tabId);
    
    if (isModified) {
      // Show confirmation dialog
      setCloseDialog({
        isOpen: true,
        tabId,
        tabName: tabInfo?.name ?? 'Unknown Unit',
      });
    } else {
      // No unsaved changes, close directly
      performCloseTab(tabId);
    }
  }, [tabs, performCloseTab]);
  
  // Dialog handlers
  const handleCloseDialogCancel = useCallback(() => {
    setCloseDialog({ isOpen: false, tabId: null, tabName: '' });
  }, []);
  
  const handleCloseDialogDiscard = useCallback(() => {
    if (closeDialog.tabId) {
      performCloseTab(closeDialog.tabId);
    }
    setCloseDialog({ isOpen: false, tabId: null, tabName: '' });
  }, [closeDialog.tabId, performCloseTab]);
  
  const handleCloseDialogSave = useCallback(() => {
    // Get unit data for save dialog
    if (closeDialog.tabId) {
      const unitStore = getUnitStore(closeDialog.tabId);
      if (unitStore) {
        const state = unitStore.getState();
        // Close the unsaved changes dialog and open save dialog
        setCloseDialog({ isOpen: false, tabId: null, tabName: '' });
        setSaveDialog({
          isOpen: true,
          tabId: closeDialog.tabId,
          chassis: state.name || 'New Mech',
          variant: '', // User needs to provide variant
          closeAfterSave: true,
        });
        return;
      }
    }
    setCloseDialog({ isOpen: false, tabId: null, tabName: '' });
  }, [closeDialog.tabId]);
  
  // Handle save dialog cancel
  const handleSaveDialogCancel = useCallback(() => {
    setSaveDialog({
      isOpen: false,
      tabId: null,
      chassis: '',
      variant: '',
      closeAfterSave: false,
    });
  }, []);
  
  // Handle save dialog save
  const handleSaveDialogSave = useCallback(async (
    chassis: string,
    variant: string,
    overwriteId?: string
  ) => {
    if (!saveDialog.tabId) return;
    
    const unitStore = getUnitStore(saveDialog.tabId);
    if (!unitStore) return;
    
    const state = unitStore.getState();
    
    try {
      // Build the unit data for saving
      const unitData = {
        id: overwriteId || saveDialog.tabId,
        chassis,
        variant,
        tonnage: state.tonnage,
        techBase: state.techBase,
        era: 'SUCCESSION_WARS', // TODO: Get from state when available
        unitType: 'BattleMech' as const,
        // Add other unit data as needed
        engineType: state.engineType,
        engineRating: state.engineRating,
        gyroType: state.gyroType,
        internalStructureType: state.internalStructureType,
        cockpitType: state.cockpitType,
        heatSinkType: state.heatSinkType,
        heatSinkCount: state.heatSinkCount,
        armorType: state.armorType,
        armorAllocation: state.armorAllocation,
      };
      
      // Save the unit using the API
      let result;
      if (overwriteId) {
        // Update existing unit
        result = await customUnitApiService.save(overwriteId, unitData as never);
      } else {
        // Create new unit
        result = await customUnitApiService.create(unitData as never, chassis, variant);
      }
      
      if (!result.success) {
        console.error('Failed to save unit:', result.error);
        // TODO: Show error toast/notification
        return;
      }
      
      // Mark as not modified
      state.markModified(false);
      
      // Update tab name to match saved name
      renameTab(saveDialog.tabId, `${chassis} ${variant}`);
      
      // Close save dialog
      const shouldClose = saveDialog.closeAfterSave;
      const tabIdToClose = saveDialog.tabId;
      
      setSaveDialog({
        isOpen: false,
        tabId: null,
        chassis: '',
        variant: '',
        closeAfterSave: false,
      });
      
      // Close tab if requested
      if (shouldClose) {
        performCloseTab(tabIdToClose);
      }
    } catch (error) {
      console.error('Failed to save unit:', error);
      // TODO: Show error toast/notification
    }
  }, [saveDialog.tabId, saveDialog.closeAfterSave, renameTab, performCloseTab]);
  
  // Open load dialog
  const openLoadDialog = useCallback(() => {
    setIsLoadDialogOpen(true);
  }, []);
  
  // Handle unit load from dialog
  const handleLoadUnit = useCallback((unit: IUnitIndexEntry) => {
    // Find matching template for tonnage or use defaults
    const baseTemplate = UNIT_TEMPLATES.find(t => t.tonnage === unit.tonnage) || UNIT_TEMPLATES[1];
    
    // Create a template with the loaded unit's data
    const template = {
      ...baseTemplate,
      name: `${unit.chassis} ${unit.variant}`,
      tonnage: unit.tonnage,
      techBase: unit.techBase,
    };
    const newTabId = createTab(template);
    
    // Navigate to the new unit
    router.push(`/customizer/${newTabId}/${DEFAULT_TAB}`, undefined, { shallow: true });
    
    // Close the dialog
    setIsLoadDialogOpen(false);
  }, [createTab, router]);
  
  // Create unit from template with URL navigation
  const createNewUnit = useCallback((tonnage: number, techBase: TechBase = TechBase.INNER_SPHERE) => {
    const template = UNIT_TEMPLATES.find(t => t.tonnage === tonnage) || UNIT_TEMPLATES[1];
    const templateWithTechBase = { ...template, techBase };
    const newTabId = createTab(templateWithTechBase);
    // Navigate to the new unit URL
    router.push(`/customizer/${newTabId}/${DEFAULT_TAB}`, undefined, { shallow: true });
    return newTabId;
  }, [createTab, router]);
  
  // Transform tabs to format expected by TabBar
  // Read name and isModified directly from unit stores for live updates
  const tabBarTabs = useMemo(() => 
    tabs.map((tab) => {
      const unitStore = getUnitStore(tab.id);
      const state = unitStore?.getState();
      return {
        id: tab.id,
        // Use name from unit store for live updates when chassis/model changes
        name: state?.name ?? tab.name,
        isModified: state?.isModified ?? false,
      };
    }),
    [tabs]
  );
  
  // Keyboard shortcuts: Ctrl+N (new unit), Ctrl+O (load unit)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check for Ctrl (or Cmd on Mac) modifier
      if (e.ctrlKey || e.metaKey) {
        if (e.key === 'n' || e.key === 'N') {
          e.preventDefault();
          openNewTabModal();
        } else if (e.key === 'o' || e.key === 'O') {
          e.preventDefault();
          openLoadDialog();
        }
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [openNewTabModal, openLoadDialog]);
  
  // Loading state - show while Zustand is hydrating
  if (isLoading) {
    return (
      <div className={`flex items-center justify-center h-full ${className}`}>
        <div className="text-slate-400">Loading...</div>
      </div>
    );
  }
  
  // Empty state - no tabs
  if (tabs.length === 0) {
    return (
      <div className={`flex flex-col items-center justify-center h-full ${className}`}>
        <div className="text-center max-w-md">
          {/* Icon */}
          <div className="w-20 h-20 mx-auto mb-6 bg-slate-800 rounded-2xl flex items-center justify-center">
            <svg className="w-10 h-10 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
            </svg>
          </div>
          
          <h2 className="text-2xl font-bold text-white mb-2">No Units Open</h2>
          <p className="text-slate-400 mb-8">Create a new BattleMech from scratch or load an existing unit from the library.</p>
          
          {/* Quick action buttons - using same icons as toolbar */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={openNewTabModal}
              className="flex items-center justify-center gap-2 px-6 py-3 bg-amber-600 hover:bg-amber-500 text-white font-medium rounded-lg transition-colors"
            >
              {/* Document icon - same as toolbar */}
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              New Unit
            </button>
            
            <button
              onClick={openLoadDialog}
              className="flex items-center justify-center gap-2 px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white font-medium rounded-lg transition-colors"
            >
              {/* Folder icon - same as toolbar */}
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 19a2 2 0 01-2-2V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1M5 19h14a2 2 0 002-2v-5a2 2 0 00-2-2H9a2 2 0 00-2 2v5a2 2 0 01-2 2z" />
              </svg>
              Load from Library
            </button>
          </div>
        </div>
        
        <NewTabModal
          isOpen={isNewTabModalOpen}
          onClose={closeNewTabModal}
          onCreateUnit={createNewUnit}
        />
        
        {/* Load unit dialog - also available from empty state */}
        <UnitLoadDialog
          isOpen={isLoadDialogOpen}
          onLoadUnit={handleLoadUnit}
          onCancel={() => setIsLoadDialogOpen(false)}
        />
      </div>
    );
  }
  
  return (
    <div className={`flex flex-col h-full ${className}`}>
      {/* Tab bar */}
      <TabBar
        tabs={tabBarTabs}
        activeTabId={activeTabId}
        onSelectTab={selectTab}
        onCloseTab={closeTab}
        onRenameTab={renameTab}
        onNewTab={openNewTabModal}
        onLoadUnit={openLoadDialog}
      />
      
      {/* Tab content */}
      <div className="flex-1 min-h-0 overflow-hidden">
        {children}
      </div>
      
      {/* New tab modal */}
      <NewTabModal
        isOpen={isNewTabModalOpen}
        onClose={closeNewTabModal}
        onCreateUnit={createNewUnit}
      />
      
      {/* Unsaved changes dialog */}
      <UnsavedChangesDialog
        isOpen={closeDialog.isOpen}
        unitName={closeDialog.tabName}
        onClose={handleCloseDialogCancel}
        onDiscard={handleCloseDialogDiscard}
        onSave={handleCloseDialogSave}
      />
      
      {/* Save unit dialog */}
      <SaveUnitDialog
        isOpen={saveDialog.isOpen}
        initialChassis={saveDialog.chassis}
        initialVariant={saveDialog.variant}
        currentUnitId={saveDialog.tabId ?? undefined}
        onSave={handleSaveDialogSave}
        onCancel={handleSaveDialogCancel}
      />
      
      {/* Load unit dialog */}
      <UnitLoadDialog
        isOpen={isLoadDialogOpen}
        onLoadUnit={handleLoadUnit}
        onCancel={() => setIsLoadDialogOpen(false)}
      />
    </div>
  );
}
