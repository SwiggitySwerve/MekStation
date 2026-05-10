/**
 * Pre-Battle Screen
 * Shows force comparison, scenario info, and mode selection before launching an encounter.
 *
 * @spec openspec/changes/add-encounter-system/specs/encounter-system/spec.md
 */

import Head from 'next/head';
import { useRouter } from 'next/router';
import { useCallback, useEffect, useState } from 'react';

import type { IForceSummary } from '@/utils/gameplay/forceSummary';

import { ForceComparisonPanel } from '@/components/gameplay/ForceComparisonPanel';
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
import { SCENARIO_TEMPLATES, type IEncounter } from '@/types/encounter';
import { GameSide } from '@/types/gameplay';
import { buildForceSummary } from '@/utils/gameplay/forceSummaryBuilder';
import { logger } from '@/utils/logger';

export default function PreBattlePage(): React.ReactElement {
  const router = useRouter();
  const { id } = router.query;
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
  // Per-field selectors (useGameplaySelector POC). All three are stable
  // action references, so each subscription is effectively static —
  // we still pull them individually to keep the convention uniform
  // and to avoid re-rendering when unrelated gameplay-store fields
  // mutate during the launch handshake.
  const setSession = useGameplaySelector((s) => s.setSession);
  const setInteractiveSession = useGameplaySelector(
    (s) => s.setInteractiveSession,
  );
  const setSpectatorMode = useGameplaySelector((s) => s.setSpectatorMode);
  // Per `add-game-session-invite-and-lobby-1v1` § 7.1: clicking the
  // pre-battle "Networked 1v1" button creates a fresh sync room and
  // routes the host to the new lobby route directly. We pull
  // `createRoom` from the sync-room store so the click handler can mint
  // the room code without bouncing through the games index page.
  const createSyncRoom = useSyncRoomSelector((state) => state.createRoom);

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

  const launchBattle = usePreBattleLaunch({
    playerForce,
    opponentForce,
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

  // Per `add-game-session-invite-and-lobby-1v1` § 7.1: opens a
  // networked 1v1 lobby. Creates a fresh sync room, then routes the
  // host to `/gameplay/lobby/[roomCode]?host=1` so the lobby page can
  // initialise the host-side Yjs lobby state. We let the lobby page
  // own room hydration; this handler only mints the code and navigates.
  // On creation failure we fall back to the games index (which has the
  // legacy "Create Lobby" button) so the user is never stranded.
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
        const message =
          error instanceof Error
            ? error.message
            : 'Failed to create networked lobby';
        setNetworked1v1Error(message);
        logger.error('Networked 1v1 launch failed:', error);
      }
    })();
  }, [createSyncRoom, router]);

  // The disable reason surfaces in the ModeSelection tooltip per § 8.2.
  // For this slice the button is gated only by `isResolving` (the
  // ModeSelection component already disables on that flag); we don't
  // require an active sync room because clicking the button CREATES
  // one. When `createRoom` fails (e.g., WebRTC unavailable) we surface
  // the captured error here so the user sees a tooltip explaining why
  // the next click would fail without having to inspect the dev console.
  const networked1v1DisabledReason: string | null = networked1v1Error;

  if (!isInitialized || encountersLoading) {
    return <PreBattleLoading backLink={`/gameplay/encounters/${id ?? ''}`} />;
  }

  if (!encounter) {
    return <PreBattleNotFound />;
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
              onNetworked1v1={startNetworked1v1}
              networked1v1DisabledReason={networked1v1DisabledReason}
              isResolving={isResolving}
            />
          </div>
        )}
      </PageLayout>
    </>
  );
}
