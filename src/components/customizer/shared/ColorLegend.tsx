/**
 * Color Legend Component
 * 
 * Collapsible color reference panel explaining the color system.
 * 
 * @spec openspec/specs/color-system/spec.md
 */

import React, { useState } from 'react';
import { SLOT_COLORS, SystemComponentType } from '@/utils/colors/slotColors';
import { EQUIPMENT_COLORS, EquipmentColorType } from '@/utils/colors/equipmentColors';
import { TECH_BASE_COLORS } from '@/utils/colors/techBaseColors';
import { TechBase } from '@/types/enums/TechBase';

interface ColorLegendProps {
  /** Initially expanded */
  defaultExpanded?: boolean;
  /** Additional CSS classes */
  className?: string;
}

interface ColorSwatchProps {
  bgClass: string;
  label: string;
}

function ColorSwatch({ bgClass, label }: ColorSwatchProps) {
  return (
    <div className="flex items-center gap-2">
      <div className={`w-4 h-4 rounded ${bgClass} border border-border-theme-strong`} />
      <span className="text-xs text-text-theme-primary">{label}</span>
    </div>
  );
}

/**
 * Collapsible color reference panel
 */
export function ColorLegend({
  defaultExpanded = false,
  className = '',
}: ColorLegendProps): React.ReactElement {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  
  const systemComponents: { type: SystemComponentType; label: string }[] = [
    { type: 'engine', label: 'Engine' },
    { type: 'gyro', label: 'Gyro' },
    { type: 'actuator', label: 'Actuators' },
    { type: 'cockpit', label: 'Cockpit/Sensors' },
    { type: 'empty', label: 'Empty Slot' },
  ];
  
  const equipmentTypes: { type: EquipmentColorType; label: string }[] = [
    { type: 'weapon', label: 'Weapons' },
    { type: 'ammunition', label: 'Ammunition' },
    { type: 'heatsink', label: 'Heat Sinks' },
    { type: 'electronics', label: 'Electronics' },
    { type: 'physical', label: 'Physical Weapons' },
    { type: 'misc', label: 'Other Equipment' },
  ];
  
  const techBases = [
    { techBase: TechBase.INNER_SPHERE, label: 'Inner Sphere' },
    { techBase: TechBase.CLAN, label: 'Clan' },
  ];
  
  return (
    <div className={`bg-surface-base rounded-lg border border-border-theme ${className}`}>
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-3 py-2 text-sm text-text-theme-primary hover:text-white transition-colors"
      >
        <span className="font-medium">Color Legend</span>
        <span className={`transform transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
          ▼
        </span>
      </button>
      
      {isExpanded && (
        <div className="px-3 pb-3 space-y-4 border-t border-border-theme pt-3">
          {/* System Components */}
          <div>
            <h4 className="text-xs font-semibold text-text-theme-secondary uppercase mb-2">
              System Components
            </h4>
            <div className="grid grid-cols-2 gap-1">
              {systemComponents.map(({ type, label }) => (
                <ColorSwatch
                  key={type}
                  bgClass={SLOT_COLORS[type].bg}
                  label={label}
                />
              ))}
            </div>
          </div>
          
          {/* Equipment Types */}
          <div>
            <h4 className="text-xs font-semibold text-text-theme-secondary uppercase mb-2">
              Equipment Types
            </h4>
            <div className="grid grid-cols-2 gap-1">
              {equipmentTypes.map(({ type, label }) => (
                <ColorSwatch
                  key={type}
                  bgClass={EQUIPMENT_COLORS[type].bg}
                  label={label}
                />
              ))}
            </div>
          </div>
          
          {/* Tech Base */}
          <div>
            <h4 className="text-xs font-semibold text-text-theme-secondary uppercase mb-2">
              Tech Base
            </h4>
            <div className="grid grid-cols-2 gap-1">
              {techBases.map(({ techBase, label }) => (
                <ColorSwatch
                  key={techBase}
                  bgClass={TECH_BASE_COLORS[techBase].bg}
                  label={label}
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

