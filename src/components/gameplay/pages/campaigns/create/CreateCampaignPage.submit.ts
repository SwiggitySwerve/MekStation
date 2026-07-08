import type { NextRouter } from 'next/router';
import type { StoreApi } from 'zustand';

import type { CampaignStore } from '@/stores/campaign/useCampaignStore.types';
import type { ICampaignRosterEntry } from '@/types/campaign/CampaignRosterEntry';
import type { IRosterUnitProjection } from '@/types/campaign/RosterUnitProjection';

import { applyPreset } from '@/lib/campaign/presetService';
import { UNIT_TEMPLATES } from '@/simulation/generator';
import { useCampaignRosterStore } from '@/stores/campaign/useCampaignRosterStore';
import { usePilotStore } from '@/stores/usePilotStore';
import { CampaignPilotStatus } from '@/types/campaign/CampaignInterfaces';
import { CampaignPreset } from '@/types/campaign/CampaignPreset';
import { CampaignType } from '@/types/campaign/CampaignType';
import { CampaignPersonnelRole } from '@/types/campaign/enums/CampaignPersonnelRole';
import {
  DEFAULT_PILOT_SKILLS,
  type ICreatePilotOptions,
  PilotType,
} from '@/types/pilot';

import type {
  PilotAssignments,
  SelectedPilot,
  SelectedUnit,
} from './CreateCampaignPage.types';

import { getAssignedUnitIdForPilot } from './CreateCampaignPage.utils';

type ToastVariant = 'success' | 'error';

interface AddSelectedUnitInput {
  pilotAssignments: PilotAssignments;
  store: StoreApi<CampaignStore>;
  unit: SelectedUnit;
}

interface AddSelectedPilotInput {
  pilot: RegisteredSelectedPilot;
  pilotAssignments: PilotAssignments;
}

interface SubmitCampaignInput {
  campaignType: CampaignType;
  description: string;
  name: string;
  pilotAssignments: PilotAssignments;
  router: NextRouter;
  selectedPilots: SelectedPilot[];
  selectedPreset: CampaignPreset;
  selectedUnits: SelectedUnit[];
  setIsSubmitting: (isSubmitting: boolean) => void;
  setLocalError: (error: string | null) => void;
  showToast: (toast: { message: string; variant: ToastVariant }) => void;
  store: StoreApi<CampaignStore>;
}

interface ResolvePilotAssignmentsInput {
  pilotAssignments: PilotAssignments;
  selectedPilots: SelectedPilot[];
  selectedUnits: SelectedUnit[];
}

interface RegisteredSelectedPilot extends SelectedPilot {
  vaultPilotId: string;
}

export function resolvePilotAssignmentsForSubmit({
  pilotAssignments,
  selectedPilots,
  selectedUnits,
}: ResolvePilotAssignmentsInput): PilotAssignments {
  if (
    Object.keys(pilotAssignments).length === 0 &&
    selectedUnits.length === 1 &&
    selectedPilots.length === 1
  ) {
    return {
      [selectedUnits[0].id]: selectedPilots[0].id,
    };
  }

  return pilotAssignments;
}

function normalizePilotNamesForSubmit(
  selectedPilots: readonly SelectedPilot[],
): SelectedPilot[] {
  return selectedPilots.map((pilot, index) => ({
    ...pilot,
    name: `MechWarrior ${index + 1}`,
  }));
}

function createWizardPilotOptions(pilot: SelectedPilot): ICreatePilotOptions {
  return {
    identity: { name: pilot.name },
    type: PilotType.Persistent,
    skills: DEFAULT_PILOT_SKILLS,
    startingXp: 0,
    rank: 'MechWarrior',
  };
}

async function registerWizardPilots(
  selectedPilots: readonly SelectedPilot[],
): Promise<RegisteredSelectedPilot[]> {
  const registeredPilots: RegisteredSelectedPilot[] = [];

  for (const pilot of selectedPilots) {
    const vaultPilotId = await usePilotStore
      .getState()
      .createPilot(createWizardPilotOptions(pilot));

    if (!vaultPilotId) {
      const storeError = usePilotStore.getState().error;
      throw new Error(
        `Failed to register ${pilot.name} in the pilot vault${
          storeError ? `: ${storeError}` : '.'
        }`,
      );
    }

    registeredPilots.push({ ...pilot, vaultPilotId });
  }

  return registeredPilots;
}

