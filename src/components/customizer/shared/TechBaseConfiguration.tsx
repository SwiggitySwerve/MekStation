/**
 * Tech Base Configuration Component
 * 
 * Allows configuration of global and per-component tech base settings.
 * Supports Inner Sphere, Clan, and Mixed Tech modes.
 * 
 * @spec Based on BattleTech TechManual mixed tech rules
 */

import React, { useCallback } from 'react';
import { TechBase } from '@/types/enums/TechBase';
import {
  TechBaseMode,
  TechBaseComponent,
  IComponentTechBases,
  TECH_BASE_MODE_LABELS,
  TECH_BASE_COMPONENT_LABELS,
  TECH_BASE_COMPONENT_DESCRIPTIONS,
} from '@/types/construction/TechBaseConfiguration';

interface TechBaseConfigurationProps {
  /** Current global tech base mode */
  mode: TechBaseMode;
  /** Per-component tech base settings */
  components: IComponentTechBases;
  /** Called when the global mode changes */
  onModeChange: (mode: TechBaseMode) => void;
  /** Called when a component tech base changes */
  onComponentChange: (component: TechBaseComponent, techBase: TechBase) => void;
  /** Whether the configuration is read-only */
  readOnly?: boolean;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Segmented button for selecting between two options
 */
function TechBaseSegmentedButton({
  value,
  onChange,
  disabled = false,
}: {
  value: TechBase;
  onChange: (value: TechBase) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex rounded-lg overflow-hidden border border-slate-600">
      <button
        type="button"
        onClick={() => onChange(TechBase.INNER_SPHERE)}
        disabled={disabled}
        className={`
          px-3 py-1.5 text-sm font-medium transition-colors
          ${value === TechBase.INNER_SPHERE
            ? 'bg-blue-600 text-white'
            : 'bg-slate-700 text-slate-400 hover:bg-slate-600 hover:text-slate-300'
          }
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        `}
      >
        Inner Sphere
      </button>
      <button
        type="button"
        onClick={() => onChange(TechBase.CLAN)}
        disabled={disabled}
        className={`
          px-3 py-1.5 text-sm font-medium transition-colors border-l border-slate-600
          ${value === TechBase.CLAN
            ? 'bg-green-600 text-white'
            : 'bg-slate-700 text-slate-400 hover:bg-slate-600 hover:text-slate-300'
          }
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        `}
      >
        Clan
      </button>
    </div>
  );
}

/**
 * Row for a single component's tech base setting
 */
function ComponentRow({
  component,
  techBase,
  onChange,
  disabled,
  isOdd,
}: {
  component: TechBaseComponent;
  techBase: TechBase;
  onChange: (techBase: TechBase) => void;
  disabled: boolean;
  isOdd: boolean;
}) {
  return (
    <div
      className={`
        flex items-center justify-between px-4 py-3
        ${isOdd ? 'bg-slate-800/50' : 'bg-slate-800'}
        ${disabled ? 'opacity-60' : ''}
      `}
    >
      <div className="flex-1">
        <div className="text-sm font-medium text-slate-200">
          Tech/{TECH_BASE_COMPONENT_LABELS[component]}
        </div>
        <div className="text-xs text-slate-500">
          {TECH_BASE_COMPONENT_DESCRIPTIONS[component]}
        </div>
      </div>
      <TechBaseSegmentedButton
        value={techBase}
        onChange={onChange}
        disabled={disabled}
      />
    </div>
  );
}

/**
 * Tech base configuration panel
 */
export function TechBaseConfiguration({
  mode,
  components,
  onModeChange,
  onComponentChange,
  readOnly = false,
  className = '',
}: TechBaseConfigurationProps) {
  const isMixed = mode === 'mixed';
  
  const handleModeChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    onModeChange(e.target.value as TechBaseMode);
  }, [onModeChange]);
  
  const componentOrder: TechBaseComponent[] = [
    'chassis',
    'gyro',
    'engine',
    'heatsink',
    'targeting',
    'myomer',
    'movement',
    'armor',
  ];

  return (
    <div className={`bg-slate-800 rounded-lg border border-slate-700 overflow-hidden ${className}`}>
      {/* Header with global mode selector */}
      <div className="px-4 py-3 border-b border-slate-700 bg-slate-800">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-white">Tech Base</h3>
          <select
            value={mode}
            onChange={handleModeChange}
            disabled={readOnly}
            className={`
              bg-slate-700 border border-slate-600 text-white rounded-lg px-3 py-1.5 text-sm
              focus:ring-2 focus:ring-blue-500 focus:border-blue-500
              ${readOnly ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
            `}
          >
            {Object.entries(TECH_BASE_MODE_LABELS).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </div>
        {!isMixed && (
          <p className="text-xs text-slate-500 mt-1">
            All components use {mode === 'inner_sphere' ? 'Inner Sphere' : 'Clan'} technology.
            Select "Mixed Tech" to configure individual components.
          </p>
        )}
        {isMixed && (
          <p className="text-xs text-slate-500 mt-1">
            Configure each component's tech base individually.
          </p>
        )}
      </div>

      {/* Component rows */}
      <div className="divide-y divide-slate-700/50">
        {componentOrder.map((component, index) => (
          <ComponentRow
            key={component}
            component={component}
            techBase={components[component]}
            onChange={(techBase) => onComponentChange(component, techBase)}
            disabled={readOnly || !isMixed}
            isOdd={index % 2 === 1}
          />
        ))}
      </div>
    </div>
  );
}

