/**
 * InfantrySpecializationTab — placeholder
 *
 * Will be wired by `add-infantry-construction` to expose specialization
 * selection: Anti-Mech / Marine / SCUBA / Mountain / XCT / Paratroop / Tunnel
 *
 * @spec openspec/changes/add-per-type-customizer-tabs/tasks.md §6.6
 * @wiredBy add-infantry-construction
 */

import React from "react";

export interface InfantrySpecializationTabProps {
  readOnly?: boolean;
  className?: string;
}

/**
 * Placeholder for the Specialization tab.
 * Construction proposal `add-infantry-construction` will replace the body.
 */
export function InfantrySpecializationTab({
  className = "",
}: InfantrySpecializationTabProps): React.ReactElement {
  return (
    <div
      className={`p-4 ${className}`}
      data-testid="infantry-specialization-tab"
    >
      <p className="text-text-theme-secondary text-sm">
        Coming soon — this tab will be wired up by add-infantry-construction
      </p>
    </div>
  );
}

export default InfantrySpecializationTab;
