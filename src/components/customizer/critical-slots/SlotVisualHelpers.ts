import type { CSSProperties } from 'react';

import {
  classifyEquipmentByName,
  getEquipmentSurfaceClassesByName,
} from '@/utils/colors/equipmentColors';
import {
  classifySystemComponent,
  getSlotColorClasses,
  type SystemComponentType,
} from '@/utils/colors/slotColors';
import { abbreviateEquipmentName } from '@/utils/equipmentNameAbbreviations';

import type { SlotContent } from './criticalSlotTypes';

import styles from '../CustomizerWorkbench.module.css';

/** Readable mouse targets on desktop; phones and touch pointers keep 44px rows. */
export function getSlotSizeClasses(compact: boolean): string {
  return `min-h-11 px-2 py-1 text-sm lg:pointer-fine:min-h-[30px] lg:pointer-fine:py-0 ${compact ? 'lg:pointer-fine:px-1' : ''}`;
}

/**
 * The owner's category or family hue (the token in its `border-l-<token>`
 * accent class) as `--critical-slot-color`, which tints the slot, its bar,
 * the heat-sink hatch and the matching colour-key chip.
 */
export function getSlotColorStyleFromClasses(
  classes: string,
): CSSProperties | undefined {
  const token = /border-l-([a-z]+-\d+)/.exec(classes)?.[1];
  return token
    ? ({ '--critical-slot-color': `var(--color-${token})` } as CSSProperties)
    : undefined;
}

export function getSlotColorStyle(
  slot: SlotContent,
): CSSProperties | undefined {
  return slot.name
    ? getSlotColorStyleFromClasses(getSlotContentClasses(slot))
    : undefined;
}

export function isMultiSlotEquipment(slot: SlotContent): boolean {
  return slot.type === 'equipment' && (slot.totalSlots ?? 1) > 1;
}

export function isSlotContinuation(slot: SlotContent): boolean {
  return isMultiSlotEquipment(slot) && slot.isFirstSlot === false;
}

/** Fixed systems are tinted in their family hue; rows sit flush. */
export function getSystemSlotClasses(type: SystemComponentType): string {
  return type !== 'structure' && type !== 'armor' && type !== 'empty'
    ? `${getSlotColorClasses(type)} ${styles.criticalFixedSlot} ${styles.criticalTintedSlot}`
    : getSlotColorClasses(type);
}

/** Equipment is tinted in its category hue; heat sinks add a faint hatch. */
export function getEquipmentSlotClasses(name: string): string {
  return `${getEquipmentSurfaceClassesByName(name)} ${styles.criticalTintedSlot} ${classifyEquipmentByName(name) === 'heatsink' ? styles.criticalHeatSink : ''}`;
}

/** Join adjacent occupied rows without removing their individual hit targets. */
export function getMergedSlotClasses(slot: SlotContent): string {
  if (!isMultiSlotEquipment(slot)) return '';
  return `${styles.criticalMergedSlot} ${isSlotContinuation(slot) ? styles.criticalMergedContinuation : styles.criticalMergedFirst} ${slot.isLastSlot ? styles.criticalMergedLast : ''}`;
}

export function getSlotContentClasses(slot: SlotContent): string {
  if (slot.type === 'system' && slot.name) {
    return getSystemSlotClasses(classifySystemComponent(slot.name));
  }
  if (slot.type === 'equipment' && slot.name) {
    return getEquipmentSlotClasses(slot.name);
  }
  return 'bg-transparent border-border-theme-strong/60 border-dashed text-text-theme-muted';
}

export function getSlotStateClasses(
  slot: SlotContent,
  isAssignable: boolean,
  isDragOver: boolean,
): string {
  if (isDragOver) {
    return slot.type === 'empty' && isAssignable
      ? 'bg-green-700 border-green-400 text-white scale-[1.02]'
      : 'bg-red-950/70 border-red-400 text-red-100';
  }
  if (isAssignable && slot.type === 'empty') {
    return 'bg-amber-500/10 border-amber-400/70 text-amber-100';
  }
  return getSlotContentClasses(slot);
}

export function getOccupiedSpanClasses(slot: SlotContent): string {
  if (!isMultiSlotEquipment(slot)) return '';
  return [
    'absolute right-0 w-1.5 border-r-2 border-current opacity-70',
    slot.isFirstSlot ? 'top-0 rounded-tr-sm border-t-2' : '-top-2',
    slot.isLastSlot ? 'bottom-0 rounded-br-sm border-b-2' : '-bottom-2',
  ].join(' ');
}

export function getSlotDisplayName(slot: SlotContent): string {
  if (slot.type === 'empty') return 'Available';
  if (isSlotContinuation(slot)) return '';
  if (!slot.name) return '';
  return classifyEquipmentByName(slot.name) === 'heatsink'
    ? slot.name
    : abbreviateEquipmentName(slot.name);
}

export function getSingleSlotDisplayName(
  slot: SlotContent,
  isOmni: boolean,
): string {
  const name = getSlotDisplayName(slot);
  return !isOmni || slot.type !== 'equipment' || isSlotContinuation(slot)
    ? name
    : `${name}${slot.isOmniPodMounted ? ' (Pod)' : ' (Fixed)'}`;
}
