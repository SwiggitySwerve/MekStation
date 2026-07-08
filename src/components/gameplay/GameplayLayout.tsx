/**
 * Gameplay Layout Component
 * Main split-view layout for the gameplay interface.
 *
 * @spec openspec/changes/add-gameplay-ui/specs/gameplay-ui/spec.md
 */

import React, { useMemo, useRef, useState } from 'react';

import { hexTerrainFromGrid } from '@/engine/GameEngine.helpers';
import { usePhaseQueueProjection } from '@/hooks/gameplay';
import { computeMovementHeat } from '@/simulation/runner/phases/heatPhaseCalculations';
import { useAnimationQueue } from '@/stores/useAnimationQueue';
import { useGameplaySelector } from '@/stores/useGameplayStore';
import {
  selectPrimaryTargetId,
  selectSecondaryTargetIds,
} from '@/stores/useGameplayStore.attackIntent';
import { deriveWeaponLegalityForTarget } from '@/stores/useGameplayStore.attackIntent.derive';
import { usePhysicalAttackPlanStore } from '@/stores/useGameplayStore.combatFlows';
import { Facing, GamePhase, GameSide } from '@/types/gameplay';
import { filterEventsForMovementAnimations } from '@/utils/gameplay/movement/eventLogSync';

import type { IAttackComposerContext } from './AttackIntentComposer';
import type { GameplayFogContactMemory } from './GameplayLayout.tokens';
import type { GameplayLayoutProps } from './GameplayLayout.types';
import type { MapInteractionState } from './HexMapDisplay/useMapInteraction';

