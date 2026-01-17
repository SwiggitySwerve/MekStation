/**
 * Battle Armor Diagram Component
 *
 * Visual representation of a Battle Armor squad showing trooper count and armor.
 *
 * @spec openspec/changes/add-multi-unit-type-support/tasks.md Phase 5.1.4
 */

import React from 'react';
import { useBattleArmorStore } from '@/stores/useBattleArmorStore';

// =============================================================================
// Types
// =============================================================================

interface BattleArmorDiagramProps {
  className?: string;
}

// =============================================================================
// Component
// =============================================================================

export function BattleArmorDiagram({
  className = '',
}: BattleArmorDiagramProps): React.ReactElement {
  const squadSize = useBattleArmorStore((s) => s.squadSize);
  const armorPerTrooper = useBattleArmorStore((s) => s.armorPerTrooper);
  const chassisType = useBattleArmorStore((s) => s.chassisType);

  // Create trooper indicators
  const troopers = Array.from({ length: squadSize }, (_, i) => i);

  return (
    <div className={`${className}`}>
      {/* Squad Overview */}
      <div className="bg-surface-raised rounded-lg p-4">
        <div className="text-center mb-4">
          <span className="text-text-theme-secondary text-xs">Chassis</span>
          <p className="text-white font-medium">{chassisType}</p>
        </div>

        {/* Trooper Grid */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          {troopers.map((i) => (
            <div
              key={i}
              className="aspect-square flex flex-col items-center justify-center bg-surface-base rounded border border-border-theme"
            >
              {/* Simple trooper icon */}
              <svg
                viewBox="0 0 24 24"
                className="w-8 h-8 text-accent"
                fill="currentColor"
              >
                <circle cx="12" cy="6" r="4" />
                <path d="M12 12c-4 0-6 2-6 4v4h12v-4c0-2-2-4-6-4z" />
              </svg>
              <span className="text-xs text-text-theme-secondary mt-1">
                {armorPerTrooper} AP
              </span>
            </div>
          ))}
        </div>

        {/* Stats Summary */}
        <div className="border-t border-border-theme pt-3 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-text-theme-secondary">Squad Size</span>
            <span className="text-white">{squadSize}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-text-theme-secondary">Total Armor</span>
            <span className="text-accent">{squadSize * armorPerTrooper}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default BattleArmorDiagram;
