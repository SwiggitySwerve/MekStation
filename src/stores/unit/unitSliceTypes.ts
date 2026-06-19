import type { UnitStore } from '../unitState';

export type UnitSliceSetFn = (
  partial: Partial<UnitStore> | ((state: UnitStore) => Partial<UnitStore>),
) => void;

export type UnitSliceGetFn = () => UnitStore;
