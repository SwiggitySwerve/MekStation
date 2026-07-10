import { useRouter, type NextRouter } from 'next/router';
import React, { useEffect, useState } from 'react';
import { useStore } from 'zustand';

import type { ICampaign } from '@/types/campaign/Campaign';

import { BayError, BayLoading } from '@/components/campaign/bays/BayStates';
import { CampaignNavigation } from '@/components/campaign/CampaignNavigation';
import {
  CommandError,
  CommandLoading,
} from '@/components/campaign/command/CommandStates';
import {
  CampaignCoopRouteSurfaceConnected,
  type CampaignCoopRouteId,
} from '@/components/campaign/coop';
import { EmptyState, PageLayout } from '@/components/ui';
import { installCampaignPersistenceWiring } from '@/stores/campaign/campaignPersistenceWiring';
import { useCampaignPersistenceStore } from '@/stores/campaign/useCampaignPersistenceStore';
import { useCampaignStore } from '@/stores/campaign/useCampaignStore';

type CampaignPageId = string | string[] | undefined;
type CampaignQuery = NextRouter['query'];
type CampaignPageKey = React.ComponentProps<
  typeof CampaignNavigation
>['currentPage'];

interface CampaignPageShell {
  readonly id: CampaignPageId;
  readonly query: CampaignQuery;
  readonly campaign: ICampaign | null;
  readonly store: ReturnType<typeof useCampaignStore>;
  readonly isClient: boolean;
  readonly routeCampaignId: string | null;
  readonly isLoadingCampaign: boolean;
  readonly breadcrumbs: Array<{ label: string; href?: string }>;
}

interface LoadingStateProps {
  readonly title: string;
  readonly subtitle: string;
  readonly variant?: 'bay' | 'command';
}

interface MissingCampaignProps {
  readonly title: string;
  readonly breadcrumbs: Array<{ label: string; href?: string }>;
}

interface CampaignPageFrameProps {
  readonly campaign: ICampaign;
  readonly title: string;
  readonly subtitle: string;
  readonly currentPage: CampaignPageKey;
  readonly breadcrumbs: Array<{ label: string; href?: string }>;
  readonly children: React.ReactNode;
  readonly coopRouteId?: CampaignCoopRouteId;
}

interface CampaignLoadStatus {
  readonly saveState: ReturnType<
    typeof useCampaignPersistenceStore.getState
  >['saveState'];
  readonly errorMessage: ReturnType<
    typeof useCampaignPersistenceStore.getState
  >['errorMessage'];
  readonly loadCampaign: ReturnType<
    typeof useCampaignPersistenceStore.getState
  >['loadCampaign'];
}

interface CampaignLoadErrorProps {
  readonly campaignId: string;
  readonly loadStatus: CampaignLoadStatus;
  readonly message?: string;
}

interface CampaignPageGateProps extends LoadingStateProps {
  readonly campaign: ICampaign | null;
  readonly breadcrumbs: Array<{ label: string; href?: string }>;
  readonly isClient: boolean;
  readonly isLoadingCampaign?: boolean;
}

interface CampaignPageFrameConfig {
  readonly title: string;
  readonly subtitle: string;
  readonly currentPage: CampaignPageKey;
  readonly coopRouteId?: CampaignCoopRouteId;
}

interface CampaignPageFrameFromShellProps {
  readonly children: React.ReactNode;
  readonly frame: CampaignPageFrameConfig;
  readonly shell: CampaignPageShell;
}

interface CampaignCommandFeedbackProps extends CampaignLoadErrorProps {
  readonly actionError?: string | null;
  readonly onClearActionError?: () => void;
}

interface CampaignRouteLoaderInput {
  readonly id: CampaignPageId;
  readonly campaign: ICampaign | null;
  readonly isClient: boolean;
}

interface CampaignRouteLoaderState {
  readonly campaign: ICampaign | null;
  readonly routeCampaignId: string | null;
  readonly isLoadingCampaign: boolean;
}

export function campaignRouteIdFrom(id: CampaignPageId): string | null {
  if (Array.isArray(id)) return id[0] ?? null;
  return typeof id === 'string' && id.trim().length > 0 ? id : null;
}

