/**
 * ProtoMech Customizer Component
 *
 * Main component for customizing ProtoMech units.
 * ProtoMechs are Clan-tech mini-mechs operating in points.
 *
 * @spec openspec/changes/add-multi-unit-type-support/tasks.md Phase 5.3
 */

import React from 'react';
import { StoreApi } from 'zustand';

// Store
import {
  ProtoMechStoreContext,
  ProtoMechStore,
} from '@/stores/useProtoMechStore';

// Components
import { ProtoMechStructureTab } from './ProtoMechStructureTab';

// =============================================================================
// Types
// =============================================================================

interface ProtoMechCustomizerProps {
  /** ProtoMech store instance */
  store: StoreApi<ProtoMechStore>;
  /** Read-only mode */
  readOnly?: boolean;
  /** Additional CSS classes */
  className?: string;
}

// =============================================================================
// Main Component
// =============================================================================

/**
 * Main ProtoMech customizer
 */
export function ProtoMechCustomizer({
  store,
  readOnly = false,
  className = '',
}: ProtoMechCustomizerProps): React.ReactElement {
  return (
    <ProtoMechStoreContext.Provider value={store}>
      <div className={`flex h-full flex-col ${className}`}>
        {/* Header */}
        <div className="border-border-theme bg-surface-base flex items-center border-b px-4 py-2">
          <span className="text-sm font-medium text-white">
            ProtoMech Configuration
          </span>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 overflow-auto p-4">
          <ProtoMechStructureTab readOnly={readOnly} />
        </div>
      </div>
    </ProtoMechStoreContext.Provider>
  );
}

export default ProtoMechCustomizer;
