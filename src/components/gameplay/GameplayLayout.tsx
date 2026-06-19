/**
 * Gameplay Layout Component
 * Main split-view layout for the gameplay interface.
 *
 * @spec openspec/changes/add-gameplay-ui/specs/gameplay-ui/spec.md
 */

import React, { useMemo, useRef, useState } from 'react';

import { hexTerrainFromGrid } from '@/engine/GameEngine.helpers';
import { usePhaseQueueProjection } from '@/hooks/gameplay';
import { useAnimationQueue } from '@/stores/useAnimationQueue';
import { useGameplaySelector } from '@/stores/useGameplayStore';
import { usePhysicalAttackPlanStore } from '@/stores/useGameplayStore.combatFlows';
import { GameSide } from '@/types/gameplay';
import { filterEventsForMovementAnimations } from '@/utils/gameplay/movement/eventLogSync';

import type { GameplayFogContactMemory } from './GameplayLayout.tokens';
import type { GameplayLayoutProps } from './GameplayLayout.types';
import type { MapInteractionState } from './HexMapDisplay/useMapInteraction';

import { buildTacticalActionContext } from './GameplayLayout.actionContext';
import { buildCommandPreviewInputs } from './GameplayLayout.commandPreview';
import { useGameplayLayoutControls } from './GameplayLayout.controls';
import { useGameplayLayoutPanelState } from './GameplayLayout.layoutState';
import { useGameplayLayoutLensState } from './GameplayLayout.lens';
import {
  buildPhysicalAttackOptionsByTargetId,
  deriveValidPhysicalTargetIds,
} from './GameplayLayout.physicalAttacks';
import { GameplayLayoutView } from './GameplayLayout.render';
import { useResponsiveRecordSheet } from './GameplayLayout.sections';
import {
  buildMovementProjectionByHex,
  buildSelectedUnitModel,
  resolveSelectedMovementCapability,
  resolveSelectedStandUpImpossibleReason,
} from './GameplayLayout.selection';
import {
  buildGameplayTokenProjection,
  buildGameplayVisibilityState,
  resolveFogContactMemory,
  resolveLocalFogPlayerId,
} from './GameplayLayout.tokens';
import {
  buildEventActorLookup,
  buildEventWeaponLookup,
  buildUnitInfoLookup,
} from './GameplayLayout.viewModel';

export type { GameplayLayoutProps } from './GameplayLayout.types';

/**
 * Main gameplay layout with split view.
 */
