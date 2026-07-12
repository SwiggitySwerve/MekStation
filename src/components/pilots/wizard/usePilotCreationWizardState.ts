import { useCallback, useEffect, useMemo, useState } from 'react';

import { useToast } from '@/components/shared/Toast';
import { usePilotSelector } from '@/stores/usePilotStore';
import {
  PilotExperienceLevel,
  IPilotIdentity,
  IPilotSkills,
  IPilotStatblock,
  PilotType,
  PILOT_TEMPLATES,
  DEFAULT_PILOT_SKILLS,
} from '@/types/pilot';

import {
  type CreationMode,
  type PilotCreationWizardProps,
  type WizardState,
  type WizardStep,
  INITIAL_STATE,
  generateRandomSkills,
} from './WizardTypes';

function getCurrentSkills(state: WizardState): IPilotSkills {
  switch (state.mode) {
    case 'template':
      return PILOT_TEMPLATES[state.templateLevel].skills;
    case 'custom':
      return state.customSkills;
    case 'random':
      return state.randomSkills || DEFAULT_PILOT_SKILLS;
    case 'statblock':
      return state.statblockSkills;
    default:
      return DEFAULT_PILOT_SKILLS;
  }
}

function getNextStep(state: WizardState, currentStep: WizardStep): WizardStep {
  if (currentStep === 'mode') return 'identity';
  if (currentStep === 'identity' && state.mode === 'statblock') return 'review';
  if (currentStep === 'identity') return 'skills';
  if (currentStep === 'skills') return 'review';
  return currentStep;
}

function getPreviousStep(
  state: WizardState,
  currentStep: WizardStep,
): WizardStep {
  if (currentStep === 'identity') return 'mode';
  if (currentStep === 'skills') return 'identity';
  if (currentStep === 'review' && state.mode === 'statblock') return 'identity';
  if (currentStep === 'review') return 'skills';
  return currentStep;
}

function validateStep(
  state: WizardState,
  currentStep: WizardStep,
): string | null {
  if (currentStep === 'mode' && !state.mode)
    return 'Please select a creation mode';
  if (currentStep === 'identity' && !state.identity.name.trim()) {
    return 'Pilot name is required';
  }
  return null;
}

function createStatblockPilot(
  state: WizardState,
  createStatblock: (statblock: IPilotStatblock) => { id: string },
): string {
  const statblock: IPilotStatblock = {
    name: state.identity.name,
    gunnery: state.statblockSkills.gunnery,
    piloting: state.statblockSkills.piloting,
  };
  return createStatblock(statblock).id;
}

async function createPilotForMode(
  state: WizardState,
  actions: {
    createFromTemplate: (
      level: PilotExperienceLevel,
      identity: IPilotIdentity,
    ) => Promise<string | null>;
    createPilot: (pilot: {
      identity: IPilotIdentity;
      type: PilotType;
      skills: IPilotSkills;
    }) => Promise<string | null>;
    createRandom: (identity: IPilotIdentity) => Promise<string | null>;
    createStatblock: (statblock: IPilotStatblock) => { id: string };
  },
): Promise<string | null> {
  switch (state.mode) {
    case 'template':
      return actions.createFromTemplate(state.templateLevel, state.identity);
    case 'custom':
      return actions.createPilot({
        identity: state.identity,
        type: PilotType.Persistent,
        skills: state.customSkills,
      });
    case 'random':
      return actions.createRandom(state.identity);
    case 'statblock':
      return createStatblockPilot(state, actions.createStatblock);
    default:
      return null;
  }
}

function successToastFor(state: WizardState): {
  message: string;
  variant: 'info' | 'success';
} {
  if (state.mode === 'statblock') {
    return {
      message: `Statblock pilot "${state.identity.name}" created`,
      variant: 'info',
    };
  }

  return {
    message: `Pilot "${state.identity.name}" created successfully!`,
    variant: 'success',
  };
}

