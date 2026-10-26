import { getEquipmentSurfaceClassesByName } from '@/utils/colors/equipmentColors';
import {
  classifySystemComponent,
  getSlotColorClasses,
} from '@/utils/colors/slotColors';
import { abbreviateEquipmentName } from '@/utils/equipmentNameAbbreviations';

import type { SlotContent } from './criticalSlotTypes';

/** Dense mouse targets on desktop; phones and touch pointers keep 44px rows. */
export function getSlotSizeClasses(compact: boolean): string {
  return `min-h-11 px-2 py-1 text-sm lg:pointer-fine:min-h-7 lg:pointer-fine:py-0.5 ${compact ? 'lg:pointer-fine:px-1 lg:pointer-fine:text-[13px]' : ''}`;
}

export function getSlotContentClasses(slot: SlotContent): string {
  if (slot.type === 'system' && slot.name) {
    return getSlotColorClasses(classifySystemComponent(slot.name));
  }
  if (slot.type === 'equipment' && slot.name) {
    return getEquipmentSurfaceClassesByName(slot.name);
  }
  return 'bg-surface-base/80 border-border-theme border-dashed text-text-theme-muted';
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
  if (slot.type !== 'equipment' || (slot.totalSlots ?? 1) < 2) return '';
  return [
    'absolute right-0 w-1.5 border-r-2 border-current opacity-70',
    slot.isFirstSlot ? 'top-0 rounded-tr-sm border-t-2' : '-top-2',
    slot.isLastSlot ? 'bottom-0 rounded-br-sm border-b-2' : '-bottom-2',
  ].join(' ');
}

export function getSlotDisplayName(slot: SlotContent): string {
  if (slot.type === 'empty') return 'Available';
  return slot.name ? abbreviateEquipmentName(slot.name) : '';
}

export function getSingleSlotDisplayName(
  slot: SlotContent,
  isOmni: boolean,
): string {
  const name = getSlotDisplayName(slot);
  return !isOmni || slot.type !== 'equipment'
    ? name
    : `${name}${slot.isOmniPodMounted ? ' (Pod)' : ' (Fixed)'}`;
}
