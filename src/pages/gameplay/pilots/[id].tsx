import { useRouter } from 'next/router';
/**
 * Pilot Detail Page
 * Displays comprehensive information about a single pilot with
 * progression, career stats, event history, and management options.
 */
import { useEffect, useState, useCallback, useMemo } from 'react';

import { EventTimeline, TimelineFilters } from '@/components/audit/timeline';
import { AwardGrid } from '@/components/award';
import {
  SkeletonText,
  SkeletonFormSection,
} from '@/components/common/SkeletonLoader';
import { PilotProgressionPanel } from '@/components/pilots';
import { useToast } from '@/components/shared/Toast';
import {
  PageLayout,
  PageError,
  Card,
  CardSection,
  Button,
  Badge,
  StatRow,
  StatList,
} from '@/components/ui';
import { usePilotTimeline } from '@/hooks/audit';
import { usePilotStore, usePilotById } from '@/stores/usePilotStore';
import { IBaseEvent, EventCategory } from '@/types/events';
import {
  IPilot,
  PilotStatus,
  PilotType,
  getPilotRating,
  getSkillLabel,
} from '@/types/pilot';

// =============================================================================
// Tab Types
// =============================================================================

type PilotTab = 'overview' | 'career';

// =============================================================================
// Sub-Components
// =============================================================================

interface StatusBadgeProps {
  status: PilotStatus;
  size?: 'sm' | 'md';
}

function StatusBadge({
  status,
  size = 'md',
}: StatusBadgeProps): React.ReactElement {
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
    <Badge variant={variant} size={size}>
      {label}
    </Badge>
  );
}

