import { useCallback, useState } from 'react';

import type {
  PilotAssignments,
  SelectedPilot,
  SelectedUnit,
} from './CreateCampaignPage.types';

import {
  assignPilotToUnit,
  createEntityId,
  removePilotAssignments,
  removeUnitAssignment,
} from './CreateCampaignPage.utils';

interface UseCampaignWizardNavigationOptions {
  stepCount: number;
  campaignName: string;
}

interface UseCampaignWizardNavigationResult {
  currentStep: number;
  localError: string | null;
  setLocalError: (value: string | null) => void;
  handleNext: () => void;
  handleBack: () => void;
}

interface UseCampaignRosterDraftResult {
  selectedUnits: SelectedUnit[];
  selectedPilots: SelectedPilot[];
  pilotAssignments: PilotAssignments;
  handleAddTemplateUnit: (
    templateName: string,
    tonnage: number,
    unitRef: string,
  ) => void;
  handleRemoveUnit: (unitId: string) => void;
  handleAddPilot: () => void;
  handleRemovePilot: (pilotId: string) => void;
  handleAssignPilot: (unitId: string, pilotId: string) => void;
}

export function useCampaignWizardNavigation({
  stepCount,
  campaignName,
}: UseCampaignWizardNavigationOptions): UseCampaignWizardNavigationResult {
  const [currentStep, setCurrentStep] = useState(0);
  const [localError, setLocalError] = useState<string | null>(null);

  const handleNext = useCallback(() => {
    setLocalError(null);

    if (currentStep === 0 && !campaignName.trim()) {
      setLocalError('Campaign name is required');
      return;
    }

    setCurrentStep((previous) => Math.min(previous + 1, stepCount - 1));
  }, [campaignName, currentStep, stepCount]);

  const handleBack = useCallback(() => {
    setCurrentStep((previous) => Math.max(previous - 1, 0));
  }, []);

  return {
    currentStep,
    localError,
    setLocalError,
    handleNext,
    handleBack,
  };
}

export function useCampaignRosterDraft(): UseCampaignRosterDraftResult {
  const [selectedUnits, setSelectedUnits] = useState<SelectedUnit[]>([]);
  const [selectedPilots, setSelectedPilots] = useState<SelectedPilot[]>([]);
  const [pilotAssignments, setPilotAssignments] = useState<PilotAssignments>(
    {},
  );

  const handleAddTemplateUnit = useCallback(
    (templateName: string, tonnage: number, unitRef: string) => {
      const unitId = createEntityId('unit');
      setSelectedUnits((previous) => {
        return [
          ...previous,
          { id: unitId, name: templateName, tonnage, unitRef },
        ];
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
    setSelectedPilots((previous) => {
      const pilotNumber = previous.length + 1;
      return [...previous, { id: pilotId, name: `MechWarrior ${pilotNumber}` }];
    });
  }, []);

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

  return {
    selectedUnits,
    selectedPilots,
    pilotAssignments,
    handleAddTemplateUnit,
    handleRemoveUnit,
    handleAddPilot,
    handleRemovePilot,
    handleAssignPilot,
  };
}
