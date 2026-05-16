/**
 * NonMechOverviewPlaceholder — graceful Overview fallback for non-mech units
 *
 * The shared mech `OverviewTab` hard-calls `useUnitStore` and crashes when
 * mounted in a non-mech customizer. Until a per-type Overview editor is
 * delivered, non-mech customizers render this store-free placeholder so the
 * Overview tab never throws a missing-provider error.
 *
 * This component intentionally calls NO store hook, so it is safe to mount
 * with zero providers present.
 *
 * @spec openspec/changes/wire-non-mech-customizer-preview/specs/customizer-tabs/spec.md
 *        Requirement: Overview Tab Non-Mech Crash Guard
 */

import React from 'react';

import { UnitType } from '@/types/unit/BattleMechInterfaces';

// =============================================================================
// Types
// =============================================================================

export interface NonMechOverviewPlaceholderProps {
  /** The unit type being edited — used only for the displayed label. */
  unitType: UnitType;
  /** Optional extra CSS classes forwarded to the panel. */
  className?: string;
}

// =============================================================================
// Helpers
// =============================================================================

/**
 * Map a UnitType to a human-readable label for the placeholder copy.
 * Falls back to the raw enum value so a new type never renders blank text.
 */
function unitTypeLabel(unitType: UnitType): string {
  switch (unitType) {
    case UnitType.VEHICLE:
      return 'Vehicle';
    case UnitType.VTOL:
      return 'VTOL';
    case UnitType.SUPPORT_VEHICLE:
      return 'Support Vehicle';
    case UnitType.AEROSPACE:
      return 'Aerospace Fighter';
    case UnitType.CONVENTIONAL_FIGHTER:
      return 'Conventional Fighter';
    case UnitType.BATTLE_ARMOR:
      return 'Battle Armor';
    case UnitType.INFANTRY:
      return 'Infantry';
    case UnitType.PROTOMECH:
      return 'ProtoMech';
    default:
      return String(unitType);
  }
}

// =============================================================================
// Component
// =============================================================================

/**
 * Renders a non-crashing "Overview not yet available" panel for a non-mech
 * unit type. Purely presentational — no store access — so it can mount inside
 * any per-type customizer (or with no provider at all) without throwing.
 */
export function NonMechOverviewPlaceholder({
  unitType,
  className = '',
}: NonMechOverviewPlaceholderProps): React.ReactElement {
  const label = unitTypeLabel(unitType);

  return (
    <div
      className={`flex h-full flex-col items-center justify-center p-8 text-center ${className}`}
      data-testid="non-mech-overview-placeholder"
    >
      <h3 className="text-content-primary mb-2 text-base font-semibold">
        Overview editor not yet available
      </h3>
      <p className="text-text-theme-secondary max-w-md text-sm">
        A dedicated Overview editor for {label} units has not been built yet.
        Use the other tabs to configure this unit, and the Preview tab to view
        and export its record sheet.
      </p>
    </div>
  );
}
