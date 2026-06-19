import type { IFullUnit } from '@/services/units/CanonicalUnitService';
import type { IInitiativeEquipmentProfile } from '@/types/gameplay';

import {
  criticalSlotsFromFullUnit,
  equipmentSignalsFromFullUnit,
} from './UnitHydrationEquipment';
import {
  normalizeCriticalSlotText,
  normalizeEquipmentId,
} from './UnitHydrationText';

function initiativeStringField(
  source: Record<string, unknown> | undefined,
  ...fieldNames: readonly string[]
): string | undefined {
  for (const fieldName of fieldNames) {
    const value = source?.[fieldName];
    if (typeof value === 'string' && value.trim().length > 0) {
      return value;
    }
  }
  return undefined;
}

function initiativeNumberField(
  source: Record<string, unknown> | undefined,
  ...fieldNames: readonly string[]
): number | undefined {
  for (const fieldName of fieldNames) {
    const value = source?.[fieldName];
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }
  }
  return undefined;
}

function initiativeBooleanField(
  source: Record<string, unknown> | undefined,
  ...fieldNames: readonly string[]
): boolean | undefined {
  for (const fieldName of fieldNames) {
    const value = source?.[fieldName];
    if (typeof value === 'boolean') {
      return value;
    }
  }
  return undefined;
}

function rawUnitRecord(fullUnit: IFullUnit): Record<string, unknown> {
  return fullUnit as Record<string, unknown>;
}

const NORMALIZED_COCKPIT_TYPE_LABELS: Readonly<Record<string, string>> = {
  commandconsole: 'Command Console',
  standard: 'Standard',
  small: 'Small',
  torsomounted: 'Torso-Mounted',
  torsomountedcockpit: 'Torso-Mounted',
  primitive: 'Primitive',
  industrial: 'Industrial',
  superheavy: 'Superheavy',
  superheavycockpit: 'Superheavy',
};

function normalizeCockpitType(raw: string | undefined): string | undefined {
  return (
    NORMALIZED_COCKPIT_TYPE_LABELS[normalizeCriticalSlotText(raw ?? '')] ?? raw
  );
}

function cockpitTypeFromFullUnit(fullUnit: IFullUnit): string | undefined {
  const unit = rawUnitRecord(fullUnit);
  const components = unit.components;
  const componentRecord =
    typeof components === 'object' && components !== null
      ? (components as Record<string, unknown>)
      : undefined;
  const cockpit = unit.cockpit;
  const cockpitRecord =
    typeof cockpit === 'object' && cockpit !== null
      ? (cockpit as Record<string, unknown>)
      : undefined;

  return normalizeCockpitType(
    initiativeStringField(unit, 'cockpitType', 'cockpit_type', 'cockpit') ??
      initiativeStringField(componentRecord, 'cockpitType', 'cockpit') ??
      initiativeStringField(cockpitRecord, 'type', 'cockpitType'),
  );
}

function communicationsTonnageFromEquipmentDescriptor(
  descriptor: string,
): number | undefined {
  const normalized = descriptor.trim().toLowerCase();
  if (!normalized.includes('communications-equipment')) return undefined;

  const explicitSizeMatch = normalized.match(
    /\bcommunications-equipment:size:(\d+(?:\.\d+)?)/,
  );
  const tonSuffixMatch = normalized.match(
    /\bcommunications-equipment-(\d+(?:\.\d+)?)-ton\b/,
  );
  const parentheticalTonnageMatch = normalized.match(
    /\bcommunications equipment\s*\((\d+(?:\.\d+)?)\s*tons?\)/,
  );
  const match =
    explicitSizeMatch ?? tonSuffixMatch ?? parentheticalTonnageMatch;
  if (!match) return undefined;

  const tonnage = Number.parseFloat(match[1]);
  return Number.isFinite(tonnage) && tonnage > 0 ? tonnage : undefined;
}

function communicationsTonnageFromEquipmentEntries(
  fullUnit: IFullUnit,
): number | undefined {
  const equipment =
    (fullUnit.equipment as readonly unknown[] | undefined) ?? [];
  let total = 0;

  for (const raw of equipment) {
    if (!raw || typeof raw !== 'object') continue;
    const entry = raw as Record<string, unknown>;
    const id = initiativeStringField(entry, 'id', 'equipmentId', 'name');
    if (!id) continue;

    const descriptorTonnage = communicationsTonnageFromEquipmentDescriptor(id);
    if (descriptorTonnage !== undefined) {
      total += descriptorTonnage;
      continue;
    }

    if (normalizeEquipmentId(id) !== 'communicationsequipment') continue;

    const tonnage = initiativeNumberField(
      entry,
      'workingCommunicationsTonnage',
      'communicationsTonnage',
      'tonnage',
      'tons',
      'weight',
    );
    if (tonnage !== undefined && tonnage > 0) {
      total += tonnage;
    }
  }

  return total > 0 ? total : undefined;
}

