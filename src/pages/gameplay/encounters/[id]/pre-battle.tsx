/**
 * Pre-Battle Screen
 * Shows force comparison, scenario info, and mode selection before launching an encounter.
 *
 * @spec openspec/changes/add-encounter-system/specs/encounter-system/spec.md
 */

import type { NextRouter } from 'next/router';

import Head from 'next/head';
import { useRouter } from 'next/router';
import { useCallback, useEffect, useState } from 'react';

import type { IEncounter } from '@/types/encounter';
import type { IForce } from '@/types/force';
import type { IPilot } from '@/types/pilot';
import type { IForceSummary } from '@/utils/gameplay/forceSummary';

import { ForceComparisonPanel } from '@/components/gameplay/ForceComparisonPanel';
import { buildPreBattleLaunchLinkage } from '@/components/gameplay/pages/preBattle/preBattleLaunchLinkage';
import {
  PreBattleLoading,
  PreBattleNotFound,
} from '@/components/gameplay/pages/preBattle/PreBattlePageStates';
import { usePreBattleLaunch } from '@/components/gameplay/pages/preBattle/usePreBattleLaunch';
import { usePreBattleSkirmish } from '@/components/gameplay/pages/preBattle/usePreBattleSkirmish';
import {
  BattlefieldCard,
  BVComparison,
  ForceCard,
  MapConfigEditor,
  ModeSelection,
  ScenarioTemplateCard,
  SkirmishLauncher,
} from '@/components/gameplay/pages/PreBattlePage.sections';
import { useToast } from '@/components/shared/Toast';
import { PageLayout } from '@/components/ui';
import { useSyncRoomSelector } from '@/lib/p2p';
import { useEncounterSelector } from '@/stores/useEncounterStore';
import { useForceSelector } from '@/stores/useForceStore';
import { useGameplaySelector } from '@/stores/useGameplayStore';
import { usePilotSelector } from '@/stores/usePilotStore';
import { SCENARIO_TEMPLATES } from '@/types/encounter';
import { GameSide } from '@/types/gameplay';
import { buildForceSummary } from '@/utils/gameplay/forceSummaryBuilder';
import { logger } from '@/utils/logger';

function usePreBattleInitialization(
  loadEncounters: () => Promise<void> | void,
  loadForces: () => Promise<void> | void,
  loadPilots: () => Promise<void> | void,
): boolean {
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    const initialize = async () => {
      await Promise.all([loadEncounters(), loadForces(), loadPilots()]);
      setIsInitialized(true);
    };

    void initialize();
  }, [loadEncounters, loadForces, loadPilots]);

  return isInitialized;
}

function useForceSummaries({
  playerForce,
  opponentForce,
  pilots,
}: {
  readonly playerForce: IForce | undefined;
  readonly opponentForce: IForce | undefined;
  readonly pilots: readonly IPilot[];
}): {
  readonly playerSummary: IForceSummary | null;
  readonly opponentSummary: IForceSummary | null;
} {
  const [playerSummary, setPlayerSummary] = useState<IForceSummary | null>(
    null,
  );
  const [opponentSummary, setOpponentSummary] = useState<IForceSummary | null>(
    null,
  );

  useEffect(() => {
    let cancelled = false;
    const derive = async () => {
      const [nextPlayer, nextOpponent] = await Promise.all([
        playerForce
          ? buildForceSummary({
              side: GameSide.Player,
              force: playerForce,
              pilots,
            })
          : Promise.resolve(null),
        opponentForce
          ? buildForceSummary({
              side: GameSide.Opponent,
              force: opponentForce,
              pilots,
            })
          : Promise.resolve(null),
      ]);
      if (cancelled) return;
      setPlayerSummary(nextPlayer);
      setOpponentSummary(nextOpponent);
    };

    void derive();
    return () => {
      cancelled = true;
    };
  }, [playerForce, opponentForce, pilots]);

  return { playerSummary, opponentSummary };
}

