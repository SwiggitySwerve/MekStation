/**
 * RecordSheetPreviewForType — record-sheet preview canvas dispatcher
 *
 * Resolves the record-sheet preview canvas for the active `UnitType` through
 * the customizer type descriptor registry. Mech types resolve the mech
 * `RecordSheetPreview`; each non-mech type resolves its per-type canvas.
 *
 * The mech `RecordSheetPreview` hard-calls `useUnitStore`; the registry wires
 * it only into the mech descriptor, so it is rendered only inside the mech
 * `UnitStoreProvider`.
 *
 * @spec openspec/changes/refactor-customizer-type-descriptors/specs/customizer-routing/spec.md
 *        Requirement: Unit-Type Customizer Resolution
 */

import React from 'react';

import { PaperSize } from '@/types/printing';
import { UnitType } from '@/types/unit/BattleMechInterfaces';

import { getCustomizerDescriptor } from '../shared/customizerTypeRegistry';

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
 * Renders the record-sheet preview canvas the registry maps to `unitType`.
 */
export function RecordSheetPreviewForType({
  unitType,
  paperSize,
  scale,
  className = '',
}: RecordSheetPreviewForTypeProps): React.ReactElement {
  const { RecordSheetPreviewComponent } = getCustomizerDescriptor(unitType);
  return (
    <RecordSheetPreviewComponent
      paperSize={paperSize}
      scale={scale}
      className={className}
    />
  );
}