interface PilotCreationWizardStateResult {
  readonly canProceed: boolean;
  readonly currentSkills: IPilotSkills;
  readonly currentStep: WizardStep;
  readonly error: string | null;
  readonly isLoading: boolean;
  readonly state: WizardState;
  readonly handleBack: () => void;
  readonly handleCreate: () => Promise<void>;
  readonly handleCustomSkillChange: (
    skill: keyof IPilotSkills,
    value: number,
  ) => void;
  readonly handleIdentityChange: (
    field: keyof IPilotIdentity,
    value: string,
  ) => void;
  readonly handleModeSelect: (mode: CreationMode) => void;
  readonly handleNext: () => void;
  readonly handleReroll: () => void;
  readonly handleStatblockSkillChange: (
    skill: keyof IPilotSkills,
    value: number,
  ) => void;
  readonly handleTemplateLevelChange: (level: PilotExperienceLevel) => void;
}

export function usePilotCreationWizardState({
  isOpen,
  onClose,
  onCreated,
}: PilotCreationWizardProps): PilotCreationWizardStateResult {
  const createFromTemplate = usePilotSelector(
    (state) => state.createFromTemplate,
  );
  const createRandom = usePilotSelector((state) => state.createRandom);
  const createPilot = usePilotSelector((state) => state.createPilot);
  const createStatblock = usePilotSelector((state) => state.createStatblock);
  const isLoading = usePilotSelector((state) => state.isLoading);
  const { showToast } = useToast();

  const [state, setState] = useState<WizardState>(INITIAL_STATE);
  const [currentStep, setCurrentStep] = useState<WizardStep>('mode');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setState(INITIAL_STATE);
      setCurrentStep('mode');
      setError(null);
    }
  }, [isOpen]);

  const currentSkills = useMemo(() => getCurrentSkills(state), [state]);
  const canProceed = useMemo(
    () => validateStep(state, currentStep) === null,
    [currentStep, state],
  );

  const handleModeSelect = useCallback((mode: CreationMode) => {
    setState((prev) => ({
      ...prev,
      mode,
      randomSkills:
        mode === 'random' ? generateRandomSkills() : prev.randomSkills,
    }));
  }, []);

  const handleIdentityChange = useCallback(
    (field: keyof IPilotIdentity, value: string) => {
      setState((prev) => ({
        ...prev,
        identity: { ...prev.identity, [field]: value || undefined },
      }));
    },
    [],
  );

  const handleTemplateLevelChange = useCallback(
    (level: PilotExperienceLevel) => {
      setState((prev) => ({ ...prev, templateLevel: level }));
    },
    [],
  );

  const handleCustomSkillChange = useCallback(
    (skill: keyof IPilotSkills, value: number) => {
      setState((prev) => ({
        ...prev,
        customSkills: { ...prev.customSkills, [skill]: value },
      }));
    },
    [],
  );

  const handleStatblockSkillChange = useCallback(
    (skill: keyof IPilotSkills, value: number) => {
      setState((prev) => ({
        ...prev,
        statblockSkills: { ...prev.statblockSkills, [skill]: value },
      }));
    },
    [],
  );

  const handleReroll = useCallback(() => {
    setState((prev) => ({ ...prev, randomSkills: generateRandomSkills() }));
  }, []);

  const handleNext = useCallback(() => {
    const validationError = validateStep(state, currentStep);
    setError(validationError);
    if (!validationError) setCurrentStep(getNextStep(state, currentStep));
  }, [currentStep, state]);

  const handleBack = useCallback(() => {
    setError(null);
    setCurrentStep(getPreviousStep(state, currentStep));
  }, [currentStep, state]);

  const handleCreate = useCallback(async () => {
    setError(null);

    try {
      const pilotId = await createPilotForMode(state, {
        createFromTemplate,
        createRandom,
        createPilot,
        createStatblock,
      });

      showToast(successToastFor(state));
      onCreated?.(pilotId);
      onClose();
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to create pilot';
      setError(errorMessage);
      showToast({ message: errorMessage, variant: 'error' });
    }
  }, [
    state,
    createFromTemplate,
    createRandom,
    createPilot,
    createStatblock,
    onCreated,
    onClose,
    showToast,
  ]);

  return {
    canProceed,
    currentSkills,
    currentStep,
    error,
    isLoading,
    state,
    handleBack,
    handleCreate,
    handleCustomSkillChange,
    handleIdentityChange,
    handleModeSelect,
    handleNext,
    handleReroll,
    handleStatblockSkillChange,
    handleTemplateLevelChange,
  };
}
