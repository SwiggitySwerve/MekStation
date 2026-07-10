import { useRouter } from 'next/router';
import { useEffect, useState, useCallback, useMemo } from 'react';

import { ForceBuilder, PilotSelector, UnitSelector } from '@/components/force';
import { useToast } from '@/components/shared/Toast';
import { PageLayout, PageError } from '@/components/ui';
import { unitSearchService } from '@/services/units/UnitSearchService';
import { useForceSelector } from '@/stores/useForceStore';
import { usePilotSelector } from '@/stores/usePilotStore';
import { IForce, IForceValidation, getForceTypeName } from '@/types/force';
import { IUnitIndexEntry } from '@/types/unit/UnitIndex';

import {
  buildAvailableUnits,
  buildPilotMap,
  buildUnitMap,
  deleteForceAndNavigate,
  getActivePilotCount,
  getAssignedPilotIds,
  getAssignedUnitIds,
  handleAssignmentResult,
  refreshForceDetail,
  saveForceDetails,
} from './ForceDetailPage.helpers';
import { DeleteConfirmModal, EditNameModal } from './ForceDetailPage.modals';
import {
  ForceErrorBanner,
  ForceHeaderActions,
  ForceLoadingState,
  ForcePilotsLinkBar,
} from './ForceDetailPage.sections';

export default function ForceDetailPage(): React.ReactElement {
  const router = useRouter();
  const { id } = router.query;
  const forceId = typeof id === 'string' ? id : null;
  const { showToast } = useToast();

  const loadForces = useForceSelector((state) => state.loadForces);
  const getForce = useForceSelector((state) => state.getForce);
  const updateForce = useForceSelector((state) => state.updateForce);
  const deleteForce = useForceSelector((state) => state.deleteForce);
  const validateForce = useForceSelector((state) => state.validateForce);
  const assignPilot = useForceSelector((state) => state.assignPilot);
  const assignUnit = useForceSelector((state) => state.assignUnit);
  const clearAssignment = useForceSelector((state) => state.clearAssignment);
  const swapAssignments = useForceSelector((state) => state.swapAssignments);
  const forceLoading = useForceSelector((state) => state.isLoading);
  const forceError = useForceSelector((state) => state.error);
  const clearForceError = useForceSelector((state) => state.clearError);

  const loadPilots = usePilotSelector((state) => state.loadPilots);
  const pilots = usePilotSelector((state) => state.pilots);

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
      try {
        await unitSearchService.initialize();
        setAllUnits([...unitSearchService.getAllUnits()]);
      } catch {
        const { getCanonicalUnitService } =
          await import('@/services/units/CanonicalUnitService');
        const index = await getCanonicalUnitService().getIndex();
        setAllUnits([...index]);
      } finally {
        setIsInitialized(true);
      }
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

  const pilotMap = useMemo(() => buildPilotMap(pilots), [pilots]);
  const unitMap = useMemo(() => buildUnitMap(allUnits), [allUnits]);
  const assignedPilotIds = useMemo(() => getAssignedPilotIds(force), [force]);
  const availableUnits = useMemo(
    () => buildAvailableUnits(allUnits),
    [allUnits],
  );
  const assignedUnitIds = useMemo(() => getAssignedUnitIds(force), [force]);

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
      await handleAssignmentResult(
        () => assignPilot(selectedAssignmentId, pilotId),
        () =>
          refreshForceDetail({
            forceId,
            loadForces,
            getForce,
            validateForce,
            setForce,
            setValidation,
          }),
        showToast,
        {
          success: 'Pilot assigned successfully',
          error: 'Failed to assign pilot',
        },
      );
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
      await handleAssignmentResult(
        () => assignUnit(selectedAssignmentId, unitId),
        () =>
          refreshForceDetail({
            forceId,
            loadForces,
            getForce,
            validateForce,
            setForce,
            setValidation,
          }),
        showToast,
        {
          success: 'Unit assigned successfully',
          error: 'Failed to assign unit',
        },
      );
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
      await refreshForceDetail({
        forceId,
        loadForces,
        getForce,
        validateForce,
        setForce,
        setValidation,
      });
      if (success) {
        showToast({ message: 'Assignment cleared', variant: 'info' });
      }
    },
    [clearAssignment, forceId, getForce, loadForces, showToast, validateForce],
  );

  const handleSwapAssignments = useCallback(
    async (firstId: string, secondId: string) => {
      await swapAssignments(firstId, secondId);
      await refreshForceDetail({
        forceId,
        loadForces,
        getForce,
        validateForce,
        setForce,
        setValidation,
      });
    },
    [swapAssignments, forceId, loadForces, getForce, validateForce],
  );

  const handleDelete = useCallback(
    () =>
      deleteForceAndNavigate({
        forceId,
        deleteForce,
        setIsDeleting,
        setIsDeleteModalOpen,
        showToast,
        navigateToForces: () => router.push('/gameplay/forces'),
      }),
    [deleteForce, forceId, router, showToast],
  );

  const handleSaveDetails = useCallback(
    async (updates: {
      name: string;
      description?: string;
      affiliation?: string;
    }) => {
      await saveForceDetails({
        forceId,
        updates,
        updateForce,
        loadForces,
        getForce,
        setForce,
        setIsSaving,
        setIsEditModalOpen,
        showToast,
      });
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

      <ForcePilotsLinkBar activePilotCount={getActivePilotCount(pilots)} />

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
