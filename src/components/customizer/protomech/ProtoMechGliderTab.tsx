/**
 * ProtoMechGliderTab — placeholder
 *
 * Will be wired by `add-protomech-construction` to expose:
 *   - Glider mode toggle (enables ProtoMech glider movement rules)
 *
 * Visibility rule: hidden for Ultraheavy ProtoMechs (tonnage >= 10).
 * The visibleWhen predicate lives in tabRegistry.ts.
 *
 * @spec openspec/changes/add-per-type-customizer-tabs/tasks.md §7.6
 * @wiredBy add-protomech-construction
 */

import React from 'react';

export interface ProtoMechGliderTabProps {
  readOnly?: boolean;
  className?: string;
}

/**
 * Placeholder for the Glider mode tab.
 * Construction proposal `add-protomech-construction` will replace the body.
 */
export function ProtoMechGliderTab({
  className = '',
}: ProtoMechGliderTabProps): React.ReactElement {
  return (
    <div className={`p-4 ${className}`} data-testid="protomech-glider-tab">
      <p className="text-text-theme-secondary text-sm">
        Coming soon — this tab will be wired up by add-protomech-construction
      </p>
    </div>
  );
}

export default ProtoMechGliderTab;
