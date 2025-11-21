import React from 'react';
import { ArmorInfo } from '../../../types/unitDisplay';

interface UnitArmorInfoProps {
  armorInfo: ArmorInfo;
  compact?: boolean;
}

const UnitArmorInfo: React.FC<UnitArmorInfoProps> = ({ armorInfo, compact = false }) => {
  if (compact) {
    return (
      <div className="p-3 border rounded shadow-sm bg-white">
        <div className="flex justify-between items-center">
          <h4 className="font-semibold text-gray-800">Armor</h4>
          <div className="text-sm">
            <span className="font-medium">{armorInfo.totalArmorPoints}</span>
            <span className="text-gray-500 ml-1">pts ({armorInfo.armorEfficiency.toFixed(1)}%)</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 border rounded shadow-sm bg-white">
      <h3 className="text-lg font-semibold mb-3 text-gray-800">Armor</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="text-gray-600">Type:</span>
            <span className="font-medium">{armorInfo.type}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Total Points:</span>
            <span className="font-medium">{armorInfo.totalArmorPoints}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Efficiency:</span>
            <span className={`font-medium ${armorInfo.armorEfficiency > 80 ? 'text-green-600' : 'text-yellow-600'}`}>
              {armorInfo.armorEfficiency.toFixed(1)}%
            </span>
          </div>
        </div>
        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="text-gray-600">Max Points:</span>
            <span className="font-medium">{armorInfo.maxArmorPoints}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Tonnage:</span>
            <span className="font-medium">{armorInfo.armorTonnage.toFixed(1)}t</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UnitArmorInfo;
