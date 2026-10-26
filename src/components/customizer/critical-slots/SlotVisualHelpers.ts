import type { CSSProperties } from 'react';

import {
  classifyEquipmentByName,
  getCategoryColors,
  HEATSINK_COLORS,
  type CategoryColorDefinition,
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

/** Use the owner's hue at full opacity; slots apply one shared tint strength. */
export function getCriticalCategoryTint(
  colors: CategoryColorDefinition,
): CSSProperties {
  const [token] = colors.accentBorder.replace('border-l-', '').split('/');
  return {
    '--critical-category-color': `var(--color-${token})`,
  } as CSSProperties;
}

export function getSlotTintStyle(slot: SlotContent): CSSProperties | undefined {
  if (slot.type !== 'equipment' || !slot.name) return undefined;
  const category = classifyEquipmentByName(slot.name);
  return getCriticalCategoryTint(
    category === 'heatsink' ? HEATSINK_COLORS : getCategoryColors(category),
  );
}

export function isMultiSlotEquipment(slot: SlotContent): boolean {
  return slot.type === 'equipment' && (slot.totalSlots ?? 1) > 1;
}

export function isSlotContinuation(slot: SlotContent): boolean {
  return isMultiSlotEquipment(slot) && slot.isFirstSlot === false;
}

export function getSystemSlotClasses(type: SystemComponentType): string {
  return type !== 'structure' && type !== 'armor' && type !== 'empty'
    ? styles.criticalFixedSlot
    : getSlotColorClasses(type);
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
    return `${styles.criticalTintedSlot} ${classifyEquipmentByName(slot.name) === 'heatsink' ? styles.criticalHeatSink : ''}`;
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
