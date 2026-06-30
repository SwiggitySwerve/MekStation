import React from 'react';

import type { InteractivePhase } from '@/stores/useGameplayStore';
import type {
  GameSide,
  IGameEvent,
  IGameSession,
  IHexTerrain,
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

import { HitChancePanel, MapOverlayChildren } from './GameplayLayout.sections';
import { HexMapDisplay } from './HexMapDisplay';
import { PhysicalAttackIntentArrow } from './overlays/PhysicalAttackIntentArrow';
import { ShellSlot } from './TacticalCommandShell';

export function GameplayMapPanel({
  isNarrow,
  mapPanelWidth,
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
}: {
  readonly isNarrow: boolean;
  readonly mapPanelWidth: number;
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
}): React.ReactElement {
  return (
    <ShellSlot id="map-center" ownerId="HexMapDisplay">
      <div
        className="relative"
        style={{ width: isNarrow ? '100%' : `${mapPanelWidth}%` }}
        data-testid="map-panel"
      >
        <HexMapDisplay
          radius={session.config.mapRadius}
          tokens={tokens}
          mapId={session.id}
          events={visibleEvents}
          selectedHex={selectedUnit?.position || null}
          hexTerrain={hexTerrain}
          tacticalProjectionFrame={tacticalProjectionFrame}
          movementRange={movementRange}
          targetUnitId={activeTargetId}
          unitWeapons={unitWeapons}
          selectedWeaponIds={selectedWeaponIds}
          combatState={session.currentState}
          friendlySide={playerSide}
          highlightPath={highlightPath}
          hoverMpCost={hoverMpCost}
          hoverUnreachable={hoverUnreachable}
          mpLegend={mpLegend}
          onMovementModeSelect={onMovementModeSelect}
          onHexClick={controls.handleHexClick}
          onHexHover={onHexHover}
          onTokenClick={controls.handleTokenClick}
          onTokenDoubleClick={controls.handleTokenDoubleClick}
          onInteractionReady={onInteractionReady}
          svgOverlayChildren={
            physicalAttackIntent ? (
              <PhysicalAttackIntentArrow
                {...physicalAttackIntent}
                side={selectedUnit?.side ?? playerSide}
                testId="physical-attack-intent-arrow"
              />
            ) : null
          }
          overlayChildren={
            <MapOverlayChildren
              mapRadius={session.config.mapRadius}
              tokens={tokens}
              camera={{ zoom: controls.camera.zoom, pan: controls.camera.pan }}
              onCenterAt={controls.handleMinimapCenterAt}
              onDragPan={controls.handleMinimapDragPan}
              minimapVisible={controls.minimapVisible}
              helpOpen={controls.helpOpen}
              onCloseHelp={controls.handleCloseHelp}
            />
          }
          className="h-full"
        />
        {interactivePhase && <HitChancePanel hitChance={hitChance} />}
      </div>
    </ShellSlot>
  );
}
