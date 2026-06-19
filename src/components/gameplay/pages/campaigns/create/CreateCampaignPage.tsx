import { useRouter } from 'next/router';
import { useCallback, useMemo, useState } from 'react';

import { useToast } from '@/components/shared/Toast';
import { PageLayout, Button } from '@/components/ui';
import { useCampaignStore } from '@/stores/campaign/useCampaignStore';
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
import { submitCampaignCreation } from './CreateCampaignPage.submit';
import {
  assignPilotToUnit,
  createEntityId,
  removePilotAssignments,
  removeUnitAssignment,
} from './CreateCampaignPage.utils';

const WIZARD_STEPS = ['Basic Info', 'Type', 'Preset', 'Roster', 'Review'];

interface StepContentInput {
  campaignType: CampaignType;
  currentStep: number;
  description: string;
  name: string;
  pilotAssignments: PilotAssignments;
  selectedPilots: SelectedPilot[];
  selectedPreset: CampaignPreset;
  selectedPresetDef?: (typeof ALL_PRESETS)[number];
  selectedUnits: SelectedUnit[];
  onAddPilot: () => void;
  onAddTemplateUnit: (templateName: string, tonnage: number) => void;
  onAssignPilot: (unitId: string, pilotId: string) => void;
  onDescriptionChange: (description: string) => void;
  onNameChange: (name: string) => void;
  onRemovePilot: (pilotId: string) => void;
  onRemoveUnit: (unitId: string) => void;
  onSelectPreset: (preset: CampaignPreset) => void;
  onSelectType: (type: CampaignType) => void;
}

interface CampaignWizardActionsProps {
  currentStep: number;
  isSubmitting: boolean;
  onBack: () => void;
  onCancel: () => void;
  onNext: () => void;
  onSubmit: () => void;
}

function renderStepContent({
  campaignType,
  currentStep,
  description,
  name,
  pilotAssignments,
  selectedPilots,
  selectedPreset,
  selectedPresetDef,
  selectedUnits,
  onAddPilot,
  onAddTemplateUnit,
  onAssignPilot,
  onDescriptionChange,
  onNameChange,
  onRemovePilot,
  onRemoveUnit,
  onSelectPreset,
  onSelectType,
}: StepContentInput): React.ReactNode {
  switch (currentStep) {
    case 0:
      return (
        <BasicInfoStep
          name={name}
          description={description}
          onNameChange={onNameChange}
          onDescriptionChange={onDescriptionChange}
        />
      );
    case 1:
      return (
        <CampaignTypeStep
          campaignType={campaignType}
          onSelectType={onSelectType}
        />
      );
    case 2:
      return (
        <PresetStep
          selectedPreset={selectedPreset}
          onSelectPreset={onSelectPreset}
        />
      );
    case 3:
      return (
        <RosterStep
          selectedUnits={selectedUnits}
          selectedPilots={selectedPilots}
          pilotAssignments={pilotAssignments}
          onAddTemplateUnit={onAddTemplateUnit}
          onRemoveUnit={onRemoveUnit}
          onAddPilot={onAddPilot}
          onRemovePilot={onRemovePilot}
          onAssignPilot={onAssignPilot}
        />
      );
    case 4:
      return (
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
    default:
      return null;
  }
}

function CampaignWizardActions({
  currentStep,
  isSubmitting,
  onBack,
  onCancel,
  onNext,
  onSubmit,
}: CampaignWizardActionsProps): React.ReactElement {
  const isFirstStep = currentStep === 0;
  const isReviewStep = currentStep === WIZARD_STEPS.length - 1;

  return (
    <div className="mx-auto flex max-w-2xl justify-between">
      <Button
        type="button"
        variant="secondary"
        onClick={isFirstStep ? onCancel : onBack}
        data-testid={isFirstStep ? 'wizard-cancel-btn' : 'wizard-back-btn'}
      >
        {isFirstStep ? 'Cancel' : 'Back'}
      </Button>

      {isReviewStep ? (
        <Button
          type="button"
          variant="primary"
          onClick={onSubmit}
          disabled={isSubmitting}
          data-testid="wizard-submit-btn"
        >
          {isSubmitting ? 'Creating...' : 'Create Campaign'}
        </Button>
      ) : (
        <Button
          type="button"
          variant="primary"
          onClick={onNext}
          data-testid="wizard-next-btn"
        >
          Continue
        </Button>
      )}
    </div>
  );
}

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

  const handleSubmit = useCallback(
    () =>
      submitCampaignCreation({
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
      }),
    [
      campaignType,
      description,
      name,
      pilotAssignments,
      router,
      selectedPilots,
      selectedPreset,
      selectedUnits,
      setLocalError,
      showToast,
      store,
    ],
  );

  const handleCancel = useCallback(() => {
    router.push('/gameplay/campaigns');
  }, [router]);

  const stepContent = renderStepContent({
    campaignType,
    currentStep,
    description,
    name,
    pilotAssignments,
    selectedPilots,
    selectedPreset,
    selectedPresetDef,
    selectedUnits,
    onAddPilot: handleAddPilot,
    onAddTemplateUnit: handleAddTemplateUnit,
    onAssignPilot: handleAssignPilot,
    onDescriptionChange: setDescription,
    onNameChange: setName,
    onRemovePilot: handleRemovePilot,
    onRemoveUnit: handleRemoveUnit,
    onSelectPreset: setSelectedPreset,
    onSelectType: setCampaignType,
  });

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

      <CampaignWizardActions
        currentStep={currentStep}
        isSubmitting={isSubmitting}
        onBack={handleBack}
        onCancel={handleCancel}
        onNext={handleNext}
        onSubmit={handleSubmit}
      />
    </PageLayout>
  );
}
