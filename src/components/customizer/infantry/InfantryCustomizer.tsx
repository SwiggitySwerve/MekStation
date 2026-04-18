/**
 * Infantry Customizer Component
 *
 * Main component for customizing Infantry platoons.
 * Tab set is data-driven from INFANTRY_TABS registry. The Field Guns tab is
 * automatically hidden for Jump and Mechanized platoons via a visibleWhen
 * predicate that reads motionType from the store.
 *
 * @spec openspec/changes/add-per-type-customizer-tabs/specs/multi-unit-tabs/spec.md
 * @spec openspec/changes/add-multi-unit-type-support/tasks.md Phase 5.2
 */

import React, { useCallback } from 'react';
import { StoreApi } from 'zustand';

import { INFANTRY_TABS } from '@/components/customizer/shared/tabRegistry';
import { toCustomizerTabConfigs } from '@/components/customizer/shared/TabSpec';
import { CustomizerTabs } from '@/components/customizer/tabs/CustomizerTabs';
import { useCustomizerTabs } from '@/hooks/useCustomizerTabs';
import {
  InfantryStoreContext,
  InfantryStore,
  useInfantryStore,
} from '@/stores/useInfantryStore';

// =============================================================================
// Types
// =============================================================================

/** Tab ids available in the infantry customizer */
export type InfantryTabId =
  | 'overview'
  | 'platoon'
  | 'primaryWeapon'
  | 'secondaryWeapons'
  | 'fieldGuns'
  | 'specialization'
  | 'preview'
  | 'fluff';

interface InfantryCustomizerProps {
  /** Infantry store instance */
  store: StoreApi<InfantryStore>;
  /** Initial tab to display */
  initialTab?: InfantryTabId;
  /** Callback when tab changes */
  onTabChange?: (tabId: InfantryTabId) => void;
  /** Read-only mode */
  readOnly?: boolean;
  /** Additional CSS classes */
  className?: string;
}

// =============================================================================
// Inner component (needs store context to read motionType for Field Guns visibility)
// =============================================================================

interface InfantryCustomizerInnerProps {
  initialTab: InfantryTabId;
  onTabChange?: (tabId: InfantryTabId) => void;
  readOnly: boolean;
}

function InfantryCustomizerInner({
  initialTab,
  onTabChange,
  readOnly,
}: InfantryCustomizerInnerProps): React.ReactElement {
  // Read motionType to drive the Field Guns tab visibility predicate
  const motionType = useInfantryStore((s) => s.motionType);

  const { visibleSpecs, activeTab, setActiveTab, dirtyTabs, errorTabs } =
    useCustomizerTabs({
      specs: INFANTRY_TABS,
      state: { motionType },
      initialTabId: initialTab,
    });

  const tabConfigs = toCustomizerTabConfigs(visibleSpecs);

  const handleTabChange = useCallback(
    (tabId: string) => {
      setActiveTab(tabId);
      onTabChange?.(tabId as InfantryTabId);
    },
    [setActiveTab, onTabChange],
  );

  const activeSpec =
    visibleSpecs.find((s) => s.id === activeTab) ?? visibleSpecs[0];
  const TabComponent = activeSpec?.component;

  return (
    <div className="flex h-full flex-col">
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
 * Main Infantry customizer with registry-driven tabbed interface.
 *
 * Wraps InfantryCustomizerInner inside the store context so the inner
 * component can read motionType for the Field Guns tab visibility predicate.
 */
export function InfantryCustomizer({
  store,
  initialTab = 'platoon',
  onTabChange,
  readOnly = false,
  className = '',
}: InfantryCustomizerProps): React.ReactElement {
  return (
    <InfantryStoreContext.Provider value={store}>
      <div className={`flex h-full flex-col ${className}`}>
        <InfantryCustomizerInner
          initialTab={initialTab}
          onTabChange={onTabChange}
          readOnly={readOnly}
        />
      </div>
    </InfantryStoreContext.Provider>
  );
}

export default InfantryCustomizer;
