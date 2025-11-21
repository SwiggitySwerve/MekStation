import React, { useState, useCallback, useEffect } from 'react';
import { ArmorType } from '../../../types/editor';

interface ArmorTonnageControlProps {
  currentTonnage: number;
  maxTonnage: number;
  armorType: ArmorType;
  onChange: (tonnage: number) => void;
  onPointsChange?: (points: number) => void;
  disabled?: boolean;
  showValidation?: boolean;
}

const ArmorTonnageControl: React.FC<ArmorTonnageControlProps> = ({
  currentTonnage,
  maxTonnage,
  armorType,
  onChange,
  onPointsChange,
  disabled = false,
  showValidation = true,
}) => {
  const [inputValue, setInputValue] = useState(currentTonnage.toFixed(1));
  const [isValid, setIsValid] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Calculate armor points from tonnage
  const calculatePoints = useCallback((tonnage: number): number => {
    return Math.floor(tonnage * armorType.pointsPerTon);
  }, [armorType.pointsPerTon]);

  // Validate tonnage input
  const validateTonnage = useCallback((value: string): { valid: boolean; error?: string } => {
    const num = parseFloat(value);
    
    if (isNaN(num)) {
      return { valid: false, error: 'Invalid number' };
    }
    
    if (num < 0) {
      return { valid: false, error: 'Tonnage cannot be negative' };
    }
    
    if (num > maxTonnage) {
      return { valid: false, error: `Exceeds maximum (${maxTonnage} tons)` };
    }
    
    // Check if it's a valid half-ton increment
    const isHalfTon = (num * 2) % 1 === 0;
    if (!isHalfTon) {
      return { valid: false, error: 'Must be in 0.5 ton increments' };
    }
    
    return { valid: true };
  }, [maxTonnage]);

  // Handle input change
  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputValue(value);
    
    // Allow typing decimal point
    if (value.endsWith('.')) {
      return;
    }
    
    const validation = validateTonnage(value);
    setIsValid(validation.valid);
    setError(validation.error || null);
  }, [validateTonnage]);

  // Handle input blur
  const handleBlur = useCallback(() => {
    const num = parseFloat(inputValue);
    
    if (isNaN(num)) {
      setInputValue(currentTonnage.toFixed(1));
      setIsValid(true);
      setError(null);
      return;
    }
    
    // Round to nearest half-ton
    const rounded = Math.round(num * 2) / 2;
    const clamped = Math.min(Math.max(0, rounded), maxTonnage);
    
    setInputValue(clamped.toFixed(1));
    setIsValid(true);
    setError(null);
    
    if (clamped !== currentTonnage) {
      onChange(clamped);
      if (onPointsChange) {
        onPointsChange(calculatePoints(clamped));
      }
    }
  }, [inputValue, currentTonnage, maxTonnage, onChange, onPointsChange, calculatePoints]);

  // Handle increment/decrement buttons
  const handleIncrement = useCallback(() => {
    const newValue = Math.min(currentTonnage + 0.5, maxTonnage);
    if (newValue !== currentTonnage) {
      onChange(newValue);
      setInputValue(newValue.toFixed(1));
      if (onPointsChange) {
        onPointsChange(calculatePoints(newValue));
      }
    }
  }, [currentTonnage, maxTonnage, onChange, onPointsChange, calculatePoints]);

  const handleDecrement = useCallback(() => {
    const newValue = Math.max(currentTonnage - 0.5, 0);
    if (newValue !== currentTonnage) {
      onChange(newValue);
      setInputValue(newValue.toFixed(1));
      if (onPointsChange) {
        onPointsChange(calculatePoints(newValue));
      }
    }
  }, [currentTonnage, onChange, onPointsChange, calculatePoints]);

  // Update input when prop changes
  useEffect(() => {
    setInputValue(currentTonnage.toFixed(1));
  }, [currentTonnage]);

  const currentPoints = calculatePoints(currentTonnage);
  const percentageUsed = maxTonnage > 0 ? (currentTonnage / maxTonnage) * 100 : 0;

  return (
    <div className="armor-tonnage-control">
      {/* Main Input Section */}
      <div className="flex items-center gap-2">
        <label className="text-xs text-gray-300 w-20">Armor Tonnage:</label>
        
        <div className="flex items-center gap-1">
          <button
            onClick={handleDecrement}
            disabled={disabled || currentTonnage <= 0}
            className="px-2 py-1 text-xs bg-gray-700 text-gray-100 border border-gray-600 rounded-l hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
            title="Decrease by 0.5 tons"
          >
            -
          </button>
          
          <input
            type="number"
            value={inputValue}
            onChange={handleChange}
            onBlur={handleBlur}
            disabled={disabled}
            step="0.5"
            min="0"
            max={maxTonnage}
            className={`w-20 text-sm text-center bg-gray-700 text-gray-100 border border-gray-600 px-2 py-1 disabled:opacity-50 ${
              !isValid ? 'border-red-500 bg-red-900/20' : ''
            }`}
            title="Armor tonnage must be in increments of 0.5 tons"
          />
          
          <button
            onClick={handleIncrement}
            disabled={disabled || currentTonnage >= maxTonnage}
            className="px-2 py-1 text-xs bg-gray-700 text-gray-100 border border-gray-600 rounded-r hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
            title="Increase by 0.5 tons"
          >
            +
          </button>
        </div>
        
        <span className="text-xs text-gray-400">
          / {maxTonnage.toFixed(1)} tons
        </span>
      </div>

      {/* Validation Error */}
      {showValidation && error && (
        <div className="mt-1 text-xs text-red-400 pl-24">
          {error}
        </div>
      )}

      {/* Points Display */}
      <div className="mt-2 pl-24 text-xs text-gray-400">
        Points: {currentPoints} ({armorType.pointsPerTon} per ton)
      </div>

      {/* Progress Bar */}
      <div className="mt-2 pl-24">
        <div className="relative w-full h-2 bg-gray-700 rounded overflow-hidden">
          <div
            className={`absolute top-0 left-0 h-full transition-all duration-300 ${
              percentageUsed > 90 ? 'bg-red-500' :
              percentageUsed > 75 ? 'bg-yellow-500' :
              percentageUsed > 50 ? 'bg-blue-500' :
              'bg-green-500'
            }`}
            style={{ width: `${percentageUsed}%` }}
          />
        </div>
        <div className="mt-1 text-xs text-gray-400">
          {percentageUsed.toFixed(1)}% of maximum tonnage used
        </div>
      </div>
    </div>
  );
};

export default ArmorTonnageControl;
