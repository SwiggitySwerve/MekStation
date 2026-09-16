/**
 * ProtoMechArmorTab — placeholder
 *
 * Will be wired by `add-protomech-construction` to expose:
 *   - 5-location armor allocation (Head / Torso / L-Arm / R-Arm / Legs)
 *   - Per-location max based on ProtoMech tonnage
 *
 * @spec openspec/specs/multi-unit-tabs/spec.md
 * @wiredBy add-protomech-construction
 */

import React from 'react';

import { PlaceholderTab } from '../tabs/PlaceholderTab';

export interface ProtoMechArmorTabProps {
  readOnly?: boolean;
  className?: string;
}

/**
 * Placeholder for the ProtoMech Armor tab.
 * Construction proposal `add-protomech-construction` will replace the body.
 */
export function ProtoMechArmorTab({
  className = '',
}: ProtoMechArmorTabProps): React.ReactElement {
  return (
    <PlaceholderTab
      className={className}
      testId="protomech-armor-tab"
      wiredBy="add-protomech-construction"
    />
  );
}

export default ProtoMechArmorTab;
