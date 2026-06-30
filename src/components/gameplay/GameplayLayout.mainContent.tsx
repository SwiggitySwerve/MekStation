import React from 'react';

import type { ITacticalLensState } from '@/hooks/gameplay/useTacticalLensState';
import type { InteractivePhase } from '@/stores/useGameplayStore';
import type {
  GameSide,
  IGameEvent,
  IGameSession,
  IHexTerrain,
  ILayoutConfig,
  IMovementRangeHex,
  IUnitGameState,
  IUnitToken,
  IWeaponStatus,
} from '@/types/gameplay';
import type { ITacticalMapProjectionFrame } from '@/utils/gameplay/tacticalMapProjection';

import type { GameplayLayoutControls } from './GameplayLayout.controls';
import type {
  MapMovementKind,
  MapMovementPointLegendState,
} from './HexMapDisplay/HexMapDisplay.types';
import type { MapInteractionState } from './HexMapDisplay/useMapInteraction';
import type { PhysicalAttackIntent } from './PhysicalAttackPanel';

import { DesktopRightTray } from './GameplayLayout.desktopRightTray';
import { GameplayMapPanel } from './GameplayLayout.mapPanel';
import { ShellSlot } from './TacticalCommandShell';
import { TacticalLensControls } from './TacticalLensControls';

export type GameplayLayoutLensState = Pick<
  ITacticalLensState,
  'activeLens' | 'setActiveLens' | 'lensIntensity' | 'setLensIntensity'
>;

export function GameplayMainContentArea({
  containerRef,
  isNarrow,
  lensState,
  layout,
  session,
  tokens,
  visibleEvents,
  selectedUnit,
  hexTerrain,
  tacticalProjectionFrame,
  movementRange,
  activeTargetId,
  unitWeapons,
  selectedWeaponIds,
  playerSide,
  highlightPath,
  hoverMpCost,
  hoverUnreachable,
  mpLegend,
  onMovementModeSelect,
  onHexHover,
  onInteractionReady,
  controls,
  physicalAttackIntent,
  interactivePhase,
  hitChance,
  onStartDragging,
  selectedUnitId,
  localFogPlayerId,
  recordSheetBody,
  maxArmor,
  maxStructure,
  pilotNames,
  heatSinks,
}: {
  readonly containerRef: React.RefObject<HTMLDivElement | null>;
  readonly isNarrow: boolean;
  readonly lensState: GameplayLayoutLensState;
  readonly layout: ILayoutConfig;
  readonly session: IGameSession;
  readonly tokens: readonly IUnitToken[];
  readonly visibleEvents: readonly IGameEvent[];
  readonly selectedUnit: IUnitGameState | null;
  readonly hexTerrain: readonly IHexTerrain[];
  readonly tacticalProjectionFrame: ITacticalMapProjectionFrame;
  readonly movementRange: readonly IMovementRangeHex[];
  readonly activeTargetId: string | null;
  readonly unitWeapons: Record<string, readonly IWeaponStatus[]>;
  readonly selectedWeaponIds?: readonly string[];
  readonly playerSide: GameSide;
  readonly highlightPath: readonly { readonly q: number; readonly r: number }[];
  readonly hoverMpCost: number | undefined;
  readonly hoverUnreachable: boolean;
  readonly mpLegend: MapMovementPointLegendState | undefined;
  readonly onMovementModeSelect: ((mode: MapMovementKind) => void) | undefined;
  readonly onHexHover:
    | ((hex: { readonly q: number; readonly r: number } | null) => void)
    | undefined;
  readonly onInteractionReady: (interaction: MapInteractionState) => void;
  readonly controls: GameplayLayoutControls;
  readonly physicalAttackIntent: PhysicalAttackIntent | null | undefined;
  readonly interactivePhase: InteractivePhase | undefined;
  readonly hitChance: number | null | undefined;
  readonly onStartDragging: () => void;
  readonly selectedUnitId: string | null;
  readonly localFogPlayerId: string;
  readonly recordSheetBody: React.ReactNode;
  readonly maxArmor: Record<string, Record<string, number>>;
  readonly maxStructure: Record<string, Record<string, number>>;
  readonly pilotNames: Record<string, string>;
  readonly heatSinks: Record<string, number>;
}): React.ReactElement {
  return (
    <div
      ref={containerRef}
      className="flex flex-1 overflow-hidden"
      data-testid="gameplay-main-content"
    >
      {!isNarrow && <LeftTray lensState={lensState} />}
      <GameplayMapPanel
        isNarrow={isNarrow}
        mapPanelWidth={layout.mapPanelWidth}
        session={session}
        tokens={tokens}
        visibleEvents={visibleEvents}
        selectedUnit={selectedUnit}
        hexTerrain={hexTerrain}
        tacticalProjectionFrame={tacticalProjectionFrame}
        movementRange={movementRange}
        playerSide={playerSide as GameSide}
        activeTargetId={activeTargetId}
        selectedWeaponIds={selectedWeaponIds}
        unitWeapons={unitWeapons}
        highlightPath={highlightPath}
        hoverMpCost={hoverMpCost ?? undefined}
        hoverUnreachable={hoverUnreachable}
        mpLegend={mpLegend}
        onMovementModeSelect={onMovementModeSelect}
        onHexHover={onHexHover}
        onInteractionReady={onInteractionReady}
        controls={controls}
        physicalAttackIntent={physicalAttackIntent}
        interactivePhase={interactivePhase}
        hitChance={hitChance}
      />
      {!isNarrow && (
        <DesktopSplitTray
          selectedUnitId={selectedUnitId}
          session={session}
          localFogPlayerId={localFogPlayerId}
          playerSide={playerSide}
          mapPanelWidth={layout.mapPanelWidth}
          onStartDragging={onStartDragging}
          recordSheetBody={recordSheetBody}
          maxArmor={maxArmor}
          maxStructure={maxStructure}
          pilotNames={pilotNames}
          unitWeapons={unitWeapons}
          heatSinks={heatSinks}
        />
      )}
    </div>
  );
}

function LeftTray({
  lensState,
}: {
  readonly lensState: GameplayLayoutLensState;
}): React.ReactElement {
  return (
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
  );
}

function DesktopSplitTray({
  selectedUnitId,
  session,
  localFogPlayerId,
  playerSide,
  mapPanelWidth,
  onStartDragging,
  recordSheetBody,
  maxArmor,
  maxStructure,
  pilotNames,
  unitWeapons,
  heatSinks,
}: {
  readonly selectedUnitId: string | null;
  readonly session: IGameSession;
  readonly localFogPlayerId: string;
  readonly playerSide: GameSide;
  readonly mapPanelWidth: number;
  readonly onStartDragging: () => void;
  readonly recordSheetBody: React.ReactNode;
  readonly maxArmor: Record<string, Record<string, number>>;
  readonly maxStructure: Record<string, Record<string, number>>;
  readonly pilotNames: Record<string, string>;
  readonly unitWeapons: Record<string, readonly IWeaponStatus[]>;
  readonly heatSinks: Record<string, number>;
}): React.ReactElement {
  return (
    <>
      <div
        className="w-1 cursor-col-resize bg-gray-300 transition-colors hover:bg-blue-400"
        onMouseDown={onStartDragging}
        data-testid="resize-handle"
      />
      <DesktopRightTray
        selectedUnitId={selectedUnitId}
        session={session}
        viewerPlayerId={localFogPlayerId}
        viewerSide={playerSide}
        mapPanelWidth={mapPanelWidth}
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
  );
}
