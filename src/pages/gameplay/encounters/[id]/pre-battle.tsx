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

import type { IAdaptedUnit } from '@/engine/types';
import type { IPilot } from '@/types/pilot';
import type { IForceSummary } from '@/utils/gameplay/forceSummary';
import type {
  ISkirmishLaunchConfig,
  ISkirmishUnitSelection,
} from '@/utils/gameplay/preBattleSessionBuilder';

import { ForceComparisonPanel } from '@/components/gameplay/ForceComparisonPanel';
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
import { adaptUnit } from '@/engine/adapters/CompendiumAdapter';
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
import { GameSide, type IGameUnit } from '@/types/gameplay';
import { buildForceSummary } from '@/utils/gameplay/forceSummaryBuilder';
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

  // Per-side force summary state (add-pre-battle-force-comparison §
  // 1-3, § 7). Re-derived whenever the underlying force assignments or
  // pilot data change — this is the page-side `onForcesChange` hookup
  // (per-spec game-session-management § Pre-Battle Force Change
  // Callback). Each summary fetches canonical unit data on demand so
  // the panel can show heat dissipation + DPT potential.
  const [playerSummary, setPlayerSummary] = useState<IForceSummary | null>(
    null,
  );
  const [opponentSummary, setOpponentSummary] = useState<IForceSummary | null>(
    null,
  );

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

  // Derive per-side force summaries when assignments / pilots change.
  // The effect re-runs whenever the underlying force objects swap
  // (zustand store immutability guarantees a new reference per
  // mutation), so adding a mech / swapping a pilot triggers a
  // re-render of the comparison panel. Cancellation guard avoids a
  // late `setState` after the user navigates away.
  useEffect(() => {
    let cancelled = false;
    const derive = async () => {
      const [next_player, next_opponent] = await Promise.all([
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
      setPlayerSummary(next_player);
      setOpponentSummary(next_opponent);
    };
    void derive();
    return () => {
      cancelled = true;
    };
  }, [playerForce, opponentForce, pilots]);

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

  // Per-side add handlers for the SkirmishLauncher. Each side caps at
  // two units (DEFAULT_SLOTS_PER_SIDE inside the launcher); the cap is
  // enforced here too as a defensive guard so callers cannot push a
  // third entry by holding a stale reference.
  const addPlayerUnit = useCallback((selection: ISkirmishUnitSelection) => {
    setSkirmishPlayerUnits((prev) =>
      prev.length >= 2 || prev.some((u) => u.unitId === selection.unitId)
        ? prev
        : [...prev, selection],
    );
  }, []);

  const removePlayerUnit = useCallback((unitId: string) => {
    setSkirmishPlayerUnits((prev) => prev.filter((u) => u.unitId !== unitId));
  }, []);

  const addOpponentUnit = useCallback((selection: ISkirmishUnitSelection) => {
    setSkirmishOpponentUnits((prev) =>
      prev.length >= 2 || prev.some((u) => u.unitId === selection.unitId)
        ? prev
        : [...prev, selection],
    );
  }, []);

  const removeOpponentUnit = useCallback((unitId: string) => {
    setSkirmishOpponentUnits((prev) => prev.filter((u) => u.unitId !== unitId));
  }, []);

  const assignPlayerPilot = useCallback(
    (unitId: string, pilot: IPilot | null) => {
      assignPilotMoving('player', unitId, pilot);
    },
    [assignPilotMoving],
  );

  const assignOpponentPilot = useCallback(
    (unitId: string, pilot: IPilot | null) => {
      assignPilotMoving('opponent', unitId, pilot);
    },
    [assignPilotMoving],
  );

  /**
   * Launch handshake for the skirmish setup flow (spec § 7).
   *
   * 1. Guard: encounter must not already be launched / completed (§ 8.3).
   * 2. Build the `IGameSession` via `buildFromSkirmishConfig` — this
   *    validates radius + pilot coverage and throws on failure.
   * 3. Adapt each picked unit via `adaptUnit` so the engine receives the
   *    full `IAdaptedUnit` (includes armor, weapons, equipment).
   * 4. Create the `InteractiveSession` and hand it to `useGameplayStore`
   *    so the core combat page can hydrate it.
   * 5. Navigate to `/gameplay/games/[id]` on success; on failure show a
   *    toast and leave the user's picks intact (§ 7.4).
   */
  const launchSkirmish = useCallback(
    async (config: ISkirmishLaunchConfig) => {
      if (!encounter) {
        showToast({ message: 'Encounter not loaded', variant: 'error' });
        return;
      }
      if (
        encounter.status === EncounterStatus.Launched ||
        encounter.status === EncounterStatus.Completed
      ) {
        showToast({
          message:
            'Encounter already launched — return to the encounter page to continue.',
          variant: 'error',
        });
        return;
      }

      setIsSkirmishLaunching(true);
      try {
        // Build the session scaffold. Throws on invalid config; we let
        // the catch branch display the error verbatim so the user can
        // fix the exact field (e.g. missing pilot).
        const session = buildFromSkirmishConfig(config);

        // Adapt each picked unit in parallel — `adaptUnit` pulls full
        // unit data from the compendium and snaps the pilot skills onto
        // the adapted instance. Nulls are filtered so a single bad
        // unitRef doesn't abort the whole launch.
        const adaptSelection = async (
          selection: ISkirmishUnitSelection,
          side: GameSide,
        ): Promise<IAdaptedUnit | null> => {
          const pilot = selection.pilot;
          return adaptUnit(selection.unitId, {
            side,
            gunnery: pilot?.gunnery ?? 4,
            piloting: pilot?.piloting ?? 5,
          });
        };

        const [playerAdapted, opponentAdapted] = await Promise.all([
          Promise.all(
            config.player.units.map((u) => adaptSelection(u, GameSide.Player)),
          ),
          Promise.all(
            config.opponent.units.map((u) =>
              adaptSelection(u, GameSide.Opponent),
            ),
          ),
        ]);

        const playerUnits = playerAdapted.filter(
          (u): u is IAdaptedUnit => u !== null,
        );
        const opponentUnits = opponentAdapted.filter(
          (u): u is IAdaptedUnit => u !== null,
        );

        if (
          playerUnits.length !== config.player.units.length ||
          opponentUnits.length !== config.opponent.units.length
        ) {
          throw new Error(
            'Failed to adapt one or more picked units — check the unit catalog',
          );
        }

        const gameUnits: IGameUnit[] = session.units.map((u) => ({
          id: u.id,
          name: u.name,
          side: u.side,
          unitRef: u.unitRef,
          pilotRef: u.pilotRef,
          gunnery: u.gunnery,
          piloting: u.piloting,
        }));

        const engine = new GameEngine({ seed: Date.now() });
        const interactiveSession = engine.createInteractiveSession(
          playerUnits,
          opponentUnits,
          gameUnits,
          { encounterId: encounter.id },
        );
        const liveSession = interactiveSession.getSession();

        setInteractiveSession(interactiveSession);

        logger.info('Skirmish session launched', {
          sessionId: liveSession.id,
          encounterId: encounter.id,
        });

        showToast({
          message: 'Launching skirmish…',
          variant: 'success',
        });

        void router.push(`/gameplay/games/${liveSession.id}`);
      } catch (err) {
        logger.error('Skirmish launch failed:', err);
        showToast({
          message:
            err instanceof Error ? err.message : 'Failed to launch skirmish',
          variant: 'error',
        });
      } finally {
        setIsSkirmishLaunching(false);
      }
    },
    [encounter, router, setInteractiveSession, showToast],
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

  // Note: forces may be unset when the user enters skirmish mode
  // directly — we still render the SkirmishLauncher below. The legacy
  // force-based comparison + ModeSelection blocks are only shown when
  // both sides have a pre-configured force on the encounter record.
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

        {/*
         * add-skirmish-setup-ui § 1-8: Skirmish launcher. Shown always —
         * even when the encounter has a pre-configured force — so the
         * user can choose between the legacy force-based flow and the
         * fresh 2v2 skirmish flow.
         */}
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
              isResolving={isResolving}
            />
          </div>
        )}
      </PageLayout>
    </>
  );
}
