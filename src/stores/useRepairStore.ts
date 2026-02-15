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

import {
  IRepairJob,
  IRepairBay,
  IDamageAssessment,
  ISalvagedPart,
  RepairJobStatus,
  DEFAULT_REPAIR_BAY,
  calculateFieldRepair,
  sortJobsByPriority,
} from '@/types/repair';

import type { RepairStore } from './useRepairStore.types';

import {
  createRepairJobLogic,
  startJobLogic,
  completeJobLogic,
  advanceRepairsLogic,
  cancelJobLogic,
  addSalvageLogic,
  useSalvageForRepairLogic,
  validateJobLogic,
} from './useRepairStore.actions';
import { recalculateJobTotals } from './useRepairStore.helpers';

// =============================================================================
// Store Implementation
// =============================================================================

export const useRepairStore = create<RepairStore>()(
  persist(
    (set, get) => ({
      // State
      jobsByCampaign: {},
      baysByCampaign: {},
      salvageByCampaign: {},
      selectedJobId: null,
      isLoading: false,
      error: null,

      // Initialize campaign
      initializeCampaign: (campaignId: string) => {
        const state = get();
        if (!state.jobsByCampaign[campaignId]) {
          set({
            jobsByCampaign: {
              ...state.jobsByCampaign,
              [campaignId]: [],
            },
            baysByCampaign: {
              ...state.baysByCampaign,
              [campaignId]: { ...DEFAULT_REPAIR_BAY },
            },
            salvageByCampaign: {
              ...state.salvageByCampaign,
              [campaignId]: { parts: [], totalValue: 0 },
            },
          });
        }
      },

      // Create repair job
      createRepairJob: (
        campaignId: string,
        assessment: IDamageAssessment,
        armorType?: string,
        structureType?: string,
      ) => {
        get().initializeCampaign(campaignId);

        const existingJobs = get().jobsByCampaign[campaignId] ?? [];
        const job = createRepairJobLogic(
          campaignId,
          assessment,
          armorType,
          structureType,
          existingJobs,
        );

        set((state) => ({
          jobsByCampaign: {
            ...state.jobsByCampaign,
            [campaignId]: [...(state.jobsByCampaign[campaignId] ?? []), job],
          },
        }));

        return job.id;
      },

      // Get jobs
      getJobs: (campaignId: string) => {
        return get().jobsByCampaign[campaignId] ?? [];
      },

      // Get job
      getJob: (campaignId: string, jobId: string) => {
        return get().jobsByCampaign[campaignId]?.find((j) => j.id === jobId);
      },

      // Update job
      updateJob: (
        campaignId: string,
        jobId: string,
        updates: Partial<IRepairJob>,
      ) => {
        const jobs = get().jobsByCampaign[campaignId];
        if (!jobs) {
          set({ error: `Campaign not found: ${campaignId}` });
          return false;
        }

        const jobIndex = jobs.findIndex((j) => j.id === jobId);
        if (jobIndex === -1) {
          set({ error: `Job not found: ${jobId}` });
          return false;
        }

        const updatedJob = recalculateJobTotals({
          ...jobs[jobIndex],
          ...updates,
        });
        const updatedJobs = [...jobs];
        updatedJobs[jobIndex] = updatedJob;

        set((state) => ({
          jobsByCampaign: {
            ...state.jobsByCampaign,
            [campaignId]: updatedJobs,
          },
        }));

        return true;
      },

      // Delete job
      deleteJob: (campaignId: string, jobId: string) => {
        const jobs = get().jobsByCampaign[campaignId];
        if (!jobs) return false;

        set((state) => ({
          jobsByCampaign: {
            ...state.jobsByCampaign,
            [campaignId]: jobs.filter((j) => j.id !== jobId),
          },
          selectedJobId:
            state.selectedJobId === jobId ? null : state.selectedJobId,
        }));

        return true;
      },

      // Toggle repair item
      toggleRepairItem: (campaignId: string, jobId: string, itemId: string) => {
        const job = get().getJob(campaignId, jobId);
        if (!job) return false;

        const updatedItems = job.items.map((item) =>
          item.id === itemId ? { ...item, selected: !item.selected } : item,
        );

        return get().updateJob(campaignId, jobId, { items: updatedItems });
      },

      // Select all items
      selectAllItems: (campaignId: string, jobId: string) => {
        const job = get().getJob(campaignId, jobId);
        if (!job) return false;

        const updatedItems = job.items.map((item) => ({
          ...item,
          selected: true,
        }));
        return get().updateJob(campaignId, jobId, { items: updatedItems });
      },

      // Deselect all items
      deselectAllItems: (campaignId: string, jobId: string) => {
        const job = get().getJob(campaignId, jobId);
        if (!job) return false;

        const updatedItems = job.items.map((item) => ({
          ...item,
          selected: false,
        }));
        return get().updateJob(campaignId, jobId, { items: updatedItems });
      },

      // Start job
      startJob: (campaignId: string, jobId: string) => {
        const job = get().getJob(campaignId, jobId);
        if (!job) return false;

        const bay = get().getRepairBay(campaignId);
        const result = startJobLogic(job, bay);

        if (!result.success) {
          set({ error: result.error });
          return false;
        }

        // Update job status
        get().updateJob(campaignId, jobId, result.updates!.job);

        // Add to active jobs in bay
        set((state) => ({
          baysByCampaign: {
            ...state.baysByCampaign,
            [campaignId]: {
              ...state.baysByCampaign[campaignId],
              ...result.updates!.bay,
            },
          },
        }));

        return true;
      },

      // Complete job
      completeJob: (campaignId: string, jobId: string) => {
        const job = get().getJob(campaignId, jobId);
        if (!job) return false;

        const bay = get().getRepairBay(campaignId);
        const { job: jobUpdates, bay: bayUpdates } = completeJobLogic(
          jobId,
          bay,
        );

        get().updateJob(campaignId, jobId, jobUpdates);

        set((state) => ({
          baysByCampaign: {
            ...state.baysByCampaign,
            [campaignId]: bayUpdates,
          },
        }));

        return true;
      },

      // Cancel job
      cancelJob: (campaignId: string, jobId: string) => {
        const job = get().getJob(campaignId, jobId);
        if (!job) return false;

        get().updateJob(campaignId, jobId, {
          status: RepairJobStatus.Cancelled,
        });

        const bay = get().getRepairBay(campaignId);
        const updatedBay = cancelJobLogic(jobId, bay);

        set((state) => ({
          baysByCampaign: {
            ...state.baysByCampaign,
            [campaignId]: updatedBay,
          },
        }));

        return true;
      },

      // Reorder jobs
      reorderJobs: (campaignId: string, jobIds: string[]) => {
        const jobs = get().jobsByCampaign[campaignId];
        if (!jobs) return false;

        const updatedJobs = jobs.map((job) => {
          const newPriority = jobIds.indexOf(job.id);
          return newPriority >= 0 ? { ...job, priority: newPriority } : job;
        });

        set((state) => ({
          jobsByCampaign: {
            ...state.jobsByCampaign,
            [campaignId]: updatedJobs,
          },
        }));

        return true;
      },

      // Set job priority
      setJobPriority: (campaignId: string, jobId: string, priority: number) => {
        return get().updateJob(campaignId, jobId, { priority });
      },

      // Get pending jobs
      getPendingJobs: (campaignId: string) => {
        const jobs = get().jobsByCampaign[campaignId] ?? [];
        return sortJobsByPriority(
          jobs.filter((j) => j.status === RepairJobStatus.Pending),
        );
      },

      // Get active jobs
      getActiveJobs: (campaignId: string) => {
        const jobs = get().jobsByCampaign[campaignId] ?? [];
        return jobs.filter((j) => j.status === RepairJobStatus.InProgress);
      },

      // Get repair bay
      getRepairBay: (campaignId: string) => {
        return get().baysByCampaign[campaignId] ?? { ...DEFAULT_REPAIR_BAY };
      },

      // Update repair bay
      updateRepairBay: (campaignId: string, updates: Partial<IRepairBay>) => {
        const bay = get().getRepairBay(campaignId);
        set((state) => ({
          baysByCampaign: {
            ...state.baysByCampaign,
            [campaignId]: { ...bay, ...updates },
          },
        }));
        return true;
      },

      // Advance repairs (time passes)
      advanceRepairs: (campaignId: string, hoursElapsed: number) => {
        const jobs = get().jobsByCampaign[campaignId] ?? [];
        const bay = get().getRepairBay(campaignId);

        const { updatedJobs, completedJobIds, updatedBay } =
          advanceRepairsLogic(jobs, bay, hoursElapsed);

        set((state) => ({
          jobsByCampaign: {
            ...state.jobsByCampaign,
            [campaignId]: updatedJobs,
          },
          baysByCampaign: {
            ...state.baysByCampaign,
            [campaignId]: updatedBay,
          },
        }));

        return completedJobIds;
      },

      // Apply field repair
      applyFieldRepair: (
        campaignId: string,
        assessment: IDamageAssessment,
        availableSupplies: number,
      ) => {
        return calculateFieldRepair(assessment, availableSupplies);
      },

      // Get salvage
      getSalvage: (campaignId: string) => {
        return (
          get().salvageByCampaign[campaignId] ?? { parts: [], totalValue: 0 }
        );
      },

      // Add salvage
      addSalvage: (campaignId: string, parts: readonly ISalvagedPart[]) => {
        get().initializeCampaign(campaignId);
        const inventory = get().getSalvage(campaignId);
        const updatedInventory = addSalvageLogic(inventory, parts);

        set((state) => ({
          salvageByCampaign: {
            ...state.salvageByCampaign,
            [campaignId]: updatedInventory,
          },
        }));

        return true;
      },

      // Use salvage for repair
      useSalvageForRepair: (
        campaignId: string,
        jobId: string,
        itemId: string,
        partId: string,
      ) => {
        const job = get().getJob(campaignId, jobId);
        const inventory = get().getSalvage(campaignId);

        if (!job) return false;

        // eslint-disable-next-line react-hooks/rules-of-hooks
        const result = useSalvageForRepairLogic(job, itemId, partId, inventory);

        if (!result.success) {
          set({ error: result.error });
          return false;
        }

        get().updateJob(campaignId, jobId, { items: result.updatedItems! });
        get().removeSalvage(campaignId, partId);

        return true;
      },

      // Remove salvage
      removeSalvage: (campaignId: string, partId: string) => {
        const inventory = get().getSalvage(campaignId);
        const newParts = inventory.parts.filter((p) => p.id !== partId);
        const totalValue = newParts.reduce(
          (sum, p) => sum + p.estimatedValue,
          0,
        );

        set((state) => ({
          salvageByCampaign: {
            ...state.salvageByCampaign,
            [campaignId]: { parts: newParts, totalValue },
          },
        }));

        return true;
      },

      // Validate job
      validateJob: (
        campaignId: string,
        jobId: string,
        availableCBills: number,
        availableSupplies: number,
      ) => {
        const job = get().getJob(campaignId, jobId);
        return validateJobLogic(job, jobId, availableCBills, availableSupplies);
      },

      // Select job
      selectJob: (jobId: string | null) => {
        set({ selectedJobId: jobId });
      },

      // Get selected job
      getSelectedJob: (campaignId: string) => {
        const { selectedJobId } = get();
        if (!selectedJobId) return null;
        return get().getJob(campaignId, selectedJobId) ?? null;
      },

      // Clear error
      clearError: () => {
        set({ error: null });
      },
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
