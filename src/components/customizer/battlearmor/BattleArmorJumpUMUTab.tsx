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

import React from 'react';

import { PlaceholderTab } from '../tabs/PlaceholderTab';

export interface BattleArmorJumpUMUTabProps {
  readOnly?: boolean;
  className?: string;
}

/**
 * Placeholder for the Jump/UMU mobility tab.
 * Construction proposal `add-battlearmor-construction` will replace the body.
 */
export function BattleArmorJumpUMUTab({
  className = '',
}: BattleArmorJumpUMUTabProps): React.ReactElement {
  return (
    <PlaceholderTab
      className={className}
      testId="ba-jump-umu-tab"
      wiredBy="add-battlearmor-construction"
    />
  );
}

export default BattleArmorJumpUMUTab;
