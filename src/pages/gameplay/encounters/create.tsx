import { useRouter } from 'next/router';
/**
 * Create Encounter Page
 * Wizard for setting up a new encounter configuration.
 *
 * @spec openspec/changes/add-encounter-system/specs/encounter-system/spec.md
 */
import { useState, useCallback } from 'react';

import { useToast } from '@/components/shared/Toast';
import { PageLayout, Card, Input, Textarea, Button } from '@/components/ui';
import { useEncounterStore } from '@/stores/useEncounterStore';
import { SCENARIO_TEMPLATES, ScenarioTemplateType } from '@/types/encounter';

// =============================================================================
// Template Card Component
// =============================================================================

interface TemplateCardProps {
  template: (typeof SCENARIO_TEMPLATES)[number];
  selected: boolean;
  onSelect: () => void;
}

function TemplateCard({
  template,
  selected,
  onSelect,
}: TemplateCardProps): React.ReactElement {
  return (
    <Card
      className={`cursor-pointer transition-all ${
        selected
          ? 'border-accent ring-accent/30 ring-1'
          : 'hover:border-accent/50'
      }`}
      onClick={onSelect}
      data-testid={`template-${template.type}`}
    >
      <h3 className="text-text-theme-primary mb-1 font-medium">
        {template.name}
      </h3>
      <p className="text-text-theme-secondary mb-3 text-sm">
        {template.description}
      </p>
      <div className="text-text-theme-muted space-y-1 text-xs">
        <div>Suggested Units: {template.suggestedUnitCount} per side</div>
        <div>
          BV Range: {template.suggestedBVRange.min.toLocaleString()} -{' '}
          {template.suggestedBVRange.max.toLocaleString()}
        </div>
        <div>Map Radius: {template.defaultMapConfig.radius} hexes</div>
      </div>
    </Card>
  );
}

// =============================================================================
// Main Page Component
// =============================================================================

export default function CreateEncounterPage(): React.ReactElement {
  const router = useRouter();
  const { createEncounter, isLoading, error, clearError } = useEncounterStore();
  const { showToast } = useToast();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedTemplate, setSelectedTemplate] =
    useState<ScenarioTemplateType | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);

  // Handle form submission
  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      clearError();
      setLocalError(null);

      if (!name.trim()) {
        setLocalError('Encounter name is required');
        return;
      }

      const id = await createEncounter({
        name: name.trim(),
        description: description.trim() || undefined,
        template: selectedTemplate || undefined,
      });

      if (id) {
        showToast({
          message: `Encounter "${name.trim()}" created successfully!`,
          variant: 'success',
        });
        router.push(`/gameplay/encounters/${id}`);
      } else {
        showToast({ message: 'Failed to create encounter', variant: 'error' });
      }
    },
    [
      name,
      description,
      selectedTemplate,
      createEncounter,
      router,
      clearError,
      showToast,
    ],
  );

  // Handle cancel
  const handleCancel = useCallback(() => {
    router.push('/gameplay/encounters');
  }, [router]);

  return (
    <PageLayout
      title="New Encounter"
      subtitle="Configure a battle scenario"
      maxWidth="default"
    >
      <form onSubmit={handleSubmit}>
        {/* Basic Info */}
        <Card className="mb-6">
          <h2 className="text-text-theme-primary mb-4 text-lg font-medium">
            Basic Information
          </h2>

          <div className="space-y-4">
            <div>
              <label
                htmlFor="name"
                className="text-text-theme-primary mb-1 block text-sm font-medium"
              >
                Encounter Name *
              </label>
              <Input
                id="name"
                type="text"
                placeholder="e.g., Operation Serpent - Battle 1"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                data-testid="encounter-name-input"
              />
              {localError && localError.includes('name') && (
                <p
                  className="mt-1 text-sm text-red-400"
                  data-testid="name-error"
                >
                  {localError}
                </p>
              )}
            </div>

            <Textarea
              id="description"
              label="Description"
              placeholder="Optional description of this encounter..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              data-testid="encounter-description-input"
            />
          </div>
        </Card>

        {/* Template Selection */}
        <Card className="mb-6">
          <h2 className="text-text-theme-primary mb-4 text-lg font-medium">
            Scenario Template
          </h2>
          <p className="text-text-theme-secondary mb-4 text-sm">
            Choose a template to pre-configure map size, victory conditions, and
            recommended force sizes. You can customize these settings after
            creation.
          </p>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {SCENARIO_TEMPLATES.map((template) => (
              <TemplateCard
                key={template.type}
                template={template}
                selected={selectedTemplate === template.type}
                onSelect={() => setSelectedTemplate(template.type)}
              />
            ))}
          </div>

          {selectedTemplate && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="mt-4"
              onClick={() => setSelectedTemplate(null)}
            >
              Clear Template Selection
            </Button>
          )}
        </Card>

        {/* Error Display */}
        {(error || localError) && (
          <div className="mb-6 rounded-lg border border-red-600/30 bg-red-900/20 p-4">
            <p className="text-sm text-red-400">{error || localError}</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-3">
          <Button
            type="button"
            variant="secondary"
            onClick={handleCancel}
            data-testid="cancel-btn"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            disabled={isLoading}
            data-testid="submit-encounter-btn"
          >
            {isLoading ? 'Creating...' : 'Create Encounter'}
          </Button>
        </div>
      </form>
    </PageLayout>
  );
}
