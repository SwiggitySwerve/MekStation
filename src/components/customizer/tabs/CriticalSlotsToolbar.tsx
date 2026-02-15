import React from 'react';

export interface CriticalSlotsToolbarProps {
  readonly autoFillUnhittables: boolean;
  readonly autoCompact: boolean;
  readonly autoSort: boolean;
  readonly onAutoFillToggle: () => void;
  readonly onAutoCompactToggle: () => void;
  readonly onAutoSortToggle: () => void;
  readonly onFill: () => void;
  readonly onCompact: () => void;
  readonly onSort: () => void;
  readonly onReset: () => void;
  readonly readOnly: boolean;
}

export function CriticalSlotsToolbar({
  autoFillUnhittables,
  autoCompact,
  autoSort,
  onAutoFillToggle,
  onAutoCompactToggle,
  onAutoSortToggle,
  onFill: _onFill,
  onCompact: _onCompact,
  onSort: _onSort,
  onReset,
  readOnly,
}: CriticalSlotsToolbarProps): React.ReactElement {
  const toggleBtnClass = (active: boolean) => `
    px-2 py-1 text-[10px] sm:text-sm font-medium rounded border transition-colors
    ${
      active
        ? 'bg-teal-600 border-teal-500 text-white'
        : 'bg-surface-raised border-border-theme text-slate-300 hover:bg-surface-base'
    }
    ${readOnly ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
  `;

  const actionBtnClass = `
    px-2 sm:px-4 py-1 text-[10px] sm:text-sm font-medium rounded border transition-colors
    bg-surface-base border-border-theme-subtle text-white hover:bg-surface-raised
    ${readOnly ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
  `;

  return (
    <div className="bg-surface-base border-border-theme-subtle flex items-center gap-1 overflow-x-auto border-b p-1 sm:p-2">
      <button
        onClick={onAutoFillToggle}
        disabled={readOnly}
        className={toggleBtnClass(autoFillUnhittables)}
      >
        Fill
      </button>
      <button
        onClick={onAutoCompactToggle}
        disabled={readOnly}
        className={toggleBtnClass(autoCompact)}
      >
        Compact
      </button>
      <button
        onClick={onAutoSortToggle}
        disabled={readOnly}
        className={toggleBtnClass(autoSort)}
      >
        Sort
      </button>

      <div className="flex-1" />

      <button
        onClick={onReset}
        disabled={readOnly}
        className={`${actionBtnClass} hover:bg-red-600`}
      >
        Reset
      </button>
    </div>
  );
}
