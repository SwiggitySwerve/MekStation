import type { IUnrecoveredCriticalSlot } from '@/types/unit/UnitLoadDiagnostics';

import { getEquipmentRegistry } from '@/services/equipment/EquipmentRegistry';

import type {
  CriticalSlotNoticeKind,
  ICriticalSlotNoticeEffect,
} from './criticalSlotNoticeEffects';
import type { IRawSerializedUnit } from './types';

import { mapTechBase, mapTechBaseMode } from './componentMappers';
import { getCriticalSlotsForLocation } from './criticalSlotEquipment';
import { classifyCriticalSlotNoticeIdentity } from './criticalSlotNoticeEffects';
import {
  parseCriticalSlotToken,
  resolveEquipmentId,
} from './equipmentResolution';

interface INoticeEffectGroup {
  readonly effect: ICriticalSlotNoticeEffect;
  readonly entries: IUnrecoveredCriticalSlot[];
}
interface INoticeKindGroup {
  readonly kind: CriticalSlotNoticeKind;
  readonly title: string;
  readonly entries: IUnrecoveredCriticalSlot[];
  readonly effects: INoticeEffectGroup[];
}
interface INoticeGroup {
  readonly title: string;
  readonly count: number;
  readonly kinds: readonly INoticeKindGroup[];
}

/** Same public identity lookups as the census; never scans for residual membership. */
export function classifyCriticalSlotNoticeEntry(
  entry: IUnrecoveredCriticalSlot,
  source?: IRawSerializedUnit,
): ReturnType<typeof classifyCriticalSlotNoticeIdentity> {
  const lookupToken = parseCriticalSlotToken(entry.text).lookupToken;
  const context = getCriticalSlotsForLocation(
    source?.criticalSlots,
    entry.location,
  );
  const resolved = resolveEquipmentId(
    lookupToken,
    mapTechBase(source?.techBase ?? ''),
    mapTechBaseMode(source?.techBase ?? ''),
    [entry.text, ...(context ?? [])],
  );
  const registry = getEquipmentRegistry().lookup(lookupToken);
  return classifyCriticalSlotNoticeIdentity({
    lookupToken,
    resolvedId: resolved.resolvedId,
    equipmentId: resolved.equipmentDef?.id,
    equipmentName: resolved.equipmentDef?.name,
    equipmentCategory: resolved.equipmentDef?.category,
    registryId: registry.found ? registry.equipment?.id : undefined,
    registryName: registry.found ? registry.equipment?.name : undefined,
  });
}

/** A partition of the supplied loader list; no entry is added, omitted or changed. */
export function groupCriticalSlotNoticeEntries(
  entries: readonly IUnrecoveredCriticalSlot[],
  source?: IRawSerializedUnit,
): readonly INoticeGroup[] {
  const kinds = new Map<CriticalSlotNoticeKind, INoticeKindGroup>();
  for (const entry of entries) {
    const result = classifyCriticalSlotNoticeEntry(entry, source);
    let kind = kinds.get(result.kind);
    if (!kind) {
      kind = {
        kind: result.kind,
        title: result.title,
        entries: [],
        effects: [],
      };
      kinds.set(result.kind, kind);
    }
    kind.entries.push(entry);
    let effect = kind.effects.find(
      (group) => group.effect.id === result.effect.id,
    );
    if (!effect) {
      effect = { effect: result.effect, entries: [] };
      kind.effects.push(effect);
    }
    effect.entries.push(entry);
  }
  const other = [...kinds.values()].filter(
    (kind) => kind.kind !== 'armor_structure',
  );
  const markers = kinds.get('armor_structure');
  return [
    {
      title: 'Other critical-slot entries',
      count: other.reduce((sum, kind) => sum + kind.entries.length, 0),
      kinds: other,
    },
    {
      title: 'Placement markers only',
      count: markers?.entries.length ?? 0,
      kinds: markers ? [markers] : [],
    },
  ].filter((group) => group.count > 0);
}
