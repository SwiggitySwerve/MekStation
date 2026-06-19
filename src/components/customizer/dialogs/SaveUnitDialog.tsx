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

import { DialogTemplate } from '@/components/ui/DialogTemplate';
import {
  unitNameValidator,
  INameValidationResult,
} from '@/services/units/UnitNameValidator';
import { logger } from '@/utils/logger';

import { customizerStyles as cs } from '../styles';
import {
  CheckIcon,
  ErrorIcon,
  SpinnerIcon,
  WarningIcon,
} from './dialogPresentation';

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

type ValidationStatus =
  | 'idle'
  | 'validating'
  | 'valid'
  | 'canonical-conflict'
  | 'custom-conflict'
  | 'error';

function statusFromValidationResult(
  result: INameValidationResult,
): ValidationStatus {
  if (result.isCanonicalConflict) return 'canonical-conflict';
  if (result.isCustomConflict) return 'custom-conflict';
  if (result.isValid) return 'valid';

  return 'error';
}

function getInputConflictClass(status: ValidationStatus) {
  if (status === 'canonical-conflict')
    return 'border-red-500 focus:ring-red-500';
  if (status === 'custom-conflict')
    return 'border-amber-500 focus:ring-amber-500';

  return '';
}

function getSaveButtonClass(status: ValidationStatus, canSave: boolean) {
  if (!canSave) return cs.dialog.btnPrimary;
  if (status === 'custom-conflict') return cs.dialog.btnWarning;

  return cs.dialog.btnPrimary;
}

function ValidationStatusIndicator({
  result,
  status,
}: {
  result: INameValidationResult | null;
  status: ValidationStatus;
}) {
  const messages: Partial<Record<ValidationStatus, React.ReactElement>> = {
    validating: (
      <div className="text-text-theme-secondary flex items-center gap-2">
        <SpinnerIcon className="h-4 w-4 animate-spin" />
        <span className="text-sm">Checking availability...</span>
      </div>
    ),
    valid: (
      <div className="flex items-center gap-2 text-green-400">
        <CheckIcon />
        <span className="text-sm">Name is available</span>
      </div>
    ),
    'canonical-conflict': (
      <div className="flex items-center gap-2 text-red-400">
        <svg
          className="h-4 w-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
        <span className="text-sm">
          {result?.errorMessage || 'Conflicts with official unit'}
        </span>
      </div>
    ),
    'custom-conflict': (
      <div className="text-accent flex items-center gap-2">
        <WarningIcon />
        <span className="text-sm">Conflicts with existing custom unit</span>
      </div>
    ),
    error: (
      <div className="flex items-center gap-2 text-red-400">
        <ErrorIcon />
        <span className="text-sm">
          {result?.errorMessage || 'Invalid name'}
        </span>
      </div>
    ),
  };

  return messages[status] ?? null;
}

function scheduleValidation(
  existingTimeout: NodeJS.Timeout | null,
  validate: () => void,
) {
  if (existingTimeout) {
    clearTimeout(existingTimeout);
  }

  return setTimeout(validate, 300);
}

function saveUnitName({
  chassis,
  onSave,
  status,
  validationResult,
  variant,
}: {
  chassis: string;
  onSave: SaveUnitDialogProps['onSave'];
  status: ValidationStatus;
  validationResult: INameValidationResult | null;
  variant: string;
}) {
  if (status === 'canonical-conflict') return;

  if (status === 'custom-conflict' && validationResult?.conflictingUnitId) {
    onSave(chassis.trim(), variant.trim(), validationResult.conflictingUnitId);
    return;
  }

  onSave(chassis.trim(), variant.trim());
}

function SaveDialogFooter({
  canSave,
  handleSave,
  handleSaveAsNew,
  onCancel,
  saveButtonClass,
  status,
  validationResult,
}: {
  canSave: boolean;
  handleSave: () => void;
  handleSaveAsNew: () => void;
  onCancel: () => void;
  saveButtonClass: string;
  status: ValidationStatus;
  validationResult: INameValidationResult | null;
}) {
  return (
    <>
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
        className={`min-w-[100px] ${saveButtonClass}`}
      >
        {status === 'custom-conflict' ? 'Overwrite' : 'Save'}
      </button>
    </>
  );
}

