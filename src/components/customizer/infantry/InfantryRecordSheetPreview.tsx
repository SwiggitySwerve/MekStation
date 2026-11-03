/**
 * InfantryRecordSheetPreview — on-canvas infantry record sheet preview
 *
 * Infantry equivalent of the mech `RecordSheetPreview`: reads ONLY the
 * infantry store, builds an `IInfantryRecordSheetUnitInput` object, and
 * renders it through `RecordSheetService.extractData` → `renderPreview`.
 *
 * @spec openspec/specs/record-sheet-export/spec.md
 *        Requirement: Record Sheet Preview Component Is Unit-Type Aware
 */

import React, { useMemo } from 'react';

import { useInfantryStore } from '@/stores/useInfantryStore';
import { PaperSize, PAPER_DIMENSIONS } from '@/types/printing';

import {
  RecordSheetCanvasPreview,
  useRecordSheetCanvasRenderer,
} from '../preview/RecordSheetCanvasPreview';
import { buildInfantryUnitObject } from './buildInfantryUnitObject';

interface InfantryRecordSheetPreviewProps {
  /** Paper size for rendering. */
  paperSize?: PaperSize;
  /** Legacy scale input; shared zoom controls own the displayed scale. */
  scale?: number;
  /** CSS class name. */
  className?: string;
}

/**
 * Renders a live infantry record sheet onto a canvas. Mounted only inside an
 * `InfantryStoreContext`.
 */
export function InfantryRecordSheetPreview({
  paperSize = PaperSize.LETTER,
  scale = 0.75,
  className = '',
}: InfantryRecordSheetPreviewProps): React.ReactElement {
  const source = useInfantryStore((s) => s);
  const id = useInfantryStore((s) => s.id);
  const name = useInfantryStore((s) => s.name);
  const chassis = useInfantryStore((s) => s.chassis);
  const model = useInfantryStore((s) => s.model);
  const techBase = useInfantryStore((s) => s.techBase);
  const rulesLevel = useInfantryStore((s) => s.rulesLevel);
  const year = useInfantryStore((s) => s.year);
  const platoonComposition = useInfantryStore((s) => s.platoonComposition);
  const infantryMotive = useInfantryStore((s) => s.infantryMotive);
  const armorKit = useInfantryStore((s) => s.armorKit);
  const primaryWeapon = useInfantryStore((s) => s.primaryWeapon);
  const primaryWeaponId = useInfantryStore((s) => s.primaryWeaponId);
  const secondaryWeapon = useInfantryStore((s) => s.secondaryWeapon);
  const secondaryWeaponId = useInfantryStore((s) => s.secondaryWeaponId);
  const secondaryWeaponCount = useInfantryStore((s) => s.secondaryWeaponCount);
  const fieldGuns = useInfantryStore((s) => s.fieldGuns);
  const specialization = useInfantryStore((s) => s.specialization);
  const hasAntiMechTraining = useInfantryStore((s) => s.hasAntiMechTraining);

  const unitObject = useMemo(
    () =>
      buildInfantryUnitObject({
        source,
        id,
        name,
        chassis,
        model,
        techBase,
        rulesLevel,
        year,
        platoonComposition,
        infantryMotive,
        armorKit,
        primaryWeapon,
        primaryWeaponId,
        secondaryWeapon,
        secondaryWeaponId,
        secondaryWeaponCount,
        fieldGuns,
        specialization,
        hasAntiMechTraining,
      }),
    [
      source,
      id,
      name,
      chassis,
      model,
      techBase,
      rulesLevel,
      year,
      platoonComposition,
      infantryMotive,
      armorKit,
      primaryWeapon,
      primaryWeaponId,
      secondaryWeapon,
      secondaryWeaponId,
      secondaryWeaponCount,
      fieldGuns,
      specialization,
      hasAntiMechTraining,
    ],
  );

  const canvasRef = useRecordSheetCanvasRenderer({
    unitObject,
    paperSize,
    errorMessage: 'Error rendering infantry record sheet preview:',
  });
  const { width, height } = PAPER_DIMENSIONS[paperSize];

  return (
    <RecordSheetCanvasPreview
      canvasRef={canvasRef}
      testId="infantry-record-sheet-canvas"
      width={width}
      height={height}
      scale={scale}
      className={className}
    />
  );
}
