import React from 'react';
import { EditableUnit, ArmorType, ARMOR_TYPES } from '../../../types/editor';
import { ARMOR_SPECIFICATIONS } from '../../../utils/armorCalculations';
import styles from './ArmorStatisticsPanel.module.css';

export interface ArmorStatisticsProps {
  unit: EditableUnit;
  totalArmorTonnage: number;
  onArmorTypeChange?: (armorType: ArmorType) => void;
  onOptimizeArmor?: (newTonnage: number) => void;
  readOnly?: boolean;
}

function getValidArmorTypeKey(id: string): string {
  return Object.prototype.hasOwnProperty.call(ARMOR_SPECIFICATIONS, id) ? id : 'Standard';
}

export const ArmorStatisticsPanel: React.FC<ArmorStatisticsProps> = ({
  unit,
  totalArmorTonnage,
  onArmorTypeChange,
  onOptimizeArmor,
  readOnly = false,
}) => {
  // Get current armor type
  const currentArmorType = unit.armorAllocation?.HEAD?.type || ARMOR_TYPES[0];
  
  // Calculate comprehensive armor statistics with efficiency analysis
  const calculateArmorStats = () => {
    let totalAllocated = 0;
    let totalMax = 0;
    let locationsAtCap = 0;
    let cappedPoints = 0;
    
    if (unit.armorAllocation) {
      Object.entries(unit.armorAllocation).forEach(([location, armor]) => {
        const allocated = armor.front + (armor.rear || 0);
        totalAllocated += allocated;
        totalMax += armor.maxArmor;
        
        // Check if this location is at maximum armor
        if (allocated >= armor.maxArmor) {
          locationsAtCap++;
          cappedPoints += armor.maxArmor;
        }
      });
    }
    
    const pointsPerTon = (ARMOR_SPECIFICATIONS as Record<string, { pointsPerTon: number }>)[getValidArmorTypeKey(currentArmorType.id)]?.pointsPerTon || currentArmorType.pointsPerTon;
    const totalPoints = Math.floor(totalArmorTonnage * pointsPerTon);
    const unallocated = totalPoints - totalAllocated;
    
    // Enhanced waste analysis
    const wastedFromRounding = unallocated > 0 ? unallocated % Math.floor(pointsPerTon) : 0;
    const trappedPoints = Math.max(0, totalAllocated >= totalMax ? unallocated : 0);
    const totalWasted = wastedFromRounding + trappedPoints;
    
    // Calculate optimal tonnage (what user actually needs)
    const optimalPoints = Math.min(totalAllocated + Math.floor(pointsPerTon), totalMax);
    const optimalTonnage = Math.ceil(optimalPoints / pointsPerTon * 2) / 2; // Round to nearest 0.5 ton
    const tonnageSavings = totalArmorTonnage - optimalTonnage;
    
    return {
      totalAllocated,
      totalMax,
      totalPoints,
      unallocated,
      wastedFromRounding,
      trappedPoints,
      totalWasted,
      locationsAtCap,
      cappedPoints,
      optimalTonnage,
      tonnageSavings,
      efficiency: totalMax > 0 ? (totalAllocated / totalMax) * 100 : 0,
      wastePercentage: totalPoints > 0 ? (totalWasted / totalPoints) * 100 : 0
    };
  };
  
  const stats = calculateArmorStats();
  
  const handleArmorTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    if (!readOnly && onArmorTypeChange) {
      const selectedType = ARMOR_TYPES.find(type => type.id === e.target.value);
      if (selectedType) {
        onArmorTypeChange(selectedType);
      }
    }
  };
  
  return (
    <div className={styles.container}>
      <h3 className={styles.title}>Armor Statistics</h3>
      
      {/* Armor Type Selection */}
      <div className={styles.section}>
        <label className={styles.label}>
          Armor Type:
          <select 
            className={styles.select}
            value={currentArmorType.name}
            onChange={handleArmorTypeChange}
            disabled={readOnly}
          >
            {ARMOR_TYPES.map(type => (
              <option key={type.name} value={type.name}>
                {type.name} ({type.pointsPerTon} pts/ton)
              </option>
            ))}
          </select>
        </label>
        {currentArmorType.criticalSlots > 0 && (
          <div className={styles.info}>
            Requires {currentArmorType.criticalSlots} critical slots
          </div>
        )}
      </div>
      
      {/* Armor Tonnage */}
      <div className={styles.section}>
        <div className={styles.stat}>
          <span className={styles.statLabel}>Armor Tonnage:</span>
          <span className={styles.statValue}>{totalArmorTonnage} tons</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statLabel}>Points per Ton:</span>
          <span className={styles.statValue}>{currentArmorType.pointsPerTon}</span>
        </div>
      </div>
      
      {/* Allocation Statistics */}
      <div className={styles.section}>
        <div className={styles.stat}>
          <span className={styles.statLabel}>Total Points:</span>
          <span className={styles.statValue}>{stats.totalPoints}</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statLabel}>Allocated:</span>
          <span className={styles.statValue}>{stats.totalAllocated}</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statLabel}>Unallocated:</span>
          <span className={`${styles.statValue} ${stats.unallocated > 0 ? styles.warning : ''}`}>
            {stats.unallocated}
          </span>
        </div>
        {stats.totalWasted > 0 && (
          <div className={styles.stat}>
            <span className={styles.statLabel}>Wasted:</span>
            <span className={`${styles.statValue} ${styles.error}`}>
              {stats.totalWasted}
            </span>
          </div>
        )}
      </div>

      {/* Armor Efficiency Warning Section */}
      {stats.totalWasted > 0 && (
        <div className={`${styles.section} ${styles.warningSection}`}>
          <div className={styles.warningHeader}>
            <span className={styles.warningIcon}>⚠️</span>
            <h4 className={styles.warningTitle}>Armor Efficiency Notice</h4>
          </div>
          
          <div className={styles.warningContent}>
            {/* Breakdown of wasted points */}
            {stats.wastedFromRounding > 0 && (
              <div className={styles.wasteItem}>
                <span className={styles.wasteIcon}>🔹</span>
                <span className={styles.wasteText}>
                  <strong>{stats.wastedFromRounding} points</strong> wasted due to tonnage rounding
                </span>
              </div>
            )}
            
            {stats.trappedPoints > 0 && (
              <div className={styles.wasteItem}>
                <span className={styles.wasteIcon}>🔸</span>
                <span className={styles.wasteText}>
                  <strong>{stats.trappedPoints} points</strong> trapped - {stats.locationsAtCap} location(s) at maximum armor
                </span>
              </div>
            )}
            
            {/* Smart recommendations */}
            {stats.tonnageSavings > 0 && (
              <div className={styles.recommendationBox}>
                <div className={styles.recommendationHeader}>
                  <span className={styles.recommendationIcon}>💡</span>
                  <span className={styles.recommendationTitle}>Optimization Suggestion</span>
                </div>
                <div className={styles.recommendationText}>
                  Consider reducing armor tonnage to <strong>{stats.optimalTonnage} tons</strong> to save{' '}
                  <strong>{stats.tonnageSavings.toFixed(1)} tons</strong> without losing protection.
                </div>
                {!readOnly && onOptimizeArmor && (
                  <button
                    onClick={() => onOptimizeArmor(stats.optimalTonnage)}
                    className={styles.optimizeButton}
                    title="Apply optimal armor tonnage"
                  >
                    Optimize Automatically
                  </button>
                )}
              </div>
            )}
            
            {/* Efficiency metrics */}
            <div className={styles.efficiencyMetrics}>
              <div className={styles.efficiencyItem}>
                <span className={styles.efficiencyLabel}>Waste Percentage:</span>
                <span className={`${styles.efficiencyValue} ${stats.wastePercentage > 10 ? styles.highWaste : stats.wastePercentage > 5 ? styles.mediumWaste : styles.lowWaste}`}>
                  {stats.wastePercentage.toFixed(1)}%
                </span>
              </div>
              <div className={styles.efficiencyItem}>
                <span className={styles.efficiencyLabel}>Investment Efficiency:</span>
                <span className={`${styles.efficiencyValue} ${100 - stats.wastePercentage > 90 ? styles.highEfficiency : styles.lowEfficiency}`}>
                  {(100 - stats.wastePercentage).toFixed(1)}%
                </span>
              </div>
            </div>
            
            {/* BattleTech rules explanation */}
            {stats.trappedPoints > 0 && (
              <div className={styles.rulesExplanation}>
                <div className={styles.rulesTitle}>📖 BattleTech Rule:</div>
                <div className={styles.rulesText}>
                  Each location has a maximum armor limit based on its internal structure. 
                  Once all locations reach maximum armor, additional armor points cannot be allocated.
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* Progress Bar */}
      <div className={styles.progressSection}>
        <div className={styles.progressLabel}>
          <span>Allocation Progress</span>
          <span>{stats.efficiency.toFixed(1)}%</span>
        </div>
        <div className={styles.progressBar}>
          <div 
            className={styles.progressFill}
            style={{ width: `${Math.min(stats.efficiency, 100)}%` }}
          />
        </div>
      </div>
      
      {/* Max Armor Info */}
      <div className={styles.section}>
        <div className={styles.stat}>
          <span className={styles.statLabel}>Maximum Possible:</span>
          <span className={styles.statValue}>{stats.totalMax} points</span>
        </div>
        <div className={styles.info}>
          {stats.totalAllocated < stats.totalMax && (
            <span>
              You can allocate {stats.totalMax - stats.totalAllocated} more points to reach maximum protection.
            </span>
          )}
          {stats.totalAllocated === stats.totalMax && (
            <span className={styles.success}>
              Maximum armor allocated!
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default ArmorStatisticsPanel;
