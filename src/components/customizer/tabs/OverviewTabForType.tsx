/**
 * OverviewTabForType — Overview tab dispatcher
 *
 * Resolves the Overview component for the active `UnitType` through the
 * customizer type descriptor registry — the single source of truth shared with
 * the router and the other `*ForType` dispatchers. Mech types resolve the mech
 * `OverviewTab`; every non-mech type resolves `NonMechOverviewPlaceholder`.
 *
 * Because the mech `OverviewTab` hard-calls `useUnitStore`, the registry only
 * ever wires it into the mech descriptor — so it is rendered only inside the
 * mech `UnitStoreProvider`.
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

export interface OverviewTabForTypeProps {
  /** The unit type that controls which Overview component is rendered. */
  unitType: UnitType;
  /** Read-only mode — forwarded to the resolved Overview component. */
  readOnly?: boolean;
  /** Optional extra CSS classes forwarded to the resolved component. */
  className?: string;
}

// =============================================================================
// Component
// =============================================================================

/**
 * Renders the Overview component the descriptor registry maps to `unitType`.
 */
export function OverviewTabForType({
  unitType,
  readOnly = false,
  className = '',
}: OverviewTabForTypeProps): React.ReactElement {
  const { OverviewComponent } = getCustomizerDescriptor(unitType);
  return (
    <OverviewComponent
      unitType={unitType}
      readOnly={readOnly}
      className={className}
    />
  );
}
