import {
  TechBaseMode,
  resolveUnitChassisTechBase,
  pickUnitTechBaseIdentity,
} from '@/types/construction/TechBaseConfiguration';
import {
  AerospaceLocation,
  BattleArmorLocation,
  ProtoMechLocation,
  VehicleLocation,
} from '@/types/construction/UnitLocation';
import { TechBase } from '@/types/enums/TechBase';

import { createDefaultAerospaceState } from '../aerospaceState';
import {
  createAerospaceFromFullState,
  duplicateAerospace,
} from '../aerospaceStoreRegistry';
import { createDefaultBattleArmorState } from '../battleArmorState';
import {
  createBattleArmorFromFullState,
  duplicateBattleArmor,
} from '../battleArmorStoreRegistry';
import { createDefaultInfantryState } from '../infantryState';
import {
  createInfantryFromFullState,
  duplicateInfantry,
} from '../infantryStoreRegistry';
import { createDefaultProtoMechState } from '../protoMechState';
import {
  createProtoMechFromFullState,
  duplicateProtoMech,
} from '../protoMechStoreRegistry';
import {
  getEditorDraftFingerprint,
  getEditorLibraryFingerprint,
  type UnitSaveEditor,
} from '../unitSaveStateAdapters';
import { createDefaultVehicleState } from '../vehicleState';
import {
  createVehicleFromFullState,
  duplicateVehicle,
} from '../vehicleStoreRegistry';
import legacyIdentity from './fixtures/non-mech-tech-base-legacy.json';
import {
  clearNonMechSaveCases,
  nonMechSaveCases,
} from './nonMechSaveState.test-support';

type MountedFamily = 'vehicle' | 'aerospace' | 'battlearmor' | 'protomech';
function mountedEditor(
  family: MountedFamily,
  suffix: string,
  link = `ammo-${suffix}`,
): UnitSaveEditor {
  const options = {
    name: 'Mount test',
    tonnage: 50,
    techBase: TechBase.INNER_SPHERE,
  };
  const mounts = [
    {
      id: `weapon-${suffix}`,
      equipmentId: 'autocannon-5',
      name: 'AC/5',
      linkedAmmoId: link,
    },
    { id: `ammo-${suffix}`, equipmentId: 'ammo-ac5', name: 'AC/5 Ammo' },
  ];
  switch (family) {
    case 'vehicle':
      return {
        store: family,
        state: {
          ...createDefaultVehicleState(options),
          equipment: mounts.map((mount) => ({
            ...mount,
            location: VehicleLocation.FRONT,
            isRearMounted: false,
            isTurretMounted: false,
            isSponsonMounted: false,
          })),
        },
      };
    case 'aerospace':
      return {
        store: family,
        state: {
          ...createDefaultAerospaceState(options),
          equipment: mounts.map((mount) => ({
            ...mount,
            location: AerospaceLocation.NOSE,
          })),
        },
      };
    case 'battlearmor':
      return {
        store: family,
        state: {
          ...createDefaultBattleArmorState(options),
          equipment: mounts.map((mount) => ({
            ...mount,
            location: BattleArmorLocation.BODY,
            isAPMount: false,
            isTurretMounted: false,
            isModular: false,
          })),
        },
      };
    case 'protomech':
      return {
        store: family,
        state: {
          ...createDefaultProtoMechState({ ...options, tonnage: 5 }),
          equipment: mounts.map((mount) => ({
            ...mount,
            location: ProtoMechLocation.TORSO,
          })),
        },
      };
  }
}

it.each<MountedFamily>(['vehicle', 'aerospace', 'battlearmor', 'protomech'])(
  '%s ignores temporary mount IDs while retaining equipment content',
  (family) => {
    const before = mountedEditor(family, 'old');
    const renumbered = mountedEditor(family, 'new');
    expect(getEditorDraftFingerprint(renumbered)).toBe(
      getEditorDraftFingerprint(before),
    );
    expect(getEditorLibraryFingerprint(renumbered)).toBe(
      getEditorLibraryFingerprint(before),
    );
    const renamed = {
      ...renumbered,
      state: { ...renumbered.state, model: 'Edited content' },
    } as UnitSaveEditor;
    expect(getEditorDraftFingerprint(renamed)).not.toBe(
      getEditorDraftFingerprint(before),
    );
    expect(getEditorLibraryFingerprint(renamed)).not.toBe(
      getEditorLibraryFingerprint(before),
    );
  },
);

it.each<MountedFamily>(['vehicle', 'aerospace', 'protomech'])(
  '%s retains changes to external ammunition links',
  (family) => {
    const before = mountedEditor(family, 'same');
    const relinked = mountedEditor(family, 'same', 'external-ammunition');
    expect(getEditorDraftFingerprint(relinked)).not.toBe(
      getEditorDraftFingerprint(before),
    );
    // Some library schemas omit links, but the draft baseline must retain them.
  },
);

