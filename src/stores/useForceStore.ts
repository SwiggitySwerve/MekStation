/**
 * Force Store
 *
 * Zustand store for managing force state in the UI.
 * Uses API routes for persistence to avoid bundling SQLite in the browser.
 *
 * @spec openspec/changes/add-force-management/proposal.md
 */

import { create } from 'zustand';
import {
  IForce,
  IForceSummary,
  IForceValidation,
  ICreateForceRequest,
  IUpdateForceRequest,
  ForcePosition,
} from '@/types/force';

// =============================================================================
// API Response Types
// =============================================================================

interface ListForcesResponse {
  forces: IForce[];
  count: number;
}

interface CreateForceResponse {
  success: boolean;
  id?: string;
  force?: IForce;
  error?: string;
}

interface UpdateForceResponse {
  success: boolean;
  force?: IForce;
  error?: string;
}

interface DeleteForceResponse {
  success: boolean;
  error?: string;
}

interface AssignmentResponse {
  success: boolean;
  error?: string;
}

interface ValidateForceResponse {
  validation: IForceValidation;
}

// =============================================================================
// Store State
// =============================================================================

interface ForceStoreState {
  /** All loaded forces */
  forces: IForce[];
  /** Currently selected force ID */
  selectedForceId: string | null;
  /** Loading state */
  isLoading: boolean;
  /** Error message */
  error: string | null;
  /** Search query */
  searchQuery: string;
  /** Validation cache (keyed by force ID) */
  validations: Map<string, IForceValidation>;
}

interface ForceStoreActions {
  /** Load all forces from API */
  loadForces: () => Promise<void>;
  /** Get a single force by ID */
  getForce: (id: string) => IForce | undefined;
  /** Create a new force */
  createForce: (request: ICreateForceRequest) => Promise<string | null>;
  /** Update a force */
  updateForce: (id: string, request: IUpdateForceRequest) => Promise<boolean>;
  /** Delete a force */
  deleteForce: (id: string) => Promise<boolean>;
  /** Select a force */
  selectForce: (id: string | null) => void;
  /** Get selected force */
  getSelectedForce: () => IForce | null;
  /** Assign a pilot to an assignment slot */
  assignPilot: (assignmentId: string, pilotId: string) => Promise<boolean>;
  /** Assign a unit to an assignment slot */
  assignUnit: (assignmentId: string, unitId: string) => Promise<boolean>;
  /** Assign both pilot and unit to an assignment slot */
  assignPilotAndUnit: (
    assignmentId: string,
    pilotId: string,
    unitId: string
  ) => Promise<boolean>;
  /** Clear an assignment */
  clearAssignment: (assignmentId: string) => Promise<boolean>;
  /** Swap two assignments */
  swapAssignments: (
    assignmentId1: string,
    assignmentId2: string
  ) => Promise<boolean>;
  /** Set assignment position */
  setAssignmentPosition: (
    assignmentId: string,
    position: ForcePosition
  ) => Promise<boolean>;
  /** Promote to lead */
  promoteToLead: (assignmentId: string) => Promise<boolean>;
  /** Validate a force */
  validateForce: (id: string) => Promise<IForceValidation | null>;
  /** Clone a force */
  cloneForce: (id: string, newName: string) => Promise<string | null>;
  /** Set search query */
  setSearchQuery: (query: string) => void;
  /** Get filtered forces */
  getFilteredForces: () => IForce[];
  /** Get force summaries */
  getForceSummaries: () => IForceSummary[];
  /** Clear error */
  clearError: () => void;
}

type ForceStore = ForceStoreState & ForceStoreActions;

// =============================================================================
// Store Implementation
// =============================================================================

