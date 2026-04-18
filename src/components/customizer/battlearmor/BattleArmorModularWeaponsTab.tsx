/**
 * BattleArmorModularWeaponsTab — placeholder
 *
 * Will be wired by `add-battlearmor-construction` to provide:
 *   - Modular mount per suit with weapon-selector dropdown
 *   - Weight / crits tracking per mount
 *
 * @spec openspec/changes/add-per-type-customizer-tabs/tasks.md §5.5
 * @wiredBy add-battlearmor-construction
 */

import React from 'react';

export interface BattleArmorModularWeaponsTabProps {
  readOnly?: boolean;
  className?: string;
}

/**
 * Placeholder for the Modular Weapons tab.
 * Construction proposal `add-battlearmor-construction` will replace the body.
 */
export function BattleArmorModularWeaponsTab({
  className = '',
}: BattleArmorModularWeaponsTabProps): React.ReactElement {
  return (
    <div className={`p-4 ${className}`} data-testid="ba-modular-weapons-tab">
      <p className="text-text-theme-secondary text-sm">
        Coming soon — this tab will be wired up by add-battlearmor-construction
      </p>
    </div>
  );
}

export default BattleArmorModularWeaponsTab;
