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
import { Button, Input, Badge, Card } from '@/components/ui';
import { usePilotStore } from '@/stores/usePilotStore';
import { useToast } from '@/components/shared/Toast';
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

const MODE_INFO: Record<CreationMode, { title: string; description: string; icon: React.ReactNode }> = {
  template: {
    title: 'Template',
    description: 'Quick creation using experience level presets. Perfect for starting campaigns.',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
  },
  custom: {
    title: 'Custom',
    description: 'Build your pilot from scratch with point-buy skill allocation.',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
      </svg>
    ),
  },
  random: {
    title: 'Random',
    description: 'Generate a pilot with randomized skills. Let fate decide.',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
      </svg>
    ),
  },
  statblock: {
    title: 'Statblock',
    description: 'Quick NPC creation without persistence. For one-off encounters.',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
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

function StepIndicator({ currentStep, mode }: StepIndicatorProps): React.ReactElement {
  const steps: { id: WizardStep; label: string }[] = [
    { id: 'mode', label: 'Mode' },
    { id: 'identity', label: 'Identity' },
    { id: 'skills', label: 'Skills' },
    { id: 'review', label: 'Review' },
  ];
  
  // For statblock, skip the skills step indicator
  const visibleSteps = mode === 'statblock' 
    ? steps.filter(s => s.id !== 'skills')
    : steps;
  
  const currentIndex = visibleSteps.findIndex(s => s.id === currentStep);
  
  return (
    <div className="flex items-center justify-center gap-2 mb-6">
      {visibleSteps.map((step, index) => {
        const isActive = step.id === currentStep;
        const isCompleted = index < currentIndex;
        
        return (
          <React.Fragment key={step.id}>
            {index > 0 && (
              <div className={`h-px w-8 transition-colors ${
                isCompleted ? 'bg-accent' : 'bg-border-theme-subtle'
              }`} />
            )}
            <div className="flex flex-col items-center gap-1">
              <div className={`
                w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium
                transition-all duration-200
                ${isActive 
                  ? 'bg-accent text-surface-deep ring-2 ring-accent/30 ring-offset-2 ring-offset-surface-base' 
                  : isCompleted
                    ? 'bg-accent/20 text-accent border border-accent/50'
                    : 'bg-surface-raised text-text-theme-secondary border border-border-theme-subtle'
                }
              `}>
                {isCompleted ? (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  index + 1
                )}
              </div>
              <span className={`text-xs transition-colors ${
                isActive ? 'text-accent font-medium' : 'text-text-theme-secondary'
              }`}>
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

function ModeCard({ mode, isSelected, onClick }: ModeCardProps): React.ReactElement {
  const info = MODE_INFO[mode];
  
  return (
    <button
      onClick={onClick}
      className={`
        relative w-full p-4 rounded-lg border-2 text-left transition-all duration-200
        group hover:scale-[1.02]
        ${isSelected 
          ? 'border-accent bg-accent/10 shadow-lg shadow-accent/20' 
          : 'border-border-theme-subtle bg-surface-raised/30 hover:border-border-theme hover:bg-surface-raised/50'
        }
      `}
    >
      {/* Selection indicator */}
      <div className={`
        absolute top-3 right-3 w-5 h-5 rounded-full border-2 flex items-center justify-center
        transition-all duration-200
        ${isSelected 
          ? 'border-accent bg-accent' 
          : 'border-border-theme group-hover:border-text-theme-secondary'
        }
      `}>
        {isSelected && (
          <svg className="w-3 h-3 text-surface-deep" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        )}
      </div>
      
      {/* Content */}
      <div className={`
        w-10 h-10 rounded-lg flex items-center justify-center mb-3
        ${isSelected ? 'bg-accent/20 text-accent' : 'bg-surface-raised text-text-theme-secondary group-hover:text-text-theme-primary'}
      `}>
        {info.icon}
      </div>
      
      <h3 className={`text-lg font-semibold mb-1 transition-colors ${
        isSelected ? 'text-accent' : 'text-text-theme-primary'
      }`}>
        {info.title}
      </h3>
      
      <p className="text-sm text-text-theme-secondary leading-relaxed">
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

function SkillSlider({ label, value, onChange, improvementCosts }: SkillSliderProps): React.ReactElement {
  const skillLabel = getSkillLabel(value);
  const nextCost = improvementCosts[value];
  
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-text-theme-primary">{label}</span>
        <div className="flex items-center gap-2">
          <span className="text-2xl font-bold text-accent tabular-nums">{value}</span>
          <Badge variant={value <= 3 ? 'emerald' : value <= 5 ? 'amber' : 'slate'} size="sm">
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
          className="w-full h-2 bg-surface-raised rounded-lg appearance-none cursor-pointer
            [&::-webkit-slider-thumb]:appearance-none
            [&::-webkit-slider-thumb]:w-5
            [&::-webkit-slider-thumb]:h-5
            [&::-webkit-slider-thumb]:rounded-full
            [&::-webkit-slider-thumb]:bg-accent
            [&::-webkit-slider-thumb]:shadow-lg
            [&::-webkit-slider-thumb]:shadow-accent/30
            [&::-webkit-slider-thumb]:cursor-pointer
            [&::-webkit-slider-thumb]:transition-transform
            [&::-webkit-slider-thumb]:hover:scale-110
            [&::-moz-range-thumb]:w-5
            [&::-moz-range-thumb]:h-5
            [&::-moz-range-thumb]:rounded-full
            [&::-moz-range-thumb]:bg-accent
            [&::-moz-range-thumb]:border-0
            [&::-moz-range-thumb]:cursor-pointer"
        />
        
        {/* Tick marks */}
        <div className="flex justify-between px-2 mt-1">
          {Array.from({ length: MAX_SKILL_VALUE - MIN_SKILL_VALUE + 1 }, (_, i) => (
            <div 
              key={i}
              className={`w-0.5 h-1.5 rounded-full ${
                i + MIN_SKILL_VALUE <= value ? 'bg-accent' : 'bg-border-theme-subtle'
              }`}
            />
          ))}
        </div>
      </div>
      
      {/* XP cost hint */}
      {nextCost && value > MIN_SKILL_VALUE && (
        <p className="text-xs text-text-theme-secondary">
          Cost to improve: <span className="text-accent font-medium">{nextCost} XP</span>
        </p>
      )}
    </div>
  );
}

interface TemplateSelectorProps {
  selected: PilotExperienceLevel;
  onChange: (level: PilotExperienceLevel) => void;
}

function TemplateSelector({ selected, onChange }: TemplateSelectorProps): React.ReactElement {
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
            className={`
              p-4 rounded-lg border-2 text-left transition-all duration-200
              ${isSelected 
                ? 'border-accent bg-accent/10' 
                : 'border-border-theme-subtle bg-surface-raised/30 hover:border-border-theme'
              }
            `}
          >
            <div className="flex items-center justify-between mb-2">
              <h4 className={`font-semibold ${isSelected ? 'text-accent' : 'text-text-theme-primary'}`}>
                {template.name}
              </h4>
              <span className="text-lg font-bold text-accent tabular-nums">
                {getPilotRating(template.skills)}
              </span>
            </div>
            <p className="text-xs text-text-theme-secondary mb-2">
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

function SkillPreview({ skills, label, showPointCost }: SkillPreviewProps): React.ReactElement {
  const pointCost = showPointCost ? calculatePointCost(skills) : 0;
  
  return (
    <div className="bg-surface-raised/50 rounded-lg p-4 border border-border-theme-subtle">
      {label && (
        <h4 className="text-sm font-medium text-text-theme-secondary mb-3">{label}</h4>
      )}
      <div className="flex items-center justify-center gap-8">
        <div className="text-center">
          <div className="text-3xl font-bold text-accent tabular-nums">{skills.gunnery}</div>
          <div className="text-xs text-text-theme-secondary mt-1">Gunnery</div>
          <Badge variant={skills.gunnery <= 3 ? 'emerald' : skills.gunnery <= 5 ? 'amber' : 'slate'} size="sm" className="mt-2">
            {getSkillLabel(skills.gunnery)}
          </Badge>
        </div>
        <div className="text-4xl text-border-theme font-light">/</div>
        <div className="text-center">
          <div className="text-3xl font-bold text-accent tabular-nums">{skills.piloting}</div>
          <div className="text-xs text-text-theme-secondary mt-1">Piloting</div>
          <Badge variant={skills.piloting <= 3 ? 'emerald' : skills.piloting <= 5 ? 'amber' : 'slate'} size="sm" className="mt-2">
            {getSkillLabel(skills.piloting)}
          </Badge>
        </div>
      </div>
      {showPointCost && pointCost > 0 && (
        <div className="text-center mt-4 pt-3 border-t border-border-theme-subtle">
          <span className="text-sm text-text-theme-secondary">Total XP Investment: </span>
          <span className="text-lg font-bold text-accent">{pointCost}</span>
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
  const { createFromTemplate, createRandom, createPilot, createStatblock, isLoading } = usePilotStore();
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
    setState(prev => ({ ...prev, mode }));
    
    // Generate random skills immediately when random mode is selected
    if (mode === 'random') {
      setState(prev => ({ ...prev, randomSkills: generateRandomSkills() }));
    }
  }, []);
  
  const handleIdentityChange = useCallback((field: keyof IPilotIdentity, value: string) => {
    setState(prev => ({
      ...prev,
      identity: { ...prev.identity, [field]: value || undefined },
    }));
  }, []);
  
  const handleCustomSkillChange = useCallback((skill: keyof IPilotSkills, value: number) => {
    setState(prev => ({
      ...prev,
      customSkills: { ...prev.customSkills, [skill]: value },
    }));
  }, []);
  
  const handleStatblockSkillChange = useCallback((skill: keyof IPilotSkills, value: number) => {
    setState(prev => ({
      ...prev,
      statblockSkills: { ...prev.statblockSkills, [skill]: value },
    }));
  }, []);
  
  const handleReroll = useCallback(() => {
    setState(prev => ({ ...prev, randomSkills: generateRandomSkills() }));
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
          pilotId = await createFromTemplate(state.templateLevel, state.identity);
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
        showToast({ message: `Statblock pilot "${state.identity.name}" created`, variant: 'info' });
      } else {
        showToast({ message: `Pilot "${state.identity.name}" created successfully!`, variant: 'success' });
      }
      
      onCreated?.(pilotId);
      onClose();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create pilot';
      setError(errorMessage);
      showToast({ message: errorMessage, variant: 'error' });
    }
  }, [state, createFromTemplate, createRandom, createPilot, createStatblock, onCreated, onClose, showToast]);
  
  // Render step content
  const renderStepContent = (): React.ReactElement => {
    switch (currentStep) {
      case 'mode':
        return (
          <div className="space-y-4">
            <div className="text-center mb-6">
              <h3 className="text-lg font-semibold text-text-theme-primary">Choose Creation Mode</h3>
              <p className="text-sm text-text-theme-secondary mt-1">
                Select how you want to create your pilot
              </p>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
            <div className="text-center mb-6">
              <h3 className="text-lg font-semibold text-text-theme-primary">Pilot Identity</h3>
              <p className="text-sm text-text-theme-secondary mt-1">
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
                onChange={(e) => handleIdentityChange('callsign', e.target.value)}
              />
              
              <Input
                label="Affiliation"
                placeholder="Enter faction/house (optional)"
                value={state.identity.affiliation || ''}
                onChange={(e) => handleIdentityChange('affiliation', e.target.value)}
              />
              
              {/* Statblock mode: inline skill entry */}
              {state.mode === 'statblock' && (
                <div className="pt-4 border-t border-border-theme-subtle">
                  <h4 className="text-sm font-medium text-text-theme-secondary mb-4">Combat Skills</h4>
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
                      onChange={(v) => handleStatblockSkillChange('piloting', v)}
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
            <div className="text-center mb-6">
              <h3 className="text-lg font-semibold text-text-theme-primary">
                {state.mode === 'template' && 'Select Experience Level'}
                {state.mode === 'custom' && 'Configure Skills'}
                {state.mode === 'random' && 'Random Skills'}
              </h3>
              <p className="text-sm text-text-theme-secondary mt-1">
                {state.mode === 'template' && 'Choose a preset skill configuration'}
                {state.mode === 'custom' && 'Set gunnery and piloting values'}
                {state.mode === 'random' && 'Your randomly generated pilot skills'}
              </p>
            </div>
            
            {state.mode === 'template' && (
              <TemplateSelector
                selected={state.templateLevel}
                onChange={(level) => setState(prev => ({ ...prev, templateLevel: level }))}
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
                <SkillPreview skills={state.randomSkills} label="Generated Skills" />
                
                <div className="flex justify-center">
                  <Button
                    variant="secondary"
                    onClick={handleReroll}
                    leftIcon={
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
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
            <div className="text-center mb-6">
              <h3 className="text-lg font-semibold text-text-theme-primary">Review &amp; Confirm</h3>
              <p className="text-sm text-text-theme-secondary mt-1">
                Verify your pilot details before creation
              </p>
            </div>
            
            {/* Pilot summary card */}
            <Card variant="accent-left" accentColor="amber" className="p-5">
              <div className="flex items-start gap-4">
                {/* Avatar placeholder */}
                <div className="w-16 h-16 rounded-lg bg-surface-raised flex items-center justify-center flex-shrink-0">
                  <svg className="w-8 h-8 text-text-theme-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                
                {/* Info */}
                <div className="flex-1 min-w-0">
                  <h4 className="text-xl font-bold text-text-theme-primary truncate">
                    {state.identity.name}
                  </h4>
                  {state.identity.callsign && (
                    <p className="text-accent font-medium">&quot;{state.identity.callsign}&quot;</p>
                  )}
                  {state.identity.affiliation && (
                    <p className="text-sm text-text-theme-secondary mt-1">
                      {state.identity.affiliation}
                    </p>
                  )}
                  
                  <div className="flex items-center gap-2 mt-2">
                    <Badge variant={state.mode === 'statblock' ? 'amber' : 'emerald'} size="sm">
                      {state.mode === 'statblock' ? 'Statblock' : 'Persistent'}
                    </Badge>
                    <Badge variant="slate" size="sm">
                      {MODE_INFO[state.mode!].title}
                    </Badge>
                  </div>
                </div>
                
                {/* Skills */}
                <div className="text-right flex-shrink-0">
                  <div className="text-3xl font-bold text-accent tabular-nums">
                    {getPilotRating(currentSkills)}
                  </div>
                  <div className="text-xs text-text-theme-secondary">Gunnery/Piloting</div>
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
              <div className="flex items-start gap-3 p-3 rounded-lg bg-amber-900/20 border border-amber-600/30">
                <svg className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <p className="text-sm text-amber-200">
                  Statblock pilots are not saved to the database. They&apos;re intended for quick NPC creation during gameplay.
                </p>
              </div>
            )}
          </div>
        );
    }
  };
  
  // Navigation buttons
  const canProceed = currentStep === 'mode' 
    ? state.mode !== null 
    : currentStep === 'identity'
      ? state.identity.name.trim() !== ''
      : true;
  
  return (
    <ModalOverlay
      isOpen={isOpen}
      onClose={onClose}
      preventClose={isLoading}
      className="w-full sm:w-[560px] max-h-[85vh] overflow-hidden"
    >
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border-theme-subtle bg-surface-deep/50">
          <div>
            <h2 className="text-xl font-bold text-text-theme-primary">Create Pilot</h2>
            <p className="text-sm text-text-theme-secondary">MechWarrior personnel record</p>
          </div>
          <button
            onClick={onClose}
            disabled={isLoading}
            className="p-2 text-text-theme-secondary hover:text-text-theme-primary hover:bg-surface-raised rounded-lg transition-colors"
            aria-label="Close"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        {/* Step indicator */}
        <div className="px-6 pt-4 bg-surface-base">
          <StepIndicator currentStep={currentStep} mode={state.mode} />
        </div>
        
        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {renderStepContent()}
          
          {/* Error message */}
          {error && (
            <div className="mt-4 p-3 rounded-lg bg-red-900/20 border border-red-600/30">
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}
        </div>
        
        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-border-theme-subtle bg-surface-deep/50">
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
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
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
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
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
