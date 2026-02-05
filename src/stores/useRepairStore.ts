/**
 * Repair Store
 *
 * Zustand store for managing repair state in campaigns.
 * Uses localStorage for persistence initially.
 *
 * @spec openspec/changes/add-repair-system/specs/repair/spec.md
 */

import { v4 as uuidv4 } from 'uuid';
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

import {
  IRepairJob,
  IRepairBay,
  IDamageAssessment,
  ISalvageInventory,
  ISalvagedPart,
  IFieldRepairResult,
  IRepairJobValidationResult,
  RepairJobStatus,
  DEFAULT_REPAIR_BAY,
  generateRepairItems,
  calculateTotalRepairCost,
  calculateTotalRepairTime,
  calculateFieldRepair,
  validateRepairJob,
  sortJobsByPriority,
  findMatchingSalvage,
} from '@/types/repair';

// =============================================================================
// Store State
// =============================================================================

interface RepairStoreState {
  /** Repair jobs by campaign ID */
  jobsByCampaign: Record<string, IRepairJob[]>;
  /** Repair bay config by campaign ID */
  baysByCampaign: Record<string, IRepairBay>;
  /** Salvage inventory by campaign ID */
  salvageByCampaign: Record<string, ISalvageInventory>;
  /** Currently selected job ID */
  selectedJobId: string | null;
  /** Loading state */
  isLoading: boolean;
  /** Error message */
  error: string | null;
}

interface RepairStoreActions {
  // Job Management
  /** Create a repair job from damage assessment */
  createRepairJob: (
    campaignId: string,
    assessment: IDamageAssessment,
    armorType?: string,
    structureType?: string,
  ) => string;
  /** Get all jobs for a campaign */
  getJobs: (campaignId: string) => readonly IRepairJob[];
  /** Get a specific job */
  getJob: (campaignId: string, jobId: string) => IRepairJob | undefined;
  /** Update a repair job */
  updateJob: (
    campaignId: string,
    jobId: string,
    updates: Partial<IRepairJob>,
  ) => boolean;
  /** Delete a repair job */
  deleteJob: (campaignId: string, jobId: string) => boolean;
  /** Select/deselect repair items in a job */
  toggleRepairItem: (
    campaignId: string,
    jobId: string,
    itemId: string,
  ) => boolean;
  /** Select all items in a job */
  selectAllItems: (campaignId: string, jobId: string) => boolean;
  /** Deselect all items in a job */
  deselectAllItems: (campaignId: string, jobId: string) => boolean;

  // Queue Management
  /** Start a repair job */
  startJob: (campaignId: string, jobId: string) => boolean;
  /** Complete a repair job */
  completeJob: (campaignId: string, jobId: string) => boolean;
  /** Cancel a repair job */
  cancelJob: (campaignId: string, jobId: string) => boolean;
  /** Reorder jobs in queue */
  reorderJobs: (campaignId: string, jobIds: string[]) => boolean;
  /** Set job priority */
  setJobPriority: (
    campaignId: string,
    jobId: string,
    priority: number,
  ) => boolean;
  /** Get pending jobs sorted by priority */
  getPendingJobs: (campaignId: string) => readonly IRepairJob[];
  /** Get active (in-progress) jobs */
  getActiveJobs: (campaignId: string) => readonly IRepairJob[];

  // Repair Bay
  /** Get repair bay for a campaign */
  getRepairBay: (campaignId: string) => IRepairBay;
  /** Update repair bay config */
  updateRepairBay: (
    campaignId: string,
    updates: Partial<IRepairBay>,
  ) => boolean;
  /** Process repair bay (advance time) */
  advanceRepairs: (
    campaignId: string,
    hoursElapsed: number,
  ) => readonly string[];

  // Field Repairs
  /** Apply field repair to a unit */
  applyFieldRepair: (
    campaignId: string,
    assessment: IDamageAssessment,
    availableSupplies: number,
  ) => IFieldRepairResult;

  // Salvage
  /** Get salvage inventory for a campaign */
  getSalvage: (campaignId: string) => ISalvageInventory;
  /** Add salvaged parts */
  addSalvage: (campaignId: string, parts: readonly ISalvagedPart[]) => boolean;
  /** Use salvage for repair */
  useSalvageForRepair: (
    campaignId: string,
    jobId: string,
    itemId: string,
    partId: string,
  ) => boolean;
  /** Remove salvage part */
  removeSalvage: (campaignId: string, partId: string) => boolean;

  // Validation
  /** Validate a repair job */
  validateJob: (
    campaignId: string,
    jobId: string,
    availableCBills: number,
    availableSupplies: number,
  ) => IRepairJobValidationResult;

  // Selection
  /** Select a job */
  selectJob: (jobId: string | null) => void;
  /** Get selected job */
  getSelectedJob: (campaignId: string) => IRepairJob | null;

  // Utility
  /** Clear error */
  clearError: () => void;
  /** Initialize campaign repair data */
  initializeCampaign: (campaignId: string) => void;
}

type RepairStore = RepairStoreState & RepairStoreActions;

// =============================================================================
// Helper Functions
// =============================================================================

