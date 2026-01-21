/**
 * Force Creation Page
 * Create a new force with name, type, and affiliation.
 *
 * @spec openspec/changes/add-force-management/proposal.md
 */
import { useState, useCallback } from 'react';
import { useRouter } from 'next/router';
import {
  PageLayout,
  Card,
  CardSection,
  Button,
  Input,
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
      className={`
        text-left p-4 rounded-lg border-2 transition-all duration-200
        ${
          isSelected
            ? 'border-accent bg-accent/10'
            : 'border-border-theme-subtle hover:border-border-theme bg-surface-raised/50'
        }
      `}
    >
      <div className="flex items-start justify-between mb-2">
        <h3 className="font-bold text-text-theme-primary">{option.name}</h3>
        <Badge variant={isSelected ? 'amber' : 'slate'} size="sm">
          {option.slots} slots
        </Badge>
      </div>
      <p className="text-sm text-text-theme-secondary mb-2">
        {option.description}
      </p>
      <span className="text-xs text-text-theme-muted">{option.faction}</span>
    </button>
  );
}

// =============================================================================
// Main Page Component
// =============================================================================

export default function CreateForcePage(): React.ReactElement {
  const router = useRouter();
  const { createForce, isLoading, error, clearError } = useForceStore();

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
        router.push(`/gameplay/forces/${forceId}`);
      }
    },
    [isValid, name, forceType, affiliation, description, createForce, router, clearError]
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
      <form onSubmit={handleSubmit} className="max-w-3xl mx-auto space-y-6">
        {/* Error Display */}
        {error && (
          <div className="p-4 rounded-lg bg-red-900/20 border border-red-600/30">
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
                className="block text-sm font-medium text-text-theme-secondary mb-1.5"
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
              <p className="mt-1 text-xs text-text-theme-muted">
                Minimum 2 characters
              </p>
            </div>

            <div>
              <label
                htmlFor="affiliation"
                className="block text-sm font-medium text-text-theme-secondary mb-1.5"
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
              <label
                htmlFor="description"
                className="block text-sm font-medium text-text-theme-secondary mb-1.5"
              >
                Description
              </label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional notes about this force..."
                rows={3}
                data-testid="force-description-input"
                className="w-full px-4 py-2.5 bg-surface-raised border border-border-theme-subtle rounded-lg text-text-theme-primary placeholder-text-theme-muted focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30 resize-none"
              />
            </div>
          </div>
        </Card>

        {/* Force Type Selection */}
        <Card variant="dark">
          <CardSection title="Force Type" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
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
            <div className="mt-6 p-4 rounded-lg bg-surface-raised/50 border border-border-theme-subtle">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-lg bg-accent/10 flex items-center justify-center">
                  <span className="text-xl font-bold text-accent">
                    {selectedOption.slots}
                  </span>
                </div>
                <div>
                  <h4 className="font-medium text-text-theme-primary">
                    {selectedOption.name}
                  </h4>
                  <p className="text-sm text-text-theme-secondary">
                    {selectedOption.slots} assignment slots will be created
                  </p>
                </div>
              </div>
            </div>
          )}
        </Card>

        {/* Actions */}
        <div className="flex items-center justify-end gap-4 pt-4 border-t border-border-theme-subtle">
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
                className="w-4 h-4"
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
