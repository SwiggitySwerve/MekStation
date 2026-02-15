/**
 * Repair Store Types
 *
 * State and action interfaces for the repair store.
 */

import type {
  IRepairJob,
  IRepairBay,
  IDamageAssessment,
  ISalvageInventory,
  ISalvagedPart,
  IFieldRepairResult,
  IRepairJobValidationResult,
} from '@/types/repair';

export interface RepairStoreState {
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

export interface RepairStoreActions {
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

export type RepairStore = RepairStoreState & RepairStoreActions;
