/**
 * Live BattleMech record-sheet preview and export actions.
 *
 * @spec openspec/specs/record-sheet-export/spec.md
 * @spec openspec/specs/customizer-tabs/spec.md
 */

import React, { useMemo, useState } from 'react';

import { useEquipmentRegistry } from '@/hooks/useEquipmentRegistry';
import { PaperSize } from '@/types/printing';

import { PreviewTabFrame } from '../preview/PreviewTabFrame';
import { useRecordSheetToolbarActions } from '../preview/RecordSheetCanvasPreview';
import { RecordSheetPreview } from '../preview/RecordSheetPreview';
import { buildBattleMechPreviewProjection } from '../preview/recordSheetPreview.logic';
import { usePreviewUnitState } from '../preview/usePreviewUnitState';

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

  // The sheet's unit state: the BV projection input from the one owner, plus the sheet-only fields.
  const previewState = usePreviewUnitState();

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
