import React, { useState, useCallback } from 'react';
import { EditableUnit } from '../../../types/editor';

interface ProtoMechScalingPanelProps {
  unit: EditableUnit;
  onUnitChange: (unit: EditableUnit) => void;
  readOnly?: boolean;
}

const ProtoMechScalingPanel: React.FC<ProtoMechScalingPanelProps> = ({
  unit,
  onUnitChange,
  readOnly = false,
}) => {
  const [selectedScale, setSelectedScale] = useState(unit.protoMechScale || 2);

  // ProtoMech scale characteristics
  const scaleData = {
    2: {
      name: '2-ton ProtoMech',
      armorPoints: 12,
      criticalSlots: 3,
      maxSpeed: 'Fast',
      jumpCapacity: 'Limited',
      weaponCapacity: 'Minimal',
      advantages: ['Very small profile', 'Excellent mobility', 'Low cost'],
      limitations: ['Minimal armor', 'Very limited weapons', 'No hands'],
    },
    3: {
      name: '3-ton ProtoMech',
      armorPoints: 18,
      criticalSlots: 4,
      maxSpeed: 'Fast',
      jumpCapacity: 'Moderate',
      weaponCapacity: 'Light',
      advantages: ['Small profile', 'Good mobility', 'Low cost'],
      limitations: ['Light armor', 'Limited weapons', 'No hands'],
    },
    4: {
      name: '4-ton ProtoMech',
      armorPoints: 24,
      criticalSlots: 5,
      maxSpeed: 'Moderate',
      jumpCapacity: 'Moderate',
      weaponCapacity: 'Light',
      advantages: ['Balanced design', 'Decent protection', 'Cost effective'],
      limitations: ['Limited weapons', 'No hands'],
    },
    5: {
      name: '5-ton ProtoMech',
      armorPoints: 30,
      criticalSlots: 6,
      maxSpeed: 'Moderate',
      jumpCapacity: 'Good',
      weaponCapacity: 'Moderate',
      advantages: ['Good armor', 'Decent weapon load', 'Jump capable'],
      limitations: ['Slower speed', 'Higher cost', 'No hands'],
    },
    6: {
      name: '6-ton ProtoMech',
      armorPoints: 36,
      criticalSlots: 7,
      maxSpeed: 'Moderate',
      jumpCapacity: 'Good',
      weaponCapacity: 'Moderate',
      advantages: ['Strong armor', 'Good weapons', 'Can mount hands'],
      limitations: ['Slower speed', 'Higher cost'],
    },
    7: {
      name: '7-ton ProtoMech',
      armorPoints: 42,
      criticalSlots: 8,
      maxSpeed: 'Slow',
      jumpCapacity: 'Good',
      weaponCapacity: 'Good',
      advantages: ['Heavy armor', 'Good weapon capacity', 'Can mount hands'],
      limitations: ['Low speed', 'High cost'],
    },
    8: {
      name: '8-ton ProtoMech',
      armorPoints: 48,
      criticalSlots: 9,
      maxSpeed: 'Slow',
      jumpCapacity: 'Good',
      weaponCapacity: 'Good',
      advantages: ['Maximum armor', 'Heavy weapons', 'Can mount hands'],
      limitations: ['Very slow', 'Very high cost'],
    },
    9: {
      name: '9-ton ProtoMech',
      armorPoints: 54,
      criticalSlots: 10,
      maxSpeed: 'Slow',
      jumpCapacity: 'Excellent',
      weaponCapacity: 'Heavy',
      advantages: ['Maximum protection', 'Heavy weapon load', 'Full manipulators'],
      limitations: ['Very slow', 'Highest cost', 'Large profile'],
    },
  };

  // Handle scale change
  const handleScaleChange = useCallback((newScale: number) => {
    if (readOnly || newScale === selectedScale) return;

    setSelectedScale(newScale);
    
    const updatedUnit = {
      ...unit,
      protoMechScale: newScale,
      mass: newScale,
      // Update armor and critical slots based on scale
      armorAllocation: {
        ...unit.armorAllocation,
        'Torso': {
          front: Math.min(unit.armorAllocation['Torso']?.front || 0, scaleData[newScale as keyof typeof scaleData].armorPoints),
          maxArmor: scaleData[newScale as keyof typeof scaleData].armorPoints,
          type: unit.armorAllocation['Torso']?.type || { id: 'standard', name: 'Standard', pointsPerTon: 16, criticalSlots: 0, techLevel: 1, isClan: true, isInner: false },
        },
      },
      // Update critical slots
      maxCriticalSlots: scaleData[newScale as keyof typeof scaleData].criticalSlots,
    };

    onUnitChange(updatedUnit);
  }, [selectedScale, readOnly, unit, onUnitChange]);

  const currentData = scaleData[selectedScale as keyof typeof scaleData];

  return (
    <div className="protomech-scaling-panel bg-white rounded-lg border border-gray-200 p-4">
      <h3 className="text-sm font-semibold text-gray-900 mb-4">ProtoMech Configuration</h3>

      {/* Scale Selector */}
      <div className="mb-4">
        <label className="block text-xs font-medium text-gray-700 mb-2">Weight Class</label>
        <div className="grid grid-cols-4 gap-2">
          {[2, 3, 4, 5, 6, 7, 8, 9].map((scale) => (
            <button
              key={scale}
              onClick={() => handleScaleChange(scale)}
              disabled={readOnly}
              className={`
                p-2 rounded-lg border-2 transition-all duration-200 text-sm
                ${selectedScale === scale
                  ? 'border-blue-500 bg-blue-50 text-blue-700 font-medium'
                  : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
                }
                ${readOnly ? 'cursor-not-allowed opacity-50' : ''}
              `}
            >
              {scale} tons
            </button>
          ))}
        </div>
      </div>

      {/* Current Configuration */}
      <div className="mb-4 p-3 bg-gray-50 rounded-lg">
        <h4 className="font-medium text-gray-900 mb-2">{currentData.name}</h4>
        
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div>
            <span className="text-gray-600">Armor Points:</span>
            <span className="ml-2 font-medium">{currentData.armorPoints}</span>
          </div>
          <div>
            <span className="text-gray-600">Critical Slots:</span>
            <span className="ml-2 font-medium">{currentData.criticalSlots}</span>
          </div>
          <div>
            <span className="text-gray-600">Speed Rating:</span>
            <span className="ml-2 font-medium">{currentData.maxSpeed}</span>
          </div>
          <div>
            <span className="text-gray-600">Jump Capacity:</span>
            <span className="ml-2 font-medium">{currentData.jumpCapacity}</span>
          </div>
          <div className="col-span-2">
            <span className="text-gray-600">Weapon Capacity:</span>
            <span className="ml-2 font-medium">{currentData.weaponCapacity}</span>
          </div>
        </div>
      </div>

      {/* Advantages and Limitations */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <h5 className="text-xs font-medium text-gray-700 mb-1">Advantages</h5>
          <ul className="text-xs text-gray-600 space-y-0.5">
            {currentData.advantages.map((adv, idx) => (
              <li key={idx} className="flex items-start">
                <span className="text-green-500 mr-1">•</span>
                {adv}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h5 className="text-xs font-medium text-gray-700 mb-1">Limitations</h5>
          <ul className="text-xs text-gray-600 space-y-0.5">
            {currentData.limitations.map((lim, idx) => (
              <li key={idx} className="flex items-start">
                <span className="text-red-500 mr-1">•</span>
                {lim}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Special Rules */}
      <div className="mt-4 p-2 bg-blue-50 border border-blue-200 rounded text-xs">
        <p className="text-blue-700">
          <strong>ProtoMech Rules:</strong>
        </p>
        <ul className="mt-1 space-y-0.5 text-blue-600">
          <li>• Moves as infantry in buildings</li>
          <li>• Cannot be targeted by anti-mech attacks</li>
          <li>• {selectedScale >= 6 ? 'Can mount manipulators' : 'Cannot mount hands'}</li>
          <li>• Uses special armor and critical hit rules</li>
        </ul>
      </div>

      {/* Equipment Restrictions */}
      <div className="mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs">
        <p className="text-yellow-700">
          <strong>Equipment Restrictions:</strong>
        </p>
        <ul className="mt-1 space-y-0.5 text-yellow-600">
          <li>• Only ProtoMech-rated weapons allowed</li>
          <li>• No standard Mech equipment</li>
          <li>• Maximum weapon weight: {Math.floor(selectedScale * 0.6)} tons</li>
          <li>• Special myomer and cockpit included</li>
        </ul>
      </div>
    </div>
  );
};

export default ProtoMechScalingPanel;
