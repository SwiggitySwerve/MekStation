import type { NextRouter } from 'next/router';
import type { ParsedUrlQuery } from 'querystring';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useStore } from 'zustand';

import type { CustomizerTabId } from '@/hooks/useCustomizerRouter';
import type { TabInfo, TabManagerState } from '@/stores/useTabManagerStore';

import { navigateToCampaignCustomizerReturn } from '@/lib/campaign/customizer/campaignCustomizerNavigation';
import {
  buildCampaignCustomizerHref,
  buildCampaignCustomizerReturnHref,
  parseCampaignCustomizerRouteState,
  type CampaignCustomizerRouteState,
} from '@/lib/campaign/customizer/campaignCustomizerRoute';
import {
  buildCampaignEditorUnitState,
  campaignEditorSessionKey,
} from '@/lib/campaign/customizer/campaignCustomizerSession';
import { resolveUnitConfiguration } from '@/lib/campaign/refit/unitConfiguration';
import { installCampaignPersistenceWiring } from '@/stores/campaign/campaignPersistenceWiring';
import { useCampaignPersistenceStore } from '@/stores/campaign/useCampaignPersistenceStore';
import { useCampaignRosterStore } from '@/stores/campaign/useCampaignRosterStore';
import { useCampaignStore } from '@/stores/campaign/useCampaignStore';
import {
  createUnitFromFullState,
  getUnitStore,
} from '@/stores/unitStoreRegistry';
import { generateUUID } from '@/utils/uuid';

import type { CampaignCustomizerSession } from './CampaignCustomizerSessionContext';

interface UseCampaignCustomizerRoutingArgs {
  readonly activeTabId: string | null;
  readonly addTab: TabManagerState['addTab'];
  readonly isHydrated: boolean;
  readonly nextRouter: NextRouter;
  readonly routerIsReady: boolean;
  readonly routerTabId: CustomizerTabId;
  readonly selectTab: TabManagerState['selectTab'];
  readonly setLastSubTab: TabManagerState['setLastSubTab'];
  readonly tabs: readonly TabInfo[];
}

interface CampaignCustomizerRoutingResult {
  readonly campaignRoute: CampaignCustomizerRouteState | null;
  readonly campaignSession: CampaignCustomizerSession | null;
  readonly isCampaignLoading: boolean;
  readonly isCampaignSyncPending: boolean;
  readonly returnToCampaign: () => void;
  readonly unavailableUnitId: string | null;
}

function browserQuery(): ParsedUrlQuery | null {
  if (typeof window === 'undefined') return null;
  const query: ParsedUrlQuery = {};
  const params = new URLSearchParams(window.location.search);
  params.forEach((value, key) => {
    const existing = query[key];
    if (existing === undefined) {
      query[key] = value;
      return;
    }
    query[key] = Array.isArray(existing)
      ? [...existing, value]
      : [existing, value];
  });
  return query;
}

