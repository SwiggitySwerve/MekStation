/**
 * InfantrySecondaryWeaponsTab — placeholder
 *
 * Will be wired by `add-infantry-construction` to expose:
 *   - Anti-personnel secondary weapons
 *   - Ratio per 4 troopers rule enforcement
 *
 * @spec openspec/changes/add-per-type-customizer-tabs/tasks.md §6.4
 * @wiredBy add-infantry-construction
 */

import React from 'react';

export interface InfantrySecondaryWeaponsTabProps {
  readOnly?: boolean;
  className?: string;
}

/**
 * Placeholder for the Secondary Weapons tab.
 * Construction proposal `add-infantry-construction` will replace the body.
 */
export function InfantrySecondaryWeaponsTab({
  className = '',
}: InfantrySecondaryWeaponsTabProps): React.ReactElement {
  return (
    <div
      className={`p-4 ${className}`}
      data-testid="infantry-secondary-weapons-tab"
    >
      <p className="text-text-theme-secondary text-sm">
        Coming soon — this tab will be wired up by add-infantry-construction
      </p>
    </div>
  );
}

export default InfantrySecondaryWeaponsTab;
