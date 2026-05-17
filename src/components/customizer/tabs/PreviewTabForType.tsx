/**
 * PreviewTabForType — Preview tab dispatcher
 *
 * Resolves the Preview component for the active `UnitType` through the
 * customizer type descriptor registry. Mech types resolve the mech `PreviewTab`;
 * each non-mech type resolves its per-type preview component.
 *
 * The mech `PreviewTab` hard-calls `useUnitStore`; the registry wires it only
 * into the mech descriptor, so it is rendered only inside the mech
 * `UnitStoreProvider`. Each non-mech preview component reads only its own
 * per-type store.
 *
 * @spec openspec/changes/refactor-customizer-type-descriptors/specs/customizer-routing/spec.md
 *        Requirement: Unit-Type Customizer Resolution
 */

import React from 'react';

import { UnitType } from '@/types/unit/BattleMechInterfaces';

import { getCustomizerDescriptor } from '../shared/customizerTypeRegistry';

// =============================================================================
// Types
// =============================================================================

export interface PreviewTabForTypeProps {
  /** The unit type that controls which preview component is rendered. */
  unitType: UnitType;
  /** Read-only mode — forwarded to the resolved preview component. */
  _readOnly?: boolean;
  /** Optional extra CSS classes forwarded to the resolved component. */
  className?: string;
}

// =============================================================================
// Component
// =============================================================================

/**
 * Renders the Preview component the descriptor registry maps to `unitType`.
 */
export function PreviewTabForType({
  unitType,
  _readOnly = false,
  className = '',
}: PreviewTabForTypeProps): React.ReactElement {
  const { PreviewComponent } = getCustomizerDescriptor(unitType);
  return <PreviewComponent _readOnly={_readOnly} className={className} />;
}