describe('non-mech technology identity compatibility', () => {
  beforeEach(clearNonMechSaveCases);
  afterEach(clearNonMechSaveCases);

  it.each(legacyIdentity.cases)(
    '$family retains the captured legacy fingerprints',
    (sample) => {
      const envelope = JSON.parse(sample.rawDraft) as {
        state: UnitSaveEditor['state'];
      };
      const editor = {
        store: sample.family,
        state: envelope.state,
      } as UnitSaveEditor;
      expect(getEditorDraftFingerprint(editor)).toBe(sample.draftFingerprint);
      expect(getEditorLibraryFingerprint(editor)).toBe(
        sample.libraryFingerprint,
      );
      const absent = {
        ...editor,
        state: {
          ...editor.state,
          techBaseMode: undefined,
          chassisTechBase: undefined,
        },
      } as UnitSaveEditor;
      expect(getEditorDraftFingerprint(absent)).toBe(sample.draftFingerprint);
      expect(getEditorLibraryFingerprint(absent)).toBe(
        sample.libraryFingerprint,
      );
    },
  );

  it.each(legacyIdentity.cases)(
    '$family persists meaningful identity in its draft fingerprint',
    (sample) => {
      const envelope = JSON.parse(sample.rawDraft) as {
        state: UnitSaveEditor['state'];
      };
      const editor = {
        store: sample.family,
        state: {
          ...envelope.state,
          techBaseMode: TechBaseMode.MIXED,
          chassisTechBase: TechBase.CLAN,
        },
      } as UnitSaveEditor;
      expect(getEditorDraftFingerprint(editor)).not.toBe(
        sample.draftFingerprint,
      );
      const unknownChassis = {
        ...editor,
        state: { ...editor.state, chassisTechBase: undefined },
      } as UnitSaveEditor;
      expect(getEditorDraftFingerprint(unknownChassis)).not.toBe(
        getEditorDraftFingerprint(editor),
      );
    },
  );

  const identity = {
    techBaseMode: TechBaseMode.MIXED,
    chassisTechBase: TechBase.CLAN,
  };
  it.each(nonMechSaveCases)(
    '$family rehydrates the preserved identity from its browser draft',
    ({ family, create, clear, hydrate }) => {
      const store = create();
      const writeIdentity: (patch: typeof identity) => void = store.setState;
      writeIdentity(identity);
      const raw = localStorage.getItem(
        `megamek-${family}-${store.getState().id}`,
      );
      expect(JSON.parse(raw ?? '{}').state).toMatchObject(identity);
      clear();
      expect(hydrate().getState()).toMatchObject(identity);
    },
  );
  const options = {
    name: 'Mixed identity copy',
    tonnage: 50,
    techBase: TechBase.CLAN,
  };
  const copies = [
    {
      family: 'vehicle',
      create: () =>
        createVehicleFromFullState({
          ...createDefaultVehicleState(options),
          ...identity,
        }),
      duplicate: duplicateVehicle,
    },
    {
      family: 'aerospace',
      create: () =>
        createAerospaceFromFullState({
          ...createDefaultAerospaceState(options),
          ...identity,
        }),
      duplicate: duplicateAerospace,
    },
    {
      family: 'battlearmor',
      create: () =>
        createBattleArmorFromFullState({
          ...createDefaultBattleArmorState(options),
          ...identity,
        }),
      duplicate: duplicateBattleArmor,
    },
    {
      family: 'infantry',
      create: () =>
        createInfantryFromFullState({
          ...createDefaultInfantryState(options),
          ...identity,
        }),
      duplicate: duplicateInfantry,
    },
    {
      family: 'protomech',
      create: () =>
        createProtoMechFromFullState({
          ...createDefaultProtoMechState({ ...options, tonnage: 5 }),
          ...identity,
        }),
      duplicate: duplicateProtoMech,
    },
  ];

  it.each(copies)(
    '$family duplicate retains Mixed mode and its known chassis',
    ({ create, duplicate }) => {
      const source = create();
      const copy = duplicate(source.getState().id);
      expect(copy?.getState()).toMatchObject(identity);
    },
  );
});

describe('the family-owned chassis fact', () => {
  // MegaMek 48fcb2f64 BLKFile.setTechLevel keeps chassis and Mixed designation
  // separate. A binary editor fallback must not become chassis evidence.
  it.each(['INNER_SPHERE', 'CLAN'] as const)(
    'reads %s only from the non-BA component fact',
    (chassis) => {
      expect(
        resolveUnitChassisTechBase('vehicles', {
          componentTechBases: { chassis },
        }),
      ).toBe(chassis === 'CLAN' ? TechBase.CLAN : TechBase.INNER_SPHERE);
    },
  );
  it.each([true, false])(
    'BA reads clanChassis=%s even with a conflicting component fact',
    (clanChassis) => {
      expect(
        resolveUnitChassisTechBase('battlearmor', {
          clanChassis,
          componentTechBases: {
            chassis: clanChassis ? 'INNER_SPHERE' : 'CLAN',
          },
        }),
      ).toBe(clanChassis ? TechBase.CLAN : TechBase.INNER_SPHERE);
    },
  );
  it("does not borrow the other family's fact or invent an absent chassis", () => {
    expect(
      resolveUnitChassisTechBase('battlearmor', {
        componentTechBases: { chassis: 'CLAN' },
      }),
    ).toBeUndefined();
    expect(
      resolveUnitChassisTechBase('vehicles', { clanChassis: true }),
    ).toBeUndefined();
    expect(resolveUnitChassisTechBase('aerospace', {})).toBeUndefined();
    expect(
      resolveUnitChassisTechBase('infantry', {
        componentTechBases: { chassis: 'MIXED' },
      }),
    ).toBeUndefined();
    expect(
      resolveUnitChassisTechBase('battlearmor', { clanChassis: 'false' }),
    ).toBeUndefined();
    expect(
      pickUnitTechBaseIdentity({
        techBaseMode: undefined,
        chassisTechBase: undefined,
      }),
    ).toEqual({});
  });
});
