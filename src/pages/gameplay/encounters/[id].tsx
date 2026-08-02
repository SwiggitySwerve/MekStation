/**
 * Encounter Detail Page
 * View and edit a single encounter configuration.
 *
 * @spec openspec/changes/add-encounter-system/specs/encounter-system/spec.md
 */

import { useRouter } from 'next/router';
import { useCallback, useEffect, useMemo, useState } from 'react';

import type { IBatchResult } from '@/simulation/batchOutcome';
import type { IGeneratedScenario } from '@/types/scenario';

import {
  EncounterDetailLoadingState,
  EncounterDetailNotFoundState,
} from '@/components/gameplay/pages/EncounterDetailPage.sections';
import { useToast } from '@/components/shared/Toast';
import { PageLayout } from '@/components/ui';
import {
  buildEncounterBreadcrumbs,
  EncounterDetailBody,
  EncounterDetailHeaderActions,
  findForceById,
  getEncounterTemplate,
  handleQuickResolveComplete,
  useQuickResolveEncounterPrep,
} from '@/pages-modules/gameplay/encounters/encounterDetailPage.helpers';
import {
  buildEncounterForceSelectionHref,
  encounterRouteIdentityFromRouter,
} from '@/pages-modules/gameplay/encounters/encounterRouteIdentity';
import { useEncounterSelector } from '@/stores/useEncounterStore';
import { useForceSelector } from '@/stores/useForceStore';
import { usePilotSelector } from '@/stores/usePilotStore';
import { EncounterStatus } from '@/types/encounter';
import { logger } from '@/utils/logger';

type RouteQueryValue = string | string[] | undefined;

