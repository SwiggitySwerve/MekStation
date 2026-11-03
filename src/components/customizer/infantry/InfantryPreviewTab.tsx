/**
 * InfantryPreviewTab — Preview tab body for the infantry customizer
 *
 * Infantry equivalent of the mech `PreviewTab`: reads ONLY the infantry store,
 * builds an `IInfantryRecordSheetUnitInput` object, and wires the Download-PDF
 * / Print toolbar actions to `RecordSheetService`.
 *
 * @spec openspec/specs/record-sheet-export/spec.md
 *        Requirement: Customizer Non-Mech Preview And Export Path
 */

import React, { useMemo, useState } from 'react';

import { useInfantryStore } from '@/stores/useInfantryStore';
import { PaperSize } from '@/types/printing';

import { PreviewTabFrame } from '../preview/PreviewTabFrame';
import { useRecordSheetToolbarActions } from '../preview/RecordSheetCanvasPreview';
import { buildInfantryUnitObject } from './buildInfantryUnitObject';
import { InfantryRecordSheetPreview } from './InfantryRecordSheetPreview';

interface InfantryPreviewTabProps {
  /** Read-only mode (ignored for preview). */
  _readOnly?: boolean;
  /** CSS class name. */
  className?: string;
}

/**
 * Infantry Preview tab — toolbar + on-canvas record sheet for the active
 * infantry platoon. Mounted only inside an `InfantryStoreContext`.
 */
export function InfantryPreviewTab({
  _readOnly = false,
  className = '',
}: InfantryPreviewTabProps): React.ReactElement {
  const [paperSize, setPaperSize] = useState<PaperSize>(PaperSize.LETTER);

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

  const toolbarActions = useRecordSheetToolbarActions(
    unitObject,
    paperSize,
    setPaperSize,
  );

  return (
    <PreviewTabFrame
      className={className}
      testId="infantry-preview-tab"
      toolbarActions={toolbarActions}
    >
      <InfantryRecordSheetPreview paperSize={paperSize} />
    </PreviewTabFrame>
  );
}
