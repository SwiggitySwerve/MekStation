import Link from 'next/link';

import {
  SkeletonText,
  SkeletonFormSection,
} from '@/components/common/SkeletonLoader';
import { Button, PageLayout } from '@/components/ui';
import { PilotStatus } from '@/types/pilot';

interface ForceLoadingStateProps {
  forceLoading: boolean;
  isInitialized: boolean;
}

export function ForceLoadingState({
  forceLoading,
  isInitialized,
}: ForceLoadingStateProps): React.ReactElement | null {
  if (isInitialized && !forceLoading) {
    return null;
  }

  return (
    <PageLayout
      title="Loading..."
      backLink="/gameplay/forces"
      backLabel="Back to Roster"
      maxWidth="wide"
    >
      <SkeletonFormSection title="Force Assignments">
        <div className="space-y-4">
          {[1, 2, 3, 4].map((index) => (
            <div
              key={index}
              className="bg-surface-raised/50 flex items-center gap-4 rounded-lg p-4"
            >
              <div className="bg-border-theme/50 h-10 w-10 animate-pulse rounded-lg" />
              <div className="flex-1 space-y-2">
                <SkeletonText width="w-32" />
                <SkeletonText width="w-48" />
              </div>
              <SkeletonText width="w-20" />
            </div>
          ))}
        </div>
      </SkeletonFormSection>

      <div className="border-border-theme-subtle mt-8 border-t pt-6">
        <SkeletonText width="w-32" />
      </div>
    </PageLayout>
  );
}

interface ForceHeaderActionsProps {
  onEdit: () => void;
  onDelete: () => void;
}

export function ForceHeaderActions({
  onEdit,
  onDelete,
}: ForceHeaderActionsProps): React.ReactElement {
  return (
    <div className="flex items-center gap-3">
      <Button
        variant="secondary"
        size="sm"
        onClick={onEdit}
        data-testid="edit-force-btn"
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
        onClick={onDelete}
        className="text-red-400 hover:bg-red-900/20 hover:text-red-300"
        data-testid="delete-force-btn"
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
  );
}

interface ForceErrorBannerProps {
  forceError: string;
  onDismiss: () => void;
}

export function ForceErrorBanner({
  forceError,
  onDismiss,
}: ForceErrorBannerProps): React.ReactElement {
  return (
    <div className="mb-6 rounded-lg border border-red-600/30 bg-red-900/20 p-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-red-400">{forceError}</p>
        <button onClick={onDismiss} className="text-red-400 hover:text-red-300">
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
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}

interface ForcePilotsLinkBarProps {
  activePilotCount: number;
}

export function ForcePilotsLinkBar({
  activePilotCount,
}: ForcePilotsLinkBarProps): React.ReactElement {
  return (
    <div className="border-border-theme-subtle mt-8 border-t pt-6">
      <div className="flex items-center gap-6">
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
        <span className="text-text-theme-muted">&bull;</span>
        <span className="text-text-theme-secondary text-sm">
          {activePilotCount} active pilots available
        </span>
      </div>
    </div>
  );
}

export function getActivePilotCount(statuses: PilotStatus[]): number {
  return statuses.filter((status) => status === PilotStatus.Active).length;
}
