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
import { Button, Input, Badge, Card } from '@/components/ui';
import { usePilotStore } from '@/stores/usePilotStore';
import {
  PilotExperienceLevel,
  IPilotIdentity,
  IPilotSkills,
  IPilotStatblock,
  PilotType,
  PILOT_TEMPLATES,
  DEFAULT_PILOT_SKILLS,
  MIN_SKILL_VALUE,
  MAX_SKILL_VALUE,
  getSkillLabel,
  getPilotRating,
  GUNNERY_IMPROVEMENT_COSTS,
  PILOTING_IMPROVEMENT_COSTS,
} from '@/types/pilot';

// =============================================================================
// Types
// =============================================================================

type CreationMode = 'template' | 'custom' | 'random' | 'statblock';
type WizardStep = 'mode' | 'identity' | 'skills' | 'review';

interface WizardState {
  mode: CreationMode | null;
  identity: IPilotIdentity;
  templateLevel: PilotExperienceLevel;
  customSkills: IPilotSkills;
  randomSkills: IPilotSkills | null;
  statblockSkills: IPilotSkills;
}

interface PilotCreationWizardProps {
  /** Whether the wizard is open */
  isOpen: boolean;
  /** Called when the wizard is closed */
  onClose: () => void;
  /** Called when a pilot is successfully created */
  onCreated?: (pilotId: string | null) => void;
}

// =============================================================================
// Constants
// =============================================================================

const INITIAL_STATE: WizardState = {
  mode: null,
  identity: { name: '' },
  templateLevel: PilotExperienceLevel.Regular,
  customSkills: { ...DEFAULT_PILOT_SKILLS },
  randomSkills: null,
  statblockSkills: { ...DEFAULT_PILOT_SKILLS },
};

const MODE_INFO: Record<
  CreationMode,
  { title: string; description: string; icon: React.ReactNode }
> = {
  template: {
    title: 'Template',
    description:
      'Quick creation using experience level presets. Perfect for starting campaigns.',
    icon: (
      <svg
        className="h-6 w-6"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
        />
      </svg>
    ),
  },
  custom: {
    title: 'Custom',
    description:
      'Build your pilot from scratch with point-buy skill allocation.',
    icon: (
      <svg
        className="h-6 w-6"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"
        />
      </svg>
    ),
  },
  random: {
    title: 'Random',
    description: 'Generate a pilot with randomized skills. Let fate decide.',
    icon: (
      <svg
        className="h-6 w-6"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"
        />
      </svg>
    ),
  },
  statblock: {
    title: 'Statblock',
    description:
      'Quick NPC creation without persistence. For one-off encounters.',
    icon: (
      <svg
        className="h-6 w-6"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M13 10V3L4 14h7v7l9-11h-7z"
        />
      </svg>
    ),
  },
};

// =============================================================================
// Utility Functions
// =============================================================================

function generateRandomSkills(): IPilotSkills {
  // Generate skills with weighted distribution (Regular is most common)
  const roll = Math.random();
  let gunnery: number;
  let piloting: number;

  if (roll < 0.1) {
    // 10% Elite
    gunnery = 2 + Math.floor(Math.random() * 2); // 2-3
    piloting = 3 + Math.floor(Math.random() * 2); // 3-4
  } else if (roll < 0.35) {
    // 25% Veteran
    gunnery = 3 + Math.floor(Math.random() * 2); // 3-4
    piloting = 4 + Math.floor(Math.random() * 2); // 4-5
  } else if (roll < 0.75) {
    // 40% Regular
    gunnery = 4 + Math.floor(Math.random() * 2); // 4-5
    piloting = 5 + Math.floor(Math.random() * 2); // 5-6
  } else {
    // 25% Green
    gunnery = 5 + Math.floor(Math.random() * 2); // 5-6
    piloting = 6 + Math.floor(Math.random() * 2); // 6-7
  }

  return { gunnery, piloting };
}

