import React, { useState, useCallback } from 'react';
import { EditableUnit } from '../../../types/editor';
import { QuadVeeMode } from '../../../types/core/UnitInterfaces';

interface QuadVeeModeSwitcherProps {
  unit: EditableUnit;
  onModeChange?: (mode: QuadVeeMode) => void;
  onUnitChange: (unit: EditableUnit) => void;
  readOnly?: boolean;
}

const QuadVeeModeSwitcher: React.FC<QuadVeeModeSwitcherProps> = ({
  unit,
  onModeChange,
  onUnitChange,
  readOnly = false,
}) => {
  const [currentMode, setCurrentMode] = useState<QuadVeeMode>(
    (unit.quadVeeConfiguration?.currentMode as QuadVeeMode) || QuadVeeMode.MECH
  );
  const [isTransforming, setIsTransforming] = useState(false);

  // Mode characteristics
  const modeStats = {
    Mech: {
      name: 'Mech Mode',
      icon: '🦿',
      description: 'Quad mech configuration with full mobility',
      movement: 'Walk/Run',
      advantages: ['Higher ground clearance', 'Better rough terrain handling', 'Can traverse water'],
      restrictions: ['Slower maximum speed', 'Higher profile'],
      groundPressure: 'Low',
      maxSpeed: 'Standard',
    },
    Vehicle: {
      name: 'Vehicle Mode',
      icon: '🚗',
      description: 'Wheeled vehicle configuration for speed',
      movement: 'Cruise/Flank',
      advantages: ['Higher top speed', 'Better fuel efficiency', 'Lower profile'],
      restrictions: ['Limited rough terrain', 'Cannot cross deep water', 'Road dependent'],
      groundPressure: 'High',
      maxSpeed: '+50%',
    },
  };

  // Handle mode transformation
  const handleModeChange = useCallback((newMode: QuadVeeMode) => {
    if (readOnly || currentMode === newMode) return;

    setIsTransforming(true);

    // Simulate transformation time (faster than LAM)
    setTimeout(() => {
      setCurrentMode(newMode);
      if (onModeChange) {
        onModeChange(newMode);
      }

      // Update unit configuration
      const updatedUnit: EditableUnit = {
        ...unit,
        quadVeeConfiguration: {
          currentMode: newMode,
          lastTransformation: Date.now(),
          conversionEquipmentDamaged: unit.quadVeeConfiguration?.conversionEquipmentDamaged || false,
        },
      };

      onUnitChange(updatedUnit);
      setIsTransforming(false);
    }, 1000);
  }, [currentMode, readOnly, unit, onModeChange, onUnitChange]);

  // Check transformation requirements
  const canTransform = useCallback((targetMode: QuadVeeMode): boolean => {
    // Check if unit has functional conversion equipment
    if (unit.quadVeeConfiguration?.conversionEquipmentDamaged) {
      return false;
    }

    // Check if unit is stationary (required for transformation)
    if (unit.currentMovementPoints && unit.currentMovementPoints > 0) {
      return false;
    }

    // Check terrain restrictions
    if (targetMode === 'Vehicle' && unit.currentTerrain === 'water') {
      return false; // Cannot transform to vehicle mode in water
    }

    return true;
  }, [unit]);

  // Calculate speed bonus
  const getSpeedModifier = (mode: QuadVeeMode): string => {
    return mode === 'Vehicle' ? '+50%' : 'Standard';
  };

  return (
    <div className="quadvee-mode-switcher bg-white rounded-lg border border-gray-200 p-4">
      <h3 className="text-sm font-semibold text-gray-900 mb-4">QuadVee Mode Control</h3>

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
              <span className="text-xs text-blue-600">Converting...</span>
            </div>
          )}
        </div>
      </div>

      {/* Transformation Buttons */}
      <div className="grid grid-cols-2 gap-2 mb-4">
        {(Object.keys(modeStats) as QuadVeeMode[]).map((mode) => (
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
              p-4 rounded-lg border-2 transition-all duration-200
              ${currentMode === mode
                ? 'border-blue-500 bg-blue-50 text-blue-700'
                : canTransform(mode)
                ? 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
                : 'border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed'
              }
            `}
          >
            <div className="text-2xl mb-1">{modeStats[mode].icon}</div>
            <div className="text-sm font-medium">{mode} Mode</div>
            <div className="text-xs text-gray-500 mt-1">
              Speed: {modeStats[mode].maxSpeed}
            </div>
            {!canTransform(mode) && currentMode !== mode && (
              <div className="text-xs text-red-500 mt-1">Unavailable</div>
            )}
          </button>
        ))}
      </div>

      {/* Mode Comparison */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="space-y-2">
          <h5 className="text-xs font-medium text-gray-700">Advantages</h5>
          <ul className="text-xs text-gray-600 space-y-0.5">
            {modeStats[currentMode].advantages.map((adv, idx) => (
              <li key={idx} className="flex items-start">
                <span className="text-green-500 mr-1">+</span>
                {adv}
              </li>
            ))}
          </ul>
        </div>
        <div className="space-y-2">
          <h5 className="text-xs font-medium text-gray-700">Restrictions</h5>
          <ul className="text-xs text-gray-600 space-y-0.5">
            {modeStats[currentMode].restrictions.map((res, idx) => (
              <li key={idx} className="flex items-start">
                <span className="text-red-500 mr-1">-</span>
                {res}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Status Indicators */}
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="flex justify-between p-2 bg-gray-50 rounded">
          <span className="text-gray-600">Movement Type:</span>
          <span className="font-medium">{modeStats[currentMode].movement}</span>
        </div>
        <div className="flex justify-between p-2 bg-gray-50 rounded">
          <span className="text-gray-600">Ground Pressure:</span>
          <span className="font-medium">{modeStats[currentMode].groundPressure}</span>
        </div>
        <div className="flex justify-between p-2 bg-gray-50 rounded">
          <span className="text-gray-600">Speed Modifier:</span>
          <span className="font-medium text-blue-600">{getSpeedModifier(currentMode)}</span>
        </div>
        <div className="flex justify-between p-2 bg-gray-50 rounded">
          <span className="text-gray-600">Conversion:</span>
          <span className={`font-medium ${
            unit.quadVeeConfiguration?.conversionEquipmentDamaged ? 'text-red-600' : 'text-green-600'
          }`}>
            {unit.quadVeeConfiguration?.conversionEquipmentDamaged ? 'Damaged' : 'Functional'}
          </span>
        </div>
      </div>

      {/* Transformation Requirements */}
      <div className="mt-3 p-2 bg-blue-50 border border-blue-200 rounded text-xs">
        <p className="text-blue-700">
          <strong>Transformation Requirements:</strong>
        </p>
        <ul className="mt-1 space-y-0.5 text-blue-600">
          <li>• Unit must be stationary (0 MP used)</li>
          <li>• Conversion equipment must be functional</li>
          <li>• Cannot transform to vehicle mode in water</li>
        </ul>
      </div>

      {/* Warnings */}
      {unit.quadVeeConfiguration?.conversionEquipmentDamaged && (
        <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">
          <strong>Warning:</strong> Conversion equipment is damaged. Transformation unavailable.
        </div>
      )}
      {unit.currentMovementPoints !== undefined && unit.currentMovementPoints > 0 && (
        <div className="mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-700">
          <strong>Note:</strong> Unit must be stationary to transform.
        </div>
      )}
      {unit.currentTerrain === 'water' && currentMode === 'Mech' && (
        <div className="mt-3 p-2 bg-blue-50 border border-blue-200 rounded text-xs text-blue-700">
          <strong>Info:</strong> Cannot transform to vehicle mode while in water.
        </div>
      )}
    </div>
  );
};

export default QuadVeeModeSwitcher;
