import React, { useEffect, useRef } from 'react';
import { useDrag } from 'react-dnd';
import { FullEquipment } from '../../../types';
import { DraggedEquipment, DragItemType } from '../dnd/types';
import { EquipmentCategory } from '../../../types';
import { isSpecialComponent } from '../../../types/systemComponents';
import { getEquipmentColorClasses } from '../../../utils/equipmentColors';
import styles from './DraggableEquipmentItem.module.css';

export interface DraggableEquipmentItemProps {
  equipment: FullEquipment;
  quantity?: number;
  onRemove?: (equipmentId: string) => void;
  isCompact?: boolean;
  showDetails?: boolean;
  currentLocation?: string;
}

export const DraggableEquipmentItem: React.FC<DraggableEquipmentItemProps> = ({
  equipment,
  quantity = 1,
  onRemove,
  isCompact = false,
  showDetails = true,
  currentLocation,
}) => {
  const getDragItemType = (): DragItemType => {
    const type = equipment.type?.toLowerCase() || '';
    const name = equipment.name.toLowerCase();
    
    // First check by name for heat sinks
    if (name.includes('heat sink')) return DragItemType.EQUIPMENT;
    
    // Then check by type
    if (type.includes('weapon')) return DragItemType.WEAPON;
    if (type.includes('ammo')) return DragItemType.AMMO;
    if (type.includes('system')) return DragItemType.SYSTEM;
    return DragItemType.EQUIPMENT;
  };
  // Special components are always 1 slot, but heat sinks can vary
  let critSlots = equipment.space || (typeof equipment.data?.slots === 'number' ? equipment.data.slots : Number(equipment.data?.slots) || 0);
  // Special components get 1 slot override, BUT heat sinks should keep their actual slot count
  if (isSpecialComponent(equipment.name) && !equipment.name.includes('Heat Sink')) {
    critSlots = 1;
  }
  
  const dragItem: DraggedEquipment = {
    type: getDragItemType(),
    equipmentId: equipment.id,
    name: equipment.name,
    weight: equipment.weight || 0,
    criticalSlots: critSlots,
    location: currentLocation,
    category: equipment.type as EquipmentCategory,
    techBase: equipment.tech_base,
    damage: equipment.damage,
    heat: equipment.heat,
  };

  const [{ isDragging }, drag, preview] = useDrag(() => ({
    type: 'equipment', // Always use 'equipment' type to match drop zone
    item: () => {
      console.log('Drag begin:', dragItem);
      return dragItem;
    },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
    end: (item, monitor) => {
      console.log('Drag end:', item);
      console.log('Did drop:', monitor.didDrop());
      console.log('Drop result:', monitor.getDropResult());
    },
  }), [equipment.id, currentLocation, critSlots]);

  // Use native drag preview for better performance
  useEffect(() => {
    preview(null, { captureDraggingState: true });
  }, [preview]);  const getEquipmentStats = () => {
    const stats = [];
    
    // Weight
    if (equipment.weight) {
      stats.push(`${equipment.weight}t`);
    }
    
    // Critical slots - use critSlots which respects special component logic
    if (critSlots > 0) {
      stats.push(`${critSlots} crits`);
    }
    
    // Damage for weapons
    if (equipment.damage) {
      stats.push(`${equipment.damage} dmg`);
    }
    
    // Heat for weapons
    if (equipment.heat) {
      stats.push(`${equipment.heat} heat`);
    }
    
    return stats.join(' • ');
  };

  // Get abbreviated tech base
  const getTechBaseAbbr = (techBase?: string): string => {
    if (!techBase) return '';
    const lowerTech = techBase.toLowerCase();
    if (lowerTech === 'clan' || lowerTech === 'c') return 'C';
    if (lowerTech === 'inner sphere' || lowerTech === 'is') return 'IS';
    return techBase; // fallback to original if not recognized
  };
  
  const techAbbr = getTechBaseAbbr(equipment.tech_base);
  const displayName = quantity > 1 ? `${equipment.name} x${quantity}` : equipment.name;
  const totalWeight = equipment.weight ? equipment.weight * quantity : 0;
  const slots = equipment.space || (typeof equipment.data?.slots === 'number' ? equipment.data.slots : Number(equipment.data?.slots) || 0);
  const totalSlots = slots * quantity;

  // Use ref to attach drag
  const dragRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (dragRef.current) {
      console.log('Attaching drag to element:', dragRef.current);
      drag(dragRef.current);
    }
  }, [drag]);

  // Get color classes for the equipment
  const colorClasses = getEquipmentColorClasses(equipment.name);

  return (
    <div 
      ref={dragRef}
      className={`${styles.container} ${colorClasses} ${isCompact ? styles.compact : ''} ${isDragging ? styles.dragging : ''}`}
      style={{ 
        opacity: isDragging ? 0.5 : 1,
        cursor: isDragging ? 'grabbing' : 'grab'
      }}
      draggable={false} // Prevent native HTML5 drag to avoid conflicts with react-dnd
    >
      <div className={styles.dragHandle}>⋮⋮</div>
      <div className={styles.content}>
        <div className={styles.header}>
          <div className={styles.nameSection}>
            <span className={styles.name}>{displayName}</span>
          </div>
          <div className={styles.headerRight}>
            {techAbbr && (
              <span className={styles.techBase}>{techAbbr}</span>
            )}
            {onRemove && (
              <button
                className={styles.removeButton}
                onClick={(e) => {
                  e.stopPropagation();
                  onRemove(equipment.id);
                }}
                onMouseDown={(e) => e.stopPropagation()}
                aria-label={`Remove ${equipment.name}`}
              >
                ×
              </button>
            )}
          </div>
        </div>
        
        {showDetails && !isCompact && (
          <div className={styles.details}>
            <span className={styles.stats}>{getEquipmentStats()}</span>
            {quantity > 1 && (
              <span className={styles.totals}>
                Total: {totalWeight}t, {totalSlots} crits
              </span>
            )}
          </div>
        )}
        
        {currentLocation && (
          <div className={styles.location}>
            <span className={styles.locationLabel}>Location:</span>
            <span className={styles.locationName}>{currentLocation}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default DraggableEquipmentItem;
