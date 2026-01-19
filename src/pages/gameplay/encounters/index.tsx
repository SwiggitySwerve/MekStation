/**
 * Encounters List Page
 * Browse, search, and manage encounter configurations.
 *
 * @spec openspec/changes/add-encounter-system/specs/encounter-system/spec.md
 */
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/router';
import {
  PageLayout,
  PageLoading,
  Card,
  Input,
  Button,
  EmptyState,
  Badge,
} from '@/components/ui';
import { useEncounterStore } from '@/stores/useEncounterStore';
import { IEncounter, EncounterStatus, SCENARIO_TEMPLATES } from '@/types/encounter';

// =============================================================================
// Status Badge Colors
// =============================================================================

function getStatusColor(status: EncounterStatus): 'slate' | 'success' | 'warning' | 'info' {
  switch (status) {
    case EncounterStatus.Draft:
      return 'slate';
    case EncounterStatus.Ready:
      return 'success';
    case EncounterStatus.Launched:
      return 'info';
    case EncounterStatus.Completed:
      return 'slate';
    default:
      return 'slate';
  }
}

function getStatusLabel(status: EncounterStatus): string {
  switch (status) {
    case EncounterStatus.Draft:
      return 'Draft';
    case EncounterStatus.Ready:
      return 'Ready';
    case EncounterStatus.Launched:
      return 'In Progress';
    case EncounterStatus.Completed:
      return 'Completed';
    default:
      return status;
  }
}

// =============================================================================
// Encounter Card Component
// =============================================================================

interface EncounterCardProps {
  encounter: IEncounter;
  onClick: () => void;
}

function EncounterCard({ encounter, onClick }: EncounterCardProps): React.ReactElement {
  const template = encounter.template
    ? SCENARIO_TEMPLATES.find((t) => t.type === encounter.template)
    : null;

  return (
    <Card
      className="cursor-pointer hover:border-accent/50 transition-all"
      onClick={onClick}
    >
      <div className="flex justify-between items-start mb-3">
        <h3 className="font-medium text-text-theme-primary truncate">{encounter.name}</h3>
        <Badge variant={getStatusColor(encounter.status)}>
          {getStatusLabel(encounter.status)}
        </Badge>
      </div>

      {encounter.description && (
        <p className="text-sm text-text-theme-secondary mb-3 line-clamp-2">
          {encounter.description}
        </p>
      )}

      {template && (
        <div className="text-xs text-text-theme-muted mb-3">
          Template: {template.name}
        </div>
      )}

      <div className="flex flex-wrap gap-2 text-xs">
        {encounter.playerForce ? (
          <span className="px-2 py-1 rounded bg-surface-raised text-text-theme-secondary">
            Player: {encounter.playerForce.forceName || 'Set'}
          </span>
        ) : (
          <span className="px-2 py-1 rounded bg-yellow-900/20 text-yellow-400">
            No Player Force
          </span>
        )}

        {encounter.opponentForce ? (
          <span className="px-2 py-1 rounded bg-surface-raised text-text-theme-secondary">
            Opponent: {encounter.opponentForce.forceName || 'Set'}
          </span>
        ) : encounter.opForConfig ? (
          <span className="px-2 py-1 rounded bg-surface-raised text-text-theme-secondary">
            OpFor: Generated
          </span>
        ) : (
          <span className="px-2 py-1 rounded bg-yellow-900/20 text-yellow-400">
            No Opponent
          </span>
        )}
      </div>

      <div className="mt-3 pt-3 border-t border-border-theme-subtle text-xs text-text-theme-muted">
        Updated: {new Date(encounter.updatedAt).toLocaleDateString()}
      </div>
    </Card>
  );
}

// =============================================================================
// Main Page Component
// =============================================================================

export default function EncountersListPage(): React.ReactElement {
  const router = useRouter();
  const {
    isLoading,
    error,
    loadEncounters,
    searchQuery,
    setSearchQuery,
    statusFilter,
    setStatusFilter,
    getFilteredEncounters,
    selectEncounter,
  } = useEncounterStore();

  const filteredEncounters = getFilteredEncounters();
  const [isInitialized, setIsInitialized] = useState(false);

  // Load encounters on mount
  useEffect(() => {
    const initialize = async () => {
      await loadEncounters();
      setIsInitialized(true);
    };
    initialize();
  }, [loadEncounters]);

  // Handle search input
  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setSearchQuery(e.target.value);
    },
    [setSearchQuery]
  );

  // Navigate to create page
  const handleCreateEncounter = useCallback(() => {
    router.push('/gameplay/encounters/create');
  }, [router]);

  // Navigate to encounter detail
  const handleEncounterClick = useCallback(
    (encounter: IEncounter) => {
      selectEncounter(encounter.id);
      router.push(`/gameplay/encounters/${encounter.id}`);
    },
    [router, selectEncounter]
  );

  if (!isInitialized || isLoading) {
    return <PageLoading message="Loading encounters..." />;
  }

  return (
    <PageLayout
      title="Encounters"
      subtitle="Configure and launch battle scenarios"
      maxWidth="wide"
      headerContent={
        <Button
          variant="primary"
          onClick={handleCreateEncounter}
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
          New Encounter
        </Button>
      }
    >
      {/* Filters */}
      <Card className="mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Search */}
          <div className="flex-1">
            <Input
              type="text"
              placeholder="Search encounters..."
              value={searchQuery}
              onChange={handleSearchChange}
              aria-label="Search encounters"
            />
          </div>

          {/* Status Filter */}
          <div className="flex gap-2">
            {(['all', EncounterStatus.Draft, EncounterStatus.Ready, EncounterStatus.Launched] as const).map(
              (status) => (
                <Button
                  key={status}
                  variant={statusFilter === status ? 'primary' : 'secondary'}
                  size="sm"
                  onClick={() => setStatusFilter(status)}
                >
                  {status === 'all' ? 'All' : getStatusLabel(status as EncounterStatus)}
                </Button>
              )
            )}
          </div>
        </div>

        {/* Results count */}
        <div className="mt-4 text-sm text-text-theme-secondary">
          Showing {filteredEncounters.length} encounter
          {filteredEncounters.length !== 1 ? 's' : ''}
          {(searchQuery || statusFilter !== 'all') && (
            <span className="text-accent ml-1">(filtered)</span>
          )}
        </div>
      </Card>

      {/* Error Display */}
      {error && (
        <div className="mb-6 p-4 rounded-lg bg-red-900/20 border border-red-600/30">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      {/* Encounters Grid */}
      {filteredEncounters.length === 0 ? (
        <EmptyState
          icon={
            <div className="w-16 h-16 mx-auto rounded-full bg-surface-raised/50 flex items-center justify-center">
              <svg
                className="w-8 h-8 text-text-theme-muted"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                />
              </svg>
            </div>
          }
          title={searchQuery || statusFilter !== 'all' ? 'No encounters match your filters' : 'No encounters yet'}
          message={
            searchQuery || statusFilter !== 'all'
              ? 'Try adjusting your search or filters'
              : 'Create an encounter to set up a battle scenario'
          }
          action={
            !(searchQuery || statusFilter !== 'all') && (
              <Button variant="primary" onClick={handleCreateEncounter}>
                Create First Encounter
              </Button>
            )
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredEncounters.map((encounter) => (
            <EncounterCard
              key={encounter.id}
              encounter={encounter}
              onClick={() => handleEncounterClick(encounter)}
            />
          ))}
        </div>
      )}
    </PageLayout>
  );
}
