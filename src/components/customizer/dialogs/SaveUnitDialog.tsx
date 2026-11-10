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

import React, { useState, useEffect, useCallback, useRef } from 'react';

import type { IUnrecoveredCriticalSlot } from '@/types/unit/UnitLoadDiagnostics';

import { UnrecoveredCriticalSlotsNotice } from '@/components/customizer/shared/UnrecoveredCriticalSlotsNotice';
import { Button } from '@/components/ui/Button';
import { DialogTemplate } from '@/components/ui/DialogTemplate';
import {
  unitNameValidator,
  INameValidationResult,
} from '@/services/units/UnitNameValidator';
import { logger } from '@/utils/logger';

import { customizerStyles as cs } from '../styles';
import {
  CheckIcon,
  CloseIcon,
  ErrorIcon,
  SpinnerIcon,
  WarningIcon,
} from './dialogPresentation';
import {
  SaveUnitDialogConstructionStatus,
  type ConstructionValidationState,
} from './SaveUnitDialogConstructionStatus';
import {
  SaveDialogFooter,
  type SaveDialogStatus as ValidationStatus,
} from './SaveUnitDialogFooter';
import { SaveUnitDialogPreview } from './SaveUnitDialogPreview';

// =============================================================================
// Types
// =============================================================================

export interface SaveUnitDialogProps {
  /** Whether dialog is open */
  isOpen: boolean;
  /** A library save is pending; prevent changes and dismissal until it settles. */
  isSaving?: boolean;
  /** Initial chassis name */
  initialChassis: string;
  /** Initial variant name */
  initialVariant: string;
  /** Current unit ID (for excluding from conflict check during updates) */
  currentUnitId?: string;
  /** Construction validation for the exact unit store being saved */
  constructionValidation: ConstructionValidationState;
  /** The target unit's loader-owned list; never inferred by the dialog. */
  unrecoveredCriticalSlots?: readonly IUnrecoveredCriticalSlot[];
  lossTrackingUnknown?: boolean;
  isRefreshingLossDiagnostics?: boolean;
  /** Called when save is confirmed */
  onSave: (chassis: string, variant: string, overwriteId?: string) => void;
  /** Called when dialog is cancelled */
  onCancel: () => void;
}

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
  if (canSave && status === 'custom-conflict') return cs.dialog.btnWarning;

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
        <SpinnerIcon size="inline" />
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
        <CloseIcon size="inline" />
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
  if (existingTimeout) clearTimeout(existingTimeout);

  return setTimeout(validate, 300);
}

