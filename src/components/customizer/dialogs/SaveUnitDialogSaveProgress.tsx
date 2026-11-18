import type { ReactElement } from 'react';

import type { IArmorSaveLoss } from '@/services/units/unitLoaderService/armorSaveLoss';
import type { INameValidationResult } from '@/services/units/UnitNameValidator';
import type { IUnrecoveredCriticalSlot } from '@/types/unit/UnitLoadDiagnostics';

import type { ConstructionValidationState } from './SaveUnitDialogConstructionStatus';
import type { SaveDialogStatus } from './SaveUnitDialogFooter';

import { DEFERRED_SAVE_WAITING_MESSAGE } from './useDeferredSave';

/** The library unit a save would replace, or undefined for a new save. */
export function getOverwriteTargetId(
  status: SaveDialogStatus,
  validationResult: INameValidationResult | null,
): string | undefined {
  return status === 'custom-conflict'
    ? validationResult?.conflictingUnitId
    : undefined;
}

/** Identity of the losses a confirmation shows; consent is bound to it. */
export function getLossFingerprint(
  entries: readonly IUnrecoveredCriticalSlot[] | undefined,
  lossTrackingUnknown: boolean,
  armorSaveLoss: IArmorSaveLoss | undefined,
): string {
  return JSON.stringify({
    entries: entries?.map((entry) => [entry.text, entry.location, entry.slot]),
    unknown: lossTrackingUnknown,
    armor: armorSaveLoss ?? null,
  });
}

/** A queued Save anyway never accepts losses the user was not shown. */
export const LOSS_CONSENT_MESSAGE =
  'The entries lost on save changed. Review them and press Save anyway again.';

/** A queued save never replaces a library unit the user was not shown. */
export const OVERWRITE_CONSENT_MESSAGE =
  'A custom unit with this name already exists. Press Overwrite to replace it, or change the name.';

/** Why a save cannot happen once every check has settled, or null. */
export function getSaveBlockedReason(
  status: SaveDialogStatus,
  validationResult: INameValidationResult | null,
  constructionValidation: ConstructionValidationState,
  hasNames: boolean,
): string | null {
  if (!hasNames) return 'Enter a chassis and a variant name to save.';
  if (status === 'canonical-conflict')
    return (
      validationResult?.errorMessage ||
      'This name conflicts with an official unit. Choose another variant name.'
    );
  if (status === 'error')
    return validationResult?.errorMessage || 'This name cannot be used.';
  if (!constructionValidation.isValid)
    return 'Fix the construction errors before saving.';
  return null;
}

/**
 * The polite live region stays mounted so the waiting message is announced;
 * a refusal is an alert. In the loss confirmation, where the name and
 * construction panels are hidden, a settled reason is shown beside the button.
 */
export function SaveUnitDialogSaveProgress({
  isQueued,
  refusal,
  confirmationReason,
}: {
  isQueued: boolean;
  refusal: string | null;
  confirmationReason: string | null;
}): ReactElement {
  return (
    <>
      <p
        role="status"
        aria-live="polite"
        className={isQueued ? 'text-text-theme-secondary text-sm' : 'sr-only'}
      >
        {isQueued ? DEFERRED_SAVE_WAITING_MESSAGE : ''}
      </p>
      {refusal ? (
        <p role="alert" className="text-sm text-red-400">
          {refusal}
        </p>
      ) : (
        confirmationReason && (
          <p className="text-sm text-red-400">{confirmationReason}</p>
        )
      )}
    </>
  );
}
