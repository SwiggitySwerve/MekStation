/**
 * Force Roster Page
 * Browse, search, and manage all forces in the roster.
 *
 * @spec openspec/changes/add-force-management/proposal.md
 */
import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import {
  PageLayout,
  PageLoading,
  Card,
  Input,
  Button,
  EmptyState,
} from '@/components/ui';
import { ForceCard } from '@/components/force';
import { useForceStore } from '@/stores/useForceStore';
import { IForce } from '@/types/force';

// =============================================================================
// Main Page Component
// =============================================================================

export default function ForceRosterPage(): React.ReactElement {
  const router = useRouter();
  const {
    isLoading,
    error,
    loadForces,
    searchQuery,
    setSearchQuery,
    getFilteredForces,
    selectForce,
  } = useForceStore();

  const filteredForces = getFilteredForces();
  const [isInitialized, setIsInitialized] = useState(false);

  // Load forces on mount
  useEffect(() => {
    const initialize = async () => {
      await loadForces();
      setIsInitialized(true);
    };
    initialize();
  }, [loadForces]);

  // Handle search input
  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setSearchQuery(e.target.value);
    },
    [setSearchQuery]
  );

  // Navigate to create page
  const handleCreateForce = useCallback(() => {
    router.push('/gameplay/forces/create');
  }, [router]);

  // Navigate to force detail
  const handleForceClick = useCallback(
    (force: IForce) => {
      selectForce(force.id);
      router.push(`/gameplay/forces/${force.id}`);
    },
    [router, selectForce]
  );

  if (!isInitialized || isLoading) {
    return <PageLoading message="Loading force roster..." />;
  }

  // Separate root forces from child forces for hierarchy display
  const rootForces = filteredForces.filter((f) => !f.parentId);

  return (
    <PageLayout
      title="Force Roster"
      subtitle="Manage your combat units and lances"
      maxWidth="wide"
      headerContent={
        <Button
          variant="primary"
          onClick={handleCreateForce}
          data-testid="create-force-btn"
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
      }
    >
      {/* Filters */}
      <Card className="mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Search */}
          <div className="flex-1">
            <Input
              type="text"
              placeholder="Search by name or affiliation..."
              value={searchQuery}
              onChange={handleSearchChange}
              aria-label="Search forces"
              data-testid="force-search"
            />
          </div>
        </div>

        {/* Results count */}
        <div className="mt-4 text-sm text-text-theme-secondary">
          Showing {filteredForces.length} force
          {filteredForces.length !== 1 ? 's' : ''}
          {searchQuery && <span className="text-accent ml-1">(filtered)</span>}
        </div>
      </Card>

      {/* Error Display */}
      {error && (
        <div className="mb-6 p-4 rounded-lg bg-red-900/20 border border-red-600/30">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      {/* Force Grid */}
      {filteredForces.length === 0 ? (
        <EmptyState
          data-testid="forces-empty-state"
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
                  d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                />
              </svg>
            </div>
          }
          title={searchQuery ? 'No forces match your search' : 'No forces yet'}
          message={
            searchQuery
              ? 'Try adjusting your search'
              : 'Create your first force to organize your combat units'
          }
          action={
            !searchQuery && (
              <Button variant="primary" onClick={handleCreateForce}>
                Create First Force
              </Button>
            )
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pb-20">
          {rootForces.map((force) => (
            <ForceCard
              key={force.id}
              force={force}
              onClick={() => handleForceClick(force)}
              data-testid={`force-card-${force.id}`}
            />
          ))}
        </div>
      )}

      {/* Link to pilots */}
      <div className="mt-8 pt-6 border-t border-border-theme-subtle">
        <Link
          href="/gameplay/pilots"
          className="inline-flex items-center gap-2 text-accent hover:text-accent/80 transition-colors"
        >
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
              d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
            />
          </svg>
          Manage Pilots
        </Link>
      </div>
    </PageLayout>
  );
}
