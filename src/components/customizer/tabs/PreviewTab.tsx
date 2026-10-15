/**
 * Live BattleMech record-sheet preview and export actions.
 *
 * @spec openspec/specs/record-sheet-export/spec.md
 * @spec openspec/specs/customizer-tabs/spec.md
 */

import React, { useMemo, useState } from 'react';

import { useEquipmentRegistry } from '@/hooks/useEquipmentRegistry';
import { useUnitStore } from '@/stores/useUnitStore';
import { PaperSize } from '@/types/printing';

import { PreviewTabFrame } from '../preview/PreviewTabFrame';
import { useRecordSheetToolbarActions } from '../preview/RecordSheetCanvasPreview';
import { RecordSheetPreview } from '../preview/RecordSheetPreview';
import {
  buildBattleMechPreviewProjection,
  type PreviewUnitState,
} from '../preview/recordSheetPreview.logic';
import { useMechStructureFields } from './useMechStructureFields';

interface PreviewTabProps {
  /** Read-only mode (ignored for preview) */
  _readOnly?: boolean;
  /** CSS class name */
  className?: string;
}

export function PreviewTab({
  _readOnly = false,
  className = '',
}: PreviewTabProps): React.ReactElement {
  const [paperSize, setPaperSize] = useState<PaperSize>(PaperSize.LETTER);
  const { isReady: equipmentRegistryReady } = useEquipmentRegistry();

  const name = useUnitStore((s) => s.name);
  const chassis = useUnitStore((s) => s.chassis);
  const model = useUnitStore((s) => s.model);
  const tonnage = useUnitStore((s) => s.tonnage);
  const techBase = useUnitStore((s) => s.techBase);
  const rulesLevel = useUnitStore((s) => s.rulesLevel);
  const year = useUnitStore((s) => s.year);
  const role = useUnitStore((s) => s.role);
  const configuration = useUnitStore((s) => s.configuration);
  const {
    engineType,
    engineRating,
    gyroType,
    internalStructureType,
    cockpitType,
  } = useMechStructureFields();
  const armorType = useUnitStore((s) => s.armorType);
  const armorAllocation = useUnitStore((s) => s.armorAllocation);
  const heatSinkType = useUnitStore((s) => s.heatSinkType);
  const heatSinkCount = useUnitStore((s) => s.heatSinkCount);
  const enhancement = useUnitStore((s) => s.enhancement);
  const jumpMP = useUnitStore((s) => s.jumpMP);
  const equipment = useUnitStore((s) => s.equipment);
  const armActuators = useUnitStore((s) => s.armActuators);

  const previewState = useMemo<PreviewUnitState>(
    () => ({
      name,
      chassis,
      model,
      tonnage,
      techBase,
      rulesLevel,
      year,
      role,
      configuration,
      engineType,
      engineRating,
      gyroType,
      internalStructureType,
      cockpitType,
      armorType,
      armorAllocation,
      heatSinkType,
      heatSinkCount,
      enhancement,
      jumpMP,
      equipment,
      armActuators,
    }),
    [
      name,
      chassis,
      model,
      tonnage,
      techBase,
      rulesLevel,
      year,
      role,
      configuration,
      engineType,
      engineRating,
      gyroType,
      internalStructureType,
      cockpitType,
      armorType,
      armorAllocation,
      heatSinkType,
      heatSinkCount,
      enhancement,
      jumpMP,
      equipment,
      armActuators,
    ],
  );

  const projection = useMemo(
    () =>
      buildBattleMechPreviewProjection(previewState, equipmentRegistryReady),
    // The calculation service resolves equipment definitions through the async
    // registry. Reproject when readiness changes even if editor state does not.
    [previewState, equipmentRegistryReady],
  );

  const toolbarActions = useRecordSheetToolbarActions(
    projection.unitConfig,
    paperSize,
    setPaperSize,
  );

  return (
    <PreviewTabFrame className={className} toolbarActions={toolbarActions}>
      <RecordSheetPreview
        paperSize={paperSize}
        scale={0.75}
        unitConfig={projection.unitConfig}
      />
    </PreviewTabFrame>
  );
}
