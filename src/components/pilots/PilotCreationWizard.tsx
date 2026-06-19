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

import React from 'react';

import { ModalOverlay } from '@/components/customizer/dialogs/ModalOverlay';

import { PilotCreationWizardContent } from './wizard/PilotCreationWizardContent';
import { PilotCreationWizardFooter } from './wizard/PilotCreationWizardFooter';
import { StepIndicator } from './wizard/StepIndicator';
import { usePilotCreationWizardState } from './wizard/usePilotCreationWizardState';
import { type PilotCreationWizardProps } from './wizard/WizardTypes';

export function PilotCreationWizard({
  isOpen,
  onClose,
  onCreated,
}: PilotCreationWizardProps): React.ReactElement | null {
  const wizard = usePilotCreationWizardState({ isOpen, onClose, onCreated });

  return (
    <ModalOverlay
      isOpen={isOpen}
      onClose={onClose}
      preventClose={wizard.isLoading}
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
            disabled={wizard.isLoading}
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
          <StepIndicator
            currentStep={wizard.currentStep}
            mode={wizard.state.mode}
          />
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          <PilotCreationWizardContent
            currentSkills={wizard.currentSkills}
            currentStep={wizard.currentStep}
            state={wizard.state}
            onCustomSkillChange={wizard.handleCustomSkillChange}
            onIdentityChange={wizard.handleIdentityChange}
            onModeSelect={wizard.handleModeSelect}
            onReroll={wizard.handleReroll}
            onStatblockSkillChange={wizard.handleStatblockSkillChange}
            onTemplateLevelChange={wizard.handleTemplateLevelChange}
          />

          {wizard.error && (
            <div className="mt-4 rounded-lg border border-red-600/30 bg-red-900/20 p-3">
              <p className="text-sm text-red-400">{wizard.error}</p>
            </div>
          )}
        </div>

        <PilotCreationWizardFooter
          canProceed={wizard.canProceed}
          currentStep={wizard.currentStep}
          isLoading={wizard.isLoading}
          onBack={wizard.handleBack}
          onClose={onClose}
          onCreate={wizard.handleCreate}
          onNext={wizard.handleNext}
        />
      </div>
    </ModalOverlay>
  );
}

export default PilotCreationWizard;
