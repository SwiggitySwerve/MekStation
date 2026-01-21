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
  Badge,
} from '@/components/ui';
import { useCampaignStore } from '@/stores/useCampaignStore';
import { CAMPAIGN_TEMPLATES, ICampaignTemplate } from '@/types/campaign';

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
// Template Card Component
// =============================================================================

interface TemplateCardProps {
  template: ICampaignTemplate;
  selected: boolean;
  onSelect: () => void;
}

function TemplateCard({ template, selected, onSelect }: TemplateCardProps): React.ReactElement {
  return (
    <Card
      className={`cursor-pointer transition-all ${
        selected
          ? 'border-accent ring-2 ring-accent/30 bg-accent/5'
          : 'hover:border-accent/50 hover:bg-surface-raised/50'
      }`}
      onClick={onSelect}
    >
      <div className="flex items-start justify-between mb-2">
        <h3 className="font-semibold text-text-theme-primary text-lg">{template.name}</h3>
        <Badge variant="info">{template.estimatedMissions} Missions</Badge>
      </div>
      <p className="text-sm text-text-theme-secondary mb-4">{template.description}</p>
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="px-2 py-1 rounded bg-surface-deep">
          <span className="text-text-theme-muted">Starting C-Bills:</span>{' '}
          <span className="text-accent font-medium">
            {(template.startingResources.cBills / 1000000).toFixed(1)}M
          </span>
        </div>
        <div className="px-2 py-1 rounded bg-surface-deep">
          <span className="text-text-theme-muted">Difficulty:</span>{' '}
          <span className="text-accent font-medium">
            {template.recommendedDifficulty === 1.0 ? 'Normal' : `${template.recommendedDifficulty}x`}
          </span>
        </div>
      </div>
    </Card>
  );
}

// =============================================================================
// Custom Campaign Card Component
// =============================================================================

interface CustomCampaignCardProps {
  selected: boolean;
  onSelect: () => void;
}

function CustomCampaignCard({ selected, onSelect }: CustomCampaignCardProps): React.ReactElement {
  return (
    <Card
      className={`cursor-pointer transition-all ${
        selected
          ? 'border-accent ring-2 ring-accent/30 bg-accent/5'
          : 'hover:border-accent/50 hover:bg-surface-raised/50 border-dashed'
      }`}
      onClick={onSelect}
    >
      <div className="flex items-center justify-center h-full min-h-[120px]">
        <div className="text-center">
          <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-surface-deep flex items-center justify-center">
            <svg className="w-6 h-6 text-text-theme-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </div>
          <h3 className="font-semibold text-text-theme-primary">Custom Campaign</h3>
          <p className="text-xs text-text-theme-muted mt-1">Create your own mission structure</p>
        </div>
      </div>
    </Card>
  );
}

// =============================================================================
// Main Page Component
// =============================================================================

const WIZARD_STEPS = ['Basic Info', 'Template', 'Roster', 'Review'];