function SaveDialogFields({
  chassis,
  handleAutoSuggest,
  handleChassisChange,
  handleVariantChange,
  hasConflict,
  inputConflictClass,
  variant,
}: {
  chassis: string;
  handleAutoSuggest: () => void;
  handleChassisChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  handleVariantChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  hasConflict: boolean;
  inputConflictClass: string;
  variant: string;
}) {
  return (
    <>
      <div>
        <label
          htmlFor="chassis"
          className="mb-1 block text-sm font-medium text-slate-300"
        >
          Chassis Name
        </label>
        <input
          id="chassis"
          type="text"
          value={chassis}
          onChange={handleChassisChange}
          placeholder="e.g., Atlas, Timber Wolf"
          className={`${cs.dialog.input} ${inputConflictClass}`}
        />
      </div>

      <div>
        <label
          htmlFor="variant"
          className="mb-1 block text-sm font-medium text-slate-300"
        >
          Variant Designation
        </label>
        <div className="flex gap-2">
          <input
            id="variant"
            type="text"
            value={variant}
            onChange={handleVariantChange}
            placeholder="e.g., AS7-D, Prime"
            className={`flex-1 ${cs.dialog.input} ${inputConflictClass}`}
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
    </>
  );
}

function UnitNamePreview({
  chassis,
  variant,
}: {
  chassis: string;
  variant: string;
}) {
  if (!chassis.trim() || !variant.trim()) return null;

  return (
    <div className={cs.dialog.infoPanel}>
      <div className="mb-1 text-xs text-slate-400">Full Unit Name:</div>
      <div className="font-medium text-white">
        {unitNameValidator.buildFullName(chassis.trim(), variant.trim())}
      </div>
    </div>
  );
}

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
  const [validationResult, setValidationResult] =
    useState<INameValidationResult | null>(null);
  const [validationDebounce, setValidationDebounce] =
    useState<NodeJS.Timeout | null>(null);

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
  const validateName = useCallback(
    async (chassisValue: string, variantValue: string) => {
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
          currentUnitId,
        );

        setValidationResult(result);
        setStatus(statusFromValidationResult(result));
      } catch (error) {
        logger.error('Validation error:', error);
        setStatus('error');
        setValidationResult({
          isValid: false,
          isCanonicalConflict: false,
          isCustomConflict: false,
          errorMessage: 'Failed to validate name',
        });
      }
    },
    [currentUnitId],
  );

  // Handle input changes with debounced validation
  const handleChassisChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setChassis(value);
    setValidationDebounce(
      scheduleValidation(validationDebounce, () =>
        validateName(value, variant),
      ),
    );
  };

  const handleVariantChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setVariant(value);
    setValidationDebounce(
      scheduleValidation(validationDebounce, () =>
        validateName(chassis, value),
      ),
    );
  };

  // Handle save action
  const handleSave = () => {
    saveUnitName({ chassis, onSave, status, validationResult, variant });
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
      const suggested = await unitNameValidator.generateUniqueName(
        chassis,
        variant,
      );
      setVariant(suggested.variant);
      validateName(chassis, suggested.variant);
    } catch (error) {
      logger.error('Failed to generate unique name:', error);
    }
  };

  // Determine button states
  const isValidating = status === 'validating';
  const canSave =
    (status === 'valid' || status === 'custom-conflict') && !isValidating;
  const hasConflict =
    status === 'custom-conflict' || status === 'canonical-conflict';

  const inputConflictClass = getInputConflictClass(status);
  const saveButtonClass = getSaveButtonClass(status, canSave);

  return (
    <DialogTemplate
      isOpen={isOpen}
      onClose={onCancel}
      title="Save Unit"
      className="mx-4 w-full max-w-lg"
      footer={
        <SaveDialogFooter
          canSave={canSave}
          handleSave={handleSave}
          handleSaveAsNew={handleSaveAsNew}
          onCancel={onCancel}
          saveButtonClass={saveButtonClass}
          status={status}
          validationResult={validationResult}
        />
      }
    >
      <SaveDialogFields
        chassis={chassis}
        handleAutoSuggest={handleAutoSuggest}
        handleChassisChange={handleChassisChange}
        handleVariantChange={handleVariantChange}
        hasConflict={hasConflict}
        inputConflictClass={inputConflictClass}
        variant={variant}
      />

      {/* Validation status */}
      <div className="min-h-[24px]">
        <ValidationStatusIndicator result={validationResult} status={status} />
      </div>

      {/* Preview */}
      <UnitNamePreview chassis={chassis} variant={variant} />
    </DialogTemplate>
  );
}
