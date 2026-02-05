/**
 * Vehicle Customizer Component
 *
 * Main component for customizing combat vehicles and VTOLs.
 * Provides tabbed interface for structure, armor, equipment, and turret configuration.
 *
 * @spec openspec/changes/add-multi-unit-type-support/tasks.md Phase 3
 */

import React, { useState, useCallback, useMemo } from 'react';
import { StoreApi } from 'zustand';

// Store
import { VehicleStoreContext, VehicleStore } from '@/stores/useVehicleStore';

import { VehicleArmorTab } from './VehicleArmorTab';
import { VehicleDiagram } from './VehicleDiagram';
import { VehicleEquipmentTab } from './VehicleEquipmentTab';
import { VehicleStatusBar } from './VehicleStatusBar';
// Components
import { VehicleStructureTab } from './VehicleStructureTab';
import { VehicleTurretTab } from './VehicleTurretTab';

// =============================================================================
// Types
// =============================================================================

export type VehicleTabId = 'structure' | 'armor' | 'equipment' | 'turret';

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

interface TabDefinition {
  id: VehicleTabId;
  label: string;
  shortLabel: string;
}

// =============================================================================
// Constants
// =============================================================================

const VEHICLE_TABS: TabDefinition[] = [
  { id: 'structure', label: 'Structure & Engine', shortLabel: 'Structure' },
  { id: 'armor', label: 'Armor Configuration', shortLabel: 'Armor' },
  { id: 'equipment', label: 'Equipment', shortLabel: 'Equipment' },
  { id: 'turret', label: 'Turret', shortLabel: 'Turret' },
];

// =============================================================================
// Tab Button Component
// =============================================================================

interface TabButtonProps {
  tab: TabDefinition;
  isActive: boolean;
  onClick: () => void;
}

function TabButton({
  tab,
  isActive,
  onClick,
}: TabButtonProps): React.ReactElement {
  return (
    <button
      onClick={onClick}
      data-testid={`vehicle-tab-${tab.id}`}
      className={`px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors ${
        isActive
          ? 'bg-accent border-accent border-b-2 text-white'
          : 'text-text-theme-secondary hover:bg-surface-raised/50 hover:text-white'
      } `}
    >
      <span className="hidden sm:inline">{tab.label}</span>
      <span className="sm:hidden">{tab.shortLabel}</span>
    </button>
  );
}

// =============================================================================
// Main Component
// =============================================================================

/**
 * Main vehicle customizer with tabbed interface
 */
export function VehicleCustomizer({
  store,
  initialTab = 'structure',
  onTabChange,
  readOnly = false,
  className = '',
}: VehicleCustomizerProps): React.ReactElement {
  // Local state for active tab
  const [activeTab, setActiveTab] = useState<VehicleTabId>(initialTab);

  // Handle tab change
  const handleTabChange = useCallback(
    (tabId: VehicleTabId) => {
      setActiveTab(tabId);
      onTabChange?.(tabId);
    },
    [onTabChange],
  );

  // Get current tab content
  const tabContent = useMemo(() => {
    switch (activeTab) {
      case 'structure':
        return <VehicleStructureTab readOnly={readOnly} />;
      case 'armor':
        return <VehicleArmorTab readOnly={readOnly} />;
      case 'equipment':
        return <VehicleEquipmentTab readOnly={readOnly} className="h-full" />;
      case 'turret':
        return <VehicleTurretTab readOnly={readOnly} />;
      default:
        return <VehicleStructureTab readOnly={readOnly} />;
    }
  }, [activeTab, readOnly]);

  return (
    <VehicleStoreContext.Provider value={store}>
      <div
        className={`flex h-full flex-col ${className}`}
        data-testid="vehicle-customizer"
      >
        {/* Status Bar */}
        <VehicleStatusBar />

        {/* Tab Bar */}
        <div
          className="border-border-theme bg-surface-base flex items-center overflow-x-auto border-b"
          data-testid="vehicle-tab-bar"
        >
          {VEHICLE_TABS.map((tab) => (
            <TabButton
              key={tab.id}
              tab={tab}
              isActive={activeTab === tab.id}
              onClick={() => handleTabChange(tab.id)}
            />
          ))}
        </div>

        {/* Main Content Area */}
        <div className="flex min-h-0 flex-1 overflow-hidden">
          {/* Tab Content */}
          <div
            className="flex-1 overflow-auto p-4"
            data-testid="vehicle-tab-content"
          >
            {tabContent}
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
