import type { IEquipmentItem } from '@/types/equipment';

import { generateUnitId } from '@/utils/uuid';

import { modifiedPatch } from './unitStoreIdentityActions';

export type EquipmentIdSelector<TEquipment> = (equipment: TEquipment) => string;

export type StoreEquipmentCollectionActions<
  TLocation,
  TAddExtra extends readonly unknown[] = [],
> = {
  addEquipment: (
    item: IEquipmentItem,
    location?: TLocation,
    ...extra: TAddExtra
  ) => string;
  removeEquipment: (instanceId: string) => void;
  linkAmmo: (
    weaponInstanceId: string,
    ammoInstanceId: string | undefined,
  ) => void;
  clearAllEquipment: () => void;
};

export type StoreEquipmentActions<
  TLocation,
  TAddExtra extends readonly unknown[] = [],
  TUpdateExtra extends readonly unknown[] = [],
> = StoreEquipmentCollectionActions<TLocation, TAddExtra> & {
  updateEquipmentLocation: (
    instanceId: string,
    location: TLocation,
    ...extra: TUpdateExtra
  ) => void;
};

export interface EquipmentListState<TEquipment> {
  equipment: readonly TEquipment[];
}

type EquipmentMutationPatch<TEquipment> = {
  equipment: TEquipment[];
  isModified: boolean;
  lastModifiedAt: number;
};

type EquipmentStoreSet<TEquipment> = (
  partial:
    | EquipmentMutationPatch<TEquipment>
    | ((
        state: EquipmentListState<TEquipment>,
      ) => EquipmentMutationPatch<TEquipment>),
) => void;

export function addGeneratedMountedEquipment<TEquipment>(
  set: EquipmentStoreSet<TEquipment>,
  createMountedEquipment: (instanceId: string) => TEquipment,
): string {
  const instanceId = generateUnitId();
  const mountedEquipment = createMountedEquipment(instanceId);

  set((state) => addMountedEquipment(state, mountedEquipment));

  return instanceId;
}

export function addMountedEquipment<TEquipment>(
  state: EquipmentListState<TEquipment>,
  equipment: TEquipment,
): EquipmentMutationPatch<TEquipment> {
  return modifiedPatch({
    equipment: [...state.equipment, equipment],
  });
}

export function removeMountedEquipment<TEquipment>(
  state: EquipmentListState<TEquipment>,
  instanceId: string,
  selectId: EquipmentIdSelector<TEquipment>,
): EquipmentMutationPatch<TEquipment> {
  return modifiedPatch({
    equipment: state.equipment.filter(
      (equipment) => selectId(equipment) !== instanceId,
    ),
  });
}

export function updateMountedEquipment<TEquipment>(
  state: EquipmentListState<TEquipment>,
  instanceId: string,
  selectId: EquipmentIdSelector<TEquipment>,
  update: (equipment: TEquipment) => TEquipment,
): EquipmentMutationPatch<TEquipment> {
  return modifiedPatch({
    equipment: state.equipment.map((equipment) =>
      selectId(equipment) === instanceId ? update(equipment) : equipment,
    ),
  });
}

export function linkMountedAmmo<TEquipment extends object>(
  state: EquipmentListState<TEquipment>,
  weaponInstanceId: string,
  ammoInstanceId: string | undefined,
  selectId: EquipmentIdSelector<TEquipment>,
): EquipmentMutationPatch<TEquipment> {
  return updateMountedEquipment(
    state,
    weaponInstanceId,
    selectId,
    (equipment) => ({
      ...equipment,
      linkedAmmoId: ammoInstanceId,
    }),
  );
}

export function clearMountedEquipment<TEquipment>(
  equipment: readonly TEquipment[] = [],
): EquipmentMutationPatch<TEquipment> {
  return modifiedPatch({ equipment: [...equipment] });
}
