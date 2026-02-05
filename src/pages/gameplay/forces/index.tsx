import Link from 'next/link';
import { useRouter } from 'next/router';
/**
 * Force Roster Page
 * Browse, search, and manage all forces in the roster.
 *
 * @spec openspec/changes/add-force-management/proposal.md
 */
import { useEffect, useState, useCallback } from 'react';

import {
  SkeletonText,
  SkeletonInput,
} from '@/components/common/SkeletonLoader';
import { ForceCard } from '@/components/force';
import { PageLayout, Card, Input, Button, EmptyState } from '@/components/ui';
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
    [setSearchQuery],
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
    [router, selectForce],
  );

  if (!isInitialized || isLoading) {
    return (
      <PageLayout
        title="Force Roster"
        subtitle="Manage your combat units and lances"
        maxWidth="wide"
      >
        <Card className="mb-6">
          <div className="flex flex-col gap-4 sm:flex-row">
            <div className="flex-1">
              <SkeletonInput width="w-full" />
            </div>
          </div>
          <div className="mt-4">
            <SkeletonText width="w-24" />
          </div>
        </Card>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="border-border-theme-subtle bg-surface-raised/30 rounded-xl border-2 p-5"
            >
              <div className="mb-4 flex items-start justify-between gap-3">
                <div className="flex-1 space-y-2">
                  <SkeletonText width="w-32" />
                  <SkeletonText width="w-24" />
                </div>
                <SkeletonText width="w-16" />
              </div>
              <div className="space-y-2">
                <SkeletonText width="w-20" />
                <SkeletonText width="w-28" />
              </div>
            </div>
          ))}
        </div>
      </PageLayout>
    );
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
      }
    >
      {/* Filters */}
      <Card className="mb-6">
        <div className="flex flex-col gap-4 sm:flex-row">
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
        <div className="text-text-theme-secondary mt-4 text-sm">
          Showing {filteredForces.length} force
          {filteredForces.length !== 1 ? 's' : ''}
          {searchQuery && <span className="text-accent ml-1">(filtered)</span>}
        </div>
      </Card>

      {/* Error Display */}
      {error && (
        <div className="mb-6 rounded-lg border border-red-600/30 bg-red-900/20 p-4">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      {/* Force Grid */}
      {filteredForces.length === 0 ? (
        <EmptyState
          data-testid="forces-empty-state"
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
        <div className="grid grid-cols-1 gap-4 pb-20 md:grid-cols-2 lg:grid-cols-3">
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
      <div className="border-border-theme-subtle mt-8 border-t pt-6">
        <Link
          href="/gameplay/pilots"
          className="text-accent hover:text-accent/80 inline-flex items-center gap-2 transition-colors"
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
              d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
            />
          </svg>
          Manage Pilots
        </Link>
      </div>
    </PageLayout>
  );
}
