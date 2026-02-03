/**
 * Pilot Detail Page
 * Displays comprehensive information about a single pilot with
 * progression, career stats, event history, and management options.
 */
import { useEffect, useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/router';
import {
  PageLayout,
  PageLoading,
  PageError,
  Card,
  CardSection,
  Button,
  Badge,
  StatRow,
  StatList,
} from '@/components/ui';
import { PilotProgressionPanel } from '@/components/pilots';
import { AwardGrid } from '@/components/award';
import { usePilotStore, usePilotById } from '@/stores/usePilotStore';
import {
  IPilot,
  PilotStatus,
  PilotType,
  getPilotRating,
  getSkillLabel,
} from '@/types/pilot';
import { usePilotTimeline } from '@/hooks/audit';
import { EventTimeline, TimelineFilters } from '@/components/audit/timeline';
import { IBaseEvent, EventCategory } from '@/types/events';

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

function StatusBadge({ status, size = 'md' }: StatusBadgeProps): React.ReactElement {
  const variants: Record<PilotStatus, { variant: 'emerald' | 'amber' | 'orange' | 'red' | 'slate'; label: string }> = {
    [PilotStatus.Active]: { variant: 'emerald', label: 'Active' },
    [PilotStatus.Injured]: { variant: 'orange', label: 'Injured' },
    [PilotStatus.MIA]: { variant: 'amber', label: 'MIA' },
    [PilotStatus.KIA]: { variant: 'red', label: 'KIA' },
    [PilotStatus.Retired]: { variant: 'slate', label: 'Retired' },
  };

  const { variant, label } = variants[status] || { variant: 'slate', label: status };

  return <Badge variant={variant} size={size}>{label}</Badge>;
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
      <div className="relative bg-surface-base border border-border-theme rounded-xl p-6 max-w-md w-full shadow-2xl">
        <div className="text-center">
          {/* Warning Icon */}
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-900/30 flex items-center justify-center">
            <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>

          <h3 className="text-xl font-bold text-text-theme-primary mb-2">
            Delete Pilot?
          </h3>
          <p className="text-text-theme-secondary mb-6">
            Are you sure you want to permanently delete{' '}
            <span className="text-accent font-semibold">{pilotName}</span>?
            This action cannot be undone.
          </p>

          <div className="flex items-center justify-center gap-3">
            <Button
              variant="ghost"
              onClick={onCancel}
              disabled={isDeleting}
            >
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
  onSave: (updates: { name: string; callsign?: string; affiliation?: string }) => void;
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
      <div className="relative bg-surface-base border border-border-theme rounded-xl p-6 max-w-md w-full shadow-2xl">
        <h3 className="text-xl font-bold text-text-theme-primary mb-4">
          Edit Pilot Identity
        </h3>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-text-theme-secondary mb-1.5">
              Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2.5 bg-surface-raised border border-border-theme-subtle rounded-lg text-text-theme-primary placeholder-text-theme-muted focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30"
              placeholder="Pilot name"
              required
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-text-theme-secondary mb-1.5">
              Callsign
            </label>
            <input
              type="text"
              value={callsign}
              onChange={(e) => setCallsign(e.target.value)}
              className="w-full px-4 py-2.5 bg-surface-raised border border-border-theme-subtle rounded-lg text-text-theme-primary placeholder-text-theme-muted focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30"
              placeholder="Optional callsign"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-text-theme-secondary mb-1.5">
              Affiliation
            </label>
            <input
              type="text"
              value={affiliation}
              onChange={(e) => setAffiliation(e.target.value)}
              className="w-full px-4 py-2.5 bg-surface-raised border border-border-theme-subtle rounded-lg text-text-theme-primary placeholder-text-theme-muted focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30"
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

function PilotCareerTab({ pilotId, pilotName }: PilotCareerTabProps): React.ReactElement {
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<EventCategory | undefined>(undefined);
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

  const handleCategoryChange = useCallback((category: EventCategory | undefined) => {
    setCategoryFilter(category);
    setFilters({ ...filters, category });
  }, [filters, setFilters]);

  const handleRootEventsToggle = useCallback((rootOnly: boolean) => {
    setRootEventsOnly(rootOnly);
    setFilters({ ...filters, rootEventsOnly: rootOnly || undefined });
  }, [filters, setFilters]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-text-theme-primary">Career History</h2>
          <p className="text-sm text-text-theme-secondary">
            Event timeline for {pilotName}
          </p>
        </div>
        <button
          onClick={refresh}
          disabled={isLoading}
          className="p-2 rounded-lg bg-surface-raised border border-border-theme-subtle hover:border-border-theme transition-colors disabled:opacity-50"
          aria-label="Refresh timeline"
        >
          <svg
            className={`w-5 h-5 text-text-theme-secondary ${isLoading ? 'animate-spin' : ''}`}
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
          <div className="flex items-center gap-3 text-red-400 p-4">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
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
            <span className="font-medium text-text-theme-primary">{pagination.total}</span> events
          </span>
        )}
      </div>

      {/* Empty State */}
      {!isLoading && allEvents.length === 0 && (
        <Card className="p-8 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-surface-raised/50 flex items-center justify-center">
            <svg className="w-8 h-8 text-text-theme-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-text-theme-primary mb-2">
            No Events Yet
          </h3>
          <p className="text-text-theme-secondary text-sm max-w-md mx-auto">
            This pilot has no recorded events. Events will appear here as they participate in missions and games.
          </p>
        </Card>
      )}

      {/* Timeline */}
      {allEvents.length > 0 && (
        <Card className="p-0 overflow-hidden">
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
          <h3 className="text-lg font-semibold text-text-theme-primary mb-4">
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
                    <code className="text-text-theme-secondary">{event.id}</code>
                  </div>
                  <div>
                    <span className="text-text-theme-muted">Sequence:</span>{' '}
                    <span className="text-text-theme-primary font-medium">{event.sequence}</span>
                  </div>
                  <div>
                    <span className="text-text-theme-muted">Category:</span>{' '}
                    <span className="text-text-theme-primary">{event.category}</span>
                  </div>
                  <div>
                    <span className="text-text-theme-muted">Type:</span>{' '}
                    <span className="text-text-theme-primary">{event.type}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-text-theme-muted">Timestamp:</span>{' '}
                    <span className="text-text-theme-secondary">{event.timestamp}</span>
                  </div>
                </div>
                {event.causedBy && (
                  <div className="pt-3 border-t border-border-theme-subtle">
                    <span className="text-text-theme-muted">Caused by:</span>{' '}
                    <code className="text-cyan-400">{event.causedBy.eventId}</code>{' '}
                    <span className="text-text-theme-muted">({event.causedBy.relationship})</span>
                  </div>
                )}
                <div className="pt-3 border-t border-border-theme-subtle">
                  <span className="text-text-theme-muted block mb-2">Payload:</span>
                  <pre className="text-xs bg-surface-base/50 p-3 rounded-lg overflow-x-auto">
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

  const { loadPilots, updatePilot, deletePilot, isLoading, error } = usePilotStore();
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
  const handleTabChange = useCallback((tab: PilotTab) => {
    setActiveTab(tab);
    // Update URL without full navigation
    const url = tab === 'overview' 
      ? `/gameplay/pilots/${pilotId}` 
      : `/gameplay/pilots/${pilotId}?tab=${tab}`;
    router.replace(url, undefined, { shallow: true });
  }, [pilotId, router]);

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
      router.push('/gameplay/pilots');
    }
    setIsDeleteModalOpen(false);
  }, [pilotId, deletePilot, router]);

  // Handle identity edit
  const handleSaveIdentity = useCallback(async (updates: { name: string; callsign?: string; affiliation?: string }) => {
    if (!pilotId) return;

    setIsSaving(true);
    const success = await updatePilot(pilotId, updates);
    setIsSaving(false);

    if (success) {
      setIsEditModalOpen(false);
    }
  }, [pilotId, updatePilot]);

  // Career stats for display
  const careerStats = useMemo(() => {
    if (!pilot?.career) return null;
    const { missionsCompleted, victories, defeats, draws, totalKills } = pilot.career;
    const winRate = missionsCompleted > 0 ? Math.round((victories / missionsCompleted) * 100) : 0;
    return { missionsCompleted, victories, defeats, draws, totalKills, winRate };
  }, [pilot?.career]);

  // Loading states
  if (!isInitialized || isLoading) {
    return <PageLoading message="Loading pilot data..." />;
  }

  if (!pilot) {
    return (
      <PageError
        title="Pilot Not Found"
        message={error || 'The requested pilot could not be found in the roster.'}
        backLink="/gameplay/pilots"
        backLabel="Back to Roster"
      />
    );
  }

  const isPersistent = pilot.type === PilotType.Persistent;
  const isActive = pilot.status === PilotStatus.Active || pilot.status === PilotStatus.Injured;

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
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            }
          >
            Edit
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsDeleteModalOpen(true)}
            className="text-red-400 hover:text-red-300 hover:bg-red-900/20"
            leftIcon={
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            }
          >
            Delete
          </Button>
        </div>
      }
    >
      {/* Tab Navigation */}
      <div className="flex items-center gap-1 mb-6 border-b border-border-theme-subtle">
        <button
          onClick={() => handleTabChange('overview')}
          className={`px-4 py-2.5 text-sm font-medium transition-colors relative ${
            activeTab === 'overview'
              ? 'text-accent'
              : 'text-text-theme-secondary hover:text-text-theme-primary'
          }`}
        >
          Overview
          {activeTab === 'overview' && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent" />
          )}
        </button>
        <button
          onClick={() => handleTabChange('career')}
          className={`px-4 py-2.5 text-sm font-medium transition-colors relative ${
            activeTab === 'career'
              ? 'text-accent'
              : 'text-text-theme-secondary hover:text-text-theme-primary'
          }`}
        >
          Career History
          {activeTab === 'career' && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent" />
          )}
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Pilot Info */}
          <div className="lg:col-span-1 space-y-6">
            {/* Identity Card */}
            <Card variant="accent-left" accentColor="amber" className="p-5">
            <div className="flex items-start gap-4">
              {/* Avatar */}
              <div className="w-20 h-20 rounded-xl bg-surface-raised flex items-center justify-center flex-shrink-0 border border-border-theme-subtle">
                <svg className="w-10 h-10 text-text-theme-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <h2 className="text-xl font-bold text-text-theme-primary truncate">
                  {pilot.name}
                </h2>
                {pilot.callsign && (
                  <p className="text-accent font-medium">&quot;{pilot.callsign}&quot;</p>
                )}
                {pilot.affiliation && (
                  <p className="text-sm text-text-theme-secondary mt-1">
                    {pilot.affiliation}
                  </p>
                )}

                <div className="flex items-center gap-2 mt-3">
                  <StatusBadge status={pilot.status} />
                  <Badge variant={isPersistent ? 'emerald' : 'amber'} size="sm">
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
                <div className="text-4xl font-bold text-accent tabular-nums">{pilot.skills.gunnery}</div>
                <div className="text-xs text-text-theme-secondary mt-1">Gunnery</div>
                <Badge variant={pilot.skills.gunnery <= 3 ? 'emerald' : pilot.skills.gunnery <= 5 ? 'amber' : 'red'} size="sm" className="mt-2">
                  {getSkillLabel(pilot.skills.gunnery)}
                </Badge>
              </div>
              <div className="text-5xl text-border-theme font-light">/</div>
              <div className="text-center">
                <div className="text-4xl font-bold text-accent tabular-nums">{pilot.skills.piloting}</div>
                <div className="text-xs text-text-theme-secondary mt-1">Piloting</div>
                <Badge variant={pilot.skills.piloting <= 3 ? 'emerald' : pilot.skills.piloting <= 5 ? 'amber' : 'red'} size="sm" className="mt-2">
                  {getSkillLabel(pilot.skills.piloting)}
                </Badge>
              </div>
            </div>
            <div className="text-center text-sm text-text-theme-secondary pt-3 border-t border-border-theme-subtle">
              Pilot Rating: <span className="text-accent font-bold">{getPilotRating(pilot.skills)}</span>
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
                      className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                        i < pilot.wounds
                          ? 'bg-red-600 border-red-500'
                          : 'border-border-theme-subtle bg-surface-raised/30'
                      }`}
                    >
                      {i < pilot.wounds && (
                        <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                      )}
                    </div>
                  ))}
                </div>
                <span className="text-red-400 font-medium">
                  {pilot.wounds}/6 wounds
                </span>
              </div>
              <p className="text-xs text-text-theme-secondary mt-3">
                Skill penalty: +{pilot.wounds} to all skill checks
              </p>
            </Card>
          )}

          {/* Career Stats Card */}
          {careerStats && (
            <Card variant="dark">
              <CardSection title="Career Statistics" />
              <StatList>
                <StatRow label="Missions" value={careerStats.missionsCompleted} />
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
            <AwardGrid
              pilotId={pilotId!}
              showUnearned={true}
              columns={3}
            />
          )}
        </div>

        {/* Right Column - Progression Panel */}
        <div className="lg:col-span-2">
          {isPersistent && isActive ? (
            <PilotProgressionPanel pilot={pilot} onUpdate={() => loadPilots()} />
          ) : (
            <Card variant="dark" className="p-8 text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-surface-raised/50 flex items-center justify-center">
                <svg className="w-8 h-8 text-text-theme-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-text-theme-primary mb-2">
                Progression Unavailable
              </h3>
              <p className="text-text-theme-secondary text-sm max-w-md mx-auto">
                {!isPersistent
                  ? 'Statblock pilots do not track progression. They are intended for quick NPC creation.'
                  : `This pilot is ${pilot.status.toLowerCase()} and cannot advance skills or abilities.`
                }
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
