import React, { useCallback } from 'react';
import { EditableUnit, MECH_LOCATIONS } from '../../../types/editor';
import type { ArmorAllocationType } from '../../../types/editor';
import { ArmorType, ARMOR_TYPES } from '../../../utils/armorTypes';

const normalizeArmorType = (armorType?: ArmorAllocationType): ArmorType => {
  if (!armorType) {
    return ARMOR_TYPES[0];
  }

  if (armorType.id) {
    const match = ARMOR_TYPES.find(type => type.id === armorType.id);
    if (match) {
      return match;
    }
  }

  const nameMatch = ARMOR_TYPES.find(type => type.name === armorType.name);
  return nameMatch || ARMOR_TYPES[0];
};

interface PatchworkArmorPanelProps {
  unit: EditableUnit;
  onArmorTypeChange: (location: string, armorType: ArmorType) => void;
  readOnly?: boolean;
}

interface LocationRow {
  location: string;
  displayName: string;
  currentType: ArmorType;
  availableSlots: number;
  requiredSlots: number;
}

const PatchworkArmorPanel: React.FC<PatchworkArmorPanelProps> = ({
  unit,
  onArmorTypeChange,
  readOnly = false,
}) => {
  // Get critical slots available for each location
  const getAvailableSlots = useCallback((location: string): number => {
    // Simplified calculation - in reality would check actual critical slots
    const criticalSlots = unit.criticalSlots?.filter(cs => cs.location === location && cs.isEmpty);
    return criticalSlots?.length || 0;
  }, [unit.criticalSlots]);

  // Get current armor type for location
  const getArmorTypeForLocation = useCallback((location: string): ArmorType => {
    const locationArmor = unit.armorAllocation?.[location];
    return normalizeArmorType(locationArmor?.type);
  }, [unit.armorAllocation]);

  // Build location data
  const locationData: LocationRow[] = [
    MECH_LOCATIONS.HEAD,
    MECH_LOCATIONS.CENTER_TORSO,
    MECH_LOCATIONS.LEFT_TORSO,
    MECH_LOCATIONS.RIGHT_TORSO,
    MECH_LOCATIONS.LEFT_ARM,
    MECH_LOCATIONS.RIGHT_ARM,
    MECH_LOCATIONS.LEFT_LEG,
    MECH_LOCATIONS.RIGHT_LEG,
  ].map(location => {
    const currentType = getArmorTypeForLocation(location);
    const requiredSlots = getRequiredSlotsForLocation(currentType, location, unit);
    
    return {
      location,
      displayName: location,
      currentType,
      availableSlots: getAvailableSlots(location),
      requiredSlots,
    };
  });

  // Handle armor type change
  const handleArmorTypeChange = useCallback((location: string, armorType: ArmorType) => {
    const requiredSlots = getRequiredSlotsForLocation(armorType, location, unit);
    const availableSlots = getAvailableSlots(location);
    
    if (requiredSlots > availableSlots) {
      alert(`${armorType.name} requires ${requiredSlots} critical slots, but only ${availableSlots} are available in ${location}.`);
      return;
    }
    
    onArmorTypeChange(location, armorType);
  }, [unit, getAvailableSlots, onArmorTypeChange]);

  return (
    <div className="patchwork-armor-panel bg-white rounded-lg border border-gray-200 p-4">
      <h3 className="text-sm font-semibold text-gray-900 mb-3">Patchwork Armor Configuration</h3>
      
      <div className="space-y-2">
        {/* Headers */}
        <div className="grid grid-cols-4 gap-2 text-xs font-medium text-gray-600 pb-2 border-b">
          <div>Location</div>
          <div>Armor Type</div>
          <div className="text-center">Slots Required</div>
          <div className="text-center">Slots Available</div>
        </div>
        
        {/* Location rows */}
        {locationData.map(row => (
          <div key={row.location} className="grid grid-cols-4 gap-2 items-center">
            <div className="text-sm font-medium">{row.displayName}</div>
            
            <select
              value={row.currentType.id}
              onChange={(e) => {
                const selectedType = ARMOR_TYPES.find(t => t.id === e.target.value);
                if (selectedType) {
                  handleArmorTypeChange(row.location, selectedType);
                }
              }}
              disabled={readOnly}
              className="text-sm px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {ARMOR_TYPES.map(type => (
                <option key={type.name} value={type.name}>
                  {type.name}
                </option>
              ))}
            </select>
            
            <div className={`text-center text-sm ${row.requiredSlots > row.availableSlots ? 'text-red-600 font-medium' : ''}`}>
              {row.requiredSlots}
            </div>
            
            <div className="text-center text-sm">
              {row.availableSlots}
            </div>
          </div>
        ))}
      </div>
      
      {/* Summary */}
      <div className="mt-4 pt-3 border-t border-gray-200">
        <div className="text-xs text-gray-600">
          <div className="flex justify-between mb-1">
            <span>Total Critical Slots Used:</span>
            <span className="font-medium">
              {locationData.reduce((sum, row) => sum + row.requiredSlots, 0)}
            </span>
          </div>
          <div className="flex justify-between">
            <span>Tonnage Modifier:</span>
            <span className="font-medium">
              {calculateTonnageModifier(locationData)} tons
            </span>
          </div>
        </div>
      </div>
      
      {/* Warning messages */}
      {locationData.some(row => row.requiredSlots > row.availableSlots) && (
        <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">
          <strong>Warning:</strong> Some locations don't have enough critical slots for the selected armor type.
        </div>
      )}
    </div>
  );
};

// Helper function to calculate required slots for armor type in location
function getRequiredSlotsForLocation(armorType: ArmorType, location: string, unit: EditableUnit): number {
  if (armorType.criticalSlots === 0) return 0;
  
  // For distributed armor types (ferro-fibrous, stealth), divide slots among locations
  if (armorType.id === 'ferro_fibrous' || armorType.id === 'ferro_fibrous_clan') {
    // Distribute 14 (IS) or 7 (Clan) slots across 5 locations
    const totalSlots = armorType.criticalSlots;
    const distributedLocations = ['Left Torso', 'Right Torso', 'Left Arm', 'Right Arm', 'Center Torso'];
    
    if (distributedLocations.includes(location)) {
      return Math.ceil(totalSlots / distributedLocations.length);
    }
    return 0;
  }
  
  if (armorType.id === 'stealth') {
    // Stealth armor: 2 slots in each arm and leg, 2 in each side torso
    if (location.includes('Arm') || location.includes('Leg')) return 2;
    if (location === 'Left Torso' || location === 'Right Torso') return 2;
    return 0;
  }
  
  // For other armor types, return 0 (no critical slots required)
  return 0;
}

// Helper function to calculate tonnage modifier for patchwork armor
function calculateTonnageModifier(locationData: LocationRow[]): number {
  // Patchwork armor adds 10% tonnage penalty
  const hasPatchwork = locationData.some((row, index) => 
    locationData.some((other, otherIndex) => 
      index !== otherIndex && row.currentType.id !== other.currentType.id
    )
  );
  
  return hasPatchwork ? 1.1 : 1.0;
}

export default PatchworkArmorPanel;
