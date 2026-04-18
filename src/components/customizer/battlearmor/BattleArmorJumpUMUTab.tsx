/**
 * BattleArmorJumpUMUTab — placeholder
 *
 * Will be wired by `add-battlearmor-construction` to expose:
 *   - Mobility mode selection: Jump Jets / UMU (underwater) / VTOL
 *   - MP allocation and weight accounting
 *
 * @spec openspec/changes/add-per-type-customizer-tabs/tasks.md §5.7
 * @wiredBy add-battlearmor-construction
 */

import React from "react";

export interface BattleArmorJumpUMUTabProps {
  readOnly?: boolean;
  className?: string;
}

/**
 * Placeholder for the Jump/UMU mobility tab.
 * Construction proposal `add-battlearmor-construction` will replace the body.
 */
export function BattleArmorJumpUMUTab({
  className = "",
}: BattleArmorJumpUMUTabProps): React.ReactElement {
  return (
    <div className={`p-4 ${className}`} data-testid="ba-jump-umu-tab">
      <p className="text-text-theme-secondary text-sm">
        Coming soon — this tab will be wired up by add-battlearmor-construction
      </p>
    </div>
  );
}

export default BattleArmorJumpUMUTab;
