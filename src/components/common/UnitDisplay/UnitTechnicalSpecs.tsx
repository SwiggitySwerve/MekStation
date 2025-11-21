import React from 'react';
import { TechnicalSpecs } from '../../../types/unitDisplay';

interface UnitTechnicalSpecsProps {
  technicalSpecs: TechnicalSpecs;
  compact?: boolean;
}

const UnitTechnicalSpecs: React.FC<UnitTechnicalSpecsProps> = ({ 
  technicalSpecs, 
  compact = false 
}) => {
  if (compact) {
    return (
      <div className="p-3 border rounded shadow-sm bg-white">
        <div className="flex justify-between items-center">
          <h4 className="font-semibold text-gray-800">Technical Specs</h4>
          <div className="text-sm">
            <span className="font-medium">{technicalSpecs.techLevel}</span>
            <span className="text-gray-500 ml-1">• {technicalSpecs.rulesLevel}</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 border rounded shadow-sm bg-white">
      <h3 className="text-lg font-semibold mb-3 text-gray-800">Technical Specifications</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="text-gray-600">Tech Level:</span>
            <span className="font-medium">{technicalSpecs.techLevel}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Rules Level:</span>
            <span className="font-medium">{technicalSpecs.rulesLevel}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Battle Value:</span>
            <span className="font-medium">{technicalSpecs.battleValue || 'TBD'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Cost (C-Bills):</span>
            <span className="font-medium">
              {technicalSpecs.costCBills ? technicalSpecs.costCBills.toLocaleString() : 'TBD'}
            </span>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="text-gray-600">Walk Speed:</span>
            <span className="font-medium">{technicalSpecs.walkSpeed.toFixed(1)} kph</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Run Speed:</span>
            <span className="font-medium">{technicalSpecs.runSpeed.toFixed(1)} kph</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Jump Speed:</span>
            <span className="font-medium">{technicalSpecs.jumpSpeed.toFixed(1)} kph</span>
          </div>
        </div>
      </div>

      <div className="mt-4">
        <h4 className="font-medium text-gray-800 mb-2">Tonnage Breakdown</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">Chassis:</span>
            <span className="font-medium">{technicalSpecs.tonnageBreakdown.chassis.toFixed(1)}t</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Engine:</span>
            <span className="font-medium">{technicalSpecs.tonnageBreakdown.engine.toFixed(1)}t</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Weapons:</span>
            <span className="font-medium">{technicalSpecs.tonnageBreakdown.weapons.toFixed(1)}t</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Equipment:</span>
            <span className="font-medium">{technicalSpecs.tonnageBreakdown.equipment.toFixed(1)}t</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UnitTechnicalSpecs;
