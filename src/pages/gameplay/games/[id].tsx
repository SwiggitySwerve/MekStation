/**
 * Game Session Page
 * Main gameplay interface for an active game session.
 * Includes replay functionality for completed games.
 *
 * @spec openspec/changes/add-gameplay-ui/specs/gameplay-ui/spec.md
 * @spec openspec/changes/add-movement-phase-ui/specs/tactical-map-interface/spec.md
 */

import Head from 'next/head';
import { useRouter } from 'next/router';
import { useCallback, useEffect, useMemo, useState } from 'react';

import {
  CombatPlanningPanel,
  GameplayLayout,
  SpectatorView,
} from '@/components/gameplay';
import {
  CompletedGame,
  GameError,
  GameLoading,
} from '@/components/gameplay/pages/GameSessionPage.states';
import { useGameplayStore, InteractivePhase } from '@/stores/useGameplayStore';
import {
  Facing,
  GamePhase,
  GameSide,
  GameStatus,
  IHexCoordinate,
  IMovementRangeHex,
  MovementType,
} from '@/types/gameplay';
import { AXIAL_DIRECTION_DELTAS } from '@/types/gameplay/HexGridInterfaces';
import { findPath } from '@/utils/gameplay/movement/pathfinding';
import { deriveReachableHexes } from '@/utils/gameplay/movement/reachable';
import { logger } from '@/utils/logger';

/**
 * Per `add-movement-phase-ui` § 5: derive the default facing from the
 * last step of the player-previewed path. The last direction the unit
 * walked becomes its facing unless the player overrides it via the
 * FacingPicker. When the path is empty (same-hex) or the last step
 * doesn't match a canonical direction we fall back to the current
 * facing.
 */
function facingFromPath(
  path: readonly IHexCoordinate[],
  fallback: Facing,
): Facing {
  if (path.length < 2) return fallback;
  const prev = path[path.length - 2];
  const last = path[path.length - 1];
  const dq = last.q - prev.q;
  const dr = last.r - prev.r;
  for (let i = 0; i < AXIAL_DIRECTION_DELTAS.length; i++) {
    const delta = AXIAL_DIRECTION_DELTAS[i];
    if (delta.q === dq && delta.r === dr) {
      return i as Facing;
    }
  }
  return fallback;
}

