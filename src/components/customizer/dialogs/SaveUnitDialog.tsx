/**
 * Save Unit Dialog Component
 * 
 * Dialog for saving a unit with Chassis and Variant name inputs.
 * Validates against canonical and custom units to prevent conflicts.
 * 
 * - Canonical unit conflicts are BLOCKED (cannot save)
 * - Custom unit conflicts offer overwrite option
 * 
 * @spec openspec/specs/unit-services/spec.md
 */

import React, { useState, useEffect, useCallback } from 'react';
import { ModalOverlay } from './ModalOverlay';
import {
  unitNameValidator,
  INameValidationResult,
} from '@/services/units/UnitNameValidator';
import { customizerStyles as cs } from '../styles';

// =============================================================================
// Types
// =============================================================================

export interface SaveUnitDialogProps {
  /** Whether dialog is open */
  isOpen: boolean;
  /** Initial chassis name */
  initialChassis: string;
  /** Initial variant name */
  initialVariant: string;
  /** Current unit ID (for excluding from conflict check during updates) */
  currentUnitId?: string;
  /** Called when save is confirmed */
  onSave: (chassis: string, variant: string, overwriteId?: string) => void;
  /** Called when dialog is cancelled */
  onCancel: () => void;
}

type ValidationStatus = 'idle' | 'validating' | 'valid' | 'canonical-conflict' | 'custom-conflict' | 'error';

// =============================================================================
// Component
// =============================================================================

