/**
 * BattleArmorAPWeaponsTab — placeholder
 *
 * Will be wired by `add-battlearmor-construction` to expose:
 *   - One anti-personnel (AP) weapon slot per suit
 *   - Weight / crits accounting
 *
 * @spec openspec/changes/add-per-type-customizer-tabs/tasks.md §5.6
 * @wiredBy add-battlearmor-construction
 */

import React from "react";

export interface BattleArmorAPWeaponsTabProps {
  readOnly?: boolean;
  className?: string;
}

/**
 * Placeholder for the AP Weapons tab.
 * Construction proposal `add-battlearmor-construction` will replace the body.
 */
export function BattleArmorAPWeaponsTab({
  className = "",
}: BattleArmorAPWeaponsTabProps): React.ReactElement {
  return (
    <div className={`p-4 ${className}`} data-testid="ba-ap-weapons-tab">
      <p className="text-text-theme-secondary text-sm">
        Coming soon — this tab will be wired up by add-battlearmor-construction
      </p>
    </div>
  );
}

export default BattleArmorAPWeaponsTab;
