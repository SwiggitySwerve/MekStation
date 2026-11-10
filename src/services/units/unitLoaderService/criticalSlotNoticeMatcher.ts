import { HEAT_SINK_EQUIPMENT_IDS } from '@/utils/equipment/equipmentConstants';

import type { CriticalSlotNoticeKind } from './criticalSlotNoticeEffects';
import type {
  ICriticalSlotNoticeIdentity,
  ICriticalSlotNoticeEffect,
  INoticeKindRule,
} from './criticalSlotNoticeTypes';

/** The owner's one match procedure; callers use the public classification facade. */
export function matchCriticalSlotNoticeIdentity(
  identity: ICriticalSlotNoticeIdentity,
  rules: readonly INoticeKindRule[],
): {
  readonly kind: CriticalSlotNoticeKind;
  readonly title: string;
  readonly ruleId: string;
  readonly effect: ICriticalSlotNoticeEffect;
} {
  const candidates = [
    identity.lookupToken,
    identity.resolvedId,
    identity.equipmentId,
    identity.equipmentName,
    identity.registryId,
    identity.registryName,
  ].filter((value): value is string => typeof value === 'string');
  const normalized = candidates.map((value) =>
    value.toLowerCase().replace(/[^a-z0-9]/g, ''),
  );
  for (const [index, rule] of rules.entries()) {
    const categoryMatches =
      rule.category !== undefined &&
      rule.category === identity.equipmentCategory;
    if (
      rule.kind !== 'other' &&
      !categoryMatches &&
      !(
        rule.canonicalHeatSinkIds &&
        candidates.some((id) =>
          HEAT_SINK_EQUIPMENT_IDS.some((canonical) => canonical === id),
        )
      ) &&
      !normalized.some((value) => rule.pattern?.test(value))
    )
      continue;
    const selected = rule.effects.find(
      (item) =>
        !normalized.some((value) => item.excludePattern?.test(value)) &&
        (!item.pattern ||
          normalized.some((value) => item.pattern?.test(value))),
    );
    if (!selected)
      throw new Error(`Missing notice effect fallback: ${rule.kind}`);
    return {
      kind: rule.kind,
      title: rule.title,
      ruleId: `${String(index + 1).padStart(2, '0')}-${rule.kind.replace('_', '-')}`,
      effect: selected,
    };
  }
  throw new Error('Missing critical-slot notice classification fallback');
}
