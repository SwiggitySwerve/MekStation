import React from 'react';

import { Badge, Card } from '@/components/ui';
import { IPilotIdentity, IPilotSkills, getPilotRating } from '@/types/pilot';

import { SkillPreview } from './SkillsStep';
import { CreationMode, MODE_INFO } from './WizardTypes';

interface ReviewStepProps {
  identity: IPilotIdentity;
  mode: CreationMode;
  currentSkills: IPilotSkills;
  isCustomMode: boolean;
}

export function ReviewStep({
  identity,
  mode,
  currentSkills,
  isCustomMode,
}: ReviewStepProps): React.ReactElement {
  return (
    <div className="space-y-6">
      <div className="mb-6 text-center">
        <h3 className="text-text-theme-primary text-lg font-semibold">
          Review &amp; Confirm
        </h3>
        <p className="text-text-theme-secondary mt-1 text-sm">
          Verify your pilot details before creation
        </p>
      </div>

      <Card variant="accent-left" accentColor="amber" className="p-5">
        <div className="flex items-start gap-4">
          <div className="bg-surface-raised flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-lg">
            <svg
              className="text-text-theme-secondary h-8 w-8"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
              />
            </svg>
          </div>

          <div className="min-w-0 flex-1">
            <h4 className="text-text-theme-primary truncate text-xl font-bold">
              {identity.name}
            </h4>
            {identity.callsign && (
              <p className="text-accent font-medium">
                &quot;{identity.callsign}&quot;
              </p>
            )}
            {identity.affiliation && (
              <p className="text-text-theme-secondary mt-1 text-sm">
                {identity.affiliation}
              </p>
            )}

            <div className="mt-2 flex items-center gap-2">
              <Badge
                variant={mode === 'statblock' ? 'amber' : 'emerald'}
                size="sm"
              >
                {mode === 'statblock' ? 'Statblock' : 'Persistent'}
              </Badge>
              <Badge variant="slate" size="sm">
                {MODE_INFO[mode].title}
              </Badge>
            </div>
          </div>

          <div className="flex-shrink-0 text-right">
            <div className="text-accent text-3xl font-bold tabular-nums">
              {getPilotRating(currentSkills)}
            </div>
            <div className="text-text-theme-secondary text-xs">
              Gunnery/Piloting
            </div>
          </div>
        </div>
      </Card>

      <SkillPreview
        skills={currentSkills}
        label="Combat Skills"
        showPointCost={isCustomMode}
      />

      {mode === 'statblock' && (
        <div className="flex items-start gap-3 rounded-lg border border-amber-600/30 bg-amber-900/20 p-3">
          <svg
            className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
          <p className="text-sm text-amber-200">
            Statblock pilots are not saved to the database. They&apos;re
            intended for quick NPC creation during gameplay.
          </p>
        </div>
      )}
    </div>
  );
}
