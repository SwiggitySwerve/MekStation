/**
 * Unit Structure Store - Identity Actions
 *
 * Actions for setting unit identity fields:
 * name, chassis, clanName, model, mulId, year, rulesLevel
 */

import type { RulesLevel } from '@/types/enums/RulesLevel';

import type { UnitStore } from '../unitState';

type SetFn = (
  partial: Partial<UnitStore> | ((state: UnitStore) => Partial<UnitStore>),
) => void;

export interface IdentityActions {
  setName: (name: string) => void;
  setChassis: (chassis: string) => void;
  setClanName: (clanName: string) => void;
  setModel: (model: string) => void;
  setMulId: (mulId: string) => void;
  setYear: (year: number) => void;
  setRulesLevel: (rulesLevel: RulesLevel) => void;
}

export function createIdentityActions(set: SetFn): IdentityActions {
  return {
    setName: (name) =>
      set({
        name,
        isModified: true,
        lastModifiedAt: Date.now(),
      }),

    setChassis: (chassis) =>
      set((state) => ({
        chassis,
        name: `${chassis}${state.model ? ' ' + state.model : ''}`,
        isModified: true,
        lastModifiedAt: Date.now(),
      })),

    setClanName: (clanName) =>
      set({
        clanName,
        isModified: true,
        lastModifiedAt: Date.now(),
      }),

    setModel: (model) =>
      set((state) => ({
        model,
        name: `${state.chassis}${model ? ' ' + model : ''}`,
        isModified: true,
        lastModifiedAt: Date.now(),
      })),

    setMulId: (mulId) =>
      set({
        mulId,
        isModified: true,
        lastModifiedAt: Date.now(),
      }),

    setYear: (year) =>
      set({
        year,
        isModified: true,
        lastModifiedAt: Date.now(),
      }),

    setRulesLevel: (rulesLevel) =>
      set({
        rulesLevel,
        isModified: true,
        lastModifiedAt: Date.now(),
      }),
  };
}
