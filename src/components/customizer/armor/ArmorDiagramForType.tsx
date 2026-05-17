/**
 * ArmorDiagramForType — armor diagram dispatcher
 *
 * Resolves the armor-diagram component for the active `UnitType` through the
 * customizer type descriptor registry. Each non-mech type resolves its per-type
 * diagram; mech types resolve a placeholder that directs the caller to use
 * `<ArmorDiagram>` directly (the mech diagram needs props this dispatcher
 * cannot supply).
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

export interface ArmorDiagramForTypeProps {
  /** The unit type that controls which diagram is rendered. */
  unitType: UnitType;
  /** Optional extra CSS classes forwarded to the rendered diagram. */
  className?: string;
}

// =============================================================================
// Component
// =============================================================================

/**
 * Renders the armor diagram the descriptor registry maps to `unitType`.
 *
 * Routing:
 *   VEHICLE / VTOL / SUPPORT_VEHICLE  → VehicleArmorDiagram
 *   AEROSPACE / CONVENTIONAL_FIGHTER  → AerospaceArmorDiagram
 *   BATTLE_ARMOR                      → BattleArmorPipGrid
 *   INFANTRY                          → InfantryPlatoonCounter
 *   PROTOMECH                         → ProtoMechArmorDiagram
 *   Mech types                        → placeholder (use <ArmorDiagram> directly)
 */
export function ArmorDiagramForType({
  unitType,
  className = '',
}: ArmorDiagramForTypeProps): React.ReactElement {
  const { ArmorDiagramComponent } = getCustomizerDescriptor(unitType);
  return <ArmorDiagramComponent className={className} />;
}
