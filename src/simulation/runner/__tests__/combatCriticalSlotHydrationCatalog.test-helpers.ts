import * as fs from 'node:fs';
import * as path from 'node:path';

import {
  buildCriticalSlotManifest,
  buildDefaultCriticalSlotManifest,
  type CriticalSlotComponentType,
  type CriticalSlotManifest,
} from '@/utils/gameplay/criticalHitResolution';

import type { ICombatFeatureSupportEntry } from '../CombatFeatureSupport';

import {
  EQUIPMENT_BOMB_BAY_CRITICAL_EFFECT_EVIDENCE,
  EQUIPMENT_BOMB_BAY_CRITICAL_EFFECT_GAP,
  CRITICAL_SLOT_EFFECT_COMBAT_SUPPORT,
  EQUIPMENT_CRITICAL_EFFECT_EVIDENCE,
  OUT_OF_SCOPE_EQUIPMENT_CRITICAL_EFFECT_BRANCHES,
  OUT_OF_SCOPE_EQUIPMENT_CRITICAL_EFFECT_SUPPORT_IDS,
  REPRESENTED_EQUIPMENT_CRITICAL_EFFECT_BRANCHES,
  REPRESENTED_EQUIPMENT_CRITICAL_EFFECT_SUPPORT_IDS,
  UNRESOLVED_EQUIPMENT_CRITICAL_EFFECT_BRANCHES,
  UNRESOLVED_EQUIPMENT_CRITICAL_EFFECT_SUPPORT_IDS,
} from '../CombatCriticalSlotEffectSupport';
import {
  CATALOG_CRITICAL_SLOT_HYDRATION_GAPS,
  CRITICAL_SLOT_COMPONENT_TYPES,
  CRITICAL_SLOT_HYDRATION_COMBAT_SUPPORT,
  DEFAULT_CRITICAL_SLOT_COMPONENT_TYPES,
} from '../CombatCriticalSlotHydrationSupport';
import {
  CRITICAL_COMPONENT_COMBAT_SUPPORT,
  EQUIPMENT_CRITICAL_COMPONENT_EVIDENCE,
} from '../CombatDamageSupport';

export function sortedKeys(record: Record<string, unknown>): readonly string[] {
  return Object.keys(record).sort();
}

export function supportGaps(
  support: Record<string, ICombatFeatureSupportEntry>,
): readonly string[] {
  return Object.values(support)
    .filter(
      (entry) =>
        entry.evidence.length === 0 ||
        (entry.level !== 'integrated' &&
          (entry.gap === undefined || entry.gap.length === 0)),
    )
    .map((entry) => entry.id)
    .sort();
}

export function supportIdsByLevel(
  support: Record<string, ICombatFeatureSupportEntry>,
  level: ICombatFeatureSupportEntry['level'],
): readonly string[] {
  return Object.values(support)
    .filter((entry) => entry.level === level)
    .map((entry) => entry.id)
    .sort();
}

export function supportIdsMissingSourceRefs(
  support: Record<string, ICombatFeatureSupportEntry>,
): readonly string[] {
  return Object.values(support)
    .filter((entry) => (entry.sourceRefs?.length ?? 0) === 0)
    .map((entry) => entry.id)
    .sort();
}

export function manifestComponentTypes(
  manifest: CriticalSlotManifest,
): readonly CriticalSlotComponentType[] {
  return Array.from(
    new Set(
      Object.values(manifest)
        .flat()
        .map((slot) => slot.componentType),
    ),
  ).sort();
}

export function uniqueBattleMechFuelOrIncendiaryCriticalSlotNames(): readonly string[] {
  const root = path.join(
    process.cwd(),
    'public',
    'data',
    'units',
    'battlemechs',
  );
  const names = new Set<string>();
  const visit = (directory: string): void => {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const entryPath = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        visit(entryPath);
        continue;
      }
      if (!entry.name.endsWith('.json')) continue;

      const unit = JSON.parse(fs.readFileSync(entryPath, 'utf8')) as {
        criticalSlots?: Record<string, readonly (string | null)[]>;
      };
      for (const slots of Object.values(unit.criticalSlots ?? {})) {
        for (const slot of slots) {
          if (
            typeof slot === 'string' &&
            /(Fuel Tank|Incendiary|Inferno)/i.test(slot)
          ) {
            names.add(slot);
          }
        }
      }
    }
  };

  visit(root);
  return Array.from(names).sort();
}

export {
  fs,
  path,
  buildCriticalSlotManifest,
  buildDefaultCriticalSlotManifest,
  EQUIPMENT_BOMB_BAY_CRITICAL_EFFECT_EVIDENCE,
  EQUIPMENT_BOMB_BAY_CRITICAL_EFFECT_GAP,
  CRITICAL_SLOT_EFFECT_COMBAT_SUPPORT,
  EQUIPMENT_CRITICAL_EFFECT_EVIDENCE,
  OUT_OF_SCOPE_EQUIPMENT_CRITICAL_EFFECT_BRANCHES,
  OUT_OF_SCOPE_EQUIPMENT_CRITICAL_EFFECT_SUPPORT_IDS,
  REPRESENTED_EQUIPMENT_CRITICAL_EFFECT_BRANCHES,
  REPRESENTED_EQUIPMENT_CRITICAL_EFFECT_SUPPORT_IDS,
  UNRESOLVED_EQUIPMENT_CRITICAL_EFFECT_BRANCHES,
  UNRESOLVED_EQUIPMENT_CRITICAL_EFFECT_SUPPORT_IDS,
  CATALOG_CRITICAL_SLOT_HYDRATION_GAPS,
  CRITICAL_SLOT_COMPONENT_TYPES,
  CRITICAL_SLOT_HYDRATION_COMBAT_SUPPORT,
  DEFAULT_CRITICAL_SLOT_COMPONENT_TYPES,
  CRITICAL_COMPONENT_COMBAT_SUPPORT,
  EQUIPMENT_CRITICAL_COMPONENT_EVIDENCE,
};

export type {
  CriticalSlotComponentType,
  CriticalSlotManifest,
  ICombatFeatureSupportEntry,
};
