/**
 * OverviewTabForType — Overview tab dispatcher
 *
 * Resolves the Overview component for the active `UnitType` through the
 * customizer type descriptor registry — the single source of truth shared with
 * the router and the other `*ForType` dispatchers. Mech types resolve the mech
 * `OverviewTab`; every non-mech type resolves its per-type Overview editor from
 * `NonMechOverviewTabs`.
 *
 * Each resolved component reads its own per-type store, so it is rendered only
 * inside that type's store provider — the registry wires the mech `OverviewTab`
 * (which hard-calls `useUnitStore`) into the mech descriptor only.
 *
 * @spec openspec/specs/customizer-tabs/spec.md
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
