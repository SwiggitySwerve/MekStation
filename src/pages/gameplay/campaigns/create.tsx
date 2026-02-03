/**
 * Create Campaign Page
 * Wizard for setting up a new campaign.
 *
 * @spec openspec/changes/add-campaign-system/specs/campaign-system/spec.md
 */
import { useState, useCallback } from 'react';
import { useRouter } from 'next/router';
import {
  PageLayout,
  Card,
  Input,
  Button,
} from '@/components/ui';
import { useCampaignStore } from '@/stores/useCampaignStore';
import { useToast } from '@/components/shared/Toast';
import { CampaignType, CAMPAIGN_TYPE_DISPLAY } from '@/types/campaign/CampaignType';
import { CampaignPreset, ALL_PRESETS } from '@/types/campaign/CampaignPreset';
import { CampaignTypeCard } from '@/components/campaign/CampaignTypeCard';
import { PresetCard } from '@/components/campaign/PresetCard';

// =============================================================================
// Step Indicator Component
// =============================================================================

interface StepIndicatorProps {
  steps: string[];
  currentStep: number;
}

function StepIndicator({ steps, currentStep }: StepIndicatorProps): React.ReactElement {
  return (
    <div className="flex items-center justify-center mb-8">
      {steps.map((step, idx) => (
        <div key={step} className="flex items-center">
          <div className="flex flex-col items-center">
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                idx < currentStep
                  ? 'bg-accent text-surface-deep'
                  : idx === currentStep
                  ? 'bg-accent/20 border-2 border-accent text-accent'
                  : 'bg-surface-raised text-text-theme-muted'
              }`}
            >
              {idx < currentStep ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
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
              className={`w-16 h-0.5 mx-2 ${
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
  const [campaignType, setCampaignType] = useState<CampaignType>(CampaignType.MERCENARY);
  const [selectedPreset, setSelectedPreset] = useState<CampaignPreset>(CampaignPreset.STANDARD);
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
        showToast({ message: `Campaign "${name.trim()}" created successfully!`, variant: 'success' });
        router.push(`/gameplay/campaigns/${campaignId}`);
      } else {
        showToast({ message: 'Failed to create campaign', variant: 'error' });
      }
    } finally {
      setIsSubmitting(false);
    }
  }, [name, description, unitIds, pilotIds, createCampaign, router, clearError, showToast]);

  const handleCancel = useCallback(() => {
    router.push('/gameplay/campaigns');
  }, [router]);

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return (
          <Card className="max-w-2xl mx-auto">
            <h2 className="text-xl font-semibold text-text-theme-primary mb-6">Campaign Details</h2>
            
            <div className="space-y-6">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-text-theme-primary mb-2">
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
                <label htmlFor="description" className="block text-sm font-medium text-text-theme-primary mb-2">
                  Description
                </label>
<textarea
                  id="description"
                  className="w-full px-4 py-3 rounded-lg border border-border-theme-subtle bg-surface-raised text-text-theme-primary placeholder:text-text-theme-muted focus:outline-none focus:ring-2 focus:ring-accent/50 resize-none"
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
          <div className="max-w-4xl mx-auto">
            <h2 className="text-xl font-semibold text-text-theme-primary mb-2 text-center">Campaign Type</h2>
            <p className="text-text-theme-secondary text-center mb-6">
              Choose the type of campaign you want to run
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
          <div className="max-w-4xl mx-auto">
            <h2 className="text-xl font-semibold text-text-theme-primary mb-2 text-center">Campaign Preset</h2>
            <p className="text-text-theme-secondary text-center mb-6">
              Choose a configuration preset — you can customize individual options later
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
          <Card className="max-w-2xl mx-auto">
            <h2 className="text-xl font-semibold text-text-theme-primary mb-2">Configure Roster</h2>
            <p className="text-text-theme-secondary mb-6">
              Select units and pilots from your vault to deploy in this campaign
            </p>

            <div className="mb-6">
              <h3 className="text-sm font-medium text-text-theme-primary mb-3">Units</h3>
              <div className="p-6 rounded-lg border-2 border-dashed border-border-theme-subtle bg-surface-deep/30 text-center">
                <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-surface-raised flex items-center justify-center">
                  <svg className="w-6 h-6 text-text-theme-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                </div>
                <p className="text-text-theme-secondary text-sm mb-2">
                  {unitIds.length > 0 ? `${unitIds.length} units selected` : 'No units selected'}
                </p>
                <p className="text-text-theme-muted text-xs">
                  Unit selection integrates with your vault (coming soon)
                </p>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-medium text-text-theme-primary mb-3">Pilots</h3>
              <div className="p-6 rounded-lg border-2 border-dashed border-border-theme-subtle bg-surface-deep/30 text-center">
                <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-surface-raised flex items-center justify-center">
                  <svg className="w-6 h-6 text-text-theme-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <p className="text-text-theme-secondary text-sm mb-2">
                  {pilotIds.length > 0 ? `${pilotIds.length} pilots selected` : 'No pilots selected'}
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
          <Card className="max-w-2xl mx-auto">
            <h2 className="text-xl font-semibold text-text-theme-primary mb-6">Review Campaign</h2>

            <div className="space-y-4">
              <div className="p-4 rounded-lg bg-surface-deep">
                <div className="text-xs text-text-theme-muted uppercase tracking-wide mb-1">Name</div>
                <div className="text-lg font-semibold text-text-theme-primary">{name}</div>
              </div>

              {description && (
                <div className="p-4 rounded-lg bg-surface-deep">
                  <div className="text-xs text-text-theme-muted uppercase tracking-wide mb-1">Description</div>
                  <div className="text-text-theme-secondary">{description}</div>
                </div>
              )}

              <div className="p-4 rounded-lg bg-surface-deep">
                <div className="text-xs text-text-theme-muted uppercase tracking-wide mb-1">Campaign Type</div>
                <div className="text-text-theme-primary font-medium">
                  {CAMPAIGN_TYPE_DISPLAY[campaignType]}
                </div>
              </div>

              <div className="p-4 rounded-lg bg-surface-deep">
                <div className="text-xs text-text-theme-muted uppercase tracking-wide mb-1">Preset</div>
                <div className="text-text-theme-primary font-medium">
                  {selectedPresetDef?.name ?? 'Custom'}
                </div>
                {selectedPresetDef && (
                  <div className="text-text-theme-secondary text-sm mt-1">{selectedPresetDef.description}</div>
                )}
              </div>

              <div className="p-4 rounded-lg bg-surface-deep">
                <div className="text-xs text-text-theme-muted uppercase tracking-wide mb-2">Roster</div>
                <div className="flex gap-4">
                  <div>
                    <span className="text-text-theme-muted text-sm">Units:</span>{' '}
                    <span className="text-text-theme-primary font-medium">
                      {unitIds.length || 'None selected'}
                    </span>
                  </div>
                  <div>
                    <span className="text-text-theme-muted text-sm">Pilots:</span>{' '}
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

      <div className="mb-8">
        {renderStepContent()}
      </div>

{(error || localError) && (
        <div className="max-w-2xl mx-auto mb-6 p-4 rounded-lg bg-red-900/20 border border-red-600/30" data-testid="name-error">
          <p className="text-sm text-red-400">{error || localError}</p>
        </div>
      )}

      <div className="max-w-2xl mx-auto flex justify-between">
        <Button
          type="button"
          variant="secondary"
          onClick={currentStep === 0 ? handleCancel : handleBack}
          data-testid={currentStep === 0 ? 'wizard-cancel-btn' : 'wizard-back-btn'}
        >
          {currentStep === 0 ? 'Cancel' : 'Back'}
        </Button>

        {currentStep < WIZARD_STEPS.length - 1 ? (
          <Button type="button" variant="primary" onClick={handleNext} data-testid="wizard-next-btn">
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
