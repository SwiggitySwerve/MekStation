import React from 'react';
import { FullEquipment } from '../../../types';
import styles from './EquipmentListItem.module.css';

export interface EquipmentListItemProps {
  equipment: FullEquipment;
  quantity?: number;
  onRemove?: (equipmentId: string) => void;
  isDraggable?: boolean;
  isCompact?: boolean;
  showDetails?: boolean;
}

export const EquipmentListItem: React.FC<EquipmentListItemProps> = ({
  equipment,
  quantity = 1,
  onRemove,
  isDraggable = false,
  isCompact = false,
  showDetails = true,
}) => {
  const handleDragStart = (e: React.DragEvent) => {
    if (!isDraggable) return;
    
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('equipment', JSON.stringify(equipment));
  };

  const getEquipmentStats = () => {
    const stats = [];
    
    // Weight
    if (equipment.weight) {
      stats.push(`${equipment.weight}t`);
    }
    
    // Critical slots
    if (equipment.space) {
      stats.push(`${equipment.space} crits`);
    } else if (equipment.data?.slots) {
      stats.push(`${equipment.data.slots} crits`);
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

  const displayName = quantity > 1 ? `${equipment.name} x${quantity}` : equipment.name;
  const totalWeight = equipment.weight ? equipment.weight * quantity : 0;
  const slots = equipment.space || (typeof equipment.data?.slots === 'number' ? equipment.data.slots : Number(equipment.data?.slots) || 0);
  const totalSlots = slots * quantity;

  return (
    <div 
      className={`${styles.container} ${isDraggable ? styles.draggable : ''} ${isCompact ? styles.compact : ''}`}
      draggable={isDraggable}
      onDragStart={handleDragStart}
    >
      <div className={styles.header}>
        <div className={styles.nameSection}>
          <span className={styles.name}>{displayName}</span>
          {equipment.tech_base && (
            <span className={styles.techBase}>{equipment.tech_base}</span>
          )}
        </div>
        {onRemove && (
          <button
            className={styles.removeButton}
            onClick={() => onRemove(equipment.id)}
            aria-label={`Remove ${equipment.name}`}
          >
            ×
          </button>
        )}
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
      
      {/* Description could be added later if needed */}
    </div>
  );
};

export default EquipmentListItem;
