/**
 * Overview Tab Component
 * 
 * Summary view of the current unit configuration.
 * Note: UnitInfoBanner is now rendered in the parent customizer page
 * to be persistent across all tabs.
 * 
 * @spec openspec/changes/add-customizer-ui-components/specs/customizer-tabs/spec.md
 */

import React, { useState, useCallback } from 'react';
import { TechBase } from '@/types/enums/TechBase';
import { TechBaseConfiguration } from '../shared/TechBaseConfiguration';
import {
  TechBaseMode,
  TechBaseComponent,
  IComponentTechBases,
  createDefaultComponentTechBases,
} from '@/types/construction/TechBaseConfiguration';

interface OverviewTabProps {
  /** Unit name */
  unitName: string;
  /** Unit tonnage */
  tonnage: number;
  /** Tech base */
  techBase: TechBase;
  /** Read-only mode */
  readOnly?: boolean;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Overview tab showing unit summary
 */
export function OverviewTab({
  unitName,
  tonnage,
  techBase,
  readOnly = false,
  className = '',
}: OverviewTabProps) {
  // Calculate max armor for display
  const maxArmorPoints = Math.floor(tonnage * 2 * 3.5);

  // Tech base configuration state
  const [techBaseMode, setTechBaseMode] = useState<TechBaseMode>(() => {
    // Initialize based on the unit's tech base
    if (techBase === TechBase.CLAN) return 'clan';
    if (techBase === TechBase.MIXED || 
        techBase === TechBase.MIXED_IS_CHASSIS || 
        techBase === TechBase.MIXED_CLAN_CHASSIS) return 'mixed';
    return 'inner_sphere';
  });
  
  const [componentTechBases, setComponentTechBases] = useState<IComponentTechBases>(() => 
    createDefaultComponentTechBases(techBase === TechBase.CLAN ? TechBase.CLAN : TechBase.INNER_SPHERE)
  );

  // Handler for global mode change
  const handleModeChange = useCallback((newMode: TechBaseMode) => {
    setTechBaseMode(newMode);
    // When switching to non-mixed mode, reset all components to match
    if (newMode !== 'mixed') {
      const newTechBase = newMode === 'clan' ? TechBase.CLAN : TechBase.INNER_SPHERE;
      setComponentTechBases(createDefaultComponentTechBases(newTechBase));
    }
  }, []);

  // Handler for individual component change
  const handleComponentChange = useCallback((component: TechBaseComponent, newTechBase: TechBase) => {
    setComponentTechBases(prev => ({
      ...prev,
      [component]: newTechBase,
    }));
  }, []);

  return (
    <div className={`space-y-6 p-4 ${className}`}>
      {/* Tech Base Configuration */}
      <TechBaseConfiguration
        mode={techBaseMode}
        components={componentTechBases}
        onModeChange={handleModeChange}
        onComponentChange={handleComponentChange}
        readOnly={readOnly}
      />

      {/* Configuration Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Chassis Configuration */}
        <div className="bg-slate-800 rounded-lg border border-slate-700 p-4">
          <h3 className="text-lg font-semibold text-white mb-4">Chassis Configuration</h3>
          <dl className="space-y-2">
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
          <h3 className="text-lg font-semibold text-white mb-4">Protection</h3>
          <dl className="space-y-2">
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

