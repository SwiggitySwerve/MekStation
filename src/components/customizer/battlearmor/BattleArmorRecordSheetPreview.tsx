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

import React, { useMemo } from 'react';

import { useBattleArmorStore } from '@/stores/useBattleArmorStore';
import { PAPER_DIMENSIONS, PaperSize } from '@/types/printing';

import {
  RecordSheetCanvasPreview,
  useRecordSheetCanvasRenderer,
} from '../preview/RecordSheetCanvasPreview';
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

  const canvasRef = useRecordSheetCanvasRenderer({
    unitObject,
    paperSize,
    errorMessage: 'Error rendering battle armor record sheet preview:',
  });
  const { width, height } = PAPER_DIMENSIONS[paperSize];

  return (
    <RecordSheetCanvasPreview
      canvasRef={canvasRef}
      testId="battlearmor-record-sheet-canvas"
      width={width}
      height={height}
      scale={scale}
      className={className}
    />
  );
}
