import React from 'react';
import { CriticalSlotSummary } from '../../../types/unitDisplay';

interface UnitCriticalSlotSummaryProps {
  criticalSlotSummary: CriticalSlotSummary;
  compact?: boolean;
}

const UnitCriticalSlotSummary: React.FC<UnitCriticalSlotSummaryProps> = ({ 
  criticalSlotSummary, 
  compact = false 
}) => {
  if (compact) {
    return (
      <div className="p-3 border rounded shadow-sm bg-white">
        <div className="flex justify-between items-center">
          <h4 className="font-semibold text-gray-800">Critical Slots</h4>
          <div className="text-sm">
            <span className="font-medium">{criticalSlotSummary.usedSlots}/{criticalSlotSummary.totalSlots}</span>
            <span className="text-gray-500 ml-1">used</span>
          </div>
        </div>
      </div>
    );
  }

  const utilizationPercentage = criticalSlotSummary.totalSlots > 0 
    ? (criticalSlotSummary.usedSlots / criticalSlotSummary.totalSlots) * 100 
    : 0;

  return (
    <div className="p-4 border rounded shadow-sm bg-white">
      <h3 className="text-lg font-semibold mb-3 text-gray-800">Critical Slot Utilization</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="text-gray-600">Total Slots:</span>
            <span className="font-medium">{criticalSlotSummary.totalSlots}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Used Slots:</span>
            <span className="font-medium">{criticalSlotSummary.usedSlots}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Available Slots:</span>
            <span className="font-medium">{criticalSlotSummary.availableSlots}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Utilization:</span>
            <span className={`font-medium ${utilizationPercentage > 90 ? 'text-red-600' : utilizationPercentage > 75 ? 'text-yellow-600' : 'text-green-600'}`}>
              {utilizationPercentage.toFixed(1)}%
            </span>
          </div>
        </div>

        <div className="space-y-1">
          <h4 className="font-medium text-gray-800 mb-2">By Location</h4>
          <div className="max-h-32 overflow-y-auto space-y-1">
            {criticalSlotSummary.locationBreakdown.map((location, index) => (
              <div key={index} className="flex justify-between text-sm">
                <span className="text-gray-600">{location.location}:</span>
                <span className="font-medium">
                  {location.usedSlots}/{location.totalSlots}
                  <span className="text-xs text-gray-500 ml-1">
                    ({location.utilizationPercentage.toFixed(0)}%)
                  </span>
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default UnitCriticalSlotSummary;
