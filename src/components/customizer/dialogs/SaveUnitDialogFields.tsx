import type { ChangeEvent, ReactElement } from 'react';

import { customizerStyles as cs } from '../styles';

export function SaveDialogFields({
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
  handleChassisChange: (event: ChangeEvent<HTMLInputElement>) => void;
  handleVariantChange: (event: ChangeEvent<HTMLInputElement>) => void;
  hasConflict: boolean;
  inputConflictClass: string;
  variant: string;
}): ReactElement {
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
