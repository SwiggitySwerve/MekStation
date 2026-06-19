import type { UnitInfo } from '@/components/force';
import type { IForce, IForceValidation } from '@/types/force';
import type { IUnitIndexEntry } from '@/types/unit/UnitIndex';

import { type IPilot, PilotStatus } from '@/types/pilot';

import { mapTechBase, mapWeightClass } from './ForceDetailPage.utils';

type UnitMapEntry = { name: string; bv: number; tonnage: number };

interface ForceDetailRefreshDeps {
  readonly forceId: string | null;
  readonly loadForces: () => Promise<void>;
  readonly getForce: (id: string) => IForce | undefined;
  readonly validateForce: (id: string) => Promise<IForceValidation | null>;
  readonly setForce: (force: IForce | null) => void;
  readonly setValidation: (validation: IForceValidation | null) => void;
}

export function buildPilotMap(pilots: readonly IPilot[]): Map<string, IPilot> {
  const map = new Map<string, IPilot>();
  for (const pilot of pilots) {
    map.set(pilot.id, pilot);
  }
  return map;
}

export function buildUnitMap(
  allUnits: readonly IUnitIndexEntry[],
): Map<string, UnitMapEntry> {
  const map = new Map<string, UnitMapEntry>();
  for (const unit of allUnits) {
    map.set(unit.id, {
      name: unit.name,
      bv: unit.bv ?? 0,
      tonnage: unit.tonnage,
    });
  }
  return map;
}

export function getAssignedPilotIds(force: IForce | null): string[] {
  if (!force) return [];
  return force.assignments
    .filter((assignment) => assignment.pilotId)
    .map((assignment) => assignment.pilotId as string);
}

export function getAssignedUnitIds(force: IForce | null): string[] {
  if (!force) return [];
  return force.assignments
    .filter((assignment) => assignment.unitId)
    .map((assignment) => assignment.unitId as string);
}

export function buildAvailableUnits(
  allUnits: readonly IUnitIndexEntry[],
): UnitInfo[] {
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
}

export function getActivePilotCount(pilots: readonly IPilot[]): number {
  return pilots.filter((pilot) => pilot.status === PilotStatus.Active).length;
}

export async function refreshForceDetail({
  forceId,
  loadForces,
  getForce,
  validateForce,
  setForce,
  setValidation,
}: ForceDetailRefreshDeps): Promise<void> {
  if (!forceId) return;
  await loadForces();
  setForce(getForce(forceId) ?? null);
  setValidation(await validateForce(forceId));
}

export async function deleteForceAndNavigate(params: {
  readonly forceId: string | null;
  readonly deleteForce: (id: string) => Promise<boolean>;
  readonly setIsDeleting: (isDeleting: boolean) => void;
  readonly setIsDeleteModalOpen: (isOpen: boolean) => void;
  readonly showToast: (toast: {
    message: string;
    variant: 'success' | 'error';
  }) => void;
  readonly navigateToForces: () => void;
}): Promise<void> {
  const {
    forceId,
    deleteForce,
    setIsDeleting,
    setIsDeleteModalOpen,
    showToast,
    navigateToForces,
  } = params;
  if (!forceId) return;

  setIsDeleting(true);
  const success = await deleteForce(forceId);
  setIsDeleting(false);

  if (success) {
    showToast({ message: 'Force deleted successfully', variant: 'success' });
    navigateToForces();
  } else {
    showToast({ message: 'Failed to delete force', variant: 'error' });
  }
  setIsDeleteModalOpen(false);
}

export async function saveForceDetails(params: {
  readonly forceId: string | null;
  readonly updates: {
    name: string;
    description?: string;
    affiliation?: string;
  };
  readonly updateForce: (
    id: string,
    updates: { name: string; description?: string; affiliation?: string },
  ) => Promise<boolean>;
  readonly loadForces: () => Promise<void>;
  readonly getForce: (id: string) => IForce | undefined;
  readonly setForce: (force: IForce | null) => void;
  readonly setIsSaving: (isSaving: boolean) => void;
  readonly setIsEditModalOpen: (isOpen: boolean) => void;
  readonly showToast: (toast: {
    message: string;
    variant: 'success' | 'error';
  }) => void;
}): Promise<void> {
  const {
    forceId,
    updates,
    updateForce,
    loadForces,
    getForce,
    setForce,
    setIsSaving,
    setIsEditModalOpen,
    showToast,
  } = params;
  if (!forceId) return;

  setIsSaving(true);
  const success = await updateForce(forceId, updates);
  setIsSaving(false);

  if (success) {
    showToast({ message: 'Force details updated', variant: 'success' });
    setIsEditModalOpen(false);
    await loadForces();
    setForce(getForce(forceId) ?? null);
  } else {
    showToast({ message: 'Failed to update force', variant: 'error' });
  }
}

export async function handleAssignmentResult(
  action: () => Promise<boolean>,
  refresh: () => Promise<void>,
  showToast: (toast: { message: string; variant: 'success' | 'error' }) => void,
  messages: { success: string; error: string },
): Promise<void> {
  const success = await action();
  await refresh();
  showToast({
    message: success ? messages.success : messages.error,
    variant: success ? 'success' : 'error',
  });
}
