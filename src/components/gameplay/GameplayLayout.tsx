/**
 * Gameplay Layout Component
 * Main split-view layout for the gameplay interface.
 *
 * @spec openspec/changes/add-gameplay-ui/specs/gameplay-ui/spec.md
 */

import React, {
  useState,
  useCallback,
  useMemo,
  useRef,
  useEffect,
} from 'react';

import type { IPhysicalAttackOption } from '@/utils/gameplay/physicalAttacks/types';

import { pixelToHex } from '@/constants/hexMap';
import { hexTerrainFromGrid } from '@/engine/GameEngine.helpers';
import { usePhaseQueueProjection } from '@/hooks/gameplay';
import { useTacticalLensState } from '@/hooks/gameplay/useTacticalLensState';
import { useCameraControls } from '@/hooks/useCameraControls';
import { useGameplayHotkeys } from '@/hooks/useGameplayHotkeys';
import { useAnimationQueue } from '@/stores/useAnimationQueue';
import { useGameplaySelector } from '@/stores/useGameplayStore';
import { usePhysicalAttackPlanStore } from '@/stores/useGameplayStore.combatFlows';
import {
  GamePhase,
  GameSide,
  ILayoutConfig,
  DEFAULT_LAYOUT_CONFIG,
  getLayoutForPhase,
  MovementType,
  type IMovementRangeHex,
} from '@/types/gameplay';
import { ProtoChassis } from '@/types/unit/ProtoMechInterfaces';
import { deriveValidWeaponTargetIds } from '@/utils/gameplay/combatTargetIds';
import { coordToKey } from '@/utils/gameplay/hexMath';
import { resolveRuntimeMovementCapability } from '@/utils/gameplay/movement';
import { filterEventsForMovementAnimations } from '@/utils/gameplay/movement/eventLogSync';
import { buildPhysicalElevationContext } from '@/utils/gameplay/physicalAttacks/elevation';
import { getEligiblePhysicalAttacks } from '@/utils/gameplay/physicalAttacks/eligibility';
import { buildPhysicalTerrainContext } from '@/utils/gameplay/physicalAttacks/terrain';
import { projectStandUpPsr } from '@/utils/gameplay/standUpRules';

import type { GameplayLayoutProps } from './GameplayLayout.types';
import type { MapInteractionState } from './HexMapDisplay/useMapInteraction';

import { ActionBar } from './ActionBar';
import { EventLogDisplay } from './EventLogDisplay';
import { buildCommandPreviewInputs } from './GameplayLayout.commandPreview';
import {
  HitChancePanel,
  MapOverlayChildren,
  noopInteraction,
  RecordSheetBody,
  RecordSheetDrawer,
  useResponsiveRecordSheet,
  WithdrawalTrailingActions,
} from './GameplayLayout.sections';
import {
  buildEventActorLookup,
  buildEventWeaponLookup,
  buildGameplayTokens,
  buildUnitInfoLookup,
} from './GameplayLayout.viewModel';
import { HexMapDisplay } from './HexMapDisplay';
import { MoraleIndicator } from './MoraleIndicator';
import { PhysicalAttackIntentArrow } from './overlays/PhysicalAttackIntentArrow';
import { TacticalActionDock } from './TacticalActionDock';
import {
  ShellSlot,
  TacticalCommandShell,
  useTacticalShell,
} from './TacticalCommandShell';
import { TacticalLensControls } from './TacticalLensControls';
import { TacticalTurnRail } from './TacticalTurnRail';
import { TacticalUnitInspector } from './TacticalUnitInspector';

export type { GameplayLayoutProps } from './GameplayLayout.types';

// =============================================================================
// DesktopRightTray — inner component that reads inspector state from shell
// context and renders the right-tray slot.
//
// Must be a SEPARATE component (not inlined in GameplayLayout) because
// GameplayLayout is the TacticalCommandShell provider — calling
// useTacticalShell() at its scope level would throw "must be called inside
// a <TacticalCommandShell>". As a child rendered inside the shell tree,
// DesktopRightTray is within context.
// =============================================================================

