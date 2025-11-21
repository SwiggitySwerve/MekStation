import React from 'react';
import { EditableUnit, ValidationError } from '../../../types/editor';

interface EquipmentStats {
  totalWeight: number;
  totalCriticals: number;
  unallocatedCount: number;
  allocatedCount: number;
}

interface EquipmentSummaryPanelProps {
  unit: EditableUnit;
  equipmentStats: EquipmentStats;
  validationErrors?: ValidationError[];
  readOnly?: boolean;
  compact?: boolean;
}

const EquipmentSummaryPanel: React.FC<EquipmentSummaryPanelProps> = ({
  unit,
  equipmentStats,
  validationErrors = [],
  readOnly = false,
  compact = true,
}) => {
  // Calculate remaining capacity
  const remainingWeight = unit.mass - equipmentStats.totalWeight;
  const isOverweight = remainingWeight < 0;

  // Calculate heat generation and dissipation
  const heatGenerated = (unit.equipmentPlacements || []).reduce((sum, placement) => {
    return sum + (placement.equipment.heat || 0);
  }, 0);

  const heatDissipated = (unit.data?.heat_sinks?.count || 10) * 
    (unit.data?.heat_sinks?.type === 'Double' ? 2 : 1);

  const heatEfficiency = heatDissipated > 0 ? heatGenerated / heatDissipated : 0;

  // Get equipment by category
  const equipmentByCategory = (unit.equipmentPlacements || []).reduce((acc, placement) => {
    const category = placement.equipment.data?.category || placement.equipment.type || 'Other';
    if (!acc[category]) acc[category] = [];
    acc[category].push(placement);
    return acc;
  }, {} as Record<string, any[]>);

  return (
    <div className="equipment-summary-panel space-y-4">
      {/* Weight Summary */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <h3 className="text-sm font-semibold text-gray-900 mb-3 border-b border-gray-200 pb-2">
          Weight Summary
        </h3>
        <div className="space-y-2 text-xs">
          <div className="flex justify-between">
            <span className="text-gray-600">Unit Tonnage:</span>
            <span className="font-medium">{unit.mass}t</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Equipment Weight:</span>
            <span className="font-medium">{equipmentStats.totalWeight.toFixed(1)}t</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Remaining:</span>
            <span className={`font-medium ${isOverweight ? 'text-red-600' : 'text-green-600'}`}>
              {remainingWeight.toFixed(1)}t
            </span>
          </div>
          
          {/* Weight Progress Bar */}
          <div className="mt-3">
            <div className="flex justify-between text-xs text-gray-600 mb-1">
              <span>Weight Usage</span>
              <span>{((equipmentStats.totalWeight / unit.mass) * 100).toFixed(1)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all ${
                  isOverweight ? 'bg-red-500' : 'bg-blue-500'
                }`}
                style={{
                  width: `${Math.min((equipmentStats.totalWeight / unit.mass) * 100, 100)}%`,
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Heat Summary */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <h3 className="text-sm font-semibold text-gray-900 mb-3 border-b border-gray-200 pb-2">
          Heat Management
        </h3>
        <div className="space-y-2 text-xs">
          <div className="flex justify-between">
            <span className="text-gray-600">Heat Sinks:</span>
            <span className="font-medium">
              {unit.data?.heat_sinks?.count || 10} ({unit.data?.heat_sinks?.type || 'Single'})
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Heat Dissipation:</span>
            <span className="font-medium">{heatDissipated}/turn</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Heat Generated:</span>
            <span className="font-medium">{heatGenerated}/turn</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Heat Balance:</span>
            <span className={`font-medium ${
              heatGenerated > heatDissipated ? 'text-red-600' : 'text-green-600'
            }`}>
              {heatGenerated - heatDissipated > 0 ? '+' : ''}{heatGenerated - heatDissipated}/turn
            </span>
          </div>

          {/* Heat Efficiency Bar */}
          <div className="mt-3">
            <div className="flex justify-between text-xs text-gray-600 mb-1">
              <span>Heat Efficiency</span>
              <span>{(heatEfficiency * 100).toFixed(0)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all ${
                  heatEfficiency > 1 ? 'bg-red-500' : heatEfficiency > 0.8 ? 'bg-yellow-500' : 'bg-green-500'
                }`}
                style={{
                  width: `${Math.min(heatEfficiency * 100, 100)}%`,
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Equipment Overview */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <h3 className="text-sm font-semibold text-gray-900 mb-3 border-b border-gray-200 pb-2">
          Equipment Overview
        </h3>
        <div className="space-y-2 text-xs">
          <div className="flex justify-between">
            <span className="text-gray-600">Total Items:</span>
            <span className="font-medium">{equipmentStats.allocatedCount + equipmentStats.unallocatedCount}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Allocated:</span>
            <span className="font-medium text-green-600">{equipmentStats.allocatedCount}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Unallocated:</span>
            <span className={`font-medium ${equipmentStats.unallocatedCount > 0 ? 'text-yellow-600' : 'text-green-600'}`}>
              {equipmentStats.unallocatedCount}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Critical Slots:</span>
            <span className="font-medium">{equipmentStats.totalCriticals}</span>
          </div>
        </div>

        {/* Equipment by Category */}
        {Object.keys(equipmentByCategory).length > 0 && (
          <div className="mt-3 pt-3 border-t border-gray-200">
            <div className="text-xs font-medium text-gray-700 mb-2">By Category:</div>
            <div className="space-y-1 text-xs">
              {Object.entries(equipmentByCategory).map(([category, items]) => (
                <div key={category} className="flex justify-between">
                  <span className="text-gray-600">{category}:</span>
                  <span className="font-medium">{items.length}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      {!readOnly && (
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-3 border-b border-gray-200 pb-2">
            Quick Actions
          </h3>
          <div className="space-y-2">
            <button
              onClick={() => {
                // TODO: Implement clear all equipment
                console.log('Clear all equipment clicked');
              }}
              className="w-full px-3 py-2 text-xs bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
            >
              Clear All Equipment
            </button>
            <button
              onClick={() => {
                // TODO: Implement auto-assign equipment
                console.log('Auto-assign equipment clicked');
              }}
              className="w-full px-3 py-2 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
              disabled={equipmentStats.unallocatedCount === 0}
            >
              Auto-Assign Equipment
            </button>
            <button
              onClick={() => {
                // TODO: Implement validate loadout
                console.log('Validate loadout clicked');
              }}
              className="w-full px-3 py-2 text-xs bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
            >
              Validate Loadout
            </button>
          </div>
        </div>
      )}

      {/* Validation Warnings */}
      {validationErrors.length > 0 && (
        <div className="bg-white rounded-lg border border-red-200 p-4">
          <h3 className="text-sm font-semibold text-red-900 mb-3 border-b border-red-200 pb-2">
            Validation Issues
          </h3>
          <div className="space-y-2">
            {validationErrors.map((error, index) => (
              <div
                key={index}
                className={`p-2 rounded text-xs ${
                  error.category === 'error'
                    ? 'bg-red-50 text-red-800 border border-red-200'
                    : 'bg-yellow-50 text-yellow-800 border border-yellow-200'
                }`}
              >
                <div className="flex items-center">
                  <svg
                    className={`w-4 h-4 mr-2 ${
                      error.category === 'error' ? 'text-red-500' : 'text-yellow-500'
                    }`}
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    {error.category === 'error' ? (
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    ) : (
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    )}
                  </svg>
                  <span className="font-medium capitalize">{error.category}:</span>
                </div>
                <div className="mt-1">{error.message}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Statistics Footer */}
      <div className="bg-gray-50 rounded-lg border border-gray-200 p-3">
        <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
          <div className="text-center">
            <div className="font-medium text-gray-900">{equipmentStats.totalWeight.toFixed(1)}t</div>
            <div>Total Weight</div>
          </div>
          <div className="text-center">
            <div className="font-medium text-gray-900">{equipmentStats.totalCriticals}</div>
            <div>Critical Slots</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EquipmentSummaryPanel;
