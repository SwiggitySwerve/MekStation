/**
 * Critical Slots Display - Shows all critical slots for the unit
 * Dark theme component with color-coded equipment slots
 */

import React from 'react'
import { useUnit } from '../multiUnit/MultiUnitProvider'
import { CriticalSlot, EquipmentAllocation } from '../../utils/criticalSlots/CriticalSlot'

function CriticalSlotDisplay({ slot, location }: { slot: CriticalSlot, location: string }) {
  const { removeEquipment, selectedEquipmentId, assignSelectedEquipment, selectEquipment, unallocatedEquipment, unit } = useUnit()

  const isEmpty = !slot.content
  const isRemovable = slot.content?.type === 'equipment'
  
  // Check if this slot can actually accommodate the selected equipment
  const getSelectedEquipment = () => {
    if (!selectedEquipmentId) return null
    return unallocatedEquipment.find((eq: EquipmentAllocation) => eq.equipmentGroupId === selectedEquipmentId)
  }
  
  const selectedEquipment = getSelectedEquipment()
  const isAssignable = isEmpty && selectedEquipment && canAssignToSlot(slot, location, selectedEquipment)
  
  function canAssignToSlot(targetSlot: CriticalSlot, targetLocation: string, equipment: EquipmentAllocation): boolean {
    if (!targetSlot.isEmpty()) return false
    
    const section = unit.getSection(targetLocation)
    if (!section) return false
    
    // First check location restrictions
    if (!unit.canPlaceEquipmentInLocation(equipment.equipmentData, targetLocation)) {
      return false // Equipment is not allowed in this location
    }
    
    const requiredSlots = equipment.equipmentData.requiredSlots
    if (requiredSlots === 1) return true // Single slot equipment can go anywhere empty (if location is allowed)
    
    // For multi-slot equipment, check if there are enough consecutive empty slots starting from this slot
    const allSlots = section.getAllSlots()
    const startIndex = targetSlot.slotIndex
    
    // Check if we have enough consecutive empty slots
    for (let i = 0; i < requiredSlots; i++) {
      const slotIndex = startIndex + i
      if (slotIndex >= allSlots.length) return false // Not enough slots remaining
      
      const checkSlot = allSlots[slotIndex]
      if (!checkSlot.isEmpty()) return false // Slot is occupied
    }
    
    return true
  }

  const getSlotColorClass = (): string => {
    if (!slot.content) {
      if (isAssignable) {
        return 'bg-green-700 hover:bg-green-600 border-green-500' // Highlight assignable slots
      }
      return 'bg-gray-600 hover:bg-gray-500'
    }
    
    if (slot.content.type === 'system') {
      switch (slot.content.systemComponentType) {
        case 'engine': return 'bg-orange-600 hover:bg-orange-500'
        case 'gyro': return 'bg-purple-600 hover:bg-purple-500'
        case 'actuator': return 'bg-blue-600 hover:bg-blue-500'
        case 'life_support':
        case 'sensors':
        case 'cockpit': return 'bg-yellow-600 hover:bg-yellow-500'
        default: return 'bg-blue-600 hover:bg-blue-500'
      }
    }
    
    if (slot.content.type === 'equipment') {
      // Use equipment type colors from unified legend
      const equipmentType = slot.content.equipmentReference?.equipmentData?.type || 'equipment'
      switch (equipmentType) {
        case 'weapon': return 'bg-red-700 hover:bg-red-600'
        case 'ammo': return 'bg-orange-700 hover:bg-orange-600'
        case 'heat_sink': return 'bg-cyan-700 hover:bg-cyan-600'
        case 'equipment': 
        default: return 'bg-blue-700 hover:bg-blue-600'
      }
    }
    
    return 'bg-gray-600 hover:bg-gray-500'
  }

  const getSlotText = (): string => {
    if (!slot.content) {
      if (isAssignable) {
        return 'Click to assign'
      }
      return '-Empty-'
    }
    
    // Use the slot's built-in display name method for consistent naming
    return slot.getDisplayName()
  }

  const handleDoubleClick = () => {
    // Only allow removal of equipment, not system components
    if (slot.content?.type === 'equipment' && slot.content.equipmentGroupId) {
      console.log(`Double-click removing equipment: ${slot.content.equipmentGroupId}`)
      removeEquipment(slot.content.equipmentGroupId)
    }
  }

  const handleClick = () => {
    if (isAssignable) {
      // Try to assign selected equipment to this slot
      const success = assignSelectedEquipment(location, slot.slotIndex)
      if (!success) {
        console.log('Assignment failed - slot may not be suitable for this equipment')
      }
    }
  }

  const getCursorClass = (): string => {
    if (isAssignable) return 'cursor-pointer'
    if (isRemovable) return 'cursor-pointer'
    return 'cursor-default'
  }

  const getTitleText = (): string => {
    if (isAssignable) return 'Click to assign selected equipment'
    if (isRemovable) return 'Double-click to remove equipment'
    return ''
  }

  return (
    <div 
      className={`${getSlotColorClass()} text-white text-xs p-2 rounded border border-gray-500 
                 transition-colors ${getCursorClass()} ${isAssignable ? 'ring-1 ring-green-400' : ''}`}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      title={getTitleText()}
    >
      <div className="font-medium">
        {slot.slotIndex + 1}: {getSlotText()}
      </div>
    </div>
  )
}

function CriticalSectionDisplay({ 
  location, 
  slots 
}: { 
  location: string
  slots: CriticalSlot[] 
}) {
  return (
    <div className="bg-gray-700 p-3 rounded border border-gray-600">
      <h3 className="text-white font-bold text-sm mb-3 text-center border-b border-gray-600 pb-2">
        {location}
      </h3>
      <div className="space-y-1">
        {slots.map((slot, index) => (
          <CriticalSlotDisplay key={`${location}-${index}`} slot={slot} location={location} />
        ))}
      </div>
    </div>
  )
}

export function CriticalSlotsDisplay() {
  const { unit } = useUnit()

  // Get all sections in the standard order
  const sectionOrder = [
    'Head', 'Center Torso', 'Left Torso', 'Right Torso',
    'Left Arm', 'Right Arm', 'Left Leg', 'Right Leg'
  ]

  const sections = sectionOrder.map(location => {
    const section = unit.getSection(location)
    return {
      location,
      slots: section ? section.getAllSlots() : []
    }
  }).filter(section => section.slots.length > 0)

  return (
    <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
      <h2 className="text-white text-lg font-bold mb-4">Critical Slots</h2>
      
      {sections.length === 0 ? (
        <div className="text-gray-400 text-center py-8">
          No critical slot data available
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {sections.map(({ location, slots }) => (
            <CriticalSectionDisplay 
              key={location} 
              location={location}
              slots={slots}
            />
          ))}
        </div>
      )}
    </div>
  )
}
