/**
 * BattleArmorManipulatorsTab — placeholder
 *
 * Will be wired by `add-battlearmor-construction` to expose per-arm
 * manipulator selection:
 *   - Left arm: Battle Claw / Cargo Lifter / Basic Manipulator / None
 *   - Right arm: same options
 *
 * @spec openspec/changes/add-per-type-customizer-tabs/tasks.md §5.4
 * @wiredBy add-battlearmor-construction
 */

import React from "react";

export interface BattleArmorManipulatorsTabProps {
  readOnly?: boolean;
  className?: string;
}

/**
 * Placeholder for the Manipulators tab.
 * Construction proposal `add-battlearmor-construction` will replace the body.
 */
export function BattleArmorManipulatorsTab({
  className = "",
}: BattleArmorManipulatorsTabProps): React.ReactElement {
  return (
    <div className={`p-4 ${className}`} data-testid="ba-manipulators-tab">
      <p className="text-text-theme-secondary text-sm">
        Coming soon — this tab will be wired up by add-battlearmor-construction
      </p>
    </div>
  );
}

export default BattleArmorManipulatorsTab;
