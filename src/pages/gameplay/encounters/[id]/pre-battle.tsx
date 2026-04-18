/**
 * Pre-Battle Screen
 * Shows force comparison, scenario info, and mode selection before launching an encounter.
 *
 * @spec openspec/changes/add-encounter-system/specs/encounter-system/spec.md
 */

import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useCallback, useEffect, useState } from 'react';

import type { IPilot } from '@/types/pilot';
import type {
  ISkirmishLaunchConfig,
  ISkirmishUnitSelection,
} from '@/utils/gameplay/preBattleSessionBuilder';

import {
  BattlefieldCard,
  BVComparison,
  ForceCard,
  MapConfigEditor,
  ModeSelection,
  ScenarioTemplateCard,
  SkirmishLauncher,
} from '@/components/gameplay/pages/PreBattlePage.sections';
import {
  buildPreparedBattleData,
  getAssignedUnitIds,
} from '@/components/gameplay/pages/preBattleSessionBuilder';
import { useToast } from '@/components/shared/Toast';
import { Card, PageLayout } from '@/components/ui';
import { GameEngine } from '@/engine/GameEngine';
import { useEncounterStore } from '@/stores/useEncounterStore';
import { useForceStore } from '@/stores/useForceStore';
import { useGameplayStore } from '@/stores/useGameplayStore';
import { usePilotStore } from '@/stores/usePilotStore';
import {
  EncounterStatus,
  SCENARIO_TEMPLATES,
  type IEncounter,
} from '@/types/encounter';
import { buildFromSkirmishConfig } from '@/utils/gameplay/preBattleSessionBuilder';
import { logger } from '@/utils/logger';

type BattleMode = 'auto' | 'interactive' | 'spectator';

function getLaunchErrorMessage(mode: BattleMode): string {
  switch (mode) {
    case 'auto':
      return 'Failed to resolve battle';
    case 'interactive':
      return 'Failed to start interactive mode';
    case 'spectator':
      return 'Failed to start spectator mode';
    default:
      return 'Failed to launch battle';
  }
}

function getLaunchErrorLogLabel(mode: BattleMode): string {
  switch (mode) {
    case 'auto':
      return 'Auto-resolve failed:';
    case 'interactive':
      return 'Interactive mode failed:';
    case 'spectator':
      return 'Spectator mode failed:';
    default:
      return 'Battle launch failed:';
  }
}

