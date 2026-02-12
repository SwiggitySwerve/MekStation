import React from 'react';

import { Badge, Button } from '@/components/ui';
import {
  PilotExperienceLevel,
  IPilotSkills,
  PILOT_TEMPLATES,
  MIN_SKILL_VALUE,
  MAX_SKILL_VALUE,
  getSkillLabel,
  getPilotRating,
  GUNNERY_IMPROVEMENT_COSTS,
  PILOTING_IMPROVEMENT_COSTS,
} from '@/types/pilot';

import { WizardState, calculatePointCost } from './WizardTypes';

// =============================================================================
// SkillSlider
// =============================================================================

interface SkillSliderProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  improvementCosts: Record<number, number>;
}

export function SkillSlider({
  label,
  value,
  onChange,
  improvementCosts,
}: SkillSliderProps): React.ReactElement {
  const skillLabel = getSkillLabel(value);
  const nextCost = improvementCosts[value];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-text-theme-primary text-sm font-medium">
          {label}
        </span>
        <div className="flex items-center gap-2">
          <span className="text-accent text-2xl font-bold tabular-nums">
            {value}
          </span>
          <Badge
            variant={value <= 3 ? 'emerald' : value <= 5 ? 'amber' : 'slate'}
            size="sm"
          >
            {skillLabel}
          </Badge>
        </div>
      </div>

      <div className="relative">
        <input
          type="range"
          min={MIN_SKILL_VALUE}
          max={MAX_SKILL_VALUE}
          value={value}
          onChange={(e) => onChange(parseInt(e.target.value))}
          className="bg-surface-raised [&::-webkit-slider-thumb]:bg-accent [&::-webkit-slider-thumb]:shadow-accent/30 [&::-moz-range-thumb]:bg-accent h-2 w-full cursor-pointer appearance-none rounded-lg [&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:cursor-pointer [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:shadow-lg [&::-webkit-slider-thumb]:transition-transform [&::-webkit-slider-thumb]:hover:scale-110"
        />

        <div className="mt-1 flex justify-between px-2">
          {Array.from(
            { length: MAX_SKILL_VALUE - MIN_SKILL_VALUE + 1 },
            (_, i) => (
              <div
                key={i}
                className={`h-1.5 w-0.5 rounded-full ${
                  i + MIN_SKILL_VALUE <= value
                    ? 'bg-accent'
                    : 'bg-border-theme-subtle'
                }`}
              />
            ),
          )}
        </div>
      </div>

      {nextCost && value > MIN_SKILL_VALUE && (
        <p className="text-text-theme-secondary text-xs">
          Cost to improve:{' '}
          <span className="text-accent font-medium">{nextCost} XP</span>
        </p>
      )}
    </div>
  );
}

// =============================================================================
// TemplateSelector
// =============================================================================

interface TemplateSelectorProps {
  selected: PilotExperienceLevel;
  onChange: (level: PilotExperienceLevel) => void;
}

function TemplateSelector({
  selected,
  onChange,
}: TemplateSelectorProps): React.ReactElement {
  const levels = Object.values(PilotExperienceLevel);

  return (
    <div className="grid grid-cols-2 gap-3">
      {levels.map((level) => {
        const template = PILOT_TEMPLATES[level];
        const isSelected = selected === level;

        return (
          <button
            key={level}
            onClick={() => onChange(level)}
            className={`rounded-lg border-2 p-4 text-left transition-all duration-200 ${
              isSelected
                ? 'border-accent bg-accent/10'
                : 'border-border-theme-subtle bg-surface-raised/30 hover:border-border-theme'
            } `}
          >
            <div className="mb-2 flex items-center justify-between">
              <h4
                className={`font-semibold ${isSelected ? 'text-accent' : 'text-text-theme-primary'}`}
              >
                {template.name}
              </h4>
              <span className="text-accent text-lg font-bold tabular-nums">
                {getPilotRating(template.skills)}
              </span>
            </div>
            <p className="text-text-theme-secondary mb-2 text-xs">
              {template.description}
            </p>
            {template.startingXp > 0 && (
              <Badge variant="amber" size="sm">
                +{template.startingXp} XP
              </Badge>
            )}
          </button>
        );
      })}
    </div>
  );
}

// =============================================================================
// SkillPreview
// =============================================================================

