/**
 * All Equipment Display - Shows complete equipment manifest with assignment details
 * Dark theme component showing all equipment and their critical slot assignments
 */

import React from 'react'
import { useUnit } from './UnitProvider'
import { EquipmentAllocation } from '../../utils/criticalSlots/CriticalSlot'

interface EquipmentManifestEntry {
  equipment: EquipmentAllocation
  status: 'Allocated' | 'Unallocated'
  locationDisplay: string
  slotDisplay: string
}

function EquipmentRow({ entry }: { entry: EquipmentManifestEntry }) {
  const { selectEquipment, selectedEquipmentId } = useUnit()
  
  const isSelected = selectedEquipmentId === entry.equipment.equipmentGroupId
  const isUnallocated = entry.status === 'Unallocated'
  
  const getEquipmentTypeColor = (type: string, isSelected: boolean): string => {
    const baseColors = {
      'weapon': isSelected ? 'bg-red-600 hover:bg-red-500' : 'bg-red-700 hover:bg-red-600',
      'ammo': isSelected ? 'bg-orange-600 hover:bg-orange-500' : 'bg-orange-700 hover:bg-orange-600',
      'equipment': isSelected ? 'bg-blue-600 hover:bg-blue-500' : 'bg-blue-700 hover:bg-blue-600',
      'heat_sink': isSelected ? 'bg-cyan-600 hover:bg-cyan-500' : 'bg-cyan-700 hover:bg-cyan-600',
    }
    
    return baseColors[type as keyof typeof baseColors] || 'bg-gray-600 hover:bg-gray-500'
  }

  const handleClick = () => {
    if (isUnallocated) {
      if (isSelected) {
        selectEquipment(null) // Deselect if already selected
      } else {
        selectEquipment(entry.equipment.equipmentGroupId) // Select for assignment
      }
    }
  }

  return (
    <tr 
      className={`border-b border-gray-600 hover:bg-gray-700 transition-colors ${
        isUnallocated ? 'cursor-pointer' : 'cursor-default'
      } ${isSelected ? 'ring-2 ring-blue-400' : ''}`}
      onClick={handleClick}
      title={isUnallocated ? (isSelected ? 'Click to deselect' : 'Click to select for assignment') : 'Equipment is allocated'}
    >
      {/* Equipment Name */}
      <td className="px-3 py-2">
        <div className="flex items-center space-x-2">
          <div 
            className={`w-3 h-3 rounded ${getEquipmentTypeColor(entry.equipment.equipmentData.type, isSelected)}`}
          ></div>
          <span className="text-white font-medium text-sm">
            {entry.equipment.equipmentData.name}
          </span>
          {isSelected && (
            <span className="text-yellow-300 text-xs font-bold">★</span>
          )}
        </div>
      </td>

      {/* Equipment Type */}
      <td className="px-3 py-2 text-gray-300 text-xs">
        {entry.equipment.equipmentData.type}
      </td>

      {/* Slot Requirements */}
      <td className="px-3 py-2 text-center">
        <span className="bg-gray-600 text-white text-xs px-2 py-1 rounded">
          {entry.equipment.equipmentData.requiredSlots}
        </span>
      </td>

      {/* Weight */}
      <td className="px-3 py-2 text-gray-300 text-xs text-center">
        {entry.equipment.equipmentData.weight}
      </td>

      {/* Status */}
      <td className="px-3 py-2 text-center">
        <span className={`text-xs px-2 py-1 rounded ${
          entry.status === 'Allocated' 
            ? 'bg-green-900 text-green-200 border border-green-600' 
            : 'bg-red-900 text-red-200 border border-red-600'
        }`}>
          {entry.status}
        </span>
      </td>

      {/* Location */}
      <td className="px-3 py-2 text-gray-300 text-xs">
        {entry.locationDisplay}
      </td>

      {/* Slot Assignment */}
      <td className="px-3 py-2 text-gray-300 text-xs">
        {entry.status === 'Allocated' ? (
          <div>
            <div>{entry.slotDisplay}</div>
            <div className="text-gray-500 text-xs">
              Indexes: [{entry.equipment.occupiedSlots.join(', ')}]
            </div>
          </div>
        ) : (
          entry.slotDisplay
        )}
      </td>

      {/* Equipment Group ID */}
      <td className="px-3 py-2 text-gray-500 text-xs font-mono">
        {entry.equipment.equipmentGroupId.slice(-8)}
      </td>
    </tr>
  )
}

