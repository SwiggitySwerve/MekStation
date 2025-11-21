import React from 'react';
import { StructureInfo } from '../../../types/unitDisplay';

interface UnitStructureInfoProps {
  structureInfo: StructureInfo;
  compact?: boolean;
}

const UnitStructureInfo: React.FC<UnitStructureInfoProps> = ({ structureInfo, compact = false }) => {
  if (compact) {
    return (
      <div className="p-3 border rounded shadow-sm bg-white">
        <div className="flex justify-between items-center">
          <h4 className="font-semibold text-gray-800">Structure</h4>
          <div className="text-sm">
            <span className="font-medium">{structureInfo.type}</span>
            <span className="text-gray-500 ml-1">({structureInfo.structureTonnage.toFixed(1)}t)</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 border rounded shadow-sm bg-white">
      <h3 className="text-lg font-semibold mb-3 text-gray-800">Internal Structure</h3>
      <div className="space-y-2">
        <div className="flex justify-between">
          <span className="text-gray-600">Type:</span>
          <span className="font-medium">{structureInfo.type}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">Total Points:</span>
          <span className="font-medium">{structureInfo.totalInternalStructure}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">Tonnage:</span>
          <span className="font-medium">{structureInfo.structureTonnage.toFixed(1)}t</span>
        </div>
      </div>
    </div>
  );
};

export default UnitStructureInfo;
