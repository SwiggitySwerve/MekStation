import { createJSONStorage } from 'zustand/middleware';

import { clientSafeStorage } from './utils/clientSafeStorage';

export interface UnitIdentityState {
  name: string;
  chassis: string;
  model: string;
  mulId: string;
  year: number;
  rulesLevel: unknown;
  isModified: boolean;
  lastModifiedAt: number;
}

export interface PersistedUnitIdentityState extends UnitIdentityState {
  readonly id: string;
}

type IdentitySet<TState extends UnitIdentityState> = (
  partial: Partial<TState> | ((state: TState) => Partial<TState>),
) => void;

export type UnitIdentityActions<TState extends UnitIdentityState> = {
  setName: (name: string) => void;
  setChassis: (chassis: string) => void;
  setModel: (model: string) => void;
  setMulId: (mulId: string) => void;
  setYear: (year: number) => void;
  setRulesLevel: (rulesLevel: TState['rulesLevel']) => void;
};

export function modifiedPatch<TPatch extends object>(patch: TPatch) {
  return {
    ...patch,
    isModified: true,
    lastModifiedAt: Date.now(),
  };
}

export function modificationPatch(modified = true) {
  return {
    isModified: modified,
    lastModifiedAt: Date.now(),
  };
}

export function createUnitIdentityActions<TState extends UnitIdentityState>(
  set: IdentitySet<TState>,
): UnitIdentityActions<TState> {
  return {
    setName: (name) => set(modifiedPatch({ name }) as Partial<TState>),

    setChassis: (chassis) =>
      set(
        (state) =>
          modifiedPatch({
            chassis,
            name: `${chassis}${state.model ? ' ' + state.model : ''}`,
          }) as Partial<TState>,
      ),

    setModel: (model) =>
      set(
        (state) =>
          modifiedPatch({
            model,
            name: `${state.chassis}${model ? ' ' + model : ''}`,
          }) as Partial<TState>,
      ),

    setMulId: (mulId) => set(modifiedPatch({ mulId }) as Partial<TState>),

    setYear: (year) => set(modifiedPatch({ year }) as Partial<TState>),

    setRulesLevel: (rulesLevel) =>
      set(modifiedPatch({ rulesLevel }) as Partial<TState>),
  };
}

export function pickPersistedUnitIdentity<
  TState extends PersistedUnitIdentityState,
>(state: TState) {
  return {
    id: state.id,
    name: state.name,
    chassis: state.chassis,
    model: state.model,
    mulId: state.mulId,
    year: state.year,
    rulesLevel: state.rulesLevel,
  };
}

export function pickPersistedUnitIdentityWithClanName<
  TState extends PersistedUnitIdentityState & { clanName: string },
>(state: TState) {
  return {
    ...pickPersistedUnitIdentity(state),
    clanName: state.clanName,
  };
}

export function createUnitStorePersistOptions<
  TState,
  TPersisted extends object,
>(name: string, partialize: (state: TState) => TPersisted) {
  return {
    name,
    storage: createJSONStorage(() => clientSafeStorage),
    skipHydration: true,
    partialize,
  };
}