export default function PreBattlePage(): React.ReactElement {
  const router = useRouter();
  const { id } = router.query;
  const { showToast } = useToast();

  const {
    getEncounter,
    loadEncounters,
    updateEncounter,
    isLoading: encountersLoading,
  } = useEncounterStore();
  const { forces, loadForces } = useForceStore();
  const { pilots, loadPilots } = usePilotStore();
  const { setSession, setInteractiveSession, setSpectatorMode } =
    useGameplayStore();

  const [isInitialized, setIsInitialized] = useState(false);
  const [isResolving, setIsResolving] = useState(false);

  // Per-side skirmish picker state (add-skirmish-setup-ui § 2 + § 3).
  // Local state lives here rather than a store because the launcher
  // does not need to survive page navigation and a fresh skirmish
  // should always start clean.
  const [skirmishPlayerUnits, setSkirmishPlayerUnits] = useState<
    readonly ISkirmishUnitSelection[]
  >([]);
  const [skirmishOpponentUnits, setSkirmishOpponentUnits] = useState<
    readonly ISkirmishUnitSelection[]
  >([]);
  const [isSkirmishLaunching, setIsSkirmishLaunching] = useState(false);

  // Mover-not-duplicator helper (spec § 3.3): if `pilot` is already
  // assigned to a unit on either side, removes it from there before
  // applying the new assignment. Updates BOTH side states atomically
  // so the assignedPilotIds set the pickers compute stays consistent.
  const assignPilotMoving = useCallback(
    (
      targetSide: 'player' | 'opponent',
      unitId: string,
      pilot: IPilot | null,
    ) => {
      const stripPilot = (
        list: readonly ISkirmishUnitSelection[],
      ): readonly ISkirmishUnitSelection[] => {
        if (!pilot) {
          return list;
        }
        return list.map((u) =>
          u.pilot?.pilotId === pilot.id ? { ...u, pilot: null } : u,
        );
      };

      const applyToTarget = (
        list: readonly ISkirmishUnitSelection[],
      ): readonly ISkirmishUnitSelection[] => {
        return list.map((u) =>
          u.unitId === unitId
            ? {
                ...u,
                pilot: pilot
                  ? {
                      pilotId: pilot.id,
                      callsign: pilot.callsign ?? pilot.name,
                      gunnery: pilot.skills.gunnery,
                      piloting: pilot.skills.piloting,
                    }
                  : null,
              }
            : u,
        );
      };

      setSkirmishPlayerUnits((prev) => {
        const stripped = stripPilot(prev);
        return targetSide === 'player' ? applyToTarget(stripped) : stripped;
      });
      setSkirmishOpponentUnits((prev) => {
        const stripped = stripPilot(prev);
        return targetSide === 'opponent' ? applyToTarget(stripped) : stripped;
      });
    },
    [],
  );

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

  useEffect(() => {
    const initialize = async () => {
      await Promise.all([loadEncounters(), loadForces(), loadPilots()]);
      setIsInitialized(true);
    };

    void initialize();
  }, [loadEncounters, loadForces, loadPilots]);

  const launchBattle = useCallback(
    async (mode: BattleMode) => {
      if (!encounter || !encounter.playerForce || !encounter.opponentForce) {
        showToast({
          message: 'Encounter forces not configured',
          variant: 'error',
        });
        return;
      }

      setIsResolving(true);

      try {
        const playerUnitIds = getAssignedUnitIds(playerForce);
        const opponentUnitIds = getAssignedUnitIds(opponentForce);

        if (playerUnitIds.length === 0 || opponentUnitIds.length === 0) {
          showToast({
            message: 'Both forces need at least one unit assigned',
            variant: 'error',
          });
          return;
        }

        const { playerAdapted, opponentAdapted, gameUnits } =
          await buildPreparedBattleData({
            playerForce,
            opponentForce,
            pilots,
          });

        if (playerAdapted.length === 0 || opponentAdapted.length === 0) {
          showToast({
            message: 'Failed to load unit data for one or both forces',
            variant: 'error',
          });
          return;
        }

        const engine = new GameEngine({ seed: Date.now() });

        if (mode === 'auto') {
          const session = engine.runToCompletion(
            playerAdapted,
            opponentAdapted,
            gameUnits,
          );

          setSession(session);

          logger.info('Auto-resolve complete', {
            sessionId: session.id,
            turns: session.currentState.turn,
            result: session.currentState.result,
          });

          showToast({
            message: 'Battle resolved! Reviewing results...',
            variant: 'success',
          });

          void router.push(`/gameplay/games/${session.id}`);
          return;
        }

        const interactiveSession = engine.createInteractiveSession(
          playerAdapted,
          opponentAdapted,
          gameUnits,
        );
        const session = interactiveSession.getSession();

        if (mode === 'interactive') {
          setInteractiveSession(interactiveSession);

          logger.info('Interactive session created', { sessionId: session.id });

          showToast({
            message: 'Launching interactive battle...',
            variant: 'success',
          });

          void router.push(`/gameplay/games/${session.id}`);
          return;
        }

        setSpectatorMode(interactiveSession, {
          enabled: true,
          playing: true,
          speed: 1,
        });

        logger.info('Spectator session created', { sessionId: session.id });

        showToast({
          message: 'Launching spectator mode...',
          variant: 'success',
        });

        void router.push(`/gameplay/games/${session.id}`);
      } catch (err) {
        logger.error(getLaunchErrorLogLabel(mode), err);
        showToast({
          message:
            err instanceof Error ? err.message : getLaunchErrorMessage(mode),
          variant: 'error',
        });
      } finally {
        setIsResolving(false);
      }
    },
    [
      encounter,
      playerForce,
      opponentForce,
      pilots,
      showToast,
      setSession,
      router,
      setInteractiveSession,
      setSpectatorMode,
    ],
  );

  const startAutoResolve = useCallback(() => {
    void launchBattle('auto');
  }, [launchBattle]);

  const startInteractive = useCallback(() => {
    void launchBattle('interactive');
  }, [launchBattle]);

  const startSpectator = useCallback(() => {
    void launchBattle('spectator');
  }, [launchBattle]);

  if (!isInitialized || encountersLoading) {
    return (
      <PageLayout
        title="Loading..."
        backLink={`/gameplay/encounters/${id ?? ''}`}
        backLabel="Back to Encounter"
      >
        <div className="flex items-center justify-center py-16">
          <div className="text-center">
            <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-cyan-500 border-t-transparent" />
            <p className="text-text-theme-muted">Loading encounter data...</p>
          </div>
        </div>
      </PageLayout>
    );
  }

  if (!encounter) {
    return (
      <PageLayout
        title="Encounter Not Found"
        backLink="/gameplay/encounters"
        backLabel="Back to Encounters"
      >
        <Card>
          <p className="text-text-theme-secondary">
            The requested encounter could not be found.
          </p>
          <Link
            href="/gameplay/encounters"
            className="text-accent mt-4 inline-block hover:underline"
          >
            Return to Encounters
          </Link>
        </Card>
      </PageLayout>
    );
  }

  if (!encounter.playerForce || !encounter.opponentForce) {
    return (
      <PageLayout
        title="Incomplete Encounter"
        backLink={`/gameplay/encounters/${id as string}`}
        backLabel="Back to Encounter"
      >
        <Card>
          <p className="text-text-theme-secondary">
            Both player and opponent forces must be configured before battle.
          </p>
          <Link
            href={`/gameplay/encounters/${id as string}`}
            className="text-accent mt-4 inline-block hover:underline"
          >
            Configure Encounter
          </Link>
        </Card>
      </PageLayout>
    );
  }

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

        <BattlefieldCard mapConfig={encounter.mapConfig} />

        <MapConfigEditor
          mapConfig={encounter.mapConfig}
          disabled={isResolving}
          onChange={(next) => {
            void updateEncounter(encounter.id, {
              mapConfig: { ...encounter.mapConfig, ...next },
            });
          }}
        />

        <div className="mb-6">
          <ModeSelection
            onAutoResolve={startAutoResolve}
            onInteractive={startInteractive}
            onSpectate={startSpectator}
            isResolving={isResolving}
          />
        </div>
      </PageLayout>
    </>
  );
}
