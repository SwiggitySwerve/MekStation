/**
 * ProtoMechArmorTab — placeholder
 *
 * Will be wired by `add-protomech-construction` to expose:
 *   - 5-location armor allocation (Head / Torso / L-Arm / R-Arm / Legs)
 *   - Per-location max based on ProtoMech tonnage
 *
 * @spec openspec/changes/add-per-type-customizer-tabs/tasks.md §7.3
 * @wiredBy add-protomech-construction
 */

import React from "react";

export interface ProtoMechArmorTabProps {
  readOnly?: boolean;
  className?: string;
}

/**
 * Placeholder for the ProtoMech Armor tab.
 * Construction proposal `add-protomech-construction` will replace the body.
 */
export function ProtoMechArmorTab({
  className = "",
}: ProtoMechArmorTabProps): React.ReactElement {
  return (
    <div className={`p-4 ${className}`} data-testid="protomech-armor-tab">
      <p className="text-text-theme-secondary text-sm">
        Coming soon — this tab will be wired up by add-protomech-construction
      </p>
    </div>
  );
}

export default ProtoMechArmorTab;