function SaveDialogFields({
  chassis,
  isSaving,
  handleAutoSuggest,
  handleChassisChange,
  handleVariantChange,
  hasConflict,
  inputConflictClass,
  variant,
}: {
  chassis: string;
  isSaving: boolean;
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
          className="text-text-theme-secondary mb-1 block text-sm font-medium"
        >
          Chassis Name
        </label>
        <input
          id="chassis"
          type="text"
          value={chassis}
          disabled={isSaving}
          onChange={handleChassisChange}
          placeholder="e.g., Atlas, Timber Wolf"
          className={`${cs.dialog.input} ${inputConflictClass}`}
        />
      </div>

      <div>
        <label
          htmlFor="variant"
          className="text-text-theme-secondary mb-1 block text-sm font-medium"
        >
          Variant Designation
        </label>
        <div className="flex gap-2">
          <input
            id="variant"
            type="text"
            value={variant}
            disabled={isSaving}
            onChange={handleVariantChange}
            placeholder="e.g., AS7-D, Prime"
            className={`flex-1 ${cs.dialog.input} ${inputConflictClass}`}
          />
          {hasConflict && (
            <button
              onClick={handleAutoSuggest}
              disabled={isSaving}
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

// =============================================================================
// Component
// =============================================================================

export function SaveUnitDialog({
  isOpen,
  isSaving = false,
  initialChassis,
  initialVariant,
  currentUnitId,
  constructionValidation,
  unrecoveredCriticalSlots,
  lossTrackingUnknown = false,
  isRefreshingLossDiagnostics = false,
  onSave,
  onCancel,
}: SaveUnitDialogProps): React.ReactElement {
  // Form state
  const [chassis, setChassis] = useState(initialChassis);
  const [variant, setVariant] = useState(initialVariant);
  const [isConfirmingLoss, setIsConfirmingLoss] = useState(false);
  const lossCancelButton = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (isConfirmingLoss) lossCancelButton.current?.focus();
  }, [isConfirmingLoss]);

  // Validation state
  const [status, setStatus] = useState<ValidationStatus>('idle');
  const [validationResult, setValidationResult] =
    useState<INameValidationResult | null>(null);
  const validationDebounce = useRef<NodeJS.Timeout | null>(null);
  const validationRequest = useRef(0);

  // Validate name with debounce
  const validateName = useCallback(
    async (chassisValue: string, variantValue: string) => {
      const request = ++validationRequest.current;
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

        if (request !== validationRequest.current) return;
        setValidationResult(result);
        setStatus(statusFromValidationResult(result));
      } catch (error) {
        if (request !== validationRequest.current) return;
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

  const cancelValidation = useCallback(() => {
    validationRequest.current++;
    if (validationDebounce.current) clearTimeout(validationDebounce.current);
  }, []);

  useEffect(() => {
    setIsConfirmingLoss(false);
    if (isOpen) {
      setChassis(initialChassis);
      setVariant(initialVariant);
      setValidationResult(null);
      void validateName(initialChassis, initialVariant);
    } else {
      setStatus('idle');
      setValidationResult(null);
    }
    return cancelValidation;
  }, [isOpen, initialChassis, initialVariant, validateName, cancelValidation]);

  const queueValidation = (nextChassis: string, nextVariant: string): void => {
    validationRequest.current++;
    setValidationResult(null);
    setStatus('validating');
    validationDebounce.current = scheduleValidation(
      validationDebounce.current,
      () => {
        void validateName(nextChassis, nextVariant);
      },
    );
  };
  const handleChassisChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setChassis(value);
    queueValidation(value, variant);
  };
  const handleVariantChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setVariant(value);
    queueValidation(chassis, value);
  };

  // Handle save action
  const handleSave = () => {
    if (!canSave) return;
    if (
      (unrecoveredCriticalSlots?.length || lossTrackingUnknown) &&
      !isConfirmingLoss
    ) {
      setIsConfirmingLoss(true);
      return;
    }
    if (status === 'custom-conflict' && validationResult?.conflictingUnitId) {
      onSave(
        chassis.trim(),
        variant.trim(),
        validationResult.conflictingUnitId,
      );
    } else {
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
  const canSave =
    !isSaving &&
    !isRefreshingLossDiagnostics &&
    (status === 'valid' || status === 'custom-conflict') &&
    constructionValidation.isValid &&
    !constructionValidation.isLoading &&
    !constructionValidation.isValidating;
  const hasConflict =
    status === 'custom-conflict' || status === 'canonical-conflict';

  const inputConflictClass = getInputConflictClass(status);
  const saveButtonClass = getSaveButtonClass(status, canSave);

  return (
    <DialogTemplate
      isOpen={isOpen}
      onClose={isConfirmingLoss ? () => setIsConfirmingLoss(false) : onCancel}
      preventClose={isSaving}
      title={
        isConfirmingLoss
          ? 'Save with missing critical-slot entries?'
          : 'Save Unit'
      }
      className="mx-4 w-full max-w-lg"
      footer={
        isConfirmingLoss ? (
          <>
            <button
              ref={lossCancelButton}
              type="button"
              className={cs.dialog.btnSecondary}
              disabled={isSaving}
              onClick={() => setIsConfirmingLoss(false)}
            >
              Cancel
            </button>
            <Button disabled={!canSave} onClick={handleSave}>
              {isSaving ? 'Saving...' : 'Save anyway'}
            </Button>
          </>
        ) : (
          <SaveDialogFooter
            canSave={canSave}
            isSaving={isSaving}
            handleSave={handleSave}
            handleSaveAsNew={handleSaveAsNew}
            onCancel={onCancel}
            saveButtonClass={saveButtonClass}
            status={status}
            validationResult={validationResult}
          />
        )
      }
    >
      <UnrecoveredCriticalSlotsNotice
        entries={unrecoveredCriticalSlots}
        unknown={lossTrackingUnknown}
        checking={isRefreshingLossDiagnostics}
      />
      {!isConfirmingLoss && (
        <>
          <SaveDialogFields
            chassis={chassis}
            isSaving={isSaving}
            handleAutoSuggest={handleAutoSuggest}
            handleChassisChange={handleChassisChange}
            handleVariantChange={handleVariantChange}
            hasConflict={hasConflict}
            inputConflictClass={inputConflictClass}
            variant={variant}
          />

          {/* Validation status */}
          <div className="min-h-[24px]">
            <ValidationStatusIndicator
              result={validationResult}
              status={status}
            />
          </div>

          <SaveUnitDialogConstructionStatus {...constructionValidation} />

          {/* Preview */}
          <SaveUnitDialogPreview chassis={chassis} variant={variant} />
        </>
      )}
    </DialogTemplate>
  );
}
