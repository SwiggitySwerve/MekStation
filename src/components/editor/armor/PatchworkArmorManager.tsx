import React, { useState, useMemo } from 'react';
import { EditableUnit } from '../../../types/editor';
import { ARMOR_TYPES } from '../../../utils/armorTypes';

interface PatchworkArmorManagerProps {
  unit: EditableUnit;
  currentArmorData: LocationArmorData[];
  onUpdatePatchwork: (locationArmorTypes: LocationArmorType[]) => void;
  disabled?: boolean;
}

// Defined locally as it seems specific to this UI manager for now
interface ArmorType {
  id: string;
  name: string;
  pointsPerTon: number;
  criticalSlots: number;
  techBase: string;
  techLevel: string;
  costMultiplier: number;
  description: string;
  isClan: boolean;
  isInner: boolean;
}

interface LocationArmorData {
  location: string;
  armorType: ArmorType;
  tonnage: number;
  points: number;
}

interface LocationArmorType {
  location: string;
  armorType: ArmorType;
}

const LOCATIONS = [
  'Head',
  'Center Torso',
  'Left Torso',
  'Right Torso',
  'Left Arm',
  'Right Arm',
  'Left Leg',
  'Right Leg',
];

const PatchworkArmorManager: React.FC<PatchworkArmorManagerProps> = ({
  unit,
  currentArmorData,
  onUpdatePatchwork,
  disabled = false,
}) => {
  const [isPatchworkEnabled, setIsPatchworkEnabled] = useState(false);
  // Convert imported armor types to our ArmorType format
  const convertedArmorTypes: ArmorType[] = ARMOR_TYPES.map(at => ({
    id: at.id,
    name: at.name,
    pointsPerTon: at.pointsPerTon,
    criticalSlots: at.criticalSlots,
    techBase: at.techBase,
    techLevel: at.minTechLevel >= 3 ? 'Experimental' : at.minTechLevel >= 2 ? 'Advanced' : 'Standard',
    costMultiplier: at.costMultiplier,
    description: at.specialRules?.join(', ') || '',
    isClan: at.techBase === 'Clan',
    isInner: at.techBase === 'Inner Sphere' || at.techBase === 'Both',
  }));

  const [locationArmorTypes, setLocationArmorTypes] = useState<LocationArmorType[]>(
    LOCATIONS.map(location => ({
      location,
      armorType: convertedArmorTypes[0], // Default to Standard
    }))
  );

  // Get available armor types based on tech level
  const availableArmorTypes = useMemo(() => {
    // Unit data might not have raw 'rules_level' string property anymore if strict typed
    // but if it does, we cast or use accessors.
    // EditableUnit extends ICompleteUnitConfiguration which has rulesLevel (enum)
    const unitTechLevel = unit.rulesLevel?.toString() || 'Standard';
    
    return convertedArmorTypes.filter((armorType: ArmorType) => {
      // Filter by tech level compatibility
      if (armorType.techLevel === 'Experimental' && !unitTechLevel.includes('Experimental')) {
        return false;
      }
      if (armorType.techLevel === 'Advanced' && unitTechLevel.includes('Introductory')) {
        return false;
      }
      
      // Filter by tech base compatibility
      // EditableUnit has techBase (enum)
      const unitTechBase = unit.techBase?.toString() || 'Inner Sphere';
      if (armorType.techBase === 'Clan' && unitTechBase === 'Inner Sphere') {
        return false;
      }
      if (armorType.techBase === 'Inner Sphere' && unitTechBase === 'Clan') {
        return false;
      }
      
      return true;
    });
  }, [unit, convertedArmorTypes]);

  // Calculate total tonnage and critical slots used
  const patchworkStats = useMemo(() => {
    if (!isPatchworkEnabled) {
      return { totalTonnage: 0, totalCriticals: 0, costMultiplier: 1 };
    }

    let totalTonnage = 0;
    let totalCriticals = 0;
    const uniqueArmorTypes = new Set<string>();

    currentArmorData.forEach((locData, index) => {
      const armorType = locationArmorTypes[index]?.armorType || convertedArmorTypes[0];
      uniqueArmorTypes.add(armorType.id);
      totalTonnage += locData.tonnage;
      
      // Critical slots are only counted once per armor type
      if (armorType.criticalSlots && !uniqueArmorTypes.has(armorType.id)) {
        totalCriticals += armorType.criticalSlots;
      }
    });

    // Cost multiplier for patchwork (typically 150% or 1.5x)
    const costMultiplier = uniqueArmorTypes.size > 1 ? 1.5 : 1;

    return { totalTonnage, totalCriticals, costMultiplier };
  }, [isPatchworkEnabled, currentArmorData, locationArmorTypes]);

  const handleTogglePatchwork = () => {
    setIsPatchworkEnabled(!isPatchworkEnabled);
    if (!isPatchworkEnabled) {
      // When enabling, use current armor data if available
      const updatedTypes = currentArmorData.map((data, index) => ({
        location: LOCATIONS[index],
        armorType: data.armorType,
      }));
      setLocationArmorTypes(updatedTypes);
      onUpdatePatchwork(updatedTypes);
    } else {
      // When disabling, reset all to standard
      const standardType = convertedArmorTypes[0];
      const resetTypes = LOCATIONS.map(location => ({
        location,
        armorType: standardType,
      }));
      setLocationArmorTypes(resetTypes);
      onUpdatePatchwork(resetTypes);
    }
  };

  const handleLocationArmorChange = (location: string, armorType: ArmorType) => {
    const updatedTypes = locationArmorTypes.map(lat =>
      lat.location === location ? { ...lat, armorType } : lat
    );
    setLocationArmorTypes(updatedTypes);
    onUpdatePatchwork(updatedTypes);
  };

  return (
    <div className="patchwork-armor-manager bg-gray-800 rounded-lg p-4 border border-gray-700">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-100">Patchwork Armor</h3>
        <button
          onClick={handleTogglePatchwork}
          disabled={disabled}
          className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
            isPatchworkEnabled
              ? 'bg-purple-600 text-white hover:bg-purple-700'
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          {isPatchworkEnabled ? 'Enabled' : 'Disabled'}
        </button>
      </div>

      {isPatchworkEnabled && (
        <>
          {/* Location armor type selection */}
          <div className="space-y-2 mb-4">
            {LOCATIONS.map((location, index) => {
              const currentType = locationArmorTypes[index]?.armorType || convertedArmorTypes[0];
              const locationData = currentArmorData.find(d => d.location === location);
              
              return (
                <div key={location} className="flex items-center gap-2">
                  <div className="w-24 text-xs text-gray-400">{location}:</div>
                  <select
                    value={currentType.name}
                    onChange={(e) => {
                      const newType = availableArmorTypes.find((t: ArmorType) => t.id === e.target.value);
                      if (newType) {
                        handleLocationArmorChange(location, newType);
                      }
                    }}
                    disabled={disabled}
                    className="flex-1 px-2 py-1 bg-gray-700 text-gray-100 rounded text-xs border border-gray-600 focus:border-blue-500 focus:outline-none"
                  >
                    {availableArmorTypes.map((armorType: ArmorType) => (
                      <option key={armorType.name} value={armorType.name}>
                        {armorType.name} ({armorType.pointsPerTon} pts/ton)
                      </option>
                    ))}
                  </select>
                  {locationData && (
                    <div className="text-xs text-gray-500">
                      {locationData.tonnage.toFixed(1)}t, {locationData.points}pts
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Patchwork statistics */}
          <div className="bg-gray-900 rounded p-3">
            <h4 className="text-xs font-medium text-gray-400 mb-2">Patchwork Summary</h4>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-gray-500">Total Tonnage:</span>
                <span className="ml-2 text-gray-300">{patchworkStats.totalTonnage.toFixed(1)} tons</span>
              </div>
              <div>
                <span className="text-gray-500">Critical Slots:</span>
                <span className="ml-2 text-gray-300">{patchworkStats.totalCriticals}</span>
              </div>
              <div>
                <span className="text-gray-500">Cost Multiplier:</span>
                <span className="ml-2 text-yellow-400">{patchworkStats.costMultiplier}x</span>
              </div>
              <div>
                <span className="text-gray-500">Armor Types:</span>
                <span className="ml-2 text-gray-300">
                  {new Set(locationArmorTypes.map(lat => lat.armorType.id)).size}
                </span>
              </div>
            </div>
          </div>

          {/* Warnings */}
          {patchworkStats.costMultiplier > 1 && (
            <div className="mt-3 bg-yellow-900/20 border border-yellow-700 rounded p-2">
              <div className="text-xs text-yellow-300 flex items-start gap-2">
                <svg className="w-4 h-4 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <div>
                  Patchwork armor increases unit cost by {((patchworkStats.costMultiplier - 1) * 100).toFixed(0)}%
                </div>
              </div>
            </div>
          )}

          {/* Critical slot warning */}
          {patchworkStats.totalCriticals > 14 && (
            <div className="mt-2 bg-red-900/20 border border-red-700 rounded p-2">
              <div className="text-xs text-red-300 flex items-start gap-2">
                <svg className="w-4 h-4 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  Patchwork armor requires {patchworkStats.totalCriticals} critical slots, which may exceed available space
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {!isPatchworkEnabled && (
        <div className="text-xs text-gray-400">
          Enable patchwork armor to use different armor types on each location. This increases cost but provides tactical flexibility.
        </div>
      )}
    </div>
  );
};

export default PatchworkArmorManager;
