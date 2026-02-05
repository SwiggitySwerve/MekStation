import React from 'react';

import {
  useAppSettingsStore,
  ArmorDiagramMode,
} from '@/stores/useAppSettingsStore';

/**
 * Toggle switch for armor diagram mode (Schematic vs Silhouette)
 */
export function ArmorDiagramModeSwitch(): React.ReactElement {
  const { armorDiagramMode, setArmorDiagramMode } = useAppSettingsStore();

  const modes: { id: ArmorDiagramMode; label: string }[] = [
    { id: 'schematic', label: 'Schematic' },
    { id: 'silhouette', label: 'Silhouette' },
  ];

  return (
    <div className="bg-surface-raised flex gap-1 rounded-lg p-1">
      {modes.map((mode) => (
        <button
          key={mode.id}
          onClick={() => setArmorDiagramMode(mode.id)}
          className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
            armorDiagramMode === mode.id
              ? 'bg-accent text-white'
              : 'text-text-theme-secondary hover:bg-surface-base hover:text-white'
          } `}
          aria-pressed={armorDiagramMode === mode.id}
        >
          {mode.label}
        </button>
      ))}
    </div>
  );
}
