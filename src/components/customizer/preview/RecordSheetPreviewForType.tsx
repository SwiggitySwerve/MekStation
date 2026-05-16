/**
 * RecordSheetPreviewForType — record-sheet preview canvas dispatcher
 *
 * The mech `RecordSheetPreview` hard-calls `useUnitStore` and crashes inside a
 * non-mech customizer. This dispatcher switches on the active `UnitType` and
 * renders the correct per-type canvas component, mirroring the proven
 * `ArmorDiagramForType` pattern:
 *   - BattleMech / OmniMech / IndustrialMech → existing `RecordSheetPreview`
 *   - each non-mech type                     → its per-type canvas component
 *
 * Each per-type canvas calls exactly one per-type store hook and is only ever
 * rendered for its matching type — satisfying the Rules of Hooks.
 *
 * @spec openspec/changes/wire-non-mech-customizer-preview/specs/record-sheet-export/spec.md
 *        Requirement: Record Sheet Preview Component Is Unit-Type Aware
 */

import React from 'react';

import { PaperSize } from '@/types/printing';
import { UnitType } from '@/types/unit/BattleMechInterfaces';

import { AerospaceRecordSheetPreview } from '../aerospace/AerospaceRecordSheetPreview';
import { BattleArmorRecordSheetPreview } from '../battlearmor/BattleArmorRecordSheetPreview';
import { InfantryRecordSheetPreview } from '../infantry/InfantryRecordSheetPreview';
import { ProtoMechRecordSheetPreview } from '../protomech/ProtoMechRecordSheetPreview';
import { VehicleRecordSheetPreview } from '../vehicle/VehicleRecordSheetPreview';
import { RecordSheetPreview } from './RecordSheetPreview';

// =============================================================================
// Types
// =============================================================================

export interface RecordSheetPreviewForTypeProps {
  /** The unit type that controls which preview canvas is rendered. */
  unitType: UnitType;
  /** Paper size for rendering. */
  paperSize?: PaperSize;
  /** Display scale factor. */
  scale?: number;
  /** Optional extra CSS classes forwarded to the rendered canvas. */
  className?: string;
}

// =============================================================================
// Component
// =============================================================================

/**
 * Renders the correct record-sheet preview canvas for the supplied unit type.
 *
 * Routing:
 *   VEHICLE / VTOL / SUPPORT_VEHICLE  → VehicleRecordSheetPreview
 *   AEROSPACE / CONVENTIONAL_FIGHTER  → AerospaceRecordSheetPreview
 *   BATTLE_ARMOR                      → BattleArmorRecordSheetPreview
 *   INFANTRY                          → InfantryRecordSheetPreview
 *   PROTOMECH                         → ProtoMechRecordSheetPreview
 *   BattleMech / OmniMech / Industrial → RecordSheetPreview (existing mech)
 */
export function RecordSheetPreviewForType({
  unitType,
  paperSize,
  scale,
  className = '',
}: RecordSheetPreviewForTypeProps): React.ReactElement {
  switch (unitType) {
    case UnitType.VEHICLE:
    case UnitType.VTOL:
    case UnitType.SUPPORT_VEHICLE:
      return (
        <VehicleRecordSheetPreview
          paperSize={paperSize}
          scale={scale}
          className={className}
        />
      );

    case UnitType.AEROSPACE:
    case UnitType.CONVENTIONAL_FIGHTER:
      return (
        <AerospaceRecordSheetPreview
          paperSize={paperSize}
          scale={scale}
          className={className}
        />
      );

    case UnitType.BATTLE_ARMOR:
      return (
        <BattleArmorRecordSheetPreview
          paperSize={paperSize}
          scale={scale}
          className={className}
        />
      );

    case UnitType.INFANTRY:
      return (
        <InfantryRecordSheetPreview
          paperSize={paperSize}
          scale={scale}
          className={className}
        />
      );

    case UnitType.PROTOMECH:
      return (
        <ProtoMechRecordSheetPreview
          paperSize={paperSize}
          scale={scale}
          className={className}
        />
      );

    // BattleMech / OmniMech / IndustrialMech (and any future mech type) keep
    // the existing mech preview canvas with no behaviour change. The mech
    // RecordSheetPreview calls useUnitStore, so it is only rendered here.
    default:
      return (
        <RecordSheetPreview
          paperSize={paperSize}
          scale={scale}
          className={className}
        />
      );
  }
}
