/**
 * Battle Armor Customizer Component
 *
 * Main component for customizing Battle Armor units.
 * Provides tabbed interface for structure, squad, and special systems.
 *
 * @spec openspec/changes/add-multi-unit-type-support/tasks.md Phase 5.1
 */

import React, { useState, useCallback, useMemo } from 'react';
import { StoreApi } from 'zustand';

// Store
import {
  BattleArmorStoreContext,
  BattleArmorStore,
} from '@/stores/useBattleArmorStore';

import { BattleArmorDiagram } from './BattleArmorDiagram';
import { BattleArmorSquadTab } from './BattleArmorSquadTab';
// Components
import { BattleArmorStructureTab } from './BattleArmorStructureTab';

// =============================================================================
// Types
// =============================================================================

export type BattleArmorTabId = 'structure' | 'squad';

interface BattleArmorCustomizerProps {
  /** Battle Armor store instance */
  store: StoreApi<BattleArmorStore>;
  /** Initial tab to display */
  initialTab?: BattleArmorTabId;
  /** Callback when tab changes */
  onTabChange?: (tabId: BattleArmorTabId) => void;
  /** Read-only mode */
  readOnly?: boolean;
  /** Additional CSS classes */
  className?: string;
}

interface TabDefinition {
  id: BattleArmorTabId;
  label: string;
  shortLabel: string;
}

// =============================================================================
// Constants
// =============================================================================

const BATTLE_ARMOR_TABS: TabDefinition[] = [
  { id: 'structure', label: 'Structure & Chassis', shortLabel: 'Structure' },
  { id: 'squad', label: 'Squad & Equipment', shortLabel: 'Squad' },
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
 * Main Battle Armor customizer with tabbed interface
 */
export function BattleArmorCustomizer({
  store,
  initialTab = 'structure',
  onTabChange,
  readOnly = false,
  className = '',
}: BattleArmorCustomizerProps): React.ReactElement {
  // Local state for active tab
  const [activeTab, setActiveTab] = useState<BattleArmorTabId>(initialTab);

  // Handle tab change
  const handleTabChange = useCallback(
    (tabId: BattleArmorTabId) => {
      setActiveTab(tabId);
      onTabChange?.(tabId);
    },
    [onTabChange],
  );

  // Get current tab content
  const tabContent = useMemo(() => {
    switch (activeTab) {
      case 'structure':
        return <BattleArmorStructureTab readOnly={readOnly} />;
      case 'squad':
        return <BattleArmorSquadTab readOnly={readOnly} />;
      default:
        return <BattleArmorStructureTab readOnly={readOnly} />;
    }
  }, [activeTab, readOnly]);

  return (
    <BattleArmorStoreContext.Provider value={store}>
      <div className={`flex h-full flex-col ${className}`}>
        {/* Tab Bar */}
        <div className="border-border-theme bg-surface-base flex items-center overflow-x-auto border-b">
          {BATTLE_ARMOR_TABS.map((tab) => (
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
          <div className="flex-1 overflow-auto p-4">{tabContent}</div>

          {/* Diagram Sidebar (visible on large screens) */}
          <div className="border-border-theme bg-surface-base hidden w-64 overflow-auto border-l p-4 lg:block">
            <h3 className="mb-3 text-sm font-semibold text-white">
              Squad Overview
            </h3>
            <BattleArmorDiagram />
          </div>
        </div>
      </div>
    </BattleArmorStoreContext.Provider>
  );
}

export default BattleArmorCustomizer;
