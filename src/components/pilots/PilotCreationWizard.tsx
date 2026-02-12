/**
 * Pilot Creation Wizard
 *
 * Multi-step wizard for creating pilots with 4 modes:
 * - Template: Quick creation using experience level presets
 * - Custom: Point-buy skill configuration
 * - Random: Randomly generated skills
 * - Statblock: Quick NPC creation (no persistence)
 *
 * @spec openspec/changes/add-pilot-system/specs/pilot-system/spec.md
 */

import React, { useState, useCallback, useMemo } from 'react';

import { ModalOverlay } from '@/components/customizer/dialogs/ModalOverlay';
import { useToast } from '@/components/shared/Toast';
import { Button } from '@/components/ui';
import { usePilotStore } from '@/stores/usePilotStore';
import {
  PilotExperienceLevel,
  IPilotIdentity,
  IPilotSkills,
  IPilotStatblock,
  PilotType,
  PILOT_TEMPLATES,
  DEFAULT_PILOT_SKILLS,
} from '@/types/pilot';

import { IdentityStep } from './wizard/IdentityStep';
import { ModeSelectionStep } from './wizard/ModeSelectionStep';
import { ReviewStep } from './wizard/ReviewStep';
import { SkillsStep } from './wizard/SkillsStep';
import { StepIndicator } from './wizard/StepIndicator';
import {
  type CreationMode,
  type WizardStep,
  type WizardState,
  type PilotCreationWizardProps,
  INITIAL_STATE,
  generateRandomSkills,
} from './wizard/WizardTypes';

