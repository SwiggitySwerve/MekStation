import type { StoreApi } from 'zustand';

import { Era } from '@/types/temporal/Era';
import { serializeCustomUnitState } from '@/utils/serialization/CustomUnitSerializer';
import { getEraForYear } from '@/utils/temporal/eraUtils';

import type { UnitState, UnitStore } from '../unitState';

export type UnitEditSnapshot = Omit<
  UnitState,
  | 'id'
  | 'createdAt'
  | 'lastModifiedAt'
  | 'isModified'
  | 'sourceDefinition'
  | 'librarySave'
>;

/** Explicit fields also clear optional values when restoring an older snapshot. */
export function getEditableUnitSnapshot(state: UnitState): UnitEditSnapshot {
  return {
    name: state.name,
    chassis: state.chassis,
    clanName: state.clanName,
    model: state.model,
    mulId: state.mulId,
    role: state.role,
    fluff: state.fluff,
    year: state.year,
    rulesLevel: state.rulesLevel,
    tonnage: state.tonnage,
    techBase: state.techBase,
    unitType: state.unitType,
    configuration: state.configuration,
    lamMode: state.lamMode,
    quadVeeMode: state.quadVeeMode,
    isOmni: state.isOmni,
    baseChassisHeatSinks: state.baseChassisHeatSinks,
    techBaseMode: state.techBaseMode,
    componentTechBases: state.componentTechBases,
    selectionMemory: state.selectionMemory,
    engineType: state.engineType,
    engineRating: state.engineRating,
    gyroType: state.gyroType,
    internalStructureType: state.internalStructureType,
    cockpitType: state.cockpitType,
    heatSinkType: state.heatSinkType,
    heatSinkCount: state.heatSinkCount,
    armorType: state.armorType,
    armorTonnage: state.armorTonnage,
    armorAllocation: state.armorAllocation,
    enhancement: state.enhancement,
    jumpMP: state.jumpMP,
    jumpJetType: state.jumpJetType,
    equipment: state.equipment,
    armActuators: state.armActuators,
  };
}

export function getUnitEditFingerprint(state: UnitState): string {
  return JSON.stringify(orderedJson(getEditableUnitSnapshot(state)));
}

function orderedJson(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(orderedJson);
  if (value && typeof value === 'object')
    return Object.fromEntries(
      Object.entries(value)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, item]) => [key, orderedJson(item)]),
    );
  return value;
}

function normalizeEquipmentIds(
  equipment: UnitState['equipment'],
): UnitState['equipment'] {
  const ids = new Map(
    equipment.map((item, index) => [item.instanceId, `equipment-${index}`]),
  );
  return equipment.map((item, index) => ({
    ...item,
    instanceId: `equipment-${index}`,
    linkedAmmoId: item.linkedAmmoId
      ? (ids.get(item.linkedAmmoId) ?? item.linkedAmmoId)
      : undefined,
  }));
}

/** Preserve editor-only fields in dirty checks without treating temporary IDs as edits. */
export function getUnitDraftFingerprint(state: UnitState): string {
  return JSON.stringify(
    orderedJson({
      ...getEditableUnitSnapshot(state),
      equipment: normalizeEquipmentIds(state.equipment),
    }),
  );
}

/** Compare the persisted design, independent of temporary editor equipment IDs. */
export function getUnitLibraryFingerprint(state: UnitState): string {
  const equipment = normalizeEquipmentIds(state.equipment);
  const data = serializeCustomUnitState(
    {
      ...state,
      equipment,
      fluff:
        state.fluff && Object.keys(state.fluff).length
          ? state.fluff
          : undefined,
    },
    {
      id: '',
      chassis: state.chassis,
      variant: state.model,
      era: getEraForYear(state.year) ?? Era.LATE_SUCCESSION_WARS,
    },
  );
  return JSON.stringify(orderedJson({ ...data, sourceDefinition: undefined }));
}

export function createLibrarySaveReceipt(
  state: UnitState,
  reference: { id: string; version: number },
): NonNullable<UnitState['librarySave']> {
  return {
    ...reference,
    fingerprint: getUnitLibraryFingerprint(state),
    draftFingerprint: getUnitDraftFingerprint(state),
  };
}

/** Record the submitted state even if a newer edit arrived during the request. */
export function recordUnitLibrarySave(
  store: StoreApi<UnitStore>,
  reference: { id: string; version: number },
  savedState: UnitState,
): void {
  const librarySave = createLibrarySaveReceipt(savedState, reference);
  store.setState({
    librarySave,
    isModified:
      getUnitDraftFingerprint(store.getState()) !==
      librarySave.draftFingerprint,
  });
}
