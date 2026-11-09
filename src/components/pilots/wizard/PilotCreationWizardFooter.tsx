import React from 'react';

import { Button } from '@/components/ui';
import { SvgIcon } from '@/components/ui/SvgIcon';

import { type WizardStep } from './WizardTypes';

interface PilotCreationWizardFooterProps {
  canProceed: boolean;
  currentStep: WizardStep;
  isLoading: boolean;
  hasCreationFailed: boolean;
  onBack: () => void;
  onClose: () => void;
  onCreate: () => void;
  onNext: () => void;
}

function AddIcon(): React.ReactElement {
  return (
    <SvgIcon
      size="inline"
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
    </SvgIcon>
  );
}

function ContinueIcon(): React.ReactElement {
  return (
    <SvgIcon
      size="inline"
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
    </SvgIcon>
  );
}

export function PilotCreationWizardFooter({
  canProceed,
  currentStep,
  isLoading,
  hasCreationFailed,
  onBack,
  onClose,
  onCreate,
  onNext,
}: PilotCreationWizardFooterProps): React.ReactElement {
  const backLabel = hasCreationFailed
    ? 'Return to roster'
    : currentStep === 'mode'
      ? 'Cancel'
      : 'Back';
  const handleBackClick =
    hasCreationFailed || currentStep === 'mode' ? onClose : onBack;

  return (
    <div className="border-border-theme-subtle bg-surface-deep/50 flex items-center justify-between border-t px-6 py-4">
      <Button variant="ghost" onClick={handleBackClick} disabled={isLoading}>
        {backLabel}
      </Button>

      <div className="flex items-center gap-3">
        {currentStep === 'review' ? (
          <Button
            variant="primary"
            onClick={onCreate}
            isLoading={isLoading}
            disabled={hasCreationFailed}
            leftIcon={<AddIcon />}
          >
            Create Pilot
          </Button>
        ) : (
          <Button
            variant="primary"
            onClick={onNext}
            disabled={!canProceed}
            rightIcon={<ContinueIcon />}
          >
            Continue
          </Button>
        )}
      </div>
    </div>
  );
}