export function useCampaignCustomizerRouting({
  activeTabId,
  addTab,
  isHydrated,
  nextRouter,
  routerIsReady,
  routerTabId,
  selectTab,
  setLastSubTab,
  tabs,
}: UseCampaignCustomizerRoutingArgs): CampaignCustomizerRoutingResult {
  const ensuredCampaignSessionRef = useRef<string | null>(null);
  const campaignStore = useCampaignStore();
  const campaign = useStore(campaignStore, (state) => state.campaign);
  const rehydratedCampaignId = useStore(
    campaignStore,
    (state) => state.rehydratedCampaignId,
  );
  const loadCampaign = useCampaignPersistenceStore(
    (state) => state.loadCampaign,
  );
  const baseVersion = useCampaignPersistenceStore((state) => state.baseVersion);
  const dirty = useCampaignPersistenceStore((state) => state.dirty);
  const rosterUnits = useCampaignRosterStore((state) => state.units);
  // The campaign id whose server load has settled, success or failure.
  const [loadSettledFor, setLoadSettledFor] = useState<string | null>(null);

  const campaignRoute = useMemo(() => {
    const parsedRoute = parseCampaignCustomizerRouteState(nextRouter.query);
    if (parsedRoute) return parsedRoute;
    const fallbackQuery = browserQuery();
    return fallbackQuery
      ? parseCampaignCustomizerRouteState(fallbackQuery)
      : null;
  }, [nextRouter.asPath, nextRouter.query]);
  // Same rule as the campaign page shell (`useCampaignRouteLoader`): a
  // storage-rehydrated copy this session has not validated against the
  // server (baseVersion 0) is refetched, or the refit save writes against
  // version 0 and is refused. The editor is built once from the campaign,
  // so nothing is built from that copy until its load settles; a failed
  // load falls back to the cached copy.
  const awaitingServerCopy = Boolean(
    campaignRoute &&
    campaign?.id === campaignRoute.campaignId &&
    !dirty &&
    baseVersion === 0 &&
    rehydratedCampaignId === campaignRoute.campaignId &&
    loadSettledFor !== campaignRoute.campaignId,
  );
  const campaignUnit = useMemo(
    () =>
      campaignRoute
        ? (rosterUnits.find((unit) => unit.unitId === campaignRoute.unitId) ??
          null)
        : null,
    [campaignRoute, rosterUnits],
  );
  const campaignSession = useMemo(() => {
    if (!campaignRoute || !campaign || !campaignUnit) return null;
    if (campaign.id !== campaignRoute.campaignId || awaitingServerCopy) {
      return null;
    }
    return {
      route: campaignRoute,
      unit: campaignUnit,
      campaignName: campaign.name,
      currentConfiguration: resolveUnitConfiguration(
        campaign,
        campaignRoute.unitId,
      ),
      returnHref: buildCampaignCustomizerReturnHref(campaignRoute),
    };
  }, [awaitingServerCopy, campaign, campaignRoute, campaignUnit]);

  useEffect(() => {
    if (!campaignRoute) return;
    installCampaignPersistenceWiring();
  }, [campaignRoute]);

  useEffect(() => {
    if (!campaignRoute) return;
    if (campaign?.id === campaignRoute.campaignId && !awaitingServerCopy) {
      return;
    }
    const { campaignId } = campaignRoute;
    void loadCampaign(campaignId).finally(() => setLoadSettledFor(campaignId));
  }, [awaitingServerCopy, campaign?.id, campaignRoute, loadCampaign]);

  useEffect(() => {
    if (
      !campaignRoute ||
      !campaign ||
      !campaignUnit ||
      !isHydrated ||
      !routerIsReady ||
      awaitingServerCopy
    ) {
      return;
    }
    if (campaign.id !== campaignRoute.campaignId) return;

    if (!campaignRoute.editorUnitId) {
      const editorUnitId = generateUUID();
      void nextRouter.replace(
        buildCampaignCustomizerHref({
          ...campaignRoute,
          editorUnitId,
          tabId: routerTabId,
        }),
        undefined,
        { shallow: true },
      );
      return;
    }

    const sessionKey = campaignEditorSessionKey(
      campaignRoute.campaignId,
      campaignRoute.unitId,
      campaignRoute.editorUnitId,
    );
    if (ensuredCampaignSessionRef.current !== sessionKey) {
      const currentConfiguration = resolveUnitConfiguration(
        campaign,
        campaignRoute.unitId,
      );
      if (!getUnitStore(campaignRoute.editorUnitId)) {
        createUnitFromFullState(
          buildCampaignEditorUnitState({
            editorUnitId: campaignRoute.editorUnitId,
            unit: campaignUnit,
            currentConfiguration,
            rulesLevel: campaignRoute.rulesLevel,
          }),
        );
      }

      if (!tabs.some((tab) => tab.id === campaignRoute.editorUnitId)) {
        addTab({
          id: campaignRoute.editorUnitId,
          name: campaignUnit.unitName,
          tonnage: currentConfiguration.tonnage,
        });
      }
      setLastSubTab(campaignRoute.editorUnitId, routerTabId);
      ensuredCampaignSessionRef.current = sessionKey;
    }

    if (activeTabId !== campaignRoute.editorUnitId) {
      selectTab(campaignRoute.editorUnitId);
    }
  }, [
    activeTabId,
    addTab,
    awaitingServerCopy,
    campaign,
    campaignRoute,
    campaignUnit,
    isHydrated,
    nextRouter,
    routerIsReady,
    routerTabId,
    selectTab,
    setLastSubTab,
    tabs,
  ]);

  const isCampaignSyncPending = Boolean(
    campaignRoute &&
    (!campaignRoute.editorUnitId ||
      !tabs.some((tab) => tab.id === campaignRoute.editorUnitId)),
  );
  const isCampaignLoading = Boolean(
    campaignRoute &&
    (!campaign ||
      campaign.id !== campaignRoute.campaignId ||
      awaitingServerCopy ||
      !campaignRoute.editorUnitId),
  );
  const unavailableUnitId =
    campaignRoute && !isCampaignLoading && !campaignUnit
      ? campaignRoute.unitId
      : null;
  const returnToCampaign = useCallback(() => {
    if (!campaignRoute) return;
    navigateToCampaignCustomizerReturn(
      nextRouter,
      buildCampaignCustomizerReturnHref(campaignRoute),
    );
  }, [campaignRoute, nextRouter]);

  return {
    campaignRoute,
    campaignSession,
    isCampaignLoading,
    isCampaignSyncPending,
    returnToCampaign,
    unavailableUnitId,
  };
}
