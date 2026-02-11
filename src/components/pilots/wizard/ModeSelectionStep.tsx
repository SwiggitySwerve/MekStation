import React from 'react';

import { Badge } from '@/components/ui';

import { CreationMode, MODE_INFO } from './WizardTypes';

// =============================================================================
// Sub-Components
// =============================================================================

interface ModeCardProps {
  mode: CreationMode;
  isSelected: boolean;
  onClick: () => void;
}

function ModeCard({
  mode,
  isSelected,
  onClick,
}: ModeCardProps): React.ReactElement {
  const info = MODE_INFO[mode];

  return (
    <button
      onClick={onClick}
      className={`group relative w-full rounded-lg border-2 p-4 text-left transition-all duration-200 hover:scale-[1.02] ${
        isSelected
          ? 'border-accent bg-accent/10 shadow-accent/20 shadow-lg'
          : 'border-border-theme-subtle bg-surface-raised/30 hover:border-border-theme hover:bg-surface-raised/50'
      } `}
    >
      {/* Selection indicator */}
      <div
        className={`absolute top-3 right-3 flex h-5 w-5 items-center justify-center rounded-full border-2 transition-all duration-200 ${
          isSelected
            ? 'border-accent bg-accent'
            : 'border-border-theme group-hover:border-text-theme-secondary'
        } `}
      >
        {isSelected && (
          <svg
            className="text-surface-deep h-3 w-3"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={3}
              d="M5 13l4 4L19 7"
            />
          </svg>
        )}
      </div>

      <div
        className={`mb-3 flex h-10 w-10 items-center justify-center rounded-lg ${isSelected ? 'bg-accent/20 text-accent' : 'bg-surface-raised text-text-theme-secondary group-hover:text-text-theme-primary'} `}
      >
        {info.icon}
      </div>

      <h3
        className={`mb-1 text-lg font-semibold transition-colors ${
          isSelected ? 'text-accent' : 'text-text-theme-primary'
        }`}
      >
        {info.title}
      </h3>

      <p className="text-text-theme-secondary text-sm leading-relaxed">
        {info.description}
      </p>

      {mode === 'statblock' && (
        <Badge variant="amber" size="sm" className="mt-3">
          No Persistence
        </Badge>
      )}
    </button>
  );
}

// =============================================================================
// ModeSelectionStep
// =============================================================================

interface ModeSelectionStepProps {
  selectedMode: CreationMode | null;
  onModeSelect: (mode: CreationMode) => void;
}

export function ModeSelectionStep({
  selectedMode,
  onModeSelect,
}: ModeSelectionStepProps): React.ReactElement {
  return (
    <div className="space-y-4">
      <div className="mb-6 text-center">
        <h3 className="text-text-theme-primary text-lg font-semibold">
          Choose Creation Mode
        </h3>
        <p className="text-text-theme-secondary mt-1 text-sm">
          Select how you want to create your pilot
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {(Object.keys(MODE_INFO) as CreationMode[]).map((mode) => (
          <ModeCard
            key={mode}
            mode={mode}
            isSelected={selectedMode === mode}
            onClick={() => onModeSelect(mode)}
          />
        ))}
      </div>
    </div>
  );
}