function routeQueryValue(value: RouteQueryValue): string | null {
  const candidate = Array.isArray(value) ? value[0] : value;
  if (typeof candidate !== 'string') {
    return null;
  }
  const trimmed = candidate.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function buildEncounterPreBattleHref(
  encounterId: string,
  query: {
    readonly campaignId?: RouteQueryValue;
    readonly missionId?: RouteQueryValue;
  },
): string {
  const params = new URLSearchParams();
  const campaignId = routeQueryValue(query.campaignId);
  const missionId = routeQueryValue(query.missionId);

  if (campaignId) {
    params.set('campaignId', campaignId);
  }
  if (missionId) {
    params.set('missionId', missionId);
  }

  const suffix = params.toString();
  const path = `/gameplay/encounters/${encodeURIComponent(
    encounterId,
  )}/pre-battle`;
  return suffix ? `${path}?${suffix}` : path;
}

export default function EncounterDetailPage(): React.ReactElement {
  const router = useRouter();
  const routeIdentity = encounterRouteIdentityFromRouter(router);
  const encounterId = routeIdentity.encounterId ?? '';
  const { campaignId, missionId } = routeIdentity;
  const { showToast } = useToast();

  const getEncounter = useEncounterSelector((state) => state.getEncounter);
  const getEncounterRawForceIds = useEncounterSelector(
    (state) => state.getEncounterRawForceIds,
  );
  const loadEncounters = useEncounterSelector((state) => state.loadEncounters);
  const deleteEncounter = useEncounterSelector(
    (state) => state.deleteEncounter,
  );
  const validateEncounter = useEncounterSelector(
    (state) => state.validateEncounter,
  );
  const validations = useEncounterSelector((state) => state.validations);
  const isLoading = useEncounterSelector((state) => state.isLoading);
  const error = useEncounterSelector((state) => state.error);
  const clearError = useEncounterSelector((state) => state.clearError);

  const forces = useForceSelector((state) => state.forces);
  const loadForces = useForceSelector((state) => state.loadForces);
  const pilots = usePilotSelector((state) => state.pilots);
  const loadPilots = usePilotSelector((state) => state.loadPilots);

  const [isInitialized, setIsInitialized] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [quickResolveResult, setQuickResolveResult] =
    useState<IBatchResult | null>(null);

  const encounter = encounterId ? getEncounter(encounterId) : null;
  const validation = encounterId
    ? (validations.get(encounterId) ?? null)
    : null;
  const template = getEncounterTemplate(encounter?.template);

  useEffect(() => {
    const initialize = async () => {
      await Promise.all([loadEncounters(), loadForces(), loadPilots()]);
      setIsInitialized(true);
    };

    void initialize();
  }, [loadEncounters, loadForces, loadPilots]);

  useEffect(() => {
    if (isInitialized && encounterId) {
      void validateEncounter(encounterId);
    }
  }, [encounterId, isInitialized, validateEncounter]);

  const handleLaunch = useCallback(() => {
    if (!encounterId) {
      return;
    }

    void router.push(
      buildEncounterPreBattleHref(encounterId, {
        campaignId: campaignId ?? undefined,
        missionId: missionId ?? undefined,
      }),
    );
  }, [campaignId, encounterId, missionId, router]);

  const handleDelete = useCallback(async () => {
    if (!encounterId) {
      return;
    }

    clearError();
    const success = await deleteEncounter(encounterId);

    if (success) {
      showToast({
        message: 'Encounter deleted successfully',
        variant: 'success',
      });
      void router.push('/gameplay/encounters');
      return;
    }

    showToast({ message: 'Failed to delete encounter', variant: 'error' });
  }, [clearError, deleteEncounter, encounterId, router, showToast]);

  const handleGenerateScenario = useCallback(
    async (scenario: IGeneratedScenario) => {
      if (!encounterId) {
        return;
      }

      clearError();
      logger.debug('Generated scenario:', scenario);
      setShowGenerateModal(false);
      showToast({
        message: 'Scenario generated! Configure forces to begin.',
        variant: 'info',
      });

      void validateEncounter(encounterId);
    },
    [clearError, encounterId, showToast, validateEncounter],
  );

  const playerForce = useMemo(() => {
    return findForceById(forces, encounter?.playerForce?.forceId);
  }, [encounter, forces]);
  const opponentForce = useMemo(() => {
    return findForceById(forces, encounter?.opponentForce?.forceId);
  }, [encounter, forces]);
  const quickResolve = useQuickResolveEncounterPrep({
    playerForce,
    opponentForce,
    pilots,
    showToast,
  });

  if (!isInitialized || isLoading) {
    return <EncounterDetailLoadingState />;
  }

  if (!encounter) {
    return <EncounterDetailNotFoundState />;
  }

  const canLaunch = validation?.valid === true;
  const isBattleLocked =
    encounter.status === EncounterStatus.Launched ||
    encounter.status === EncounterStatus.Completed;
  const rawForceIds = getEncounterRawForceIds(encounterId);

  return (
    <PageLayout
      title={encounter.name}
      subtitle={encounter.description}
      breadcrumbs={buildEncounterBreadcrumbs(encounter.name)}
      backLink="/gameplay/encounters"
      backLabel="Back to Encounters"
      data-testid="encounter-detail-page"
      headerContent={
        <EncounterDetailHeaderActions
          encounterStatus={encounter.status}
          gameSessionId={encounter.gameSessionId}
          canLaunch={canLaunch}
          isPreparingBattle={quickResolve.isPreparingBattle}
          isBattleLocked={isBattleLocked}
          onOpenQuickResolve={quickResolve.openQuickResolveModal}
          onLaunch={handleLaunch}
        />
      }
    >
      <EncounterDetailBody
        encounter={encounter}
        encounterId={encounterId}
        playerSelectionHref={buildEncounterForceSelectionHref(
          encounterId,
          'player',
          routeIdentity,
        )}
        opponentSelectionHref={buildEncounterForceSelectionHref(
          encounterId,
          'opponent',
          routeIdentity,
        )}
        validation={validation}
        template={template}
        error={error}
        canLaunch={canLaunch}
        isBattleLocked={isBattleLocked}
        rawForceIds={rawForceIds}
        quickResolve={quickResolve}
        quickResolveResult={quickResolveResult}
        showDeleteConfirm={showDeleteConfirm}
        showGenerateModal={showGenerateModal}
        onCancelDelete={() => setShowDeleteConfirm(false)}
        onConfirmDelete={handleDelete}
        onOpenGenerateModal={() => setShowGenerateModal(true)}
        onCloseGenerateModal={() => setShowGenerateModal(false)}
        onGenerateScenario={handleGenerateScenario}
        onDeleteRequest={() => setShowDeleteConfirm(true)}
        onQuickResolveComplete={(result) => {
          handleQuickResolveComplete(
            result,
            encounterId,
            setQuickResolveResult,
            showToast,
          );
        }}
      />
    </PageLayout>
  );
}