export default function GameSessionPage(): React.ReactElement {
  const router = useRouter();
  const { id, campaignId, missionId } = router.query;
  const campaignIdStr = typeof campaignId === 'string' ? campaignId : undefined;
  const missionIdStr = typeof missionId === 'string' ? missionId : undefined;

  const {
    session,
    isLoading,
    error,
    loadSession,
    createDemoSession,
    ui,
    selectUnit,
    handleAction,
    unitWeapons,
    maxArmor,
    maxStructure,
    pilotNames,
    heatSinks,
    unitSpas,
    clearError,
    interactiveSession,
    interactivePhase,
    spectatorMode,
    validTargetIds,
    hitChance,
    handleInteractiveHexClick,
    handleInteractiveTokenClick,
    advanceInteractivePhase,
    fireWeapons,
    runAITurn,
    skipPhase,
    checkGameOver,
    plannedMovement,
    setPlannedMovement,
    clearPlannedMovement,
  } = useGameplayStore();

  useEffect(() => {
    if (id === 'demo') {
      createDemoSession();
    } else if (typeof id === 'string') {
      void loadSession(id);
    }
  }, [id, loadSession, createDemoSession]);

  const isInteractive = !!interactiveSession;

  // Per add-movement-phase-ui § 4: track the hex the user is currently
  // hovering over the SVG. Drives both the path preview and the
  // "Unreachable" tooltip. Lives at the page level so the render of
  // the overlay props and the click handler share the same state.
  const [hoveredHex, setHoveredHex] = useState<IHexCoordinate | null>(null);

  const phase = session?.currentState.phase;

  // Derive walk/run/jump MP for the selected unit — used to gate the
  // CombatPlanningPanel's MovementTypeSwitcher and seed
  // `deriveReachableHexes`. Missing capability (e.g., spectator) is
  // treated as zero MP which disables the entire overlay.
  const capability = useMemo(() => {
    if (!interactiveSession || !ui.selectedUnitId) return null;
    return interactiveSession.getMovementCapability(ui.selectedUnitId);
  }, [interactiveSession, ui.selectedUnitId]);

  // Per spec delta "Reachable Hex Derivation by MP Type": derive the
  // overlay hexes from the chosen MovementType. Walk/Jump always
  // render their own set; Run folds Walk + Run so walk-reachable
  // tiles keep their green tint under the run envelope (per the
  // "Run overlay" scenario).
  const selectedUnitState = useMemo(() => {
    if (!session || !ui.selectedUnitId) return null;
    return session.currentState.units[ui.selectedUnitId] ?? null;
  }, [session, ui.selectedUnitId]);

  const selectedUnitInfo = useMemo(() => {
    if (!session || !ui.selectedUnitId) return null;
    return session.units.find((u) => u.id === ui.selectedUnitId) ?? null;
  }, [session, ui.selectedUnitId]);

  // Opponent-controlled units: never show the movement overlay (task
  // 10.2). `isPlayerControlled` also gates the CombatPlanningPanel —
  // the player shouldn't be able to plan for an enemy mech.
  const isPlayerControlled = selectedUnitInfo?.side === GameSide.Player;

  const movementType: MovementType =
    plannedMovement?.movementType ?? MovementType.Walk;

  const movementRangeHexes = useMemo((): readonly IMovementRangeHex[] => {
    if (
      !interactiveSession ||
      !selectedUnitState ||
      !capability ||
      !isPlayerControlled ||
      phase !== GamePhase.Movement ||
      movementType === MovementType.Stationary
    ) {
      return [];
    }

    const grid = interactiveSession.getGrid();
    const primary = deriveReachableHexes(
      selectedUnitState,
      movementType,
      grid,
      capability,
    );
    // Run envelope folds walk reach underneath so callers retain the
    // green walk-tint inside the yellow run set (spec scenario: "Run
    // overlay includes Walk hexes keyed as Walk").
    if (movementType === MovementType.Run) {
      const walk = deriveReachableHexes(
        selectedUnitState,
        MovementType.Walk,
        grid,
        capability,
      );
      const keyed = new Map<string, IMovementRangeHex>();
      for (const h of primary) keyed.set(`${h.hex.q},${h.hex.r}`, h);
      for (const h of walk) keyed.set(`${h.hex.q},${h.hex.r}`, h);
      return Array.from(keyed.values());
    }
    return primary;
  }, [
    interactiveSession,
    selectedUnitState,
    capability,
    isPlayerControlled,
    phase,
    movementType,
  ]);

  const reachableKeySet = useMemo(() => {
    const keys = new Set<string>();
    for (const r of movementRangeHexes) keys.add(`${r.hex.q},${r.hex.r}`);
    return keys;
  }, [movementRangeHexes]);

  // Per § 4.1 "Path preview on hover": when the hovered hex is
  // reachable we run the A* pathfinder from the unit's current
  // position to the hovered hex and feed the result into the map's
  // `highlightPath`. Jump previews show a straight start→landing line
  // (no intermediate path) since the unit skips the terrain.
  const hoveredPath = useMemo((): readonly IHexCoordinate[] => {
    if (
      !hoveredHex ||
      !interactiveSession ||
      !selectedUnitState ||
      phase !== GamePhase.Movement ||
      !reachableKeySet.has(`${hoveredHex.q},${hoveredHex.r}`)
    ) {
      return [];
    }
    if (movementType === MovementType.Jump) {
      return [selectedUnitState.position, hoveredHex];
    }
    const grid = interactiveSession.getGrid();
    const path = findPath(
      grid,
      selectedUnitState.position,
      hoveredHex,
      capability
        ? movementType === MovementType.Walk
          ? capability.walkMP
          : capability.runMP
        : Infinity,
    );
    return path ?? [];
  }, [
    hoveredHex,
    interactiveSession,
    selectedUnitState,
    phase,
    reachableKeySet,
    movementType,
    capability,
  ]);

  // Cumulative MP cost of the currently previewed path — surfaced as
  // an MP badge at the hovered destination (spec § 4.3). Looked up
  // from the reachable table rather than recomputed so the number the
  // player sees matches the overlay they're hovering over.
  const hoverMpCost = useMemo(() => {
    if (!hoveredHex || !reachableKeySet.has(`${hoveredHex.q},${hoveredHex.r}`))
      return undefined;
    const entry = movementRangeHexes.find(
      (r) => r.hex.q === hoveredHex.q && r.hex.r === hoveredHex.r,
    );
    return entry?.mpCost;
  }, [hoveredHex, reachableKeySet, movementRangeHexes]);

  // Per spec § 4.4: the map surfaces an "Unreachable" tooltip when
  // the player hovers a hex outside the reachable set during the
  // Movement phase. This never triggers outside the Movement phase
  // (we skip the Run/Walk overlay entirely otherwise).
  const hoverUnreachable =
    phase === GamePhase.Movement &&
    isPlayerControlled &&
    hoveredHex !== null &&
    movementRangeHexes.length > 0 &&
    !reachableKeySet.has(`${hoveredHex.q},${hoveredHex.r}`);

  const mpLegend = useMemo(() => {
    if (phase !== GamePhase.Movement || !isPlayerControlled || !capability) {
      return undefined;
    }
    const active =
      movementType === MovementType.Jump
        ? ('jump' as const)
        : movementType === MovementType.Run
          ? ('run' as const)
          : ('walk' as const);
    return {
      active,
      jumpAvailable: capability.jumpMP > 0,
    };
  }, [phase, isPlayerControlled, capability, movementType]);

  // Per spec delta "Planned Movement UI Projection": clicking a
  // reachable hex during the Movement phase stores the plan on the
  // store. Clicking an unreachable hex falls through to the default
  // interactive-click handler (no plan side effect). Clicking the
  // unit's own hex clears the plan.
  const handleHexClick = useCallback(
    (hex: IHexCoordinate) => {
      if (
        phase === GamePhase.Movement &&
        isPlayerControlled &&
        selectedUnitState
      ) {
        const key = `${hex.q},${hex.r}`;
        if (reachableKeySet.has(key)) {
          const path =
            movementType === MovementType.Jump
              ? [selectedUnitState.position, hex]
              : ((findPath(
                  interactiveSession!.getGrid(),
                  selectedUnitState.position,
                  hex,
                  capability
                    ? movementType === MovementType.Walk
                      ? capability.walkMP
                      : capability.runMP
                    : Infinity,
                ) ?? []) as IHexCoordinate[]);
          const facing = facingFromPath(path, selectedUnitState.facing);
          setPlannedMovement({
            destination: hex,
            facing,
            movementType,
            path,
          });
          return;
        }
        // Unreachable — fall through; no plan mutation.
      }

      if (interactiveSession) {
        handleInteractiveHexClick(hex);
      } else {
        logger.debug('Hex clicked:', hex);
      }
    },
    [
      phase,
      isPlayerControlled,
      selectedUnitState,
      reachableKeySet,
      movementType,
      interactiveSession,
      capability,
      setPlannedMovement,
      handleInteractiveHexClick,
    ],
  );

  // Per spec delta: clear the plan when we leave the Movement phase
  // so the overlay + plan don't bleed into WeaponAttack / EndTurn.
  useEffect(() => {
    if (phase !== GamePhase.Movement && plannedMovement) {
      clearPlannedMovement();
    }
  }, [phase, plannedMovement, clearPlannedMovement]);

  const handleRetry = useCallback(() => {
    clearError();
    if (typeof id === 'string') {
      void loadSession(id);
    }
  }, [id, loadSession, clearError]);

  const handleTokenClick = useCallback(
    (unitId: string | null) => {
      if (!unitId) {
        selectUnit(null);
        return;
      }

      if (isInteractive) {
        handleInteractiveTokenClick(unitId);
      } else {
        selectUnit(unitId === ui.selectedUnitId ? null : unitId);
      }
    },
    [isInteractive, handleInteractiveTokenClick, selectUnit, ui.selectedUnitId],
  );

  const handleInteractiveAction = useCallback(
    (actionId: string) => {
      if (!isInteractive) {
        handleAction(actionId);
        return;
      }

      switch (actionId) {
        case 'lock':
        case 'skip':
          skipPhase();
          break;
        case 'next-turn':
          runAITurn();
          break;
        case 'fire':
          fireWeapons();
          break;
        case 'advance':
          advanceInteractivePhase();
          break;
        case 'concede':
          handleAction(actionId);
          break;
        default:
          handleAction(actionId);
      }

      checkGameOver();
    },
    [
      isInteractive,
      handleAction,
      skipPhase,
      runAITurn,
      fireWeapons,
      advanceInteractivePhase,
      checkGameOver,
    ],
  );

  if (isLoading) {
    return <GameLoading />;
  }

  if (error) {
    return <GameError message={error} onRetry={handleRetry} />;
  }

  if (!session) {
    return <GameLoading />;
  }

  if (
    session.currentState.status === GameStatus.Completed &&
    session.currentState.result
  ) {
    return (
      <CompletedGame
        gameId={session.id}
        winner={session.currentState.result.winner}
        reason={session.currentState.result.reason}
        campaignId={campaignIdStr}
        missionId={missionIdStr}
        unitStates={session.currentState.units}
      />
    );
  }

  if (
    interactivePhase === InteractivePhase.GameOver &&
    interactiveSession &&
    !spectatorMode
  ) {
    const result = interactiveSession.getResult();
    const rawWinner = result?.winner ?? 'draw';
    const winner: GameSide | 'draw' =
      rawWinner === 'player'
        ? GameSide.Player
        : rawWinner === 'opponent'
          ? GameSide.Opponent
          : 'draw';
    const reason = result?.reason ?? 'unknown';

    return (
      <CompletedGame
        gameId={session.id}
        winner={winner}
        reason={reason}
        campaignId={campaignIdStr}
        missionId={missionIdStr}
        unitStates={interactiveSession.getState().units}
      />
    );
  }

  if (spectatorMode?.enabled && interactiveSession) {
    return <SpectatorView />;
  }

  const isPlayerTurn = session.currentState.firstMover === GameSide.Player;

  // Per `add-physical-attack-phase-ui` task 1.2: extend the planning
  // panel to mount during the Physical Attack phase so the
  // `PhysicalAttackPanel` sub-panel replaces the weapons list while
  // keeping the locked weapons visible below it.
  const showPlanningPanel =
    isInteractive &&
    isPlayerControlled &&
    (phase === GamePhase.Movement ||
      phase === GamePhase.WeaponAttack ||
      phase === GamePhase.PhysicalAttack);

  return (
    <>
      <Head>
        <title>Game Session - MekStation</title>
      </Head>
      <div
        className="flex h-screen flex-col overflow-hidden"
        data-testid="game-session"
      >
        <div className="flex-1 overflow-hidden">
          <GameplayLayout
            session={session}
            selectedUnitId={ui.selectedUnitId}
            onUnitSelect={handleTokenClick}
            onAction={handleInteractiveAction}
            onHexClick={handleHexClick}
            onHexHover={setHoveredHex}
            canUndo={false}
            isPlayerTurn={isPlayerTurn}
            unitWeapons={unitWeapons}
            maxArmor={maxArmor}
            maxStructure={maxStructure}
            pilotNames={pilotNames}
            heatSinks={heatSinks}
            unitSpas={unitSpas}
            interactivePhase={isInteractive ? interactivePhase : undefined}
            hitChance={hitChance}
            validTargetIds={validTargetIds}
            movementRange={movementRangeHexes}
            highlightPath={hoveredPath}
            hoverMpCost={hoverMpCost}
            hoverUnreachable={hoverUnreachable}
            mpLegend={mpLegend}
            interactiveSession={interactiveSession ?? undefined}
            playerSide={GameSide.Player}
          />
        </div>
        {showPlanningPanel && ui.selectedUnitId && (
          <CombatPlanningPanel
            walkMP={capability?.walkMP ?? 0}
            jumpMP={capability?.jumpMP ?? 0}
            weapons={[]}
          />
        )}
      </div>
    </>
  );
}
