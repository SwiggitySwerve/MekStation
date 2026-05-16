/**
 * OverviewTabForType — Overview tab dispatcher
 *
 * The shared mech `OverviewTab` hard-calls `useUnitStore` and crashes when
 * mounted in a non-mech customizer. This dispatcher switches on the active
 * `UnitType` and renders the correct per-type component, mirroring the proven
 * `ArmorDiagramForType` pattern:
 *   - BattleMech / OmniMech / IndustrialMech → existing `OverviewTab` (unchanged)
 *   - every non-mech type                   → `NonMechOverviewPlaceholder`
 *
 * Because hooks cannot be conditional, the mech `OverviewTab` (which calls
 * `useUnitStore`) is only ever rendered for mech types — i.e. only inside the
 * mech `UnitStoreProvider`.
 *
 * @spec openspec/changes/wire-non-mech-customizer-preview/specs/customizer-tabs/spec.md
 *        Requirement: Overview Tab Non-Mech Crash Guard
 */

import React from 'react';

import { UnitType } from '@/types/unit/BattleMechInterfaces';

import { NonMechOverviewPlaceholder } from './NonMechOverviewPlaceholder';
import { OverviewTab } from './OverviewTab';

// =============================================================================
// Types
// =============================================================================

export interface OverviewTabForTypeProps {
  /** The unit type that controls which Overview component is rendered. */
  unitType: UnitType;
  /** Read-only mode — forwarded to the mech `OverviewTab`. */
  readOnly?: boolean;
  /** Optional extra CSS classes forwarded to the rendered component. */
  className?: string;
}

// =============================================================================
// Component
// =============================================================================

/**
 * Renders the correct Overview component for the supplied unit type.
 *
 * Routing:
 *   VEHICLE / VTOL / SUPPORT_VEHICLE   → NonMechOverviewPlaceholder
 *   AEROSPACE / CONVENTIONAL_FIGHTER   → NonMechOverviewPlaceholder
 *   BATTLE_ARMOR                       → NonMechOverviewPlaceholder
 *   INFANTRY                           → NonMechOverviewPlaceholder
 *   PROTOMECH                          → NonMechOverviewPlaceholder
 *   BattleMech / OmniMech / Industrial → OverviewTab (existing mech editor)
 */
export function OverviewTabForType({
  unitType,
  readOnly = false,
  className = '',
}: OverviewTabForTypeProps): React.ReactElement {
  switch (unitType) {
    case UnitType.VEHICLE:
    case UnitType.VTOL:
    case UnitType.SUPPORT_VEHICLE:
    case UnitType.AEROSPACE:
    case UnitType.CONVENTIONAL_FIGHTER:
    case UnitType.BATTLE_ARMOR:
    case UnitType.INFANTRY:
    case UnitType.PROTOMECH:
      // Non-mech types have no per-type Overview editor yet — render the
      // store-free placeholder so the tab never crashes.
      return (
        <NonMechOverviewPlaceholder unitType={unitType} className={className} />
      );

    // BattleMech / OmniMech / IndustrialMech (and any future mech type) keep
    // the existing mech Overview editor with no behaviour change. OverviewTab
    // calls useUnitStore, so it is only ever rendered here — inside the mech
    // UnitStoreProvider.
    default:
      return <OverviewTab readOnly={readOnly} className={className} />;
  }
}
