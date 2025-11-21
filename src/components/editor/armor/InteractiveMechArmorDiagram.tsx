import React, { useState } from 'react';
import { EditableUnit, MECH_LOCATIONS } from '../../../types/editor';
import { ArmorLocationControl } from './ArmorLocationControl';
import styles from './InteractiveMechArmorDiagram.module.css';

export interface InteractiveMechArmorDiagramProps {
  unit: EditableUnit;
  onArmorChange: (location: string, front: number, rear?: number) => void;
  onArmorTypeChange?: (location: string, armorType: any) => void;
  selectedLocation?: string;
  onLocationSelect?: (location: string) => void;
  showControls?: boolean;
  isCompact?: boolean;
}

export const InteractiveMechArmorDiagram: React.FC<InteractiveMechArmorDiagramProps> = ({
  unit,
  onArmorChange,
  onArmorTypeChange,
  selectedLocation,
  onLocationSelect,
  showControls = true,
  isCompact = false,
}) => {
  const [hoveredLocation, setHoveredLocation] = useState<string | null>(null);

  const getLocationArmor = (location: string) => {
    return unit.armorAllocation[location] || { front: 0, rear: 0, maxArmor: 0 };
  };

  const handleLocationClick = (location: string) => {
    if (onLocationSelect) {
      onLocationSelect(location);
    }
  };

  const getLocationClassName = (location: string) => {
    const baseClass = styles.armorLocation;
    const classes = [baseClass];
    
    if (selectedLocation === location) classes.push(styles.selected);
    if (hoveredLocation === location) classes.push(styles.hovered);
    
    return classes.join(' ');
  };

  const renderArmorValue = (location: string, isRear = false) => {
    const armor = getLocationArmor(location);
    const value = isRear ? armor.rear || 0 : armor.front;
    const maxValue = armor.maxArmor;
    const percentage = maxValue > 0 ? (value / maxValue) * 100 : 0;
    
    return (
      <div 
        className={`${styles.armorValue} ${isRear ? styles.rear : styles.front}`}
        style={{ 
          backgroundColor: `rgba(76, 175, 80, ${percentage / 100 * 0.7 + 0.1})`,
          borderColor: percentage > 90 ? '#4caf50' : percentage > 50 ? '#ff9800' : '#f44336'
        }}
      >
        {value}
      </div>
    );
  };

  return (
    <div className={`${styles.container} ${isCompact ? styles.compact : ''}`}>
      {/* Mech Silhouette */}
      <div className={styles.mechDiagram}>
        
        {/* Head */}
        <div 
          className={`${getLocationClassName(MECH_LOCATIONS.HEAD)} ${styles.head}`}
          onClick={() => handleLocationClick(MECH_LOCATIONS.HEAD)}
          onMouseEnter={() => setHoveredLocation(MECH_LOCATIONS.HEAD)}
          onMouseLeave={() => setHoveredLocation(null)}
        >
          <div className={styles.locationLabel}>HD</div>
          {renderArmorValue(MECH_LOCATIONS.HEAD)}
        </div>

        {/* Torso Section */}
        <div className={styles.torsoSection}>
          {/* Left Torso */}
          <div 
            className={`${getLocationClassName(MECH_LOCATIONS.LEFT_TORSO)} ${styles.leftTorso}`}
            onClick={() => handleLocationClick(MECH_LOCATIONS.LEFT_TORSO)}
            onMouseEnter={() => setHoveredLocation(MECH_LOCATIONS.LEFT_TORSO)}
            onMouseLeave={() => setHoveredLocation(null)}
          >
            <div className={styles.locationLabel}>LT</div>
            <div className={styles.armorValues}>
              {renderArmorValue(MECH_LOCATIONS.LEFT_TORSO)}
              {renderArmorValue(MECH_LOCATIONS.LEFT_TORSO, true)}
            </div>
          </div>

          {/* Center Torso */}
          <div 
            className={`${getLocationClassName(MECH_LOCATIONS.CENTER_TORSO)} ${styles.centerTorso}`}
            onClick={() => handleLocationClick(MECH_LOCATIONS.CENTER_TORSO)}
            onMouseEnter={() => setHoveredLocation(MECH_LOCATIONS.CENTER_TORSO)}
            onMouseLeave={() => setHoveredLocation(null)}
          >
            <div className={styles.locationLabel}>CT</div>
            <div className={styles.armorValues}>
              {renderArmorValue(MECH_LOCATIONS.CENTER_TORSO)}
              {renderArmorValue(MECH_LOCATIONS.CENTER_TORSO, true)}
            </div>
          </div>

          {/* Right Torso */}
          <div 
            className={`${getLocationClassName(MECH_LOCATIONS.RIGHT_TORSO)} ${styles.rightTorso}`}
            onClick={() => handleLocationClick(MECH_LOCATIONS.RIGHT_TORSO)}
            onMouseEnter={() => setHoveredLocation(MECH_LOCATIONS.RIGHT_TORSO)}
            onMouseLeave={() => setHoveredLocation(null)}
          >
            <div className={styles.locationLabel}>RT</div>
            <div className={styles.armorValues}>
              {renderArmorValue(MECH_LOCATIONS.RIGHT_TORSO)}
              {renderArmorValue(MECH_LOCATIONS.RIGHT_TORSO, true)}
            </div>
          </div>
        </div>

        {/* Arms Section */}
        <div className={styles.armsSection}>
          {/* Left Arm */}
          <div 
            className={`${getLocationClassName(MECH_LOCATIONS.LEFT_ARM)} ${styles.leftArm}`}
            onClick={() => handleLocationClick(MECH_LOCATIONS.LEFT_ARM)}
            onMouseEnter={() => setHoveredLocation(MECH_LOCATIONS.LEFT_ARM)}
            onMouseLeave={() => setHoveredLocation(null)}
          >
            <div className={styles.locationLabel}>LA</div>
            {renderArmorValue(MECH_LOCATIONS.LEFT_ARM)}
          </div>

          {/* Right Arm */}
          <div 
            className={`${getLocationClassName(MECH_LOCATIONS.RIGHT_ARM)} ${styles.rightArm}`}
            onClick={() => handleLocationClick(MECH_LOCATIONS.RIGHT_ARM)}
            onMouseEnter={() => setHoveredLocation(MECH_LOCATIONS.RIGHT_ARM)}
            onMouseLeave={() => setHoveredLocation(null)}
          >
            <div className={styles.locationLabel}>RA</div>
            {renderArmorValue(MECH_LOCATIONS.RIGHT_ARM)}
          </div>
        </div>

        {/* Legs Section */}
        <div className={styles.legsSection}>
          {/* Left Leg */}
          <div 
            className={`${getLocationClassName(MECH_LOCATIONS.LEFT_LEG)} ${styles.leftLeg}`}
            onClick={() => handleLocationClick(MECH_LOCATIONS.LEFT_LEG)}
            onMouseEnter={() => setHoveredLocation(MECH_LOCATIONS.LEFT_LEG)}
            onMouseLeave={() => setHoveredLocation(null)}
          >
            <div className={styles.locationLabel}>LL</div>
            {renderArmorValue(MECH_LOCATIONS.LEFT_LEG)}
          </div>

          {/* Right Leg */}
          <div 
            className={`${getLocationClassName(MECH_LOCATIONS.RIGHT_LEG)} ${styles.rightLeg}`}
            onClick={() => handleLocationClick(MECH_LOCATIONS.RIGHT_LEG)}
            onMouseEnter={() => setHoveredLocation(MECH_LOCATIONS.RIGHT_LEG)}
            onMouseLeave={() => setHoveredLocation(null)}
          >
            <div className={styles.locationLabel}>RL</div>
            {renderArmorValue(MECH_LOCATIONS.RIGHT_LEG)}
          </div>
        </div>
      </div>

      {/* Armor Controls Panel */}
      {showControls && selectedLocation && (
        <div className={styles.controlsPanel}>
          <h3>Armor Controls - {selectedLocation}</h3>
          <ArmorLocationControl
            location={selectedLocation as any}
            maxArmor={getLocationArmor(selectedLocation).maxArmor}
            currentFront={getLocationArmor(selectedLocation).front}
            currentRear={getLocationArmor(selectedLocation).rear}
            hasRear={selectedLocation === MECH_LOCATIONS.CENTER_TORSO || selectedLocation === MECH_LOCATIONS.LEFT_TORSO || selectedLocation === MECH_LOCATIONS.RIGHT_TORSO}
            armorType={getLocationArmor(selectedLocation).type}
            onChange={onArmorChange}
          />
        </div>
      )}

      {/* Legend */}
      <div className={styles.legend}>
        <div className={styles.legendItem}>
          <div className={styles.legendColor} style={{ backgroundColor: 'rgba(76, 175, 80, 0.8)' }}></div>
          <span>High Armor (90%+)</span>
        </div>
        <div className={styles.legendItem}>
          <div className={styles.legendColor} style={{ backgroundColor: 'rgba(255, 152, 0, 0.8)' }}></div>
          <span>Medium Armor (50-90%)</span>
        </div>
        <div className={styles.legendItem}>
          <div className={styles.legendColor} style={{ backgroundColor: 'rgba(244, 67, 54, 0.8)' }}></div>
          <span>Low Armor (&lt;50%)</span>
        </div>
      </div>
    </div>
  );
};

export default InteractiveMechArmorDiagram;
