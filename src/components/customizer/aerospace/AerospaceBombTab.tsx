/**
 * AerospaceBombTab — placeholder
 *
 * Will be wired by `add-aerospace-construction` to handle bomb-bay slot
 * allocation for aerospace fighters that can carry external ordnance.
 *
 * Visibility rule: hidden when unit is a conventional fighter that cannot
 * carry bombs (chassisType === 'conventional-fighter' in the store).
 * The visibleWhen predicate lives in tabRegistry.ts.
 *
 * @spec openspec/changes/add-per-type-customizer-tabs/tasks.md §4.3–4.4
 * @wiredBy add-aerospace-construction
 */

import React from "react";

export interface AerospaceBombTabProps {
  readOnly?: boolean;
  className?: string;
}

/**
 * Placeholder for the Bomb Bay tab.
 * Construction proposal `add-aerospace-construction` will replace the body.
 */
export function AerospaceBombTab({
  className = "",
}: AerospaceBombTabProps): React.ReactElement {
  return (
    <div className={`p-4 ${className}`} data-testid="aerospace-bomb-tab">
      <p className="text-text-theme-secondary text-sm">
        Coming soon — this tab will be wired up by add-aerospace-construction
      </p>
    </div>
  );
}

export default AerospaceBombTab;