export default function CreateCampaignPage(): React.ReactElement {
  const router = useRouter();
  const { createCampaign, createCampaignFromTemplate, error, clearError } = useCampaignStore();

  const [currentStep, setCurrentStep] = useState(0);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [isCustom, setIsCustom] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // For roster selection (simplified - would integrate with vault in real implementation)
  const [unitIds, _setUnitIds] = useState<string[]>([]);
  const [pilotIds, _setPilotIds] = useState<string[]>([]);

  const selectedTemplate = selectedTemplateId
    ? CAMPAIGN_TEMPLATES.find((t) => t.id === selectedTemplateId)
    : null;

  // Navigation handlers
  const handleNext = useCallback(() => {
    clearError();
    setLocalError(null);

    if (currentStep === 0) {
      if (!name.trim()) {
        setLocalError('Campaign name is required');
        return;
      }
    }

    if (currentStep === 1) {
      // Template step - must select something
      if (!selectedTemplateId && !isCustom) {
        setLocalError('Please select a template or choose custom campaign');
        return;
      }
    }

    setCurrentStep((prev) => Math.min(prev + 1, WIZARD_STEPS.length - 1));
  }, [currentStep, name, selectedTemplateId, isCustom, clearError]);

  const handleBack = useCallback(() => {
    setCurrentStep((prev) => Math.max(prev - 1, 0));
  }, []);

  // Handle template selection
  const handleTemplateSelect = useCallback((templateId: string) => {
    setSelectedTemplateId(templateId);
    setIsCustom(false);
  }, []);

  const handleCustomSelect = useCallback(() => {
    setSelectedTemplateId(null);
    setIsCustom(true);
  }, []);

  // Handle form submission
  const handleSubmit = useCallback(async () => {
    clearError();
    setLocalError(null);
    setIsSubmitting(true);

    try {
      let campaignId: string | null = null;

      if (selectedTemplateId) {
        campaignId = createCampaignFromTemplate(selectedTemplateId, {
          name: name.trim(),
          description: description.trim() || undefined,
          unitIds,
          pilotIds,
        });
      } else {
        campaignId = createCampaign({
          name: name.trim(),
          description: description.trim() || undefined,
          unitIds,
          pilotIds,
        });
      }

      if (campaignId) {
        router.push(`/gameplay/campaigns/${campaignId}`);
      }
    } finally {
      setIsSubmitting(false);
    }
  }, [name, description, selectedTemplateId, unitIds, pilotIds, createCampaign, createCampaignFromTemplate, router, clearError]);

  // Handle cancel
  const handleCancel = useCallback(() => {
    router.push('/gameplay/campaigns');
  }, [router]);

  // Render step content
  const renderStepContent = () => {
    switch (currentStep) {
      case 0: // Basic Info
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
                />
              </div>
            </div>
          </Card>
        );

      case 1: // Template Selection
        return (
          <div className="max-w-4xl mx-auto">
            <h2 className="text-xl font-semibold text-text-theme-primary mb-2 text-center">Choose a Template</h2>
            <p className="text-text-theme-secondary text-center mb-6">
              Select a pre-built campaign structure or create your own
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {CAMPAIGN_TEMPLATES.map((template) => (
                <TemplateCard
                  key={template.id}
                  template={template}
                  selected={selectedTemplateId === template.id}
                  onSelect={() => handleTemplateSelect(template.id)}
                />
              ))}
              <CustomCampaignCard
                selected={isCustom}
                onSelect={handleCustomSelect}
              />
            </div>
          </div>
        );

      case 2: // Roster Configuration
        return (
          <Card className="max-w-2xl mx-auto">
            <h2 className="text-xl font-semibold text-text-theme-primary mb-2">Configure Roster</h2>
            <p className="text-text-theme-secondary mb-6">
              Select units and pilots from your vault to deploy in this campaign
            </p>

            {/* Units Section */}
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

            {/* Pilots Section */}
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

      case 3: // Review
        return (
          <Card className="max-w-2xl mx-auto">
            <h2 className="text-xl font-semibold text-text-theme-primary mb-6">Review Campaign</h2>

            <div className="space-y-4">
              {/* Campaign Name */}
              <div className="p-4 rounded-lg bg-surface-deep">
                <div className="text-xs text-text-theme-muted uppercase tracking-wide mb-1">Name</div>
                <div className="text-lg font-semibold text-text-theme-primary">{name}</div>
              </div>

              {/* Description */}
              {description && (
                <div className="p-4 rounded-lg bg-surface-deep">
                  <div className="text-xs text-text-theme-muted uppercase tracking-wide mb-1">Description</div>
                  <div className="text-text-theme-secondary">{description}</div>
                </div>
              )}

              {/* Template */}
              <div className="p-4 rounded-lg bg-surface-deep">
                <div className="text-xs text-text-theme-muted uppercase tracking-wide mb-1">Template</div>
                <div className="flex items-center gap-2">
                  <span className="text-text-theme-primary font-medium">
                    {selectedTemplate ? selectedTemplate.name : 'Custom Campaign'}
                  </span>
                  {selectedTemplate && (
                    <Badge variant="info">{selectedTemplate.estimatedMissions} Missions</Badge>
                  )}
                </div>
              </div>

              {/* Resources Preview */}
              {selectedTemplate && (
                <div className="p-4 rounded-lg bg-surface-deep">
                  <div className="text-xs text-text-theme-muted uppercase tracking-wide mb-2">Starting Resources</div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <span className="text-text-theme-muted text-sm">C-Bills:</span>{' '}
                      <span className="text-accent font-medium">
                        {(selectedTemplate.startingResources.cBills / 1000000).toFixed(1)}M
                      </span>
                    </div>
                    <div>
                      <span className="text-text-theme-muted text-sm">Supplies:</span>{' '}
                      <span className="text-accent font-medium">
                        {selectedTemplate.startingResources.supplies}
                      </span>
                    </div>
                    <div>
                      <span className="text-text-theme-muted text-sm">Morale:</span>{' '}
                      <span className="text-accent font-medium">
                        {selectedTemplate.startingResources.morale}%
                      </span>
                    </div>
                    <div>
                      <span className="text-text-theme-muted text-sm">Difficulty:</span>{' '}
                      <span className="text-accent font-medium">
                        {selectedTemplate.recommendedDifficulty === 1.0 ? 'Normal' : `${selectedTemplate.recommendedDifficulty}x`}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Roster Summary */}
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
      {/* Step Indicator */}
      <StepIndicator steps={WIZARD_STEPS} currentStep={currentStep} />

      {/* Step Content */}
      <div className="mb-8">
        {renderStepContent()}
      </div>

      {/* Error Display */}
      {(error || localError) && (
        <div className="max-w-2xl mx-auto mb-6 p-4 rounded-lg bg-red-900/20 border border-red-600/30">
          <p className="text-sm text-red-400">{error || localError}</p>
        </div>
      )}

      {/* Navigation Buttons */}
      <div className="max-w-2xl mx-auto flex justify-between">
        <Button
          type="button"
          variant="secondary"
          onClick={currentStep === 0 ? handleCancel : handleBack}
        >
          {currentStep === 0 ? 'Cancel' : 'Back'}
        </Button>

        {currentStep < WIZARD_STEPS.length - 1 ? (
          <Button type="button" variant="primary" onClick={handleNext}>
            Continue
          </Button>
        ) : (
          <Button
            type="button"
            variant="primary"
            onClick={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Creating...' : 'Create Campaign'}
          </Button>
        )}
      </div>
    </PageLayout>
  );
}
