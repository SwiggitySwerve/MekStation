/**
 * InfantryFieldGunsTab — placeholder
 *
 * Will be wired by `add-infantry-construction` to expose:
 *   - 1 field gun per 7 men rule enforcement
 *   - Field gun type and count selection
 *
 * Visibility rule: hidden when motiveType is Jump or Mechanized (field guns
 * are not allowed for those motive types).  The visibleWhen predicate lives
 * in tabRegistry.ts.
 *
 * @spec openspec/changes/add-per-type-customizer-tabs/tasks.md §6.5, §6.7
 * @wiredBy add-infantry-construction
 */

import React from "react";

export interface InfantryFieldGunsTabProps {
  readOnly?: boolean;
  className?: string;
}

/**
 * Placeholder for the Field Guns tab.
 * Construction proposal `add-infantry-construction` will replace the body.
 */
export function InfantryFieldGunsTab({
  className = "",
}: InfantryFieldGunsTabProps): React.ReactElement {
  return (
    <div className={`p-4 ${className}`} data-testid="infantry-field-guns-tab">
      <p className="text-text-theme-secondary text-sm">
        Coming soon — this tab will be wired up by add-infantry-construction
      </p>
    </div>
  );
}

export default InfantryFieldGunsTab;
