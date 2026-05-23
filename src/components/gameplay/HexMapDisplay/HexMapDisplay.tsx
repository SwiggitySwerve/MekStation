import React from 'react';

import { AttackEffectsLayer } from '@/components/gameplay/effects/AttackEffectsLayer';
import { PersistentEffectsLayer } from '@/components/gameplay/effects/PersistentEffectsLayer';
import { FiringArcOverlay } from '@/components/gameplay/overlays/FiringArcOverlay';
import { LineOfSightOverlay } from '@/components/gameplay/overlays/LineOfSightOverlay';
import { TerrainSymbolDefs } from '@/components/gameplay/terrain/TerrainSymbolDefs';
import { GameSide } from '@/types/gameplay';
import { coordToKey } from '@/utils/gameplay/hexMath';

import type { HexMapDisplayProps } from './HexMapDisplay.types';

import { MapControls } from './HexMapDisplay.controls';
import {
  ObjectiveMarkersLayer,
  SensorRingsLayer,
  TerrainOverlayLayers,
  UnitTokensLayer,
} from './HexMapDisplay.layers';
import { useHexMapDisplayState } from './HexMapDisplay.state';
import { MapHtmlOverlays } from './HexMapDisplay.tooltips';
import { TerrainPatternDefs } from './Overlays';

export type { HexMapDisplayProps } from './HexMapDisplay.types';

export function HexMapDisplay(props: HexMapDisplayProps): React.ReactElement {
  const {
    className = '',
    friendlySide = GameSide.Player,
    mpLegend,
    objectives,
    overlayChildren,
    svgOverlayChildren,
  } = props;
  const {
    mapId,
    tokens,
    events,
    screenShake,
    interaction,
    projectionTransform,
    isIsometricView,
    hexes,
    renderedHexes,
    terrainLookup,
    hexGrid,
    selectedToken,
    selectedUnitPosition,
    movementAnimationsByUnit,
    orderedTokens,
    hasActiveMovementAnimation,
    isometricTerrainOcclusionInfoByUnit,
    isometricOcclusionUnitIds,
    isometricSceneItems,
    selectedWeaponMaxRange,
    visibleFiringArcs,
    hoveredHex,
    hoverUnreachableReason,
    hoverMovementInfo,
    hoverCombatInfo,
    hoverTerrainInfo,
    hoverProjectionInfo,
    renderHexCell,
    handleTokenClick,
    handleTokenDoubleClick,
  } = useHexMapDisplayState(props);

  return (
    <div
      className={`relative overflow-hidden bg-slate-100 ${className}`}
      data-testid="hex-map-container"
      data-screen-shake-active={screenShake.isShaking ? 'true' : undefined}
      data-screen-shake-transform={screenShake.transform}
      style={screenShake.style}
    >
      <svg
        ref={interaction.svgRef}
        viewBox={interaction.transformedViewBox}
        className="h-full w-full touch-manipulation"
        onWheel={interaction.handleWheel}
        onMouseDown={interaction.handleMouseDown}
        onMouseMove={interaction.handleMouseMove}
        onMouseUp={interaction.handleMouseUp}
        onMouseLeave={interaction.handleMouseUp}
        onTouchStart={interaction.handleTouchStart}
        onTouchMove={interaction.handleTouchMove}
        onTouchEnd={interaction.handleTouchEnd}
        data-testid="hex-grid"
      >
        <TerrainPatternDefs />
        <defs>
          <TerrainSymbolDefs />
        </defs>
        <g
          data-testid="map-projection-layer"
          data-projection-mode={interaction.projectionMode}
          data-isometric-rotation-step={interaction.isometricRotationStep}
          transform={projectionTransform}
        >
          {isIsometricView ? (
            <IsometricSceneLayer
              items={isometricSceneItems}
              renderHexCell={renderHexCell}
              occlusionInfoByUnit={isometricTerrainOcclusionInfoByUnit}
              movementAnimationsByUnit={movementAnimationsByUnit}
              events={events}
              tokens={tokens}
              onTokenClick={handleTokenClick}
              onTokenDoubleClick={handleTokenDoubleClick}
              isometricOcclusionUnitIds={isometricOcclusionUnitIds}
            />
          ) : (
            <g>{renderedHexes.map(renderHexCell)}</g>
          )}

          {interaction.showFiringArcOverlay &&
            selectedToken &&
            selectedToken.side === friendlySide &&
            !hasActiveMovementAnimation && (
              <FiringArcOverlay
                unit={{
                  coord: selectedToken.position,
                  facing: selectedToken.facing,
                  unitId: selectedToken.unitId,
                }}
                hexes={hexes}
                maxRange={selectedWeaponMaxRange}
                visibleArcs={visibleFiringArcs}
                enabled
                testId="firing-arc-overlay"
              />
            )}

          {interaction.showLOSOverlay &&
            selectedUnitPosition &&
            hoveredHex &&
            !hasActiveMovementAnimation && (
              <LineOfSightOverlay
                origin={selectedUnitPosition}
                target={hoveredHex}
                grid={hexGrid}
                tokens={tokens}
                testId="los-overlay"
              />
            )}

          {svgOverlayChildren}

          {objectives && Object.keys(objectives).length > 0 && (
            <ObjectiveMarkersLayer
              objectives={objectives}
              tokens={tokens}
              friendlySide={friendlySide}
            />
          )}

          <SensorRingsLayer orderedTokens={orderedTokens} />

          {!isIsometricView && (
            <UnitTokensLayer
              orderedTokens={orderedTokens}
              movementAnimationsByUnit={movementAnimationsByUnit}
              events={events}
              tokens={tokens}
              onTokenClick={handleTokenClick}
              onTokenDoubleClick={handleTokenDoubleClick}
              isIsometricView={isIsometricView}
              isometricOcclusionUnitIds={isometricOcclusionUnitIds}
              isometricOcclusionInfoByUnit={isometricTerrainOcclusionInfoByUnit}
            />
          )}

          <PersistentEffectsLayer tokens={tokens} events={events} />
          <AttackEffectsLayer events={events} tokens={tokens} mapId={mapId} />
          <TerrainOverlayLayers
            interaction={interaction}
            hexes={hexes}
            terrainLookup={terrainLookup}
          />
        </g>
      </svg>

      <div className="sr-only" aria-live="polite">
        {screenShake.liveMessage}
      </div>
      <MapHtmlOverlays
        hoverUnreachable={props.hoverUnreachable ?? false}
        hoverUnreachableReason={hoverUnreachableReason}
        hoverMovementInfo={hoverMovementInfo}
        hoverCombatInfo={hoverCombatInfo}
        hoverTerrainInfo={hoverTerrainInfo}
        hoverProjectionInfo={hoverProjectionInfo}
        mpLegend={mpLegend}
      />
      <MapControls interaction={interaction} />
      {overlayChildren}
    </div>
  );
}

