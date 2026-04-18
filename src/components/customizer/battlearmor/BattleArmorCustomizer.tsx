/**
 * Battle Armor Customizer Component
 *
 * Main component for customizing Battle Armor units.
 * Tab set is data-driven from BATTLE_ARMOR_TABS registry — construction
 * proposals wire real content by updating the registry, not this file.
 *
 * @spec openspec/changes/add-per-type-customizer-tabs/specs/multi-unit-tabs/spec.md
 * @spec openspec/changes/add-multi-unit-type-support/tasks.md Phase 5.1
 */

import React, { useCallback } from "react";
import { StoreApi } from "zustand";

import { toCustomizerTabConfigs } from "@/components/customizer/shared/TabSpec";
import { BATTLE_ARMOR_TABS } from "@/components/customizer/shared/tabRegistry";
import { CustomizerTabs } from "@/components/customizer/tabs/CustomizerTabs";
import { useCustomizerTabs } from "@/hooks/useCustomizerTabs";
import {
  BattleArmorStoreContext,
  BattleArmorStore,
} from "@/stores/useBattleArmorStore";

import { BattleArmorDiagram } from "./BattleArmorDiagram";

// =============================================================================
// Types
// =============================================================================

/** Tab ids available in the Battle Armor customizer */
export type BattleArmorTabId =
  | "overview"
  | "chassis"
  | "squad"
  | "manipulators"
  | "modularWeapons"
  | "apWeapons"
  | "jumpUMU"
  | "preview"
  | "fluff";

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

// =============================================================================
// Main Component
// =============================================================================

/**
 * Main Battle Armor customizer with registry-driven tabbed interface.
 *
 * Battle Armor tabs have no visibleWhen predicates in the current registry,
 * so state passed to the hook is an empty object.
 */
export function BattleArmorCustomizer({
  store,
  initialTab = "chassis",
  onTabChange,
  readOnly = false,
  className = "",
}: BattleArmorCustomizerProps): React.ReactElement {
  const { visibleSpecs, activeTab, setActiveTab } = useCustomizerTabs({
    specs: BATTLE_ARMOR_TABS,
    state: {},
    initialTabId: initialTab,
  });

  const tabConfigs = toCustomizerTabConfigs(visibleSpecs);

  const handleTabChange = useCallback(
    (tabId: string) => {
      setActiveTab(tabId);
      onTabChange?.(tabId as BattleArmorTabId);
    },
    [setActiveTab, onTabChange],
  );

  const activeSpec =
    visibleSpecs.find((s) => s.id === activeTab) ?? visibleSpecs[0];
  const TabComponent = activeSpec?.component;

  return (
    <BattleArmorStoreContext.Provider value={store}>
      <div className={`flex h-full flex-col ${className}`}>
        {/* Tab Bar */}
        <CustomizerTabs
          tabs={tabConfigs}
          activeTab={activeTab}
          onTabChange={handleTabChange}
          readOnly={readOnly}
        />

        {/* Main Content Area */}
        <div className="flex min-h-0 flex-1 overflow-hidden">
          {/* Tab Content */}
          <div
            className="flex-1 overflow-auto p-4"
            role="tabpanel"
            id={`tabpanel-${activeTab}`}
            aria-labelledby={activeTab}
          >
            {TabComponent && <TabComponent readOnly={readOnly} />}
          </div>

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