export function SaveUnitDialog({
  isOpen,
  initialChassis,
  initialVariant,
  currentUnitId,
  onSave,
  onCancel,
}: SaveUnitDialogProps): React.ReactElement {
  // Form state
  const [chassis, setChassis] = useState(initialChassis);
  const [variant, setVariant] = useState(initialVariant);
  
  // Validation state
  const [status, setStatus] = useState<ValidationStatus>('idle');
  const [validationResult, setValidationResult] = useState<INameValidationResult | null>(null);
  const [validationDebounce, setValidationDebounce] = useState<NodeJS.Timeout | null>(null);
  
  // Reset form when dialog opens
  useEffect(() => {
    if (isOpen) {
      setChassis(initialChassis);
      setVariant(initialVariant);
      setStatus('idle');
      setValidationResult(null);
    }
  }, [isOpen, initialChassis, initialVariant]);
  
  // Validate name with debounce
  const validateName = useCallback(async (chassisValue: string, variantValue: string) => {
    if (!chassisValue.trim() || !variantValue.trim()) {
      setStatus('idle');
      setValidationResult(null);
      return;
    }
    
    setStatus('validating');
    
    try {
      const result = await unitNameValidator.validateUnitName(
        chassisValue,
        variantValue,
        currentUnitId
      );
      
      setValidationResult(result);
      
      if (result.isCanonicalConflict) {
        setStatus('canonical-conflict');
      } else if (result.isCustomConflict) {
        setStatus('custom-conflict');
      } else if (result.isValid) {
        setStatus('valid');
      } else {
        setStatus('error');
      }
    } catch (error) {
      console.error('Validation error:', error);
      setStatus('error');
      setValidationResult({
        isValid: false,
        isCanonicalConflict: false,
        isCustomConflict: false,
        errorMessage: 'Failed to validate name',
      });
    }
  }, [currentUnitId]);
  
  // Handle input changes with debounced validation
  const handleChassisChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setChassis(value);
    
    // Clear existing debounce
    if (validationDebounce) {
      clearTimeout(validationDebounce);
    }
    
    // Debounce validation
    const timeout = setTimeout(() => {
      validateName(value, variant);
    }, 300);
    setValidationDebounce(timeout);
  };
  
  const handleVariantChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setVariant(value);
    
    // Clear existing debounce
    if (validationDebounce) {
      clearTimeout(validationDebounce);
    }
    
    // Debounce validation
    const timeout = setTimeout(() => {
      validateName(chassis, value);
    }, 300);
    setValidationDebounce(timeout);
  };
  
  // Handle save action
  const handleSave = () => {
    if (status === 'canonical-conflict') {
      // Cannot save - blocked
      return;
    }
    
    if (status === 'custom-conflict' && validationResult?.conflictingUnitId) {
      // Save with overwrite
      onSave(chassis.trim(), variant.trim(), validationResult.conflictingUnitId);
    } else {
      // Save as new
      onSave(chassis.trim(), variant.trim());
    }
  };
  
  // Handle save as new (different name to avoid conflict)
  const handleSaveAsNew = () => {
    if (!validationResult?.suggestedName) return;
    
    // Parse suggested name back into chassis/variant
    // Suggested name format is "Chassis Variant"
    const suggested = validationResult.suggestedName;
    const spaceIndex = suggested.indexOf(' ');
    if (spaceIndex > 0) {
      const suggestedVariant = suggested.substring(spaceIndex + 1);
      setVariant(suggestedVariant);
      validateName(chassis, suggestedVariant);
    }
  };
  
  // Auto-suggest unique name
  const handleAutoSuggest = async () => {
    try {
      const suggested = await unitNameValidator.generateUniqueName(chassis, variant);
      setVariant(suggested.variant);
      validateName(chassis, suggested.variant);
    } catch (error) {
      console.error('Failed to generate unique name:', error);
    }
  };
  
  // Determine button states
  const isValidating = status === 'validating';
  const canSave = (status === 'valid' || status === 'custom-conflict') && !isValidating;
  const isBlocked = status === 'canonical-conflict';
  const hasConflict = status === 'custom-conflict' || status === 'canonical-conflict';
  
  // Get status indicator
  const getStatusIndicator = () => {
    switch (status) {
      case 'validating':
        return (
          <div className="flex items-center gap-2 text-slate-400">
            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <span className="text-sm">Checking availability...</span>
          </div>
        );
      case 'valid':
        return (
          <div className="flex items-center gap-2 text-green-400">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span className="text-sm">Name is available</span>
          </div>
        );
      case 'canonical-conflict':
        return (
          <div className="flex items-center gap-2 text-red-400">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            <span className="text-sm">{validationResult?.errorMessage || 'Conflicts with official unit'}</span>
          </div>
        );
      case 'custom-conflict':
        return (
          <div className="flex items-center gap-2 text-amber-400">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span className="text-sm">Conflicts with existing custom unit</span>
          </div>
        );
      case 'error':
        return (
          <div className="flex items-center gap-2 text-red-400">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-sm">{validationResult?.errorMessage || 'Invalid name'}</span>
          </div>
        );
      default:
        return null;
    }
  };
  
  return (
    <ModalOverlay
      isOpen={isOpen}
      onClose={onCancel}
      className="w-full max-w-lg mx-4"
    >
      {/* Header */}
      <div className={cs.dialog.header}>
        <h3 className={cs.dialog.headerTitle}>Save Unit</h3>
        <button onClick={onCancel} className={cs.dialog.closeBtn}>
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      
      {/* Form */}
      <div className={cs.dialog.content}>
        {/* Chassis input */}
        <div>
          <label htmlFor="chassis" className="block text-sm font-medium text-slate-300 mb-1">
            Chassis Name
          </label>
          <input
            id="chassis"
            type="text"
            value={chassis}
            onChange={handleChassisChange}
            placeholder="e.g., Atlas, Timber Wolf"
            className={`${cs.dialog.input} ${
              isBlocked 
                ? 'border-red-500 focus:ring-red-500' 
                : status === 'custom-conflict'
                  ? 'border-amber-500 focus:ring-amber-500'
                  : ''
            }`}
          />
        </div>
        
        {/* Variant input */}
        <div>
          <label htmlFor="variant" className="block text-sm font-medium text-slate-300 mb-1">
            Variant Designation
          </label>
          <div className="flex gap-2">
            <input
              id="variant"
              type="text"
              value={variant}
              onChange={handleVariantChange}
              placeholder="e.g., AS7-D, Prime"
              className={`flex-1 ${cs.dialog.input} ${
                isBlocked 
                  ? 'border-red-500 focus:ring-red-500' 
                  : status === 'custom-conflict'
                    ? 'border-amber-500 focus:ring-amber-500'
                    : ''
              }`}
            />
            {hasConflict && (
              <button
                onClick={handleAutoSuggest}
                className={cs.dialog.btnSecondary}
                title="Suggest unique name"
              >
                Suggest
              </button>
            )}
          </div>
        </div>
        
        {/* Validation status */}
        <div className="min-h-[24px]">
          {getStatusIndicator()}
        </div>
        
        {/* Preview */}
        {chassis.trim() && variant.trim() && (
          <div className={cs.dialog.infoPanel}>
            <div className="text-xs text-slate-400 mb-1">Full Unit Name:</div>
            <div className="text-white font-medium">
              {unitNameValidator.buildFullName(chassis.trim(), variant.trim())}
            </div>
          </div>
        )}
      </div>
      
      {/* Footer */}
      <div className={cs.dialog.footer}>
        <button onClick={onCancel} className={cs.dialog.btnGhost}>
          Cancel
        </button>
        
        {status === 'custom-conflict' && validationResult?.suggestedName && (
          <button onClick={handleSaveAsNew} className={cs.dialog.btnSecondary}>
            Save As New
          </button>
        )}
        
        <button
          onClick={handleSave}
          disabled={!canSave}
          className={`min-w-[100px] ${
            canSave
              ? status === 'custom-conflict'
                ? cs.dialog.btnWarning
                : cs.dialog.btnPrimary
              : cs.dialog.btnPrimary
          }`}
        >
          {status === 'custom-conflict' ? 'Overwrite' : 'Save'}
        </button>
      </div>
    </ModalOverlay>
  );
}

