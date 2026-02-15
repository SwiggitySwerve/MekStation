import {
  IForce,
  IForceSummary,
  IForceValidation,
  ICreateForceRequest,
  IUpdateForceRequest,
  ForcePosition,
} from '@/types/force';

export interface ListForcesResponse {
  forces: IForce[];
  count: number;
}

export interface CreateForceResponse {
  success: boolean;
  id?: string;
  force?: IForce;
  error?: string;
}

export interface UpdateForceResponse {
  success: boolean;
  force?: IForce;
  error?: string;
}

export interface DeleteForceResponse {
  success: boolean;
  error?: string;
}

export interface AssignmentResponse {
  success: boolean;
  error?: string;
}

export interface ValidateForceResponse {
  validation: IForceValidation;
}

export interface ForceStoreState {
  forces: IForce[];
  selectedForceId: string | null;
  isLoading: boolean;
  error: string | null;
  searchQuery: string;
  validations: Map<string, IForceValidation>;
}

export interface ForceStoreActions {
  loadForces: () => Promise<void>;
  getForce: (id: string) => IForce | undefined;
  createForce: (request: ICreateForceRequest) => Promise<string | null>;
  updateForce: (id: string, request: IUpdateForceRequest) => Promise<boolean>;
  deleteForce: (id: string) => Promise<boolean>;
  selectForce: (id: string | null) => void;
  getSelectedForce: () => IForce | null;
  assignPilot: (assignmentId: string, pilotId: string) => Promise<boolean>;
  assignUnit: (assignmentId: string, unitId: string) => Promise<boolean>;
  assignPilotAndUnit: (
    assignmentId: string,
    pilotId: string,
    unitId: string,
  ) => Promise<boolean>;
  clearAssignment: (assignmentId: string) => Promise<boolean>;
  swapAssignments: (
    assignmentId1: string,
    assignmentId2: string,
  ) => Promise<boolean>;
  setAssignmentPosition: (
    assignmentId: string,
    position: ForcePosition,
  ) => Promise<boolean>;
  promoteToLead: (assignmentId: string) => Promise<boolean>;
  validateForce: (id: string) => Promise<IForceValidation | null>;
  cloneForce: (id: string, newName: string) => Promise<string | null>;
  setSearchQuery: (query: string) => void;
  getFilteredForces: () => IForce[];
  getForceSummaries: () => IForceSummary[];
  clearError: () => void;
}

export type ForceStore = ForceStoreState & ForceStoreActions;
