import React, { useCallback, useEffect, useState } from 'react';

import type {
  IGameEvent,
  IGameUnit,
  IUnitGameState,
  IPilotSpaSummary,
  IWeaponStatus,
} from '@/types/gameplay';

import { DEFAULT_MAP_LAYER_STATE } from '@/types/gameplay';
import { mergeLiveAmmoIntoWeaponStatuses } from '@/utils/gameplay/weaponAmmoDisplay';

import type { MapInteractionState } from './HexMapDisplay/useMapInteraction';

import { ConcedeButton } from './ConcedeButton';
import { HotkeyHelpOverlay, HotkeyHintBadge } from './help/HotkeyHelpOverlay';
import { Minimap } from './minimap/Minimap';
import { RecordSheetDisplay } from './RecordSheetDisplay';
import { WithdrawControl } from './WithdrawControl';

export const noopInteraction: MapInteractionState = {
  svgRef: { current: null },
  transformedViewBox: '0 0 0 0',
  viewBox: { x: 0, y: 0, width: 0, height: 0 },
  zoom: 1,
  pan: { x: 0, y: 0 },
  setZoom: () => {},
  setPan: () => {},
  projectionMode: 'topDown',
  setProjectionMode: () => {},
  isometricRotationStep: 0,
  setIsometricRotationStep: () => {},
  rotateIsometricLeft: () => {},
  rotateIsometricRight: () => {},
  layerState: DEFAULT_MAP_LAYER_STATE,
  setLayerVisibility: () => {},
  showMovementOverlay: false,
  setShowMovementOverlay: () => {},
  showElevationBadges: true,
  setShowElevationBadges: () => {},
  showCoverOverlay: false,
  setShowCoverOverlay: () => {},
  showFiringArcOverlay: true,
  setShowFiringArcOverlay: () => {},
  showLOSOverlay: false,
  setShowLOSOverlay: () => {},
  panBy: () => {},
  zoomTo: () => {},
  centerOn: () => {},
  handleWheel: () => {},
  handleMouseDown: () => {},
  handleMouseMove: () => {},
  handleMouseUp: () => {},
  handleKeyDown: () => {},
  handleTouchStart: () => {},
  handleTouchMove: () => {},
  handleTouchEnd: () => {},
};

export function useResponsiveRecordSheet(): {
  readonly isNarrow: boolean;
  readonly drawerOpen: boolean;
  readonly handleToggleDrawer: () => void;
} {
  const [isNarrow, setIsNarrow] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.innerWidth < 1024;
  });
  const [drawerOpen, setDrawerOpen] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(max-width: 1023.98px)');
    const update = () => setIsNarrow(mq.matches);
    update();
    if (typeof mq.addEventListener === 'function') {
      mq.addEventListener('change', update);
      return () => mq.removeEventListener('change', update);
    }
    const legacy = mq as MediaQueryList & {
      addListener?: (cb: () => void) => void;
      removeListener?: (cb: () => void) => void;
    };
    legacy.addListener?.(update);
    return () => legacy.removeListener?.(update);
  }, []);

  useEffect(() => {
    if (!isNarrow) setDrawerOpen(false);
  }, [isNarrow]);

  const handleToggleDrawer = useCallback(() => {
    setDrawerOpen((open) => !open);
  }, []);

  return { isNarrow, drawerOpen, handleToggleDrawer };
}

interface MapOverlayChildrenProps {
  readonly mapRadius: number;
  readonly tokens: Parameters<typeof Minimap>[0]['tokens'];
  readonly camera: {
    readonly zoom: number;
    readonly pan: { readonly x: number; readonly y: number };
  };
  readonly onCenterAt: (world: { x: number; y: number }) => void;
  readonly onDragPan: (worldDelta: { x: number; y: number }) => void;
  readonly minimapVisible: boolean;
  readonly helpOpen: boolean;
  readonly onCloseHelp: () => void;
}

export function MapOverlayChildren({
  mapRadius,
  tokens,
  camera,
  onCenterAt,
  onDragPan,
  minimapVisible,
  helpOpen,
  onCloseHelp,
}: MapOverlayChildrenProps): React.ReactElement {
  return (
    <>
      <Minimap
        radius={mapRadius}
        tokens={tokens}
        camera={camera}
        onCenterAt={onCenterAt}
        onDragPan={onDragPan}
        visible={minimapVisible}
      />
      <HotkeyHelpOverlay open={helpOpen} onClose={onCloseHelp} />
      <HotkeyHintBadge />
    </>
  );
}

interface RecordSheetBodyProps {
  readonly selectedUnitId: string | null;
  readonly selectedUnit: IUnitGameState | null;
  readonly selectedUnitInfo: {
    readonly name: string;
    readonly side: unknown;
  } | null;
  readonly selectedUnitFromSession: IGameUnit | null;
  readonly maxArmor: Record<string, Record<string, number>>;
  readonly maxStructure: Record<string, Record<string, number>>;
  readonly unitWeapons: Record<string, readonly IWeaponStatus[]>;
  readonly pilotNames: Record<string, string>;
  readonly heatSinks: Record<string, number>;
  readonly unitSpas: Record<string, readonly IPilotSpaSummary[]>;
  readonly visibleEvents: readonly IGameEvent[];
}

