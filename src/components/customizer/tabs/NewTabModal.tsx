/**
 * New Tab Modal Component
 * 
 * Modal dialog for creating new unit tabs.
 * 
 * @spec openspec/specs/multi-unit-tabs/spec.md
 */

import React, { useState, useMemo } from 'react';
import { TechBase } from '@/types/enums/TechBase';
import { UnitType } from '@/types/unit/BattleMechInterfaces';
import { UNIT_TEMPLATES, UnitTemplate } from '@/stores/useMultiUnitStore';

type CreationMode = 'new' | 'copy' | 'import';

type SupportedUnitType = UnitType.BATTLEMECH | UnitType.VEHICLE;

interface VehicleTemplate {
  readonly id: string;
  readonly name: string;
  readonly tonnage: number;
  readonly techBase: TechBase;
  readonly cruiseMP: number;
}

const VEHICLE_TEMPLATES: readonly VehicleTemplate[] = [
  { id: 'light-veh', name: 'Light Vehicle', tonnage: 20, techBase: TechBase.INNER_SPHERE, cruiseMP: 6 },
  { id: 'medium-veh', name: 'Medium Vehicle', tonnage: 40, techBase: TechBase.INNER_SPHERE, cruiseMP: 5 },
  { id: 'heavy-veh', name: 'Heavy Vehicle', tonnage: 60, techBase: TechBase.INNER_SPHERE, cruiseMP: 4 },
  { id: 'assault-veh', name: 'Assault Vehicle', tonnage: 80, techBase: TechBase.INNER_SPHERE, cruiseMP: 3 },
];

interface NewTabModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateUnit: (tonnage: number, techBase?: TechBase, unitType?: UnitType) => string;
}

/**
 * New unit tab creation modal
 */