export function GameplayLayout({
  session,
  selectedUnitId,
  onUnitSelect,
  onAction,
  onHexClick,
  onHexHover,
  canUndo = false,
  isPlayerTurn = true,
  unitWeapons = {},
  maxArmor = {},
  maxStructure = {},
  pilotNames = {},
  heatSinks = {},
  unitSpas = {},
  interactivePhase,
  hitChance,
  validTargetIds = [],
  movementRange = [],
  hoveredHex,
  hoverMovementInfo,
  highlightPath = [],
  hoverMpCost,
  hoverUnreachable = false,
  mpLegend,
  onMovementModeSelect,
  interactiveSession,
  physicalAttackIntent,
  playerSide = GameSide.Player,
  shellMode = 'combat',
  className = '',
}: GameplayLayoutProps): React.ReactElement {
  const { currentState, events, config, units } = session;
  const activeAnimations = useAnimationQueue((state) => state.active);
  const queuedAnimations = useAnimationQueue((state) => state.queue);
  const activeTargetId = useGameplaySelector(
    (state) => state.attackPlan.targetUnitId,
  );
  const selectedWeaponIds = useGameplaySelector(
    (state) => state.attackPlan.selectedWeapons,
  );
  const plannedMovement = useGameplaySelector((state) => state.plannedMovement);
  const physicalAttackPlan = usePhysicalAttackPlanStore(
    (state) => state.physicalAttackPlan,
  );
  const phaseQueueProjection = usePhaseQueueProjection();
  const { layout, containerRef, startDragging, handleEventLogCollapsedChange } =
    useGameplayLayoutPanelState(currentState.phase);
  const [mapInteraction, setMapInteraction] =
    useState<MapInteractionState | null>(null);
  const lensState = useGameplayLayoutLensState(mapInteraction);
  const { isNarrow, drawerOpen, handleToggleDrawer } =
    useResponsiveRecordSheet();

  const unitInfoLookup = useMemo(() => buildUnitInfoLookup(units), [units]);
  const eventActorLookup = useMemo(() => buildEventActorLookup(units), [units]);
  const eventWeaponLookup = useMemo(
    () => buildEventWeaponLookup(unitWeapons),
    [unitWeapons],
  );
  const visibleEvents = useMemo(
    () =>
      filterEventsForMovementAnimations(
        events,
        [...activeAnimations, ...queuedAnimations],
        session.id,
      ),
    [activeAnimations, events, queuedAnimations, session.id],
  );
  const combatGrid = useMemo(
    () => interactiveSession?.getGrid() ?? null,
    [interactiveSession],
  );
  const visibilityState = useMemo(
    () =>
      buildGameplayVisibilityState(
        currentState,
        session.sideOwners,
        combatGrid,
      ),
    [combatGrid, currentState, session.sideOwners],
  );
  const localFogPlayerId = resolveLocalFogPlayerId(
    session.sideOwners,
    playerSide,
  );
  const fogContactMemoryRef = useRef<GameplayFogContactMemory | null>(null);
  const fogContactMemory = resolveFogContactMemory(
    fogContactMemoryRef,
    session.id,
  );

  const physicalAttackOptionsByTargetId = useMemo(
    () =>
      buildPhysicalAttackOptionsByTargetId({
        currentState,
        unitBindings: units,
        selectedUnitId,
        optionalRules: config.optionalRules,
        combatGrid,
      }),
    [combatGrid, config.optionalRules, currentState, selectedUnitId, units],
  );
  const validPhysicalTargetIds = useMemo(
    () => deriveValidPhysicalTargetIds(physicalAttackOptionsByTargetId),
    [physicalAttackOptionsByTargetId],
  );
  const tokens = useMemo(
    () =>
      buildGameplayTokenProjection({
        currentState,
        config,
        session,
        unitInfoLookup,
        selectedUnitId,
        validTargetIds,
        activeTargetId,
        validPhysicalTargetIds,
        activePhysicalTargetId: physicalAttackPlan.targetUnitId,
        playerSide,
        localFogPlayerId,
        visibilityState,
        fogContactMemory,
        combatGrid,
        unitWeapons,
        selectedWeaponIds,
        hasInteractiveSession: Boolean(interactiveSession),
      }),
    [
      activeTargetId,
      combatGrid,
      config,
      currentState,
      fogContactMemory,
      interactiveSession,
      localFogPlayerId,
      physicalAttackPlan.targetUnitId,
      playerSide,
      selectedUnitId,
      selectedWeaponIds,
      session,
      unitInfoLookup,
      unitWeapons,
      validPhysicalTargetIds,
      validTargetIds,
      visibilityState,
    ],
  );
  const hexTerrain = useMemo(
    () => (combatGrid ? hexTerrainFromGrid(combatGrid) : []),
    [combatGrid],
  );
  const movementProjectionByHex = useMemo(
    () => buildMovementProjectionByHex(movementRange, hoverMovementInfo),
    [hoverMovementInfo, movementRange],
  );
  const commandPreviewInputs = useMemo(
    () =>
      buildCommandPreviewInputs({
        currentState,
        selectedUnitId,
        activeTargetId,
        tokens,
        unitBindings: units,
        mapRadius: config.mapRadius,
        grid: combatGrid,
        unitWeapons,
        selectedWeaponIds,
        hitChance,
        physicalAttackTargetId: physicalAttackPlan.targetUnitId,
        physicalAttackType: physicalAttackPlan.attackType,
        physicalAttackLimb: physicalAttackPlan.limb,
        optionalRules: config.optionalRules,
        hoveredHex,
        movementInfo: hoverMovementInfo,
        highlightPath,
        hoverMpCost,
        hoverUnreachable,
      }),
    [
      activeTargetId,
      combatGrid,
      config.mapRadius,
      config.optionalRules,
      currentState,
      highlightPath,
      hitChance,
      hoveredHex,
      hoverMovementInfo,
      hoverMpCost,
      hoverUnreachable,
      physicalAttackPlan.attackType,
      physicalAttackPlan.limb,
      physicalAttackPlan.targetUnitId,
      selectedUnitId,
      selectedWeaponIds,
      tokens,
      unitWeapons,
      units,
    ],
  );
  const selectedUnitModel = useMemo(
    () =>
      buildSelectedUnitModel({
        currentState,
        selectedUnitId,
        unitInfoLookup,
        units,
        combatGrid,
      }),
    [combatGrid, currentState, selectedUnitId, unitInfoLookup, units],
  );
  const selectedMovementCapability = useMemo(
    () =>
      resolveSelectedMovementCapability({
        interactiveSession,
        selectedUnit: selectedUnitModel.selectedUnit,
        selectedUnitId,
      }),
    [interactiveSession, selectedUnitId, selectedUnitModel.selectedUnit],
  );
  const selectedStandUpImpossibleReason =
    resolveSelectedStandUpImpossibleReason({
      selectedUnit: selectedUnitModel.selectedUnit,
      selectedUnitFromSession: selectedUnitModel.selectedUnitFromSession,
    });
  const actionContext = useMemo(
    () =>
      buildTacticalActionContext({
        selectedUnitId,
        activeTargetId,
        commandPreviewInputs,
        movementProjectionByHex,
        physicalAttackTargetId: physicalAttackPlan.targetUnitId,
        physicalAttackOptionsByTargetId,
        phase: currentState.phase,
        canAct: isPlayerTurn,
        selectedUnit: selectedUnitModel.selectedUnit,
        selectedUnitMapHex: selectedUnitModel.selectedUnitMapHex,
        plannedMovement,
        selectedStandUpImpossibleReason,
        optionalRules: session.config.optionalRules,
        selectedMovementCapability,
      }),
    [
      activeTargetId,
      commandPreviewInputs,
      currentState.phase,
      isPlayerTurn,
      movementProjectionByHex,
      physicalAttackOptionsByTargetId,
      physicalAttackPlan.targetUnitId,
      plannedMovement,
      selectedMovementCapability,
      selectedStandUpImpossibleReason,
      selectedUnitId,
      selectedUnitModel.selectedUnit,
      selectedUnitModel.selectedUnitMapHex,
      session.config.optionalRules,
    ],
  );
  const controls = useGameplayLayoutControls({
    currentState,
    selectedUnit: selectedUnitModel.selectedUnit,
    selectedUnitId,
    mapInteraction,
    onUnitSelect,
    onHexClick,
  });

  return (
    <GameplayLayoutView
      className={className}
      session={session}
      phaseQueueProjection={phaseQueueProjection}
      shellMode={shellMode}
      localFogPlayerId={localFogPlayerId}
      playerSide={playerSide}
      selectedUnitId={selectedUnitId}
      onUnitSelect={onUnitSelect}
      isNarrow={isNarrow}
      drawerOpen={drawerOpen}
      onToggleDrawer={handleToggleDrawer}
      layout={layout}
      containerRef={containerRef}
      onStartDragging={startDragging}
      lensState={lensState}
      tokens={tokens}
      visibleEvents={visibleEvents}
      eventActorLookup={eventActorLookup}
      eventWeaponLookup={eventWeaponLookup}
      selectedUnitModel={selectedUnitModel}
      hexTerrain={hexTerrain}
      movementRange={movementRange}
      activeTargetId={activeTargetId}
      unitWeapons={unitWeapons}
      selectedWeaponIds={selectedWeaponIds}
      highlightPath={highlightPath}
      hoverMpCost={hoverMpCost}
      hoverUnreachable={hoverUnreachable}
      mpLegend={mpLegend}
      onMovementModeSelect={onMovementModeSelect}
      onHexHover={onHexHover}
      onInteractionReady={setMapInteraction}
      controls={controls}
      physicalAttackIntent={physicalAttackIntent}
      interactivePhase={interactivePhase}
      hitChance={hitChance}
      maxArmor={maxArmor}
      maxStructure={maxStructure}
      pilotNames={pilotNames}
      heatSinks={heatSinks}
      unitSpas={unitSpas}
      actionContext={actionContext}
      canUndo={canUndo}
      isPlayerTurn={isPlayerTurn}
      onAction={onAction}
      commandPreviewInputs={commandPreviewInputs}
      interactiveSession={interactiveSession}
      onEventLogCollapsedChange={handleEventLogCollapsedChange}
    />
  );
}

export default GameplayLayout;
