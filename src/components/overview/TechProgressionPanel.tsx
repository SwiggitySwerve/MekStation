/**
 * Tech Progression Panel Component
 * 
 * Handles the technology progression matrix where users can set each subsystem
 * to Inner Sphere or Clan technology independently.
 * 
 * Phase 4: Component Modularization - Day 15
 * Extracted from OverviewTabV2.tsx (992 lines → focused components)
 */

import React from 'react'
import { TechProgression } from '../../utils/techProgression'
import { ComponentMemoryState } from '../../types/componentDatabase'

interface TechProgressionPanelProps {
  techProgression: TechProgression
  currentConfig: any
  readOnly?: boolean
  renderKey: number
  onTechProgressionChange: (subsystem: keyof TechProgression, techBase: 'Inner Sphere' | 'Clan') => void
  isMixed: boolean
}

/**
 * Subsystem labels for tech progression matrix
 */
const SUBSYSTEM_LABELS = {
  chassis: 'Tech/Chassis',
  gyro: 'Tech/Gyro', 
  engine: 'Tech/Engine',
  heatsink: 'Tech/Heatsink',
  targeting: 'Tech/Targeting',
  myomer: 'Tech/Myomer',
  movement: 'Tech/Movement',
  armor: 'Tech/Armor'
} as const

export const TechProgressionPanel: React.FC<TechProgressionPanelProps> = ({
  techProgression,
  currentConfig,
  readOnly = false,
  renderKey,
  onTechProgressionChange,
  isMixed
}) => {
  // Debugging: Log isMixed and readOnly
  console.log('[TechProgressionPanel] isMixed:', isMixed, 'readOnly:', readOnly);
  
  // Helper function to get current component for a subsystem
  const getCurrentComponentForSubsystem = (subsystem: keyof TechProgression, config: any): string => {
    const propertyMap = {
      chassis: 'structureType',
      gyro: 'gyroType', 
      engine: 'engineType',
      heatsink: 'heatSinkType',
      myomer: 'enhancementType',
      armor: 'armorType',
      targeting: 'targetingType',
      movement: 'movementType'
    };
    
    const property = propertyMap[subsystem];
    if (!property) return 'Standard';
    
    const value = config[property];
    
    // Handle ComponentConfiguration objects by extracting the type property
    if (value && typeof value === 'object' && 'type' in value) {
      return value.type;
    }
    
    // Handle string values or fallback to default
    return value || 'Standard';
  }

  return (
    <div className="bg-slate-800/90 backdrop-blur-sm rounded-lg p-4 border border-slate-700/50 shadow-lg">
      <h3 className="text-slate-100 font-semibold text-lg mb-4 flex items-center gap-2">
        <span className="w-2 h-2 bg-purple-500 rounded-full"></span>
        Technology Progression
      </h3>
      
      <div key={`tech-progression-${renderKey}`} className="space-y-2">
        {Object.entries(SUBSYSTEM_LABELS).map(([subsystem, label]) => {
          const currentTechBase = techProgression[subsystem as keyof TechProgression];
          // Get current component value using our helper function
          const currentValue = getCurrentComponentForSubsystem(subsystem as keyof TechProgression, currentConfig);
          // If not mixed, lock to master tech base
          const lockedTechBase = isMixed ? currentTechBase : (currentConfig.techBase || 'Inner Sphere');
          return (
            <div key={subsystem} className="grid grid-cols-3 gap-2 items-center">
              {/* Subsystem Label with Current Component */}
              <div className="text-slate-300 text-xs font-medium">
                <div>{label}</div>
                {currentValue && (
                  <div className="text-slate-500 text-xs mt-0.5 truncate flex items-center gap-1">
                    {lockedTechBase !== 'Inner Sphere' && lockedTechBase !== 'Clan' && (
                        <span className="w-1.5 h-1.5 rounded-full bg-purple-500" title="Mixed Tech"></span>
                    )}
                    {currentValue}
                  </div>
                )}
              </div>
              {/* Inner Sphere Option */}
              <button
                onClick={() => onTechProgressionChange(subsystem as keyof TechProgression, 'Inner Sphere')}
                disabled={readOnly || !isMixed}
                className={`px-2 py-1.5 rounded text-xs font-medium transition-all duration-200 ${
                  lockedTechBase === 'Inner Sphere'
                    ? 'bg-green-600 text-white border border-green-500 shadow-md'
                    : 'bg-slate-700/50 text-slate-300 border border-slate-600/50 hover:border-green-500/50 hover:bg-slate-600/50'
                }`}
              >
                Inner Sphere
              </button>
              {/* Clan Option */}
              <button
                onClick={() => onTechProgressionChange(subsystem as keyof TechProgression, 'Clan')}
                disabled={readOnly || !isMixed}
                className={`px-2 py-1.5 rounded text-xs font-medium transition-all duration-200 ${
                  lockedTechBase === 'Clan'
                    ? 'bg-orange-600 text-white border border-orange-500 shadow-md'
                    : 'bg-slate-700/50 text-slate-300 border border-slate-600/50 hover:border-orange-500/50 hover:bg-slate-600/50'
                }`}
              >
                Clan
              </button>
            </div>
          );
        })}
      </div>
      
      {isMixed && (
        <div className="mt-4 p-3 bg-blue-900/20 border border-blue-600/30 rounded-md">
          <div className="text-blue-300 text-sm font-medium mb-1">Mixed Technology Configuration</div>
          <div className="text-blue-200 text-xs">
            This unit combines Inner Sphere and Clan technologies. Each subsystem can be configured independently.
          </div>
        </div>
      )}
    </div>
  )
}

export default TechProgressionPanel
