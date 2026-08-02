/**
 * Standalone encounter force selection.
 *
 * @spec openspec/specs/encounter-system/spec.md
 */

import Link from 'next/link';
import { useRouter } from 'next/router';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { InlineErrorMessage } from '@/components/common/InlineErrorMessage';
import {
  Button,
  Card,
  EmptyState,
  PageError,
  PageLayout,
  PageLoading,
} from '@/components/ui';
import {
  buildEncounterDetailHref,
  encounterForceSelectionSideFromRouter,
  encounterRouteIdentityFromRouter,
} from '@/pages-modules/gameplay/encounters/encounterRouteIdentity';
import { useEncounterSelector } from '@/stores/useEncounterStore';
import { useForceSelector } from '@/stores/useForceStore';
import { getForceTypeName } from '@/types/force';

export default function EncounterForceSelectionPage(): React.ReactElement {
  const router = useRouter();
  const routeIdentity = encounterRouteIdentityFromRouter(router);
  const encounterId = routeIdentity.encounterId;
  const selectionSide = encounterForceSelectionSideFromRouter(router);

  const loadEncounters = useEncounterSelector((state) => state.loadEncounters);
  const getEncounter = useEncounterSelector((state) => state.getEncounter);
  const setPlayerForce = useEncounterSelector((state) => state.setPlayerForce);
  const setOpponentForce = useEncounterSelector(
    (state) => state.setOpponentForce,
  );
  const validateEncounter = useEncounterSelector(
    (state) => state.validateEncounter,
  );
  const encounterError = useEncounterSelector((state) => state.error);
  const clearEncounterError = useEncounterSelector((state) => state.clearError);

  const loadForces = useForceSelector((state) => state.loadForces);
  const getForceSummaries = useForceSelector(
    (state) => state.getForceSummaries,
  );
  const forceError = useForceSelector((state) => state.error);

  const [initialized, setInitialized] = useState(false);
  const [pendingForceId, setPendingForceId] = useState<string | null>(null);

  useEffect(() => {
    if (!router.isReady) return;

    let active = true;
    void Promise.all([loadEncounters(), loadForces()]).finally(() => {
      if (active) setInitialized(true);
    });

    return () => {
      active = false;
    };
  }, [loadEncounters, loadForces, router.isReady]);

  const encounter = encounterId ? getEncounter(encounterId) : undefined;
  const forces = useMemo(() => getForceSummaries(), [getForceSummaries]);
  const encounterHref = encounterId
    ? buildEncounterDetailHref(encounterId, routeIdentity)
    : '/gameplay/encounters';

  const handleSelect = useCallback(
    async (forceId: string): Promise<void> => {
      if (!encounterId || !selectionSide || pendingForceId) return;

      clearEncounterError();
      setPendingForceId(forceId);
      const saved =
        selectionSide === 'player'
          ? await setPlayerForce(encounterId, forceId)
          : await setOpponentForce(encounterId, forceId);

      if (!saved) {
        setPendingForceId(null);
        return;
      }

      await validateEncounter(encounterId);
      await router.push(encounterHref);
    },
    [
      clearEncounterError,
      encounterHref,
      encounterId,
      pendingForceId,
      router,
      selectionSide,
      setOpponentForce,
      setPlayerForce,
      validateEncounter,
    ],
  );

  if (!router.isReady || !initialized) {
    return <PageLoading message="Loading saved forces..." />;
  }

  if (!encounterId || !encounter) {
    return (
      <PageError
        title="Encounter Not Found"
        message="The encounter could not be loaded for force selection."
        backLink={encounterId ? encounterHref : '/gameplay/encounters'}
        backLabel={encounterId ? 'Back to Encounter' : 'Back to Encounters'}
      />
    );
  }

  if (!selectionSide) {
    return (
      <PageError
        title="Invalid Force Selection"
        message="Choose either the player or opponent force from the encounter."
        backLink={encounterHref}
        backLabel="Back to Encounter"
      />
    );
  }

  const sideLabel = selectionSide === 'player' ? 'Player' : 'Opponent';

  return (
    <PageLayout
      title={`Select ${sideLabel} Force`}
      subtitle={`Choose a saved force for ${encounter.name}. Readiness is revalidated after selection.`}
      backLink={encounterHref}
      backLabel="Back to Encounter"
      data-testid="encounter-force-selection-page"
    >
      <InlineErrorMessage message={encounterError ?? forceError} />

      {forces.length === 0 ? (
        <EmptyState
          data-testid="force-selection-empty-state"
          title="No saved forces available"
          message="Create and configure a force, then return to this encounter to continue."
          action={
            <Link
              href="/gameplay/forces/create"
              className="bg-accent-hover hover:bg-accent text-text-theme-primary inline-flex min-h-11 items-center rounded-lg px-4 py-2 text-sm font-medium"
            >
              Create Force
            </Link>
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {forces.map((force) => (
            <Card key={force.id} data-testid={`force-option-${force.id}`}>
              <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                <div className="min-w-0">
                  <h2 className="text-text-theme-primary truncate text-lg font-semibold">
                    {force.name}
                  </h2>
                  <p className="text-text-theme-secondary mt-1 text-sm">
                    {getForceTypeName(force.forceType)} |{' '}
                    {force.stats.assignedUnits} units |{' '}
                    {force.stats.totalBV.toLocaleString()} BV
                  </p>
                  {force.stats.assignedUnits === 0 && (
                    <p className="mt-2 text-sm text-amber-300">
                      This force has no assigned units and will not be mission
                      ready yet.
                    </p>
                  )}
                </div>
                <Button
                  variant="primary"
                  onClick={() => void handleSelect(force.id)}
                  isLoading={pendingForceId === force.id}
                  disabled={pendingForceId !== null}
                  data-testid={`select-force-${force.id}`}
                  className="shrink-0 sm:min-w-48"
                >
                  Use as {sideLabel} Force
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </PageLayout>
  );
}