export function useCampaignRouteLoader({
  campaign,
  id,
  isClient,
}: CampaignRouteLoaderInput): CampaignRouteLoaderState {
  const routeCampaignId = campaignRouteIdFrom(id);
  const loadCampaign = useCampaignPersistenceStore(
    (state) => state.loadCampaign,
  );
  const saveState = useCampaignPersistenceStore((state) => state.saveState);
  const [requestedCampaignId, setRequestedCampaignId] = useState<string | null>(
    null,
  );

  useEffect(() => {
    if (!isClient) return;
    installCampaignPersistenceWiring();
  }, [isClient]);

  useEffect(() => {
    if (!isClient || !routeCampaignId) return;
    const routeMatches = campaign?.id === routeCampaignId;
    const guestNeedsServerRefresh =
      routeMatches && campaign?.coopSession?.mode === 'guest';
    if (routeMatches && !guestNeedsServerRefresh) return;
    if (requestedCampaignId === routeCampaignId && saveState !== 'error') {
      return;
    }

    setRequestedCampaignId(routeCampaignId);
    void loadCampaign(routeCampaignId);
  }, [
    campaign?.id,
    isClient,
    loadCampaign,
    requestedCampaignId,
    routeCampaignId,
    saveState,
  ]);

  const routeMatches = !routeCampaignId || campaign?.id === routeCampaignId;
  const needsRouteLoad = Boolean(isClient && routeCampaignId && !routeMatches);

  return {
    campaign: routeMatches ? campaign : null,
    routeCampaignId,
    isLoadingCampaign:
      needsRouteLoad &&
      (requestedCampaignId !== routeCampaignId || saveState === 'saving'),
  };
}

export function useCampaignPageShell(pageLabel: string): CampaignPageShell {
  const router = useRouter();
  const { id } = router.query;
  const store = useCampaignStore();
  const campaign = useStore(store, (state) => state.campaign);
  const [isClient, setIsClient] = useState(false);
  const routeLoader = useCampaignRouteLoader({ campaign, id, isClient });

  useEffect(() => {
    setIsClient(true);
  }, []);

  return {
    id,
    query: router.query,
    campaign: routeLoader.campaign,
    store,
    isClient,
    routeCampaignId: routeLoader.routeCampaignId,
    isLoadingCampaign: routeLoader.isLoadingCampaign,
    breadcrumbs: [
      { label: 'Home', href: '/' },
      { label: 'Gameplay', href: '/gameplay' },
      { label: 'Campaigns', href: '/gameplay/campaigns' },
      {
        label: routeLoader.campaign?.name || 'Campaign',
        href: routeLoader.routeCampaignId
          ? `/gameplay/campaigns/${routeLoader.routeCampaignId}`
          : '/gameplay/campaigns',
      },
      { label: pageLabel },
    ],
  };
}

export function useCampaignLoadStatus(): CampaignLoadStatus {
  const saveState = useCampaignPersistenceStore((state) => state.saveState);
  const errorMessage = useCampaignPersistenceStore(
    (state) => state.errorMessage,
  );
  const loadCampaign = useCampaignPersistenceStore(
    (state) => state.loadCampaign,
  );

  return { saveState, errorMessage, loadCampaign };
}

export function CampaignLoadingState({
  title,
  subtitle,
  variant = 'command',
}: LoadingStateProps): React.ReactElement {
  const Loading = variant === 'bay' ? BayLoading : CommandLoading;
  return (
    <PageLayout title={title} subtitle={subtitle} maxWidth="wide">
      <Loading />
    </PageLayout>
  );
}

export function renderCampaignPageGate({
  campaign,
  breadcrumbs,
  isLoadingCampaign = false,
  isClient,
  subtitle,
  title,
  variant,
}: CampaignPageGateProps): React.ReactElement | null {
  if (!isClient || isLoadingCampaign) {
    return (
      <CampaignLoadingState
        title={title}
        subtitle={subtitle}
        variant={variant}
      />
    );
  }

  if (!campaign) {
    return <MissingCampaignState title={title} breadcrumbs={breadcrumbs} />;
  }

  return null;
}

