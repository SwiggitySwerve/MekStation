import { v4 as uuidv4 } from 'uuid';

import {
  IRepairJob,
  IRepairBay,
  IDamageAssessment,
  ISalvageInventory,
  ISalvagedPart,
  IRepairItem,
  IRepairJobValidationResult,
  RepairJobStatus,
  generateRepairItems,
  findMatchingSalvage,
  validateRepairJob,
} from '@/types/repair';

import {
  calculateTotalRepairCost,
  calculateTotalRepairTime,
} from './useRepairStore.helpers';

export function createRepairJobLogic(
  campaignId: string,
  assessment: IDamageAssessment,
  armorType?: string,
  structureType?: string,
  existingJobs: readonly IRepairJob[] = [],
): IRepairJob {
  const items = generateRepairItems(assessment, armorType, structureType);
  const jobId = uuidv4();
  const now = new Date().toISOString();

  const maxPriority = existingJobs.reduce(
    (max, j) => Math.max(max, j.priority),
    0,
  );

  return {
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
}

export function startJobLogic(
  job: IRepairJob,
  bay: IRepairBay,
): {
  success: boolean;
  error?: string;
  updates?: { job: Partial<IRepairJob>; bay: Partial<IRepairBay> };
} {
  if (job.status !== RepairJobStatus.Pending) {
    return { success: false, error: `Job is not pending: ${job.status}` };
  }

  if (bay.activeJobs.length >= bay.capacity) {
    return { success: false, error: 'Repair bay at capacity' };
  }

  return {
    success: true,
    updates: {
      job: {
        status: RepairJobStatus.InProgress,
        startedAt: new Date().toISOString(),
      },
      bay: {
        activeJobs: [...bay.activeJobs, job.id],
        queuedJobs: bay.queuedJobs.filter((id) => id !== job.id),
      },
    },
  };
}

export function completeJobLogic(
  jobId: string,
  bay: IRepairBay,
): { job: Partial<IRepairJob>; bay: IRepairBay } {
  return {
    job: {
      status: RepairJobStatus.Completed,
      completedAt: new Date().toISOString(),
      timeRemainingHours: 0,
    },
    bay: {
      ...bay,
      activeJobs: bay.activeJobs.filter((id) => id !== jobId),
    },
  };
}

export function advanceRepairsLogic(
  jobs: readonly IRepairJob[],
  bay: IRepairBay,
  hoursElapsed: number,
): {
  updatedJobs: IRepairJob[];
  completedJobIds: string[];
  updatedBay: IRepairBay;
} {
  const completedJobIds: string[] = [];

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

  const updatedBay = {
    ...bay,
    activeJobs: bay.activeJobs.filter((id) => !completedJobIds.includes(id)),
  };

  return { updatedJobs, completedJobIds, updatedBay };
}

export function cancelJobLogic(jobId: string, bay: IRepairBay): IRepairBay {
  return {
    ...bay,
    activeJobs: bay.activeJobs.filter((id) => id !== jobId),
    queuedJobs: bay.queuedJobs.filter((id) => id !== jobId),
  };
}

export function addSalvageLogic(
  inventory: ISalvageInventory,
  parts: readonly ISalvagedPart[],
): ISalvageInventory {
  const newParts = [...inventory.parts, ...parts];
  const totalValue = newParts.reduce((sum, p) => sum + p.estimatedValue, 0);
  return { parts: newParts, totalValue };
}

export function useSalvageForRepairLogic(
  job: IRepairJob,
  itemId: string,
  partId: string,
  inventory: ISalvageInventory,
): { success: boolean; error?: string; updatedItems?: readonly IRepairItem[] } {
  const item = job.items.find((i) => i.id === itemId);
  const part = inventory.parts.find((p) => p.id === partId);

  if (!item || !part) {
    return { success: false, error: 'Item or part not found' };
  }

  const matchingPart = findMatchingSalvage(item, inventory);
  if (!matchingPart || matchingPart.id !== partId) {
    return { success: false, error: 'Salvage part does not match repair item' };
  }

  const updatedItems = job.items.map((i) =>
    i.id === itemId ? { ...i, cost: 0 } : i,
  );

  return { success: true, updatedItems };
}

export function validateJobLogic(
  job: IRepairJob | undefined,
  jobId: string,
  availableCBills: number,
  availableSupplies: number,
): IRepairJobValidationResult {
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
}
