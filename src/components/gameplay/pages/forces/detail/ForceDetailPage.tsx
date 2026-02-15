import { useRouter } from 'next/router';
import { useEffect, useState, useCallback, useMemo } from 'react';

import {
  ForceBuilder,
  PilotSelector,
  UnitSelector,
  UnitInfo,
} from '@/components/force';
import { useToast } from '@/components/shared/Toast';
import { PageLayout, PageError } from '@/components/ui';
import { unitSearchService } from '@/services/units/UnitSearchService';
import { useForceStore } from '@/stores/useForceStore';
import { usePilotStore } from '@/stores/usePilotStore';
import { IForce, IForceValidation, getForceTypeName } from '@/types/force';
import { IPilot, PilotStatus } from '@/types/pilot';
import { IUnitIndexEntry } from '@/types/unit/UnitIndex';

import { DeleteConfirmModal, EditNameModal } from './ForceDetailPage.modals';
import {
  ForceErrorBanner,
  ForceHeaderActions,
  ForceLoadingState,
  ForcePilotsLinkBar,
} from './ForceDetailPage.sections';
import { mapTechBase, mapWeightClass } from './ForceDetailPage.utils';

export default function ForceDetailPage(): React.ReactElement {
  const router = useRouter();
  const { id } = router.query;
  const forceId = typeof id === 'string' ? id : null;
  const { showToast } = useToast();

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

  const { loadPilots, pilots } = usePilotStore();

  const [isInitialized, setIsInitialized] = useState(false);
  const [allUnits, setAllUnits] = useState<IUnitIndexEntry[]>([]);
  const [force, setForce] = useState<IForce | null>(null);
  const [validation, setValidation] = useState<IForceValidation | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [pilotSelectorOpen, setPilotSelectorOpen] = useState(false);
  const [unitSelectorOpen, setUnitSelectorOpen] = useState(false);
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<
    string | null
  >(null);

  useEffect(() => {
    const initialize = async () => {
      await Promise.all([loadForces(), loadPilots()]);
      await unitSearchService.initialize();
      const { canonicalUnitService } =
        await import('@/services/units/CanonicalUnitService');
      const index = await canonicalUnitService.getIndex();
      setAllUnits([...index]);
      setIsInitialized(true);
    };
    initialize();
  }, [loadForces, loadPilots]);

  useEffect(() => {
    if (isInitialized && forceId) {
      const loadedForce = getForce(forceId);
      setForce(loadedForce ?? null);

      if (loadedForce) {
        validateForce(forceId).then((result) => setValidation(result));
      }
    }
  }, [isInitialized, forceId, getForce, validateForce]);

  const pilotMap = useMemo(() => {
    const map = new Map<string, IPilot>();
    for (const pilot of pilots) {
      map.set(pilot.id, pilot);
    }
    return map;
  }, [pilots]);

  const unitMap = useMemo(() => {
    const map = new Map<
      string,
      { name: string; bv: number; tonnage: number }
    >();
    for (const unit of allUnits) {
      map.set(unit.id, {
        name: unit.name,
        bv: unit.bv ?? 0,
        tonnage: unit.tonnage,
      });
    }
    return map;
  }, [allUnits]);

  const assignedPilotIds = useMemo(() => {
    if (!force) {
      return [];
    }
    return force.assignments
      .filter((assignment) => assignment.pilotId)
      .map((assignment) => assignment.pilotId as string);
  }, [force]);

  const availableUnits: UnitInfo[] = useMemo(() => {
    return allUnits.map((unit) => ({
      id: unit.id,
      name: unit.name,
      chassis: unit.chassis,
      model: unit.variant,
      tonnage: unit.tonnage,
      bv: unit.bv ?? 0,
      techBase: mapTechBase(unit.techBase),
      weightClass: mapWeightClass(unit.weightClass),
    }));
  }, [allUnits]);

  const assignedUnitIds = useMemo(() => {
    if (!force) {
      return [];
    }
    return force.assignments
      .filter((assignment) => assignment.unitId)
      .map((assignment) => assignment.unitId as string);
  }, [force]);

  const handleSelectPilot = useCallback((assignmentId: string) => {
    setSelectedAssignmentId(assignmentId);
    setPilotSelectorOpen(true);
  }, []);

  const handleSelectUnit = useCallback((assignmentId: string) => {
    setSelectedAssignmentId(assignmentId);
    setUnitSelectorOpen(true);
  }, []);

  const handlePilotSelected = useCallback(
    async (pilotId: string) => {
      if (!selectedAssignmentId) {
        return;
      }
      const success = await assignPilot(selectedAssignmentId, pilotId);
      if (forceId) {
        await loadForces();
        const updated = getForce(forceId);
        setForce(updated ?? null);
        const nextValidation = await validateForce(forceId);
        setValidation(nextValidation);
      }
      if (success) {
        showToast({
          message: 'Pilot assigned successfully',
          variant: 'success',
        });
      } else {
        showToast({ message: 'Failed to assign pilot', variant: 'error' });
      }
    },
    [
      assignPilot,
      forceId,
      getForce,
      loadForces,
      selectedAssignmentId,
      showToast,
      validateForce,
    ],
  );

  const handleUnitSelected = useCallback(
    async (unitId: string) => {
      if (!selectedAssignmentId) {
        return;
      }
      const success = await assignUnit(selectedAssignmentId, unitId);
      if (forceId) {
        await loadForces();
        const updated = getForce(forceId);
        setForce(updated ?? null);
        const nextValidation = await validateForce(forceId);
        setValidation(nextValidation);
      }
      if (success) {
        showToast({
          message: 'Unit assigned successfully',
          variant: 'success',
        });
      } else {
        showToast({ message: 'Failed to assign unit', variant: 'error' });
      }
    },
    [
      assignUnit,
      forceId,
      getForce,
      loadForces,
      selectedAssignmentId,
      showToast,
      validateForce,
    ],
  );

  const handleClearAssignment = useCallback(
    async (assignmentId: string) => {
      const success = await clearAssignment(assignmentId);
      if (forceId) {
        await loadForces();
        const updated = getForce(forceId);
        setForce(updated ?? null);
        const nextValidation = await validateForce(forceId);
        setValidation(nextValidation);
      }
      if (success) {
        showToast({ message: 'Assignment cleared', variant: 'info' });
      }
    },
    [clearAssignment, forceId, getForce, loadForces, showToast, validateForce],
  );

  const handleSwapAssignments = useCallback(
    async (firstId: string, secondId: string) => {
      await swapAssignments(firstId, secondId);
      if (forceId) {
        await loadForces();
        const updated = getForce(forceId);
        setForce(updated ?? null);
      }
    },
    [swapAssignments, forceId, loadForces, getForce],
  );

  const handleDelete = useCallback(async () => {
    if (!forceId) {
      return;
    }

    setIsDeleting(true);
    const success = await deleteForce(forceId);
    setIsDeleting(false);

    if (success) {
      showToast({ message: 'Force deleted successfully', variant: 'success' });
      router.push('/gameplay/forces');
    } else {
      showToast({ message: 'Failed to delete force', variant: 'error' });
    }
    setIsDeleteModalOpen(false);
  }, [deleteForce, forceId, router, showToast]);

  const handleSaveDetails = useCallback(
    async (updates: {
      name: string;
      description?: string;
      affiliation?: string;
    }) => {
      if (!forceId) {
        return;
      }

      setIsSaving(true);
      const success = await updateForce(forceId, updates);
      setIsSaving(false);

      if (success) {
        showToast({ message: 'Force details updated', variant: 'success' });
        setIsEditModalOpen(false);
        await loadForces();
        const updated = getForce(forceId);
        setForce(updated ?? null);
      } else {
        showToast({ message: 'Failed to update force', variant: 'error' });
      }
    },
    [forceId, getForce, loadForces, showToast, updateForce],
  );

  if (!isInitialized || forceLoading) {
    return (
      <ForceLoadingState
        forceLoading={forceLoading}
        isInitialized={isInitialized}
      />
    );
  }

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

  const breadcrumbs = [
    { label: 'Home', href: '/' },
    { label: 'Gameplay', href: '/gameplay' },
    { label: 'Forces', href: '/gameplay/forces' },
    { label: force.name },
  ];

  return (
    <PageLayout
      title={force.name}
      subtitle={`${getForceTypeName(force.forceType)} - ${force.affiliation || 'No affiliation'}`}
      breadcrumbs={breadcrumbs}
      backLink="/gameplay/forces"
      backLabel="Back to Roster"
      maxWidth="wide"
      headerContent={
        <ForceHeaderActions
          onEdit={() => setIsEditModalOpen(true)}
          onDelete={() => setIsDeleteModalOpen(true)}
        />
      }
    >
      {forceError && (
        <ForceErrorBanner forceError={forceError} onDismiss={clearForceError} />
      )}

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

      <ForcePilotsLinkBar
        activePilotCount={
          pilots.filter((pilot) => pilot.status === PilotStatus.Active).length
        }
      />

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