function networked1v1LaunchMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : 'Failed to create networked lobby';
}

function useNetworked1v1Launch({
  createSyncRoom,
  router,
}: {
  readonly createSyncRoom: () => Promise<string>;
  readonly router: NextRouter;
}): {
  readonly networked1v1Error: string | null;
  readonly startNetworked1v1: () => void;
} {
  const [networked1v1Error, setNetworked1v1Error] = useState<string | null>(
    null,
  );

  const startNetworked1v1 = useCallback(() => {
    void (async () => {
      setNetworked1v1Error(null);
      try {
        const code = await createSyncRoom();
        await router.push(`/gameplay/lobby/${encodeURIComponent(code)}?host=1`);
      } catch (error) {
        setNetworked1v1Error(networked1v1LaunchMessage(error));
        logger.error('Networked 1v1 launch failed:', error);
      }
    })();
  }, [createSyncRoom, router]);

  return { networked1v1Error, startNetworked1v1 };
}

export default function PreBattlePage(): React.ReactElement {
  const router = useRouter();
  const { id, campaignId, missionId } = router.query;
  const { showToast } = useToast();

  const getEncounter = useEncounterSelector((state) => state.getEncounter);
  const loadEncounters = useEncounterSelector((state) => state.loadEncounters);
  const updateEncounter = useEncounterSelector(
    (state) => state.updateEncounter,
  );
  const encountersLoading = useEncounterSelector((state) => state.isLoading);
  const forces = useForceSelector((state) => state.forces);
  const loadForces = useForceSelector((state) => state.loadForces);
  const pilots = usePilotSelector((state) => state.pilots);
  const loadPilots = usePilotSelector((state) => state.loadPilots);
  const setSession = useGameplaySelector((s) => s.setSession);
  const setInteractiveSession = useGameplaySelector(
    (s) => s.setInteractiveSession,
  );
  const setSpectatorMode = useGameplaySelector((s) => s.setSpectatorMode);
  const createSyncRoom = useSyncRoomSelector((state) => state.createRoom);

  const isInitialized = usePreBattleInitialization(
    loadEncounters,
    loadForces,
    loadPilots,
  );
  const [isResolving, setIsResolving] = useState(false);

  const encounter: IEncounter | undefined =
    id && typeof id === 'string' ? getEncounter(id) : undefined;
  const template = encounter?.template
    ? SCENARIO_TEMPLATES.find((item) => item.type === encounter.template)
    : null;
  const playerForce = encounter?.playerForce
    ? forces.find((force) => force.id === encounter.playerForce?.forceId)
    : undefined;
  const opponentForce = encounter?.opponentForce
    ? forces.find((force) => force.id === encounter.opponentForce?.forceId)
    : undefined;
  const launchLinkage = encounter
    ? buildPreBattleLaunchLinkage({ encounter, campaignId, missionId })
    : undefined;

  const {
    playerUnits: skirmishPlayerUnits,
    opponentUnits: skirmishOpponentUnits,
    isLaunching: isSkirmishLaunching,
    addPlayerUnit,
    removePlayerUnit,
    assignPlayerPilot,
    addOpponentUnit,
    removeOpponentUnit,
    assignOpponentPilot,
    launchSkirmish,
  } = usePreBattleSkirmish({
    encounter,
    router,
    setInteractiveSession,
    showToast,
  });

  const { playerSummary, opponentSummary } = useForceSummaries({
    playerForce,
    opponentForce,
    pilots,
  });

  const launchBattle = usePreBattleLaunch({
    playerForce,
    opponentForce,
    mapConfig: encounter?.mapConfig,
    linkage: launchLinkage,
    pilots,
    router,
    setSession,
    setInteractiveSession,
    setSpectatorMode,
    setIsResolving,
    showToast,
  });

  const startAutoResolve = useCallback(() => {
    void launchBattle('auto');
  }, [launchBattle]);

  const startInteractive = useCallback(() => {
    void launchBattle('interactive');
  }, [launchBattle]);

  const startSpectator = useCallback(() => {
    void launchBattle('spectator');
  }, [launchBattle]);

  const { networked1v1Error, startNetworked1v1 } = useNetworked1v1Launch({
    createSyncRoom,
    router,
  });

  if (!isInitialized || encountersLoading) {
    return <PreBattleLoading backLink={`/gameplay/encounters/${id ?? ''}`} />;
  }

  if (!encounter) {
    return <PreBattleNotFound />;
  }

  const hasBothForces = Boolean(
    encounter.playerForce && encounter.opponentForce,
  );
  const breadcrumbs = [
    { label: 'Home', href: '/' },
    { label: 'Gameplay', href: '/gameplay' },
    { label: 'Encounters', href: '/gameplay/encounters' },
    { label: encounter.name, href: `/gameplay/encounters/${id as string}` },
    { label: 'Pre-Battle' },
  ];

  return (
    <>
      <Head>
        <title>Pre-Battle: {encounter.name} | MekStation</title>
      </Head>

      <PageLayout
        title={`Pre-Battle: ${encounter.name}`}
        subtitle="Review forces and choose your battle mode"
        breadcrumbs={breadcrumbs}
        backLink={`/gameplay/encounters/${id as string}`}
        backLabel="Back to Encounter"
        data-testid="pre-battle-page"
      >
        {template && <ScenarioTemplateCard template={template} />}

        {hasBothForces && encounter.playerForce && encounter.opponentForce && (
          <>
            <div
              className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2"
              data-testid="forces-comparison"
            >
              <ForceCard
                title="Player Force"
                forceRef={encounter.playerForce}
                force={playerForce}
                side="player"
              />
              <ForceCard
                title="Opponent Force"
                forceRef={encounter.opponentForce}
                force={opponentForce}
                side="opponent"
              />
            </div>

            <div className="mb-6">
              <BVComparison
                playerBV={encounter.playerForce.totalBV}
                opponentBV={encounter.opponentForce.totalBV}
              />
            </div>

            <div className="mb-6">
              <ForceComparisonPanel
                player={playerSummary}
                opponent={opponentSummary}
              />
            </div>
          </>
        )}

        <BattlefieldCard mapConfig={encounter.mapConfig} />

        <MapConfigEditor
          mapConfig={encounter.mapConfig}
          disabled={isResolving || isSkirmishLaunching}
          onChange={(next) => {
            void updateEncounter(encounter.id, {
              mapConfig: { ...encounter.mapConfig, ...next },
            });
          }}
        />

        <div className="mb-6" data-testid="skirmish-launcher-section">
          <h2 className="text-text-theme-primary mb-3 text-lg font-medium">
            Skirmish Setup
          </h2>
          <p className="text-text-theme-muted mb-4 text-sm">
            Pick two units and two pilots per side, then launch the match.
          </p>
          <SkirmishLauncher
            encounterId={encounter.id}
            mapConfig={encounter.mapConfig}
            pilots={pilots}
            playerUnits={skirmishPlayerUnits}
            opponentUnits={skirmishOpponentUnits}
            onAddPlayerUnit={addPlayerUnit}
            onRemovePlayerUnit={removePlayerUnit}
            onAssignPlayerPilot={assignPlayerPilot}
            onAddOpponentUnit={addOpponentUnit}
            onRemoveOpponentUnit={removeOpponentUnit}
            onAssignOpponentPilot={assignOpponentPilot}
            onLaunch={(config) => {
              void launchSkirmish(config);
            }}
            isLaunching={isSkirmishLaunching}
          />
        </div>

        {hasBothForces && (
          <div className="mb-6">
            <ModeSelection
              onAutoResolve={startAutoResolve}
              onInteractive={startInteractive}
              onSpectate={startSpectator}
              onNetworked1v1={startNetworked1v1}
              networked1v1DisabledReason={networked1v1Error}
              isResolving={isResolving}
            />
          </div>
        )}
      </PageLayout>
    </>
  );
}
