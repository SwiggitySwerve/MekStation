/**
 * ProtoMechMainGunTab — placeholder
 *
 * Will be wired by `add-protomech-construction` to expose:
 *   - Main gun weapon selector — the unique ProtoMech-only main gun concept
 *   - Available main guns filtered by ProtoMech tonnage
 *
 * @spec openspec/changes/add-per-type-customizer-tabs/tasks.md §7.4
 * @wiredBy add-protomech-construction
 */

import React from 'react';

import { PlaceholderTab } from '../tabs/PlaceholderTab';

export interface ProtoMechMainGunTabProps {
  readOnly?: boolean;
  className?: string;
}

/**
 * Placeholder for the Main Gun tab.
 * Construction proposal `add-protomech-construction` will replace the body.
 */
export function ProtoMechMainGunTab({
  className = '',
}: ProtoMechMainGunTabProps): React.ReactElement {
  return (
    <PlaceholderTab
      className={className}
      testId="protomech-main-gun-tab"
      wiredBy="add-protomech-construction"
    />
  );
}

export default ProtoMechMainGunTab;
