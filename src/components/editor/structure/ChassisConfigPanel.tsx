import React, { useCallback, useMemo } from 'react';
import { EditableUnit } from '../../../types/editor';
import { getMaxArmorPoints, getMaxArmorPointsForLocation } from '../../../utils/internalStructureTable';

interface ChassisConfig {
  tonnage: number;
  isOmni: boolean;
  baseType: 'Standard' | 'Primitive';
  motiveType: 'Biped' | 'Quad' | 'Tripod' | 'LAM';
  structureType: string;
  engineType: string;
  gyroType: string;
  cockpitType: string;
  enhancement: string;
}

interface ChassisConfigPanelProps {
  unit: EditableUnit;
  onUnitChange: (unit: EditableUnit) => void;
  readOnly?: boolean;
}

// Structure types with weight multipliers
const STRUCTURE_TYPES = [
  { id: 'standard', name: 'Standard', weightMultiplier: 0.1, critSlots: 0, techLevel: 1 },
  { id: 'endo_steel', name: 'Endo Steel', weightMultiplier: 0.05, critSlots: 14, techLevel: 2 },
  { id: 'endo_steel_clan', name: 'Endo Steel (Clan)', weightMultiplier: 0.05, critSlots: 7, techLevel: 2 },
  { id: 'composite', name: 'Composite', weightMultiplier: 0.05, critSlots: 0, techLevel: 3 },
  { id: 'reinforced', name: 'Reinforced', weightMultiplier: 0.2, critSlots: 0, techLevel: 3 },
  { id: 'industrial', name: 'Industrial', weightMultiplier: 0.15, critSlots: 0, techLevel: 1 },
];

// Engine types
const ENGINE_TYPES = [
  { id: 'fusion', name: 'Fusion', weightMod: 1.0, critSlots: 6 },
  { id: 'xl', name: 'XL', weightMod: 0.5, critSlots: 12 },
  { id: 'xl_clan', name: 'XL (Clan)', weightMod: 0.5, critSlots: 10 },
  { id: 'light', name: 'Light', weightMod: 0.75, critSlots: 10 },
  { id: 'compact', name: 'Compact', weightMod: 1.5, critSlots: 3 },
  { id: 'ice', name: 'ICE', weightMod: 2.0, critSlots: 6 },
  { id: 'fuel_cell', name: 'Fuel Cell', weightMod: 1.2, critSlots: 6 },
];

// Gyro types
const GYRO_TYPES = [
  { id: 'standard', name: 'Standard', weightMod: 1.0, critSlots: 4 },
  { id: 'xl', name: 'Extra-Light', weightMod: 0.5, critSlots: 6 },
  { id: 'compact', name: 'Compact', weightMod: 1.5, critSlots: 2 },
  { id: 'heavy_duty', name: 'Heavy Duty', weightMod: 2.0, critSlots: 4 },
  { id: 'none', name: 'None (Primitive)', weightMod: 0, critSlots: 0 },
];

// Cockpit types
const COCKPIT_TYPES = [
  { id: 'standard', name: 'Standard Cockpit', weight: 3, critSlots: 1 },
  { id: 'small', name: 'Small Cockpit', weight: 2, critSlots: 1 },
  { id: 'command_console', name: 'Command Console', weight: 3, critSlots: 2 },
  { id: 'torso_mounted', name: 'Torso-Mounted', weight: 4, critSlots: 1 },
  { id: 'primitive', name: 'Primitive', weight: 5, critSlots: 1 },
  { id: 'primitive_industrial', name: 'Primitive Industrial', weight: 5, critSlots: 1 },
  { id: 'industrial', name: 'Industrial', weight: 3, critSlots: 1 },
];

// Enhancement types
const ENHANCEMENTS = [
  { id: 'none', name: 'None' },
  { id: 'tsm', name: 'Triple-Strength Myomer' },
  { id: 'masc', name: 'MASC' },
  { id: 'industrial_tsm', name: 'Industrial TSM' },
];

