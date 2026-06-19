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

import React from 'react';

import { PlaceholderTab } from '../tabs/PlaceholderTab';

export interface BattleArmorManipulatorsTabProps {
  readOnly?: boolean;
  className?: string;
}

/**
 * Placeholder for the Manipulators tab.
 * Construction proposal `add-battlearmor-construction` will replace the body.
 */
export function BattleArmorManipulatorsTab({
  className = '',
}: BattleArmorManipulatorsTabProps): React.ReactElement {
  return (
    <PlaceholderTab
      className={className}
      testId="ba-manipulators-tab"
      wiredBy="add-battlearmor-construction"
    />
  );
}

export default BattleArmorManipulatorsTab;
