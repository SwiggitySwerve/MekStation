/**
 * What the user agreed to when they clicked: the library unit an Overwrite
 * replaces and the losses a Save anyway accepts. A save that settles later is
 * refused, visibly, if either no longer matches what the dialog then shows.
 */
import { useRef } from 'react';

import type { IArmorSaveLoss } from '@/services/units/unitLoaderService/armorSaveLoss';
import type { INameValidationResult } from '@/services/units/UnitNameValidator';
import type { IUnrecoveredCriticalSlot } from '@/types/unit/UnitLoadDiagnostics';

import type { SaveDialogStatus } from './SaveUnitDialogFooter';

import {
  getLossFingerprint,
  getOverwriteTargetId,
  LOSS_CONSENT_MESSAGE,
  OVERWRITE_CONSENT_MESSAGE,
} from './SaveUnitDialogSaveProgress';

export interface SaveConsent {
  /** The library unit this save would replace, or undefined. */
  readonly overwriteTargetId: string | undefined;
  /** Whether saving drops anything the confirmation must list. */
  readonly hasLoss: boolean;
  readonly lossFingerprint: string;
  /** Record consent for what the dialog shows at click time. */
  readonly record: () => void;
  /** The reason a settling save must not replace this library unit, or null. */
  readonly overwriteRefusal: () => string | null;
  /** The reason a settling save must not accept these losses, or null. */
  readonly lossRefusal: () => string | null;
}

export function useSaveConsent({
  status,
  validationResult,
  unrecoveredCriticalSlots,
  lossTrackingUnknown,
  armorSaveLoss,
  isConfirmingLoss,
}: {
  readonly status: SaveDialogStatus;
  readonly validationResult: INameValidationResult | null;
  readonly unrecoveredCriticalSlots?: readonly IUnrecoveredCriticalSlot[];
  readonly lossTrackingUnknown: boolean;
  readonly armorSaveLoss?: IArmorSaveLoss;
  readonly isConfirmingLoss: boolean;
}): SaveConsent {
  const overwrite = useRef<string | undefined>(undefined);
  const loss = useRef<string | undefined>(undefined);
  const overwriteTargetId = getOverwriteTargetId(status, validationResult);
  const hasLoss = Boolean(
    unrecoveredCriticalSlots?.length || lossTrackingUnknown || armorSaveLoss,
  );
  const lossFingerprint = getLossFingerprint(
    unrecoveredCriticalSlots,
    lossTrackingUnknown,
    armorSaveLoss,
  );
  return {
    overwriteTargetId,
    hasLoss,
    lossFingerprint,
    record: () => {
      overwrite.current = overwriteTargetId;
      // Losses are only accepted from the confirmation that lists them.
      loss.current = isConfirmingLoss ? lossFingerprint : undefined;
    },
    overwriteRefusal: () =>
      overwriteTargetId && overwrite.current !== overwriteTargetId
        ? OVERWRITE_CONSENT_MESSAGE
        : null,
    lossRefusal: () =>
      hasLoss && loss.current !== lossFingerprint ? LOSS_CONSENT_MESSAGE : null,
  };
}
