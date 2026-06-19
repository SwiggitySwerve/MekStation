import type { NextRouter } from 'next/router';
import type { StoreApi } from 'zustand';

import type { CampaignStore } from '@/stores/campaign/useCampaignStore.types';
import type { ICampaignRosterEntry } from '@/types/campaign/CampaignRosterEntry';
import type { IRosterUnitProjection } from '@/types/campaign/RosterUnitProjection';

import { applyPreset } from '@/lib/campaign/presetService';
import { UNIT_TEMPLATES } from '@/simulation/generator';
import { useCampaignRosterStore } from '@/stores/campaign/useCampaignRosterStore';
import { CampaignPilotStatus } from '@/types/campaign/CampaignInterfaces';
import { CampaignPreset } from '@/types/campaign/CampaignPreset';
import { CampaignType } from '@/types/campaign/CampaignType';
import { CampaignPersonnelRole } from '@/types/campaign/enums/CampaignPersonnelRole';

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
  pilot: SelectedPilot;
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
    chassisVariant: unit.name,
    readiness: 'Ready',
  };
}

function addTemplateUnitToRootForce({
  store,
  unit,
}: AddSelectedUnitInput): void {
  const template = UNIT_TEMPLATES.find((entry) => entry.name === unit.name);
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
    pilotId: pilot.id,
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
    assignedUnitId: getAssignedUnitIdForPilot(pilotAssignments, pilot.id),
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

    for (const unit of selectedUnits) {
      addSelectedUnitToRoster({ pilotAssignments, store, unit });
    }

    for (const pilot of selectedPilots) {
      addSelectedPilotToRoster({ pilot, pilotAssignments });
    }

    showToast({
      message: `Campaign "${name.trim()}" created successfully!`,
      variant: 'success',
    });
    router.push(`/gameplay/campaigns/${campaignId}`);
  } finally {
    setIsSubmitting(false);
  }
}
