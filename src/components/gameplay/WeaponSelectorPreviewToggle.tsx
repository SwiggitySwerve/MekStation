import React from 'react';

export interface PreviewToggleProps {
  readonly enabled: boolean;
  readonly onToggle: (next: boolean) => void;
}

export function PreviewToggle({
  enabled,
  onToggle,
}: PreviewToggleProps): React.ReactElement {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      onClick={() => onToggle(!enabled)}
      data-testid="weapon-selector-preview-toggle"
      className={`min-h-[32px] rounded px-3 py-1 text-xs font-semibold transition-colors focus:ring-2 focus:ring-offset-2 focus:outline-none ${
        enabled
          ? 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500'
          : 'text-text-theme-secondary bg-gray-200 hover:bg-gray-300 focus:ring-gray-400'
      }`}
    >
      Preview Damage: {enabled ? 'ON' : 'OFF'}
    </button>
  );
}
