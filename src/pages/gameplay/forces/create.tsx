import { useRouter } from 'next/router';
/**
 * Force Creation Page
 * Create a new force with name, type, and affiliation.
 *
 * @spec openspec/changes/add-force-management/proposal.md
 */
import { useState, useCallback } from 'react';

import { useToast } from '@/components/shared/Toast';
import {
  PageLayout,
  Card,
  CardSection,
  Button,
  Input,
  Textarea,
  Badge,
} from '@/components/ui';
import { useForceStore } from '@/stores/useForceStore';
import { ForceType } from '@/types/force';

// =============================================================================
// Force Type Options
// =============================================================================

interface ForceTypeOption {
  type: ForceType;
  name: string;
  description: string;
  slots: number;
  faction: string;
}

const FORCE_TYPE_OPTIONS: ForceTypeOption[] = [
  {
    type: ForceType.Lance,
    name: 'Lance',
    description: 'Standard Inner Sphere tactical unit',
    slots: 4,
    faction: 'Inner Sphere',
  },
  {
    type: ForceType.Star,
    name: 'Star',
    description: 'Standard Clan tactical unit',
    slots: 5,
    faction: 'Clan',
  },
  {
    type: ForceType.Level_II,
    name: 'Level II',
    description: 'ComStar/Word of Blake tactical unit',
    slots: 6,
    faction: 'ComStar',
  },
  {
    type: ForceType.Company,
    name: 'Company',
    description: 'Three lances combined',
    slots: 12,
    faction: 'Inner Sphere',
  },
  {
    type: ForceType.Binary,
    name: 'Binary',
    description: 'Two stars combined',
    slots: 10,
    faction: 'Clan',
  },
  {
    type: ForceType.Custom,
    name: 'Custom',
    description: 'Custom force configuration',
    slots: 4,
    faction: 'Any',
  },
];

// =============================================================================
// Sub-Components
// =============================================================================

interface ForceTypeCardProps {
  option: ForceTypeOption;
  isSelected: boolean;
  onClick: () => void;
}

function ForceTypeCard({
  option,
  isSelected,
  onClick,
}: ForceTypeCardProps): React.ReactElement {
  return (
    <button
      type="button"
      onClick={onClick}
      data-testid={`force-type-${option.type}`}
      className={`rounded-lg border-2 p-4 text-left transition-all duration-200 ${
        isSelected
          ? 'border-accent bg-accent/10'
          : 'border-border-theme-subtle hover:border-border-theme bg-surface-raised/50'
      } `}
    >
      <div className="mb-2 flex items-start justify-between">
        <h3 className="text-text-theme-primary font-bold">{option.name}</h3>
        <Badge variant={isSelected ? 'amber' : 'slate'} size="sm">
          {option.slots} slots
        </Badge>
      </div>
      <p className="text-text-theme-secondary mb-2 text-sm">
        {option.description}
      </p>
      <span className="text-text-theme-muted text-xs">{option.faction}</span>
    </button>
  );
}

// =============================================================================
// Main Page Component
// =============================================================================

export default function CreateForcePage(): React.ReactElement {
  const router = useRouter();
  const { createForce, isLoading, error, clearError } = useForceStore();
  const { showToast } = useToast();

  // Form state
  const [name, setName] = useState('');
  const [forceType, setForceType] = useState<ForceType>(ForceType.Lance);
  const [affiliation, setAffiliation] = useState('');
  const [description, setDescription] = useState('');

  // Validation
  const isValid = name.trim().length >= 2;

  // Handle form submission
  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!isValid) return;

      clearError();

      const forceId = await createForce({
        name: name.trim(),
        forceType,
        affiliation: affiliation.trim() || undefined,
        description: description.trim() || undefined,
      });

      if (forceId) {
        showToast({
          message: `Force "${name.trim()}" created successfully!`,
          variant: 'success',
        });
        router.push(`/gameplay/forces/${forceId}`);
      } else {
        showToast({ message: 'Failed to create force', variant: 'error' });
      }
    },
    [
      isValid,
      name,
      forceType,
      affiliation,
      description,
      createForce,
      router,
      clearError,
      showToast,
    ],
  );

  // Handle cancel
  const handleCancel = useCallback(() => {
    router.push('/gameplay/forces');
  }, [router]);

  const selectedOption = FORCE_TYPE_OPTIONS.find((o) => o.type === forceType);

  return (
    <PageLayout
      title="Create Force"
      subtitle="Organize your combat units into a tactical formation"
      backLink="/gameplay/forces"
      backLabel="Back to Roster"
    >
      <form onSubmit={handleSubmit} className="mx-auto max-w-3xl space-y-6">
        {/* Error Display */}
        {error && (
          <div className="rounded-lg border border-red-600/30 bg-red-900/20 p-4">
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}

        {/* Force Identity */}
        <Card variant="dark">
          <CardSection title="Force Identity" />
          <div className="space-y-4">
            <div>
              <label
                htmlFor="name"
                className="text-text-theme-secondary mb-1.5 block text-sm font-medium"
              >
                Force Name *
              </label>
              <Input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter force name..."
                required
                autoFocus
                data-testid="force-name-input"
              />
              <p className="text-text-theme-muted mt-1 text-xs">
                Minimum 2 characters
              </p>
            </div>

            <div>
              <label
                htmlFor="affiliation"
                className="text-text-theme-secondary mb-1.5 block text-sm font-medium"
              >
                Affiliation
              </label>
              <Input
                id="affiliation"
                type="text"
                value={affiliation}
                onChange={(e) => setAffiliation(e.target.value)}
                placeholder="e.g., House Steiner, Clan Wolf..."
                data-testid="force-affiliation-input"
              />
            </div>

            <div>
              <Textarea
                id="description"
                label="Description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional notes about this force..."
                rows={3}
                data-testid="force-description-input"
              />
            </div>
          </div>
        </Card>

        {/* Force Type Selection */}
        <Card variant="dark">
          <CardSection title="Force Type" />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FORCE_TYPE_OPTIONS.map((option) => (
              <ForceTypeCard
                key={option.type}
                option={option}
                isSelected={forceType === option.type}
                onClick={() => setForceType(option.type)}
              />
            ))}
          </div>

          {/* Selected type info */}
          {selectedOption && (
            <div className="bg-surface-raised/50 border-border-theme-subtle mt-6 rounded-lg border p-4">
              <div className="flex items-center gap-3">
                <div className="bg-accent/10 flex h-12 w-12 items-center justify-center rounded-lg">
                  <span className="text-accent text-xl font-bold">
                    {selectedOption.slots}
                  </span>
                </div>
                <div>
                  <h4 className="text-text-theme-primary font-medium">
                    {selectedOption.name}
                  </h4>
                  <p className="text-text-theme-secondary text-sm">
                    {selectedOption.slots} assignment slots will be created
                  </p>
                </div>
              </div>
            </div>
          )}
        </Card>

        {/* Actions */}
        <div className="border-border-theme-subtle flex items-center justify-end gap-4 border-t pt-4">
          <Button
            type="button"
            variant="ghost"
            onClick={handleCancel}
            disabled={isLoading}
            data-testid="cancel-btn"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            disabled={!isValid}
            isLoading={isLoading}
            data-testid="submit-force-btn"
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
            Create Force
          </Button>
        </div>
      </form>
    </PageLayout>
  );
}