export function RecordSheetBody({
  selectedUnitId,
  selectedUnit,
  selectedUnitInfo,
  selectedUnitFromSession,
  maxArmor,
  maxStructure,
  unitWeapons,
  pilotNames,
  heatSinks,
  unitSpas,
  visibleEvents,
}: RecordSheetBodyProps): React.ReactElement {
  if (!selectedUnit || !selectedUnitInfo || !selectedUnitFromSession) {
    return (
      <div
        className="flex h-full items-center justify-center text-gray-500"
        data-testid="no-unit-selected"
      >
        <p>Select a unit to view its status</p>
      </div>
    );
  }

  const unitId = selectedUnitId ?? '';
  return (
    <RecordSheetDisplay
      unitName={selectedUnitInfo.name}
      designation={selectedUnitFromSession.unitRef}
      state={selectedUnit}
      maxArmor={maxArmor[unitId] || {}}
      maxStructure={maxStructure[unitId] || {}}
      // Live ammo counters: the unitWeapons map is an adoption-time snapshot
      // (deriveSupplementalDisplayData deliberately omits ammo), so merge the
      // selected unit's LIVE ammo state here — the row re-renders with the
      // session, keeping N/M rds in step with consumption.
      weapons={mergeLiveAmmoIntoWeaponStatuses(
        unitWeapons[unitId] || [],
        selectedUnit,
      )}
      pilotName={pilotNames[unitId] || 'Unknown Pilot'}
      gunnery={selectedUnitFromSession.gunnery}
      piloting={selectedUnitFromSession.piloting}
      heatSinks={heatSinks[unitId] || 10}
      side={selectedUnitInfo.side as never}
      chassis={selectedUnitInfo.name}
      spas={selectedUnitId ? (unitSpas[selectedUnitId] ?? []) : []}
      unitId={selectedUnitId ?? undefined}
      events={visibleEvents}
      className="h-full"
    />
  );
}

interface RecordSheetDrawerProps {
  readonly open: boolean;
  readonly onToggle: () => void;
  readonly children: React.ReactNode;
}

export function RecordSheetDrawer({
  open,
  onToggle,
  children,
}: RecordSheetDrawerProps): React.ReactElement | null {
  if (!open) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-30 bg-black/40"
        onClick={onToggle}
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
            onClick={onToggle}
            className="rounded px-2 py-1 text-sm text-gray-600 hover:bg-gray-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-500"
            data-testid="record-sheet-drawer-close"
            aria-label="Close record sheet"
          >
            Close
          </button>
        </div>
        <div className="flex-1 overflow-hidden">{children}</div>
      </aside>
    </>
  );
}

interface HitChancePanelProps {
  readonly hitChance: number | null | undefined;
}

export function HitChancePanel({
  hitChance,
}: HitChancePanelProps): React.ReactElement | null {
  if (hitChance === undefined || hitChance === null) return null;

  return (
    <div
      className="absolute bottom-4 left-4 rounded-lg bg-gray-900/90 px-4 py-3 text-white shadow-lg"
      data-testid="hit-chance-panel"
    >
      <div className="text-xs tracking-wider text-gray-400 uppercase">
        Hit Chance
      </div>
      <div className="text-2xl font-bold text-amber-400">{hitChance}%</div>
    </div>
  );
}

/**
 * Props for `WithdrawalTrailingActions` — the action-bar trailing slot
 * holding the per-unit withdraw control plus the always-visible
 * concede button.
 *
 * @spec openspec/changes/add-combat-morale-and-withdrawal/tasks.md § 4.1
 */
export interface WithdrawalTrailingActionsProps {
  /** Live engine session — provides `declareWithdrawal` + `concede`. */
  readonly interactiveSession: import('@/engine/InteractiveSession').InteractiveSession;
  /** Session id used to build the post-battle / victory route. */
  readonly sessionId: string;
  /** Side this UI player controls. */
  readonly playerSide: import('@/types/gameplay').GameSide;
  /** Currently selected unit, or `null` / `undefined` when none. */
  readonly selectedUnit: IUnitGameState | null | undefined;
  /** Whether it is the player's turn to act. */
  readonly isPlayerTurn: boolean;
}

/**
 * Per `add-combat-morale-and-withdrawal` § 4.1: the action-bar trailing
 * actions. Renders the withdraw control for the player's selected,
 * still-in-play unit alongside the concede button. Extracted into the
 * sections module so `GameplayLayout` stays under the file-size cap.
 */
export function WithdrawalTrailingActions({
  interactiveSession,
  sessionId,
  playerSide,
  selectedUnit,
  isPlayerTurn,
}: WithdrawalTrailingActionsProps): React.ReactElement {
  const showWithdraw =
    selectedUnit != null &&
    selectedUnit.side === playerSide &&
    !selectedUnit.destroyed &&
    !selectedUnit.hasRetreated;

  return (
    <div className="flex items-center gap-2">
      {showWithdraw && (
        <WithdrawControl
          unitId={selectedUnit.id}
          isWithdrawing={Boolean(selectedUnit.isWithdrawing)}
          enabled={isPlayerTurn}
          onDeclareWithdrawal={(unitId, edge) => {
            interactiveSession.declareWithdrawal(unitId, edge);
          }}
        />
      )}
      <ConcedeButton
        interactiveSession={interactiveSession}
        sessionId={sessionId}
        playerSide={playerSide}
      />
    </div>
  );
}
