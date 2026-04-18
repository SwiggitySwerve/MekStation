/**
 * ArmorDiagramForType — Diagram Selector
 *
 * Picks the correct per-type armor diagram component based on unit.type.
 * Drop this into any per-type Armor tab in place of a hand-rolled switch.
 *
 * @spec openspec/changes/add-per-type-armor-diagrams/specs/armor-diagram/spec.md
 *        Requirement: Per-Type Diagram Selection
 */

import React from 'react';

import { UnitType } from '@/types/unit/BattleMechInterfaces';

import { AerospaceArmorDiagram } from '../aerospace/AerospaceArmorDiagram';
import { BattleArmorPipGrid } from '../battlearmor/BattleArmorPipGrid';
import { InfantryPlatoonCounter } from '../infantry/InfantryPlatoonCounter';
import { ProtoMechArmorDiagram } from '../protomech/ProtoMechArmorDiagram';
import { VehicleArmorDiagram } from '../vehicle/VehicleArmorDiagram';

// =============================================================================
// Types
// =============================================================================

export interface ArmorDiagramForTypeProps {
  /**
   * The unit type that controls which diagram is rendered.
   * Accepts any UnitType enum value.
   */
  unitType: UnitType;
  /** Optional extra CSS classes forwarded to the rendered diagram */
  className?: string;
}

// =============================================================================
// Component
// =============================================================================

/**
 * Renders the correct armor diagram for the supplied unit type.
 *
 * Routing:
 *   VEHICLE / VTOL / SUPPORT_VEHICLE  → VehicleArmorDiagram
 *   AEROSPACE / CONVENTIONAL_FIGHTER  → AerospaceArmorDiagram
 *   BATTLE_ARMOR                      → BattleArmorPipGrid
 *   INFANTRY                          → InfantryPlatoonCounter
 *   PROTOMECH                         → ProtoMechArmorDiagram
 *   Everything else (mechs, etc.)     → ArmorDiagram (existing mech diagram)
 */
export function ArmorDiagramForType({
  unitType,
  className = '',
}: ArmorDiagramForTypeProps): React.ReactElement {
  switch (unitType) {
    case UnitType.VEHICLE:
    case UnitType.VTOL:
    case UnitType.SUPPORT_VEHICLE:
      return <VehicleArmorDiagram className={className} />;

    case UnitType.AEROSPACE:
    case UnitType.CONVENTIONAL_FIGHTER:
      return <AerospaceArmorDiagram className={className} />;

    case UnitType.BATTLE_ARMOR:
      return <BattleArmorPipGrid className={className} />;

    case UnitType.INFANTRY:
      return <InfantryPlatoonCounter className={className} />;

    case UnitType.PROTOMECH:
      return <ProtoMechArmorDiagram className={className} />;

    // BattleMech / OmniMech / IndustrialMech and capital ships fall through to
    // the existing mech armor diagram — those types are handled by the pre-existing
    // Armor tab and do not need this selector.
    default:
      // The mech ArmorDiagram requires its own props (armorData, callbacks, etc.)
      // which are not available here. Return a placeholder directing the caller to
      // use ArmorDiagram directly for mech types.
      return (
        <div
          className={`text-text-theme-secondary p-4 text-center text-sm ${className}`}
        >
          Use <code className="font-mono text-xs">&lt;ArmorDiagram&gt;</code>{' '}
          for mech-type units.
        </div>
      );
  }
}
