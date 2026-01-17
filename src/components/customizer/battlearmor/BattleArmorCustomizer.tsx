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
import { BattleArmorStoreContext, BattleArmorStore } from '@/stores/useBattleArmorStore';

// Components
import { BattleArmorStructureTab } from './BattleArmorStructureTab';
import { BattleArmorSquadTab } from './BattleArmorSquadTab';
import { BattleArmorDiagram } from './BattleArmorDiagram';

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

function TabButton({ tab, isActive, onClick }: TabButtonProps): React.ReactElement {
  return (
    <button
      onClick={onClick}
      className={`
        px-4 py-2 text-sm font-medium transition-colors whitespace-nowrap
        ${isActive
          ? 'bg-accent text-white border-b-2 border-accent'
          : 'text-text-theme-secondary hover:text-white hover:bg-surface-raised/50'
        }
      `}
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
    [onTabChange]
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
      <div className={`flex flex-col h-full ${className}`}>
        {/* Tab Bar */}
        <div className="flex items-center border-b border-border-theme bg-surface-base overflow-x-auto">
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
        <div className="flex-1 flex min-h-0 overflow-hidden">
          {/* Tab Content */}
          <div className="flex-1 overflow-auto p-4">
            {tabContent}
          </div>

          {/* Diagram Sidebar (visible on large screens) */}
          <div className="hidden lg:block w-64 border-l border-border-theme bg-surface-base p-4 overflow-auto">
            <h3 className="text-sm font-semibold text-white mb-3">Squad Overview</h3>
            <BattleArmorDiagram />
          </div>
        </div>
      </div>
    </BattleArmorStoreContext.Provider>
  );
}

export default BattleArmorCustomizer;
