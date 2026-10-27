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
      className={`min-w-0 flex-1 break-words whitespace-normal ${merged ? styles.criticalMergedLabel : 'inline-flex items-center gap-1'}`}
    >
      {slot.type === 'empty' && <span aria-hidden="true">+ </span>}
      {merged && !isSlotContinuation(slot) && (
        <span className={styles.criticalSlotRange}>
          {slot.index + 1}–{slot.index + (slot.totalSlots ?? 1)}
        </span>
      )}
      <span className={styles.criticalEquipmentName} title={slot.name}>
        {getSingleSlotDisplayName(slot, isOmni)}
      </span>
      {merged && !isSlotContinuation(slot) && (
        <span className="text-text-theme-secondary block text-[13px] font-normal">
          {slot.totalSlots} slots
        </span>
      )}
    </span>
  );
}
