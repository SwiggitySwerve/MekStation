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
import type { IntentComposerMapProps } from './GameplayLayout.types';
import type {
  MapMovementKind,
  MapMovementPointLegendState,
} from './HexMapDisplay/HexMapDisplay.types';
import type { MapInteractionState } from './HexMapDisplay/useMapInteraction';
import type { PhysicalAttackIntent } from './PhysicalAttackPanel';

import { HitChancePanel, MapOverlayChildren } from './GameplayLayout.sections';
import { HexMapDisplay } from './HexMapDisplay';
import { FacingPickerOverlay } from './overlays/FacingPickerOverlay';
import { PhysicalAttackIntentArrow } from './overlays/PhysicalAttackIntentArrow';
import { WaypointLayer } from './overlays/WaypointLayer';
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
  intentComposer,
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
  readonly intentComposer: IntentComposerMapProps | undefined;
  readonly onInteractionReady: (interaction: MapInteractionState) => void;
  readonly controls: GameplayLayoutControls;
  readonly physicalAttackIntent: PhysicalAttackIntent | null | undefined;
  readonly interactivePhase: InteractivePhase | undefined;
  readonly hitChance: number | null | undefined;
}): React.ReactElement {
  const composerActive = Boolean(intentComposer?.composerActive);
  const composedLegs = intentComposer?.composedLegs ?? [];
  return (
    <ShellSlot id="map-center" ownerId="HexMapDisplay">
      <div
        className="relative flex-shrink-0"
        style={{ width: isNarrow ? '100%' : `${mapPanelWidth}%` }}
        data-testid="map-panel"
        data-map-panel-width={mapPanelWidth}
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
          // Single Movement Authority: when the composer owns the HUD the in-map
          // MP legend is a NON-INTERACTIVE readout — the composer is the sole
          // movement selector, so we withhold the mode-select callback (the
          // legend then renders its swatches with no clickable affordance).
          onMovementModeSelect={
            composerActive ? undefined : onMovementModeSelect
          }
          onHexClick={controls.handleHexClick}
          onHexHover={onHexHover}
          onTokenClick={controls.handleTokenClick}
          onTokenDoubleClick={controls.handleTokenDoubleClick}
          onInteractionReady={onInteractionReady}
          svgOverlayChildren={
            <>
              {physicalAttackIntent ? (
                <PhysicalAttackIntentArrow
                  {...physicalAttackIntent}
                  side={selectedUnit?.side ?? playerSide}
                  testId="physical-attack-intent-arrow"
                />
              ) : null}
              {composerActive && composedLegs.length > 0 && (
                <WaypointLayer
                  legs={composedLegs}
                  zoom={controls.camera.zoom}
                  onPopLastWaypoint={intentComposer?.onPopLastWaypoint}
                />
              )}
            </>
          }
          overlayChildren={
            <>
              <MapOverlayChildren
                mapRadius={session.config.mapRadius}
                tokens={tokens}
                camera={{
                  zoom: controls.camera.zoom,
                  pan: controls.camera.pan,
                }}
                onCenterAt={controls.handleMinimapCenterAt}
                onDragPan={controls.handleMinimapDragPan}
                minimapVisible={controls.minimapVisible}
                helpOpen={controls.helpOpen}
                onCloseHelp={controls.handleCloseHelp}
              />
              {composerActive && intentComposer?.lastWaypointHex && (
                <FacingPickerOverlay
                  anchorHex={intentComposer.lastWaypointHex}
                  onSelect={intentComposer.onFacingSelect}
                />
              )}
            </>
          }
          className="h-full"
        />
        {interactivePhase && <HitChancePanel hitChance={hitChance} />}
      </div>
    </ShellSlot>
  );
}