function communicationsTonnageFromCriticalSlots(
  fullUnit: IFullUnit,
): number | undefined {
  const uniqueTonnages = new Set<number>();

  for (const slots of Object.values(criticalSlotsFromFullUnit(fullUnit))) {
    for (const slot of slots) {
      if (typeof slot !== 'string') continue;
      if (!normalizeEquipmentId(slot).startsWith('communicationsequipment')) {
        continue;
      }

      const match = slot.match(/\((\d+(?:\.\d+)?)\s*tons?\)/i);
      if (!match) continue;
      const tonnage = Number.parseFloat(match[1]);
      if (Number.isFinite(tonnage) && tonnage > 0) {
        uniqueTonnages.add(tonnage);
      }
    }
  }

  if (uniqueTonnages.size === 0) return undefined;
  return Math.max(...Array.from(uniqueTonnages));
}

function communicationsModeFromFullUnit(
  fullUnit: IFullUnit,
): string | undefined {
  const unit = rawUnitRecord(fullUnit);
  const communications = unit.communications;
  const communicationsRecord =
    typeof communications === 'object' && communications !== null
      ? (communications as Record<string, unknown>)
      : undefined;

  return (
    initiativeStringField(
      unit,
      'communicationsMode',
      'communicationMode',
      'communications_mode',
    ) ??
    initiativeStringField(
      communicationsRecord,
      'mode',
      'communicationsMode',
      'communicationMode',
    )
  );
}

const INITIATIVE_COMMAND_CONSOLE_PRODUCER_IDS = new Set([
  'istankcockpitcommandconsole',
  'tankcockpitcommandconsole',
  'isremotedronecommandconsole',
  'remotedronecommandconsole',
]);

function commandConsoleProducerEquipmentIdsFromFullUnit(
  fullUnit: IFullUnit,
): readonly string[] {
  const ids = new Set<string>();
  for (const signal of equipmentSignalsFromFullUnit(fullUnit)) {
    if (
      INITIATIVE_COMMAND_CONSOLE_PRODUCER_IDS.has(
        normalizeEquipmentId(signal.id),
      )
    ) {
      ids.add(signal.id);
    }
  }
  return Array.from(ids);
}

export function hydrateInitiativeEquipmentFromFullUnit(
  fullUnit: IFullUnit,
): IInitiativeEquipmentProfile | undefined {
  const unit = rawUnitRecord(fullUnit);
  const cockpitType = cockpitTypeFromFullUnit(fullUnit);
  const workingCommunicationsTonnage =
    communicationsTonnageFromEquipmentEntries(fullUnit) ??
    communicationsTonnageFromCriticalSlots(fullUnit) ??
    initiativeNumberField(
      unit,
      'workingCommunicationsTonnage',
      'communicationsTonnage',
    );
  const communicationsMode =
    communicationsModeFromFullUnit(fullUnit) ??
    (workingCommunicationsTonnage !== undefined ? 'Default' : undefined);
  const commandConsoleCrewActive = initiativeBooleanField(
    unit,
    'commandConsoleCrewActive',
    'commandConsoleCrewed',
    'hasCommandConsoleCrew',
  );
  const tonnage = initiativeNumberField(unit, 'tonnage');
  const unitType = initiativeStringField(unit, 'unitType', 'type');
  const hasAdvancedFireControl = initiativeBooleanField(
    unit,
    'hasAdvancedFireControl',
    'advancedFireControl',
  );
  const commandConsoleProducerEquipmentIds =
    commandConsoleProducerEquipmentIdsFromFullUnit(fullUnit);
  const hasInitiativeEquipmentEvidence =
    workingCommunicationsTonnage !== undefined ||
    normalizeCriticalSlotText(cockpitType ?? '') === 'commandconsole' ||
    commandConsoleProducerEquipmentIds.length > 0;
  if (!hasInitiativeEquipmentEvidence) return undefined;

  const profile: IInitiativeEquipmentProfile = {
    ...(workingCommunicationsTonnage !== undefined
      ? { workingCommunicationsTonnage }
      : {}),
    ...(communicationsMode !== undefined ? { communicationsMode } : {}),
    ...(cockpitType !== undefined ? { cockpitType } : {}),
    ...(commandConsoleProducerEquipmentIds.length > 0
      ? { commandConsoleProducerEquipmentIds }
      : {}),
    ...(commandConsoleCrewActive !== undefined
      ? { commandConsoleCrewActive }
      : {}),
    ...(tonnage !== undefined ? { tonnage } : {}),
    ...(unitType !== undefined ? { unitType } : {}),
    ...(hasAdvancedFireControl !== undefined ? { hasAdvancedFireControl } : {}),
  };

  return Object.keys(profile).length > 0 ? profile : undefined;
}
