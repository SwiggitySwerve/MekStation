/**
 * ArmorLocationEditor - Side panel for editing individual armor location values
 * 
 * Extracted from ArmorTabV2 as part of large file refactoring.
 * Handles editing of front and rear armor values for selected locations.
 * 
 * @see TECHNICAL_ARCHITECTURE.md for component architecture patterns
 */

import React from 'react';

export interface ArmorLocationEditorProps {
  /** Currently selected armor section */
  selectedSection: string | null;
  /** Current armor allocation by location */
  armorAllocation: any;
  /** Function to get maximum armor for a location */
  getLocationMaxArmor: (location: string) => number;
  /** Whether the editor is in read-only mode */
  readOnly: boolean;
  /** Callback when armor location values change */
  onArmorLocationChange: (location: string, front: number, rear: number) => void;
  /** Callback when a section is selected for editing */
  onSectionSelect: (section: string | null) => void;
}

/**
 * ArmorLocationEditor Component
 * 
 * Provides editing interface for:
 * - Individual armor location front/rear values
 * - Location-specific validation and limits
 * - Quick action buttons for max/clear operations
 */
export const ArmorLocationEditor: React.FC<ArmorLocationEditorProps> = ({
  selectedSection,
  armorAllocation,
  getLocationMaxArmor,
  readOnly,
  onArmorLocationChange,
  onSectionSelect
}) => {
  return (
    <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
      <h3 className="text-slate-100 font-medium mb-4">Armor Editor</h3>

      {selectedSection ? (
        <div className="space-y-4">
          <div className="bg-slate-700/30 rounded p-3">
            <h4 className="text-slate-200 font-medium mb-2">
              Editing: {selectedSection}
            </h4>
            <div className="space-y-3">
              {/* Front and Rear Armor Controls */}
              <div className="grid grid-cols-2 gap-3">
                {/* Front Armor */}
                <div>
                  <label className="block text-slate-300 text-xs mb-1">
                    Front
                  </label>
                  <div className="flex items-center gap-1">
                    <input
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
                    <span className="text-slate-400 text-xs">
                      /{getLocationMaxArmor(selectedSection)}
                    </span>
                  </div>
                </div>

                {/* Rear Armor (only for torso locations) */}
                {['CT', 'LT', 'RT'].includes(selectedSection) ? (
                  <div>
                    <label className="block text-slate-300 text-xs mb-1">
                      Rear
                    </label>
                    <div className="flex items-center gap-1">
                      <input
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
                      <span className="text-slate-400 text-xs">
                        /{Math.floor(getLocationMaxArmor(selectedSection) * 0.5)}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div>
                    <label className="block text-slate-300 text-xs mb-1">
                      Rear
                    </label>
                    <div className="flex items-center justify-center h-8 bg-slate-700/50 rounded text-slate-500 text-xs">
                      N/A
                    </div>
                  </div>
                )}
              </div>

              {/* Quick Action Buttons */}
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    const maxFront = getLocationMaxArmor(selectedSection);
                    onArmorLocationChange(
                      selectedSection, 
                      maxFront, 
                      armorAllocation[selectedSection as keyof typeof armorAllocation].rear
                    );
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
        <div className="text-center text-slate-400 py-8">
          <p>Click an armor section on the diagram to edit its values</p>
        </div>
      )}
    </div>
  );
};