export const useForceStore = create<ForceStore>((set, get) => ({
  // State
  forces: [],
  selectedForceId: null,
  isLoading: false,
  error: null,
  searchQuery: '',
  validations: new Map(),

  // Load all forces
  loadForces: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await fetch('/api/forces');
      if (!response.ok) {
        throw new Error('Failed to load forces');
      }
      const data = (await response.json()) as ListForcesResponse;
      set({ forces: data.forces, isLoading: false });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      set({ error: message, isLoading: false });
    }
  },

  // Get a force by ID
  getForce: (id: string) => {
    return get().forces.find((f) => f.id === id);
  },

  // Create a new force
  createForce: async (request: ICreateForceRequest) => {
    set({ isLoading: true, error: null });
    try {
      const response = await fetch('/api/forces', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
      });
      const data = (await response.json()) as CreateForceResponse;
      if (!data.success || !data.id) {
        set({ error: data.error ?? 'Failed to create force', isLoading: false });
        return null;
      }
      // Reload forces to get the new one
      await get().loadForces();
      return data.id;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      set({ error: message, isLoading: false });
      return null;
    }
  },

  // Update a force
  updateForce: async (id: string, request: IUpdateForceRequest) => {
    set({ isLoading: true, error: null });
    try {
      const response = await fetch(`/api/forces/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
      });
      const data = (await response.json()) as UpdateForceResponse;
      if (!data.success) {
        set({ error: data.error ?? 'Failed to update force', isLoading: false });
        return false;
      }
      await get().loadForces();
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      set({ error: message, isLoading: false });
      return false;
    }
  },

  // Delete a force
  deleteForce: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await fetch(`/api/forces/${id}`, {
        method: 'DELETE',
      });
      const data = (await response.json()) as DeleteForceResponse;
      if (!data.success) {
        set({ error: data.error ?? 'Failed to delete force', isLoading: false });
        return false;
      }
      // Clear selection if deleted
      if (get().selectedForceId === id) {
        set({ selectedForceId: null });
      }
      await get().loadForces();
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      set({ error: message, isLoading: false });
      return false;
    }
  },

  // Select a force
  selectForce: (id: string | null) => {
    set({ selectedForceId: id });
  },

  // Get selected force
  getSelectedForce: () => {
    const { selectedForceId, forces } = get();
    if (!selectedForceId) return null;
    return forces.find((f) => f.id === selectedForceId) ?? null;
  },

  // Assignment operations
  assignPilot: async (assignmentId: string, pilotId: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await fetch(`/api/forces/assignments/${assignmentId}/pilot`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pilotId }),
      });
      const data = (await response.json()) as AssignmentResponse;
      if (!data.success) {
        set({ error: data.error ?? 'Failed to assign pilot', isLoading: false });
        return false;
      }
      await get().loadForces();
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      set({ error: message, isLoading: false });
      return false;
    }
  },

  assignUnit: async (assignmentId: string, unitId: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await fetch(`/api/forces/assignments/${assignmentId}/unit`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ unitId }),
      });
      const data = (await response.json()) as AssignmentResponse;
      if (!data.success) {
        set({ error: data.error ?? 'Failed to assign unit', isLoading: false });
        return false;
      }
      await get().loadForces();
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      set({ error: message, isLoading: false });
      return false;
    }
  },

  assignPilotAndUnit: async (
    assignmentId: string,
    pilotId: string,
    unitId: string
  ) => {
    set({ isLoading: true, error: null });
    try {
      const response = await fetch(`/api/forces/assignments/${assignmentId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pilotId, unitId }),
      });
      const data = (await response.json()) as AssignmentResponse;
      if (!data.success) {
        set({ error: data.error ?? 'Failed to assign', isLoading: false });
        return false;
      }
      await get().loadForces();
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      set({ error: message, isLoading: false });
      return false;
    }
  },

  clearAssignment: async (assignmentId: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await fetch(`/api/forces/assignments/${assignmentId}`, {
        method: 'DELETE',
      });
      const data = (await response.json()) as AssignmentResponse;
      if (!data.success) {
        set({ error: data.error ?? 'Failed to clear assignment', isLoading: false });
        return false;
      }
      await get().loadForces();
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      set({ error: message, isLoading: false });
      return false;
    }
  },

  swapAssignments: async (assignmentId1: string, assignmentId2: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await fetch(`/api/forces/assignments/swap`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assignmentId1, assignmentId2 }),
      });
      const data = (await response.json()) as AssignmentResponse;
      if (!data.success) {
        set({ error: data.error ?? 'Failed to swap assignments', isLoading: false });
        return false;
      }
      await get().loadForces();
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      set({ error: message, isLoading: false });
      return false;
    }
  },

  setAssignmentPosition: async (assignmentId: string, position: ForcePosition) => {
    set({ isLoading: true, error: null });
    try {
      const response = await fetch(`/api/forces/assignments/${assignmentId}/position`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ position }),
      });
      const data = (await response.json()) as AssignmentResponse;
      if (!data.success) {
        set({ error: data.error ?? 'Failed to set position', isLoading: false });
        return false;
      }
      await get().loadForces();
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      set({ error: message, isLoading: false });
      return false;
    }
  },

  promoteToLead: async (assignmentId: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await fetch(`/api/forces/assignments/${assignmentId}/promote`, {
        method: 'POST',
      });
      const data = (await response.json()) as AssignmentResponse;
      if (!data.success) {
        set({ error: data.error ?? 'Failed to promote', isLoading: false });
        return false;
      }
      await get().loadForces();
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      set({ error: message, isLoading: false });
      return false;
    }
  },

  // Validate a force
  validateForce: async (id: string) => {
    try {
      const response = await fetch(`/api/forces/${id}/validate`);
      if (!response.ok) {
        return null;
      }
      const data = (await response.json()) as ValidateForceResponse;
      // Cache the validation
      const validations = new Map(get().validations);
      validations.set(id, data.validation);
      set({ validations });
      return data.validation;
    } catch {
      return null;
    }
  },

  // Clone a force
  cloneForce: async (id: string, newName: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await fetch(`/api/forces/${id}/clone`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newName }),
      });
      const data = (await response.json()) as CreateForceResponse;
      if (!data.success || !data.id) {
        set({ error: data.error ?? 'Failed to clone force', isLoading: false });
        return null;
      }
      await get().loadForces();
      return data.id;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      set({ error: message, isLoading: false });
      return null;
    }
  },

  // Set search query
  setSearchQuery: (query: string) => {
    set({ searchQuery: query });
  },

  // Get filtered forces
  getFilteredForces: () => {
    const { forces, searchQuery } = get();
    if (!searchQuery) return forces;

    const lowerQuery = searchQuery.toLowerCase();
    return forces.filter(
      (f) =>
        f.name.toLowerCase().includes(lowerQuery) ||
        f.affiliation?.toLowerCase().includes(lowerQuery) ||
        f.description?.toLowerCase().includes(lowerQuery)
    );
  },

  // Get force summaries
  getForceSummaries: (): IForceSummary[] => {
    const forces = get().forces;
    const summaries: IForceSummary[] = [];

    const addForce = (force: IForce, depth: number): void => {
      summaries.push({
        id: force.id,
        name: force.name,
        forceType: force.forceType,
        status: force.status,
        affiliation: force.affiliation,
        stats: force.stats,
        depth,
        parentId: force.parentId,
      });

      // Add children
      const children = forces.filter((f) => f.parentId === force.id);
      for (const child of children) {
        addForce(child, depth + 1);
      }
    };

    // Start with root forces
    const rootForces = forces.filter((f) => !f.parentId);
    for (const force of rootForces) {
      addForce(force, 0);
    }

    return summaries;
  },

  // Clear error
  clearError: () => {
    set({ error: null });
  },
}));