function calculatePointCost(skills: IPilotSkills): number {
  // Calculate total "points spent" improving from baseline 4/5
  let cost = 0;

  // Gunnery improvements from 4
  for (let i = DEFAULT_PILOT_SKILLS.gunnery; i > skills.gunnery; i--) {
    cost += GUNNERY_IMPROVEMENT_COSTS[i] || 0;
  }

  // Piloting improvements from 5
  for (let i = DEFAULT_PILOT_SKILLS.piloting; i > skills.piloting; i--) {
    cost += PILOTING_IMPROVEMENT_COSTS[i] || 0;
  }

  return cost;
}

// =============================================================================
// Sub-Components
// =============================================================================

interface StepIndicatorProps {
  currentStep: WizardStep;
  mode: CreationMode | null;
}

function StepIndicator({
  currentStep,
  mode,
}: StepIndicatorProps): React.ReactElement {
  const steps: { id: WizardStep; label: string }[] = [
    { id: 'mode', label: 'Mode' },
    { id: 'identity', label: 'Identity' },
    { id: 'skills', label: 'Skills' },
    { id: 'review', label: 'Review' },
  ];

  // For statblock, skip the skills step indicator
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

      {/* Content */}
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

      {/* Mode badge */}
      {mode === 'statblock' && (
        <Badge variant="amber" size="sm" className="mt-3">
          No Persistence
        </Badge>
      )}
    </button>
  );
}

interface SkillSliderProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  improvementCosts: Record<number, number>;
}

function SkillSlider({
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

      {/* Custom slider track */}
      <div className="relative">
        <input
          type="range"
          min={MIN_SKILL_VALUE}
          max={MAX_SKILL_VALUE}
          value={value}
          onChange={(e) => onChange(parseInt(e.target.value))}
          className="bg-surface-raised [&::-webkit-slider-thumb]:bg-accent [&::-webkit-slider-thumb]:shadow-accent/30 [&::-moz-range-thumb]:bg-accent h-2 w-full cursor-pointer appearance-none rounded-lg [&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:cursor-pointer [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:shadow-lg [&::-webkit-slider-thumb]:transition-transform [&::-webkit-slider-thumb]:hover:scale-110"
        />

        {/* Tick marks */}
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

      {/* XP cost hint */}
      {nextCost && value > MIN_SKILL_VALUE && (
        <p className="text-text-theme-secondary text-xs">
          Cost to improve:{' '}
          <span className="text-accent font-medium">{nextCost} XP</span>
        </p>
      )}
    </div>
  );
}

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

interface SkillPreviewProps {
  skills: IPilotSkills;
  label?: string;
  showPointCost?: boolean;
}

