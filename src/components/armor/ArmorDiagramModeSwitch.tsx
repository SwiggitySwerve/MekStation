import React from 'react';
import { useAppSettingsStore, ArmorDiagramMode } from '@/stores/useAppSettingsStore';

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
    <div className="flex gap-1 p-1 bg-surface-raised rounded-lg">
      {modes.map((mode) => (
        <button
          key={mode.id}
          onClick={() => setArmorDiagramMode(mode.id)}
          className={`
            px-3 py-1.5 text-sm font-medium rounded-md transition-colors
            ${armorDiagramMode === mode.id
              ? 'bg-accent text-white'
              : 'text-text-theme-secondary hover:text-white hover:bg-surface-base'
            }
          `}
          aria-pressed={armorDiagramMode === mode.id}
        >
          {mode.label}
        </button>
      ))}
    </div>
  );
}
