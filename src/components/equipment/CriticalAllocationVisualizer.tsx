import React, { useMemo, useState, useCallback } from 'react';
import { EditableUnit, CriticalSlotAssignment } from '../../types/editor';
import { FullEquipment } from '../../types';

interface CriticalAllocationVisualizerProps {
  unit: EditableUnit;
  onSlotClick?: (location: string, slotIndex: number) => void;
  onEquipmentClick?: (equipment: FullEquipment, location: string) => void;
  highlightedEquipment?: string;
  showDamage?: boolean;
  compact?: boolean;
}

interface LocationSlots {
  location: string;
  slots: (CriticalSlotAssignment | null)[];
  maxSlots: number;
}

const LOCATION_SLOT_COUNTS: Record<string, number> = {
  'Head': 6,
  'Center Torso': 12,
  'Right Torso': 12,
  'Left Torso': 12,
  'Right Arm': 12,
  'Left Arm': 12,
  'Right Leg': 6,
  'Left Leg': 6,
  'Center Leg': 6, // Tripod
};

const LOCATION_ABBREVIATIONS: Record<string, string> = {
  'Head': 'HD',
  'Center Torso': 'CT',
  'Right Torso': 'RT',
  'Left Torso': 'LT',
  'Right Arm': 'RA',
  'Left Arm': 'LA',
  'Right Leg': 'RL',
  'Left Leg': 'LL',
  'Center Leg': 'CL',
};

// Color coding for different equipment types
const EQUIPMENT_COLORS: Record<string, string> = {
  'Energy Weapon': '#ef4444', // red
  'Ballistic Weapon': '#f59e0b', // amber
  'Missile Weapon': '#10b981', // emerald
  'Ammunition': '#6366f1', // indigo
  'Equipment': '#8b5cf6', // violet
  'Heat Sink': '#06b6d4', // cyan
  'Structure': '#6b7280', // gray
  'Armor': '#64748b', // slate
  'Actuator': '#78716c', // stone
  'Engine': '#525252', // neutral
  'Gyro': '#71717a', // zinc
  'Cockpit': '#3b82f6', // blue
};

