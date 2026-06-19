/**
 * BattleArmorPreviewTab — Preview tab body for the battle armor customizer
 *
 * Battle armor equivalent of the mech `PreviewTab`: reads ONLY the battle
 * armor store, builds an `IBattleArmorRecordSheetUnitInput` object, and wires
 * the Download-PDF / Print toolbar actions to `RecordSheetService`.
 *
 * @spec openspec/changes/wire-non-mech-customizer-preview/specs/record-sheet-export/spec.md
 *        Requirement: Customizer Non-Mech Preview And Export Path
 */

import React, { useMemo, useState } from 'react';

import { useBattleArmorStore } from '@/stores/useBattleArmorStore';
import { PaperSize } from '@/types/printing';

import { PreviewTabFrame } from '../preview/PreviewTabFrame';
import { useRecordSheetToolbarActions } from '../preview/RecordSheetCanvasPreview';
import { BattleArmorRecordSheetPreview } from './BattleArmorRecordSheetPreview';
import { buildBattleArmorUnitObject } from './buildBattleArmorUnitObject';

interface BattleArmorPreviewTabProps {
  /** Read-only mode (ignored for preview). */
  _readOnly?: boolean;
  /** CSS class name. */
  className?: string;
}

/**
 * Battle Armor Preview tab — toolbar + on-canvas record sheet for the active
 * battle armor squad. Mounted only inside a `BattleArmorStoreContext`.
 */
export function BattleArmorPreviewTab({
  _readOnly = false,
  className = '',
}: BattleArmorPreviewTabProps): React.ReactElement {
  const [paperSize, setPaperSize] = useState<PaperSize>(PaperSize.LETTER);

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

  const toolbarActions = useRecordSheetToolbarActions(
    unitObject,
    paperSize,
    setPaperSize,
  );

  return (
    <PreviewTabFrame
      className={className}
      testId="battlearmor-preview-tab"
      toolbarActions={toolbarActions}
    >
      <BattleArmorRecordSheetPreview paperSize={paperSize} scale={0.75} />
    </PreviewTabFrame>
  );
}
