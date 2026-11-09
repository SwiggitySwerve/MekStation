import {
  AerospaceLocation,
  BattleArmorLocation,
  ProtoMechLocation,
  VehicleLocation,
} from '@/types/construction/UnitLocation';
import { TechBase } from '@/types/enums/TechBase';

import { createDefaultAerospaceState } from '../aerospaceState';
import { createDefaultBattleArmorState } from '../battleArmorState';
import { createDefaultProtoMechState } from '../protoMechState';
import {
  getEditorDraftFingerprint,
  getEditorLibraryFingerprint,
  type UnitSaveEditor,
} from '../unitSaveStateAdapters';
import { createDefaultVehicleState } from '../vehicleState';

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
