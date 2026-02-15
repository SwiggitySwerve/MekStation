import { useRouter } from 'next/router';
import { useCallback, useMemo, useState } from 'react';

import { useToast } from '@/components/shared/Toast';
import { PageLayout, Button } from '@/components/ui';
import { UNIT_TEMPLATES } from '@/simulation/generator';
import { useCampaignRosterStore } from '@/stores/campaign/useCampaignRosterStore';
import { useCampaignStore } from '@/stores/campaign/useCampaignStore';
import {
  CampaignUnitStatus,
  CampaignPilotStatus,
  type ICampaignUnitState,
  type ICampaignPilotState,
} from '@/types/campaign/CampaignInterfaces';
import { CampaignPreset, ALL_PRESETS } from '@/types/campaign/CampaignPreset';
import { CampaignType } from '@/types/campaign/CampaignType';

import type {
  PilotAssignments,
  SelectedPilot,
  SelectedUnit,
} from './CreateCampaignPage.types';

import { useCampaignWizardNavigation } from './CreateCampaignPage.hooks';
import {
  BasicInfoStep,
  CampaignTypeStep,
  PresetStep,
  ReviewStep,
  RosterStep,
  StepIndicator,
} from './CreateCampaignPage.sections';
import {
  assignPilotToUnit,
  createEntityId,
  getAssignedUnitIdForPilot,
  removePilotAssignments,
  removeUnitAssignment,
} from './CreateCampaignPage.utils';

const WIZARD_STEPS = ['Basic Info', 'Type', 'Preset', 'Roster', 'Review'];

