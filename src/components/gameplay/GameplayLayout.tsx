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
} from "react";

import type { InteractiveSession } from "@/engine/InteractiveSession";
import type { InteractivePhase } from "@/stores/useGameplayStore";

import { pixelToHex } from "@/constants/hexMap";
import { useCameraControls } from "@/hooks/useCameraControls";
import { useGameplayHotkeys } from "@/hooks/useGameplayHotkeys";
import { useGameplayStore } from "@/stores/useGameplayStore";
import {
  GamePhase,
  GameSide,
  IGameSession,
  IHexCoordinate,
  IPilotSpaSummary,
  IUnitGameState,
  IUnitToken,
  ILayoutConfig,
  IWeaponStatus,
  IMovementRangeHex,
  DEFAULT_LAYOUT_CONFIG,
  getLayoutForPhase,
} from "@/types/gameplay";

import type { MapInteractionState } from "./HexMapDisplay/useMapInteraction";

import { ActionBar } from "./ActionBar";
import { ConcedeButton } from "./ConcedeButton";
import { EventLogDisplay } from "./EventLogDisplay";
import { HotkeyHelpOverlay, HotkeyHintBadge } from "./help/HotkeyHelpOverlay";
import { HexMapDisplay } from "./HexMapDisplay";
import { Minimap } from "./minimap/Minimap";
import { PhaseBanner } from "./PhaseBanner";
import { RecordSheetDisplay } from "./RecordSheetDisplay";

// No-op stub passed to `useCameraControls` before HexMapDisplay has
// published its live interaction state. Keeps the hook contract
// stable (no conditional hook call) and ensures camera actions that
// arrive during the initial render are harmless no-ops. The shape
// mirrors MapInteractionState so TypeScript is satisfied; consumers
// should treat the `enabled` flag as authoritative.
const noopInteraction: MapInteractionState = {
  svgRef: { current: null },
  transformedViewBox: "0 0 0 0",
  viewBox: { x: 0, y: 0, width: 0, height: 0 },
  zoom: 1,
  pan: { x: 0, y: 0 },
  setZoom: () => {},
  setPan: () => {},
  showMovementOverlay: false,
  setShowMovementOverlay: () => {},
  showCoverOverlay: false,
  setShowCoverOverlay: () => {},
  showLOSOverlay: false,
  setShowLOSOverlay: () => {},
  panBy: () => {},
  zoomTo: () => {},
  centerOn: () => {},
  handleWheel: () => {},
  handleMouseDown: () => {},
  handleMouseMove: () => {},
  handleMouseUp: () => {},
  handleTouchStart: () => {},
  handleTouchMove: () => {},
  handleTouchEnd: () => {},
};

// =============================================================================
// Types
// =============================================================================

