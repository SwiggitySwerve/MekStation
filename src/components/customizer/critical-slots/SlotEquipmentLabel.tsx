import type { SlotContent } from './criticalSlotTypes';

import styles from '../CustomizerWorkbench.module.css';
import {
  getSingleSlotDisplayName,
  isMultiSlotEquipment,
  isSlotContinuation,
} from './SlotVisualHelpers';

/** A single visible label over a block of independently interactive slot rows. */
export function SlotEquipmentLabel({
  slot,
  isOmni = false,
}: {
  slot: SlotContent;
  isOmni?: boolean;
}): React.ReactElement {
  const merged = isMultiSlotEquipment(slot);
  return (
    <span
      aria-hidden={merged || undefined}
      className={`min-w-0 flex-1 break-words whitespace-normal ${merged ? styles.criticalMergedLabel : ''}`}
    >
      {slot.type === 'empty' && <span aria-hidden="true">+ </span>}
      <span>{getSingleSlotDisplayName(slot, isOmni)}</span>
      {merged && !isSlotContinuation(slot) && (
        <span className="text-text-theme-secondary block text-xs font-normal">
          {slot.totalSlots} slots
        </span>
      )}
    </span>
  );
}
