/**
 * Pilot Roster Page
 * Browse, search, and manage all pilots in the roster.
 */
import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import {
  PageLayout,
  Card,
  Input,
  Button,
  Badge,
  EmptyState,
} from '@/components/ui';
import {
  SkeletonText,
  SkeletonInput,
  SkeletonFormSection,
} from '@/components/common/SkeletonLoader';
import { usePilotStore, useFilteredPilots } from '@/stores/usePilotStore';
import { IPilot, PilotStatus, getPilotRating } from '@/types/pilot';

// =============================================================================
// Status Badge Component
// =============================================================================

interface StatusBadgeProps {
  status: PilotStatus;
}

function StatusBadge({ status }: StatusBadgeProps): React.ReactElement {
  const variants: Record<PilotStatus, { variant: 'emerald' | 'amber' | 'orange' | 'red' | 'slate'; label: string }> = {
    [PilotStatus.Active]: { variant: 'emerald', label: 'Active' },
    [PilotStatus.Injured]: { variant: 'orange', label: 'Injured' },
    [PilotStatus.MIA]: { variant: 'amber', label: 'MIA' },
    [PilotStatus.KIA]: { variant: 'red', label: 'KIA' },
    [PilotStatus.Retired]: { variant: 'slate', label: 'Retired' },
  };

  const { variant, label } = variants[status] || { variant: 'slate', label: status };

  return <Badge variant={variant} size="sm">{label}</Badge>;
}

// =============================================================================
// Pilot Card Component
// =============================================================================

interface PilotCardProps {
  pilot: IPilot;
}

function PilotCard({ pilot }: PilotCardProps): React.ReactElement {
  const rating = getPilotRating(pilot.skills);
  const isInactive = pilot.status === PilotStatus.KIA || pilot.status === PilotStatus.Retired;

  return (
    <Link href={`/gameplay/pilots/${pilot.id}`}>
      <div
        className={`
          group relative p-5 rounded-xl border-2 transition-all duration-300 cursor-pointer
          bg-gradient-to-br from-surface-raised/60 to-surface-raised/30
          ${isInactive
            ? 'border-border-theme-subtle/50 opacity-60 hover:opacity-80'
            : 'border-border-theme-subtle hover:border-accent/50 hover:shadow-lg hover:shadow-accent/10'
          }
          hover:scale-[1.02] hover:-translate-y-0.5
        `}
      >
        {/* Accent Line */}
        <div className={`absolute top-0 left-4 right-4 h-0.5 rounded-full transition-all duration-300 ${
          isInactive ? 'bg-border-theme-subtle' : 'bg-accent/30 group-hover:bg-accent'
        }`} />

        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-bold text-text-theme-primary truncate group-hover:text-accent transition-colors">
              {pilot.name}
            </h3>
            {pilot.callsign && (
              <p className="text-accent/80 text-sm font-medium truncate">
                &quot;{pilot.callsign}&quot;
              </p>
            )}
          </div>

          {/* Skills Display */}
          <div className="flex-shrink-0 text-right">
            <div className="text-2xl font-bold text-accent tabular-nums tracking-tight">
              {rating}
            </div>
            <div className="text-[10px] text-text-theme-muted uppercase tracking-wider">
              G / P
            </div>
          </div>
        </div>

        {/* Stats Row */}
        <div className="flex items-center justify-between">
          <StatusBadge status={pilot.status} />

          {pilot.affiliation && (
            <span className="text-xs text-text-theme-secondary truncate max-w-[120px]">
              {pilot.affiliation}
            </span>
          )}
        </div>

        {/* Wounds indicator */}
        {pilot.wounds > 0 && pilot.status !== PilotStatus.KIA && (
          <div className="mt-3 pt-3 border-t border-border-theme-subtle/50">
            <div className="flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
              </svg>
              <span className="text-xs text-red-400 font-medium">
                {pilot.wounds} wound{pilot.wounds !== 1 ? 's' : ''}
              </span>
            </div>
          </div>
        )}

        {/* Career stats preview */}
        {pilot.career && pilot.career.missionsCompleted > 0 && (
          <div className="mt-3 pt-3 border-t border-border-theme-subtle/50 flex items-center gap-4 text-xs text-text-theme-secondary">
            <span>{pilot.career.missionsCompleted} missions</span>
            <span>{pilot.career.totalKills} kills</span>
          </div>
        )}

        {/* Hover arrow indicator */}
        <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
          <svg className="w-5 h-5 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
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
  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  }, [setSearchQuery]);

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
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <SkeletonInput width="w-full" />
            </div>
            <SkeletonText width="w-28" />
          </div>
          <div className="mt-4">
            <SkeletonText width="w-24" />
          </div>
        </Card>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div key={i} className="p-5 rounded-xl border-2 border-border-theme-subtle bg-surface-raised/30">
              <div className="flex items-start justify-between gap-3 mb-4">
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
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          }
        >
          Create Pilot
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
              placeholder="Search by name, callsign, or affiliation..."
              value={searchQuery}
              onChange={handleSearchChange}
              aria-label="Search pilots"
            />
          </div>

          {/* Active Only Toggle */}
          <button
            onClick={handleToggleActive}
            className={`
              flex items-center gap-2 px-4 py-2.5 rounded-lg border-2 transition-all duration-200
              ${showActiveOnly
                ? 'bg-accent/10 border-accent text-accent'
                : 'bg-surface-raised/30 border-border-theme-subtle text-text-theme-secondary hover:border-border-theme'
              }
            `}
          >
            <div className={`
              w-5 h-5 rounded border-2 flex items-center justify-center transition-all
              ${showActiveOnly ? 'bg-accent border-accent' : 'border-current'}
            `}>
              {showActiveOnly && (
                <svg className="w-3 h-3 text-surface-deep" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              )}
            </div>
            <span className="text-sm font-medium whitespace-nowrap">Active Only</span>
          </button>
        </div>

        {/* Results count */}
        <div className="mt-4 text-sm text-text-theme-secondary">
          Showing {filteredPilots.length} pilot{filteredPilots.length !== 1 ? 's' : ''}
          {(searchQuery || showActiveOnly) && (
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

      {/* Pilot Grid */}
      {filteredPilots.length === 0 ? (
        <EmptyState
          icon={
            <div className="w-16 h-16 mx-auto rounded-full bg-surface-raised/50 flex items-center justify-center">
              <svg className="w-8 h-8 text-text-theme-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
          }
          title={searchQuery || showActiveOnly ? 'No pilots match your filters' : 'No pilots yet'}
          message={searchQuery || showActiveOnly ? 'Try adjusting your search or filters' : 'Create your first pilot to get started'}
          action={
            !searchQuery && !showActiveOnly && (
              <Button variant="primary" onClick={handleCreatePilot}>
                Create First Pilot
              </Button>
            )
          }
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pb-20">
          {filteredPilots.map((pilot) => (
            <PilotCard key={pilot.id} pilot={pilot} />
          ))}
        </div>
      )}
    </PageLayout>
  );
}