interface DesktopRightTrayProps {
  readonly selectedUnitId: string | null;
  readonly session: import('@/types/gameplay').IGameSession;
  readonly viewerPlayerId: string;
  readonly viewerSide: import('@/types/gameplay').GameSide;
  readonly mapPanelWidth: number;
  readonly supplemental: import('@/hooks/gameplay/useUnitInspectorProjection').IInspectorSupplementalData;
  /**
   * The legacy rich `RecordSheetBody` rendered as the friendly-unit
   * detail surface. The new `TacticalUnitInspector` is used for opponent
   * units (where its redaction policy matters); friendly units keep the
   * existing full record-sheet rendering until the drawer-based
   * decomposition in §2.2 lands. This preserves existing testids
   * (record-sheet-unit-name, no-unit-selected, heat-tick-*, location-pips-*)
   * that the addInteractiveCombatCoreUI smoke test asserts on.
   */
  readonly friendlyRecordSheet: React.ReactNode;
}

function DesktopRightTray({
  selectedUnitId,
  session,
  viewerPlayerId,
  viewerSide,
  mapPanelWidth,
  supplemental,
  friendlyRecordSheet,
}: DesktopRightTrayProps): React.ReactElement {
  const { state } = useTacticalShell();

  // Wave 7.0 Gate 4: bind to inspectedUnit first, fall back to selectedUnitId.
  // NEVER bind to state.activeUnit — that drives the action dock, not the inspector.
  const inspectedUnitId = state.inspectedUnit ?? selectedUnitId;

  // Determine whether the inspected unit is friendly. Friendly units use
  // the legacy RecordSheetBody (preserves existing testids + drill-down);
  // opponent units use the new TacticalUnitInspector (applies opponent
  // intel redaction per spec).
  const inspectedUnitSide = inspectedUnitId
    ? session.currentState.units[inspectedUnitId]?.side
    : null;
  const isFriendly = inspectedUnitSide === viewerSide;

  return (
    <ShellSlot id="right-tray" ownerId="RecordSheetPanel">
      <div
        className="flex-1 overflow-auto"
        style={{ width: `${100 - mapPanelWidth}%` }}
        data-testid="record-sheet-panel"
      >
        {isFriendly || inspectedUnitId === null ? (
          friendlyRecordSheet
        ) : (
          <TacticalUnitInspector
            inspectedUnitId={inspectedUnitId}
            session={session}
            viewerPlayerId={viewerPlayerId}
            viewerSide={viewerSide}
            opponentVisibilityScopes={state.opponentVisibilityScopes}
            supplemental={supplemental}
          />
        )}
      </div>
    </ShellSlot>
  );
}

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
  const activeAnimations = useAnimationQueue((s) => s.active);
  const queuedAnimations = useAnimationQueue((s) => s.queue);
  // Per `add-attack-phase-ui` § 2.2: subscribe to the locked-in attack
  // target id so the token for that specific unit can render a pulsing
  // red ring (distinct from the static validTarget ring painted on
  // every fireable enemy).
  const activeTargetId = useGameplaySelector((s) => s.attackPlan.targetUnitId);
  const selectedWeaponIds = useGameplaySelector(
    (s) => s.attackPlan.selectedWeapons,
  );
  const physicalAttackPlan = usePhysicalAttackPlanStore(
    (s) => s.physicalAttackPlan,
  );

  // Wave 7.2 PR-E: phase queue projection drives the TacticalTurnRail.
  // The projection is a derived view of session state — it never writes
  // back. Rail clicks call `onUnitSelect` (sets `selectedUnit` only),
  // honoring the Wave 7.0 Gate 4 decoupling: rail selection ≠ active
  // unit, which the engine owns exclusively.
  const phaseQueueProjection = usePhaseQueueProjection();
  const [layout, setLayout] = useState<ILayoutConfig>(DEFAULT_LAYOUT_CONFIG);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Per `add-minimap-and-camera-controls`: capture the map's live
  // `useMapInteraction` state via a bridge callback so the minimap,
  // the `useCameraControls` facade, and the keyboard hotkey layer all
  // drive the same camera. We hold it in state so React re-renders
  // the minimap when pan/zoom change. See HexMapDisplay
  // `onInteractionReady` for the contract.
  const [mapInteraction, setMapInteraction] =
    useState<MapInteractionState | null>(null);

  // Minimap visibility (M hotkey toggles).
  const [minimapVisible, setMinimapVisible] = useState<boolean>(true);

  // Firing-arc overlay toggle (A hotkey) — forwarded into the map's
  // interaction state so arc and LOS visibility can be controlled
  // independently.
  const toggleArcs = useCallback(() => {
    mapInteraction?.setShowFiringArcOverlay((v) => !v);
  }, [mapInteraction]);

  // LOS overlay toggle (L hotkey) — forwarded into the map's
  // interaction state so the existing LOS overlay reacts.
  const toggleLOS = useCallback(() => {
    mapInteraction?.setShowLOSOverlay((v) => !v);
  }, [mapInteraction]);

  // Lens state — tracks active lens preset + intensity. The applyLensLayers
  // side-effect runs via useEffect whenever activeLens or mapInteraction changes.
  const lensState = useTacticalLensState();
  useEffect(() => {
    if (!mapInteraction) return;
    lensState.applyLensLayers((id, visible) =>
      mapInteraction.setLayerVisibility(id, visible),
    );
  }, [lensState.activeLens, mapInteraction, lensState]);

  // Hotkey help overlay (? hotkey).
  const [helpOpen, setHelpOpen] = useState<boolean>(false);
  const { isNarrow, drawerOpen, handleToggleDrawer } =
    useResponsiveRecordSheet();

  // Update layout based on phase
  useEffect(() => {
    const phaseLayout = getLayoutForPhase(currentState.phase);
    setLayout((prev) => ({ ...prev, ...phaseLayout }));
  }, [currentState.phase]);

  const unitInfoLookup = useMemo(() => buildUnitInfoLookup(units), [units]);

  // Per `add-interactive-combat-core-ui` § 11.3: the event log needs
  // unit id → short designation (e.g., "ATL-7K") so each row can
  // render the acting unit inline. `IGameUnit.unitRef` is the
  // canonical source — the same string RecordSheetDisplay uses as
  // the designation line. Fall back to the unit's name if unitRef
  // is missing (older sessions in storage).
  const eventActorLookup = useMemo(() => buildEventActorLookup(units), [units]);

  // Per `add-attack-phase-ui` § 8.1: AttackResolved events now carry a
  // `weaponId`; the event log turns that id into a human label (e.g.,
  // "Medium Laser HIT / MISSED") using this flat map. Built from the
  // already-available `unitWeapons` so each weapon's display name is
  // reachable in O(1).
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
    () => ({
      ...currentState,
      sideOwners: session.sideOwners ?? null,
      ...(combatGrid ? { grid: combatGrid } : {}),
    }),
    [combatGrid, currentState, session.sideOwners],
  );
  const localFogPlayerId =
    session.sideOwners?.[playerSide] ?? playerSide.toString();

  const physicalAttackOptionsByTargetId = useMemo<
    Readonly<Record<string, readonly IPhysicalAttackOption[]>>
  >(() => {
    if (currentState.phase !== GamePhase.PhysicalAttack || !selectedUnitId) {
      return {};
    }
    const attackerState = currentState.units[selectedUnitId] ?? null;
    const attackerBinding = units.find((unit) => unit.id === selectedUnitId);
    if (!attackerState) return {};

    return Object.entries(currentState.units)
      .filter(([, targetState]) => targetState.side !== attackerState.side)
      .filter(([, targetState]) => !targetState.destroyed)
      .reduce<Record<string, readonly IPhysicalAttackOption[]>>(
        (byTargetId, [targetId, targetState]) => {
          const targetBinding = units.find((unit) => unit.id === targetId);
          const options = getEligiblePhysicalAttacks(
            attackerState,
            targetState,
            {
              attackerTonnage: 65,
              attackerPilotingSkill:
                attackerState.piloting ?? attackerBinding?.piloting ?? 5,
              targetTonnage: 65,
              attackerUnitType: attackerBinding?.unitType,
              attackerMovementMode: attackerBinding?.movementMode,
              optionalRules: config.optionalRules,
              targetUnitType: targetBinding?.unitType,
              weaponsFiredFromLeftArm: attackerState.weaponsFiredThisTurn,
              weaponsFiredFromRightArm: attackerState.weaponsFiredThisTurn,
              attackerRanThisTurn:
                attackerState.movementThisTurn === MovementType.Run,
              attackerJumpedThisTurn:
                attackerState.movementThisTurn === MovementType.Jump,
              elevationContext: combatGrid
                ? buildPhysicalElevationContext(
                    attackerState,
                    targetState,
                    combatGrid,
                    {
                      targetUnit: targetBinding,
                    },
                  )
                : undefined,
              terrainContext: combatGrid
                ? buildPhysicalTerrainContext(
                    attackerState,
                    targetState,
                    combatGrid,
                  )
                : undefined,
            },
          );
          byTargetId[targetId] = options;
          return byTargetId;
        },
        {},
      );
  }, [combatGrid, config.optionalRules, currentState, selectedUnitId, units]);

  const validPhysicalTargetIds = useMemo(
    () =>
      Object.entries(physicalAttackOptionsByTargetId)
        .filter(([, options]) =>
          options.some(
            (option) =>
              option.toHit.allowed && option.restrictionsFailed.length === 0,
          ),
        )
        .map(([unitId]) => unitId),
    [physicalAttackOptionsByTargetId],
  );

  const baseTokens = useMemo(
    () =>
      buildGameplayTokens({
        currentState,
        config,
        session,
        unitInfoLookup,
        selectedUnitId,
        validTargetIds:
          currentState.phase === GamePhase.WeaponAttack ? [] : validTargetIds,
        activeTargetId,
        validPhysicalTargetIds,
        activePhysicalTargetId: physicalAttackPlan.targetUnitId,
        playerSide,
        localFogPlayerId,
        visibilityState,
      }),
    [
      activeTargetId,
      config,
      currentState,
      localFogPlayerId,
      playerSide,
      selectedUnitId,
      session,
      unitInfoLookup,
      validTargetIds,
      validPhysicalTargetIds,
      visibilityState,
      physicalAttackPlan.targetUnitId,
    ],
  );

  const validWeaponTargetIds = useMemo(
    () =>
      deriveValidWeaponTargetIds({
        currentState,
        selectedUnitId,
        tokens: baseTokens,
        mapRadius: config.mapRadius,
        grid: combatGrid,
        unitWeapons,
        selectedWeaponIds,
      }),
    [
      baseTokens,
      combatGrid,
      config.mapRadius,
      currentState,
      selectedUnitId,
      selectedWeaponIds,
      unitWeapons,
    ],
  );

  const effectiveValidTargetIds =
    currentState.phase === GamePhase.WeaponAttack && interactiveSession
      ? validWeaponTargetIds
      : validTargetIds;

  const tokens = useMemo(
    () =>
      buildGameplayTokens({
        currentState,
        config,
        session,
        unitInfoLookup,
        selectedUnitId,
        validTargetIds: effectiveValidTargetIds,
        activeTargetId,
        validPhysicalTargetIds,
        activePhysicalTargetId: physicalAttackPlan.targetUnitId,
        playerSide,
        localFogPlayerId,
        visibilityState,
      }),
    [
      activeTargetId,
      config,
      currentState,
      effectiveValidTargetIds,
      localFogPlayerId,
      playerSide,
      selectedUnitId,
      session,
      unitInfoLookup,
      validPhysicalTargetIds,
      visibilityState,
      physicalAttackPlan.targetUnitId,
    ],
  );

  const hexTerrain = useMemo(
    () => (combatGrid ? hexTerrainFromGrid(combatGrid) : []),
    [combatGrid],
  );
  const plannedMovement = useGameplaySelector((s) => s.plannedMovement);

  const movementProjectionByHex = useMemo(() => {
    const byHex: Record<string, IMovementRangeHex> = {};
    for (const projection of movementRange) {
      byHex[coordToKey(projection.hex)] = projection;
    }
    if (hoverMovementInfo) {
      byHex[coordToKey(hoverMovementInfo.hex)] = hoverMovementInfo;
    }
    return byHex;
  }, [hoverMovementInfo, movementRange]);

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
      config.mapRadius,
      config.optionalRules,
      currentState,
      highlightPath,
      hitChance,
      hoveredHex,
      hoverMovementInfo,
      hoverMpCost,
      hoverUnreachable,
      combatGrid,
      physicalAttackPlan.attackType,
      physicalAttackPlan.limb,
      physicalAttackPlan.targetUnitId,
      selectedUnitId,
      selectedWeaponIds,
      tokens,
      units,
      unitWeapons,
    ],
  );

  // Selected unit data
  const selectedUnit = selectedUnitId
    ? currentState.units[selectedUnitId]
    : null;
  const selectedUnitMapHex =
    combatGrid && selectedUnit
      ? (combatGrid.hexes.get(coordToKey(selectedUnit.position)) ?? null)
      : null;
  const selectedUnitInfo = selectedUnitId
    ? unitInfoLookup[selectedUnitId]
    : null;
  const selectedUnitFromSession = selectedUnitId
    ? (units.find((u) => u.id === selectedUnitId) ?? null)
    : null;
  const selectedMovementCapability = useMemo(() => {
    if (!interactiveSession || !selectedUnitId) return null;
    const capability = interactiveSession.getMovementCapability(selectedUnitId);
    if (!capability || !selectedUnit) return capability;
    return (
      resolveRuntimeMovementCapability(selectedUnit, capability) ?? capability
    );
  }, [interactiveSession, selectedUnit, selectedUnitId]);
  const selectedStandUpImpossibleReason = selectedUnit?.prone
    ? projectStandUpPsr({
        unitState: selectedUnit,
        unitPiloting: selectedUnit.piloting,
        unitType: selectedUnitFromSession?.unitType,
      }).impossibleReason
    : undefined;

  // Handle panel resize
  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging || !containerRef.current) return;

      const rect = containerRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const percentage = (x / rect.width) * 100;
      const clamped = Math.max(20, Math.min(80, percentage));

      setLayout((prev) => ({ ...prev, mapPanelWidth: clamped }));
    },
    [isDragging],
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  // Handle token click
  const handleTokenClick = useCallback(
    (unitId: string) => {
      onUnitSelect(unitId === selectedUnitId ? null : unitId);
    },
    [selectedUnitId, onUnitSelect],
  );

  // Handle hex click
  const handleHexClick = useCallback(
    (hex: { q: number; r: number }) => {
      onHexClick?.(hex);
    },
    [onHexClick],
  );

  // Per `add-minimap-and-camera-controls` § 7 (Unit Focus): a double-
  // click on a token selects the unit AND centers the camera on its
  // hex. Selection and focus are separate concerns (§ 7.4 requires
  // both). We look up the unit's current position from the live state
  // bag so this works regardless of whether the token was already
  // selected.
  const handleTokenDoubleClick = useCallback(
    (unitId: string) => {
      const unitState = currentState.units[unitId];
      if (!unitState || !unitState.position) return;
      onUnitSelect(unitId);
      mapInteraction?.centerOn(unitState.position, {
        animate: true,
        bumpLowZoom: true,
      });
    },
    [currentState.units, onUnitSelect, mapInteraction],
  );

  // Camera facade — only meaningful once the HexMapDisplay has
  // mounted and published its interaction. A no-op stub keeps the
  // hook contract stable while mapInteraction is still null (first
  // render), so we don't violate the Rules of Hooks with a
  // conditional hook call.
  const camera = useCameraControls(mapInteraction ?? noopInteraction);

  // Minimap and hotkey callbacks — declared as stable useCallbacks so
  // the hotkey hook's dep array doesn't churn on every render.
  const handleToggleMinimap = useCallback(
    () => setMinimapVisible((v) => !v),
    [],
  );
  const handleToggleHelp = useCallback(() => setHelpOpen((v) => !v), []);
  const handleEscape = useCallback(() => {
    setHelpOpen(false);
  }, []);
  const handleCloseHelp = useCallback(() => setHelpOpen(false), []);

  // Selected unit's hex — fed to Space hotkey (recenter on selection).
  const selectedUnitHex = selectedUnit?.position ?? null;

  useGameplayHotkeys({
    camera,
    selectedUnitHex,
    onToggleMinimap: handleToggleMinimap,
    onToggleArcs: toggleArcs,
    onToggleLOS: toggleLOS,
    onToggleHelp: handleToggleHelp,
    onEscape: handleEscape,
    modalOpen: helpOpen,
    enabled: mapInteraction !== null,
  });

  // Minimap click → center camera. The minimap delivers a world-space
  // point; we convert to an axial hex via the same math the main map
  // uses for pixel→hex, then hand off to camera.centerOn.
  const handleMinimapCenterAt = useCallback(
    (world: { x: number; y: number }) => {
      const hex = pixelToHex(world.x, world.y);
      camera.centerOn(hex);
    },
    [camera],
  );

  // Minimap drag on the viewport rectangle → continuous pan. The
  // minimap emits world-space delta; we feed it straight into panBy.
  // `panBy` already takes screen-pixel deltas in the map's space,
  // and the world-delta from the minimap IS that space (SVG uses
  // world units as its drawing unit), so no scaling is needed.
  const handleMinimapDragPan = useCallback(
    (worldDelta: { x: number; y: number }) => {
      camera.panBy(-worldDelta.x, -worldDelta.y);
    },
    [camera],
  );

  // Per `add-interactive-combat-core-ui` § 4.1/§ 4.2/§ 8: the record
  // sheet pane is rendered in two different containers (desktop split
  // view vs mobile drawer). Factor the body into a single
  // expression so there is exactly one source of truth for the unit
  // projection — both layouts pass the same `side`, `chassis`,
  // `tonnage`, `spas` props. Chassis falls back to the unit name
  // when no explicit chassis is available; tonnage is omitted when
  // not present on the unit record (IGameUnit currently has no
  // tonnage field — see task 4.2 note in design.md).
  const recordSheetBody = (
    <RecordSheetBody
      selectedUnitId={selectedUnitId}
      selectedUnit={selectedUnit}
      selectedUnitInfo={selectedUnitInfo}
      selectedUnitFromSession={selectedUnitFromSession}
      maxArmor={maxArmor}
      maxStructure={maxStructure}
      unitWeapons={unitWeapons}
      pilotNames={pilotNames}
      heatSinks={heatSinks}
      unitSpas={unitSpas}
      visibleEvents={visibleEvents}
    />
  );

  return (
    // Wave 7.1 PR-B: TacticalCommandShell is a logical context provider —
    // it has zero visible chrome. The existing flex tree below is
    // unchanged; ShellSlot wrappers are React Fragments that register
    // slot ownership in `useEffect` without adding DOM. This preserves
    // every data-testid the Wave 7.0 e2e gate test
    // (`e2e/gameplay-layout-slots.spec.ts`) asserts, so the gate stays
    // green through the migration and catches any parallel-hierarchy
    // regression (Council Momus Attack #4).
    <TacticalCommandShell
      viewerPlayerId={localFogPlayerId}
      shellMode={shellMode}
      sessionId={session.id}
    >
      <div
        className={`flex h-full flex-col bg-gray-100 ${className}`}
        data-testid="gameplay-layout"
      >
        {/* Phase Banner — hosts the drawer toggle in the persistent HUD
            only below the `lg:` breakpoint (§ 1.3). Above that the
            record sheet is always visible and the toggle is
            unnecessary. */}
        {/* Wave 7.2 PR-E: TacticalTurnRail replaces PhaseBanner as the
            top-band owner. Rail surfaces phase + round + initiative-
            ordered unit tokens with skipped/completed/destroyed/withdrawn
            visual states. Wave 7.0 Gate 4 invariant: `onUnitSelect` sets
            `selectedUnit` only — never `activeUnit` (engine-owned). */}
        <ShellSlot id="top-band" ownerId="TacticalTurnRail">
          <TacticalTurnRail
            projection={phaseQueueProjection}
            gameUnits={units}
            unitStates={currentState.units}
            shellMode={shellMode}
            turn={currentState.turn}
            phase={currentState.phase}
            selectedUnitId={selectedUnitId}
            onUnitSelect={onUnitSelect}
            drawer={
              isNarrow
                ? {
                    isDrawerOpen: drawerOpen,
                    onToggleDrawer: handleToggleDrawer,
                  }
                : undefined
            }
          />
        </ShellSlot>

        {/* Per `add-combat-morale-and-withdrawal` § 4.3: per-side
            in-battle morale readout. `battleMorale` is event-sourced on
            the derived state; defaults to all-`STEADY` for legacy
            sessions whose log predates the morale system. */}
        {currentState.battleMorale && (
          <ShellSlot id="morale-band" ownerId="MoraleIndicator">
            <MoraleIndicator
              battleMorale={currentState.battleMorale}
              className="mx-2 mt-1"
            />
          </ShellSlot>
        )}

        {/* Main Content Area */}
        <div
          ref={containerRef}
          className="flex flex-1 overflow-hidden"
          data-testid="gameplay-main-content"
        >
          {/* Left Tray — lens controls + future map-nav widgets.
              ShellSlot is a React Fragment; the inner div adds the
              visible strip. Hidden on narrow layouts to preserve
              the full-width map experience. */}
          {!isNarrow && (
            <ShellSlot id="left-tray" ownerId="TacticalLensControls">
              <div className="flex w-28 flex-shrink-0 flex-col border-r border-gray-200 bg-white">
                <TacticalLensControls
                  activeLens={lensState.activeLens}
                  onLensChange={lensState.setActiveLens}
                  lensIntensity={lensState.lensIntensity}
                  onIntensityChange={lensState.setLensIntensity}
                />
              </div>
            </ShellSlot>
          )}

          {/* Map Panel — on narrow layouts we give the map the full
              width because the record sheet lives in an overlay
              drawer. On desktop the width is driven by the resizable
              split-view config. */}
          <ShellSlot id="map-center" ownerId="HexMapDisplay">
            <div
              className="relative"
              style={{ width: isNarrow ? '100%' : `${layout.mapPanelWidth}%` }}
              data-testid="map-panel"
            >
              <HexMapDisplay
                radius={config.mapRadius}
                tokens={tokens}
                mapId={session.id}
                events={visibleEvents}
                selectedHex={selectedUnit?.position || null}
                hexTerrain={hexTerrain}
                movementRange={movementRange}
                targetUnitId={activeTargetId}
                unitWeapons={unitWeapons}
                selectedWeaponIds={selectedWeaponIds}
                combatState={currentState}
                friendlySide={playerSide}
                highlightPath={highlightPath}
                hoverMpCost={hoverMpCost}
                hoverUnreachable={hoverUnreachable}
                mpLegend={mpLegend}
                onMovementModeSelect={onMovementModeSelect}
                onHexClick={handleHexClick}
                onHexHover={onHexHover}
                onTokenClick={handleTokenClick}
                onTokenDoubleClick={handleTokenDoubleClick}
                onInteractionReady={setMapInteraction}
                svgOverlayChildren={
                  physicalAttackIntent ? (
                    <PhysicalAttackIntentArrow
                      {...physicalAttackIntent}
                      side={selectedUnit?.side ?? playerSide}
                      testId="physical-attack-intent-arrow"
                    />
                  ) : null
                }
                // TODO PR-C: MapOverlayChildren contains the minimap-cluster
                // slot owner; register it via its own ShellSlot once the
                // overlay-children prop contract is reworked to allow
                // sibling slot registration alongside the SVG portal.
                overlayChildren={
                  <MapOverlayChildren
                    mapRadius={config.mapRadius}
                    tokens={tokens}
                    camera={{ zoom: camera.zoom, pan: camera.pan }}
                    onCenterAt={handleMinimapCenterAt}
                    onDragPan={handleMinimapDragPan}
                    minimapVisible={minimapVisible}
                    helpOpen={helpOpen}
                    onCloseHelp={handleCloseHelp}
                  />
                }
                className="h-full"
              />
              {interactivePhase && <HitChancePanel hitChance={hitChance} />}
            </div>
          </ShellSlot>

          {/* Desktop split-view: resize handle + inspector right tray.
              Hidden below `lg:` (isNarrow) where the mobile drawer takes
              over. DesktopRightTray is a child component so it can safely
              call useTacticalShell() from within the shell context tree. */}
          {!isNarrow && (
            <>
              <div
                className="w-1 cursor-col-resize bg-gray-300 transition-colors hover:bg-blue-400"
                onMouseDown={() => setIsDragging(true)}
                data-testid="resize-handle"
              />
              <DesktopRightTray
                selectedUnitId={selectedUnitId}
                session={session}
                viewerPlayerId={localFogPlayerId}
                viewerSide={playerSide}
                mapPanelWidth={layout.mapPanelWidth}
                supplemental={{
                  pilotNames,
                  unitWeapons,
                  maxArmor,
                  maxStructure,
                  heatSinks,
                }}
                friendlyRecordSheet={recordSheetBody}
              />
            </>
          )}
        </div>

        {/* Mobile drawer overlay — only mounted below `lg:` when open.
            The backdrop captures outside-clicks to close the drawer,
            matching native mobile-app conventions. `id` wires up to
            PhaseBanner's `aria-controls` for screen readers. */}
        {isNarrow && (
          <ShellSlot id="mobile-drawer" ownerId="RecordSheetDrawer">
            <RecordSheetDrawer open={drawerOpen} onToggle={handleToggleDrawer}>
              {recordSheetBody}
            </RecordSheetDrawer>
          </ShellSlot>
        )}

        {/* Action Bar — Wave 7.2 PR-D wired the TacticalActionDock
            as the primary command surface inside the bottom-dock slot.
            The legacy ActionBar is retained as a HIDDEN compatibility
            mount so the existing per-action data-testids (e.g.
            `action-btn-lock`) continue to satisfy older e2e specs
            until they migrate to `command-btn-*`. The slot itself is
            unchanged so the gateway-spec assertions still hold. */}
        <ShellSlot id="bottom-dock" ownerId="TacticalActionDock">
          <TacticalActionDock
            ctx={{
              // Bind to activeUnit (whose turn it is), NOT selectedUnit
              // — Wave 7.0 Gate 4. selectedUnit drives map highlight,
              // not command dispatch. For now the host treats the
              // current selection as the active unit while the
              // engine-side activeUnit projection is wired in a later
              // wave; the SEPARATE field on context is what matters
              // for the contract.
              // TODO(wave-8): gate by viewerPlayerId === activeUnit.ownerId
              activeUnitId: selectedUnitId,
              selectedUnitId,
              targetUnitId: activeTargetId ?? null,
              targetCombatProjection: activeTargetId
                ? (commandPreviewInputs.combatInfoByTargetId?.[
                    activeTargetId
                  ] ?? commandPreviewInputs.combatInfo)
                : null,
              combatProjectionByTargetId:
                commandPreviewInputs.combatInfoByTargetId,
              targetMovementProjection:
                commandPreviewInputs.movementInfo ?? null,
              movementProjectionByHex,
              targetPhysicalAttackOptions: physicalAttackPlan.targetUnitId
                ? (physicalAttackOptionsByTargetId[
                    physicalAttackPlan.targetUnitId
                  ] ?? null)
                : null,
              physicalAttackOptionsByTargetId,
              hoveredHex: null,
              phase: currentState.phase,
              canAct: isPlayerTurn,
              activeUnitProne: selectedUnit?.prone ?? false,
              activeUnitHullDown: selectedUnit?.hullDown ?? false,
              activeUnitLockState: selectedUnit?.lockState,
              activeUnitHeat: selectedUnit?.heat ?? 0,
              activeUnitHasPlannedMovement: Boolean(
                plannedMovement &&
                (!plannedMovement.unitId ||
                  plannedMovement.unitId === selectedUnit?.id),
              ),
              activeUnitConversionMode: selectedUnit?.conversionMode,
              activeUnitVehicleMotionType:
                selectedUnit?.combatState?.kind === 'vehicle'
                  ? selectedUnit.combatState.state.motionType
                  : undefined,
              activeUnitVehicleAltitude:
                selectedUnit?.combatState?.kind === 'vehicle'
                  ? (selectedUnit.combatState.state.altitude ?? 0)
                  : undefined,
              activeUnitProtoGlider:
                selectedUnit?.combatState?.kind === 'proto'
                  ? selectedUnit.combatState.state.chassisType ===
                    ProtoChassis.GLIDER
                  : undefined,
              activeUnitProtoAltitude:
                selectedUnit?.combatState?.kind === 'proto'
                  ? (selectedUnit.combatState.state.altitude ?? 0)
                  : undefined,
              activeUnitLamAirMekAltitude: selectedUnit?.lamAirMekAltitude,
              activeUnitTerrain: selectedUnitMapHex?.terrain,
              activeUnitElevation: selectedUnitMapHex?.elevation,
              activeUnitInfantryMounted: selectedUnit?.infantryMounted,
              activeUnitInfantryMountHeight: selectedUnit?.infantryMountHeight,
              activeUnitStandUpImpossibleReason:
                selectedStandUpImpossibleReason,
              activeUnitComponentDamage: selectedUnit?.componentDamage,
              activeUnitGyroType: selectedUnit?.gyroType,
              activeUnitDestroyedLocations: selectedUnit?.destroyedLocations,
              optionalRules: session.config.optionalRules,
              movementCapability: selectedMovementCapability,
            }}
            shellMode={shellMode}
            onAction={onAction}
            previewInputs={commandPreviewInputs}
            infoText={
              interactivePhase ? `Interactive: ${interactivePhase}` : undefined
            }
            trailingActions={
              interactiveSession ? (
                <WithdrawalTrailingActions
                  interactiveSession={interactiveSession}
                  sessionId={session.id}
                  playerSide={playerSide}
                  selectedUnit={selectedUnit}
                  isPlayerTurn={isPlayerTurn}
                />
              ) : undefined
            }
          />
          {/* Legacy ActionBar — kept rendered so the existing
              `data-testid="action-bar"` + `action-btn-*` testids
              still resolve for the unmigrated e2e specs. Once those
              specs migrate to `tactical-action-dock` + `command-btn-*`
              this hidden mount can drop. */}
          <div className="hidden" data-testid="legacy-action-bar-mount">
            <ActionBar
              phase={currentState.phase}
              canUndo={canUndo}
              canAct={isPlayerTurn}
              onAction={onAction}
            />
          </div>
        </ShellSlot>

        {/* Event Log */}
        <ShellSlot id="feed" ownerId="EventLogDisplay">
          <EventLogDisplay
            events={visibleEvents}
            collapsed={layout.eventLogCollapsed}
            onCollapsedChange={(collapsed) =>
              setLayout((prev) => ({ ...prev, eventLogCollapsed: collapsed }))
            }
            maxHeight={150}
            actorLookup={eventActorLookup}
            weaponLookup={eventWeaponLookup}
          />
        </ShellSlot>
      </div>
    </TacticalCommandShell>
  );
}

export default GameplayLayout;