function SkillPreview({
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
// Main Component
// =============================================================================

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

  // Reset state when modal opens
  React.useEffect(() => {
    if (isOpen) {
      setState(INITIAL_STATE);
      setCurrentStep('mode');
      setError(null);
    }
  }, [isOpen]);

  // Get skills for current mode
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

  // Handlers
  const handleModeSelect = useCallback((mode: CreationMode) => {
    setState((prev) => ({ ...prev, mode }));

    // Generate random skills immediately when random mode is selected
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
      // Statblock mode skips the skills step
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

  // Render step content
  const renderStepContent = (): React.ReactElement => {
    switch (currentStep) {
      case 'mode':
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
                  isSelected={state.mode === mode}
                  onClick={() => handleModeSelect(mode)}
                />
              ))}
            </div>
          </div>
        );

      case 'identity':
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
                value={state.identity.name}
                onChange={(e) => handleIdentityChange('name', e.target.value)}
                autoFocus
              />

              <Input
                label="Callsign"
                placeholder="Enter callsign (optional)"
                value={state.identity.callsign || ''}
                onChange={(e) =>
                  handleIdentityChange('callsign', e.target.value)
                }
              />

              <Input
                label="Affiliation"
                placeholder="Enter faction/house (optional)"
                value={state.identity.affiliation || ''}
                onChange={(e) =>
                  handleIdentityChange('affiliation', e.target.value)
                }
              />

              {/* Statblock mode: inline skill entry */}
              {state.mode === 'statblock' && (
                <div className="border-border-theme-subtle border-t pt-4">
                  <h4 className="text-text-theme-secondary mb-4 text-sm font-medium">
                    Combat Skills
                  </h4>
                  <div className="space-y-4">
                    <SkillSlider
                      label="Gunnery"
                      value={state.statblockSkills.gunnery}
                      onChange={(v) => handleStatblockSkillChange('gunnery', v)}
                      improvementCosts={GUNNERY_IMPROVEMENT_COSTS}
                    />
                    <SkillSlider
                      label="Piloting"
                      value={state.statblockSkills.piloting}
                      onChange={(v) =>
                        handleStatblockSkillChange('piloting', v)
                      }
                      improvementCosts={PILOTING_IMPROVEMENT_COSTS}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        );

      case 'skills':
        return (
          <div className="space-y-6">
            <div className="mb-6 text-center">
              <h3 className="text-text-theme-primary text-lg font-semibold">
                {state.mode === 'template' && 'Select Experience Level'}
                {state.mode === 'custom' && 'Configure Skills'}
                {state.mode === 'random' && 'Random Skills'}
              </h3>
              <p className="text-text-theme-secondary mt-1 text-sm">
                {state.mode === 'template' &&
                  'Choose a preset skill configuration'}
                {state.mode === 'custom' && 'Set gunnery and piloting values'}
                {state.mode === 'random' &&
                  'Your randomly generated pilot skills'}
              </p>
            </div>

            {state.mode === 'template' && (
              <TemplateSelector
                selected={state.templateLevel}
                onChange={(level) =>
                  setState((prev) => ({ ...prev, templateLevel: level }))
                }
              />
            )}

            {state.mode === 'custom' && (
              <div className="space-y-6">
                <SkillSlider
                  label="Gunnery"
                  value={state.customSkills.gunnery}
                  onChange={(v) => handleCustomSkillChange('gunnery', v)}
                  improvementCosts={GUNNERY_IMPROVEMENT_COSTS}
                />
                <SkillSlider
                  label="Piloting"
                  value={state.customSkills.piloting}
                  onChange={(v) => handleCustomSkillChange('piloting', v)}
                  improvementCosts={PILOTING_IMPROVEMENT_COSTS}
                />
                <SkillPreview skills={state.customSkills} showPointCost />
              </div>
            )}

            {state.mode === 'random' && state.randomSkills && (
              <div className="space-y-4">
                <SkillPreview
                  skills={state.randomSkills}
                  label="Generated Skills"
                />

                <div className="flex justify-center">
                  <Button
                    variant="secondary"
                    onClick={handleReroll}
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

      case 'review':
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

            {/* Pilot summary card */}
            <Card variant="accent-left" accentColor="amber" className="p-5">
              <div className="flex items-start gap-4">
                {/* Avatar placeholder */}
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

                {/* Info */}
                <div className="min-w-0 flex-1">
                  <h4 className="text-text-theme-primary truncate text-xl font-bold">
                    {state.identity.name}
                  </h4>
                  {state.identity.callsign && (
                    <p className="text-accent font-medium">
                      &quot;{state.identity.callsign}&quot;
                    </p>
                  )}
                  {state.identity.affiliation && (
                    <p className="text-text-theme-secondary mt-1 text-sm">
                      {state.identity.affiliation}
                    </p>
                  )}

                  <div className="mt-2 flex items-center gap-2">
                    <Badge
                      variant={state.mode === 'statblock' ? 'amber' : 'emerald'}
                      size="sm"
                    >
                      {state.mode === 'statblock' ? 'Statblock' : 'Persistent'}
                    </Badge>
                    <Badge variant="slate" size="sm">
                      {MODE_INFO[state.mode!].title}
                    </Badge>
                  </div>
                </div>

                {/* Skills */}
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

            {/* Skills breakdown */}
            <SkillPreview
              skills={currentSkills}
              label="Combat Skills"
              showPointCost={state.mode === 'custom'}
            />

            {/* Warning for statblock */}
            {state.mode === 'statblock' && (
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
  };

  // Navigation buttons
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
        {/* Header */}
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

        {/* Step indicator */}
        <div className="bg-surface-base px-6 pt-4">
          <StepIndicator currentStep={currentStep} mode={state.mode} />
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {renderStepContent()}

          {/* Error message */}
          {error && (
            <div className="mt-4 rounded-lg border border-red-600/30 bg-red-900/20 p-3">
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}
        </div>

        {/* Footer */}
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
