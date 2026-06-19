import type { StateCreator } from 'zustand';

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
  addSalvageLogic,
  advanceRepairsLogic,
  cancelJobLogic,
  completeJobLogic,
  createRepairJobLogic,
  startJobLogic,
  applySalvageForRepairLogic,
  validateJobLogic,
} from './useRepairStore.actions';
import { recalculateJobTotals } from './useRepairStore.helpers';

type RepairSet = Parameters<StateCreator<RepairStore>>[0];
type RepairGet = Parameters<StateCreator<RepairStore>>[1];

function initializeCampaignAction(
  set: RepairSet,
  get: RepairGet,
): RepairStore['initializeCampaign'] {
  return (campaignId: string) => {
    const state = get();
    if (state.jobsByCampaign[campaignId]) {
      return;
    }
    set({
      jobsByCampaign: { ...state.jobsByCampaign, [campaignId]: [] },
      baysByCampaign: {
        ...state.baysByCampaign,
        [campaignId]: { ...DEFAULT_REPAIR_BAY },
      },
      salvageByCampaign: {
        ...state.salvageByCampaign,
        [campaignId]: { parts: [], totalValue: 0 },
      },
    });
  };
}

function createRepairJobAction(
  set: RepairSet,
  get: RepairGet,
): RepairStore['createRepairJob'] {
  return (
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
    setJobsForCampaign(set, campaignId, [...existingJobs, job]);
    return job.id;
  };
}

function updateJobAction(
  set: RepairSet,
  get: RepairGet,
): RepairStore['updateJob'] {
  return (campaignId: string, jobId: string, updates: Partial<IRepairJob>) => {
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
    const updatedJobs = [...jobs];
    updatedJobs[jobIndex] = recalculateJobTotals({
      ...jobs[jobIndex],
      ...updates,
    });
    setJobsForCampaign(set, campaignId, updatedJobs);
    return true;
  };
}

function setJobsForCampaign(
  set: RepairSet,
  campaignId: string,
  jobs: IRepairJob[],
): void {
  set((state) => ({
    jobsByCampaign: { ...state.jobsByCampaign, [campaignId]: jobs },
  }));
}

function deleteJobAction(
  set: RepairSet,
  get: RepairGet,
): RepairStore['deleteJob'] {
  return (campaignId: string, jobId: string) => {
    const jobs = get().jobsByCampaign[campaignId];
    if (!jobs) return false;
    set((state) => ({
      jobsByCampaign: {
        ...state.jobsByCampaign,
        [campaignId]: jobs.filter((j) => j.id !== jobId),
      },
      selectedJobId: state.selectedJobId === jobId ? null : state.selectedJobId,
    }));
    return true;
  };
}

function updateRepairItems(
  get: RepairGet,
  campaignId: string,
  jobId: string,
  mapItem: IRepairJob['items'][number] extends infer T ? (item: T) => T : never,
): boolean {
  const job = get().getJob(campaignId, jobId);
  if (!job) return false;
  return get().updateJob(campaignId, jobId, { items: job.items.map(mapItem) });
}

function startJobAction(
  set: RepairSet,
  get: RepairGet,
): RepairStore['startJob'] {
  return (campaignId: string, jobId: string) => {
    const job = get().getJob(campaignId, jobId);
    if (!job) return false;
    const result = startJobLogic(job, get().getRepairBay(campaignId));
    if (!result.success) {
      set({ error: result.error });
      return false;
    }
    get().updateJob(campaignId, jobId, result.updates!.job);
    setBay(set, campaignId, result.updates!.bay as IRepairBay);
    return true;
  };
}

function completeJobAction(
  set: RepairSet,
  get: RepairGet,
): RepairStore['completeJob'] {
  return (campaignId: string, jobId: string) => {
    const job = get().getJob(campaignId, jobId);
    if (!job) return false;
    const { job: jobUpdates, bay: bayUpdates } = completeJobLogic(
      jobId,
      get().getRepairBay(campaignId),
    );
    get().updateJob(campaignId, jobId, jobUpdates);
    setBay(set, campaignId, bayUpdates);
    return true;
  };
}

function cancelJobAction(
  set: RepairSet,
  get: RepairGet,
): RepairStore['cancelJob'] {
  return (campaignId: string, jobId: string) => {
    const job = get().getJob(campaignId, jobId);
    if (!job) return false;
    get().updateJob(campaignId, jobId, { status: RepairJobStatus.Cancelled });
    setBay(
      set,
      campaignId,
      cancelJobLogic(jobId, get().getRepairBay(campaignId)),
    );
    return true;
  };
}

function setBay(
  set: RepairSet,
  campaignId: string,
  bay: Partial<IRepairBay> | IRepairBay,
): void {
  set((state) => ({
    baysByCampaign: {
      ...state.baysByCampaign,
      [campaignId]: {
        ...(state.baysByCampaign[campaignId] ?? DEFAULT_REPAIR_BAY),
        ...bay,
      },
    },
  }));
}

function advanceRepairsAction(
  set: RepairSet,
  get: RepairGet,
): RepairStore['advanceRepairs'] {
  return (campaignId: string, hoursElapsed: number) => {
    const jobs = get().jobsByCampaign[campaignId] ?? [];
    const { updatedJobs, completedJobIds, updatedBay } = advanceRepairsLogic(
      jobs,
      get().getRepairBay(campaignId),
      hoursElapsed,
    );
    setJobsForCampaign(set, campaignId, updatedJobs);
    setBay(set, campaignId, updatedBay);
    return completedJobIds;
  };
}

