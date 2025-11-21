/**
 * ArmorAllocationPanel - Handles individual armor location allocation and management
 * 
 * Extracted from ArmorTabV2 as part of Phase 1 refactoring (Day 1)
 * Manages armor point allocation to specific mech locations with auto-allocation algorithms
 * 
 * @see IMPLEMENTATION_REFERENCE.md for armor allocation patterns
 */

import React from 'react';

/**
 * Props for ArmorAllocationPanel component
 */
export interface ArmorAllocationPanelProps {
  /** Current armor allocation for all locations */
  armorAllocation: any;
  /** Selected armor section for editing */
  selectedSection: string | null;
  /** Callback when section selection changes */
  onSectionSelect: (section: string | null) => void;
  /** Callback when armor values change for a location */
  onArmorLocationChange: (location: string, front: number, rear: number) => void;
  /** Callback for auto-allocation of armor points */
  onAutoAllocate: () => void;
  /** Function to get maximum armor for a location */
  getLocationMaxArmor: (location: string) => number;
  /** Available armor points for allocation */
  availableArmorPoints: number;
  /** Total armor points that can be allocated */
  cappedAvailablePoints: number;
  /** Unallocated armor points remaining */
  displayUnallocatedPoints: number;
  /** Whether the component is in read-only mode */
  readOnly?: boolean;
}

/**
 * ArmorAllocationPanel Component
 * 
 * Provides focused interface for:
 * - Individual location armor allocation
 * - Auto-allocation algorithms
 * - Armor efficiency visualization
 * - Location-specific armor management
 */
