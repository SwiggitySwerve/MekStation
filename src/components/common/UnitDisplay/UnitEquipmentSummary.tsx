import React from 'react';
import { EquipmentSummary } from '../../../types/unitDisplay';

interface UnitEquipmentSummaryProps {
  equipmentSummary: EquipmentSummary;
  compact?: boolean;
  interactive?: boolean;
}

const UnitEquipmentSummary: React.FC<UnitEquipmentSummaryProps> = ({ 
  equipmentSummary, 
  compact = false, 
  interactive = true 
}) => {
  if (compact) {
    return (
      <div className="p-3 border rounded shadow-sm bg-white">
        <div className="flex justify-between items-center">
          <h4 className="font-semibold text-gray-800">Equipment</h4>
          <div className="text-sm">
            <span className="font-medium">{equipmentSummary.totalEquipmentCount} items</span>
            <span className="text-gray-500 ml-1">({equipmentSummary.totalEquipmentTonnage.toFixed(1)}t)</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 border rounded shadow-sm bg-white">
      <h3 className="text-lg font-semibold mb-3 text-gray-800">Equipment Summary</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="text-gray-600">Total Items:</span>
            <span className="font-medium">{equipmentSummary.totalEquipmentCount}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Total Weight:</span>
            <span className="font-medium">{equipmentSummary.totalEquipmentTonnage.toFixed(1)}t</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Total Weapons:</span>
            <span className="font-medium">{equipmentSummary.weaponSummary.totalWeapons}</span>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="text-gray-600">Energy Weapons:</span>
            <span className="font-medium">{equipmentSummary.weaponSummary.energyWeapons}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Ballistic Weapons:</span>
            <span className="font-medium">{equipmentSummary.weaponSummary.ballisticWeapons}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Missile Weapons:</span>
            <span className="font-medium">{equipmentSummary.weaponSummary.missileWeapons}</span>
          </div>
        </div>
      </div>

      {equipmentSummary.equipmentByCategory.length > 0 && (
        <div className="mt-4">
          <h4 className="font-medium text-gray-800 mb-2">Equipment by Category</h4>
          <div className="space-y-1 max-h-32 overflow-y-auto">
            {equipmentSummary.equipmentByCategory.map((category, index) => (
              <div key={index} className="flex justify-between text-sm">
                <span className="text-gray-600">{category.category}:</span>
                <span className="font-medium">
                  {category.count} ({category.tonnage.toFixed(1)}t)
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default UnitEquipmentSummary;
