import React from 'react';

import { type CreationMode, type WizardStep } from './WizardTypes';

interface StepIndicatorProps {
  currentStep: WizardStep;
  mode: CreationMode | null;
}

export function StepIndicator({
  currentStep,
  mode,
}: StepIndicatorProps): React.ReactElement {
  const steps: { id: WizardStep; label: string }[] = [
    { id: 'mode', label: 'Mode' },
    { id: 'identity', label: 'Identity' },
    { id: 'skills', label: 'Skills' },
    { id: 'review', label: 'Review' },
  ];

  const visibleSteps =
    mode === 'statblock' ? steps.filter((s) => s.id !== 'skills') : steps;

  const currentIndex = visibleSteps.findIndex((s) => s.id === currentStep);

  return (
    <div className="mb-6 flex items-center justify-center gap-2">
      {visibleSteps.map((step, index) => {
        const isActive = step.id === currentStep;
        const isCompleted = index < currentIndex;

        return (
          <React.Fragment key={step.id}>
            {index > 0 && (
              <div
                className={`h-px w-8 transition-colors ${
                  isCompleted ? 'bg-accent' : 'bg-border-theme-subtle'
                }`}
              />
            )}
            <div className="flex flex-col items-center gap-1">
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? 'bg-accent text-surface-deep ring-accent/30 ring-offset-surface-base ring-2 ring-offset-2'
                    : isCompleted
                      ? 'bg-accent/20 text-accent border-accent/50 border'
                      : 'bg-surface-raised text-text-theme-secondary border-border-theme-subtle border'
                } `}
              >
                {isCompleted ? (
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
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                ) : (
                  index + 1
                )}
              </div>
              <span
                className={`text-xs transition-colors ${
                  isActive
                    ? 'text-accent font-medium'
                    : 'text-text-theme-secondary'
                }`}
              >
                {step.label}
              </span>
            </div>
          </React.Fragment>
        );
      })}
    </div>
  );
}