function translatePilotAssignmentsToVaultIds(
  pilotAssignments: PilotAssignments,
  registeredPilots: readonly RegisteredSelectedPilot[],
): PilotAssignments {
  const vaultIdsByLocalId = new Map(
    registeredPilots.map((pilot) => [pilot.id, pilot.vaultPilotId]),
  );
  const translated: PilotAssignments = {};

  for (const [unitId, localPilotId] of Object.entries(pilotAssignments)) {
    const vaultPilotId = vaultIdsByLocalId.get(localPilotId);
    if (vaultPilotId) {
      translated[unitId] = vaultPilotId;
    }
  }

  return translated;
}

function updateCampaignDescription(
  store: StoreApi<CampaignStore>,
  description: string,
): void {
  const trimmedDescription = description.trim();
  if (!trimmedDescription) return;

  store.getState().updateCampaign({ description: trimmedDescription });
}

function createRosterUnitProjection({
  pilotAssignments,
  unit,
}: AddSelectedUnitInput): IRosterUnitProjection {
  return {
    unitId: unit.id,
    unitName: unit.name,
    pilotId: pilotAssignments[unit.id],
    unitRef: unit.unitRef,
    chassisVariant: unit.name,
    readiness: 'Ready',
  };
}

function addTemplateUnitToRootForce({
  store,
  unit,
}: AddSelectedUnitInput): void {
  const template = UNIT_TEMPLATES.find(
    (entry) => entry.name === unit.name || entry.tonnage === unit.tonnage,
  );
  if (!template) return;

  const forcesStore = store.getState().getForcesStore();
  if (!forcesStore) return;

  const rootForce = forcesStore.getState().getRootForce();
  if (!rootForce) return;

  forcesStore.getState().updateForce(rootForce.id, {
    unitIds: [...rootForce.unitIds, unit.id],
  });
}

function addSelectedUnitToRoster(input: AddSelectedUnitInput): void {
  useCampaignRosterStore.getState().addUnit(createRosterUnitProjection(input));
  addTemplateUnitToRootForce(input);
}

function createPilotState({
  pilot,
  pilotAssignments,
}: AddSelectedPilotInput): ICampaignRosterEntry {
  const hireDate = new Date();

  return {
    pilotId: pilot.vaultPilotId,
    pilotName: pilot.name,
    status: CampaignPilotStatus.Active,
    wounds: 0,
    xp: 0,
    campaignXpEarned: 0,
    campaignKills: 0,
    campaignMissions: 0,
    recoveryTime: 0,
    hireDate,
    primaryRole: CampaignPersonnelRole.PILOT,
    rankIndex: 0,
    assignedUnitId: getAssignedUnitIdForPilot(
      pilotAssignments,
      pilot.vaultPilotId,
    ),
  };
}

function addSelectedPilotToRoster(input: AddSelectedPilotInput): void {
  useCampaignRosterStore.getState().addPilot(createPilotState(input));
}

export async function submitCampaignCreation({
  campaignType,
  description,
  name,
  pilotAssignments,
  router,
  selectedPilots,
  selectedPreset,
  selectedUnits,
  setIsSubmitting,
  setLocalError,
  showToast,
  store,
}: SubmitCampaignInput): Promise<void> {
  setLocalError(null);
  setIsSubmitting(true);

  try {
    const namedPilots = normalizePilotNamesForSubmit(selectedPilots);
    const presetOptions = applyPreset(selectedPreset, campaignType);
    const campaignId = store
      .getState()
      .createCampaign(name.trim(), campaignType, presetOptions);

    if (!campaignId) {
      showToast({ message: 'Failed to create campaign', variant: 'error' });
      return;
    }

    updateCampaignDescription(store, description);
    useCampaignRosterStore.getState().initRoster(campaignId);
    const registeredPilots = await registerWizardPilots(namedPilots);
    const resolvedLocalPilotAssignments = resolvePilotAssignmentsForSubmit({
      pilotAssignments,
      selectedPilots: namedPilots,
      selectedUnits,
    });
    const resolvedPilotAssignments = translatePilotAssignmentsToVaultIds(
      resolvedLocalPilotAssignments,
      registeredPilots,
    );

    for (const unit of selectedUnits) {
      addSelectedUnitToRoster({
        pilotAssignments: resolvedPilotAssignments,
        store,
        unit,
      });
    }

    for (const pilot of registeredPilots) {
      addSelectedPilotToRoster({
        pilot,
        pilotAssignments: resolvedPilotAssignments,
      });
    }

    showToast({
      message: `Campaign "${name.trim()}" created successfully!`,
      variant: 'success',
    });
    router.push(`/gameplay/campaigns/${campaignId}`);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to create campaign';
    setLocalError(message);
    showToast({ message, variant: 'error' });
  } finally {
    setIsSubmitting(false);
  }
}