export function PilotCreationWizard({
  isOpen,
  onClose,
  onCreated,
}: PilotCreationWizardProps): React.ReactElement | null {
  const {
    createFromTemplate,
    createRandom,
    createPilot,
    createStatblock,
    isLoading,
  } = usePilotStore();
  const { showToast } = useToast();

  const [state, setState] = useState<WizardState>(INITIAL_STATE);
  const [currentStep, setCurrentStep] = useState<WizardStep>('mode');
  const [error, setError] = useState<string | null>(null);

  React.useEffect(() => {
    if (isOpen) {
      setState(INITIAL_STATE);
      setCurrentStep('mode');
      setError(null);
    }
  }, [isOpen]);

  const currentSkills = useMemo((): IPilotSkills => {
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
  }, [state]);

  const handleModeSelect = useCallback((mode: CreationMode) => {
    setState((prev) => ({ ...prev, mode }));
    if (mode === 'random') {
      setState((prev) => ({ ...prev, randomSkills: generateRandomSkills() }));
    }
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
    setError(null);

    if (currentStep === 'mode') {
      if (!state.mode) {
        setError('Please select a creation mode');
        return;
      }
      setCurrentStep('identity');
    } else if (currentStep === 'identity') {
      if (!state.identity.name.trim()) {
        setError('Pilot name is required');
        return;
      }
      if (state.mode === 'statblock') {
        setCurrentStep('review');
      } else {
        setCurrentStep('skills');
      }
    } else if (currentStep === 'skills') {
      setCurrentStep('review');
    }
  }, [currentStep, state.mode, state.identity.name]);

  const handleBack = useCallback(() => {
    setError(null);

    if (currentStep === 'identity') {
      setCurrentStep('mode');
    } else if (currentStep === 'skills') {
      setCurrentStep('identity');
    } else if (currentStep === 'review') {
      if (state.mode === 'statblock') {
        setCurrentStep('identity');
      } else {
        setCurrentStep('skills');
      }
    }
  }, [currentStep, state.mode]);

  const handleCreate = useCallback(async () => {
    setError(null);

    try {
      let pilotId: string | null = null;

      switch (state.mode) {
        case 'template':
          pilotId = await createFromTemplate(
            state.templateLevel,
            state.identity,
          );
          break;

        case 'custom':
          pilotId = await createPilot({
            identity: state.identity,
            type: PilotType.Persistent,
            skills: state.customSkills,
          });
          break;

        case 'random':
          pilotId = await createRandom(state.identity);
          break;

        case 'statblock': {
          const statblock: IPilotStatblock = {
            name: state.identity.name,
            gunnery: state.statblockSkills.gunnery,
            piloting: state.statblockSkills.piloting,
          };
          const pilot = createStatblock(statblock);
          pilotId = pilot.id;
          break;
        }
      }

      if (state.mode === 'statblock') {
        showToast({
          message: `Statblock pilot "${state.identity.name}" created`,
          variant: 'info',
        });
      } else {
        showToast({
          message: `Pilot "${state.identity.name}" created successfully!`,
          variant: 'success',
        });
      }

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

  const renderStepContent = (): React.ReactElement => {
    switch (currentStep) {
      case 'mode':
        return (
          <ModeSelectionStep
            selectedMode={state.mode}
            onModeSelect={handleModeSelect}
          />
        );

      case 'identity':
        return (
          <IdentityStep
            identity={state.identity}
            isStatblockMode={state.mode === 'statblock'}
            statblockSkills={state.statblockSkills}
            onIdentityChange={handleIdentityChange}
            onStatblockSkillChange={handleStatblockSkillChange}
          />
        );

      case 'skills':
        return (
          <SkillsStep
            state={state}
            onTemplateLevelChange={(level: PilotExperienceLevel) =>
              setState((prev) => ({ ...prev, templateLevel: level }))
            }
            onCustomSkillChange={handleCustomSkillChange}
            onReroll={handleReroll}
          />
        );

      case 'review':
        return (
          <ReviewStep
            identity={state.identity}
            mode={state.mode!}
            currentSkills={currentSkills}
            isCustomMode={state.mode === 'custom'}
          />
        );
    }
  };

  const canProceed =
    currentStep === 'mode'
      ? state.mode !== null
      : currentStep === 'identity'
        ? state.identity.name.trim() !== ''
        : true;

  return (
    <ModalOverlay
      isOpen={isOpen}
      onClose={onClose}
      preventClose={isLoading}
      className="max-h-[85vh] w-full overflow-hidden sm:w-[560px]"
    >
      <div className="flex h-full flex-col">
        <div className="border-border-theme-subtle bg-surface-deep/50 flex items-center justify-between border-b px-6 py-4">
          <div>
            <h2 className="text-text-theme-primary text-xl font-bold">
              Create Pilot
            </h2>
            <p className="text-text-theme-secondary text-sm">
              MechWarrior personnel record
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={isLoading}
            className="text-text-theme-secondary hover:text-text-theme-primary hover:bg-surface-raised rounded-lg p-2 transition-colors"
            aria-label="Close"
          >
            <svg
              className="h-5 w-5"
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

        <div className="bg-surface-base px-6 pt-4">
          <StepIndicator currentStep={currentStep} mode={state.mode} />
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          {renderStepContent()}

          {error && (
            <div className="mt-4 rounded-lg border border-red-600/30 bg-red-900/20 p-3">
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}
        </div>

        <div className="border-border-theme-subtle bg-surface-deep/50 flex items-center justify-between border-t px-6 py-4">
          <Button
            variant="ghost"
            onClick={currentStep === 'mode' ? onClose : handleBack}
            disabled={isLoading}
          >
            {currentStep === 'mode' ? 'Cancel' : 'Back'}
          </Button>

          <div className="flex items-center gap-3">
            {currentStep === 'review' ? (
              <Button
                variant="primary"
                onClick={handleCreate}
                isLoading={isLoading}
                leftIcon={
                  <svg
                    className="h-4 w-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 4v16m8-8H4"
                    />
                  </svg>
                }
              >
                Create Pilot
              </Button>
            ) : (
              <Button
                variant="primary"
                onClick={handleNext}
                disabled={!canProceed}
                rightIcon={
                  <svg
                    className="h-4 w-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                }
              >
                Continue
              </Button>
            )}
          </div>
        </div>
      </div>
    </ModalOverlay>
  );
}

export default PilotCreationWizard;
