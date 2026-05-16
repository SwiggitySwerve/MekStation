/**
 * PreviewTabForType — Preview tab dispatcher
 *
 * The shared mech `PreviewTab` hard-calls `useUnitStore` and crashes when
 * mounted in a non-mech customizer. This dispatcher switches on the active
 * `UnitType` and renders the correct per-type preview component, mirroring the
 * proven `ArmorDiagramForType` pattern:
 *   - BattleMech / OmniMech / IndustrialMech → existing `PreviewTab` (verbatim)
 *   - each non-mech type                     → its per-type preview component
 *
 * The mech `PreviewTab` (which calls `useUnitStore`) is only ever rendered for
 * mech types — i.e. only inside the mech `UnitStoreProvider`. Each non-mech
 * preview component reads only its own per-type store.
 *
 * @spec openspec/changes/wire-non-mech-customizer-preview/specs/customizer-tabs/spec.md
 *        Requirement: Preview Tab
 */

import React from 'react';

import { UnitType } from '@/types/unit/BattleMechInterfaces';

import { AerospacePreviewTab } from '../aerospace/AerospacePreviewTab';
import { BattleArmorPreviewTab } from '../battlearmor/BattleArmorPreviewTab';
import { InfantryPreviewTab } from '../infantry/InfantryPreviewTab';
import { ProtoMechPreviewTab } from '../protomech/ProtoMechPreviewTab';
import { VehiclePreviewTab } from '../vehicle/VehiclePreviewTab';
import { PreviewTab } from './PreviewTab';

// =============================================================================
// Types
// =============================================================================

export interface PreviewTabForTypeProps {
  /** The unit type that controls which preview component is rendered. */
  unitType: UnitType;
  /** Read-only mode — forwarded to the rendered preview component. */
  _readOnly?: boolean;
  /** Optional extra CSS classes forwarded to the rendered component. */
  className?: string;
}

// =============================================================================
// Component
// =============================================================================

/**
 * Renders the correct Preview component for the supplied unit type.
 *
 * Routing:
 *   VEHICLE / VTOL / SUPPORT_VEHICLE   → VehiclePreviewTab
 *   AEROSPACE / CONVENTIONAL_FIGHTER   → AerospacePreviewTab
 *   BATTLE_ARMOR                       → BattleArmorPreviewTab
 *   INFANTRY                           → InfantryPreviewTab
 *   PROTOMECH                          → ProtoMechPreviewTab
 *   BattleMech / OmniMech / Industrial → PreviewTab (existing mech preview)
 */
export function PreviewTabForType({
  unitType,
  _readOnly = false,
  className = '',
}: PreviewTabForTypeProps): React.ReactElement {
  switch (unitType) {
    case UnitType.VEHICLE:
    case UnitType.VTOL:
    case UnitType.SUPPORT_VEHICLE:
      return <VehiclePreviewTab _readOnly={_readOnly} className={className} />;

    case UnitType.AEROSPACE:
    case UnitType.CONVENTIONAL_FIGHTER:
      return (
        <AerospacePreviewTab _readOnly={_readOnly} className={className} />
      );

    case UnitType.BATTLE_ARMOR:
      return (
        <BattleArmorPreviewTab _readOnly={_readOnly} className={className} />
      );

    case UnitType.INFANTRY:
      return <InfantryPreviewTab _readOnly={_readOnly} className={className} />;

    case UnitType.PROTOMECH:
      return (
        <ProtoMechPreviewTab _readOnly={_readOnly} className={className} />
      );

    // BattleMech / OmniMech / IndustrialMech (and any future mech type) keep
    // the existing mech Preview tab with no behaviour change. PreviewTab calls
    // useUnitStore, so it is only ever rendered here — inside the mech
    // UnitStoreProvider.
    default:
      return <PreviewTab _readOnly={_readOnly} className={className} />;
  }
}
