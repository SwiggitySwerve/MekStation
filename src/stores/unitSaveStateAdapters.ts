/** Store/serializer adapters for the plain save-state owner; no construction decisions. */
import type { FamilyEditorState } from '@/services/units/unitLoaderService/types';

import { Era } from '@/types/temporal/Era';
import { legacyProtoChassisLabel } from '@/utils/construction/protomech/legacyUltraheavy';
import {
  serializeCustomAerospaceState,
  serializeCustomSmallUnitState,
  serializeCustomVehicleState,
} from '@/utils/serialization/CustomUnitSerializer';
import { getEraForYear } from '@/utils/temporal/eraUtils';

import type { ILibrarySaveReceipt, SaveState } from './unitSaveState';
import type { UnitState } from './unitState';

import {
  getUnitDraftFingerprint,
  getUnitLibraryFingerprint,
} from './unit/unitEditSnapshot';
import {
  pickPersistedAerospaceState,
  pickPersistedBattleArmorState,
  pickPersistedInfantryState,
  pickPersistedProtoMechState,
  pickPersistedVehicleState,
} from './unitDraftPersistence';
import {
  normalizeUnitSaveEquipmentIds,
  stringifyUnitSaveFingerprint,
} from './unitSaveFingerprints';
import {
  createUnitLibrarySaveReceipt,
  getUnitLibrarySavePatch,
  getUnitSaveState,
} from './unitSaveState';

export type UnitSaveEditor =
  | { readonly store: 'battlemech'; readonly state: UnitState }
  | Exclude<FamilyEditorState, { store: 'capital' }>;

type NonMechEditor = Exclude<UnitSaveEditor, { store: 'battlemech' }>;

/** Adapt non-mech mount IDs to the existing ID/link normalization contract. */
function normalizedMounts<
  T extends { readonly id: string; readonly linkedAmmoId?: string },
>(mounts: readonly T[]) {
  return normalizeUnitSaveEquipmentIds(
    mounts.map((mount) => ({ ...mount, instanceId: mount.id })),
  ).map(({ instanceId, ...mount }) => ({ ...mount, id: instanceId }));
}

function normalizedEditor(editor: NonMechEditor): NonMechEditor {
  switch (editor.store) {
    case 'infantry':
      return editor;
    case 'vehicle':
      return {
        ...editor,
        state: {
          ...editor.state,
          equipment: normalizedMounts(editor.state.equipment),
        },
      };
    case 'aerospace':
      return {
        ...editor,
        state: {
          ...editor.state,
          equipment: normalizedMounts(editor.state.equipment),
        },
      };
    case 'battlearmor':
      return {
        ...editor,
        state: {
          ...editor.state,
          equipment: normalizedMounts(editor.state.equipment),
        },
      };
    case 'protomech':
      return {
        ...editor,
        state: {
          ...editor.state,
          // Reviewed loader shim (unitSaveState.rules.md): a biped above 9 t keeps the
          // `Ultraheavy` label it was fingerprinted with before 4.1-b3d, so stored
          // draft and library fingerprints still match. Quads and gliders were never relabelled.
          chassisType: legacyProtoChassisLabel(
            editor.state.chassisType,
            editor.state.tonnage,
          ),
          equipment: normalizedMounts(editor.state.equipment),
        },
      };
    default:
      return unreachableEditor(editor);
  }
}

function unreachableEditor(editor: never): never {
  throw new Error(`Unhandled unit save editor: ${String(editor)}`);
}

function persistedProjection(editor: NonMechEditor) {
  switch (editor.store) {
    case 'vehicle':
      return pickPersistedVehicleState(editor.state);
    case 'aerospace':
      return pickPersistedAerospaceState(editor.state);
    case 'infantry':
      return pickPersistedInfantryState(editor.state);
    case 'battlearmor':
      return pickPersistedBattleArmorState(editor.state);
    case 'protomech':
      return pickPersistedProtoMechState(editor.state);
    default:
      return unreachableEditor(editor);
  }
}

const DRAFT_METADATA = new Set([
  'id',
  'createdAt',
  'lastModifiedAt',
  'isModified',
  'librarySave',
  'bvBreakdown',
]);

/** Field joins belong in the persisted projection; undefined stays absent in canonical JSON. */
export function getEditorDraftFingerprint(editor: UnitSaveEditor): string {
  if (editor.store === 'battlemech')
    return getUnitDraftFingerprint(editor.state);
  const projection = persistedProjection(normalizedEditor(editor));
  return stringifyUnitSaveFingerprint(
    Object.fromEntries(
      Object.entries(projection).filter(([key]) => !DRAFT_METADATA.has(key)),
    ),
  );
}

export function getEditorLibraryFingerprint(editor: UnitSaveEditor): string {
  if (editor.store === 'battlemech')
    return getUnitLibraryFingerprint(editor.state);
  const normalized = normalizedEditor(editor);
  const state = normalized.state;
  const identity = {
    // Non-mech serializers validate a transport ID before fingerprinting.
    id: 'unit-save-fingerprint',
    chassis: state.chassis,
    variant: state.model,
    era: getEraForYear(state.year) ?? Era.LATE_SUCCESSION_WARS,
  };
  const data =
    normalized.store === 'vehicle'
      ? serializeCustomVehicleState(normalized.state, identity)
      : normalized.store === 'aerospace'
        ? serializeCustomAerospaceState(normalized.state, identity)
        : serializeCustomSmallUnitState(normalized.state, identity);
  return stringifyUnitSaveFingerprint({
    ...data,
    id: '',
    sourceDefinition: undefined,
  });
}

export function createEditorLibrarySaveReceipt(
  editor: UnitSaveEditor,
  reference: Pick<ILibrarySaveReceipt, 'id' | 'version'>,
): ILibrarySaveReceipt {
  return createUnitLibrarySaveReceipt(reference, {
    draft: getEditorDraftFingerprint(editor),
    library: getEditorLibraryFingerprint(editor),
  });
}

/** Compare today's draft to the submitted receipt, including completions after later edits. */
export function getEditorLibrarySavePatch(
  current: UnitSaveEditor,
  receipt: ILibrarySaveReceipt,
): ReturnType<typeof getUnitLibrarySavePatch> {
  return getUnitLibrarySavePatch(receipt, getEditorDraftFingerprint(current));
}

export function getEditorSaveState(
  editor: UnitSaveEditor,
  draft: SaveState['draft'] = 'pending',
): SaveState {
  return getUnitSaveState(
    editor.state,
    editor.state.librarySave ? getEditorLibraryFingerprint(editor) : '',
    draft,
  );
}