interface SkillPreviewProps {
  skills: IPilotSkills;
  label?: string;
  showPointCost?: boolean;
}

export function SkillPreview({
  skills,
  label,
  showPointCost,
}: SkillPreviewProps): React.ReactElement {
  const pointCost = showPointCost ? calculatePointCost(skills) : 0;

  return (
    <div className="bg-surface-raised/50 border-border-theme-subtle rounded-lg border p-4">
      {label && (
        <h4 className="text-text-theme-secondary mb-3 text-sm font-medium">
          {label}
        </h4>
      )}
      <div className="flex items-center justify-center gap-8">
        <div className="text-center">
          <div className="text-accent text-3xl font-bold tabular-nums">
            {skills.gunnery}
          </div>
          <div className="text-text-theme-secondary mt-1 text-xs">Gunnery</div>
          <Badge
            variant={
              skills.gunnery <= 3
                ? 'emerald'
                : skills.gunnery <= 5
                  ? 'amber'
                  : 'slate'
            }
            size="sm"
            className="mt-2"
          >
            {getSkillLabel(skills.gunnery)}
          </Badge>
        </div>
        <div className="text-border-theme text-4xl font-light">/</div>
        <div className="text-center">
          <div className="text-accent text-3xl font-bold tabular-nums">
            {skills.piloting}
          </div>
          <div className="text-text-theme-secondary mt-1 text-xs">Piloting</div>
          <Badge
            variant={
              skills.piloting <= 3
                ? 'emerald'
                : skills.piloting <= 5
                  ? 'amber'
                  : 'slate'
            }
            size="sm"
            className="mt-2"
          >
            {getSkillLabel(skills.piloting)}
          </Badge>
        </div>
      </div>
      {showPointCost && pointCost > 0 && (
        <div className="border-border-theme-subtle mt-4 border-t pt-3 text-center">
          <span className="text-text-theme-secondary text-sm">
            Total XP Investment:{' '}
          </span>
          <span className="text-accent text-lg font-bold">{pointCost}</span>
        </div>
      )}
    </div>
  );
}

// =============================================================================
// SkillsStep
// =============================================================================

interface SkillsStepProps {
  state: WizardState;
  onTemplateLevelChange: (level: PilotExperienceLevel) => void;
  onCustomSkillChange: (skill: keyof IPilotSkills, value: number) => void;
  onReroll: () => void;
}

export function SkillsStep({
  state,
  onTemplateLevelChange,
  onCustomSkillChange,
  onReroll,
}: SkillsStepProps): React.ReactElement {
  return (
    <div className="space-y-6">
      <div className="mb-6 text-center">
        <h3 className="text-text-theme-primary text-lg font-semibold">
          {state.mode === 'template' && 'Select Experience Level'}
          {state.mode === 'custom' && 'Configure Skills'}
          {state.mode === 'random' && 'Random Skills'}
        </h3>
        <p className="text-text-theme-secondary mt-1 text-sm">
          {state.mode === 'template' && 'Choose a preset skill configuration'}
          {state.mode === 'custom' && 'Set gunnery and piloting values'}
          {state.mode === 'random' && 'Your randomly generated pilot skills'}
        </p>
      </div>

      {state.mode === 'template' && (
        <TemplateSelector
          selected={state.templateLevel}
          onChange={onTemplateLevelChange}
        />
      )}

      {state.mode === 'custom' && (
        <div className="space-y-6">
          <SkillSlider
            label="Gunnery"
            value={state.customSkills.gunnery}
            onChange={(v) => onCustomSkillChange('gunnery', v)}
            improvementCosts={GUNNERY_IMPROVEMENT_COSTS}
          />
          <SkillSlider
            label="Piloting"
            value={state.customSkills.piloting}
            onChange={(v) => onCustomSkillChange('piloting', v)}
            improvementCosts={PILOTING_IMPROVEMENT_COSTS}
          />
          <SkillPreview skills={state.customSkills} showPointCost />
        </div>
      )}

      {state.mode === 'random' && state.randomSkills && (
        <div className="space-y-4">
          <SkillPreview skills={state.randomSkills} label="Generated Skills" />

          <div className="flex justify-center">
            <Button
              variant="secondary"
              onClick={onReroll}
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
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
              }
            >
              Reroll
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
