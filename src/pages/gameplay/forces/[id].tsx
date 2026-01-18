/**
 * Force Detail Page
 * Display and edit a force with pilot/unit assignments.
 *
 * @spec openspec/changes/add-force-management/proposal.md
 */
import { useEffect, useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import {
  PageLayout,
  PageLoading,
  PageError,
  Button,
  Input,
} from '@/components/ui';
import { ForceBuilder, PilotSelector, UnitSelector, UnitInfo } from '@/components/force';
import { useForceStore } from '@/stores/useForceStore';
import { usePilotStore } from '@/stores/usePilotStore';
import {
  IForce,
  IForceValidation,
  getForceTypeName,
} from '@/types/force';
import { IPilot, PilotStatus } from '@/types/pilot';

// =============================================================================
// Sub-Components
// =============================================================================

interface DeleteConfirmModalProps {
  forceName: string;
  isOpen: boolean;
  isDeleting: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

function DeleteConfirmModal({
  forceName,
  isOpen,
  isDeleting,
  onConfirm,
  onCancel,
}: DeleteConfirmModalProps): React.ReactElement | null {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={!isDeleting ? onCancel : undefined}
      />
      <div className="relative bg-surface-base border border-border-theme rounded-xl p-6 max-w-md w-full shadow-2xl">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-900/30 flex items-center justify-center">
            <svg
              className="w-8 h-8 text-red-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>

          <h3 className="text-xl font-bold text-text-theme-primary mb-2">
            Delete Force?
          </h3>
          <p className="text-text-theme-secondary mb-6">
            Are you sure you want to permanently delete{' '}
            <span className="text-accent font-semibold">{forceName}</span>?
            This action cannot be undone.
          </p>

          <div className="flex items-center justify-center gap-3">
            <Button variant="ghost" onClick={onCancel} disabled={isDeleting}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={onConfirm}
              isLoading={isDeleting}
              className="bg-red-600 hover:bg-red-500"
            >
              Delete Force
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

interface EditNameModalProps {
  currentName: string;
  currentDescription?: string;
  currentAffiliation?: string;
  isOpen: boolean;
  isSaving: boolean;
  onSave: (updates: { name: string; description?: string; affiliation?: string }) => void;
  onCancel: () => void;
}

function EditNameModal({
  currentName,
  currentDescription,
  currentAffiliation,
  isOpen,
  isSaving,
  onSave,
  onCancel,
}: EditNameModalProps): React.ReactElement | null {
  const [name, setName] = useState(currentName);
  const [description, setDescription] = useState(currentDescription || '');
  const [affiliation, setAffiliation] = useState(currentAffiliation || '');

  useEffect(() => {
    setName(currentName);
    setDescription(currentDescription || '');
    setAffiliation(currentAffiliation || '');
  }, [currentName, currentDescription, currentAffiliation]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      onSave({
        name: name.trim(),
        description: description.trim() || undefined,
        affiliation: affiliation.trim() || undefined,
      });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={!isSaving ? onCancel : undefined}
      />
      <div className="relative bg-surface-base border border-border-theme rounded-xl p-6 max-w-md w-full shadow-2xl">
        <h3 className="text-xl font-bold text-text-theme-primary mb-4">
          Edit Force Details
        </h3>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-text-theme-secondary mb-1.5">
              Name *
            </label>
            <Input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Force name"
              required
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-text-theme-secondary mb-1.5">
              Affiliation
            </label>
            <Input
              type="text"
              value={affiliation}
              onChange={(e) => setAffiliation(e.target.value)}
              placeholder="Faction or house"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-text-theme-secondary mb-1.5">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional notes..."
              rows={3}
              className="w-full px-4 py-2.5 bg-surface-raised border border-border-theme-subtle rounded-lg text-text-theme-primary placeholder-text-theme-muted focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30 resize-none"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="ghost"
              onClick={onCancel}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              isLoading={isSaving}
              disabled={!name.trim()}
            >
              Save Changes
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// =============================================================================
// Main Page Component
// =============================================================================

export default function ForceDetailPage(): React.ReactElement {
  const router = useRouter();
  const { id } = router.query;
  const forceId = typeof id === 'string' ? id : null;

  // Force store
  const {
    loadForces,
    getForce,
    updateForce,
    deleteForce,
    validateForce,
    assignPilot,
    assignUnit,
    clearAssignment,
    swapAssignments,
    isLoading: forceLoading,
    error: forceError,
    clearError: clearForceError,
  } = useForceStore();

  // Pilot store
  const { loadPilots, pilots } = usePilotStore();

  // Local state
  const [isInitialized, setIsInitialized] = useState(false);
  const [force, setForce] = useState<IForce | null>(null);
  const [validation, setValidation] = useState<IForceValidation | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Selector modals
  const [pilotSelectorOpen, setPilotSelectorOpen] = useState(false);
  const [unitSelectorOpen, setUnitSelectorOpen] = useState(false);
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<string | null>(null);

  // Load data on mount
  useEffect(() => {
    const initialize = async () => {
      await Promise.all([loadForces(), loadPilots()]);
      setIsInitialized(true);
    };
    initialize();
  }, [loadForces, loadPilots]);

  // Get force when store updates
  useEffect(() => {
    if (isInitialized && forceId) {
      const loadedForce = getForce(forceId);
      setForce(loadedForce ?? null);

      // Validate force
      if (loadedForce) {
        validateForce(forceId).then((v) => setValidation(v));
      }
    }
  }, [isInitialized, forceId, getForce, validateForce]);

  // Build pilot map for ForceBuilder
  const pilotMap = useMemo(() => {
    const map = new Map<string, IPilot>();
    for (const pilot of pilots) {
      map.set(pilot.id, pilot);
    }
    return map;
  }, [pilots]);

  // Build unit map (placeholder - units not fully implemented yet)
  const unitMap = useMemo(() => {
    // TODO: Integrate with unit store when available
    return new Map<string, { name: string; bv: number; tonnage: number }>();
  }, []);

  // Get assigned pilot IDs
  const assignedPilotIds = useMemo(() => {
    if (!force) return [];
    return force.assignments
      .filter((a) => a.pilotId)
      .map((a) => a.pilotId as string);
  }, [force]);

  // Mock unit data for selector (placeholder)
  const availableUnits: UnitInfo[] = useMemo(() => {
    // TODO: Load from unit store when available
    return [];
  }, []);

  // Get assigned unit IDs
  const assignedUnitIds = useMemo(() => {
    if (!force) return [];
    return force.assignments
      .filter((a) => a.unitId)
      .map((a) => a.unitId as string);
  }, [force]);

  // Handler: Open pilot selector
  const handleSelectPilot = useCallback((assignmentId: string) => {
    setSelectedAssignmentId(assignmentId);
    setPilotSelectorOpen(true);
  }, []);

  // Handler: Open unit selector
  const handleSelectUnit = useCallback((assignmentId: string) => {
    setSelectedAssignmentId(assignmentId);
    setUnitSelectorOpen(true);
  }, []);

  // Handler: Assign pilot
  const handlePilotSelected = useCallback(
    async (pilotId: string) => {
      if (!selectedAssignmentId) return;
      await assignPilot(selectedAssignmentId, pilotId);
      // Reload force
      if (forceId) {
        await loadForces();
        const updated = getForce(forceId);
        setForce(updated ?? null);
        const v = await validateForce(forceId);
        setValidation(v);
      }
    },
    [selectedAssignmentId, assignPilot, forceId, loadForces, getForce, validateForce]
  );

  // Handler: Assign unit
  const handleUnitSelected = useCallback(
    async (unitId: string) => {
      if (!selectedAssignmentId) return;
      await assignUnit(selectedAssignmentId, unitId);
      // Reload force
      if (forceId) {
        await loadForces();
        const updated = getForce(forceId);
        setForce(updated ?? null);
        const v = await validateForce(forceId);
        setValidation(v);
      }
    },
    [selectedAssignmentId, assignUnit, forceId, loadForces, getForce, validateForce]
  );

  // Handler: Clear assignment
  const handleClearAssignment = useCallback(
    async (assignmentId: string) => {
      await clearAssignment(assignmentId);
      // Reload force
      if (forceId) {
        await loadForces();
        const updated = getForce(forceId);
        setForce(updated ?? null);
        const v = await validateForce(forceId);
        setValidation(v);
      }
    },
    [clearAssignment, forceId, loadForces, getForce, validateForce]
  );

  // Handler: Swap assignments
  const handleSwapAssignments = useCallback(
    async (id1: string, id2: string) => {
      await swapAssignments(id1, id2);
      // Reload force
      if (forceId) {
        await loadForces();
        const updated = getForce(forceId);
        setForce(updated ?? null);
      }
    },
    [swapAssignments, forceId, loadForces, getForce]
  );

  // Handler: Delete force
  const handleDelete = useCallback(async () => {
    if (!forceId) return;

    setIsDeleting(true);
    const success = await deleteForce(forceId);
    setIsDeleting(false);

    if (success) {
      router.push('/gameplay/forces');
    }
    setIsDeleteModalOpen(false);
  }, [forceId, deleteForce, router]);

  // Handler: Save force details
  const handleSaveDetails = useCallback(
    async (updates: { name: string; description?: string; affiliation?: string }) => {
      if (!forceId) return;

      setIsSaving(true);
      const success = await updateForce(forceId, updates);
      setIsSaving(false);

      if (success) {
        setIsEditModalOpen(false);
        // Reload force
        await loadForces();
        const updated = getForce(forceId);
        setForce(updated ?? null);
      }
    },
    [forceId, updateForce, loadForces, getForce]
  );

  // Loading state
  if (!isInitialized || forceLoading) {
    return <PageLoading message="Loading force data..." />;
  }

  // Force not found
  if (!force) {
    return (
      <PageError
        title="Force Not Found"
        message={forceError || 'The requested force could not be found.'}
        backLink="/gameplay/forces"
        backLabel="Back to Roster"
      />
    );
  }

  return (
    <PageLayout
      title={force.name}
      subtitle={`${getForceTypeName(force.forceType)} • ${force.affiliation || 'No affiliation'}`}
      backLink="/gameplay/forces"
      backLabel="Back to Roster"
      maxWidth="wide"
      headerContent={
        <div className="flex items-center gap-3">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setIsEditModalOpen(true)}
            leftIcon={
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                />
              </svg>
            }
          >
            Edit
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsDeleteModalOpen(true)}
            className="text-red-400 hover:text-red-300 hover:bg-red-900/20"
            leftIcon={
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
            }
          >
            Delete
          </Button>
        </div>
      }
    >
      {/* Error Display */}
      {forceError && (
        <div className="mb-6 p-4 rounded-lg bg-red-900/20 border border-red-600/30">
          <div className="flex items-center justify-between">
            <p className="text-sm text-red-400">{forceError}</p>
            <button
              onClick={clearForceError}
              className="text-red-400 hover:text-red-300"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Force Builder */}
      <ForceBuilder
        force={force}
        pilots={pilotMap}
        units={unitMap}
        validation={validation ?? undefined}
        onSelectPilot={handleSelectPilot}
        onSelectUnit={handleSelectUnit}
        onClearAssignment={handleClearAssignment}
        onSwapAssignments={handleSwapAssignments}
        onEditName={() => setIsEditModalOpen(true)}
      />

      {/* Link to pilots */}
      <div className="mt-8 pt-6 border-t border-border-theme-subtle">
        <div className="flex items-center gap-6">
          <Link
            href="/gameplay/pilots"
            className="inline-flex items-center gap-2 text-accent hover:text-accent/80 transition-colors"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
            Manage Pilots
          </Link>
          <span className="text-text-theme-muted">•</span>
          <span className="text-sm text-text-theme-secondary">
            {pilots.filter((p) => p.status === PilotStatus.Active).length} active pilots available
          </span>
        </div>
      </div>

      {/* Modals */}
      <DeleteConfirmModal
        forceName={force.name}
        isOpen={isDeleteModalOpen}
        isDeleting={isDeleting}
        onConfirm={handleDelete}
        onCancel={() => setIsDeleteModalOpen(false)}
      />

      <EditNameModal
        currentName={force.name}
        currentDescription={force.description}
        currentAffiliation={force.affiliation}
        isOpen={isEditModalOpen}
        isSaving={isSaving}
        onSave={handleSaveDetails}
        onCancel={() => setIsEditModalOpen(false)}
      />

      <PilotSelector
        isOpen={pilotSelectorOpen}
        onClose={() => setPilotSelectorOpen(false)}
        onSelect={handlePilotSelected}
        pilots={pilots}
        assignedPilotIds={assignedPilotIds}
        title="Assign Pilot"
      />

      <UnitSelector
        isOpen={unitSelectorOpen}
        onClose={() => setUnitSelectorOpen(false)}
        onSelect={handleUnitSelected}
        units={availableUnits}
        assignedUnitIds={assignedUnitIds}
        title="Assign Unit"
      />
    </PageLayout>
  );
}
