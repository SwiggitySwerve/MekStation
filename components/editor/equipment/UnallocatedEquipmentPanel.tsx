import React from 'react';
import { EditableUnit, MECH_LOCATIONS } from '../../../types/editor';
import { ValidationError } from '../../../types/editor';

interface UnallocatedEquipmentPanelProps {
  unit: EditableUnit;
  onEquipmentRemove: (placementId: string) => void;
  onEquipmentLocationChange: (placementId: string, newLocation: string) => void;
  validationErrors?: ValidationError[];
  readOnly?: boolean;
  compact?: boolean;
}

const UnallocatedEquipmentPanel: React.FC<UnallocatedEquipmentPanelProps> = ({
  unit,
  onEquipmentRemove,
  onEquipmentLocationChange,
  validationErrors = [],
  readOnly = false,
  compact = true,
}) => {
  // Get unallocated equipment
  const unallocatedEquipment = (unit.equipmentPlacements || []).filter(
    placement => !placement.location || placement.location === 'unallocated'
  );

  // Available locations for assignment
  const availableLocations = [
    MECH_LOCATIONS.HEAD,
    MECH_LOCATIONS.CENTER_TORSO,
    MECH_LOCATIONS.LEFT_TORSO,
    MECH_LOCATIONS.RIGHT_TORSO,
    MECH_LOCATIONS.LEFT_ARM,
    MECH_LOCATIONS.RIGHT_ARM,
    MECH_LOCATIONS.LEFT_LEG,
    MECH_LOCATIONS.RIGHT_LEG,
  ];

  return (
    <div className="unallocated-equipment-panel bg-white rounded-lg border border-gray-200 p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-900">
          Unallocated Equipment
        </h3>
        <div className="text-xs text-gray-500">
          {unallocatedEquipment.length} item{unallocatedEquipment.length !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Equipment List */}
      <div className="space-y-3 max-h-80 overflow-y-auto">
        {unallocatedEquipment.map(placement => (
          <div
            key={placement.id}
            className="equipment-placement border border-gray-200 rounded-lg p-3 bg-gray-50"
          >
            {/* Equipment Info */}
            <div className="flex items-start justify-between mb-2">
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-medium text-gray-900 truncate">
                  {placement.equipment.name}
                </h4>
                <div className="text-xs text-gray-600 mt-1">
                  {placement.equipment.weight}t • {placement.equipment.space} slots
                  {placement.equipment.damage && ` • ${placement.equipment.damage} dmg`}
                  {placement.equipment.heat && ` • ${placement.equipment.heat} heat`}
                </div>
              </div>
              
              {/* Remove Button */}
              {!readOnly && (
                <button
                  onClick={() => onEquipmentRemove(placement.id)}
                  className="ml-2 text-red-600 hover:text-red-800 transition-colors"
                  title="Remove equipment"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
              )}
            </div>

            {/* Location Assignment */}
            {!readOnly && (
              <div className="mt-2">
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Assign to Location:
                </label>
                <select
                  value={placement.location || 'unallocated'}
                  onChange={(e) => onEquipmentLocationChange(placement.id, e.target.value)}
                  className="w-full text-xs border border-gray-300 rounded px-2 py-1 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="unallocated">-- Select Location --</option>
                  {availableLocations.map(location => (
                    <option key={location} value={location}>
                      {location}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Quick Assignment Buttons */}
            {!readOnly && (
              <div className="mt-2 flex flex-wrap gap-1">
                {availableLocations.slice(0, 4).map(location => (
                  <button
                    key={location}
                    onClick={() => onEquipmentLocationChange(placement.id, location)}
                    className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded hover:bg-blue-200 transition-colors"
                    title={`Assign to ${location}`}
                  >
                    {location.split(' ').map(word => word[0]).join('')}
                  </button>
                ))}
              </div>
            )}

            {/* Validation Errors */}
            {validationErrors.some(error => error.field === placement.id) && (
              <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded">
                <div className="text-xs text-red-800">
                  {validationErrors
                    .filter(error => error.field === placement.id)
                    .map(error => error.message)
                    .join(', ')}
                </div>
              </div>
            )}
          </div>
        ))}

        {/* Empty State */}
        {unallocatedEquipment.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <div className="mb-2">
              <svg className="mx-auto h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
            <div className="text-sm font-medium text-gray-900">No unallocated equipment</div>
            <div className="text-xs text-gray-500 mt-1">
              Add equipment from the database to get started
            </div>
          </div>
        )}
      </div>

      {/* Drag and Drop Instructions */}
      {!readOnly && unallocatedEquipment.length > 0 && (
        <div className="mt-4 p-2 bg-blue-50 border border-blue-200 rounded">
          <div className="text-xs text-blue-800">
            💡 <strong>Tip:</strong> Use the dropdown or quick buttons to assign equipment to mech locations.
            You can also drag equipment directly to the Critical Slots tab for precise placement.
          </div>
        </div>
      )}

      {/* Statistics */}
      {unallocatedEquipment.length > 0 && (
        <div className="mt-4 pt-3 border-t border-gray-200">
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="flex justify-between">
              <span className="text-gray-600">Total Weight:</span>
              <span className="font-medium">
                {unallocatedEquipment.reduce((sum, p) => sum + (p.equipment.weight || 0), 0).toFixed(1)}t
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Total Slots:</span>
              <span className="font-medium">
                {unallocatedEquipment.reduce((sum, p) => sum + (p.equipment.space || 0), 0)}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UnallocatedEquipmentPanel;
