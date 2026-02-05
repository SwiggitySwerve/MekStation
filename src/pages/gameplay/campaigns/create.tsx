import { useRouter } from 'next/router';
/**
 * Create Campaign Page
 * Wizard for setting up a new campaign.
 *
 * @spec openspec/changes/add-campaign-system/specs/campaign-system/spec.md
 */
import { useState, useCallback } from 'react';

import { CampaignTypeCard } from '@/components/campaign/CampaignTypeCard';
import { PresetCard } from '@/components/campaign/PresetCard';
import { useToast } from '@/components/shared/Toast';
import { PageLayout, Card, Input, Button } from '@/components/ui';
import { useCampaignStore } from '@/stores/useCampaignStore';
import { CampaignPreset, ALL_PRESETS } from '@/types/campaign/CampaignPreset';
import {
  CampaignType,
  CAMPAIGN_TYPE_DISPLAY,
} from '@/types/campaign/CampaignType';

// =============================================================================
// Step Indicator Component
// =============================================================================

interface StepIndicatorProps {
  steps: string[];
  currentStep: number;
}

function StepIndicator({
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

// =============================================================================
// Main Page Component
// =============================================================================

const WIZARD_STEPS = ['Basic Info', 'Type', 'Preset', 'Roster', 'Review'];

export default function CreateCampaignPage(): React.ReactElement {
  const router = useRouter();
  const { createCampaign, error, clearError } = useCampaignStore();
  const { showToast } = useToast();

  const [currentStep, setCurrentStep] = useState(0);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [campaignType, setCampaignType] = useState<CampaignType>(
    CampaignType.MERCENARY,
  );
  const [selectedPreset, setSelectedPreset] = useState<CampaignPreset>(
    CampaignPreset.STANDARD,
  );
  const [localError, setLocalError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [unitIds, _setUnitIds] = useState<string[]>([]);
  const [pilotIds, _setPilotIds] = useState<string[]>([]);

  const selectedPresetDef = ALL_PRESETS.find((p) => p.id === selectedPreset);

  const handleNext = useCallback(() => {
    clearError();
    setLocalError(null);

    if (currentStep === 0) {
      if (!name.trim()) {
        setLocalError('Campaign name is required');
        return;
      }
    }

    setCurrentStep((prev) => Math.min(prev + 1, WIZARD_STEPS.length - 1));
  }, [currentStep, name, clearError]);

  const handleBack = useCallback(() => {
    setCurrentStep((prev) => Math.max(prev - 1, 0));
  }, []);

  const handleSubmit = useCallback(async () => {
    clearError();
    setLocalError(null);
    setIsSubmitting(true);

    try {
      const campaignId = createCampaign({
        name: name.trim(),
        description: description.trim() || undefined,
        unitIds,
        pilotIds,
      });

      if (campaignId) {
        showToast({
          message: `Campaign "${name.trim()}" created successfully!`,
          variant: 'success',
        });
        router.push(`/gameplay/campaigns/${campaignId}`);
      } else {
        showToast({ message: 'Failed to create campaign', variant: 'error' });
      }
    } finally {
      setIsSubmitting(false);
    }
  }, [
    name,
    description,
    unitIds,
    pilotIds,
    createCampaign,
    router,
    clearError,
    showToast,
  ]);

  const handleCancel = useCallback(() => {
    router.push('/gameplay/campaigns');
  }, [router]);

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
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
                  onChange={(e) => setName(e.target.value)}
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
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                  data-testid="campaign-description-input"
                />
              </div>
            </div>
          </Card>
        );

      case 1:
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
                  onSelect={() => setCampaignType(type)}
                />
              ))}
            </div>
          </div>
        );

      case 2:
        return (
          <div className="mx-auto max-w-4xl">
            <h2 className="text-text-theme-primary mb-2 text-center text-xl font-semibold">
              Campaign Preset
            </h2>
            <p className="text-text-theme-secondary mb-6 text-center">
              Choose a configuration preset — you can customize individual
              options later
            </p>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {ALL_PRESETS.map((preset) => (
                <PresetCard
                  key={preset.id}
                  preset={preset}
                  selected={selectedPreset === preset.id}
                  onSelect={() => setSelectedPreset(preset.id)}
                />
              ))}
            </div>
          </div>
        );

      case 3:
        return (
          <Card className="mx-auto max-w-2xl">
            <h2 className="text-text-theme-primary mb-2 text-xl font-semibold">
              Configure Roster
            </h2>
            <p className="text-text-theme-secondary mb-6">
              Select units and pilots from your vault to deploy in this campaign
            </p>

            <div className="mb-6">
              <h3 className="text-text-theme-primary mb-3 text-sm font-medium">
                Units
              </h3>
              <div className="border-border-theme-subtle bg-surface-deep/30 rounded-lg border-2 border-dashed p-6 text-center">
                <div className="bg-surface-raised mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full">
                  <svg
                    className="text-text-theme-muted h-6 w-6"
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
                </div>
                <p className="text-text-theme-secondary mb-2 text-sm">
                  {unitIds.length > 0
                    ? `${unitIds.length} units selected`
                    : 'No units selected'}
                </p>
                <p className="text-text-theme-muted text-xs">
                  Unit selection integrates with your vault (coming soon)
                </p>
              </div>
            </div>

            <div>
              <h3 className="text-text-theme-primary mb-3 text-sm font-medium">
                Pilots
              </h3>
              <div className="border-border-theme-subtle bg-surface-deep/30 rounded-lg border-2 border-dashed p-6 text-center">
                <div className="bg-surface-raised mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full">
                  <svg
                    className="text-text-theme-muted h-6 w-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                    />
                  </svg>
                </div>
                <p className="text-text-theme-secondary mb-2 text-sm">
                  {pilotIds.length > 0
                    ? `${pilotIds.length} pilots selected`
                    : 'No pilots selected'}
                </p>
                <p className="text-text-theme-muted text-xs">
                  Pilot selection integrates with your vault (coming soon)
                </p>
              </div>
            </div>
          </Card>
        );

      case 4:
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
                  {selectedPresetDef?.name ?? 'Custom'}
                </div>
                {selectedPresetDef && (
                  <div className="text-text-theme-secondary mt-1 text-sm">
                    {selectedPresetDef.description}
                  </div>
                )}
              </div>

              <div className="bg-surface-deep rounded-lg p-4">
                <div className="text-text-theme-muted mb-2 text-xs tracking-wide uppercase">
                  Roster
                </div>
                <div className="flex gap-4">
                  <div>
                    <span className="text-text-theme-muted text-sm">
                      Units:
                    </span>{' '}
                    <span className="text-text-theme-primary font-medium">
                      {unitIds.length || 'None selected'}
                    </span>
                  </div>
                  <div>
                    <span className="text-text-theme-muted text-sm">
                      Pilots:
                    </span>{' '}
                    <span className="text-text-theme-primary font-medium">
                      {pilotIds.length || 'None selected'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        );

      default:
        return null;
    }
  };

  return (
    <PageLayout
      title="New Campaign"
      subtitle="Set up a multi-mission operation"
      maxWidth="wide"
      backLink="/gameplay/campaigns"
      backLabel="Back to Campaigns"
    >
      <StepIndicator steps={WIZARD_STEPS} currentStep={currentStep} />

      <div className="mb-8">{renderStepContent()}</div>

      {(error || localError) && (
        <div
          className="mx-auto mb-6 max-w-2xl rounded-lg border border-red-600/30 bg-red-900/20 p-4"
          data-testid="name-error"
        >
          <p className="text-sm text-red-400">{error || localError}</p>
        </div>
      )}

      <div className="mx-auto flex max-w-2xl justify-between">
        <Button
          type="button"
          variant="secondary"
          onClick={currentStep === 0 ? handleCancel : handleBack}
          data-testid={
            currentStep === 0 ? 'wizard-cancel-btn' : 'wizard-back-btn'
          }
        >
          {currentStep === 0 ? 'Cancel' : 'Back'}
        </Button>

        {currentStep < WIZARD_STEPS.length - 1 ? (
          <Button
            type="button"
            variant="primary"
            onClick={handleNext}
            data-testid="wizard-next-btn"
          >
            Continue
          </Button>
        ) : (
          <Button
            type="button"
            variant="primary"
            onClick={handleSubmit}
            disabled={isSubmitting}
            data-testid="wizard-submit-btn"
          >
            {isSubmitting ? 'Creating...' : 'Create Campaign'}
          </Button>
        )}
      </div>
    </PageLayout>
  );
}