export const ArmorAllocationPanel: React.FC<ArmorAllocationPanelProps> = ({
  armorAllocation,
  selectedSection,
  onSectionSelect,
  onArmorLocationChange,
  onAutoAllocate,
  getLocationMaxArmor,
  availableArmorPoints,
  cappedAvailablePoints,
  displayUnallocatedPoints,
  readOnly = false
}) => {

  return (
    <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
      <h3 className="text-slate-100 font-medium mb-4">Armor Allocation</h3>

      {/* Auto Allocate Button */}
      <button
        onClick={onAutoAllocate}
        disabled={readOnly}
        className={`w-full px-4 py-2 disabled:bg-gray-600 text-white rounded text-sm font-medium transition-colors mb-4 flex items-center justify-center gap-2 ${
          displayUnallocatedPoints < 0
            ? 'bg-orange-600 hover:bg-orange-700'
            : 'bg-purple-600 hover:bg-purple-700'
        }`}
      >
        <span>⚡</span>
        <span>Auto-Allocate Armor Points</span>
        <span className={`text-xs ${
          displayUnallocatedPoints < 0 ? 'text-orange-200 font-medium' : 'opacity-75'
        }`}>
          {displayUnallocatedPoints < 0
            ? `(${displayUnallocatedPoints} pts over-allocated)`
            : `(${displayUnallocatedPoints} pts available)`
          }
        </span>
      </button>

      {/* Allocation Status */}
      <div className="mb-4 p-2 bg-slate-700/30 rounded">
        <div className="text-xs text-slate-400 mb-1">Allocation Status</div>
        <div className={`text-sm font-medium ${
          displayUnallocatedPoints < 0 ? 'text-orange-300' : 'text-slate-100'
        }`}>
          {displayUnallocatedPoints < 0 ? 'Over-allocated' : 'Available'}: {displayUnallocatedPoints} pts / {cappedAvailablePoints} total
        </div>
      </div>

      {/* Individual Location Editor */}
      {selectedSection ? (
        <div className="space-y-4 mb-6">
          <div className="bg-slate-700/30 rounded p-3">
            <h4 className="text-slate-200 font-medium mb-2">Editing: {selectedSection}</h4>
            <div className="space-y-3">
              {/* Front and Rear Armor on same line */}
              <div className="grid grid-cols-2 gap-3">
                {/* Front Armor */}
                <div>
                  <label htmlFor={`front-armor-${selectedSection}`} className="block text-slate-300 text-xs mb-1">Front</label>
                  <div className="flex items-center gap-1">
                    <input
                      id={`front-armor-${selectedSection}`}
                      type="number"
                      min={0}
                      max={getLocationMaxArmor(selectedSection)}
                      step={1}
                      value={armorAllocation[selectedSection as keyof typeof armorAllocation].front}
                      onChange={(e) => onArmorLocationChange(
                        selectedSection,
                        parseInt(e.target.value) || 0,
                        armorAllocation[selectedSection as keyof typeof armorAllocation].rear
                      )}
                      disabled={readOnly}
                      className="w-full px-2 py-1 bg-slate-700 border border-slate-600 rounded text-slate-100 focus:border-blue-500 text-sm"
                    />
                    <span className="text-slate-400 text-xs">/{getLocationMaxArmor(selectedSection)}</span>
                  </div>
                </div>

                {/* Rear Armor (only for torsos) */}
                {['CT', 'LT', 'RT'].includes(selectedSection) ? (
                  <div>
                    <label htmlFor={`rear-armor-${selectedSection}`} className="block text-slate-300 text-xs mb-1">Rear</label>
                    <div className="flex items-center gap-1">
                      <input
                        id={`rear-armor-${selectedSection}`}
                        type="number"
                        min={0}
                        max={Math.floor(getLocationMaxArmor(selectedSection) * 0.5)}
                        step={1}
                        value={armorAllocation[selectedSection as keyof typeof armorAllocation].rear}
                        onChange={(e) => onArmorLocationChange(
                          selectedSection,
                          armorAllocation[selectedSection as keyof typeof armorAllocation].front,
                          parseInt(e.target.value) || 0
                        )}
                        disabled={readOnly}
                        className="w-full px-2 py-1 bg-slate-700 border border-slate-600 rounded text-slate-100 focus:border-blue-500 text-sm"
                      />
                      <span className="text-slate-400 text-xs">/{Math.floor(getLocationMaxArmor(selectedSection) * 0.5)}</span>
                    </div>
                  </div>
                ) : (
                  <div>
                    <label className="block text-slate-300 text-xs mb-1">Rear</label>
                    <div className="flex items-center justify-center h-8 bg-slate-700/50 rounded text-slate-500 text-xs">
                      N/A
                    </div>
                  </div>
                )}
              </div>

              {/* Quick Actions */}
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    const maxFront = getLocationMaxArmor(selectedSection);
                    onArmorLocationChange(selectedSection, maxFront, armorAllocation[selectedSection as keyof typeof armorAllocation].rear);
                  }}
                  disabled={readOnly}
                  className="flex-1 px-2 py-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white rounded text-xs transition-colors"
                >
                  Max Front
                </button>
                <button
                  onClick={() => onArmorLocationChange(selectedSection, 0, 0)}
                  disabled={readOnly}
                  className="flex-1 px-2 py-1 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 text-white rounded text-xs transition-colors"
                >
                  Clear
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center text-slate-400 py-4 mb-6">
          <p>Click an armor section on the diagram to edit its values</p>
        </div>
      )}

      {/* Armor Summary Table */}
      <div>
        <h4 className="text-slate-200 font-medium mb-3 text-sm">All Locations</h4>
        <div className="space-y-1 text-xs">
          {['HD', 'CT', 'LT', 'RT', 'LA', 'RA', 'LL', 'RL'].map(location => {
            const armor = armorAllocation[location as keyof typeof armorAllocation] || { front: 0, rear: 0 };
            const max = getLocationMaxArmor(location);
            const total = armor.front + armor.rear;
            const hasRear = ['CT', 'LT', 'RT'].includes(location);
            const efficiency = max > 0 ? (total / max) * 100 : 0;

            // Color coding based on efficiency
            const getEfficiencyColor = () => {
              if (total > max) return 'border-l-red-500 bg-red-900/20'; // Over-allocation
              if (efficiency >= 90) return 'border-l-green-500 bg-green-900/20'; // Excellent (90%+)
              if (efficiency >= 70) return 'border-l-blue-500 bg-blue-900/20'; // Good (70-89%)
              if (efficiency >= 50) return 'border-l-yellow-500 bg-yellow-900/20'; // Fair (50-69%)
              if (efficiency >= 25) return 'border-l-orange-500 bg-orange-900/20'; // Poor (25-49%)
              return 'border-l-slate-500 bg-slate-800/20'; // Very low (<25%)
            };

            const getTextColor = () => {
              if (total > max) return 'text-red-300';
              if (efficiency >= 90) return 'text-green-300';
              if (efficiency >= 70) return 'text-blue-300';
              if (efficiency >= 50) return 'text-yellow-300';
              if (efficiency >= 25) return 'text-orange-300';
              return 'text-slate-400';
            };

            return (
              <div
                key={location}
                className={`grid grid-cols-4 gap-1 p-2 rounded border-l-4 cursor-pointer transition-colors ${
                  getEfficiencyColor()
                } ${selectedSection === location ? 'ring-2 ring-blue-500/50' : 'hover:bg-slate-700/30'}`}
                onClick={() => onSectionSelect(location)}
              >
                <div className="text-slate-300 font-medium">{location}</div>
                <div className="text-slate-100 text-center">{armor.front}</div>
                <div className="text-slate-100 text-center">{hasRear ? armor.rear : '-'}</div>
                <div className={`text-center font-medium ${getTextColor()}`}>
                  {total}/{max}
                  <span className="text-xs ml-1 opacity-75">
                    ({efficiency.toFixed(0)}%)
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Color Legend */}
        <div className="mt-3 p-2 bg-slate-700/30 rounded text-xs">
          <div className="text-slate-300 font-medium mb-2">Efficiency Legend:</div>
          <div className="grid grid-cols-2 gap-1">
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
      </div>
    </div>
  );
};
