/**
 * ProtoMech Customizer Component
 *
 * Main component for customizing ProtoMech units.
 * Tab set is data-driven from PROTOMECH_TABS registry. The Glider tab is
 * automatically hidden for Ultraheavy ProtoMechs (tonnage >= 10) via a
 * visibleWhen predicate that reads tonnage from the store.
 *
 * ProtoMechs are Clan-tech mini-mechs operating in points of five.
 *
 * @spec openspec/changes/add-per-type-customizer-tabs/specs/multi-unit-tabs/spec.md
 * @spec openspec/changes/add-multi-unit-type-support/tasks.md Phase 5.3
 */

import React, { useCallback } from 'react';
import { StoreApi } from 'zustand';

import { ProtoMechStatusBar } from '@/components/customizer/protomech/ProtoMechStatusBar';
import { PROTOMECH_TABS } from '@/components/customizer/shared/tabRegistry';
import { toCustomizerTabConfigs } from '@/components/customizer/shared/TabSpec';
import { CustomizerTabs } from '@/components/customizer/tabs/CustomizerTabs';
import { useCustomizerTabs } from '@/hooks/useCustomizerTabs';
import {
  ProtoMechStoreContext,
  ProtoMechStore,
  useProtoMechStore,
} from '@/stores/useProtoMechStore';

// =============================================================================
// Types
// =============================================================================

/** Tab ids available in the ProtoMech customizer */
export type ProtoMechTabId =
  | 'overview'
  | 'structure'
  | 'armor'
  | 'mainGun'
  | 'equipment'
  | 'glider'
  | 'preview'
  | 'fluff';

interface ProtoMechCustomizerProps {
  /** ProtoMech store instance */
  store: StoreApi<ProtoMechStore>;
  /** Initial tab to display */
  initialTab?: ProtoMechTabId;
  /** Callback when tab changes */
  onTabChange?: (tabId: ProtoMechTabId) => void;
  /** Read-only mode */
  readOnly?: boolean;
  /** Additional CSS classes */
  className?: string;
}

// =============================================================================
// Inner component (needs store context to read tonnage for Glider visibility)
// =============================================================================

interface ProtoMechCustomizerInnerProps {
  initialTab: ProtoMechTabId;
  onTabChange?: (tabId: ProtoMechTabId) => void;
  readOnly: boolean;
}

function ProtoMechCustomizerInner({
  initialTab,
  onTabChange,
  readOnly,
}: ProtoMechCustomizerInnerProps): React.ReactElement {
  // Read tonnage to drive the Glider tab visibility predicate
  const tonnage = useProtoMechStore((s) => s.tonnage);

  const { visibleSpecs, activeTab, setActiveTab, dirtyTabs, errorTabs } =
    useCustomizerTabs({
      specs: PROTOMECH_TABS,
      state: { tonnage },
      initialTabId: initialTab,
    });

  const tabConfigs = toCustomizerTabConfigs(visibleSpecs);

  const handleTabChange = useCallback(
    (tabId: string) => {
      setActiveTab(tabId);
      onTabChange?.(tabId as ProtoMechTabId);
    },
    [setActiveTab, onTabChange],
  );

  const activeSpec =
    visibleSpecs.find((s) => s.id === activeTab) ?? visibleSpecs[0];
  const TabComponent = activeSpec?.component;

  return (
    <div className="flex h-full flex-col">
      {/* BV + point-aggregate status banner (Task 8 §ProtoMech Status Bar) */}
      <ProtoMechStatusBar />

      {/* Tab Bar */}
      <CustomizerTabs
        tabs={tabConfigs}
        activeTab={activeTab}
        onTabChange={handleTabChange}
        readOnly={readOnly}
        dirtyTabs={dirtyTabs}
        errorTabs={errorTabs}
      />

      {/* Main Content Area */}
      <div
        className="flex-1 overflow-auto p-4"
        role="tabpanel"
        id={`tabpanel-${activeTab}`}
        aria-labelledby={activeTab}
      >
        {TabComponent && <TabComponent readOnly={readOnly} />}
      </div>
    </div>
  );
}

// =============================================================================
// Main Component
// =============================================================================

/**
 * Main ProtoMech customizer with registry-driven tabbed interface.
 *
 * Wraps ProtoMechCustomizerInner inside the store context so the inner
 * component can read tonnage for the Glider tab visibility predicate.
 */
export function ProtoMechCustomizer({
  store,
  initialTab = 'structure',
  onTabChange,
  readOnly = false,
  className = '',
}: ProtoMechCustomizerProps): React.ReactElement {
  return (
    <ProtoMechStoreContext.Provider value={store}>
      <div className={`flex h-full flex-col ${className}`}>
        <ProtoMechCustomizerInner
          initialTab={initialTab}
          onTabChange={onTabChange}
          readOnly={readOnly}
        />
      </div>
    </ProtoMechStoreContext.Provider>
  );
}

export default ProtoMechCustomizer;
