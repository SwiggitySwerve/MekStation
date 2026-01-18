/**
 * Infantry Customizer Component
 *
 * Main component for customizing Infantry platoons.
 * Infantry has a simplified single-tab interface.
 *
 * @spec openspec/changes/add-multi-unit-type-support/tasks.md Phase 5.2
 */

import React from 'react';
import { StoreApi } from 'zustand';

// Store
import { InfantryStoreContext, InfantryStore } from '@/stores/useInfantryStore';

// Components
import { InfantryBuildTab } from './InfantryBuildTab';

// =============================================================================
// Types
// =============================================================================

interface InfantryCustomizerProps {
  /** Infantry store instance */
  store: StoreApi<InfantryStore>;
  /** Read-only mode */
  readOnly?: boolean;
  /** Additional CSS classes */
  className?: string;
}

// =============================================================================
// Main Component
// =============================================================================

/**
 * Main Infantry customizer
 */
export function InfantryCustomizer({
  store,
  readOnly = false,
  className = '',
}: InfantryCustomizerProps): React.ReactElement {
  return (
    <InfantryStoreContext.Provider value={store}>
      <div className={`flex flex-col h-full ${className}`}>
        {/* Header */}
        <div className="flex items-center border-b border-border-theme bg-surface-base px-4 py-2">
          <span className="text-sm font-medium text-white">Infantry Platoon Configuration</span>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 overflow-auto p-4">
          <InfantryBuildTab readOnly={readOnly} />
        </div>
      </div>
    </InfantryStoreContext.Provider>
  );
}

export default InfantryCustomizer;
