/**
 * Aerospace Customizer Component
 *
 * Main component for customizing aerospace fighters and conventional aircraft.
 * Tab set is data-driven from AEROSPACE_TABS registry. The Bombs tab is
 * automatically hidden for conventional fighters via a visibleWhen predicate.
 *
 * @spec openspec/changes/add-per-type-customizer-tabs/specs/multi-unit-tabs/spec.md
 * @spec openspec/changes/add-multi-unit-type-support/tasks.md Phase 4
 */

import React, { useCallback } from 'react';
import { StoreApi } from 'zustand';

import { AEROSPACE_TABS } from '@/components/customizer/shared/tabRegistry';
import { toCustomizerTabConfigs } from '@/components/customizer/shared/TabSpec';
import { CustomizerTabs } from '@/components/customizer/tabs/CustomizerTabs';
import { useCustomizerTabs } from '@/hooks/useCustomizerTabs';
import {
  AerospaceStoreContext,
  AerospaceStore,
  useAerospaceStore,
} from '@/stores/useAerospaceStore';

import { AerospaceDiagram } from './AerospaceDiagram';
import { AerospaceStatusBar } from './AerospaceStatusBar';

// =============================================================================
// Types
// =============================================================================

/** Tab ids available in the aerospace customizer */
export type AerospaceTabId =
  | 'overview'
  | 'structure'
  | 'armor'
  | 'equipment'
  | 'velocity'
  | 'bombs'
  | 'preview'
  | 'fluff';

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

// =============================================================================
// Inner component (needs store context to read unitType for Bombs visibility)
// =============================================================================

interface AerospaceCustomizerInnerProps {
  initialTab: AerospaceTabId;
  onTabChange?: (tabId: AerospaceTabId) => void;
  readOnly: boolean;
}

function AerospaceCustomizerInner({
  initialTab,
  onTabChange,
  readOnly,
}: AerospaceCustomizerInnerProps): React.ReactElement {
  // Read unitType to drive the Bombs tab visibility predicate
  const unitType = useAerospaceStore((s) => s.unitType);

  const { visibleSpecs, activeTab, setActiveTab, dirtyTabs, errorTabs } =
    useCustomizerTabs({
      specs: AEROSPACE_TABS,
      state: { unitType },
      initialTabId: initialTab,
    });

  const tabConfigs = toCustomizerTabConfigs(visibleSpecs);

  const handleTabChange = useCallback(
    (tabId: string) => {
      setActiveTab(tabId);
      onTabChange?.(tabId as AerospaceTabId);
    },
    [setActiveTab, onTabChange],
  );

  const activeSpec =
    visibleSpecs.find((s) => s.id === activeTab) ?? visibleSpecs[0];
  const TabComponent = activeSpec?.component;

  return (
    <div className="flex h-full flex-col" data-testid="aerospace-customizer">
      {/* Status Bar */}
      <AerospaceStatusBar />

      {/* Tab Bar */}
      <CustomizerTabs
        tabs={tabConfigs}
        activeTab={activeTab}
        onTabChange={handleTabChange}
        readOnly={readOnly}
        dirtyTabs={dirtyTabs}
        errorTabs={errorTabs}
        data-testid="aerospace-tab-bar"
      />

      {/* Main Content Area */}
      <div className="flex min-h-0 flex-1 overflow-hidden">
        {/* Tab Content */}
        <div
          className="flex-1 overflow-auto p-4"
          role="tabpanel"
          id={`tabpanel-${activeTab}`}
          aria-labelledby={activeTab}
          data-testid="aerospace-tab-content"
        >
          {TabComponent && <TabComponent readOnly={readOnly} />}
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
  );
}

// =============================================================================
// Main Component
// =============================================================================

/**
 * Main aerospace customizer with registry-driven tabbed interface.
 *
 * Wraps AerospaceCustomizerInner inside the store context so the inner
 * component can read unitType for the Bombs tab visibility predicate.
 */
export function AerospaceCustomizer({
  store,
  initialTab = 'structure',
  onTabChange,
  readOnly = false,
  className = '',
}: AerospaceCustomizerProps): React.ReactElement {
  return (
    <AerospaceStoreContext.Provider value={store}>
      <div className={`flex h-full flex-col ${className}`}>
        <AerospaceCustomizerInner
          initialTab={initialTab}
          onTabChange={onTabChange}
          readOnly={readOnly}
        />
      </div>
    </AerospaceStoreContext.Provider>
  );
}

export default AerospaceCustomizer;
