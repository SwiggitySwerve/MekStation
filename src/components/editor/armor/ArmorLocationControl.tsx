import React, { useState, useCallback } from 'react';
import { ArmorType } from '../../../types/editor';
import styles from './ArmorLocationControl.module.css';

export interface ArmorLocationControlProps {
  location: string;
  maxArmor: number;
  currentFront: number;
  currentRear?: number;
  hasRear?: boolean;
  armorType?: ArmorType;
  onChange: (location: string, front: number, rear?: number) => void;
  disabled?: boolean;
  compact?: boolean;
}

export const ArmorLocationControl: React.FC<ArmorLocationControlProps> = ({
  location,
  maxArmor,
  currentFront,
  currentRear = 0,
  hasRear = false,
  armorType,
  onChange,
  disabled = false,
  compact = false,
}) => {
  const [frontValue, setFrontValue] = useState(currentFront.toString());
  const [rearValue, setRearValue] = useState(currentRear.toString());

  // Calculate max values for front and rear
  const maxFront = hasRear ? maxArmor - currentRear : maxArmor;
  const maxRear = hasRear ? maxArmor - currentFront : 0;

  const handleFrontChange = useCallback((value: number) => {
    const newFront = Math.max(0, Math.min(value, maxFront));
    setFrontValue(newFront.toString());
    onChange(location, newFront, hasRear ? currentRear : undefined);
  }, [location, maxFront, currentRear, hasRear, onChange]);

  const handleRearChange = useCallback((value: number) => {
    const newRear = Math.max(0, Math.min(value, maxRear));
    setRearValue(newRear.toString());
    onChange(location, currentFront, newRear);
  }, [location, maxRear, currentFront, onChange]);

  const handleTextChange = (value: string, isFront: boolean) => {
    const numValue = parseInt(value) || 0;
    if (isFront) {
      handleFrontChange(numValue);
    } else {
      handleRearChange(numValue);
    }
  };

  const incrementValue = (isFront: boolean, delta: number) => {
    if (isFront) {
      handleFrontChange(currentFront + delta);
    } else {
      handleRearChange(currentRear + delta);
    }
  };

  const totalArmor = currentFront + (hasRear ? currentRear : 0);
  const remainingArmor = maxArmor - totalArmor;
  const isOverAllocated = totalArmor > maxArmor;

  const renderArmorControl = (label: string, value: string, isFront: boolean, max: number) => (
    <div className={styles.armorControl}>
      <span className={`${styles.label} ${compact ? styles.compact : ''}`}>
        {label}:
      </span>
      <button
        className={styles.button}
        onClick={() => incrementValue(isFront, -1)}
        disabled={disabled || parseInt(value) <= 0}
        aria-label={`Decrease ${label} armor`}
      >
        -
      </button>
      <input
        type="text"
        className={`${styles.input} ${isOverAllocated ? styles.error : ''}`}
        value={value}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
          const newValue = e.target.value;
          if (isFront) {
            setFrontValue(newValue);
          } else {
            setRearValue(newValue);
          }
        }}
        onBlur={(e: React.FocusEvent<HTMLInputElement>) => handleTextChange(e.target.value, isFront)}
        disabled={disabled}
        aria-label={`${location} ${label} armor`}
      />
      <button
        className={styles.button}
        onClick={() => incrementValue(isFront, 1)}
        disabled={disabled || parseInt(value) >= max}
        aria-label={`Increase ${label} armor`}
      >
        +
      </button>
    </div>
  );

  return (
    <div className={`${styles.container} ${isOverAllocated ? styles.overAllocated : ''} ${disabled ? styles.disabled : ''} ${compact ? styles.compact : ''}`}>
      <h3 className={styles.title}>
        {location}
      </h3>
      
      <div className={styles.controls}>
        {renderArmorControl('Front', frontValue, true, maxFront)}
        {hasRear && renderArmorControl('Rear', rearValue, false, maxRear)}
        
        <div className={styles.summary}>
          <div className={styles.stats}>
            <span className={styles.total} title="Total armor points allocated to this location">
              Total: {totalArmor}/{maxArmor}
            </span>
            <span 
              className={`${styles.remaining} ${isOverAllocated ? styles.error : remainingArmor > 0 ? styles.warning : styles.success}`}
              title={isOverAllocated ? "Over-allocated!" : "Remaining armor points"}
            >
              {isOverAllocated ? `Over by ${-remainingArmor}` : `${remainingArmor} left`}
            </span>
          </div>
          {armorType && (
            <span className={styles.armorType}>
              {armorType.name}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default ArmorLocationControl;
