/**
 * ProtoMechRecordSheetPreview — on-canvas protomech record sheet preview
 *
 * ProtoMech equivalent of the mech `RecordSheetPreview`: reads ONLY the
 * protomech store, builds an `IProtoMechRecordSheetUnitInput` object, and
 * renders it through `RecordSheetService.extractData` → `renderPreview`.
 *
 * @spec openspec/changes/wire-non-mech-customizer-preview/specs/record-sheet-export/spec.md
 *        Requirement: Record Sheet Preview Component Is Unit-Type Aware
 */

import React, { useMemo } from 'react';

import { useProtoMechStore } from '@/stores/useProtoMechStore';
import { PAPER_DIMENSIONS, PaperSize } from '@/types/printing';

import {
  RecordSheetCanvasPreview,
  useRecordSheetCanvasRenderer,
} from '../preview/RecordSheetCanvasPreview';
import { buildProtoMechUnitObject } from './buildProtoMechUnitObject';

interface ProtoMechRecordSheetPreviewProps {
  /** Paper size for rendering. */
  paperSize?: PaperSize;
  /** Display scale factor. */
  scale?: number;
  /** CSS class name. */
  className?: string;
}

/**
 * Renders a live protomech record sheet onto a canvas. Mounted only inside a
 * `ProtoMechStoreContext`.
 */
export function ProtoMechRecordSheetPreview({
  paperSize = PaperSize.LETTER,
  scale = 0.75,
  className = '',
}: ProtoMechRecordSheetPreviewProps): React.ReactElement {
  const id = useProtoMechStore((s) => s.id);
  const name = useProtoMechStore((s) => s.name);
  const chassis = useProtoMechStore((s) => s.chassis);
  const model = useProtoMechStore((s) => s.model);
  const tonnage = useProtoMechStore((s) => s.tonnage);
  const techBase = useProtoMechStore((s) => s.techBase);
  const rulesLevel = useProtoMechStore((s) => s.rulesLevel);
  const year = useProtoMechStore((s) => s.year);
  const pointSize = useProtoMechStore((s) => s.pointSize);
  const armorByLocation = useProtoMechStore((s) => s.armorByLocation);
  const mainGunWeaponId = useProtoMechStore((s) => s.mainGunWeaponId);
  const walkMP = useProtoMechStore((s) => s.walkMP);
  const jumpMP = useProtoMechStore((s) => s.jumpMP);
  const glidingWings = useProtoMechStore((s) => s.glidingWings);

  const unitObject = useMemo(
    () =>
      buildProtoMechUnitObject({
        id,
        name,
        chassis,
        model,
        tonnage,
        techBase,
        rulesLevel,
        year,
        pointSize,
        armorByLocation,
        mainGunWeaponId,
        walkMP,
        jumpMP,
        glidingWings,
      }),
    [
      id,
      name,
      chassis,
      model,
      tonnage,
      techBase,
      rulesLevel,
      year,
      pointSize,
      armorByLocation,
      mainGunWeaponId,
      walkMP,
      jumpMP,
      glidingWings,
    ],
  );

  const canvasRef = useRecordSheetCanvasRenderer({
    unitObject,
    paperSize,
    errorMessage: 'Error rendering protomech record sheet preview:',
  });
  const { width, height } = PAPER_DIMENSIONS[paperSize];

  return (
    <RecordSheetCanvasPreview
      canvasRef={canvasRef}
      testId="protomech-record-sheet-canvas"
      width={width}
      height={height}
      scale={scale}
      className={className}
    />
  );
}
