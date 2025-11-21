import React from 'react';
import { CustomizableUnit, UnitEquipmentItem, EquipmentItem } from '../../../types/customizer';

interface UnitBasicInfoProps {
  unit: CustomizableUnit;
  loadout: UnitEquipmentItem[];
  availableEquipment: EquipmentItem[];
  compact?: boolean;
}

const UnitBasicInfo: React.FC<UnitBasicInfoProps> = ({ 
  unit, 
  loadout, 
  availableEquipment, 
  compact = false 
}) => {
  const currentEquipmentWeight = loadout.reduce((sum, loadoutItem) => {
    const equipmentDetails = availableEquipment.find(eq => 
      eq.internal_id === loadoutItem.item_name || eq.name === loadoutItem.item_name
    );
    return sum + (equipmentDetails?.tonnage || 0);
  }, 0);

  const weightUtilization = (currentEquipmentWeight / unit.mass) * 100;

  if (compact) {
    return (
      <div className="p-3 border rounded shadow-sm bg-white">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="text-lg font-semibold">{unit.chassis} {unit.model}</h3>
            <p className="text-sm text-gray-600">{unit.data?.type || unit.type} • {unit.data?.config}</p>
          </div>
          <div className="text-right text-sm">
            <p className="font-medium">{currentEquipmentWeight.toFixed(2)} / {unit.mass}t</p>
            <p className="text-xs text-gray-500">{weightUtilization.toFixed(1)}% loaded</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 border rounded shadow-sm bg-white">
      <h2 className="text-xl font-semibold mb-3 text-gray-800">
        {unit.chassis} {unit.model}
      </h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="text-gray-600">Type:</span>
            <span className="font-medium">{unit.data?.type || unit.type}</span>
          </div>
          
          <div className="flex justify-between">
            <span className="text-gray-600">Configuration:</span>
            <span className="font-medium">{unit.data?.config || 'Standard'}</span>
          </div>
          
          <div className="flex justify-between">
            <span className="text-gray-600">Tech Base:</span>
            <span className="font-medium">{unit.data?.tech_base || 'Inner Sphere'}</span>
          </div>
          
          <div className="flex justify-between">
            <span className="text-gray-600">Era:</span>
            <span className="font-medium">{unit.data?.era || 'Unknown'}</span>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="text-gray-600">Mass:</span>
            <span className="font-medium">{unit.mass} tons</span>
          </div>
          
          <div className="flex justify-between">
            <span className="text-gray-600">Equipment Weight:</span>
            <span className="font-medium">{currentEquipmentWeight.toFixed(2)} tons</span>
          </div>
          
          <div className="flex justify-between">
            <span className="text-gray-600">Weight Utilization:</span>
            <span className={`font-medium ${weightUtilization > 90 ? 'text-red-600' : weightUtilization > 75 ? 'text-yellow-600' : 'text-green-600'}`}>
              {weightUtilization.toFixed(1)}%
            </span>
          </div>
          
          <div className="flex justify-between">
            <span className="text-gray-600">Equipment Count:</span>
            <span className="font-medium">{loadout.length} items</span>
          </div>
        </div>
      </div>

      {weightUtilization > 100 && (
        <div className="mt-3 p-2 bg-red-100 border border-red-400 text-red-700 rounded">
          <p className="text-sm font-medium">⚠️ Unit is overweight! Reduce equipment load.</p>
        </div>
      )}
    </div>
  );
};

export default UnitBasicInfo;
