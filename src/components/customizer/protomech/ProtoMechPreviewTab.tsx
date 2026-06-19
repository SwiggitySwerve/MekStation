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

import React, { useMemo, useState } from 'react';

import { useProtoMechStore } from '@/stores/useProtoMechStore';
import { PaperSize } from '@/types/printing';

import { PreviewTabFrame } from '../preview/PreviewTabFrame';
import { useRecordSheetToolbarActions } from '../preview/RecordSheetCanvasPreview';
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

  const toolbarActions = useRecordSheetToolbarActions(
    unitObject,
    paperSize,
    setPaperSize,
  );

  return (
    <PreviewTabFrame
      className={className}
      testId="protomech-preview-tab"
      toolbarActions={toolbarActions}
    >
      <ProtoMechRecordSheetPreview paperSize={paperSize} scale={0.75} />
    </PreviewTabFrame>
  );
}