export default function CreateCampaignPage(): React.ReactElement {
  const router = useRouter();
  const store = useCampaignStore();
  const { showToast } = useToast();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [campaignType, setCampaignType] = useState<CampaignType>(
    CampaignType.MERCENARY,
  );
  const [selectedPreset, setSelectedPreset] = useState<CampaignPreset>(
    CampaignPreset.STANDARD,
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [selectedUnits, setSelectedUnits] = useState<SelectedUnit[]>([]);
  const [selectedPilots, setSelectedPilots] = useState<SelectedPilot[]>([]);
  const [pilotAssignments, setPilotAssignments] = useState<PilotAssignments>(
    {},
  );

  const { currentStep, localError, setLocalError, handleNext, handleBack } =
    useCampaignWizardNavigation({
      stepCount: WIZARD_STEPS.length,
      campaignName: name,
    });

  const selectedPresetDef = useMemo(() => {
    return ALL_PRESETS.find((preset) => preset.id === selectedPreset);
  }, [selectedPreset]);

  const handleAddTemplateUnit = useCallback(
    (templateName: string, tonnage: number) => {
      const unitId = createEntityId('unit');
      setSelectedUnits((previous) => {
        return [...previous, { id: unitId, name: templateName, tonnage }];
      });
    },
    [],
  );

  const handleRemoveUnit = useCallback((unitId: string) => {
    setSelectedUnits((previous) =>
      previous.filter((unit) => unit.id !== unitId),
    );
    setPilotAssignments((previous) => removeUnitAssignment(previous, unitId));
  }, []);

  const handleAddPilot = useCallback(() => {
    const pilotId = createEntityId('pilot');
    const pilotNumber = selectedPilots.length + 1;
    setSelectedPilots((previous) => {
      return [...previous, { id: pilotId, name: `MechWarrior ${pilotNumber}` }];
    });
  }, [selectedPilots.length]);

  const handleRemovePilot = useCallback((pilotId: string) => {
    setSelectedPilots((previous) =>
      previous.filter((pilot) => pilot.id !== pilotId),
    );
    setPilotAssignments((previous) =>
      removePilotAssignments(previous, pilotId),
    );
  }, []);

  const handleAssignPilot = useCallback((unitId: string, pilotId: string) => {
    setPilotAssignments((previous) =>
      assignPilotToUnit(previous, unitId, pilotId),
    );
  }, []);

  const handleSubmit = useCallback(async () => {
    setLocalError(null);
    setIsSubmitting(true);

    try {
      const campaignId = store
        .getState()
        .createCampaign(name.trim(), campaignType);

      if (campaignId) {
        if (description.trim()) {
          store.getState().updateCampaign({ description: description.trim() });
        }

        useCampaignRosterStore.getState().initRoster(campaignId);

        for (const unit of selectedUnits) {
          const template = UNIT_TEMPLATES.find(
            (entry) => entry.name === unit.name,
          );
          const unitState: ICampaignUnitState = {
            unitId: unit.id,
            unitName: unit.name,
            status: CampaignUnitStatus.Operational,
            armorDamage: {},
            structureDamage: {},
            destroyedComponents: [],
            ammoExpended: {},
            currentHeat: 0,
            repairCost: 0,
            repairTime: 0,
            pilotId: pilotAssignments[unit.id],
          };
          useCampaignRosterStore.getState().addUnit(unitState);

          if (template) {
            const forcesStore = store.getState().getForcesStore();
            if (forcesStore) {
              const rootForce = forcesStore.getState().getRootForce();
              if (rootForce) {
                forcesStore.getState().updateForce(rootForce.id, {
                  unitIds: [...rootForce.unitIds, unit.id],
                });
              }
            }
          }
        }

        for (const pilot of selectedPilots) {
          const pilotState: ICampaignPilotState = {
            pilotId: pilot.id,
            pilotName: pilot.name,
            status: CampaignPilotStatus.Active,
            wounds: 0,
            xp: 0,
            campaignXpEarned: 0,
            campaignKills: 0,
            campaignMissions: 0,
            recoveryTime: 0,
            assignedUnitId: getAssignedUnitIdForPilot(
              pilotAssignments,
              pilot.id,
            ),
          };
          useCampaignRosterStore.getState().addPilot(pilotState);
        }

        showToast({
          message: `Campaign "${name.trim()}" created successfully!`,
          variant: 'success',
        });
        router.push(`/gameplay/campaigns/${campaignId}`);
      } else {
        showToast({ message: 'Failed to create campaign', variant: 'error' });
      }
    } finally {
      setIsSubmitting(false);
    }
  }, [
    campaignType,
    description,
    name,
    pilotAssignments,
    router,
    selectedPilots,
    selectedUnits,
    setLocalError,
    showToast,
    store,
  ]);

  const handleCancel = useCallback(() => {
    router.push('/gameplay/campaigns');
  }, [router]);

  let stepContent: React.ReactNode = null;
  switch (currentStep) {
    case 0:
      stepContent = (
        <BasicInfoStep
          name={name}
          description={description}
          onNameChange={setName}
          onDescriptionChange={setDescription}
        />
      );
      break;
    case 1:
      stepContent = (
        <CampaignTypeStep
          campaignType={campaignType}
          onSelectType={setCampaignType}
        />
      );
      break;
    case 2:
      stepContent = (
        <PresetStep
          selectedPreset={selectedPreset}
          onSelectPreset={setSelectedPreset}
        />
      );
      break;
    case 3:
      stepContent = (
        <RosterStep
          selectedUnits={selectedUnits}
          selectedPilots={selectedPilots}
          pilotAssignments={pilotAssignments}
          onAddTemplateUnit={handleAddTemplateUnit}
          onRemoveUnit={handleRemoveUnit}
          onAddPilot={handleAddPilot}
          onRemovePilot={handleRemovePilot}
          onAssignPilot={handleAssignPilot}
        />
      );
      break;
    case 4:
      stepContent = (
        <ReviewStep
          name={name}
          description={description}
          campaignType={campaignType}
          selectedPreset={selectedPreset}
          selectedPresetName={selectedPresetDef?.name}
          selectedPresetDescription={selectedPresetDef?.description}
          unitCount={selectedUnits.length}
          pilotCount={selectedPilots.length}
        />
      );
      break;
    default:
      stepContent = null;
      break;
  }

  return (
    <PageLayout
      title="New Campaign"
      subtitle="Set up a multi-mission operation"
      maxWidth="wide"
      backLink="/gameplay/campaigns"
      backLabel="Back to Campaigns"
    >
      <StepIndicator steps={WIZARD_STEPS} currentStep={currentStep} />

      <div className="mb-8">{stepContent}</div>

      {localError && (
        <div
          className="mx-auto mb-6 max-w-2xl rounded-lg border border-red-600/30 bg-red-900/20 p-4"
          data-testid="name-error"
        >
          <p className="text-sm text-red-400">{localError}</p>
        </div>
      )}

      <div className="mx-auto flex max-w-2xl justify-between">
        <Button
          type="button"
          variant="secondary"
          onClick={currentStep === 0 ? handleCancel : handleBack}
          data-testid={
            currentStep === 0 ? 'wizard-cancel-btn' : 'wizard-back-btn'
          }
        >
          {currentStep === 0 ? 'Cancel' : 'Back'}
        </Button>

        {currentStep < WIZARD_STEPS.length - 1 ? (
          <Button
            type="button"
            variant="primary"
            onClick={handleNext}
            data-testid="wizard-next-btn"
          >
            Continue
          </Button>
        ) : (
          <Button
            type="button"
            variant="primary"
            onClick={handleSubmit}
            disabled={isSubmitting}
            data-testid="wizard-submit-btn"
          >
            {isSubmitting ? 'Creating...' : 'Create Campaign'}
          </Button>
        )}
      </div>
    </PageLayout>
  );
}
