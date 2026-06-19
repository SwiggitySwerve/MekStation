import React from 'react';

import {
  PilotExperienceLevel,
  IPilotIdentity,
  IPilotSkills,
} from '@/types/pilot';

import { IdentityStep } from './IdentityStep';
import { ModeSelectionStep } from './ModeSelectionStep';
import { ReviewStep } from './ReviewStep';
import { SkillsStep } from './SkillsStep';
import {
  type CreationMode,
  type WizardState,
  type WizardStep,
} from './WizardTypes';

interface PilotCreationWizardContentProps {
  currentSkills: IPilotSkills;
  currentStep: WizardStep;
  state: WizardState;
  onCustomSkillChange: (skill: keyof IPilotSkills, value: number) => void;
  onIdentityChange: (field: keyof IPilotIdentity, value: string) => void;
  onModeSelect: (mode: CreationMode) => void;
  onReroll: () => void;
  onStatblockSkillChange: (skill: keyof IPilotSkills, value: number) => void;
  onTemplateLevelChange: (level: PilotExperienceLevel) => void;
}

export function PilotCreationWizardContent({
  currentSkills,
  currentStep,
  state,
  onCustomSkillChange,
  onIdentityChange,
  onModeSelect,
  onReroll,
  onStatblockSkillChange,
  onTemplateLevelChange,
}: PilotCreationWizardContentProps): React.ReactElement {
  switch (currentStep) {
    case 'mode':
      return (
        <ModeSelectionStep
          selectedMode={state.mode}
          onModeSelect={onModeSelect}
        />
      );

    case 'identity':
      return (
        <IdentityStep
          identity={state.identity}
          isStatblockMode={state.mode === 'statblock'}
          statblockSkills={state.statblockSkills}
          onIdentityChange={onIdentityChange}
          onStatblockSkillChange={onStatblockSkillChange}
        />
      );

    case 'skills':
      return (
        <SkillsStep
          state={state}
          onTemplateLevelChange={onTemplateLevelChange}
          onCustomSkillChange={onCustomSkillChange}
          onReroll={onReroll}
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
}