import { buildTacticalActionContext } from './GameplayLayout.actionContext';
import { buildCommandPreviewInputs } from './GameplayLayout.commandPreview';
import { useGameplayLayoutControls } from './GameplayLayout.controls';
import { useGameplayLayoutPanelState } from './GameplayLayout.layoutState';
import { useGameplayLayoutLensState } from './GameplayLayout.lens';
import { buildPhaseAdvanceControl } from './GameplayLayout.phaseAdvance';
import {
  buildPhysicalAttackOptionsByTargetId,
  deriveValidPhysicalTargetIds,
} from './GameplayLayout.physicalAttacks';
import { GameplayLayoutView } from './GameplayLayout.render';
import { useResponsiveRecordSheet } from './GameplayLayout.sections';
import {
  buildSelectedUnitModel,
  resolveSelectedMovementCapability,
  resolveSelectedStandUpImpossibleReason,
} from './GameplayLayout.selection';
import { useGameplayTacticalProjection } from './GameplayLayout.tacticalProjection';
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
  intentComposer,
  interactiveSession,
  physicalAttackIntent,
  playerSide = GameSide.Player,
  shellMode = 'combat',
  gmIntervention,
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
  const attackIntent = useGameplaySelector((state) => state.attackIntent);
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
  // Attack Intent Composer map bindings (attack-phase-intent-composer,
  // phase 3): while the composer owns the weapon-attack phase, the primary
  // ring binds to the composed volley's FIRST-assigned target and every
  // other assigned target carries the secondary encoding; outside the
  // composer the legacy attackPlan binding applies (MODIFIED Target Lock
  // Visualization).
  const attackComposerActive =
    currentState.phase === GamePhase.WeaponAttack &&
    isPlayerTurn &&
    Boolean(selectedUnitId);
  const composerPrimaryTargetId = attackComposerActive
    ? selectPrimaryTargetId(attackIntent)
    : null;
  const composerSecondaryTargetIds = useMemo(
    () => (attackComposerActive ? selectSecondaryTargetIds(attackIntent) : []),
    [attackComposerActive, attackIntent],
  );
  // At-source feasibility visuals (twist-aware): unit id → reason when NO
  // weapon of the composing unit can engage. Consumed verbatim from the
  // phase-1 legality derivation; recomputes live on twist change.
  const attackInfeasibleReasonByUnitId = useMemo(() => {
    if (!attackComposerActive || !combatGrid || !selectedUnitId) return {};
    const attackerState = currentState.units[selectedUnitId];
    const weapons = unitWeapons[selectedUnitId] ?? [];
    if (!attackerState || weapons.length === 0) return {};
    const reasons: Record<string, string> = {};
    for (const [unitId, state] of Object.entries(currentState.units)) {
      const info = unitInfoLookup[unitId];
      if (!info || info.side === playerSide || state.destroyed) continue;
      const options = deriveWeaponLegalityForTarget({
        weapons,
        attacker: {
          position: attackerState.position,
          facing: attackerState.facing,
        },
        composedTwist: attackIntent.composedTwist,
        targetPosition: state.position,
        grid: combatGrid,
        minimumRangeApplies: true,
      });
      if (!options.some((option) => option.available)) {
        reasons[unitId] =
          options.find((option) => option.blockedReason)?.blockedReason ??
          'No weapon can engage';
      }
    }
    return reasons;
  }, [
    attackComposerActive,
    combatGrid,
    selectedUnitId,
    currentState.units,
    unitWeapons,
    unitInfoLookup,
    playerSide,
    attackIntent.composedTwist,
  ]);

  const tokens = useMemo(
    () =>
      buildGameplayTokenProjection({
        currentState,
        config,
        session,
        unitInfoLookup,
        selectedUnitId,
        validTargetIds,
        activeTargetId: attackComposerActive
          ? composerPrimaryTargetId
          : activeTargetId,
        secondaryTargetIds: composerSecondaryTargetIds,
        attackInfeasibleReasonByUnitId,
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
      attackComposerActive,
      attackInfeasibleReasonByUnitId,
      combatGrid,
      composerPrimaryTargetId,
      composerSecondaryTargetIds,
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
  const { tacticalProjectionFrame, movementProjectionByHex } =
    useGameplayTacticalProjection({
      sessionId: session.id,
      mapRadius: config.mapRadius,
      currentState,
      selectedUnitId,
      activeTargetId,
      playerSide,
      tokens,
      hexTerrain,
      movementRange,
      hoverMovementInfo,
      grid: combatGrid,
      unitWeapons,
      selectedWeaponIds,
    });
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
        tacticalProjectionFrame,
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
      tacticalProjectionFrame,
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
  const phaseAdvanceControl = useMemo(
    () =>
      buildPhaseAdvanceControl({
        actionContext,
        shellMode,
        phaseQueueProjection,
        units,
        onAction,
      }),
    [actionContext, onAction, phaseQueueProjection, shellMode, units],
  );
  const controls = useGameplayLayoutControls({
    currentState,
    selectedUnit: selectedUnitModel.selectedUnit,
    selectedUnitId,
    mapInteraction,
    onUnitSelect,
    onHexClick,
  });

  // Movement Intent Composer dock context (tactical-movement-intent-composer,
  // phase 4). Activates in lockstep with the map surface (`intentComposer.
  // composerActive`) so the dock-hosted composer and the map's envelopes /
  // waypoints are the SAME session. Sources the command context (posture
  // legality), runtime capability, and start hex/facing already computed here.
  const composerDockContext = useMemo(
    () => ({
      active: Boolean(intentComposer?.composerActive),
      capability: selectedMovementCapability,
      unit: selectedUnitModel.selectedUnit,
      commandContext: actionContext,
      startHex: selectedUnitModel.selectedUnit?.position ?? null,
      startFacing: selectedUnitModel.selectedUnit?.facing ?? Facing.North,
      movementHeatProfile: selectedMovementCapability?.movementHeatProfile,
    }),
    [
      intentComposer?.composerActive,
      selectedMovementCapability,
      selectedUnitModel.selectedUnit,
      actionContext,
    ],
  );

  // Attack Intent Composer dock context (attack-phase-intent-composer,
  // phase 2). Active during the weapon-attack phase for the local player's
  // selected unit; every rules value the composer renders derives from the
  // session/weapon projections already computed here (heat SSOT movement
  // heat, per-unit dissipation, weapon statuses, live grid).
  const attackComposerContext = useMemo<IAttackComposerContext>(() => {
    const unit = selectedUnitModel.selectedUnit;
    const attackerId = selectedUnitId ?? null;
    return {
      active: Boolean(
        currentState.phase === GamePhase.WeaponAttack &&
        isPlayerTurn &&
        attackerId &&
        unit,
      ),
      attackerId,
      unit: unit ?? null,
      weapons: attackerId ? (unitWeapons[attackerId] ?? []) : [],
      session,
      grid: combatGrid,
      gunnery:
        units.find((candidate) => candidate.id === attackerId)?.gunnery ?? 4,
      heatDissipation: attackerId ? (heatSinks[attackerId] ?? 0) : 0,
      movementHeat: unit ? computeMovementHeat(unit) : 0,
    };
  }, [
    currentState.phase,
    isPlayerTurn,
    selectedUnitId,
    selectedUnitModel.selectedUnit,
    unitWeapons,
    session,
    combatGrid,
    units,
    heatSinks,
  ]);

  return (
    <GameplayLayoutView
      className={className}
      session={session}
      interactiveSession={interactiveSession}
      phaseQueueProjection={phaseQueueProjection}
      shellMode={shellMode}
      gmIntervention={gmIntervention}
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
      tacticalProjectionFrame={tacticalProjectionFrame}
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
      intentComposer={intentComposer}
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
      composerDockContext={composerDockContext}
      attackComposerContext={attackComposerContext}
      phaseAdvanceControl={phaseAdvanceControl}
      onEventLogCollapsedChange={handleEventLogCollapsedChange}
    />
  );
}

export default GameplayLayout;
