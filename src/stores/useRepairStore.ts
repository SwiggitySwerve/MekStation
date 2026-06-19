/**
 * Repair Store
 *
 * Zustand store for managing repair state in campaigns.
 * Uses localStorage for persistence initially.
 *
 * @spec openspec/changes/add-repair-system/specs/repair/spec.md
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

import type { RepairStore } from './useRepairStore.types';

import { createRepairStoreActions } from './useRepairStore.storeActions';

export const useRepairStore = create<RepairStore>()(
  persist(
    (set, get) => ({
      jobsByCampaign: {},
      baysByCampaign: {},
      salvageByCampaign: {},
      selectedJobId: null,
      isLoading: false,
      error: null,
      ...createRepairStoreActions(set, get),
    }),
    {
      name: 'mekstation-repairs',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        jobsByCampaign: state.jobsByCampaign,
        baysByCampaign: state.baysByCampaign,
        salvageByCampaign: state.salvageByCampaign,
      }),
    },
  ),
);

export function useRepairSelector<T>(selector: (state: RepairStore) => T): T {
  return useRepairStore(selector);
}
