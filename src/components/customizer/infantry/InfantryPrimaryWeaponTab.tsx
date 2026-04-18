/**
 * InfantryPrimaryWeaponTab — placeholder
 *
 * Will be wired by `add-infantry-construction` to expose:
 *   - Primary weapon selection from the infantry-weapons catalog
 *   - One primary weapon per platoon
 *
 * @spec openspec/changes/add-per-type-customizer-tabs/tasks.md §6.3
 * @wiredBy add-infantry-construction
 */

import React from "react";

export interface InfantryPrimaryWeaponTabProps {
  readOnly?: boolean;
  className?: string;
}

/**
 * Placeholder for the Primary Weapon tab.
 * Construction proposal `add-infantry-construction` will replace the body.
 */
export function InfantryPrimaryWeaponTab({
  className = "",
}: InfantryPrimaryWeaponTabProps): React.ReactElement {
  return (
    <div
      className={`p-4 ${className}`}
      data-testid="infantry-primary-weapon-tab"
    >
      <p className="text-text-theme-secondary text-sm">
        Coming soon — this tab will be wired up by add-infantry-construction
      </p>
    </div>
  );
}

export default InfantryPrimaryWeaponTab;
