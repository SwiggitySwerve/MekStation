import { useRouter } from 'next/router';
import { useEffect, useState, useCallback } from 'react';

import {
  DeleteConfirmModal,
  EditIdentityModal,
  PilotCareerTab,
  PilotOverviewTab,
  PilotDetailSkeleton,
} from '@/components/pilots';
import { useToast } from '@/components/shared/Toast';
import { PageLayout, PageError, Button } from '@/components/ui';
import { usePilotStore, usePilotById } from '@/stores/usePilotStore';

type PilotTab = 'overview' | 'career';

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

  const [activeTab, setActiveTab] = useState<PilotTab>('overview');

  useEffect(() => {
    if (queryTab === 'career') {
      setActiveTab('career');
    } else {
      setActiveTab('overview');
    }
  }, [queryTab]);

  const handleTabChange = useCallback(
    (tab: PilotTab) => {
      setActiveTab(tab);
      const url =
        tab === 'overview'
          ? `/gameplay/pilots/${pilotId}`
          : `/gameplay/pilots/${pilotId}?tab=${tab}`;
      router.replace(url, undefined, { shallow: true });
    },
    [pilotId, router],
  );

  useEffect(() => {
    const initialize = async () => {
      await loadPilots();
      setIsInitialized(true);
    };
    initialize();
  }, [loadPilots]);

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

  if (!isInitialized || isLoading) {
    return <PilotDetailSkeleton />;
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

      {activeTab === 'overview' ? (
        <PilotOverviewTab
          pilot={pilot}
          pilotId={pilotId!}
          onUpdate={() => loadPilots()}
        />
      ) : (
        <PilotCareerTab pilotId={pilotId!} pilotName={pilot.name} />
      )}

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
