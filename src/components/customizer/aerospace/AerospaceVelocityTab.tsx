/**
 * AerospaceVelocityTab — placeholder
 *
 * Will be wired by the `add-aerospace-construction` change to expose:
 *   - Safe Thrust (safeThrust)
 *   - Maximum Thrust (maxThrust, derived as floor(safeThrust × 1.5))
 *   - Structural Integrity (SI)
 *   - Fuel Points (fuelPoints)
 *
 * @spec openspec/changes/add-per-type-customizer-tabs/tasks.md §4.2
 * @wiredBy add-aerospace-construction
 */

import React from 'react';

export interface AerospaceVelocityTabProps {
  readOnly?: boolean;
  className?: string;
}

/**
 * Placeholder for the Velocity/Thrust tab.
 * Construction proposal `add-aerospace-construction` will replace the body.
 */
export function AerospaceVelocityTab({
  className = '',
}: AerospaceVelocityTabProps): React.ReactElement {
  return (
    <div className={`p-4 ${className}`} data-testid="aerospace-velocity-tab">
      <p className="text-text-theme-secondary text-sm">
        Coming soon — this tab will be wired up by add-aerospace-construction
      </p>
    </div>
  );
}

export default AerospaceVelocityTab;