function addSalvageAction(
  set: RepairSet,
  get: RepairGet,
): RepairStore['addSalvage'] {
  return (campaignId: string, parts: readonly ISalvagedPart[]) => {
    get().initializeCampaign(campaignId);
    const updatedInventory = addSalvageLogic(
      get().getSalvage(campaignId),
      parts,
    );
    set((state) => ({
      salvageByCampaign: {
        ...state.salvageByCampaign,
        [campaignId]: updatedInventory,
      },
    }));
    return true;
  };
}

function createSalvageForRepairAction(
  set: RepairSet,
  get: RepairGet,
): RepairStore['useSalvageForRepair'] {
  return (
    campaignId: string,
    jobId: string,
    itemId: string,
    partId: string,
  ) => {
    const job = get().getJob(campaignId, jobId);
    if (!job) return false;
    const result = applySalvageForRepairLogic(
      job,
      itemId,
      partId,
      get().getSalvage(campaignId),
    );
    if (!result.success) {
      set({ error: result.error });
      return false;
    }
    get().updateJob(campaignId, jobId, { items: result.updatedItems! });
    get().removeSalvage(campaignId, partId);
    return true;
  };
}

function removeSalvageAction(
  set: RepairSet,
  get: RepairGet,
): RepairStore['removeSalvage'] {
  return (campaignId: string, partId: string) => {
    const newParts = get()
      .getSalvage(campaignId)
      .parts.filter((p) => p.id !== partId);
    set((state) => ({
      salvageByCampaign: {
        ...state.salvageByCampaign,
        [campaignId]: {
          parts: newParts,
          totalValue: newParts.reduce((sum, p) => sum + p.estimatedValue, 0),
        },
      },
    }));
    return true;
  };
}

export function createRepairStoreActions(
  set: RepairSet,
  get: RepairGet,
): Omit<
  RepairStore,
  | 'jobsByCampaign'
  | 'baysByCampaign'
  | 'salvageByCampaign'
  | 'selectedJobId'
  | 'isLoading'
  | 'error'
> {
  return {
    initializeCampaign: initializeCampaignAction(set, get),
    createRepairJob: createRepairJobAction(set, get),
    getJobs: (campaignId) => get().jobsByCampaign[campaignId] ?? [],
    getJob: (campaignId, jobId) =>
      get().jobsByCampaign[campaignId]?.find((j) => j.id === jobId),
    updateJob: updateJobAction(set, get),
    deleteJob: deleteJobAction(set, get),
    toggleRepairItem: (campaignId, jobId, itemId) =>
      updateRepairItems(get, campaignId, jobId, (item) =>
        item.id === itemId ? { ...item, selected: !item.selected } : item,
      ),
    selectAllItems: (campaignId, jobId) =>
      updateRepairItems(get, campaignId, jobId, (item) => ({
        ...item,
        selected: true,
      })),
    deselectAllItems: (campaignId, jobId) =>
      updateRepairItems(get, campaignId, jobId, (item) => ({
        ...item,
        selected: false,
      })),
    startJob: startJobAction(set, get),
    completeJob: completeJobAction(set, get),
    cancelJob: cancelJobAction(set, get),
    reorderJobs: (campaignId, jobIds) => {
      const jobs = get().jobsByCampaign[campaignId];
      if (!jobs) return false;
      setJobsForCampaign(
        set,
        campaignId,
        jobs.map((job) => {
          const newPriority = jobIds.indexOf(job.id);
          return newPriority >= 0 ? { ...job, priority: newPriority } : job;
        }),
      );
      return true;
    },
    setJobPriority: (campaignId, jobId, priority) =>
      get().updateJob(campaignId, jobId, { priority }),
    getPendingJobs: (campaignId) =>
      sortJobsByPriority(
        (get().jobsByCampaign[campaignId] ?? []).filter(
          (job) => job.status === RepairJobStatus.Pending,
        ),
      ),
    getActiveJobs: (campaignId) =>
      (get().jobsByCampaign[campaignId] ?? []).filter(
        (job) => job.status === RepairJobStatus.InProgress,
      ),
    getRepairBay: (campaignId) =>
      get().baysByCampaign[campaignId] ?? { ...DEFAULT_REPAIR_BAY },
    updateRepairBay: (campaignId, updates) => {
      setBay(set, campaignId, updates);
      return true;
    },
    advanceRepairs: advanceRepairsAction(set, get),
    applyFieldRepair: (
      campaignId: string,
      assessment: IDamageAssessment,
      availableSupplies: number,
    ) => calculateFieldRepair(assessment, availableSupplies),
    getSalvage: (campaignId) =>
      get().salvageByCampaign[campaignId] ?? { parts: [], totalValue: 0 },
    addSalvage: addSalvageAction(set, get),
    useSalvageForRepair: createSalvageForRepairAction(set, get),
    removeSalvage: removeSalvageAction(set, get),
    validateJob: (campaignId, jobId, availableCBills, availableSupplies) =>
      validateJobLogic(
        get().getJob(campaignId, jobId),
        jobId,
        availableCBills,
        availableSupplies,
      ),
    selectJob: (jobId) => {
      set({ selectedJobId: jobId });
    },
    getSelectedJob: (campaignId) => {
      const { selectedJobId } = get();
      if (!selectedJobId) return null;
      return get().getJob(campaignId, selectedJobId) ?? null;
    },
    clearError: () => {
      set({ error: null });
    },
  };
}
