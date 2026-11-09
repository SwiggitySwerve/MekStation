import type { StoreApi } from 'zustand';

import {
  normalizeUnitSaveEquipmentIds,
  stringifyUnitSaveFingerprint,
} from '@/stores/unitSaveFingerprints';
import {
  createUnitLibrarySaveReceipt,
  getUnitLibrarySavePatch,
} from '@/stores/unitSaveState';
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
    crewSeats: state.crewSeats,
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
    frankenStructure: state.frankenStructure,
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
  return stringifyUnitSaveFingerprint(getEditableUnitSnapshot(state));
}

/** Preserve editor-only fields in dirty checks without treating temporary IDs as edits. */
export function getUnitDraftFingerprint(state: UnitState): string {
  return stringifyUnitSaveFingerprint({
    ...getEditableUnitSnapshot(state),
    equipment: normalizeUnitSaveEquipmentIds(state.equipment),
  });
}

/** Compare the persisted design, independent of temporary editor equipment IDs. */
export function getUnitLibraryFingerprint(state: UnitState): string {
  const equipment = normalizeUnitSaveEquipmentIds(state.equipment);
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
  return stringifyUnitSaveFingerprint({ ...data, sourceDefinition: undefined });
}

export function createLibrarySaveReceipt(
  state: UnitState,
  reference: { id: string; version: number },
): NonNullable<UnitState['librarySave']> {
  return createUnitLibrarySaveReceipt(reference, {
    library: getUnitLibraryFingerprint(state),
    draft: getUnitDraftFingerprint(state),
  });
}

/** Record the submitted state even if a newer edit arrived during the request. */
export function recordUnitLibrarySave(
  store: StoreApi<UnitStore>,
  reference: { id: string; version: number },
  savedState: UnitState,
): void {
  const librarySave = createLibrarySaveReceipt(savedState, reference);
  store.setState(
    getUnitLibrarySavePatch(
      librarySave,
      getUnitDraftFingerprint(store.getState()),
    ),
  );
}
