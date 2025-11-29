import React, { useMemo } from 'react';
import { IArmorDef } from '../../../types/core/ComponentInterfaces';
import { getAvailableArmorTypes } from '../../../utils/componentOptionFiltering';
import { RulesLevel, TechLevel, ComponentCategory, TechBase } from '../../../types';

interface ArmorTypeSelectorProps {
  currentType: IArmorDef;
  config?: any; // Unit configuration for filtering
  availableTypes?: IArmorDef[];
  techLevel?: string;
  techBase?: string;
  onChange: (type: IArmorDef) => void;
  disabled?: boolean;
  showDetails?: boolean;
}

const ArmorTypeSelector: React.FC<ArmorTypeSelectorProps> = ({
  currentType,
  config,
  availableTypes,
  techLevel = 'Standard',
  techBase = 'Inner Sphere',
  onChange,
  disabled = false,
  showDetails = true,
}) => {
  // Use central utility for filtering if config is provided, otherwise use local filtering
  const filteredTypes = useMemo(() => {
    if (config) {
      // Use central utility
      return getAvailableArmorTypes(config).map(option => ({
        name: option.type,
        type: option.type,
        pointsPerTon: 16, // Default - could be enhanced to get from armor type data
        techBase: option.techBase as TechBase,
        techLevel: TechLevel.STANDARD, // Default - could be enhanced
        criticalSlots: 0, // Default - could be enhanced
        isClan: option.techBase === 'Clan',
        isInner: option.techBase === 'Inner Sphere',
        costMultiplier: 1,
        maxPointsPerLocationMultiplier: 1,
        category: ComponentCategory.ARMOR,
        rulesLevel: RulesLevel.STANDARD,
        introductionYear: 0,
        id: option.type,
      } as IArmorDef));
    } else {
      // Fallback to local filtering
      return availableTypes?.filter(type => {
        // Basic tech level filtering
        if (techLevel === 'Introductory' && type.techLevel !== 'Introductory') {
          return false;
        }
        if (techLevel === 'Standard' && ['Advanced', 'Experimental'].includes(type.techLevel || '')) {
          return false;
        }
        
        // Tech base filtering
        if (type.techBase && type.techBase !== 'Both' && type.techBase !== techBase) {
          return false;
        }
        
        return true;
      }) || [];
    }
  }, [config, availableTypes, techLevel, techBase]);

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedType = filteredTypes.find(type => type.name === e.target.value);
    if (selectedType) {
      onChange(selectedType);
    }
  };

  return (
    <div className="armor-type-selector">
      <div className="flex items-center gap-2">
        <label className="text-xs text-gray-300 w-20">Armor Type:</label>
        <select
          value={currentType?.name || filteredTypes[0]?.name || ''}
          onChange={handleChange}
          disabled={disabled}
          className="flex-1 text-xs bg-gray-700 text-gray-100 border border-gray-600 rounded px-2 py-1 disabled:opacity-50"
        >
          {filteredTypes.map((type) => (
            <option key={type.name} value={type.name}>
              {type.name}
            </option>
          ))}
        </select>
      </div>

      {showDetails && currentType && (
        <div className="mt-2 p-2 bg-gray-900 rounded text-xs space-y-1">
          <div className="flex justify-between">
            <span className="text-gray-400">Points per Ton:</span>
            <span className="text-gray-200 font-medium">{currentType.pointsPerTon}</span>
          </div>
          
          {typeof currentType.criticalSlots === 'number' && (
            <div className="flex justify-between">
              <span className="text-gray-400">Critical Slots:</span>
              <span className="text-gray-200 font-medium">{currentType.criticalSlots}</span>
            </div>
          )}
          
          {currentType.techLevel && (
            <div className="flex justify-between">
              <span className="text-gray-400">Tech Level:</span>
              <span className="text-gray-200 font-medium">{currentType.techLevel}</span>
            </div>
          )}
          
          {currentType.techBase && (
            <div className="flex justify-between">
              <span className="text-gray-400">Tech Base:</span>
              <span className="text-gray-200 font-medium">{currentType.techBase}</span>
            </div>
          )}
          
        </div>
      )}
    </div>
  );
};

export default ArmorTypeSelector;
