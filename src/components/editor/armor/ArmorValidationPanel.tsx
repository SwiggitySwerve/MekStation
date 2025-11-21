/**
 * ArmorValidationPanel - Armor efficiency validation and summary display
 * 
 * Extracted from ArmorTabV2 as part of Phase 1 refactoring (Day 3)
 * Handles armor validation feedback, efficiency calculations, and visual summary
 * 
 * @see IMPLEMENTATION_REFERENCE.md for armor validation patterns
 */

import React from 'react';

/**
 * Props for ArmorValidationPanel component
 */
export interface ArmorValidationPanelProps {
  /** Current armor allocation for all locations */
  armorAllocation: any;
  /** Function to get maximum armor for a specific location */
  getLocationMaxArmor: (location: string) => number;
  /** Currently selected armor section */
  selectedSection: string | null;
  /** Callback when section selection changes */
  onSectionSelect: (section: string | null) => void;
  /** Whether the component is in read-only mode */
  readOnly?: boolean;
}

/**
 * ArmorValidationPanel Component
 * 
 * Provides armor validation and summary with:
 * - Efficiency calculations and color coding
 * - Visual feedback for over-allocation and optimization
 * - Summary table with all location data
 * - Interactive section selection
 * - Color legend for validation states
 */
export const ArmorValidationPanel: React.FC<ArmorValidationPanelProps> = ({
  armorAllocation,
  getLocationMaxArmor,
  selectedSection,
  onSectionSelect,
  readOnly = false
}) => {

  // Calculate efficiency for a location
  const calculateLocationEfficiency = (location: string) => {
    const armor = armorAllocation[location as keyof typeof armorAllocation];
    const max = getLocationMaxArmor(location);
    const total = armor.front + armor.rear;
    return max > 0 ? (total / max) * 100 : 0;
  };

  // Get efficiency color class based on allocation
  const getEfficiencyColor = (location: string) => {
    const armor = armorAllocation[location as keyof typeof armorAllocation];
    const max = getLocationMaxArmor(location);
    const total = armor.front + armor.rear;
    const efficiency = calculateLocationEfficiency(location);

    if (total > max) return 'border-l-red-500 bg-red-900/20'; // Over-allocation
    if (efficiency >= 90) return 'border-l-green-500 bg-green-900/20'; // Excellent (90%+)
    if (efficiency >= 70) return 'border-l-blue-500 bg-blue-900/20'; // Good (70-89%)
    if (efficiency >= 50) return 'border-l-yellow-500 bg-yellow-900/20'; // Fair (50-69%)
    if (efficiency >= 25) return 'border-l-orange-500 bg-orange-900/20'; // Poor (25-49%)
    return 'border-l-slate-500 bg-slate-800/20'; // Very low (<25%)
  };

  // Get text color based on efficiency
  const getTextColor = (location: string) => {
    const armor = armorAllocation[location as keyof typeof armorAllocation];
    const max = getLocationMaxArmor(location);
    const total = armor.front + armor.rear;
    const efficiency = calculateLocationEfficiency(location);

    if (total > max) return 'text-red-300';
    if (efficiency >= 90) return 'text-green-300';
    if (efficiency >= 70) return 'text-blue-300';
    if (efficiency >= 50) return 'text-yellow-300';
    if (efficiency >= 25) return 'text-orange-300';
    return 'text-slate-400';
  };

  // Check if location has rear armor capability
  const hasRearArmor = (location: string) => {
    return ['CT', 'LT', 'RT'].includes(location);
  };

  // Get validation summary for all locations
  const getValidationSummary = () => {
    const locations = ['HD', 'CT', 'LT', 'RT', 'LA', 'RA', 'LL', 'RL'];
    let totalArmor = 0;
    let maxPossibleArmor = 0;
    let overAllocatedLocations = 0;
    let excellentLocations = 0;
    let goodLocations = 0;
    let fairLocations = 0;
    let poorLocations = 0;
    let veryLowLocations = 0;

    locations.forEach(location => {
      const armor = armorAllocation[location as keyof typeof armorAllocation];
      if (!armor) return; // Skip missing locations gracefully
      
      const max = getLocationMaxArmor(location);
      const total = armor.front + armor.rear;
      const efficiency = calculateLocationEfficiency(location);

      totalArmor += total;
      maxPossibleArmor += max;

      if (total > max) overAllocatedLocations++;
      else if (efficiency >= 90) excellentLocations++;
      else if (efficiency >= 70) goodLocations++;
      else if (efficiency >= 50) fairLocations++;
      else if (efficiency >= 25) poorLocations++;
      else veryLowLocations++;
    });

    const overallEfficiency = maxPossibleArmor > 0 ? (totalArmor / maxPossibleArmor) * 100 : 0;

    return {
      totalArmor,
      maxPossibleArmor,
      overallEfficiency,
      overAllocatedLocations,
      excellentLocations,
      goodLocations,
      fairLocations,
      poorLocations,
      veryLowLocations
    };
  };

  const validationSummary = getValidationSummary();

  return (
    <div className="space-y-4">
      {/* Validation Summary Header */}
      <div className="bg-slate-700/30 rounded-lg p-3">
        <h4 className="text-slate-200 font-medium mb-2 flex items-center gap-2">
          <span>Armor Validation</span>
          <span className={`text-xs px-2 py-1 rounded ${
            validationSummary.overAllocatedLocations > 0 ? 'bg-red-600' :
            validationSummary.overallEfficiency >= 90 ? 'bg-green-600' :
            validationSummary.overallEfficiency >= 70 ? 'bg-blue-600' :
            validationSummary.overallEfficiency >= 50 ? 'bg-yellow-600' :
            'bg-orange-600'
          }`}>
            {validationSummary.overallEfficiency.toFixed(0)}% Efficiency
          </span>
        </h4>
        <div className="text-xs text-slate-400">
          {validationSummary.totalArmor} / {validationSummary.maxPossibleArmor} armor points allocated
          {validationSummary.overAllocatedLocations > 0 && (
            <span className="text-red-300 ml-2">
              ⚠️ {validationSummary.overAllocatedLocations} over-allocated location{validationSummary.overAllocatedLocations > 1 ? 's' : ''}
            </span>
          )}
        </div>
      </div>

      {/* All Locations Summary Table */}
      <div>
        <h4 className="text-slate-200 font-medium mb-3 text-sm">All Locations</h4>
        <div className="space-y-1 text-xs">
          {['HD', 'CT', 'LT', 'RT', 'LA', 'RA', 'LL', 'RL'].map(location => {
            const armor = armorAllocation[location as keyof typeof armorAllocation];
            if (!armor) return null; // Skip missing locations gracefully
            
            const max = getLocationMaxArmor(location);
            const total = armor.front + armor.rear;
            const hasRear = hasRearArmor(location);
            const efficiency = calculateLocationEfficiency(location);

            return (
              <div
                key={location}
                className={`grid grid-cols-4 gap-1 p-2 rounded border-l-4 cursor-pointer transition-colors ${getEfficiencyColor(location)
                  } ${selectedSection === location ? 'ring-2 ring-blue-500/50' : 'hover:bg-slate-700/30'}`}
                onClick={() => onSectionSelect(location)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onSectionSelect(location);
                  }
                }}
                aria-label={`Select ${location} armor section. Current: ${total}/${max} points (${efficiency.toFixed(0)}% efficiency)`}
              >
                <div className="text-slate-300 font-medium">{location}</div>
                <div className="text-slate-100 text-center">{armor.front}</div>
                <div className="text-slate-100 text-center">{hasRear ? armor.rear : '-'}</div>
                <div className={`text-center font-medium ${getTextColor(location)}`}>
                  {total}/{max}
                  <span className="text-xs ml-1 opacity-75">
                    ({efficiency.toFixed(0)}%)
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Efficiency Color Legend */}
      <div className="bg-slate-700/30 rounded p-3">
        <div className="text-slate-300 font-medium mb-2">Efficiency Legend:</div>
        <div className="grid grid-cols-2 gap-1 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-green-500 rounded"></div>
            <span className="text-slate-400">90%+ Excellent</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-blue-500 rounded"></div>
            <span className="text-slate-400">70-89% Good</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-yellow-500 rounded"></div>
            <span className="text-slate-400">50-69% Fair</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-orange-500 rounded"></div>
            <span className="text-slate-400">25-49% Poor</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-slate-500 rounded"></div>
            <span className="text-slate-400">&lt;25% Very Low</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-red-500 rounded"></div>
            <span className="text-slate-400">Over-allocated</span>
          </div>
        </div>
      </div>

      {/* Validation Recommendations */}
      {(validationSummary.overAllocatedLocations > 0 || 
        validationSummary.overallEfficiency < 70 || 
        (validationSummary.overallEfficiency >= 70 && validationSummary.overAllocatedLocations === 0)) && (
        <div className="bg-slate-700/30 rounded p-3">
          <div className="text-slate-300 font-medium mb-2 flex items-center gap-2">
            <span>🔍</span>
            <span>Optimization Recommendations</span>
          </div>
          <div className="space-y-1 text-xs text-slate-400">
            {validationSummary.overAllocatedLocations > 0 && (
              <div className="text-red-300">
                • Fix over-allocated locations by reducing armor points
              </div>
            )}
            {validationSummary.veryLowLocations > 0 && (
              <div className="text-orange-300">
                • Consider increasing armor on {validationSummary.veryLowLocations} very low location{validationSummary.veryLowLocations > 1 ? 's' : ''}
              </div>
            )}
            {validationSummary.poorLocations > 0 && (
              <div className="text-yellow-300">
                • Improve armor efficiency on {validationSummary.poorLocations} poor location{validationSummary.poorLocations > 1 ? 's' : ''}
              </div>
            )}
            {validationSummary.overallEfficiency < 50 && (
              <div className="text-orange-300">
                • Overall efficiency is low - consider auto-allocation for better distribution
              </div>
            )}
            {validationSummary.overallEfficiency >= 70 && validationSummary.overAllocatedLocations === 0 && (
              <div className="text-green-300">
                • Good armor distribution! Consider optimizing remaining low-efficiency locations
              </div>
            )}
          </div>
        </div>
      )}

      {/* Column Headers (positioned to align with data) */}
      <div className="grid grid-cols-4 gap-1 px-2 text-xs text-slate-500 font-medium border-t border-slate-600 pt-2">
        <div>Location</div>
        <div className="text-center">Front</div>
        <div className="text-center">Rear</div>
        <div className="text-center">Total/Max</div>
      </div>
    </div>
  );
};
