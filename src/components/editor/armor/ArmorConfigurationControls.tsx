/**
 * ArmorConfigurationControls - Armor type selection and tonnage management controls
 * 
 * Extracted from ArmorTabV2 as part of large file refactoring.
 * Handles armor type selection, tonnage input, and quick action buttons.
 * 
 * @see TECHNICAL_ARCHITECTURE.md for component architecture patterns
 */

import React from 'react';

export interface ArmorConfigurationControlsProps {
  /** Current armor type */
  armorType: string;
  /** Available armor type options based on tech base */
  armorTypeOptions: string[];
  /** Current armor tonnage */
  currentArmorTonnage: number;
  /** Maximum allowed armor tonnage */
  maxArmorTonnage: number;
  /** Remaining tonnage available for allocation */
  remainingTonnage: number;
  /** Whether controls are in read-only mode */
  readOnly: boolean;
  /** Callback when armor type changes */
  onArmorTypeChange: (armorType: string) => void;
  /** Callback when armor tonnage changes */
  onArmorTonnageChange: (tonnage: number) => void;
  /** Callback to use remaining tonnage for armor */
  onUseRemainingTonnage: () => void;
  /** Callback to maximize armor tonnage */
  onMaximizeArmor: () => void;
}

/**
 * ArmorConfigurationControls Component
 * 
 * Provides controls for:
 * - Armor type selection with tech base integration
 * - Armor tonnage input with validation and step controls
 * - Quick action buttons for tonnage optimization
 */
export const ArmorConfigurationControls: React.FC<ArmorConfigurationControlsProps> = ({
  armorType,
  armorTypeOptions,
  currentArmorTonnage,
  maxArmorTonnage,
  remainingTonnage,
  readOnly,
  onArmorTypeChange,
  onArmorTonnageChange,
  onUseRemainingTonnage,
  onMaximizeArmor
}) => {
  // Utility to round to nearest 0.5
  const roundHalf = (value: number) => Math.round(value * 2) / 2;

  // Always use rounded values for input and max
  const roundedTonnage = roundHalf(currentArmorTonnage);
  const roundedMax = roundHalf(maxArmorTonnage);

  // Wrap the tonnage change handler to always round to nearest 0.5
  const handleTonnageChange = (value: number) => {
    const rounded = roundHalf(value);
    onArmorTonnageChange(rounded);
  };

  // If the value is not a valid 0.5 increment, auto-correct it
  React.useEffect(() => {
    if (currentArmorTonnage !== roundedTonnage) {
      onArmorTonnageChange(roundedTonnage);
    }
  }, [currentArmorTonnage]);

  return (
    <div className="bg-slate-800 rounded-lg p-2 mb-4 border border-slate-700">
      <div className="flex items-center gap-3 flex-wrap">
        {/* Armor Type Selection */}
        <div className="flex items-center gap-2">
          <label className="text-slate-300 text-xs font-medium whitespace-nowrap">
            Armor Type:
          </label>
          <select
            value={armorType}
            onChange={(e) => onArmorTypeChange(e.target.value)}
            disabled={readOnly}
            className="px-2 py-1 bg-slate-700 border border-slate-600 rounded text-slate-100 focus:border-blue-500 text-sm"
          >
            {armorTypeOptions.map(option => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>

        {/* Tonnage Input with Step Controls */}
        <div className="flex items-center gap-2">
          <label className="text-slate-300 text-xs font-medium whitespace-nowrap">
            Tonnage:
          </label>
          <div className="flex items-center gap-1">
            <input
              type="number"
              min={0}
              max={roundedMax}
              step={0.5}
              value={roundedTonnage.toFixed(1)}
              onChange={(e) => handleTonnageChange(parseFloat(e.target.value) || 0)}
              disabled={readOnly}
              className={`w-24 px-2 py-1 bg-slate-700 border rounded text-slate-100 focus:border-blue-500 text-center text-xs ${
                roundedTonnage >= roundedMax
                  ? 'border-yellow-500'
                  : 'border-slate-600'
              }`}
              placeholder="0.0"
            />
            {/* Step Control Buttons */}
            <div className="flex flex-col">
              <button
                onClick={() => handleTonnageChange(roundedTonnage + 0.5)}
                disabled={readOnly || roundedTonnage >= roundedMax}
                className="px-0.5 py-0 bg-slate-600 hover:bg-slate-500 disabled:bg-slate-700 disabled:text-slate-500 text-slate-100 rounded-t text-xs transition-colors leading-3"
                title="Increase by 0.5 tons"
              >
                ▲
              </button>
              <button
                onClick={() => handleTonnageChange(roundedTonnage - 0.5)}
                disabled={readOnly || roundedTonnage <= 0}
                className="px-0.5 py-0 bg-slate-600 hover:bg-slate-500 disabled:bg-slate-700 disabled:text-slate-500 text-slate-100 rounded-b text-xs transition-colors leading-3"
                title="Decrease by 0.5 tons"
              >
                ▼
              </button>
            </div>
            {/* Maximum Tonnage Display */}
            <span className="text-slate-400 text-xs">
              /{roundedMax.toFixed(1)}t
            </span>
          </div>
        </div>

        {/* Quick Action Buttons */}
        <div className="flex flex-col gap-1">
          <button
            onClick={onUseRemainingTonnage}
            disabled={readOnly}
            className="w-full px-2 py-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white rounded text-xs font-medium transition-colors"
            title={`Use remaining ${roundHalf(remainingTonnage).toFixed(1)} tons`}
          >
            Use Remaining Tonnage
          </button>
          <button
            onClick={onMaximizeArmor}
            disabled={readOnly}
            className="w-full px-2 py-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white rounded text-xs font-medium transition-colors"
          >
            Maximize Armor
          </button>
        </div>
      </div>
    </div>
  );
};
