import type { ReactElement } from 'react';

import type { INameValidationResult } from '@/services/units/UnitNameValidator';

import { customizerStyles as cs } from '../styles';

export type SaveDialogStatus =
  | 'idle'
  | 'validating'
  | 'valid'
  | 'canonical-conflict'
  | 'custom-conflict'
  | 'error';

export function SaveDialogFooter({
  canSave,
  isSaving,
  handleSave,
  handleSaveAsNew,
  onCancel,
  saveButtonClass,
  status,
  validationResult,
}: {
  canSave: boolean;
  isSaving: boolean;
  handleSave: () => void;
  handleSaveAsNew: () => void;
  onCancel: () => void;
  saveButtonClass: string;
  status: SaveDialogStatus;
  validationResult: INameValidationResult | null;
}): ReactElement {
  return (
    <>
      <button
        onClick={onCancel}
        disabled={isSaving}
        className={cs.dialog.btnGhost}
      >
        Cancel
      </button>

      {status === 'custom-conflict' && validationResult?.suggestedName && (
        <button
          onClick={handleSaveAsNew}
          disabled={isSaving}
          className={cs.dialog.btnSecondary}
        >
          Save As New
        </button>
      )}

      <button
        onClick={handleSave}
        disabled={!canSave}
        className={`min-w-[100px] ${saveButtonClass}`}
      >
        {isSaving
          ? 'Saving...'
          : status === 'custom-conflict'
            ? 'Overwrite'
            : 'Save'}
      </button>
    </>
  );
}