interface DeleteConfirmModalProps {
  pilotName: string;
  isOpen: boolean;
  isDeleting: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

function DeleteConfirmModal({
  pilotName,
  isOpen,
  isDeleting,
  onConfirm,
  onCancel,
}: DeleteConfirmModalProps): React.ReactElement | null {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={!isDeleting ? onCancel : undefined}
      />

      {/* Modal */}
      <div className="bg-surface-base border-border-theme relative w-full max-w-md rounded-xl border p-6 shadow-2xl">
        <div className="text-center">
          {/* Warning Icon */}
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-900/30">
            <svg
              className="h-8 w-8 text-red-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>

          <h3 className="text-text-theme-primary mb-2 text-xl font-bold">
            Delete Pilot?
          </h3>
          <p className="text-text-theme-secondary mb-6">
            Are you sure you want to permanently delete{' '}
            <span className="text-accent font-semibold">{pilotName}</span>? This
            action cannot be undone.
          </p>

          <div className="flex items-center justify-center gap-3">
            <Button variant="ghost" onClick={onCancel} disabled={isDeleting}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={onConfirm}
              isLoading={isDeleting}
              className="bg-red-600 hover:bg-red-500"
            >
              Delete Pilot
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

interface EditIdentityModalProps {
  pilot: IPilot;
  isOpen: boolean;
  onSave: (updates: {
    name: string;
    callsign?: string;
    affiliation?: string;
  }) => void;
  onCancel: () => void;
  isSaving: boolean;
}

function EditIdentityModal({
  pilot,
  isOpen,
  onSave,
  onCancel,
  isSaving,
}: EditIdentityModalProps): React.ReactElement | null {
  const [name, setName] = useState(pilot.name);
  const [callsign, setCallsign] = useState(pilot.callsign || '');
  const [affiliation, setAffiliation] = useState(pilot.affiliation || '');

  // Reset form when pilot changes
  useEffect(() => {
    setName(pilot.name);
    setCallsign(pilot.callsign || '');
    setAffiliation(pilot.affiliation || '');
  }, [pilot]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      onSave({
        name: name.trim(),
        callsign: callsign.trim() || undefined,
        affiliation: affiliation.trim() || undefined,
      });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={!isSaving ? onCancel : undefined}
      />

      {/* Modal */}
      <div className="bg-surface-base border-border-theme relative w-full max-w-md rounded-xl border p-6 shadow-2xl">
        <h3 className="text-text-theme-primary mb-4 text-xl font-bold">
          Edit Pilot Identity
        </h3>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-text-theme-secondary mb-1.5 block text-sm font-medium">
              Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="bg-surface-raised border-border-theme-subtle text-text-theme-primary placeholder-text-theme-muted focus:border-accent focus:ring-accent/30 w-full rounded-lg border px-4 py-2.5 focus:ring-1 focus:outline-none"
              placeholder="Pilot name"
              required
              autoFocus
            />
          </div>

          <div>
            <label className="text-text-theme-secondary mb-1.5 block text-sm font-medium">
              Callsign
            </label>
            <input
              type="text"
              value={callsign}
              onChange={(e) => setCallsign(e.target.value)}
              className="bg-surface-raised border-border-theme-subtle text-text-theme-primary placeholder-text-theme-muted focus:border-accent focus:ring-accent/30 w-full rounded-lg border px-4 py-2.5 focus:ring-1 focus:outline-none"
              placeholder="Optional callsign"
            />
          </div>

          <div>
            <label className="text-text-theme-secondary mb-1.5 block text-sm font-medium">
              Affiliation
            </label>
            <input
              type="text"
              value={affiliation}
              onChange={(e) => setAffiliation(e.target.value)}
              className="bg-surface-raised border-border-theme-subtle text-text-theme-primary placeholder-text-theme-muted focus:border-accent focus:ring-accent/30 w-full rounded-lg border px-4 py-2.5 focus:ring-1 focus:outline-none"
              placeholder="Faction or house"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="ghost"
              onClick={onCancel}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              isLoading={isSaving}
              disabled={!name.trim()}
            >
              Save Changes
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// =============================================================================
// Career Tab Component
// =============================================================================

interface PilotCareerTabProps {
  pilotId: string;
  pilotName: string;
}

function PilotCareerTab({
  pilotId,
  pilotName,
}: PilotCareerTabProps): React.ReactElement {
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<
    EventCategory | undefined
  >(undefined);
  const [rootEventsOnly, setRootEventsOnly] = useState(false);

  const {
    allEvents,
    isLoading,
    error,
    filters,
    pagination,
    setFilters,
    loadMore,
    refresh,
  } = usePilotTimeline(pilotId, {
    pageSize: 50,
    infiniteScroll: true,
  });

  const handleEventClick = useCallback((event: IBaseEvent) => {
    setSelectedEventId((prev) => (prev === event.id ? null : event.id));
  }, []);

  const handleCategoryChange = useCallback(
    (category: EventCategory | undefined) => {
      setCategoryFilter(category);
      setFilters({ ...filters, category });
    },
    [filters, setFilters],
  );

  const handleRootEventsToggle = useCallback(
    (rootOnly: boolean) => {
      setRootEventsOnly(rootOnly);
      setFilters({ ...filters, rootEventsOnly: rootOnly || undefined });
    },
    [filters, setFilters],
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-text-theme-primary text-lg font-semibold">
            Career History
          </h2>
          <p className="text-text-theme-secondary text-sm">
            Event timeline for {pilotName}
          </p>
        </div>
        <button
          onClick={refresh}
          disabled={isLoading}
          className="bg-surface-raised border-border-theme-subtle hover:border-border-theme rounded-lg border p-2 transition-colors disabled:opacity-50"
          aria-label="Refresh timeline"
        >
          <svg
            className={`text-text-theme-secondary h-5 w-5 ${isLoading ? 'animate-spin' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
        </button>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <TimelineFilters
          filters={{
            category: categoryFilter,
            rootEventsOnly,
          }}
          onChange={(f) => {
            handleCategoryChange(f.category);
            handleRootEventsToggle(f.rootEventsOnly || false);
          }}
        />
      </Card>

      {/* Error State */}
      {error && (
        <Card className="border-red-500/50 bg-red-500/10">
          <div className="flex items-center gap-3 p-4 text-red-400">
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
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span>{error.message}</span>
          </div>
        </Card>
      )}

      {/* Results Count */}
      <div className="text-text-theme-secondary text-sm">
        {isLoading ? (
          <span className="flex items-center gap-2">
            <svg
              className="h-4 w-4 animate-spin"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            Loading...
          </span>
        ) : (
          <span>
            <span className="text-text-theme-primary font-medium">
              {pagination.total}
            </span>{' '}
            events
          </span>
        )}
      </div>

      {/* Empty State */}
      {!isLoading && allEvents.length === 0 && (
        <Card className="p-8 text-center">
          <div className="bg-surface-raised/50 mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full">
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
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <h3 className="text-text-theme-primary mb-2 text-lg font-semibold">
            No Events Yet
          </h3>
          <p className="text-text-theme-secondary mx-auto max-w-md text-sm">
            This pilot has no recorded events. Events will appear here as they
            participate in missions and games.
          </p>
        </Card>
      )}

      {/* Timeline */}
      {allEvents.length > 0 && (
        <Card className="overflow-hidden p-0">
          <EventTimeline
            events={allEvents as IBaseEvent[]}
            onEventClick={handleEventClick}
            onLoadMore={loadMore}
            hasMore={pagination.hasMore}
            isLoading={isLoading}
            selectedEventId={selectedEventId || undefined}
            maxHeight="calc(100vh - 400px)"
          />
        </Card>
      )}

      {/* Selected Event Details */}
      {selectedEventId && (
        <Card>
          <h3 className="text-text-theme-primary mb-4 text-lg font-semibold">
            Event Details
          </h3>
          {(() => {
            const event = allEvents.find((e) => e.id === selectedEventId);
            if (!event) return null;
            return (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-text-theme-muted">ID:</span>{' '}
                    <code className="text-text-theme-secondary">
                      {event.id}
                    </code>
                  </div>
                  <div>
                    <span className="text-text-theme-muted">Sequence:</span>{' '}
                    <span className="text-text-theme-primary font-medium">
                      {event.sequence}
                    </span>
                  </div>
                  <div>
                    <span className="text-text-theme-muted">Category:</span>{' '}
                    <span className="text-text-theme-primary">
                      {event.category}
                    </span>
                  </div>
                  <div>
                    <span className="text-text-theme-muted">Type:</span>{' '}
                    <span className="text-text-theme-primary">
                      {event.type}
                    </span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-text-theme-muted">Timestamp:</span>{' '}
                    <span className="text-text-theme-secondary">
                      {event.timestamp}
                    </span>
                  </div>
                </div>
                {event.causedBy && (
                  <div className="border-border-theme-subtle border-t pt-3">
                    <span className="text-text-theme-muted">Caused by:</span>{' '}
                    <code className="text-cyan-400">
                      {event.causedBy.eventId}
                    </code>{' '}
                    <span className="text-text-theme-muted">
                      ({event.causedBy.relationship})
                    </span>
                  </div>
                )}
                <div className="border-border-theme-subtle border-t pt-3">
                  <span className="text-text-theme-muted mb-2 block">
                    Payload:
                  </span>
                  <pre className="bg-surface-base/50 overflow-x-auto rounded-lg p-3 text-xs">
                    {JSON.stringify(event.payload, null, 2)}
                  </pre>
                </div>
              </div>
            );
          })()}
        </Card>
      )}
    </div>
  );
}

// =============================================================================
// Main Page Component
// =============================================================================

export default function PilotDetailPage(): React.ReactElement {
  const router = useRouter();
  const { id, tab: queryTab } = router.query;
  const pilotId = typeof id === 'string' ? id : null;
  const { showToast } = useToast();

  const { loadPilots, updatePilot, deletePilot, isLoading, error } =
    usePilotStore();
  const pilot = usePilotById(pilotId);

  const [isInitialized, setIsInitialized] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Tab state - default to overview, can be set via query param
  const [activeTab, setActiveTab] = useState<PilotTab>('overview');

  // Sync tab from query param
  useEffect(() => {
    if (queryTab === 'career') {
      setActiveTab('career');
    } else {
      setActiveTab('overview');
    }
  }, [queryTab]);

  // Update URL when tab changes
  const handleTabChange = useCallback(
    (tab: PilotTab) => {
      setActiveTab(tab);
      // Update URL without full navigation
      const url =
        tab === 'overview'
          ? `/gameplay/pilots/${pilotId}`
          : `/gameplay/pilots/${pilotId}?tab=${tab}`;
      router.replace(url, undefined, { shallow: true });
    },
    [pilotId, router],
  );

  // Load pilots on mount
  useEffect(() => {
    const initialize = async () => {
      await loadPilots();
      setIsInitialized(true);
    };
    initialize();
  }, [loadPilots]);

  // Handle pilot deletion
  const handleDelete = useCallback(async () => {
    if (!pilotId) return;

    setIsDeleting(true);
    const success = await deletePilot(pilotId);
    setIsDeleting(false);

    if (success) {
      showToast({ message: 'Pilot deleted successfully', variant: 'success' });
      router.push('/gameplay/pilots');
    } else {
      showToast({ message: 'Failed to delete pilot', variant: 'error' });
    }
    setIsDeleteModalOpen(false);
  }, [pilotId, deletePilot, router, showToast]);

  // Handle identity edit
  const handleSaveIdentity = useCallback(
    async (updates: {
      name: string;
      callsign?: string;
      affiliation?: string;
    }) => {
      if (!pilotId) return;

      setIsSaving(true);
      const success = await updatePilot(pilotId, updates);
      setIsSaving(false);

      if (success) {
        showToast({ message: 'Pilot details updated', variant: 'success' });
        setIsEditModalOpen(false);
      } else {
        showToast({ message: 'Failed to update pilot', variant: 'error' });
      }
    },
    [pilotId, updatePilot, showToast],
  );

  // Career stats for display
  const careerStats = useMemo(() => {
    if (!pilot?.career) return null;
    const { missionsCompleted, victories, defeats, draws, totalKills } =
      pilot.career;
    const winRate =
      missionsCompleted > 0
        ? Math.round((victories / missionsCompleted) * 100)
        : 0;
    return {
      missionsCompleted,
      victories,
      defeats,
      draws,
      totalKills,
      winRate,
    };
  }, [pilot?.career]);

  if (!isInitialized || isLoading) {
    return (
      <PageLayout
        title="Loading..."
        backLink="/gameplay/pilots"
        backLabel="Back to Roster"
      >
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-1">
            <SkeletonFormSection title="Pilot Identity">
              <div className="flex items-start gap-4">
                <div className="bg-surface-raised/50 h-20 w-20 animate-pulse rounded-xl" />
                <div className="flex-1 space-y-2">
                  <SkeletonText width="w-32" />
                  <SkeletonText width="w-24" />
                  <div className="mt-3 flex gap-2">
                    <SkeletonText width="w-16" />
                    <SkeletonText width="w-20" />
                  </div>
                </div>
              </div>
            </SkeletonFormSection>

            <SkeletonFormSection title="Combat Skills">
              <div className="flex items-center justify-center gap-12 py-4">
                <div className="space-y-2 text-center">
                  <SkeletonText width="w-12" className="mx-auto" />
                  <SkeletonText width="w-16" className="mx-auto" />
                </div>
                <div className="space-y-2 text-center">
                  <SkeletonText width="w-12" className="mx-auto" />
                  <SkeletonText width="w-16" className="mx-auto" />
                </div>
              </div>
            </SkeletonFormSection>

            <SkeletonFormSection title="Career Statistics">
              <div className="space-y-3">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div key={i} className="flex justify-between">
                    <SkeletonText width="w-20" />
                    <SkeletonText width="w-12" />
                  </div>
                ))}
              </div>
            </SkeletonFormSection>
          </div>

          <div className="lg:col-span-2">
            <SkeletonFormSection title="Progression">
              <div className="space-y-4">
                <SkeletonText width="w-full" />
                <SkeletonText width="w-3/4" />
                <div className="mt-4 grid grid-cols-2 gap-4">
                  <SkeletonText width="w-full" />
                  <SkeletonText width="w-full" />
                </div>
              </div>
            </SkeletonFormSection>
          </div>
        </div>
      </PageLayout>
    );
  }

  if (!pilot) {
    return (
      <PageError
        title="Pilot Not Found"
        message={
          error || 'The requested pilot could not be found in the roster.'
        }
        backLink="/gameplay/pilots"
        backLabel="Back to Roster"
      />
    );
  }

  const isPersistent = pilot.type === PilotType.Persistent;
  const isActive =
    pilot.status === PilotStatus.Active || pilot.status === PilotStatus.Injured;

  const breadcrumbs = [
    { label: 'Home', href: '/' },
    { label: 'Gameplay', href: '/gameplay' },
    { label: 'Pilots', href: '/gameplay/pilots' },
    { label: pilot.name },
  ];

  return (
    <PageLayout
      title={pilot.name}
      subtitle={pilot.callsign ? `"${pilot.callsign}"` : undefined}
      breadcrumbs={breadcrumbs}
      backLink="/gameplay/pilots"
      backLabel="Back to Roster"
      headerContent={
        <div className="flex items-center gap-3">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setIsEditModalOpen(true)}
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
                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                />
              </svg>
            }
          >
            Edit
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsDeleteModalOpen(true)}
            className="text-red-400 hover:bg-red-900/20 hover:text-red-300"
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
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
            }
          >
            Delete
          </Button>
        </div>
      }
    >
      {/* Tab Navigation */}
      <div className="border-border-theme-subtle mb-6 flex items-center gap-1 border-b">
        <button
          onClick={() => handleTabChange('overview')}
          className={`relative px-4 py-2.5 text-sm font-medium transition-colors ${
            activeTab === 'overview'
              ? 'text-accent'
              : 'text-text-theme-secondary hover:text-text-theme-primary'
          }`}
        >
          Overview
          {activeTab === 'overview' && (
            <span className="bg-accent absolute right-0 bottom-0 left-0 h-0.5" />
          )}
        </button>
        <button
          onClick={() => handleTabChange('career')}
          className={`relative px-4 py-2.5 text-sm font-medium transition-colors ${
            activeTab === 'career'
              ? 'text-accent'
              : 'text-text-theme-secondary hover:text-text-theme-primary'
          }`}
        >
          Career History
          {activeTab === 'career' && (
            <span className="bg-accent absolute right-0 bottom-0 left-0 h-0.5" />
          )}
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' ? (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Left Column - Pilot Info */}
          <div className="space-y-6 lg:col-span-1">
            {/* Identity Card */}
            <Card variant="accent-left" accentColor="amber" className="p-5">
              <div className="flex items-start gap-4">
                {/* Avatar */}
                <div className="bg-surface-raised border-border-theme-subtle flex h-20 w-20 flex-shrink-0 items-center justify-center rounded-xl border">
                  <svg
                    className="text-text-theme-secondary h-10 w-10"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                    />
                  </svg>
                </div>

                {/* Info */}
                <div className="min-w-0 flex-1">
                  <h2 className="text-text-theme-primary truncate text-xl font-bold">
                    {pilot.name}
                  </h2>
                  {pilot.callsign && (
                    <p className="text-accent font-medium">
                      &quot;{pilot.callsign}&quot;
                    </p>
                  )}
                  {pilot.affiliation && (
                    <p className="text-text-theme-secondary mt-1 text-sm">
                      {pilot.affiliation}
                    </p>
                  )}

                  <div className="mt-3 flex items-center gap-2">
                    <StatusBadge status={pilot.status} />
                    <Badge
                      variant={isPersistent ? 'emerald' : 'amber'}
                      size="sm"
                    >
                      {isPersistent ? 'Persistent' : 'Statblock'}
                    </Badge>
                  </div>
                </div>
              </div>
            </Card>

            {/* Skills Card */}
            <Card variant="dark">
              <CardSection title="Combat Skills" />
              <div className="flex items-center justify-center gap-12 py-4">
                <div className="text-center">
                  <div className="text-accent text-4xl font-bold tabular-nums">
                    {pilot.skills.gunnery}
                  </div>
                  <div className="text-text-theme-secondary mt-1 text-xs">
                    Gunnery
                  </div>
                  <Badge
                    variant={
                      pilot.skills.gunnery <= 3
                        ? 'emerald'
                        : pilot.skills.gunnery <= 5
                          ? 'amber'
                          : 'red'
                    }
                    size="sm"
                    className="mt-2"
                  >
                    {getSkillLabel(pilot.skills.gunnery)}
                  </Badge>
                </div>
                <div className="text-border-theme text-5xl font-light">/</div>
                <div className="text-center">
                  <div className="text-accent text-4xl font-bold tabular-nums">
                    {pilot.skills.piloting}
                  </div>
                  <div className="text-text-theme-secondary mt-1 text-xs">
                    Piloting
                  </div>
                  <Badge
                    variant={
                      pilot.skills.piloting <= 3
                        ? 'emerald'
                        : pilot.skills.piloting <= 5
                          ? 'amber'
                          : 'red'
                    }
                    size="sm"
                    className="mt-2"
                  >
                    {getSkillLabel(pilot.skills.piloting)}
                  </Badge>
                </div>
              </div>
              <div className="text-text-theme-secondary border-border-theme-subtle border-t pt-3 text-center text-sm">
                Pilot Rating:{' '}
                <span className="text-accent font-bold">
                  {getPilotRating(pilot.skills)}
                </span>
              </div>
            </Card>

            {/* Wounds Card */}
            {pilot.wounds > 0 && (
              <Card variant="dark" className="border-red-600/30 bg-red-900/10">
                <CardSection title="Wounds" />
                <div className="flex items-center gap-3">
                  <div className="flex gap-1">
                    {Array.from({ length: 6 }, (_, i) => (
                      <div
                        key={i}
                        className={`flex h-6 w-6 items-center justify-center rounded-full border-2 ${
                          i < pilot.wounds
                            ? 'border-red-500 bg-red-600'
                            : 'border-border-theme-subtle bg-surface-raised/30'
                        }`}
                      >
                        {i < pilot.wounds && (
                          <svg
                            className="h-3 w-3 text-white"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path
                              fillRule="evenodd"
                              d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                              clipRule="evenodd"
                            />
                          </svg>
                        )}
                      </div>
                    ))}
                  </div>
                  <span className="font-medium text-red-400">
                    {pilot.wounds}/6 wounds
                  </span>
                </div>
                <p className="text-text-theme-secondary mt-3 text-xs">
                  Skill penalty: +{pilot.wounds} to all skill checks
                </p>
              </Card>
            )}

            {/* Career Stats Card */}
            {careerStats && (
              <Card variant="dark">
                <CardSection title="Career Statistics" />
                <StatList>
                  <StatRow
                    label="Missions"
                    value={careerStats.missionsCompleted}
                  />
                  <StatRow label="Victories" value={careerStats.victories} />
                  <StatRow label="Defeats" value={careerStats.defeats} />
                  <StatRow label="Draws" value={careerStats.draws} />
                  <StatRow label="Win Rate" value={`${careerStats.winRate}%`} />
                  <StatRow label="Total Kills" value={careerStats.totalKills} />
                </StatList>
              </Card>
            )}

            {/* Awards Section */}
            {isPersistent && (
              <AwardGrid pilotId={pilotId!} showUnearned={true} columns={3} />
            )}
          </div>

          {/* Right Column - Progression Panel */}
          <div className="lg:col-span-2">
            {isPersistent && isActive ? (
              <PilotProgressionPanel
                pilot={pilot}
                onUpdate={() => loadPilots()}
              />
            ) : (
              <Card variant="dark" className="p-8 text-center">
                <div className="bg-surface-raised/50 mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full">
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
                      d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
                    />
                  </svg>
                </div>
                <h3 className="text-text-theme-primary mb-2 text-lg font-semibold">
                  Progression Unavailable
                </h3>
                <p className="text-text-theme-secondary mx-auto max-w-md text-sm">
                  {!isPersistent
                    ? 'Statblock pilots do not track progression. They are intended for quick NPC creation.'
                    : `This pilot is ${pilot.status.toLowerCase()} and cannot advance skills or abilities.`}
                </p>
              </Card>
            )}
          </div>
        </div>
      ) : (
        /* Career History Tab */
        <PilotCareerTab pilotId={pilotId!} pilotName={pilot.name} />
      )}

      {/* Modals */}
      <DeleteConfirmModal
        pilotName={pilot.name}
        isOpen={isDeleteModalOpen}
        isDeleting={isDeleting}
        onConfirm={handleDelete}
        onCancel={() => setIsDeleteModalOpen(false)}
      />

      <EditIdentityModal
        pilot={pilot}
        isOpen={isEditModalOpen}
        onSave={handleSaveIdentity}
        onCancel={() => setIsEditModalOpen(false)}
        isSaving={isSaving}
      />
    </PageLayout>
  );
}