export function AllEquipmentDisplay() {
  const { unit, unallocatedEquipment } = useUnit()

  // Collect all equipment from all sections
  const getAllEquipmentEntries = (): EquipmentManifestEntry[] => {
    const entries: EquipmentManifestEntry[] = []
    
    // Get allocated equipment from all sections
    const sections = unit.getAllSections()
    sections.forEach(section => {
      const equipment = section.getAllEquipment()
      equipment.forEach(eq => {
        const slotNumbers = eq.occupiedSlots.map(slot => slot + 1) // Convert to 1-based
        const slotDisplay = slotNumbers.length > 1 
          ? `${slotNumbers[0]}-${slotNumbers[slotNumbers.length - 1]}`
          : `${slotNumbers[0]}`
        
        entries.push({
          equipment: eq,
          status: 'Allocated',
          locationDisplay: eq.location,
          slotDisplay: `Slots ${slotDisplay}`
        })
      })
    })
    
    // Get unallocated equipment
    unallocatedEquipment.forEach(eq => {
      entries.push({
        equipment: eq,
        status: 'Unallocated',
        locationDisplay: 'None',
        slotDisplay: 'None'
      })
    })
    
    // Sort by status (allocated first), then by name
    return entries.sort((a, b) => {
      if (a.status !== b.status) {
        return a.status === 'Allocated' ? -1 : 1
      }
      return a.equipment.equipmentData.name.localeCompare(b.equipment.equipmentData.name)
    })
  }

  const equipmentEntries = getAllEquipmentEntries()
  const allocatedCount = equipmentEntries.filter(e => e.status === 'Allocated').length
  const unallocatedCount = equipmentEntries.filter(e => e.status === 'Unallocated').length

  if (equipmentEntries.length === 0) {
    return (
      <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
        <h2 className="text-white text-lg font-bold mb-4">All Equipment</h2>
        <div className="text-gray-400 text-center py-8">
          No equipment found on this unit
        </div>
      </div>
    )
  }

  return (
    <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-white text-lg font-bold">All Equipment</h2>
        <div className="flex space-x-4 text-xs">
          <span className="bg-green-900 text-green-200 px-2 py-1 rounded">
            {allocatedCount} Allocated
          </span>
          <span className="bg-red-900 text-red-200 px-2 py-1 rounded">
            {unallocatedCount} Unallocated
          </span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-gray-600">
              <th className="px-3 py-2 text-gray-300 text-sm font-medium">Equipment</th>
              <th className="px-3 py-2 text-gray-300 text-sm font-medium">Type</th>
              <th className="px-3 py-2 text-gray-300 text-sm font-medium text-center">Slots</th>
              <th className="px-3 py-2 text-gray-300 text-sm font-medium text-center">Weight</th>
              <th className="px-3 py-2 text-gray-300 text-sm font-medium text-center">Status</th>
              <th className="px-3 py-2 text-gray-300 text-sm font-medium">Location</th>
              <th className="px-3 py-2 text-gray-300 text-sm font-medium">Assignment</th>
              <th className="px-3 py-2 text-gray-300 text-sm font-medium">Group ID</th>
            </tr>
          </thead>
          <tbody>
            {equipmentEntries.map((entry, index) => (
              <EquipmentRow key={`${entry.equipment.equipmentGroupId}-${index}`} entry={entry} />
            ))}
          </tbody>
        </table>
      </div>

      {/* Summary Information */}
      <div className="mt-4 pt-4 border-t border-gray-600">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
          <div className="bg-gray-900 p-3 rounded">
            <div className="text-gray-400 mb-1">Total Equipment</div>
            <div className="text-white font-bold text-lg">{equipmentEntries.length}</div>
          </div>
          <div className="bg-gray-900 p-3 rounded">
            <div className="text-gray-400 mb-1">Total Slots Used</div>
            <div className="text-white font-bold text-lg">
              {equipmentEntries.filter(e => e.status === 'Allocated')
                .reduce((sum, e) => sum + e.equipment.equipmentData.requiredSlots, 0)}
            </div>
          </div>
          <div className="bg-gray-900 p-3 rounded">
            <div className="text-gray-400 mb-1">Total Weight</div>
            <div className="text-white font-bold text-lg">
              {equipmentEntries.reduce((sum, e) => sum + e.equipment.equipmentData.weight, 0)} tons
            </div>
          </div>
          <div className="bg-gray-900 p-3 rounded">
            <div className="text-gray-400 mb-1">Allocation Rate</div>
            <div className="text-white font-bold text-lg">
              {equipmentEntries.length > 0 
                ? Math.round((allocatedCount / equipmentEntries.length) * 100)
                : 0}%
            </div>
          </div>
        </div>
      </div>

      {/* Instructions */}
      <div className="mt-4 pt-4 border-t border-gray-600">
        <div className="text-gray-400 text-xs">
          <p className="mb-1">• <span className="text-green-300">Allocated</span> equipment shows location and slot assignments</p>
          <p className="mb-1">• <span className="text-red-300">Unallocated</span> equipment can be clicked to select for assignment</p>
          <p className="mb-1">• Selected equipment shows yellow star (★) and blue selection ring</p>
          <p className="mb-1">• Group ID shows the last 8 characters of the equipment's unique identifier</p>
          <p>• Refer to the Unified Color Legend above for complete color coding reference</p>
        </div>
      </div>
    </div>
  )
}
