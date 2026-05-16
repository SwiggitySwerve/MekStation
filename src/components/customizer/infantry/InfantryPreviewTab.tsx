/**
 * InfantryPreviewTab — Preview tab body for the infantry customizer
 *
 * Infantry equivalent of the mech `PreviewTab`: reads ONLY the infantry store,
 * builds an `IInfantryRecordSheetUnitInput` object, and wires the Download-PDF
 * / Print toolbar actions to `RecordSheetService`.
 *
 * @spec openspec/changes/wire-non-mech-customizer-preview/specs/record-sheet-export/spec.md
 *        Requirement: Customizer Non-Mech Preview And Export Path
 */

import React, { useCallback, useMemo, useState } from 'react';

import { getRecordSheetService } from '@/services/printing/RecordSheetService';
import { useInfantryStore } from '@/stores/useInfantryStore';
import { PaperSize, PAPER_DIMENSIONS } from '@/types/printing';

import { PreviewToolbar } from '../preview/PreviewToolbar';
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

  const handleExportPDF = useCallback(async () => {
    const data = getRecordSheetService().extractData(unitObject);
    await getRecordSheetService().exportPDF(data, {
      paperSize,
      includePilotData: false,
    });
  }, [unitObject, paperSize]);

  const handlePrint = useCallback(async () => {
    const tempCanvas = document.createElement('canvas');
    const { width, height } = PAPER_DIMENSIONS[paperSize];
    tempCanvas.width = width;
    tempCanvas.height = height;

    const data = getRecordSheetService().extractData(unitObject);
    await getRecordSheetService().renderPreview(tempCanvas, data, paperSize);
    getRecordSheetService().print(tempCanvas);
  }, [unitObject, paperSize]);

  return (
    <div
      className={`preview-tab ${className}`}
      data-testid="infantry-preview-tab"
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        backgroundColor: '#1a1a2e',
      }}
    >
      <PreviewToolbar
        onExportPDF={handleExportPDF}
        onPrint={handlePrint}
        paperSize={paperSize}
        onPaperSizeChange={setPaperSize}
      />

      <div style={{ flex: 1, overflow: 'auto' }}>
        <InfantryRecordSheetPreview paperSize={paperSize} scale={0.75} />
      </div>
    </div>
  );
}