function IsometricSceneLayer({
  items,
  renderHexCell,
  occlusionInfoByUnit,
  movementAnimationsByUnit,
  events,
  tokens,
  onTokenClick,
  onTokenDoubleClick,
  isometricOcclusionUnitIds,
}: {
  readonly items: ReturnType<
    typeof useHexMapDisplayState
  >['isometricSceneItems'];
  readonly renderHexCell: ReturnType<
    typeof useHexMapDisplayState
  >['renderHexCell'];
  readonly occlusionInfoByUnit: ReturnType<
    typeof useHexMapDisplayState
  >['isometricTerrainOcclusionInfoByUnit'];
  readonly movementAnimationsByUnit: ReturnType<
    typeof useHexMapDisplayState
  >['movementAnimationsByUnit'];
  readonly events: ReturnType<typeof useHexMapDisplayState>['events'];
  readonly tokens: ReturnType<typeof useHexMapDisplayState>['tokens'];
  readonly onTokenClick: ReturnType<
    typeof useHexMapDisplayState
  >['handleTokenClick'];
  readonly onTokenDoubleClick: ReturnType<
    typeof useHexMapDisplayState
  >['handleTokenDoubleClick'];
  readonly isometricOcclusionUnitIds: ReturnType<
    typeof useHexMapDisplayState
  >['isometricOcclusionUnitIds'];
}): React.ReactElement {
  return (
    <g data-testid="isometric-scene-layer">
      {items.map((item) => {
        if (item.kind === 'hex') {
          return (
            <g
              key={item.key}
              data-testid={`isometric-scene-hex-${item.hex.q}-${item.hex.r}`}
              data-isometric-depth-key={item.depthKey}
            >
              {renderHexCell(item.hex)}
            </g>
          );
        }

        const occlusionInfo = occlusionInfoByUnit.get(item.token.unitId);
        return (
          <g
            key={item.key}
            data-testid={`isometric-scene-token-${item.token.unitId}`}
            data-isometric-depth-key={item.depthKey}
            data-isometric-foreground-boost={
              item.foregroundBoost ? 'true' : undefined
            }
            data-isometric-occlusion-reason={occlusionInfo?.reason}
            data-isometric-occluder-hex={
              occlusionInfo ? coordToKey(occlusionInfo.occluderHex) : undefined
            }
            data-isometric-occluder-elevation={occlusionInfo?.occluderElevation}
          >
            <UnitTokensLayer
              orderedTokens={[item.token]}
              movementAnimationsByUnit={movementAnimationsByUnit}
              events={events}
              tokens={tokens}
              onTokenClick={onTokenClick}
              onTokenDoubleClick={onTokenDoubleClick}
              isIsometricView
              isometricOcclusionUnitIds={isometricOcclusionUnitIds}
              isometricOcclusionInfoByUnit={occlusionInfoByUnit}
            />
          </g>
        );
      })}
    </g>
  );
}

export default HexMapDisplay;
