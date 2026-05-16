/**
 * ProtoMechPreviewTab — Preview tab body for the protomech customizer
 *
 * ProtoMech equivalent of the mech `PreviewTab`: reads ONLY the protomech
 * store, builds an `IProtoMechRecordSheetUnitInput` object, and wires the
 * Download-PDF / Print toolbar actions to `RecordSheetService`.
 *
 * @spec openspec/changes/wire-non-mech-customizer-preview/specs/record-sheet-export/spec.md
 *        Requirement: Customizer Non-Mech Preview And Export Path
 */

import React, { useCallback, useMemo, useState } from 'react';

import { getRecordSheetService } from '@/services/printing/RecordSheetService';
import { useProtoMechStore } from '@/stores/useProtoMechStore';
import { PaperSize, PAPER_DIMENSIONS } from '@/types/printing';

import { PreviewToolbar } from '../preview/PreviewToolbar';
import { buildProtoMechUnitObject } from './buildProtoMechUnitObject';
import { ProtoMechRecordSheetPreview } from './ProtoMechRecordSheetPreview';

interface ProtoMechPreviewTabProps {
  /** Read-only mode (ignored for preview). */
  _readOnly?: boolean;
  /** CSS class name. */
  className?: string;
}

/**
 * ProtoMech Preview tab — toolbar + on-canvas record sheet for the active
 * protomech point. Mounted only inside a `ProtoMechStoreContext`.
 */
export function ProtoMechPreviewTab({
  _readOnly = false,
  className = '',
}: ProtoMechPreviewTabProps): React.ReactElement {
  const [paperSize, setPaperSize] = useState<PaperSize>(PaperSize.LETTER);

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
      data-testid="protomech-preview-tab"
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
        <ProtoMechRecordSheetPreview paperSize={paperSize} scale={0.75} />
      </div>
    </div>
  );
}