export function renderCampaignPageGateForShell(
  shell: CampaignPageShell,
  loading: LoadingStateProps,
): React.ReactElement {
  return (
    renderCampaignPageGate({
      campaign: shell.campaign,
      breadcrumbs: shell.breadcrumbs,
      isLoadingCampaign: shell.isLoadingCampaign,
      isClient: shell.isClient,
      ...loading,
    }) ?? <></>
  );
}

export function renderPendingCampaignPage(
  shell: CampaignPageShell,
  loading: LoadingStateProps,
): React.ReactElement | null {
  if (shell.isClient && shell.campaign) return null;
  return renderCampaignPageGateForShell(shell, loading);
}

export function getLoadedCampaign(shell: CampaignPageShell): ICampaign {
  if (!shell.campaign) {
    throw new Error('Campaign page rendered before campaign was loaded.');
  }

  return shell.campaign;
}

export function MissingCampaignState({
  title,
  breadcrumbs,
}: MissingCampaignProps): React.ReactElement {
  return (
    <PageLayout
      title={title}
      subtitle="Campaign not found"
      maxWidth="wide"
      breadcrumbs={breadcrumbs}
    >
      <EmptyState
        title="Campaign not found"
        message="Return to campaigns list to select a campaign."
      />
    </PageLayout>
  );
}

export function CampaignPageFrame({
  campaign,
  title,
  subtitle,
  currentPage,
  breadcrumbs,
  children,
  coopRouteId,
}: CampaignPageFrameProps): React.ReactElement {
  return (
    <PageLayout
      title={title}
      subtitle={subtitle}
      maxWidth="wide"
      breadcrumbs={breadcrumbs}
    >
      <CampaignNavigation
        campaignId={campaign.id}
        currentPage={currentPage}
        coopSession={campaign.coopSession}
      />
      {coopRouteId ? (
        <CampaignCoopRouteSurfaceConnected
          campaign={campaign}
          routeId={coopRouteId}
        />
      ) : null}
      {children}
    </PageLayout>
  );
}

export function CampaignPageFrameFromShell({
  children,
  frame,
  shell,
}: CampaignPageFrameFromShellProps): React.ReactElement {
  if (!shell.campaign) return <></>;

  return (
    <CampaignPageFrame
      campaign={shell.campaign}
      title={frame.title}
      subtitle={frame.subtitle}
      currentPage={frame.currentPage}
      breadcrumbs={shell.breadcrumbs}
      coopRouteId={frame.coopRouteId}
    >
      {children}
    </CampaignPageFrame>
  );
}

export function CampaignBayLoadError({
  campaignId,
  loadStatus,
  message = 'The campaign inventory failed to load.',
}: CampaignLoadErrorProps): React.ReactElement {
  return (
    <BayError
      message={loadStatus.errorMessage ?? message}
      onRetry={() => {
        void loadStatus.loadCampaign(campaignId);
      }}
    />
  );
}

export function CampaignCommandLoadError({
  campaignId,
  loadStatus,
  message = 'The campaign command data failed to load.',
}: CampaignLoadErrorProps): React.ReactElement {
  return (
    <CommandError
      message={loadStatus.errorMessage ?? message}
      onRetry={() => {
        void loadStatus.loadCampaign(campaignId);
      }}
    />
  );
}

export function renderCampaignBaySaveError(
  campaignId: string,
  loadStatus: CampaignLoadStatus,
  message?: string,
): React.ReactElement | null {
  if (loadStatus.saveState !== 'error') return null;
  return (
    <CampaignBayLoadError
      campaignId={campaignId}
      loadStatus={loadStatus}
      message={message}
    />
  );
}

export function renderCampaignCommandFeedback({
  actionError,
  campaignId,
  loadStatus,
  message,
  onClearActionError,
}: CampaignCommandFeedbackProps): React.ReactElement | null {
  if (actionError) {
    return (
      <CommandError
        message={actionError}
        onRetry={onClearActionError ?? (() => undefined)}
      />
    );
  }

  if (loadStatus.saveState !== 'error') return null;
  return (
    <CampaignCommandLoadError
      campaignId={campaignId}
      loadStatus={loadStatus}
      message={message}
    />
  );
}
