import React from 'react';
import { CustomizableUnit } from '../../../types/customizer';
import { TechnicalSpecs } from '../../../types/unitDisplay';

interface UnitMovementInfoProps {
  unit: CustomizableUnit;
  technicalSpecs?: TechnicalSpecs;
  compact?: boolean;
}

const UnitMovementInfo: React.FC<UnitMovementInfoProps> = ({ 
  unit, 
  technicalSpecs,
  compact = false 
}) => {
  const walkMP = unit.data?.movement?.walk_mp ?? 0;
  const runMP = unit.data?.movement?.run_mp ?? walkMP * 1.5;
  const jumpMP = unit.data?.movement?.jump_mp ?? 0;

  if (compact) {
    return (
      <div className="p-3 border rounded shadow-sm bg-white">
        <div className="flex justify-between items-center">
          <h4 className="font-semibold text-gray-800">Movement</h4>
          <div className="text-sm">
            <span className="font-medium">{walkMP}/{runMP}/{jumpMP}</span>
            <span className="text-gray-500 ml-1">MP</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 border rounded shadow-sm bg-white">
      <h3 className="text-lg font-semibold mb-3 text-gray-800">Movement Profile</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="text-gray-600">Walk MP:</span>
            <span className="font-medium">{walkMP}</span>
          </div>
          
          <div className="flex justify-between">
            <span className="text-gray-600">Run MP:</span>
            <span className="font-medium">{runMP}</span>
          </div>
          
          <div className="flex justify-between">
            <span className="text-gray-600">Jump MP:</span>
            <span className="font-medium">{jumpMP}</span>
          </div>
        </div>

        {technicalSpecs && (
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-600">Walk Speed:</span>
              <span className="font-medium">{technicalSpecs.walkSpeed.toFixed(1)} kph</span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-gray-600">Run Speed:</span>
              <span className="font-medium">{technicalSpecs.runSpeed.toFixed(1)} kph</span>
            </div>
            
            {jumpMP > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-600">Jump Speed:</span>
                <span className="font-medium">{technicalSpecs.jumpSpeed.toFixed(1)} kph</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default UnitMovementInfo;