export interface GameplayLayoutProps {
  /** Game session data */
  session: IGameSession;
  /** Currently selected unit ID */
  selectedUnitId: string | null;
  /** Callback when unit is selected */
  onUnitSelect: (unitId: string | null) => void;
  /** Callback when action is triggered */
  onAction: (actionId: string) => void;
  /** Callback when hex is clicked */
  onHexClick?: (hex: { q: number; r: number }) => void;
  /** Can the player undo? */
  canUndo?: boolean;
  /** Is it the player's turn? */
  isPlayerTurn?: boolean;
  /** Unit weapon data for record sheet */
  unitWeapons?: Record<string, readonly IWeaponStatus[]>;
  /** Max armor values per unit */
  maxArmor?: Record<string, Record<string, number>>;
  /** Max structure values per unit */
  maxStructure?: Record<string, Record<string, number>>;
  /** Pilot names per unit */
  pilotNames?: Record<string, string>;
  /** Heat sinks per unit */
  heatSinks?: Record<string, number>;
  /**
   * Per `add-interactive-combat-core-ui` § 8: SPA projection per
   * unit. Keyed by unit id → list of SPA summaries. Missing key is
   * treated as an empty list (renders "No SPAs" placeholder).
   */
  unitSpas?: Record<string, readonly IPilotSpaSummary[]>;
  /** Interactive mode phase (if in interactive mode) */
  interactivePhase?: InteractivePhase;
  /** Hit chance for current attack setup */
  hitChance?: number | null;
  /** Valid target unit IDs */
  validTargetIds?: readonly string[];
  /** Movement range hexes for map display */
  movementRange?: readonly IMovementRangeHex[];
  /**
   * Per `add-movement-phase-ui` § 4.1: hovered-path preview — the
   * in-progress A* path from the selected unit to the currently
   * hovered reachable hex. Rendered by the HexMapDisplay as a
   * highlighted path overlay.
   */
  highlightPath?: readonly IHexCoordinate[];
  /**
   * Per `add-movement-phase-ui` § 4.3: cumulative MP cost of the
   * previewed path. Surfaced as a badge at the hovered destination.
   */
  hoverMpCost?: number;
  /**
   * Per `add-movement-phase-ui` § 4.4: `true` when the user hovers a
   * hex outside the reachable set — drives the shared "Unreachable"
   * tooltip on the map.
   */
  hoverUnreachable?: boolean;
  /**
   * Per `add-movement-phase-ui` task 10.1: per-MP-type legend shown in
   * the map's bottom-left corner during the Movement phase.
   */
  mpLegend?: {
    readonly active: "walk" | "run" | "jump";
    readonly jumpAvailable: boolean;
  };
  /**
   * Hover callback — parent uses this to drive path preview + MP
   * badge + unreachable tooltip computations.
   */
  onHexHover?: (hex: IHexCoordinate | null) => void;
  /**
   * Live interactive session — when present, the layout mounts the
   * always-visible Concede button in the action bar's trailing slot
   * and routes to `/gameplay/games/[id]/victory` on `GameEnded`.
   *
   * @spec openspec/changes/add-victory-and-post-battle-summary/tasks.md § 1.3
   */
  interactiveSession?: InteractiveSession;
  /** Player side controlling this UI (defaults to GameSide.Player). */
  playerSide?: GameSide;
  /** Optional className for styling */
  className?: string;
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Convert unit state to display token.
 */
function unitStateToToken(
  unitId: string,
  state: IUnitGameState,
  unitInfo: { name: string; side: GameSide },
  isSelected: boolean,
  isValidTarget: boolean,
  isActiveTarget: boolean,
): IUnitToken {
  // Generate a short designation from the unit name
  const designation = unitInfo.name
    .split(/[\s-]+/)
    .map((word) => word[0])
    .join("")
    .toUpperCase()
    .slice(0, 4);

  return {
    unitId,
    name: unitInfo.name,
    side: unitInfo.side,
    position: state.position,
    facing: state.facing,
    isSelected,
    isValidTarget,
    isActiveTarget,
    isDestroyed: state.destroyed,
    designation,
  };
}

// =============================================================================
// Component
// =============================================================================

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
  className = "",
}: GameplayLayoutProps): React.ReactElement {
  const { currentState, events, config, units } = session;
  // Per `add-attack-phase-ui` § 2.2: subscribe to the locked-in attack
  // target id so the token for that specific unit can render a pulsing
  // red ring (distinct from the static validTarget ring painted on
  // every fireable enemy).
  const activeTargetId = useGameplayStore((s) => s.attackPlan.targetUnitId);
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

  // Firing-arc overlay toggle (A hotkey). The arc overlay itself is
  // defined in a sibling change; we track the toggle state here so
  // the hotkey works consistently across phases even when the arc
  // renderer is absent — the state bleeds into a data-attribute so
  // future overlays can subscribe without new plumbing.
  const [_arcsVisible, setArcsVisible] = useState<boolean>(false);

  // LOS overlay toggle (L hotkey) — forwarded into the map's
  // interaction state so the existing LOS overlay reacts.
  const toggleLOS = useCallback(() => {
    mapInteraction?.setShowLOSOverlay((v) => !v);
  }, [mapInteraction]);

  // Hotkey help overlay (? hotkey).
  const [helpOpen, setHelpOpen] = useState<boolean>(false);

  // Per `add-interactive-combat-core-ui` § 1.3: on viewports narrower
  // than `lg:` (1024px) the record-sheet pane collapses into a
  // drawer. We track the current breakpoint in state so React can
  // swap the layout idiom (split view ↔ drawer overlay) and so the
  // PhaseBanner knows whether to mount its toggle button. The
  // `matchMedia` listener is the canonical reactive way to do this
  // without polling.
  const [isNarrow, setIsNarrow] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.innerWidth < 1024;
  });
  const [drawerOpen, setDrawerOpen] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(max-width: 1023.98px)");
    const update = () => setIsNarrow(mq.matches);
    update();
    // Older Safari uses addListener; prefer addEventListener where
    // available (Chromium/Firefox/modern Safari). Type-guard so we
    // don't crash in jsdom test envs where only one shape exists.
    if (typeof mq.addEventListener === "function") {
      mq.addEventListener("change", update);
      return () => mq.removeEventListener("change", update);
    }
    const legacy = mq as MediaQueryList & {
      addListener?: (cb: () => void) => void;
      removeListener?: (cb: () => void) => void;
    };
    legacy.addListener?.(update);
    return () => legacy.removeListener?.(update);
  }, []);

  // Close the drawer automatically when we grow back to desktop so
  // the split view isn't rendered behind a lingering overlay. Also
  // close when the selection is cleared so the drawer empty-state
  // doesn't block the map for no reason.
  useEffect(() => {
    if (!isNarrow) setDrawerOpen(false);
  }, [isNarrow]);

  const handleToggleDrawer = useCallback(() => {
    setDrawerOpen((open) => !open);
  }, []);

  // Update layout based on phase
  useEffect(() => {
    const phaseLayout = getLayoutForPhase(currentState.phase);
    setLayout((prev) => ({ ...prev, ...phaseLayout }));
  }, [currentState.phase]);

  // Build unit info lookup
  const unitInfoLookup = useMemo(() => {
    const lookup: Record<string, { name: string; side: GameSide }> = {};
    for (const unit of units) {
      lookup[unit.id] = { name: unit.name, side: unit.side };
    }
    return lookup;
  }, [units]);

  // Per `add-interactive-combat-core-ui` § 11.3: the event log needs
  // unit id → short designation (e.g., "ATL-7K") so each row can
  // render the acting unit inline. `IGameUnit.unitRef` is the
  // canonical source — the same string RecordSheetDisplay uses as
  // the designation line. Fall back to the unit's name if unitRef
  // is missing (older sessions in storage).
  const eventActorLookup = useMemo(() => {
    const lookup: Record<string, string> = {};
    for (const unit of units) {
      lookup[unit.id] = unit.unitRef || unit.name;
    }
    return lookup;
  }, [units]);

  // Per `add-attack-phase-ui` § 8.1: AttackResolved events now carry a
  // `weaponId`; the event log turns that id into a human label (e.g.,
  // "Medium Laser HIT / MISSED") using this flat map. Built from the
  // already-available `unitWeapons` so each weapon's display name is
  // reachable in O(1).
  const eventWeaponLookup = useMemo(() => {
    const lookup: Record<string, string> = {};
    for (const weapons of Object.values(unitWeapons)) {
      for (const weapon of weapons) {
        lookup[weapon.id] = weapon.name;
      }
    }
    return lookup;
  }, [unitWeapons]);

  const tokens = useMemo(() => {
    return Object.entries(currentState.units).map(([unitId, state]) => {
      const unitInfo = unitInfoLookup[unitId] || {
        name: "Unknown",
        side: GameSide.Player,
      };
      const isSelected = unitId === selectedUnitId;
      const isValidTarget =
        validTargetIds.includes(unitId) ||
        (currentState.phase === GamePhase.WeaponAttack &&
          unitInfo.side === GameSide.Opponent &&
          !state.destroyed);
      // Per `add-attack-phase-ui` § 2.2 + spec scenario "Target ring only
      // in Weapon Attack phase": only the token whose id matches the
      // locked-in target AND only while the WeaponAttack phase is
      // actually active gets the pulsing red ring.
      const isActiveTarget =
        currentState.phase === GamePhase.WeaponAttack &&
        activeTargetId !== null &&
        unitId === activeTargetId;

      return unitStateToToken(
        unitId,
        state,
        unitInfo,
        isSelected,
        isValidTarget,
        isActiveTarget,
      );
    });
  }, [
    currentState,
    unitInfoLookup,
    selectedUnitId,
    validTargetIds,
    activeTargetId,
  ]);

  // Selected unit data
  const selectedUnit = selectedUnitId
    ? currentState.units[selectedUnitId]
    : null;
  const selectedUnitInfo = selectedUnitId
    ? unitInfoLookup[selectedUnitId]
    : null;
  const selectedUnitFromSession = selectedUnitId
    ? units.find((u) => u.id === selectedUnitId)
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
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
      return () => {
        window.removeEventListener("mousemove", handleMouseMove);
        window.removeEventListener("mouseup", handleMouseUp);
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
  const handleToggleArcs = useCallback(() => setArcsVisible((v) => !v), []);
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
    onToggleArcs: handleToggleArcs,
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
  const recordSheetBody =
    selectedUnit && selectedUnitInfo && selectedUnitFromSession ? (
      <RecordSheetDisplay
        unitName={selectedUnitInfo.name}
        designation={selectedUnitFromSession.unitRef}
        state={selectedUnit}
        maxArmor={maxArmor[selectedUnitId!] || {}}
        maxStructure={maxStructure[selectedUnitId!] || {}}
        weapons={unitWeapons[selectedUnitId!] || []}
        pilotName={pilotNames[selectedUnitId!] || "Unknown Pilot"}
        gunnery={selectedUnitFromSession.gunnery}
        piloting={selectedUnitFromSession.piloting}
        heatSinks={heatSinks[selectedUnitId!] || 10}
        side={selectedUnitInfo.side}
        chassis={selectedUnitInfo.name}
        spas={selectedUnitId ? (unitSpas[selectedUnitId] ?? []) : []}
        unitId={selectedUnitId ?? undefined}
        events={events}
        className="h-full"
      />
    ) : (
      <div
        className="flex h-full items-center justify-center text-gray-500"
        data-testid="no-unit-selected"
      >
        <p>Select a unit to view its status</p>
      </div>
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
          style={{ width: isNarrow ? "100%" : `${layout.mapPanelWidth}%` }}
          data-testid="map-panel"
        >
          <HexMapDisplay
            radius={config.mapRadius}
            tokens={tokens}
            selectedHex={selectedUnit?.position || null}
            movementRange={movementRange}
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
              <>
                {/* Minimap — top-right panel driven by the main
                    camera's live pan/zoom. Receives callbacks that
                    route clicks and drags back through the same
                    camera facade the keyboard uses. */}
                <Minimap
                  radius={config.mapRadius}
                  tokens={tokens}
                  camera={{ zoom: camera.zoom, pan: camera.pan }}
                  onCenterAt={handleMinimapCenterAt}
                  onDragPan={handleMinimapDragPan}
                  visible={minimapVisible}
                />

                {/* Hotkey help overlay — `?` opens, Esc/`?` closes.
                    Rendered here so it stacks above the map but below
                    global modals (if any). */}
                <HotkeyHelpOverlay open={helpOpen} onClose={handleCloseHelp} />

                {/* First-session prompt — fades out after 8s or on
                    first help open. HotkeyHintBadge self-reads the
                    localStorage flag set by HotkeyHelpOverlay. */}
                <HotkeyHintBadge />
              </>
            }
            className="h-full"
          />
          {interactivePhase &&
            hitChance !== undefined &&
            hitChance !== null && (
              <div
                className="absolute bottom-4 left-4 rounded-lg bg-gray-900/90 px-4 py-3 text-white shadow-lg"
                data-testid="hit-chance-panel"
              >
                <div className="text-xs tracking-wider text-gray-400 uppercase">
                  Hit Chance
                </div>
                <div className="text-2xl font-bold text-amber-400">
                  {hitChance}%
                </div>
              </div>
            )}
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
      {isNarrow && drawerOpen && (
        <>
          <div
            className="fixed inset-0 z-30 bg-black/40"
            onClick={handleToggleDrawer}
            data-testid="record-sheet-drawer-backdrop"
            aria-hidden="true"
          />
          <aside
            id="record-sheet-drawer"
            className="fixed inset-y-0 right-0 z-40 flex w-full max-w-md flex-col bg-white shadow-xl"
            role="dialog"
            aria-label="Unit record sheet"
            data-testid="record-sheet-drawer"
          >
            <div className="flex items-center justify-between border-b border-gray-200 px-4 py-2">
              <h2 className="text-sm font-semibold tracking-wide text-gray-600 uppercase">
                Record Sheet
              </h2>
              <button
                type="button"
                onClick={handleToggleDrawer}
                className="rounded px-2 py-1 text-sm text-gray-600 hover:bg-gray-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-500"
                data-testid="record-sheet-drawer-close"
                aria-label="Close record sheet"
              >
                Close
              </button>
            </div>
            <div className="flex-1 overflow-hidden">{recordSheetBody}</div>
          </aside>
        </>
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
            <ConcedeButton
              interactiveSession={interactiveSession}
              sessionId={session.id}
              playerSide={playerSide}
            />
          ) : undefined
        }
      />

      {/* Event Log */}
      <EventLogDisplay
        events={events}
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