export function NewTabModal({
  isOpen,
  onClose,
  onCreateUnit,
}: NewTabModalProps): React.ReactElement | null {
  const [mode, setMode] = useState<CreationMode>('new');
  const [unitType, setUnitType] = useState<SupportedUnitType>(UnitType.BATTLEMECH);
  const [selectedMechTemplate, setSelectedMechTemplate] = useState<UnitTemplate>(UNIT_TEMPLATES[1]);
  const [selectedVehicleTemplate, setSelectedVehicleTemplate] = useState<VehicleTemplate>(VEHICLE_TEMPLATES[1]);
  const [techBase, setTechBase] = useState<TechBase>(TechBase.INNER_SPHERE);
  
  const selectedTonnage = useMemo(() => {
    return unitType === UnitType.BATTLEMECH 
      ? selectedMechTemplate.tonnage 
      : selectedVehicleTemplate.tonnage;
  }, [unitType, selectedMechTemplate, selectedVehicleTemplate]);
  
  if (!isOpen) return null;
  
  const handleCreate = () => {
    onCreateUnit(selectedTonnage, techBase, unitType);
    onClose();
  };
  
  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };
  
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    }
  };
  
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      onClick={handleOverlayClick}
      onKeyDown={handleKeyDown}
    >
      <div className="bg-surface-base rounded-lg border border-border-theme-subtle shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border-theme-subtle sticky top-0 bg-surface-base z-10">
          <h2 className="text-lg font-semibold text-white">Create New Unit</h2>
          <button
            onClick={onClose}
            className="text-text-theme-secondary hover:text-white transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        {/* Mode tabs */}
        <div className="flex border-b border-border-theme-subtle">
          {(['new', 'copy', 'import'] as CreationMode[]).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
                mode === m
                  ? 'bg-blue-600 text-white'
                  : 'text-text-theme-secondary hover:text-white hover:bg-surface-raised'
              }`}
            >
              {m === 'new' && 'New Unit'}
              {m === 'copy' && 'Copy Current'}
              {m === 'import' && 'Import Data'}
            </button>
          ))}
        </div>
        
        {/* Content */}
        <div className="p-4">
          {mode === 'new' && (
            <div className="space-y-4">
              {/* Unit Type Selection */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Unit Type
                </label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setUnitType(UnitType.BATTLEMECH)}
                    className={`flex-1 px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
                      unitType === UnitType.BATTLEMECH
                        ? 'border-amber-500 bg-amber-900/30 text-amber-300'
                        : 'border-border-theme text-text-theme-secondary hover:border-border-theme-subtle'
                    }`}
                  >
                    BattleMech
                  </button>
                  <button
                    onClick={() => setUnitType(UnitType.VEHICLE)}
                    className={`flex-1 px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
                      unitType === UnitType.VEHICLE
                        ? 'border-cyan-500 bg-cyan-900/30 text-cyan-300'
                        : 'border-border-theme text-text-theme-secondary hover:border-border-theme-subtle'
                    }`}
                  >
                    Vehicle
                  </button>
                </div>
              </div>

              {/* Template selection - BattleMechs */}
              {unitType === UnitType.BATTLEMECH && (
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Select Template
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {UNIT_TEMPLATES.map((template) => (
                      <button
                        key={template.id}
                        onClick={() => setSelectedMechTemplate(template)}
                        className={`p-3 rounded-lg border text-left transition-colors ${
                          selectedMechTemplate.id === template.id
                            ? 'border-blue-500 bg-blue-900/30'
                            : 'border-border-theme hover:border-border-theme-subtle'
                        }`}
                      >
                        <div className="text-sm font-medium text-white">{template.name}</div>
                        <div className="text-xs text-text-theme-secondary">
                          {template.tonnage}t • {template.walkMP}/{Math.ceil(template.walkMP * 1.5)}/{template.jumpMP} MP
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Template selection - Vehicles */}
              {unitType === UnitType.VEHICLE && (
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Select Template
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {VEHICLE_TEMPLATES.map((template) => (
                      <button
                        key={template.id}
                        onClick={() => setSelectedVehicleTemplate(template)}
                        className={`p-3 rounded-lg border text-left transition-colors ${
                          selectedVehicleTemplate.id === template.id
                            ? 'border-blue-500 bg-blue-900/30'
                            : 'border-border-theme hover:border-border-theme-subtle'
                        }`}
                      >
                        <div className="text-sm font-medium text-white">{template.name}</div>
                        <div className="text-xs text-text-theme-secondary">
                          {template.tonnage}t • {template.cruiseMP}/{Math.floor(template.cruiseMP * 1.5)} MP
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Tech base selection */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Tech Base
                </label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setTechBase(TechBase.INNER_SPHERE)}
                    className={`flex-1 px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
                      techBase === TechBase.INNER_SPHERE
                        ? 'border-blue-500 bg-blue-900/30 text-blue-300'
                        : 'border-border-theme text-text-theme-secondary hover:border-border-theme-subtle'
                    }`}
                  >
                    Inner Sphere
                  </button>
                  <button
                    onClick={() => setTechBase(TechBase.CLAN)}
                    className={`flex-1 px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
                      techBase === TechBase.CLAN
                        ? 'border-green-500 bg-green-900/30 text-green-300'
                        : 'border-border-theme text-text-theme-secondary hover:border-border-theme-subtle'
                    }`}
                  >
                    Clan
                  </button>
                </div>
              </div>
            </div>
          )}
          
          {mode === 'copy' && (
            <div className="py-8 text-center text-text-theme-secondary">
              <p>Creates a copy of the currently active unit.</p>
              <p className="text-sm mt-2">Select this option when you want to create a variant.</p>
            </div>
          )}

          {mode === 'import' && (
            <div className="py-8 text-center text-text-theme-secondary">
              <p>Import from MTF, SSW, or MegaMek formats.</p>
              <p className="text-sm mt-2">(Coming soon)</p>
            </div>
          )}
        </div>
        
        {/* Footer */}
        <div className="flex justify-end gap-2 px-4 py-3 border-t border-border-theme-subtle">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-300 hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={mode === 'import'}
            className="px-4 py-2 text-sm font-medium bg-accent hover:bg-accent-hover text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Create Unit
          </button>
        </div>
      </div>
    </div>
  );
}

