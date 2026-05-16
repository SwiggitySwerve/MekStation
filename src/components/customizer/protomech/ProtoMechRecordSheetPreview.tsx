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

import React, { useCallback, useEffect, useMemo, useRef } from 'react';

import { getRecordSheetService } from '@/services/printing/RecordSheetService';
import { useProtoMechStore } from '@/stores/useProtoMechStore';
import { PaperSize, PAPER_DIMENSIONS } from '@/types/printing';
import { logger } from '@/utils/logger';

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
  const canvasRef = useRef<HTMLCanvasElement>(null);

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

  const renderPreview = useCallback(async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    try {
      const data = getRecordSheetService().extractData(unitObject);
      await getRecordSheetService().renderPreview(canvas, data, paperSize);
    } catch (error) {
      logger.error('Error rendering protomech record sheet preview:', error);
      const ctx = canvas.getContext('2d');
      if (ctx) {
        const { width, height } = PAPER_DIMENSIONS[paperSize];
        canvas.width = width;
        canvas.height = height;
        ctx.fillStyle = '#fff';
        ctx.fillRect(0, 0, width, height);
        ctx.fillStyle = '#f00';
        ctx.font = '14px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Error rendering record sheet', width / 2, height / 2);
      }
    }
  }, [unitObject, paperSize]);

  useEffect(() => {
    renderPreview();
  }, [renderPreview]);

  const { width, height } = PAPER_DIMENSIONS[paperSize];

  return (
    <div
      className={`record-sheet-preview ${className}`}
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'flex-start',
        overflow: 'auto',
        padding: '16px',
        backgroundColor: '#2a2a3e',
      }}
    >
      <canvas
        ref={canvasRef}
        data-testid="protomech-record-sheet-canvas"
        style={{
          width: width * scale,
          height: height * scale,
          boxShadow: '0 4px 16px rgba(0, 0, 0, 0.4)',
          backgroundColor: '#fff',
        }}
      />
    </div>
  );
}
