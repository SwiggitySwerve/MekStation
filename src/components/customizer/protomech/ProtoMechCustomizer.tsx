/**
 * ProtoMech Customizer Component
 *
 * Main component for customizing ProtoMech units.
 * Tab set is data-driven from PROTOMECH_TABS registry.
 *
 * ProtoMechs are Clan-tech mini-mechs operating in points of five.
 *
 * @spec openspec/specs/multi-unit-tabs/spec.md
 * @spec openspec/changes/add-multi-unit-type-support/tasks.md Phase 5.3
 */

import React from 'react';
import { StoreApi } from 'zustand';

import { ProtoMechStatusBar } from '@/components/customizer/protomech/ProtoMechStatusBar';
import { PROTOMECH_TABS } from '@/components/customizer/shared/tabRegistry';
import { CustomizerTabs } from '@/components/customizer/tabs/CustomizerTabs';
import { useCustomizerTabShell } from '@/components/customizer/tabs/useCustomizerTabShell';
import {
  ProtoMechStoreContext,
  ProtoMechStore,
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
// Inner component
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
  const { tabBarProps, activeTab, TabComponent } = useCustomizerTabShell({
    specs: PROTOMECH_TABS,
    state: {},
    initialTab,
    onTabChange,
  });

  return (
    <div className="flex h-full flex-col">
      {/* BV + point-aggregate status banner (Task 8 §ProtoMech Status Bar) */}
      <ProtoMechStatusBar />

      {/* Tab Bar */}
      <CustomizerTabs {...tabBarProps} readOnly={readOnly} />

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
 * Wraps ProtoMechCustomizerInner inside the store context.
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
      <div
        data-testid="protomech-customizer"
        className={`flex h-full flex-col ${className}`}
      >
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
