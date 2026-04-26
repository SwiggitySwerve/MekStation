/**
 * Shared types for UnitCardExpanded — leaf module to break circular dependency
 * between UnitCardExpanded.tsx and UnitCardExpandedSections.tsx.
 */

import type { UnitCardStandardProps } from './UnitCardStandard';

export interface EquipmentEntry {
  name: string;
  category: string;
  weight: number;
  slots: number;
  location?: string;
  count: number;
}

export interface CriticalSlotSummary {
  location: string;
  totalSlots: number;
  usedSlots: number;
  freeSlots: number;
}

export interface UnitCardExpandedProps extends UnitCardStandardProps {
  // Additional equipment (non-weapon)
  equipment: EquipmentEntry[];

  // Critical slots per location
  criticalSlots: CriticalSlotSummary[];

  // Quirks
  quirks: string[];

  // Fluff
  notes?: string;
  overview?: string;
}
