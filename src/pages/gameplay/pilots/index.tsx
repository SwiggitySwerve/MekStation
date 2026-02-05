import Link from 'next/link';
import { useRouter } from 'next/router';
/**
 * Pilot Roster Page
 * Browse, search, and manage all pilots in the roster.
 */
import { useEffect, useState, useCallback } from 'react';

import {
  SkeletonText,
  SkeletonInput,
  SkeletonFormSection,
} from '@/components/common/SkeletonLoader';
import {
  PageLayout,
  Card,
  Input,
  Button,
  Badge,
  EmptyState,
} from '@/components/ui';
import { usePilotStore, useFilteredPilots } from '@/stores/usePilotStore';
import { IPilot, PilotStatus, getPilotRating } from '@/types/pilot';

// =============================================================================
// Status Badge Component
// =============================================================================

interface StatusBadgeProps {
  status: PilotStatus;
}

function StatusBadge({ status }: StatusBadgeProps): React.ReactElement {
  const variants: Record<
    PilotStatus,
    { variant: 'emerald' | 'amber' | 'orange' | 'red' | 'slate'; label: string }
  > = {
    [PilotStatus.Active]: { variant: 'emerald', label: 'Active' },
    [PilotStatus.Injured]: { variant: 'orange', label: 'Injured' },
    [PilotStatus.MIA]: { variant: 'amber', label: 'MIA' },
    [PilotStatus.KIA]: { variant: 'red', label: 'KIA' },
    [PilotStatus.Retired]: { variant: 'slate', label: 'Retired' },
  };

  const { variant, label } = variants[status] || {
    variant: 'slate',
    label: status,
  };

  return (
    <Badge variant={variant} size="sm">
      {label}
    </Badge>
  );
}

// =============================================================================
// Pilot Card Component
// =============================================================================

interface PilotCardProps {
  pilot: IPilot;
}

function PilotCard({ pilot }: PilotCardProps): React.ReactElement {
  const rating = getPilotRating(pilot.skills);
  const isInactive =
    pilot.status === PilotStatus.KIA || pilot.status === PilotStatus.Retired;

  return (
    <Link href={`/gameplay/pilots/${pilot.id}`}>
      <div
        className={`group from-surface-raised/60 to-surface-raised/30 relative cursor-pointer rounded-xl border-2 bg-gradient-to-br p-5 transition-all duration-300 ${
          isInactive
            ? 'border-border-theme-subtle/50 opacity-60 hover:opacity-80'
            : 'border-border-theme-subtle hover:border-accent/50 hover:shadow-accent/10 hover:shadow-lg'
        } hover:-translate-y-0.5 hover:scale-[1.02]`}
      >
        {/* Accent Line */}
        <div
          className={`absolute top-0 right-4 left-4 h-0.5 rounded-full transition-all duration-300 ${
            isInactive
              ? 'bg-border-theme-subtle'
              : 'bg-accent/30 group-hover:bg-accent'
          }`}
        />

        {/* Header */}
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h3 className="text-text-theme-primary group-hover:text-accent truncate text-lg font-bold transition-colors">
              {pilot.name}
            </h3>
            {pilot.callsign && (
              <p className="text-accent/80 truncate text-sm font-medium">
                &quot;{pilot.callsign}&quot;
              </p>
            )}
          </div>

          {/* Skills Display */}
          <div className="flex-shrink-0 text-right">
            <div className="text-accent text-2xl font-bold tracking-tight tabular-nums">
              {rating}
            </div>
            <div className="text-text-theme-muted text-[10px] tracking-wider uppercase">
              G / P
            </div>
          </div>
        </div>

        {/* Stats Row */}
        <div className="flex items-center justify-between">
          <StatusBadge status={pilot.status} />

          {pilot.affiliation && (
            <span className="text-text-theme-secondary max-w-[120px] truncate text-xs">
              {pilot.affiliation}
            </span>
          )}
        </div>

        {/* Wounds indicator */}
        {pilot.wounds > 0 && pilot.status !== PilotStatus.KIA && (
          <div className="border-border-theme-subtle/50 mt-3 border-t pt-3">
            <div className="flex items-center gap-1.5">
              <svg
                className="h-3.5 w-3.5 text-red-400"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z"
                  clipRule="evenodd"
                />
              </svg>
              <span className="text-xs font-medium text-red-400">
                {pilot.wounds} wound{pilot.wounds !== 1 ? 's' : ''}
              </span>
            </div>
          </div>
        )}

        {/* Career stats preview */}
        {pilot.career && pilot.career.missionsCompleted > 0 && (
          <div className="border-border-theme-subtle/50 text-text-theme-secondary mt-3 flex items-center gap-4 border-t pt-3 text-xs">
            <span>{pilot.career.missionsCompleted} missions</span>
            <span>{pilot.career.totalKills} kills</span>
          </div>
        )}

        {/* Hover arrow indicator */}
        <div className="absolute right-4 bottom-4 opacity-0 transition-opacity group-hover:opacity-100">
          <svg
            className="text-accent h-5 w-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5l7 7-7 7"
            />
          </svg>
        </div>
      </div>
    </Link>
  );
}

