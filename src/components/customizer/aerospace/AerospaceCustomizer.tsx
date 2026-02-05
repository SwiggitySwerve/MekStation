/**
 * Aerospace Customizer Component
 *
 * Main component for customizing aerospace fighters and conventional aircraft.
 * Provides tabbed interface for structure, armor, and equipment configuration.
 *
 * @spec openspec/changes/add-multi-unit-type-support/tasks.md Phase 4
 */

import React, { useState, useCallback, useMemo } from 'react';
import { StoreApi } from 'zustand';

// Store
import {
  AerospaceStoreContext,
  AerospaceStore,
} from '@/stores/useAerospaceStore';

import { AerospaceArmorTab } from './AerospaceArmorTab';
import { AerospaceDiagram } from './AerospaceDiagram';
import { AerospaceEquipmentTab } from './AerospaceEquipmentTab';
import { AerospaceStatusBar } from './AerospaceStatusBar';
// Components
import { AerospaceStructureTab } from './AerospaceStructureTab';

// =============================================================================
// Types
// =============================================================================

export type AerospaceTabId = 'structure' | 'armor' | 'equipment';

interface AerospaceCustomizerProps {
  /** Aerospace store instance */
  store: StoreApi<AerospaceStore>;
  /** Initial tab to display */
  initialTab?: AerospaceTabId;
  /** Callback when tab changes */
  onTabChange?: (tabId: AerospaceTabId) => void;
  /** Read-only mode */
  readOnly?: boolean;
  /** Additional CSS classes */
  className?: string;
}

interface TabDefinition {
  id: AerospaceTabId;
  label: string;
  shortLabel: string;
}

// =============================================================================
// Constants
// =============================================================================

const AEROSPACE_TABS: TabDefinition[] = [
  { id: 'structure', label: 'Structure & Engine', shortLabel: 'Structure' },
  { id: 'armor', label: 'Armor Configuration', shortLabel: 'Armor' },
  { id: 'equipment', label: 'Weapons & Equipment', shortLabel: 'Equipment' },
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
      className={`px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors ${
        isActive
          ? 'bg-accent border-accent border-b-2 text-white'
          : 'text-text-theme-secondary hover:bg-surface-raised/50 hover:text-white'
      } `}
      data-testid={`aerospace-tab-${tab.id}`}
      data-active={isActive}
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
 * Main aerospace customizer with tabbed interface
 */
export function AerospaceCustomizer({
  store,
  initialTab = 'structure',
  onTabChange,
  readOnly = false,
  className = '',
}: AerospaceCustomizerProps): React.ReactElement {
  // Local state for active tab
  const [activeTab, setActiveTab] = useState<AerospaceTabId>(initialTab);

  // Handle tab change
  const handleTabChange = useCallback(
    (tabId: AerospaceTabId) => {
      setActiveTab(tabId);
      onTabChange?.(tabId);
    },
    [onTabChange],
  );

  // Get current tab content
  const tabContent = useMemo(() => {
    switch (activeTab) {
      case 'structure':
        return <AerospaceStructureTab readOnly={readOnly} />;
      case 'armor':
        return <AerospaceArmorTab readOnly={readOnly} />;
      case 'equipment':
        return <AerospaceEquipmentTab readOnly={readOnly} className="h-full" />;
      default:
        return <AerospaceStructureTab readOnly={readOnly} />;
    }
  }, [activeTab, readOnly]);

  return (
    <AerospaceStoreContext.Provider value={store}>
      <div
        className={`flex h-full flex-col ${className}`}
        data-testid="aerospace-customizer"
      >
        {/* Status Bar */}
        <AerospaceStatusBar />

        {/* Tab Bar */}
        <div
          className="border-border-theme bg-surface-base flex items-center overflow-x-auto border-b"
          data-testid="aerospace-tab-bar"
        >
          {AEROSPACE_TABS.map((tab) => (
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
            data-testid="aerospace-tab-content"
          >
            {tabContent}
          </div>

          {/* Aerospace Diagram Sidebar (visible on large screens) */}
          <div
            className="border-border-theme bg-surface-base hidden w-64 overflow-auto border-l p-4 lg:block"
            data-testid="aerospace-diagram-sidebar"
          >
            <h3 className="mb-3 text-sm font-semibold text-white">
              Fighter Overview
            </h3>
            <AerospaceDiagram />
          </div>
        </div>
      </div>
    </AerospaceStoreContext.Provider>
  );
}

export default AerospaceCustomizer;