export const CriticalAllocationVisualizer: React.FC<CriticalAllocationVisualizerProps> = ({
  unit,
  onSlotClick,
  onEquipmentClick,
  highlightedEquipment,
  showDamage = false,
  compact = false,
}) => {
  const [selectedLocation, setSelectedLocation] = useState<string | null>(null);
  const [hoveredSlot, setHoveredSlot] = useState<{ location: string; index: number } | null>(null);

  // Organize critical slots by location
  const locationSlots = useMemo((): LocationSlots[] => {
    const locations = Object.keys(LOCATION_SLOT_COUNTS);
    
    return locations.map(location => {
      const maxSlots = LOCATION_SLOT_COUNTS[location];
      const slots: (CriticalSlotAssignment | null)[] = new Array(maxSlots).fill(null);
      
      // Fill in assigned slots
      unit.criticalSlots
        .filter(slot => slot.location === location)
        .forEach(slot => {
          if (slot.slotIndex < maxSlots) {
            slots[slot.slotIndex] = slot;
          }
        });
      
      return { location, slots, maxSlots };
    });
  }, [unit.criticalSlots]);

  // Get equipment color
  const getEquipmentColor = useCallback((equipment?: FullEquipment): string => {
    if (!equipment) return '#e5e7eb'; // gray-200
    
    // Check for specific equipment types
    if (equipment.type.includes('Weapon')) {
      if (equipment.data?.weapon_type === 'Energy') return EQUIPMENT_COLORS['Energy Weapon'];
      if (equipment.data?.weapon_type === 'Ballistic') return EQUIPMENT_COLORS['Ballistic Weapon'];
      if (equipment.data?.weapon_type === 'Missile') return EQUIPMENT_COLORS['Missile Weapon'];
    }
    
    return EQUIPMENT_COLORS[equipment.type] || EQUIPMENT_COLORS['Equipment'];
  }, []);

  // Get slot display info
  const getSlotDisplay = useCallback((slot: CriticalSlotAssignment | null): {
    text: string;
    color: string;
    isDamaged: boolean;
    isHighlighted: boolean;
  } => {
    if (!slot) {
      return {
        text: '—',
        color: '#e5e7eb',
        isDamaged: false,
        isHighlighted: false,
      };
    }

    if (slot.systemType) {
      // Fixed system slots
      return {
        text: slot.systemType.toUpperCase().slice(0, 3),
        color: EQUIPMENT_COLORS[slot.systemType] || '#6b7280',
        isDamaged: false, // showDamage && slot.isDestroyed || false,
        isHighlighted: false,
      };
    }

    if (slot.equipment) {
      // Equipment slots
      const abbreviation = slot.equipment.name
        .split(' ')
        .map(word => word[0])
        .join('')
        .toUpperCase()
        .slice(0, 3);
      
      return {
        text: abbreviation,
        color: getEquipmentColor(slot.equipment),
        isDamaged: false, // showDamage && slot.isDestroyed || false,
        isHighlighted: highlightedEquipment === slot.equipment.id,
      };
    }

    return {
      text: '—',
      color: '#e5e7eb',
      isDamaged: false,
      isHighlighted: false,
    };
  }, [getEquipmentColor, highlightedEquipment, showDamage]);

  // Handle slot click
  const handleSlotClick = useCallback((location: string, slotIndex: number) => {
    const slot = unit.criticalSlots.find(
      s => s.location === location && s.slotIndex === slotIndex
    );
    
    if (slot?.equipment && onEquipmentClick) {
      onEquipmentClick(slot.equipment, location);
    } else if (onSlotClick) {
      onSlotClick(location, slotIndex);
    }
  }, [unit.criticalSlots, onSlotClick, onEquipmentClick]);

  // Render a single location
  const renderLocation = useCallback((locationData: LocationSlots) => {
    const { location, slots, maxSlots } = locationData;
    const abbrev = LOCATION_ABBREVIATIONS[location];
    const isSelected = selectedLocation === location;
    
    return (
      <div
        key={location}
        className={`border rounded-lg ${compact ? 'p-2' : 'p-3'} ${
          isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
        }`}
      >
        <button
          onClick={() => setSelectedLocation(isSelected ? null : location)}
          className="w-full text-left mb-2"
        >
          <div className="flex items-center justify-between">
            <span className={`font-medium ${compact ? 'text-sm' : ''}`}>
              {compact ? abbrev : location}
            </span>
            <span className="text-xs text-gray-500">
              {slots.filter(s => s && !s.isEmpty).length}/{maxSlots}
            </span>
          </div>
        </button>
        
        <div className={`grid ${compact ? 'grid-cols-3 gap-0.5' : 'grid-cols-4 gap-1'}`}>
          {slots.map((slot, index) => {
            const display = getSlotDisplay(slot);
            const isHovered = hoveredSlot?.location === location && hoveredSlot.index === index;
            
            return (
              <button
                key={index}
                onClick={() => handleSlotClick(location, index)}
                onMouseEnter={() => setHoveredSlot({ location, index })}
                onMouseLeave={() => setHoveredSlot(null)}
                className={`
                  ${compact ? 'h-6 text-xs' : 'h-8 text-sm'}
                  rounded border transition-all
                  ${display.isHighlighted ? 'ring-2 ring-blue-500' : ''}
                  ${display.isDamaged ? 'line-through opacity-50' : ''}
                  ${isHovered ? 'transform scale-110 z-10' : ''}
                  ${slot && !slot.isEmpty ? 'cursor-pointer hover:opacity-80' : 'cursor-default'}
                `}
                style={{
                  backgroundColor: display.color,
                  borderColor: display.color === '#e5e7eb' ? '#d1d5db' : display.color,
                  color: display.color === '#e5e7eb' ? '#6b7280' : 'white',
                }}
                title={slot?.equipment?.name || slot?.systemType || 'Empty'}
              >
                {display.text}
              </button>
            );
          })}
        </div>
        
        {/* Equipment list for location */}
        {!compact && isSelected && (
          <div className="mt-2 pt-2 border-t border-gray-200">
            <div className="space-y-1">
              {Array.from(new Set(
                slots
                  .filter(s => s?.equipment?.id)
                  .map(s => s?.equipment?.id)
              )).map(equipmentId => {
                const equipment = slots.find(s => s?.equipment?.id === equipmentId)?.equipment;
                if (!equipment) return null;
                const count = slots.filter(s => s?.equipment?.id === equipmentId).length;
                
                return (
                  <button
                    key={equipmentId}
                    onClick={() => onEquipmentClick?.(equipment, location)}
                    className="w-full text-left text-sm p-1 rounded hover:bg-gray-100 flex items-center justify-between"
                  >
                    <span className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded"
                        style={{ backgroundColor: getEquipmentColor(equipment) }}
                      />
                      {equipment.name}
                    </span>
                    <span className="text-xs text-gray-500">
                      {count} {count === 1 ? 'slot' : 'slots'}
                    </span>
                  </button>
                );
              })}
              
              {slots.filter(s => s?.equipment).length === 0 && (
                <div className="text-sm text-gray-500 italic">No equipment</div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }, [selectedLocation, compact, getSlotDisplay, handleSlotClick, hoveredSlot, onEquipmentClick, getEquipmentColor]);

  // Calculate usage statistics
  const usageStats = useMemo(() => {
    const totalSlots = Object.values(LOCATION_SLOT_COUNTS).reduce((a, b) => a + b, 0);
    const usedSlots = unit.criticalSlots.filter(s => !s.isEmpty).length;
    const weaponSlots = unit.criticalSlots.filter(s => s.equipment?.type.includes('Weapon')).length;
    const ammoSlots = unit.criticalSlots.filter(s => s.equipment?.type === 'Ammunition').length;
    const equipmentSlots = usedSlots - weaponSlots - ammoSlots;
    
    return {
      totalSlots,
      usedSlots,
      freeSlots: totalSlots - usedSlots,
      weaponSlots,
      ammoSlots,
      equipmentSlots,
      usagePercent: Math.round((usedSlots / totalSlots) * 100),
    };
  }, [unit.criticalSlots]);

  return (
    <div className="critical-allocation-visualizer">
      {/* Header with stats */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-medium text-lg">Critical Slots</h3>
          <div className="text-sm text-gray-600">
            {usageStats.usedSlots}/{usageStats.totalSlots} ({usageStats.usagePercent}%)
          </div>
        </div>
        
        {/* Usage bar */}
        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-500 transition-all"
            style={{ width: `${usageStats.usagePercent}%` }}
          />
        </div>
        
        {/* Category breakdown */}
        {!compact && (
          <div className="flex items-center gap-4 mt-2 text-xs">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded" style={{ backgroundColor: EQUIPMENT_COLORS['Energy Weapon'] }} />
              <span>Weapons ({usageStats.weaponSlots})</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded" style={{ backgroundColor: EQUIPMENT_COLORS['Ammunition'] }} />
              <span>Ammo ({usageStats.ammoSlots})</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded" style={{ backgroundColor: EQUIPMENT_COLORS['Equipment'] }} />
              <span>Equipment ({usageStats.equipmentSlots})</span>
            </div>
          </div>
        )}
      </div>

      {/* Location grid */}
      <div className={`grid ${compact ? 'grid-cols-2 md:grid-cols-4 gap-2' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3'}`}>
        {locationSlots.map(renderLocation)}
      </div>

      {/* Hover tooltip */}
      {hoveredSlot && !compact && (
        <div className="fixed z-50 pointer-events-none" style={{
          left: '50%',
          bottom: '20px',
          transform: 'translateX(-50%)',
        }}>
          <div className="bg-gray-900 text-white text-sm rounded px-3 py-2 shadow-lg">
            {(() => {
              const slot = unit.criticalSlots.find(
                s => s.location === hoveredSlot.location && s.slotIndex === hoveredSlot.index
              );
              
              if (!slot || slot.isEmpty) return 'Empty Slot';
              if (slot.systemType) return slot.systemType;
              if (slot.equipment) {
                return (
                  <div>
                    <div className="font-medium">{slot.equipment.name}</div>
                    <div className="text-xs text-gray-300">
                      {slot.equipment.weight}t • {slot.equipment.space || 1} slots
                    </div>
                  </div>
                );
              }
              return 'Empty Slot';
            })()}
          </div>
        </div>
      )}
    </div>
  );
};

export default CriticalAllocationVisualizer;
