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

import { pixelToHex } from '@/constants/hexMap';
import { hexTerrainFromGrid } from '@/engine/GameEngine.helpers';
import { useCameraControls } from '@/hooks/useCameraControls';
import { useGameplayHotkeys } from '@/hooks/useGameplayHotkeys';
import { useAnimationQueue } from '@/stores/useAnimationQueue';
import { useGameplaySelector } from '@/stores/useGameplayStore';
import {
  GameSide,
  ILayoutConfig,
  DEFAULT_LAYOUT_CONFIG,
  getLayoutForPhase,
} from '@/types/gameplay';
import { filterEventsForMovementAnimations } from '@/utils/gameplay/movement/eventLogSync';

import type { GameplayLayoutProps } from './GameplayLayout.types';
import type { MapInteractionState } from './HexMapDisplay/useMapInteraction';

import { ActionBar } from './ActionBar';
import { EventLogDisplay } from './EventLogDisplay';
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
import { PhaseBanner } from './PhaseBanner';

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
  highlightPath = [],
  hoverMpCost,
  hoverUnreachable = false,
  mpLegend,
  interactiveSession,
  playerSide = GameSide.Player,
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

  const visibilityState = useMemo(
    () => ({ ...currentState, sideOwners: session.sideOwners ?? null }),
    [currentState, session.sideOwners],
  );
  const localFogPlayerId =
    session.sideOwners?.[playerSide] ?? playerSide.toString();

  const tokens = useMemo(
    () =>
      buildGameplayTokens({
        currentState,
        config,
        session,
        unitInfoLookup,
        selectedUnitId,
        validTargetIds,
        activeTargetId,
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
      visibilityState,
    ],
  );

  const hexTerrain = useMemo(
    () =>
      interactiveSession
        ? hexTerrainFromGrid(interactiveSession.getGrid())
        : [],
    [interactiveSession],
  );

  // Selected unit data
  const selectedUnit = selectedUnitId
    ? currentState.units[selectedUnitId]
    : null;
  const selectedUnitInfo = selectedUnitId
    ? unitInfoLookup[selectedUnitId]
    : null;
  const selectedUnitFromSession = selectedUnitId
    ? (units.find((u) => u.id === selectedUnitId) ?? null)
    : null;

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
    <div
      className={`flex h-full flex-col bg-gray-100 ${className}`}
      data-testid="gameplay-layout"
    >
      {/* Phase Banner — hosts the drawer toggle in the persistent HUD
          only below the `lg:` breakpoint (§ 1.3). Above that the
          record sheet is always visible and the toggle is
          unnecessary. */}
      <PhaseBanner
        phase={currentState.phase}
        turn={currentState.turn}
        activeSide={currentState.firstMover || GameSide.Player}
        isPlayerTurn={isPlayerTurn}
        drawer={
          isNarrow
            ? {
                isDrawerOpen: drawerOpen,
                onToggleDrawer: handleToggleDrawer,
              }
            : undefined
        }
      />

      {/* Per `add-combat-morale-and-withdrawal` § 4.3: per-side
          in-battle morale readout. `battleMorale` is event-sourced on
          the derived state; defaults to all-`STEADY` for legacy
          sessions whose log predates the morale system. */}
      {currentState.battleMorale && (
        <MoraleIndicator
          battleMorale={currentState.battleMorale}
          className="mx-2 mt-1"
        />
      )}

      {/* Main Content Area */}
      <div
        ref={containerRef}
        className="flex flex-1 overflow-hidden"
        data-testid="gameplay-main-content"
      >
        {/* Map Panel — on narrow layouts we give the map the full
            width because the record sheet lives in an overlay
            drawer. On desktop the width is driven by the resizable
            split-view config. */}
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
            unitWeapons={unitWeapons}
            friendlySide={playerSide}
            highlightPath={highlightPath}
            hoverMpCost={hoverMpCost}
            hoverUnreachable={hoverUnreachable}
            mpLegend={mpLegend}
            onHexClick={handleHexClick}
            onHexHover={onHexHover}
            onTokenClick={handleTokenClick}
            onTokenDoubleClick={handleTokenDoubleClick}
            onInteractionReady={setMapInteraction}
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

        {/* Desktop split-view: resize handle + record sheet panel.
            Hidden below `lg:` (isNarrow) where the drawer takes
            over. */}
        {!isNarrow && (
          <>
            <div
              className="w-1 cursor-col-resize bg-gray-300 transition-colors hover:bg-blue-400"
              onMouseDown={() => setIsDragging(true)}
              data-testid="resize-handle"
            />
            <div
              className="flex-1 overflow-hidden"
              style={{ width: `${100 - layout.mapPanelWidth}%` }}
              data-testid="record-sheet-panel"
            >
              {recordSheetBody}
            </div>
          </>
        )}
      </div>

      {/* Mobile drawer overlay — only mounted below `lg:` when open.
          The backdrop captures outside-clicks to close the drawer,
          matching native mobile-app conventions. `id` wires up to
          PhaseBanner's `aria-controls` for screen readers. */}
      {isNarrow && (
        <RecordSheetDrawer open={drawerOpen} onToggle={handleToggleDrawer}>
          {recordSheetBody}
        </RecordSheetDrawer>
      )}

      {/* Action Bar */}
      <ActionBar
        phase={currentState.phase}
        canUndo={canUndo}
        canAct={isPlayerTurn}
        onAction={onAction}
        infoText={
          interactivePhase ? `Interactive: ${interactivePhase}` : undefined
        }
        trailingActions={
          interactiveSession ? (
            // Per `add-combat-morale-and-withdrawal` § 4.1: the
            // withdraw control + concede button. Extracted into
            // `GameplayLayout.sections` to keep this file under the
            // size cap.
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

      {/* Event Log */}
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
    </div>
  );
}

export default GameplayLayout;
