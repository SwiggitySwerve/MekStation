/**
 * Unit Type Router
 *
 * Routes to the appropriate customizer for the active unit's type. Resolution
 * is a single lookup into the customizer type descriptor registry — the router
 * carries no per-type `switch`/`if` ladder. Each descriptor's `Shell` owns its
 * own store hydration and store-context provider, so adding a unit type is one
 * descriptor registration with zero changes here.
 *
 * @spec openspec/changes/refactor-customizer-type-descriptors/specs/customizer-routing/spec.md
 *        Requirement: Unit-Type Customizer Resolution
 */

import React from 'react';

import { CustomizerTabId } from '@/hooks/useCustomizerRouter';
import { TabInfo } from '@/stores/useTabManagerStore';

import { getCustomizerDescriptor } from './shared/customizerTypeRegistry';

interface UnitTypeRouterProps {
  activeTab: TabInfo | null;
  activeTabId: CustomizerTabId;
  onTabChange: (tabId: CustomizerTabId) => void;
}

export function UnitTypeRouter({
  activeTab,
  activeTabId,
  onTabChange,
}: UnitTypeRouterProps): React.ReactElement {
  // No active tab — nothing to route.
  if (!activeTab) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="text-text-theme-secondary p-8 text-center">
          <p className="mb-2 text-lg">No unit selected</p>
          <p className="text-sm">
            Click &quot;New Unit&quot; to create a new unit
          </p>
        </div>
      </div>
    );
  }

  // Resolve the descriptor for this unit type and mount its shell. The shell
  // (mech or non-mech) owns store hydration, the store-context provider, and
  // the ErrorBoundary — see customizerTypeRegistry.tsx.
  const { Shell } = getCustomizerDescriptor(activeTab.unitType);
  return (
    <Shell
      activeTab={activeTab}
      activeTabId={activeTabId}
      onTabChange={onTabChange}
    />
  );
}

export default UnitTypeRouter;
