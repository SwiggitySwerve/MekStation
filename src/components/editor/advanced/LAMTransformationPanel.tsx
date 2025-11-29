import React, { useState, useCallback } from 'react';
import { EditableUnit } from '../../../types/editor';
import { LAMMode } from '../../../types/core/UnitInterfaces';

interface LAMTransformationPanelProps {
  unit: EditableUnit;
  onUnitChange: (unit: EditableUnit) => void;
  readOnly?: boolean;
}

const LAMTransformationPanel: React.FC<LAMTransformationPanelProps> = ({
  unit,
  onUnitChange,
  readOnly = false,
}) => {
  const [currentMode, setCurrentMode] = useState<LAMMode>(
    (unit.lamConfiguration?.currentMode as LAMMode) || LAMMode.MECH
  );
  const [isTransforming, setIsTransforming] = useState(false);

  // Mode characteristics
  const modeStats = {
    BattleMech: {
      name: 'BattleMech Mode',
      icon: '🤖',
      description: 'Ground combat mode with full weapon access',
      movement: 'Walk/Run/Jump',
      advantages: ['Full armor protection', 'All weapons available', 'Melee attacks'],
      restrictions: ['Cannot fly', 'Limited mobility'],
    },
    AirMech: {
      name: 'AirMech Mode',
      icon: '🚁',
      description: 'Hybrid mode with VTOL capabilities',
      movement: 'VTOL Flight',
      advantages: ['Vertical takeoff/landing', 'Hover capability', 'Most weapons available'],
      restrictions: ['Reduced armor protection', 'No melee attacks', 'Fuel consumption'],
    },
    Fighter: {
      name: 'Fighter Mode',
      icon: '✈️',
      description: 'Aerospace fighter mode for high-speed flight',
      movement: 'Aerospace Flight',
      advantages: ['High speed', 'Aerospace maneuvers', 'Bombing runs'],
      restrictions: ['Limited weapon arcs', 'Must maintain velocity', 'High fuel consumption'],
    },
  };

  // Handle mode transformation
  const handleModeChange = useCallback((newMode: LAMMode) => {
    if (readOnly || currentMode === newMode) return;

    setIsTransforming(true);

    // Simulate transformation time
    setTimeout(() => {
      setCurrentMode(newMode);

      // Update unit configuration
      const updatedUnit: EditableUnit = {
        ...unit,
        lamConfiguration: {
          structureMass: unit.lamConfiguration?.structureMass || 0,
          currentFuel: unit.lamConfiguration?.currentFuel || 100,
          currentMode: newMode,
          // Note: preserved other properties if they existed but type doesn't show them yet
          // We need to be careful about type safety here.
        },
      };

      onUnitChange(updatedUnit);
      setIsTransforming(false);
    }, 1500);
  }, [currentMode, readOnly, unit, onUnitChange]);

  // Calculate fuel consumption
  const getFuelConsumption = (mode: LAMMode): number => {
    switch (mode) {
      case 'Fighter': return 2.0;
      case 'AirMech': return 1.5;
      case 'BattleMech': return 0;
      default: return 0;
    }
  };

  // Check transformation requirements
  const canTransform = useCallback((targetMode: LAMMode): boolean => {
    // Check if unit has functional conversion equipment
    // Assuming 'conversionEquipmentDamaged' might be a property we want to check but isn't in current interface
    // For now, simplified check.
    
    // Check fuel for aerial modes
    if (targetMode !== 'BattleMech') {
      const fuelRequired = 10; // Minimum fuel for transformation
      const currentFuel = unit.lamConfiguration?.currentFuel || 0;
      if (currentFuel < fuelRequired) {
        return false;
      }
    }

    // Check pilot skill requirements
    const pilotSkill = unit.pilot?.pilotingSkill || 5;
    if (targetMode === 'Fighter' && pilotSkill > 3) {
      return false; // Requires skilled pilot for fighter mode
    }

    return true;
  }, [unit]);

  return (
    <div className="lam-transformation-panel bg-white rounded-lg border border-gray-200 p-4">
      <h3 className="text-sm font-semibold text-gray-900 mb-4">LAM Transformation Control</h3>

      {/* Current Mode Display */}
      <div className="mb-4 p-3 bg-gray-50 rounded-lg">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-2">
            <span className="text-2xl">{modeStats[currentMode].icon}</span>
            <div>
              <h4 className="font-medium text-gray-900">{modeStats[currentMode].name}</h4>
              <p className="text-xs text-gray-600">{modeStats[currentMode].description}</p>
            </div>
          </div>
          {isTransforming && (
            <div className="flex items-center space-x-2">
              <div className="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full" />
              <span className="text-xs text-blue-600">Transforming...</span>
            </div>
          )}
        </div>
      </div>

      {/* Transformation Buttons */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        {(Object.keys(modeStats) as LAMMode[]).map((mode) => (
          <button
            key={mode}
            onClick={() => handleModeChange(mode)}
            disabled={
              readOnly || 
              isTransforming || 
              currentMode === mode || 
              !canTransform(mode)
            }
            className={`
              p-3 rounded-lg border-2 transition-all duration-200
              ${currentMode === mode
                ? 'border-blue-500 bg-blue-50 text-blue-700'
                : canTransform(mode)
                ? 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
                : 'border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed'
              }
            `}
          >
            <div className="text-xl mb-1">{modeStats[mode].icon}</div>
            <div className="text-xs font-medium">{mode}</div>
            {!canTransform(mode) && currentMode !== mode && (
              <div className="text-xs text-red-500 mt-1">Unavailable</div>
            )}
          </button>
        ))}
      </div>

      {/* Mode Details */}
      <div className="space-y-3">
        <div>
          <h5 className="text-xs font-medium text-gray-700 mb-1">Movement Type</h5>
          <p className="text-sm text-gray-900">{modeStats[currentMode].movement}</p>
        </div>

        <div>
          <h5 className="text-xs font-medium text-gray-700 mb-1">Advantages</h5>
          <ul className="text-xs text-gray-600 space-y-0.5">
            {modeStats[currentMode].advantages.map((adv, idx) => (
              <li key={idx} className="flex items-start">
                <span className="text-green-500 mr-1">•</span>
                {adv}
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h5 className="text-xs font-medium text-gray-700 mb-1">Restrictions</h5>
          <ul className="text-xs text-gray-600 space-y-0.5">
            {modeStats[currentMode].restrictions.map((res, idx) => (
              <li key={idx} className="flex items-start">
                <span className="text-red-500 mr-1">•</span>
                {res}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Status Indicators */}
      <div className="mt-4 pt-3 border-t border-gray-200">
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="flex justify-between">
            <span className="text-gray-600">Fuel Level:</span>
            <span className={`font-medium ${
              (unit.lamConfiguration?.currentFuel || 0) < 20 ? 'text-red-600' : 'text-green-600'
            }`}>
              {unit.lamConfiguration?.currentFuel || 0}%
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Fuel/Turn:</span>
            <span className="font-medium">
              {getFuelConsumption(currentMode)} points
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Pilot Rating:</span>
            <span className="font-medium">
              {unit.pilot?.pilotingSkill || 5}
            </span>
          </div>
        </div>
      </div>

      {/* Warnings */}
      {(unit.lamConfiguration?.currentFuel || 0) < 20 && (
        <div className="mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-700">
          <strong>Caution:</strong> Low fuel level. Aerial modes may be limited.
        </div>
      )}
    </div>
  );
};

export default LAMTransformationPanel;
