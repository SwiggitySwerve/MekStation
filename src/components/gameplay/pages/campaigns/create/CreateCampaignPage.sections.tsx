import { CampaignTypeCard } from '@/components/campaign/CampaignTypeCard';
import { PresetCard } from '@/components/campaign/PresetCard';
import { Card, Input } from '@/components/ui';
import { ALL_PRESETS } from '@/types/campaign/CampaignPreset';
import { CAMPAIGN_TYPE_DISPLAY } from '@/types/campaign/CampaignType';
import { CampaignType } from '@/types/campaign/CampaignType';

import type {
  BasicInfoStepProps,
  CampaignTypeStepProps,
  PresetStepProps,
  ReviewStepProps,
} from './CreateCampaignPage.types';

interface StepIndicatorProps {
  steps: string[];
  currentStep: number;
}

export function StepIndicator({
  steps,
  currentStep,
}: StepIndicatorProps): React.ReactElement {
  return (
    <div className="mb-8 flex items-center justify-center">
      {steps.map((step, idx) => (
        <div key={step} className="flex items-center">
          <div className="flex flex-col items-center">
            <div
              className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold transition-all ${
                idx < currentStep
                  ? 'bg-accent text-surface-deep'
                  : idx === currentStep
                    ? 'bg-accent/20 border-accent text-accent border-2'
                    : 'bg-surface-raised text-text-theme-muted'
              }`}
            >
              {idx < currentStep ? (
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
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              ) : (
                idx + 1
              )}
            </div>
            <span
              className={`mt-2 text-xs font-medium ${
                idx <= currentStep ? 'text-accent' : 'text-text-theme-muted'
              }`}
            >
              {step}
            </span>
          </div>
          {idx < steps.length - 1 && (
            <div
              className={`mx-2 h-0.5 w-16 ${
                idx < currentStep ? 'bg-accent' : 'bg-surface-raised'
              }`}
            />
          )}
        </div>
      ))}
    </div>
  );
}

export function BasicInfoStep({
  name,
  description,
  onNameChange,
  onDescriptionChange,
}: BasicInfoStepProps): React.ReactElement {
  return (
    <Card className="mx-auto max-w-2xl">
      <h2 className="text-text-theme-primary mb-6 text-xl font-semibold">
        Campaign Details
      </h2>

      <div className="space-y-6">
        <div>
          <label
            htmlFor="name"
            className="text-text-theme-primary mb-2 block text-sm font-medium"
          >
            Campaign Name *
          </label>
          <Input
            id="name"
            type="text"
            placeholder="e.g., Operation Steel Thunder"
            value={name}
            onChange={(event) => onNameChange(event.target.value)}
            required
            data-testid="campaign-name-input"
          />
        </div>

        <div>
          <label
            htmlFor="description"
            className="text-text-theme-primary mb-2 block text-sm font-medium"
          >
            Description
          </label>
          <textarea
            id="description"
            className="border-border-theme-subtle bg-surface-raised text-text-theme-primary placeholder:text-text-theme-muted focus:ring-accent/50 w-full resize-none rounded-lg border px-4 py-3 focus:ring-2 focus:outline-none"
            placeholder="What is this campaign about? Set the stage for your mercenary company..."
            value={description}
            onChange={(event) => onDescriptionChange(event.target.value)}
            rows={4}
            data-testid="campaign-description-input"
          />
        </div>
      </div>
    </Card>
  );
}

export function CampaignTypeStep({
  campaignType,
  onSelectType,
}: CampaignTypeStepProps): React.ReactElement {
  return (
    <div className="mx-auto max-w-4xl">
      <h2 className="text-text-theme-primary mb-2 text-center text-xl font-semibold">
        Campaign Type
      </h2>
      <p className="text-text-theme-secondary mb-6 text-center">
        Choose the type of campaign you want to run
      </p>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {Object.values(CampaignType).map((type) => (
          <CampaignTypeCard
            key={type}
            type={type}
            selected={campaignType === type}
            onSelect={() => onSelectType(type)}
          />
        ))}
      </div>
    </div>
  );
}

export function PresetStep({
  selectedPreset,
  onSelectPreset,
}: PresetStepProps): React.ReactElement {
  return (
    <div className="mx-auto max-w-4xl">
      <h2 className="text-text-theme-primary mb-2 text-center text-xl font-semibold">
        Campaign Preset
      </h2>
      <p className="text-text-theme-secondary mb-6 text-center">
        Choose a configuration preset - you can customize individual options
        later
      </p>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {ALL_PRESETS.map((preset) => (
          <PresetCard
            key={preset.id}
            preset={preset}
            selected={selectedPreset === preset.id}
            onSelect={() => onSelectPreset(preset.id)}
          />
        ))}
      </div>
    </div>
  );
}

export { RosterStep } from './CreateCampaignPage.RosterStep';

export function ReviewStep({
  name,
  description,
  campaignType,
  selectedPresetName,
  selectedPresetDescription,
  unitCount,
  pilotCount,
}: ReviewStepProps): React.ReactElement {
  return (
    <Card className="mx-auto max-w-2xl">
      <h2 className="text-text-theme-primary mb-6 text-xl font-semibold">
        Review Campaign
      </h2>

      <div className="space-y-4">
        <div className="bg-surface-deep rounded-lg p-4">
          <div className="text-text-theme-muted mb-1 text-xs tracking-wide uppercase">
            Name
          </div>
          <div className="text-text-theme-primary text-lg font-semibold">
            {name}
          </div>
        </div>

        {description && (
          <div className="bg-surface-deep rounded-lg p-4">
            <div className="text-text-theme-muted mb-1 text-xs tracking-wide uppercase">
              Description
            </div>
            <div className="text-text-theme-secondary">{description}</div>
          </div>
        )}

        <div className="bg-surface-deep rounded-lg p-4">
          <div className="text-text-theme-muted mb-1 text-xs tracking-wide uppercase">
            Campaign Type
          </div>
          <div className="text-text-theme-primary font-medium">
            {CAMPAIGN_TYPE_DISPLAY[campaignType]}
          </div>
        </div>

        <div className="bg-surface-deep rounded-lg p-4">
          <div className="text-text-theme-muted mb-1 text-xs tracking-wide uppercase">
            Preset
          </div>
          <div className="text-text-theme-primary font-medium">
            {selectedPresetName ?? 'Custom'}
          </div>
          {selectedPresetDescription && (
            <div className="text-text-theme-secondary mt-1 text-sm">
              {selectedPresetDescription}
            </div>
          )}
        </div>

        <div className="bg-surface-deep rounded-lg p-4">
          <div className="text-text-theme-muted mb-2 text-xs tracking-wide uppercase">
            Roster
          </div>
          <div className="flex gap-4">
            <div>
              <span className="text-text-theme-muted text-sm">Units:</span>{' '}
              <span className="text-text-theme-primary font-medium">
                {unitCount || 'None selected'}
              </span>
            </div>
            <div>
              <span className="text-text-theme-muted text-sm">Pilots:</span>{' '}
              <span className="text-text-theme-primary font-medium">
                {pilotCount || 'None selected'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}