const ChassisConfigPanel: React.FC<ChassisConfigPanelProps> = ({
  unit,
  onUnitChange,
  readOnly = false,
}) => {
  // Calculate structure weight
  const structureWeight = useMemo(() => {
    const structureType = STRUCTURE_TYPES.find(s => s.id === unit.data?.structure?.type) || STRUCTURE_TYPES[0];
    return Math.ceil(unit.mass * structureType.weightMultiplier * 2) / 2; // Round to nearest 0.5
  }, [unit.mass, unit.data?.structure?.type]);

  // Calculate engine rating from walk MP
  const engineRating = useMemo(() => {
    const walkMP = unit.data?.movement?.walk_mp || 1;
    return walkMP * unit.mass;
  }, [unit.mass, unit.data?.movement?.walk_mp]);

  // Calculate engine weight
  const engineWeight = useMemo(() => {
    const engineType = ENGINE_TYPES.find(e => e.id === unit.data?.engine?.type) || ENGINE_TYPES[0];
    const baseWeight = engineRating * 0.04; // Base engine weight formula
    return Math.ceil(baseWeight * engineType.weightMod * 2) / 2; // Round to nearest 0.5
  }, [engineRating, unit.data?.engine?.type]);

  // Calculate gyro weight
  const gyroWeight = useMemo(() => {
    const gyroType = GYRO_TYPES.find(g => g.id === unit.data?.gyro?.type) || GYRO_TYPES[0];
    const baseWeight = Math.ceil(engineRating / 100);
    return baseWeight * gyroType.weightMod;
  }, [engineRating, unit.data?.gyro?.type]);

  // Handle tonnage change
  const handleTonnageChange = useCallback((tonnage: number) => {
    if (tonnage < 5 || tonnage > 200) return;
    
    // Update max armor calculations for all locations
    const newArmorAllocation = { ...unit.armorAllocation };
    // Use official BattleTech rule for max armor points
    const maxArmorPoints = getMaxArmorPoints(tonnage);
    // Update max armor for each location based on tonnage
    Object.keys(newArmorAllocation).forEach(location => {
      // Use official per-location max
      let maxArmor = 0;
      try {
        maxArmor = getMaxArmorPointsForLocation(tonnage, location);
      } catch (e) {
        // fallback for unknown locations
        maxArmor = 0;
      }
      newArmorAllocation[location] = {
        ...newArmorAllocation[location],
        maxArmor,
      };
    });
    
    const updatedUnit = {
      ...unit,
      mass: tonnage,
      armorAllocation: newArmorAllocation,
    };
    
    onUnitChange(updatedUnit);
  }, [unit, onUnitChange]);

  // Handle motive type change
  const handleMotiveTypeChange = useCallback((motiveType: string) => {
    // Update location structure based on motive type
    const updatedUnit = {
      ...unit,
      data: {
        ...unit.data,
        config: motiveType as any,
      },
    };
    
    // TODO: Update armor locations based on motive type
    // Quad adds Front/Rear legs, Tripod adds Center Leg, etc.
    
    onUnitChange(updatedUnit);
  }, [unit, onUnitChange]);

  // Handle structure type change
  const handleStructureTypeChange = useCallback((structureTypeId: string) => {
    const updatedUnit = {
      ...unit,
      data: {
        ...unit.data,
        structure: {
          ...unit.data.structure,
          type: structureTypeId,
        },
      },
    };
    
    onUnitChange(updatedUnit);
  }, [unit, onUnitChange]);

  return (
    <div className="chassis-config-panel bg-white rounded-lg border border-gray-300 shadow-sm p-4">
      <h3 className="text-sm font-semibold text-gray-900 mb-4">Chassis</h3>
      
      <div className="space-y-3">
        {/* Tonnage */}
        <div className="flex items-center">
          <label className="text-xs font-medium text-gray-700 w-24">Tonnage:</label>
          <div className="flex items-center space-x-1">
            <button
              onClick={() => handleTonnageChange(unit.mass - 5)}
              disabled={readOnly || unit.mass <= 5}
              className="p-1 text-gray-600 hover:text-gray-900 disabled:opacity-50"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
              </svg>
            </button>
            <input
              type="number"
              value={unit.mass}
              onChange={(e) => handleTonnageChange(parseInt(e.target.value) || 5)}
              disabled={readOnly}
              className="w-16 px-2 py-1 text-xs text-center border border-gray-300 rounded"
              min={5}
              max={200}
              step={5}
            />
            <button
              onClick={() => handleTonnageChange(unit.mass + 5)}
              disabled={readOnly || unit.mass >= 200}
              className="p-1 text-gray-600 hover:text-gray-900 disabled:opacity-50"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </button>
          </div>
        </div>

        {/* Omni checkbox */}
        <div className="flex items-center">
          <label className="text-xs font-medium text-gray-700 w-24">Omni:</label>
          <input
            type="checkbox"
            checked={unit.data?.is_omnimech || false}
            onChange={(e) => onUnitChange({
              ...unit,
              data: { ...unit.data, is_omnimech: e.target.checked }
            })}
            disabled={readOnly}
            className="h-3 w-3"
          />
        </div>

        {/* Base Type */}
        <div className="flex items-center">
          <label className="text-xs font-medium text-gray-700 w-24">Base Type:</label>
          <select
            value={unit.data?.rules_level === 1 ? 'Primitive' : 'Standard'}
            onChange={(e) => onUnitChange({
              ...unit,
              data: { ...unit.data, rules_level: e.target.value === 'Primitive' ? 1 : 2 }
            })}
            disabled={readOnly}
            className="flex-1 px-2 py-1 text-xs border border-gray-300 rounded"
          >
            <option value="Standard">Standard</option>
            <option value="Primitive">Primitive</option>
          </select>
        </div>

        {/* Motive Type */}
        <div className="flex items-center">
          <label className="text-xs font-medium text-gray-700 w-24">Motive Type:</label>
          <select
            value={unit.data?.config || 'Biped'}
            onChange={(e) => handleMotiveTypeChange(e.target.value)}
            disabled={readOnly}
            className="flex-1 px-2 py-1 text-xs border border-gray-300 rounded"
          >
            <option value="Biped">Biped</option>
            <option value="Quad">Quad</option>
            <option value="Tripod">Tripod</option>
            <option value="LAM">LAM</option>
          </select>
        </div>

        {/* Structure */}
        <div className="flex items-center">
          <label className="text-xs font-medium text-gray-700 w-24">Structure:</label>
          <select
            value={unit.data?.structure?.type || 'standard'}
            onChange={(e) => handleStructureTypeChange(e.target.value)}
            disabled={readOnly}
            className="flex-1 px-2 py-1 text-xs border border-gray-300 rounded"
          >
            {STRUCTURE_TYPES.map(type => (
              <option key={type.name} value={type.name}>
                {type.name} ({structureWeight}t)
              </option>
            ))}
          </select>
        </div>

        {/* Engine */}
        <div className="flex items-center">
          <label className="text-xs font-medium text-gray-700 w-24">Engine:</label>
          <select
            value={unit.data?.engine?.type || 'fusion'}
            onChange={(e) => onUnitChange({
              ...unit,
              data: {
                ...unit.data,
                engine: { ...unit.data.engine, type: e.target.value }
              }
            })}
            disabled={readOnly}
            className="flex-1 px-2 py-1 text-xs border border-gray-300 rounded"
          >
            {ENGINE_TYPES.map(type => (
              <option key={type.name} value={type.name}>
                {type.name} ({engineWeight}t)
              </option>
            ))}
          </select>
        </div>

        {/* Gyro */}
        <div className="flex items-center">
          <label className="text-xs font-medium text-gray-700 w-24">Gyro:</label>
          <select
            value={unit.data?.gyro?.type || 'standard'}
            onChange={(e) => onUnitChange({
              ...unit,
              data: {
                ...unit.data,
                gyro: { ...unit.data.gyro, type: e.target.value }
              }
            })}
            disabled={readOnly}
            className="flex-1 px-2 py-1 text-xs border border-gray-300 rounded"
          >
            {GYRO_TYPES.map(type => (
              <option key={type.name} value={type.name}>
                {type.name} ({gyroWeight}t)
              </option>
            ))}
          </select>
        </div>

        {/* Cockpit */}
        <div className="flex items-center">
          <label className="text-xs font-medium text-gray-700 w-24">Cockpit:</label>
          <select
            value={unit.data?.cockpit?.type || 'standard'}
            onChange={(e) => onUnitChange({
              ...unit,
              data: {
                ...unit.data,
                cockpit: { ...unit.data.cockpit, type: e.target.value }
              }
            })}
            disabled={readOnly}
            className="flex-1 px-2 py-1 text-xs border border-gray-300 rounded"
          >
            {COCKPIT_TYPES.map(type => (
              <option key={type.name} value={type.name}>
                {type.name} ({type.weight}t)
              </option>
            ))}
          </select>
        </div>

        {/* Enhancement */}
        <div className="flex items-center">
          <label className="text-xs font-medium text-gray-700 w-24">Enhancement:</label>
          <select
            value={unit.data?.myomer?.type || 'none'}
            onChange={(e) => onUnitChange({
              ...unit,
              data: {
                ...unit.data,
                myomer: { ...unit.data.myomer, type: e.target.value }
              }
            })}
            disabled={readOnly}
            className="flex-1 px-2 py-1 text-xs border border-gray-300 rounded"
          >
            {ENHANCEMENTS.map(type => (
              <option key={type.name} value={type.name}>{type.name}</option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
};

// Helper function to get max armor multiplier for each location
function getLocationMaxMultiplier(location: string, motiveType?: string): number {
  const multipliers: { [key: string]: number } = {
    'Head': 0.09,
    'Center Torso': 0.18,
    'Left Torso': 0.135,
    'Right Torso': 0.135,
    'Left Arm': 0.09,
    'Right Arm': 0.09,
    'Left Leg': 0.135,
    'Right Leg': 0.135,
    // Quad/Tripod specific
    'Front Left Leg': 0.135,
    'Front Right Leg': 0.135,
    'Rear Left Leg': 0.135,
    'Rear Right Leg': 0.135,
    'Center Leg': 0.135,
  };
  
  return multipliers[location] || 0.1;
}

export default ChassisConfigPanel;
