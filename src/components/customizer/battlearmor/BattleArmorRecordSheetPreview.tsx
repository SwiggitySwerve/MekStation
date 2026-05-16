/**
 * BattleArmorRecordSheetPreview — on-canvas battle armor record sheet preview
 *
 * Battle armor equivalent of the mech `RecordSheetPreview`: reads ONLY the
 * battle armor store, builds an `IBattleArmorRecordSheetUnitInput` object, and
 * renders it through `RecordSheetService.extractData` → `renderPreview`.
 *
 * @spec openspec/changes/wire-non-mech-customizer-preview/specs/record-sheet-export/spec.md
 *        Requirement: Record Sheet Preview Component Is Unit-Type Aware
 */

import React, { useCallback, useEffect, useMemo, useRef } from 'react';

import { getRecordSheetService } from '@/services/printing/RecordSheetService';
import { useBattleArmorStore } from '@/stores/useBattleArmorStore';
import { PaperSize, PAPER_DIMENSIONS } from '@/types/printing';
import { logger } from '@/utils/logger';

import { buildBattleArmorUnitObject } from './buildBattleArmorUnitObject';

interface BattleArmorRecordSheetPreviewProps {
  /** Paper size for rendering. */
  paperSize?: PaperSize;
  /** Display scale factor. */
  scale?: number;
  /** CSS class name. */
  className?: string;
}

/**
 * Renders a live battle armor record sheet onto a canvas. Mounted only inside
 * a `BattleArmorStoreContext`.
 */
export function BattleArmorRecordSheetPreview({
  paperSize = PaperSize.LETTER,
  scale = 0.75,
  className = '',
}: BattleArmorRecordSheetPreviewProps): React.ReactElement {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const id = useBattleArmorStore((s) => s.id);
  const name = useBattleArmorStore((s) => s.name);
  const chassis = useBattleArmorStore((s) => s.chassis);
  const model = useBattleArmorStore((s) => s.model);
  const techBase = useBattleArmorStore((s) => s.techBase);
  const rulesLevel = useBattleArmorStore((s) => s.rulesLevel);
  const year = useBattleArmorStore((s) => s.year);
  const squadSize = useBattleArmorStore((s) => s.squadSize);
  const armorPerTrooper = useBattleArmorStore((s) => s.armorPerTrooper);
  const leftManipulator = useBattleArmorStore((s) => s.leftManipulator);
  const rightManipulator = useBattleArmorStore((s) => s.rightManipulator);
  const groundMP = useBattleArmorStore((s) => s.groundMP);
  const jumpMP = useBattleArmorStore((s) => s.jumpMP);
  const umuMP = useBattleArmorStore((s) => s.umuMP);

  const unitObject = useMemo(
    () =>
      buildBattleArmorUnitObject({
        id,
        name,
        chassis,
        model,
        techBase,
        rulesLevel,
        year,
        squadSize,
        armorPerTrooper,
        leftManipulator,
        rightManipulator,
        groundMP,
        jumpMP,
        umuMP,
      }),
    [
      id,
      name,
      chassis,
      model,
      techBase,
      rulesLevel,
      year,
      squadSize,
      armorPerTrooper,
      leftManipulator,
      rightManipulator,
      groundMP,
      jumpMP,
      umuMP,
    ],
  );

  const renderPreview = useCallback(async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    try {
      const data = getRecordSheetService().extractData(unitObject);
      await getRecordSheetService().renderPreview(canvas, data, paperSize);
    } catch (error) {
      logger.error('Error rendering battle armor record sheet preview:', error);
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
        data-testid="battlearmor-record-sheet-canvas"
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
