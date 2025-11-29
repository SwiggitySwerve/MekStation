import React from 'react';
import { EditableUnit } from '../../../types/editor';
import { IArmorDef } from '../../../types/core/ComponentInterfaces';
import { ARMOR_SPECIFICATIONS } from '../../../utils/armorCalculations';
import { TechBase, RulesLevel, TechLevel } from '../../../types';
import styles from './ArmorStatisticsPanel.module.css';

export interface ArmorStatisticsProps {
  unit: EditableUnit;
  totalArmorTonnage: number;
  onArmorTypeChange?: (armorType: IArmorDef) => void;
  onOptimizeArmor?: (newTonnage: number) => void;
  readOnly?: boolean;
}

// Helper to convert ARMOR_SPECIFICATIONS to a list of options compatible with IArmorDef
// Note: This is a simplification. Ideally IArmorDef objects come from a database/catalog.
const ARMOR_TYPE_OPTIONS = Object.entries(ARMOR_SPECIFICATIONS).map(([key, spec]) => ({
  id: key,
  name: spec.type,
  pointsPerTon: spec.pointsPerTon,
  criticalSlots: spec.criticalSlots,
  category: 'armor' as const,
  // Default values for properties required by IArmorDef but not in ARMOR_SPECIFICATIONS
  techLevel: TechLevel.STANDARD, 
  rulesLevel: RulesLevel.STANDARD,
  introductionYear: 0,
  costMultiplier: spec.costMultiplier || 1,
  maxPointsPerLocationMultiplier: 1,
  type: spec.type,
  techBase: spec.techBase === 'Both' ? TechBase.INNER_SPHERE : (spec.techBase as TechBase),
  description: spec.description
} as IArmorDef));

export const ArmorStatisticsPanel: React.FC<ArmorStatisticsProps> = ({
  unit,
  totalArmorTonnage,
  onArmorTypeChange,
  onOptimizeArmor,
  readOnly = false,
}) => {
  // Get current armor type
  const currentArmorType = unit.armor?.definition || ARMOR_TYPE_OPTIONS[0];
  
  // Calculate comprehensive armor statistics with efficiency analysis
  const calculateArmorStats = () => {
    let totalAllocated = 0;
    let totalMax = 0;
    let locationsAtCap = 0;
    let cappedPoints = 0;
    
    if (unit.armor?.allocation && unit.structure?.maxPoints) {
      const alloc = unit.armor.allocation;
      const maxPoints = unit.structure.maxPoints;

      // Define locations and their max calculation (usually 2x structure, except head)
      const locations = [
        { name: 'Head', allocated: alloc.head, max: 9 },
        { name: 'Center Torso', allocated: alloc.centerTorso + alloc.centerTorsoRear, max: maxPoints.centerTorso * 2 },
        { name: 'Left Torso', allocated: alloc.leftTorso + alloc.leftTorsoRear, max: maxPoints.leftTorso * 2 },
        { name: 'Right Torso', allocated: alloc.rightTorso + alloc.rightTorsoRear, max: maxPoints.rightTorso * 2 },
        { name: 'Left Arm', allocated: alloc.leftArm, max: maxPoints.leftArm * 2 },
        { name: 'Right Arm', allocated: alloc.rightArm, max: maxPoints.rightArm * 2 },
        { name: 'Left Leg', allocated: alloc.leftLeg, max: maxPoints.leftLeg * 2 },
        { name: 'Right Leg', allocated: alloc.rightLeg, max: maxPoints.rightLeg * 2 },
      ];

      locations.forEach(loc => {
        totalAllocated += loc.allocated;
        totalMax += loc.max;
        if (loc.allocated >= loc.max) {
          locationsAtCap++;
          cappedPoints += loc.max;
        }
      });
    }
    
    const pointsPerTon = currentArmorType.pointsPerTon;
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
      const selectedType = ARMOR_TYPE_OPTIONS.find(type => type.name === e.target.value);
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
            {ARMOR_TYPE_OPTIONS.map(type => (
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