// =============================================================================
// Main Page Component
// =============================================================================

export default function PilotRosterPage(): React.ReactElement {
  const router = useRouter();
  const {
    isLoading,
    error,
    loadPilots,
    showActiveOnly,
    setShowActiveOnly,
    searchQuery,
    setSearchQuery,
  } = usePilotStore();

  const filteredPilots = useFilteredPilots();
  const [isInitialized, setIsInitialized] = useState(false);

  // Load pilots on mount
  useEffect(() => {
    const initialize = async () => {
      await loadPilots();
      setIsInitialized(true);
    };
    initialize();
  }, [loadPilots]);

  // Handle search input
  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setSearchQuery(e.target.value);
    },
    [setSearchQuery],
  );

  // Toggle active only filter
  const handleToggleActive = useCallback(() => {
    setShowActiveOnly(!showActiveOnly);
  }, [showActiveOnly, setShowActiveOnly]);

  // Navigate to create page
  const handleCreatePilot = useCallback(() => {
    router.push('/gameplay/pilots/create');
  }, [router]);

  if (!isInitialized || isLoading) {
    return (
      <PageLayout
        title="Pilot Roster"
        subtitle="Manage your MechWarrior personnel"
        maxWidth="wide"
      >
        <Card className="mb-6">
          <div className="flex flex-col gap-4 sm:flex-row">
            <div className="flex-1">
              <SkeletonInput width="w-full" />
            </div>
            <SkeletonText width="w-28" />
          </div>
          <div className="mt-4">
            <SkeletonText width="w-24" />
          </div>
        </Card>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div
              key={i}
              className="border-border-theme-subtle bg-surface-raised/30 rounded-xl border-2 p-5"
            >
              <div className="mb-4 flex items-start justify-between gap-3">
                <div className="flex-1 space-y-2">
                  <SkeletonText width="w-32" />
                  <SkeletonText width="w-20" />
                </div>
                <SkeletonText width="w-12" />
              </div>
              <div className="flex items-center justify-between">
                <SkeletonText width="w-16" />
                <SkeletonText width="w-24" />
              </div>
            </div>
          ))}
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout
      title="Pilot Roster"
      subtitle="Manage your MechWarrior personnel"
      maxWidth="wide"
      headerContent={
        <Button
          variant="primary"
          onClick={handleCreatePilot}
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
          Create Pilot
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
              placeholder="Search by name, callsign, or affiliation..."
              value={searchQuery}
              onChange={handleSearchChange}
              aria-label="Search pilots"
            />
          </div>

          {/* Active Only Toggle */}
          <button
            onClick={handleToggleActive}
            className={`flex items-center gap-2 rounded-lg border-2 px-4 py-2.5 transition-all duration-200 ${
              showActiveOnly
                ? 'bg-accent/10 border-accent text-accent'
                : 'bg-surface-raised/30 border-border-theme-subtle text-text-theme-secondary hover:border-border-theme'
            } `}
          >
            <div
              className={`flex h-5 w-5 items-center justify-center rounded border-2 transition-all ${showActiveOnly ? 'bg-accent border-accent' : 'border-current'} `}
            >
              {showActiveOnly && (
                <svg
                  className="text-surface-deep h-3 w-3"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={3}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              )}
            </div>
            <span className="text-sm font-medium whitespace-nowrap">
              Active Only
            </span>
          </button>
        </div>

        {/* Results count */}
        <div className="text-text-theme-secondary mt-4 text-sm">
          Showing {filteredPilots.length} pilot
          {filteredPilots.length !== 1 ? 's' : ''}
          {(searchQuery || showActiveOnly) && (
            <span className="text-accent ml-1">(filtered)</span>
          )}
        </div>
      </Card>

      {/* Error Display */}
      {error && (
        <div className="mb-6 rounded-lg border border-red-600/30 bg-red-900/20 p-4">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      {/* Pilot Grid */}
      {filteredPilots.length === 0 ? (
        <EmptyState
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
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
            </div>
          }
          title={
            searchQuery || showActiveOnly
              ? 'No pilots match your filters'
              : 'No pilots yet'
          }
          message={
            searchQuery || showActiveOnly
              ? 'Try adjusting your search or filters'
              : 'Create your first pilot to get started'
          }
          action={
            !searchQuery &&
            !showActiveOnly && (
              <Button variant="primary" onClick={handleCreatePilot}>
                Create First Pilot
              </Button>
            )
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 pb-20 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredPilots.map((pilot) => (
            <PilotCard key={pilot.id} pilot={pilot} />
          ))}
        </div>
      )}
    </PageLayout>
  );
}
