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
import { PageLayout, Card, Input, Button, Badge } from '@/components/ui';
import { UNIT_TEMPLATES } from '@/simulation/generator';
import { useCampaignRosterStore } from '@/stores/campaign/useCampaignRosterStore';
import { useCampaignStore } from '@/stores/campaign/useCampaignStore';
import {
  CampaignUnitStatus,
  CampaignPilotStatus,
  type ICampaignUnitState,
  type ICampaignPilotState,
} from '@/types/campaign/CampaignInterfaces';
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
  const store = useCampaignStore();
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

  const [selectedUnits, setSelectedUnits] = useState<
    Array<{ id: string; name: string; tonnage: number }>
  >([]);
  const [selectedPilots, setSelectedPilots] = useState<
    Array<{ id: string; name: string }>
  >([]);
  const [pilotAssignments, setPilotAssignments] = useState<
    Record<string, string>
  >({});

  const selectedPresetDef = ALL_PRESETS.find((p) => p.id === selectedPreset);

  const handleNext = useCallback(() => {
    setLocalError(null);

    if (currentStep === 0) {
      if (!name.trim()) {
        setLocalError('Campaign name is required');
        return;
      }
    }

    setCurrentStep((prev) => Math.min(prev + 1, WIZARD_STEPS.length - 1));
  }, [currentStep, name]);

  const handleBack = useCallback(() => {
    setCurrentStep((prev) => Math.max(prev - 1, 0));
  }, []);

  const rosterStore = useCampaignRosterStore;

  const handleAddTemplateUnit = useCallback(
    (templateName: string, tonnage: number) => {
      const unitId = `unit-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      setSelectedUnits((prev) => [
        ...prev,
        { id: unitId, name: templateName, tonnage },
      ]);
    },
    [],
  );

  const handleRemoveUnit = useCallback((unitId: string) => {
    setSelectedUnits((prev) => prev.filter((u) => u.id !== unitId));
    setPilotAssignments((prev) => {
      const next = { ...prev };
      delete next[unitId];
      return next;
    });
  }, []);

  const handleAddPilot = useCallback(() => {
    const pilotId = `pilot-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const pilotNum = selectedPilots.length + 1;
    setSelectedPilots((prev) => [
      ...prev,
      { id: pilotId, name: `MechWarrior ${pilotNum}` },
    ]);
  }, [selectedPilots.length]);

  const handleRemovePilot = useCallback((pilotId: string) => {
    setSelectedPilots((prev) => prev.filter((p) => p.id !== pilotId));
    setPilotAssignments((prev) => {
      const next: Record<string, string> = {};
      for (const [unitId, pId] of Object.entries(prev)) {
        if (pId !== pilotId) next[unitId] = pId;
      }
      return next;
    });
  }, []);

  const handleAssignPilot = useCallback((unitId: string, pilotId: string) => {
    setPilotAssignments((prev) => {
      const next: Record<string, string> = {};
      for (const [uId, pId] of Object.entries(prev)) {
        if (pId !== pilotId) next[uId] = pId;
      }
      if (pilotId) next[unitId] = pilotId;
      return next;
    });
  }, []);

  const handleSubmit = useCallback(async () => {
    setLocalError(null);
    setIsSubmitting(true);

    try {
      const campaignId = store
        .getState()
        .createCampaign(name.trim(), campaignType);

      if (campaignId) {
        if (description.trim()) {
          store.getState().updateCampaign({ description: description.trim() });
        }

        rosterStore.getState().initRoster(campaignId);

        for (const unit of selectedUnits) {
          const template = UNIT_TEMPLATES.find((t) => t.name === unit.name);
          const unitState: ICampaignUnitState = {
            unitId: unit.id,
            unitName: unit.name,
            status: CampaignUnitStatus.Operational,
            armorDamage: {},
            structureDamage: {},
            destroyedComponents: [],
            ammoExpended: {},
            currentHeat: 0,
            repairCost: 0,
            repairTime: 0,
            pilotId: pilotAssignments[unit.id],
          };
          rosterStore.getState().addUnit(unitState);

          if (template) {
            const forcesStore = store.getState().getForcesStore();
            if (forcesStore) {
              const rootForce = forcesStore.getState().getRootForce();
              if (rootForce) {
                forcesStore.getState().updateForce(rootForce.id, {
                  unitIds: [...rootForce.unitIds, unit.id],
                });
              }
            }
          }
        }

        for (const pilot of selectedPilots) {
          const pilotState: ICampaignPilotState = {
            pilotId: pilot.id,
            pilotName: pilot.name,
            status: CampaignPilotStatus.Active,
            wounds: 0,
            xp: 0,
            campaignXpEarned: 0,
            campaignKills: 0,
            campaignMissions: 0,
            recoveryTime: 0,
            assignedUnitId: Object.entries(pilotAssignments).find(
              ([, pId]) => pId === pilot.id,
            )?.[0],
          };
          rosterStore.getState().addPilot(pilotState);
        }

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
    campaignType,
    store,
    router,
    showToast,
    selectedUnits,
    selectedPilots,
    pilotAssignments,
    rosterStore,
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
              Select BattleMechs and assign pilots for your campaign
            </p>

            {/* Unit Selection */}
            <div className="mb-6">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-text-theme-primary text-sm font-medium">
                  Units ({selectedUnits.length})
                </h3>
              </div>

              {/* Unit template picker */}
              <div className="mb-4 grid grid-cols-2 gap-2">
                {UNIT_TEMPLATES.map((template) => (
                  <button
                    key={template.name}
                    type="button"
                    onClick={() =>
                      handleAddTemplateUnit(template.name, template.tonnage)
                    }
                    className="border-border-theme-subtle bg-surface-deep hover:border-accent/50 hover:bg-surface-raised/50 flex items-center gap-3 rounded-lg border p-3 text-left transition-all"
                    data-testid={`add-unit-${template.name.toLowerCase().replace(/\s+/g, '-')}`}
                  >
                    <div className="bg-accent/10 text-accent flex h-10 w-10 items-center justify-center rounded-lg text-sm font-bold">
                      {template.tonnage}t
                    </div>
                    <div>
                      <div className="text-text-theme-primary text-sm font-medium">
                        {template.name}
                      </div>
                      <div className="text-text-theme-muted text-xs">
                        Walk {template.walkMP} / Jump {template.jumpMP}
                      </div>
                    </div>
                  </button>
                ))}
              </div>

              {/* Selected units list */}
              {selectedUnits.length > 0 && (
                <div className="space-y-2">
                  {selectedUnits.map((unit) => (
                    <div
                      key={unit.id}
                      className="bg-surface-deep border-border-theme-subtle flex items-center justify-between rounded-lg border p-3"
                    >
                      <div className="flex items-center gap-3">
                        <Badge variant="emerald" size="sm">
                          {unit.tonnage}t
                        </Badge>
                        <span className="text-text-theme-primary text-sm font-medium">
                          {unit.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        {/* Pilot assignment dropdown */}
                        <select
                          value={pilotAssignments[unit.id] ?? ''}
                          onChange={(e) =>
                            handleAssignPilot(unit.id, e.target.value)
                          }
                          className="bg-surface-raised border-border-theme-subtle text-text-theme-primary rounded border px-2 py-1 text-xs"
                        >
                          <option value="">No pilot</option>
                          {selectedPilots.map((pilot) => (
                            <option key={pilot.id} value={pilot.id}>
                              {pilot.name}
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          onClick={() => handleRemoveUnit(unit.id)}
                          className="text-text-theme-muted p-1 transition-colors hover:text-red-400"
                        >
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
                              d="M6 18L18 6M6 6l12 12"
                            />
                          </svg>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {selectedUnits.length === 0 && (
                <p className="text-text-theme-muted py-4 text-center text-sm">
                  Click a unit type above to add it to your roster
                </p>
              )}
            </div>

            {/* Pilot Section */}
            <div>
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-text-theme-primary text-sm font-medium">
                  Pilots ({selectedPilots.length})
                </h3>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleAddPilot}
                  data-testid="add-pilot-btn"
                >
                  Add Pilot
                </Button>
              </div>

              {selectedPilots.length > 0 ? (
                <div className="space-y-2">
                  {selectedPilots.map((pilot) => {
                    const assignedUnit = Object.entries(pilotAssignments).find(
                      ([, pId]) => pId === pilot.id,
                    );
                    const unitName = assignedUnit
                      ? selectedUnits.find((u) => u.id === assignedUnit[0])
                          ?.name
                      : undefined;

                    return (
                      <div
                        key={pilot.id}
                        className="bg-surface-deep border-border-theme-subtle flex items-center justify-between rounded-lg border p-3"
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400">
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
                                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                              />
                            </svg>
                          </div>
                          <div>
                            <span className="text-text-theme-primary text-sm font-medium">
                              {pilot.name}
                            </span>
                            {unitName && (
                              <span className="text-text-theme-muted ml-2 text-xs">
                                → {unitName}
                              </span>
                            )}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemovePilot(pilot.id)}
                          className="text-text-theme-muted p-1 transition-colors hover:text-red-400"
                        >
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
                              d="M6 18L18 6M6 6l12 12"
                            />
                          </svg>
                        </button>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-text-theme-muted py-4 text-center text-sm">
                  Add pilots to crew your BattleMechs
                </p>
              )}
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
                      {selectedUnits.length || 'None selected'}
                    </span>
                  </div>
                  <div>
                    <span className="text-text-theme-muted text-sm">
                      Pilots:
                    </span>{' '}
                    <span className="text-text-theme-primary font-medium">
                      {selectedPilots.length || 'None selected'}
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

      {localError && (
        <div
          className="mx-auto mb-6 max-w-2xl rounded-lg border border-red-600/30 bg-red-900/20 p-4"
          data-testid="name-error"
        >
          <p className="text-sm text-red-400">{localError}</p>
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
