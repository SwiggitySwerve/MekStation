/**
 * Vehicle Customizer Component
 *
 * Main component for customizing combat vehicles and VTOLs.
 * Tab set is data-driven from the VEHICLE_TABS registry — construction
 * proposals wire real content by updating the registry, not this file.
 *
 * @spec openspec/changes/add-per-type-customizer-tabs/specs/multi-unit-tabs/spec.md
 * @spec openspec/changes/add-multi-unit-type-support/tasks.md Phase 3
 */

import React from 'react';
import { StoreApi } from 'zustand';

import { VEHICLE_TABS } from '@/components/customizer/shared/tabRegistry';
import { CustomizerTabs } from '@/components/customizer/tabs/CustomizerTabs';
import { useCustomizerTabShell } from '@/components/customizer/tabs/useCustomizerTabShell';
import { VehicleStoreContext, VehicleStore } from '@/stores/useVehicleStore';

import { VehicleDiagram } from './VehicleDiagram';
import { VehicleStatusBar } from './VehicleStatusBar';

// =============================================================================
// Types
// =============================================================================

/** Tab ids available in the vehicle customizer */
export type VehicleTabId =
  | 'overview'
  | 'structure'
  | 'armor'
  | 'turret'
  | 'equipment'
  | 'preview'
  | 'fluff';

interface VehicleCustomizerProps {
  /** Vehicle store instance */
  store: StoreApi<VehicleStore>;
  /** Initial tab to display */
  initialTab?: VehicleTabId;
  /** Callback when tab changes */
  onTabChange?: (tabId: VehicleTabId) => void;
  /** Read-only mode */
  readOnly?: boolean;
  /** Additional CSS classes */
  className?: string;
}

// =============================================================================
// Main Component
// =============================================================================

/**
 * Main vehicle customizer with registry-driven tabbed interface.
 *
 * All vehicle tabs are defined in VEHICLE_TABS (tabRegistry.ts).
 * This component only handles layout, tab-state, and panel rendering.
 */
export function VehicleCustomizer({
  store,
  initialTab = 'structure',
  onTabChange,
  readOnly = false,
  className = '',
}: VehicleCustomizerProps): React.ReactElement {
  // Vehicle tabs have no visibleWhen predicates — pass an empty state object
  const { tabBarProps, activeTab, TabComponent } = useCustomizerTabShell({
    specs: VEHICLE_TABS,
    state: {},
    initialTab,
    onTabChange,
  });

  return (
    <VehicleStoreContext.Provider value={store}>
      <div
        className={`flex h-full flex-col ${className}`}
        data-testid="vehicle-customizer"
      >
        {/* Status Bar */}
        <VehicleStatusBar />

        {/* Tab Bar */}
        <CustomizerTabs
          {...tabBarProps}
          readOnly={readOnly}
          data-testid="vehicle-tab-bar"
        />

        {/* Main Content Area */}
        <div className="flex min-h-0 flex-1 overflow-hidden">
          {/* Tab Content */}
          <div
            className="flex-1 overflow-auto p-4"
            role="tabpanel"
            id={`tabpanel-${activeTab}`}
            aria-labelledby={activeTab}
            data-testid="vehicle-tab-content"
          >
            {TabComponent && <TabComponent readOnly={readOnly} />}
          </div>

          {/* Vehicle Diagram Sidebar (visible on large screens) */}
          <div className="border-border-theme bg-surface-base hidden w-64 overflow-auto border-l p-4 lg:block">
            <h3 className="mb-3 text-sm font-semibold text-white">
              Vehicle Overview
            </h3>
            <VehicleDiagram />
          </div>
        </div>
      </div>
    </VehicleStoreContext.Provider>
  );
}

export default VehicleCustomizer;