function recalculateJobTotals(job: IRepairJob): IRepairJob {
  // Preserve timeRemainingHours for InProgress and Completed jobs
  const preserveTime =
    job.status === RepairJobStatus.InProgress ||
    job.status === RepairJobStatus.Completed;
  return {
    ...job,
    totalCost: calculateTotalRepairCost(job.items),
    totalTimeHours: calculateTotalRepairTime(job.items),
    timeRemainingHours: preserveTime
      ? job.timeRemainingHours
      : calculateTotalRepairTime(job.items),
  };
}

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

        const items = generateRepairItems(assessment, armorType, structureType);
        const jobId = uuidv4();
        const now = new Date().toISOString();

        const existingJobs = get().jobsByCampaign[campaignId] ?? [];
        const maxPriority = existingJobs.reduce(
          (max, j) => Math.max(max, j.priority),
          0,
        );

        const job: IRepairJob = {
          id: jobId,
          unitId: assessment.unitId,
          unitName: assessment.unitName,
          campaignId,
          status: RepairJobStatus.Pending,
          items,
          totalCost: calculateTotalRepairCost(items),
          totalTimeHours: calculateTotalRepairTime(items),
          timeRemainingHours: calculateTotalRepairTime(items),
          priority: maxPriority + 1,
          createdAt: now,
        };

        set((state) => ({
          jobsByCampaign: {
            ...state.jobsByCampaign,
            [campaignId]: [...(state.jobsByCampaign[campaignId] ?? []), job],
          },
        }));

        return jobId;
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

        if (job.status !== RepairJobStatus.Pending) {
          set({ error: `Job is not pending: ${job.status}` });
          return false;
        }

        const bay = get().getRepairBay(campaignId);
        if (bay.activeJobs.length >= bay.capacity) {
          set({ error: 'Repair bay at capacity' });
          return false;
        }

        // Update job status
        get().updateJob(campaignId, jobId, {
          status: RepairJobStatus.InProgress,
          startedAt: new Date().toISOString(),
        });

        // Add to active jobs in bay
        set((state) => ({
          baysByCampaign: {
            ...state.baysByCampaign,
            [campaignId]: {
              ...bay,
              activeJobs: [...bay.activeJobs, jobId],
              queuedJobs: bay.queuedJobs.filter((id) => id !== jobId),
            },
          },
        }));

        return true;
      },

      // Complete job
      completeJob: (campaignId: string, jobId: string) => {
        const job = get().getJob(campaignId, jobId);
        if (!job) return false;

        get().updateJob(campaignId, jobId, {
          status: RepairJobStatus.Completed,
          completedAt: new Date().toISOString(),
          timeRemainingHours: 0,
        });

        // Remove from active jobs
        const bay = get().getRepairBay(campaignId);
        set((state) => ({
          baysByCampaign: {
            ...state.baysByCampaign,
            [campaignId]: {
              ...bay,
              activeJobs: bay.activeJobs.filter((id) => id !== jobId),
            },
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

        // Remove from bay
        const bay = get().getRepairBay(campaignId);
        set((state) => ({
          baysByCampaign: {
            ...state.baysByCampaign,
            [campaignId]: {
              ...bay,
              activeJobs: bay.activeJobs.filter((id) => id !== jobId),
              queuedJobs: bay.queuedJobs.filter((id) => id !== jobId),
            },
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
        const completedJobIds: string[] = [];

        // Process active jobs
        const updatedJobs = jobs.map((job) => {
          if (job.status !== RepairJobStatus.InProgress) return job;

          const adjustedHours = hoursElapsed * bay.efficiency;
          const newTimeRemaining = Math.max(
            0,
            job.timeRemainingHours - adjustedHours,
          );

          if (newTimeRemaining === 0) {
            completedJobIds.push(job.id);
            return {
              ...job,
              status: RepairJobStatus.Completed,
              timeRemainingHours: 0,
              completedAt: new Date().toISOString(),
            };
          }

          return {
            ...job,
            timeRemainingHours: newTimeRemaining,
          };
        });

        set((state) => ({
          jobsByCampaign: {
            ...state.jobsByCampaign,
            [campaignId]: updatedJobs,
          },
          baysByCampaign: {
            ...state.baysByCampaign,
            [campaignId]: {
              ...bay,
              activeJobs: bay.activeJobs.filter(
                (id) => !completedJobIds.includes(id),
              ),
            },
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

        const newParts = [...inventory.parts, ...parts];
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

        const item = job.items.find((i) => i.id === itemId);
        const part = inventory.parts.find((p) => p.id === partId);

        if (!item || !part) return false;

        // Check if part matches
        const matchingPart = findMatchingSalvage(item, inventory);
        if (!matchingPart || matchingPart.id !== partId) {
          set({ error: 'Salvage part does not match repair item' });
          return false;
        }

        // Update item cost to 0 and remove from salvage
        const updatedItems = job.items.map((i) =>
          i.id === itemId ? { ...i, cost: 0 } : i,
        );

        get().updateJob(campaignId, jobId, { items: updatedItems });
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
        if (!job) {
          return {
            valid: false,
            errors: [`Job not found: ${jobId}`],
            warnings: [],
            canAfford: false,
            shortfall: 0,
          };
        }

        return validateRepairJob(job, availableCBills, availableSupplies);
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
