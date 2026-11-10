import type { EquipmentCategory } from '@/types/equipment/EquipmentCategory';

import type {
  CriticalSlotNoticeKind,
  CriticalSlotRecoveryResponsibility,
} from './criticalSlotNoticeEffects';

export interface ICriticalSlotNoticeIdentity {
  readonly lookupToken: string;
  readonly resolvedId?: string | null;
  readonly equipmentId?: string | null;
  readonly equipmentName?: string | null;
  readonly equipmentCategory?: EquipmentCategory | null;
  readonly registryId?: string | null;
  readonly registryName?: string | null;
}
export interface ICriticalSlotNoticeEffect {
  readonly id: string;
  readonly title: string;
  readonly responsibility:
    | CriticalSlotRecoveryResponsibility
    | 'weapon-control'
    | 'unassigned';
  readonly prerequisite?: string;
  readonly consequence: string;
  readonly pattern?: RegExp;
  readonly excludePattern?: RegExp;
  readonly evidence: {
    readonly unit: string;
    readonly testFile: string;
    readonly testName: string;
  };
}
export interface INoticeKindRule {
  readonly kind: CriticalSlotNoticeKind;
  readonly title: string;
  readonly pattern?: RegExp;
  readonly category?: EquipmentCategory;
  readonly canonicalHeatSinkIds?: boolean;
  readonly effects: readonly ICriticalSlotNoticeEffect[];
}
