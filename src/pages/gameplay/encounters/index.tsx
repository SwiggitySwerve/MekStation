import { useRouter } from 'next/router';
/**
 * Encounters List Page
 * Browse, search, and manage encounter configurations.
 *
 * @spec openspec/changes/add-encounter-system/specs/encounter-system/spec.md
 * @spec openspec/changes/repair-broken-encounter-drafts/specs/game-session-management/spec.md
 *       (Requirement: Encounter List Surfaces Broken-Reference State,
 *        Requirement: Empty-State Seed Samples)
 */
import { useEffect, useState, useCallback } from 'react';

import { InlineErrorMessage } from '@/components/common/InlineErrorMessage';
import { EncounterCard } from '@/components/gameplay/encounters/EncounterCard';
import {
  PageLayout,
  PageLoading,
  Card,
  Input,
  Button,
  EmptyState,
} from '@/components/ui';
import { useEncounterSelector } from '@/stores/useEncounterStore';
import { IEncounter, EncounterStatus } from '@/types/encounter';
import { getStatusLabel } from '@/utils/encounterStatus';

// =============================================================================
// Main Page Component
// =============================================================================

export default function EncountersListPage(): React.ReactElement {
  const router = useRouter();
  const isLoading = useEncounterSelector((state) => state.isLoading);
  const error = useEncounterSelector((state) => state.error);
  const loadEncounters = useEncounterSelector((state) => state.loadEncounters);
  const seedSampleEncounters = useEncounterSelector(
    (state) => state.seedSampleEncounters,
  );
  const searchQuery = useEncounterSelector((state) => state.searchQuery);
  const setSearchQuery = useEncounterSelector((state) => state.setSearchQuery);
  const statusFilter = useEncounterSelector((state) => state.statusFilter);
  const setStatusFilter = useEncounterSelector(
    (state) => state.setStatusFilter,
  );
  const getFilteredEncounters = useEncounterSelector(
    (state) => state.getFilteredEncounters,
  );
  const getEncounterRawForceIds = useEncounterSelector(
    (state) => state.getEncounterRawForceIds,
  );
  const selectEncounter = useEncounterSelector(
    (state) => state.selectEncounter,
  );

  const filteredEncounters = getFilteredEncounters();
  const [isInitialized, setIsInitialized] = useState(false);
  // Local "seeding in progress" so we can disable the button while the
  // POST round-trip resolves. Tracked here rather than the store because
  // the loadEncounters() refresh inside the action already toggles
  // `isLoading` and we don't want both spinners stacking.
  const [isSeeding, setIsSeeding] = useState(false);

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
    [setSearchQuery],
  );

  // Navigate to create page
  const handleCreateEncounter = useCallback(() => {
    router.push('/gameplay/encounters/create');
  }, [router]);

  // Seed 4 sample encounters via the new POST /api/encounters/seed-samples
  // route. The store action takes care of the refresh, so the click handler
  // only manages the local "in flight" flag for the button disabled state.
  const handleSeedSamples = useCallback(async () => {
    setIsSeeding(true);
    try {
      await seedSampleEncounters();
    } finally {
      setIsSeeding(false);
    }
  }, [seedSampleEncounters]);

  // Navigate to encounter detail
  const handleEncounterClick = useCallback(
    (encounter: IEncounter) => {
      selectEncounter(encounter.id);
      router.push(`/gameplay/encounters/${encounter.id}`);
    },
    [router, selectEncounter],
  );

  if (!isInitialized || isLoading) {
    return <PageLoading message="Loading encounters..." />;
  }

  // Truly-empty (no filter, no search) is the only state where seeding
  // makes sense. A filtered empty state still has encounters in the DB
  // and the user is just narrowing — adding 4 starter encounters there
  // would be confusing.
  const isTrulyEmpty =
    filteredEncounters.length === 0 && !searchQuery && statusFilter === 'all';

  return (
    <PageLayout
      title="Encounters"
      subtitle="Configure and launch battle scenarios"
      maxWidth="wide"
      headerContent={
        <Button
          variant="primary"
          onClick={handleCreateEncounter}
          data-testid="create-encounter-btn"
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
          New Encounter
        </Button>
      }
    >
      {/* Filters */}
      <Card className="mb-6">
        <div className="flex flex-col gap-4 sm:flex-row">
          {/* Search */}
          <div className="flex-1">
            <Input
              type="text"
              placeholder="Search encounters..."
              value={searchQuery}
              onChange={handleSearchChange}
              aria-label="Search encounters"
              data-testid="encounter-search"
            />
          </div>

          {/* Status Filter */}
          <div className="flex gap-2" data-testid="status-filter">
            {(
              [
                'all',
                EncounterStatus.Draft,
                EncounterStatus.Ready,
                EncounterStatus.Launched,
              ] as const
            ).map((status) => (
              <Button
                key={status}
                variant={statusFilter === status ? 'primary' : 'secondary'}
                size="sm"
                onClick={() => setStatusFilter(status)}
                data-testid={`status-option-${status}`}
              >
                {status === 'all'
                  ? 'All'
                  : getStatusLabel(status as EncounterStatus)}
              </Button>
            ))}
          </div>
        </div>

        {/* Results count */}
        <div className="text-text-theme-secondary mt-4 text-sm">
          Showing {filteredEncounters.length} encounter
          {filteredEncounters.length !== 1 ? 's' : ''}
          {(searchQuery || statusFilter !== 'all') && (
            <span className="text-accent ml-1">(filtered)</span>
          )}
        </div>
      </Card>

      <InlineErrorMessage message={error} />

      {/* Encounters Grid */}
      {filteredEncounters.length === 0 ? (
        <EmptyState
          data-testid="encounters-empty-state"
          icon={
            <div className="bg-surface-raised/50 mx-auto flex h-16 w-16 items-center justify-center rounded-full">
              <svg
                className="text-text-theme-muted h-8 w-8"
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
          title={
            searchQuery || statusFilter !== 'all'
              ? 'No encounters match your filters'
              : 'No encounters yet'
          }
          message={
            searchQuery || statusFilter !== 'all'
              ? 'Try adjusting your search or filters'
              : 'Create an encounter to set up a battle scenario'
          }
          action={
            isTrulyEmpty ? (
              <div className="flex flex-wrap items-center justify-center gap-3">
                <Button variant="primary" onClick={handleCreateEncounter}>
                  Create First Encounter
                </Button>
                <Button
                  variant="secondary"
                  onClick={handleSeedSamples}
                  disabled={isSeeding}
                  data-testid="seed-samples-btn"
                >
                  {isSeeding ? 'Seeding...' : 'Seed sample encounters'}
                </Button>
              </div>
            ) : null
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 pb-20 md:grid-cols-2 lg:grid-cols-3">
          {filteredEncounters.map((encounter) => (
            <EncounterCard
              key={encounter.id}
              encounter={encounter}
              rawForceIds={getEncounterRawForceIds(encounter.id)}
              onClick={() => handleEncounterClick(encounter)}
            />
          ))}
        </div>
      )}
    </PageLayout>
  );
}
