import React from 'react';

import { Input } from '@/components/ui';
import {
  IPilotIdentity,
  IPilotSkills,
  GUNNERY_IMPROVEMENT_COSTS,
  PILOTING_IMPROVEMENT_COSTS,
} from '@/types/pilot';

import { SkillSlider } from './SkillsStep';

interface IdentityStepProps {
  identity: IPilotIdentity;
  isStatblockMode: boolean;
  statblockSkills: IPilotSkills;
  onIdentityChange: (field: keyof IPilotIdentity, value: string) => void;
  onStatblockSkillChange: (skill: keyof IPilotSkills, value: number) => void;
}

export function IdentityStep({
  identity,
  isStatblockMode,
  statblockSkills,
  onIdentityChange,
  onStatblockSkillChange,
}: IdentityStepProps): React.ReactElement {
  return (
    <div className="space-y-6">
      <div className="mb-6 text-center">
        <h3 className="text-text-theme-primary text-lg font-semibold">
          Pilot Identity
        </h3>
        <p className="text-text-theme-secondary mt-1 text-sm">
          Enter your pilot&apos;s basic information
        </p>
      </div>

      <div className="space-y-4">
        <Input
          label="Name *"
          placeholder="Enter pilot name"
          value={identity.name}
          onChange={(e) => onIdentityChange('name', e.target.value)}
          autoFocus
        />

        <Input
          label="Callsign"
          placeholder="Enter callsign (optional)"
          value={identity.callsign || ''}
          onChange={(e) => onIdentityChange('callsign', e.target.value)}
        />

        <Input
          label="Affiliation"
          placeholder="Enter faction/house (optional)"
          value={identity.affiliation || ''}
          onChange={(e) => onIdentityChange('affiliation', e.target.value)}
        />

        {isStatblockMode && (
          <div className="border-border-theme-subtle border-t pt-4">
            <h4 className="text-text-theme-secondary mb-4 text-sm font-medium">
              Combat Skills
            </h4>
            <div className="space-y-4">
              <SkillSlider
                label="Gunnery"
                value={statblockSkills.gunnery}
                onChange={(v) => onStatblockSkillChange('gunnery', v)}
                improvementCosts={GUNNERY_IMPROVEMENT_COSTS}
              />
              <SkillSlider
                label="Piloting"
                value={statblockSkills.piloting}
                onChange={(v) => onStatblockSkillChange('piloting', v)}
                improvementCosts={PILOTING_IMPROVEMENT_COSTS}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
