/**
 * ProtoMechEquipmentTab — placeholder
 *
 * Will be wired by `add-protomech-construction` to expose:
 *   - Weapon and equipment mounts in arms and torso locations
 *   - ProtoMech-specific equipment catalog filtering
 *
 * @spec openspec/changes/add-per-type-customizer-tabs/tasks.md §7.5
 * @wiredBy add-protomech-construction
 */

import React from "react";

export interface ProtoMechEquipmentTabProps {
  readOnly?: boolean;
  className?: string;
}

/**
 * Placeholder for the ProtoMech Equipment tab.
 * Construction proposal `add-protomech-construction` will replace the body.
 */
export function ProtoMechEquipmentTab({
  className = "",
}: ProtoMechEquipmentTabProps): React.ReactElement {
  return (
    <div className={`p-4 ${className}`} data-testid="protomech-equipment-tab">
      <p className="text-text-theme-secondary text-sm">
        Coming soon — this tab will be wired up by add-protomech-construction
      </p>
    </div>
  );
}

export default ProtoMechEquipmentTab;
