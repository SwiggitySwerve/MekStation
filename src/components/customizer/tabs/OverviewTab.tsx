/**
 * Overview Tab Component
 * 
 * Summary view of the current unit configuration.
 * Note: UnitInfoBanner is now rendered in the parent customizer page
 * to be persistent across all tabs.
 * 
 * Tech base configuration state is stored in the multi-unit store
 * to persist across tab navigation and browser sessions.
 * 
 * @spec openspec/changes/add-customizer-ui-components/specs/customizer-tabs/spec.md
 */

import React, { useCallback } from 'react';
import { TechBase } from '@/types/enums/TechBase';
import { TechBaseConfiguration } from '../shared/TechBaseConfiguration';
import { TechBaseMode, TechBaseComponent } from '@/types/construction/TechBaseConfiguration';
import { useMultiUnitStore } from '@/stores/useMultiUnitStore';

interface OverviewTabProps {
  /** Tab ID for accessing store state */
  tabId: string;
  /** Unit name */
  unitName: string;
  /** Unit tonnage */
  tonnage: number;
  /** Read-only mode */
  readOnly?: boolean;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Overview tab showing unit summary
 */
export function OverviewTab({
  tabId,
  unitName,
  tonnage,
  readOnly = false,
  className = '',
}: OverviewTabProps) {
  // Calculate max armor for display
  const maxArmorPoints = Math.floor(tonnage * 2 * 3.5);

  // Get tech base configuration from store (persisted state)
  const tab = useMultiUnitStore((state) => 
    state.tabs.find((t) => t.id === tabId)
  );
  
  // Get store actions
  const updateTechBaseMode = useMultiUnitStore((state) => state.updateTechBaseMode);
  const updateComponentTechBase = useMultiUnitStore((state) => state.updateComponentTechBase);

  // Handler for global mode change
  const handleModeChange = useCallback((newMode: TechBaseMode) => {
    updateTechBaseMode(tabId, newMode);
  }, [tabId, updateTechBaseMode]);

  // Handler for individual component change
  const handleComponentChange = useCallback((component: TechBaseComponent, newTechBase: TechBase) => {
    updateComponentTechBase(tabId, component, newTechBase);
  }, [tabId, updateComponentTechBase]);

  // If tab not found, show error state
  if (!tab) {
    return (
      <div className={`p-4 ${className}`}>
        <div className="bg-red-900/30 border border-red-700 rounded-lg p-4 text-red-300">
          Error: Unit tab not found
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 p-4 ${className}`}>
      {/* Top row: Tech Base (left) + Chassis/Protection (right) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Tech Base Configuration */}
        <TechBaseConfiguration
          mode={tab.techBaseMode}
          components={tab.componentTechBases}
          onModeChange={handleModeChange}
          onComponentChange={handleComponentChange}
          readOnly={readOnly}
        />

        {/* Right: Chassis + Protection stacked */}
        <div className="space-y-4">
          {/* Chassis Configuration */}
          <div className="bg-slate-800 rounded-lg border border-slate-700 p-4">
            <h3 className="text-lg font-semibold text-white mb-3">Chassis Configuration</h3>
            <dl className="space-y-1.5 text-sm">
              <div className="flex justify-between">
                <dt className="text-slate-400">Configuration</dt>
                <dd className="text-white">Biped</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-400">Engine</dt>
                <dd className="text-white">Not Selected</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-400">Gyro</dt>
                <dd className="text-white">Standard</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-400">Cockpit</dt>
                <dd className="text-white">Standard</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-400">Structure</dt>
                <dd className="text-white">Standard</dd>
              </div>
            </dl>
          </div>

          {/* Protection Summary */}
          <div className="bg-slate-800 rounded-lg border border-slate-700 p-4">
            <h3 className="text-lg font-semibold text-white mb-3">Protection</h3>
            <dl className="space-y-1.5 text-sm">
              <div className="flex justify-between">
                <dt className="text-slate-400">Armor Type</dt>
                <dd className="text-white">Standard</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-400">Total Armor</dt>
                <dd className="text-white">0 / {maxArmorPoints}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-400">Heat Sinks</dt>
                <dd className="text-white">10 Single</dd>
              </div>
            </dl>
          </div>
        </div>
      </div>

      {/* Placeholder for equipment summary */}
      <div className="bg-slate-800 rounded-lg border border-slate-700 p-4">
        <h3 className="text-lg font-semibold text-white mb-4">Equipment Summary</h3>
        <div className="text-center py-8 text-slate-400">
          <p>No equipment mounted</p>
          <p className="text-sm mt-2">Add weapons and equipment from the Equipment tab</p>
        </div>
      </div>

      {readOnly && (
        <div className="bg-blue-900/30 border border-blue-700 rounded-lg p-4 text-blue-300 text-sm">
          This unit is in read-only mode. Changes cannot be made.
        </div>
      )}
    </div>
  );
}
