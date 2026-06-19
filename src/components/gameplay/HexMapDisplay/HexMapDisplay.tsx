import React from 'react';

import { AttackEffectsLayer } from '@/components/gameplay/effects/AttackEffectsLayer';
import { PersistentEffectsLayer } from '@/components/gameplay/effects/PersistentEffectsLayer';
import { FiringArcOverlay } from '@/components/gameplay/overlays/FiringArcOverlay';
import { LineOfSightOverlay } from '@/components/gameplay/overlays/LineOfSightOverlay';
import { TerrainSymbolDefs } from '@/components/gameplay/terrain/TerrainSymbolDefs';
import { GameSide } from '@/types/gameplay';

import type { HexMapDisplayProps } from './HexMapDisplay.types';

import { MapControls } from './HexMapDisplay.controls';
import { IsometricSceneLayer } from './HexMapDisplay.isometricSceneLayer';
import {
  ObjectiveMarkersLayer,
  SensorRingsLayer,
  TerrainOverlayLayers,
  UnitTokensLayer,
} from './HexMapDisplay.layers';
import { isometricSvgCameraControlAttributes } from './HexMapDisplay.projectionControls';
import { useHexMapDisplayState } from './HexMapDisplay.state';
import { MapHtmlOverlays } from './HexMapDisplay.tooltips';
import { TerrainPatternDefs } from './Overlays';

export type { HexMapDisplayProps } from './HexMapDisplay.types';

export function HexMapDisplay(props: HexMapDisplayProps): React.ReactElement {
  const {
    className = '',
    friendlySide = GameSide.Player,
    mpLegend,
    onMovementModeSelect,
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
    isometricTerrainOcclusionInfosByUnit,
    isometricOcclusionUnitIds,
    combatProjectionValidTargetUnitIds,
    combatRangeLookup,
    isometricSceneItems,
    selectedWeaponMaxRange,
    visibleFiringArcs,
    hoveredHex,
    hoverUnreachableReason,
    hoverMovementInfo,
    hoverCombatInfo,
    hoverTerrainInfo,
    hoverProjectionInfo,
    hoverIsometricOccluderInfo,
    tacticalMapProjectionLookup,
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
        // Wheel + touchmove are intentionally NOT bound as React props:
        // React attaches those listeners passively at the root, so
        // `preventDefault()` could never cancel page scrolling. The
        // hook binds non-passive native listeners on this SVG instead
        // (audit 2026-06-09 G, W5.1a — see useMapInteraction).
        onMouseDown={interaction.handleMouseDown}
        onMouseMove={interaction.handleMouseMove}
        onMouseUp={interaction.handleMouseUp}
        onMouseLeave={interaction.handleMouseUp}
        onKeyDown={interaction.handleKeyDown}
        onTouchStart={interaction.handleTouchStart}
        onTouchEnd={interaction.handleTouchEnd}
        tabIndex={0}
        aria-label="Tactical map battlefield"
        {...isometricSvgCameraControlAttributes(isIsometricView)}
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
              occlusionInfosByUnit={isometricTerrainOcclusionInfosByUnit}
              movementAnimationsByUnit={movementAnimationsByUnit}
              events={events}
              tokens={tokens}
              onTokenClick={handleTokenClick}
              onTokenDoubleClick={handleTokenDoubleClick}
              isometricOcclusionUnitIds={isometricOcclusionUnitIds}
              tacticalMapProjectionLookup={tacticalMapProjectionLookup}
              combatProjectionValidTargetUnitIds={
                combatProjectionValidTargetUnitIds
              }
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
                combatProjectionLookup={combatRangeLookup}
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
                combatProjection={hoverCombatInfo}
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
              combatProjectionValidTargetUnitIds={
                combatProjectionValidTargetUnitIds
              }
              isometricOcclusionInfoByUnit={isometricTerrainOcclusionInfoByUnit}
            />
          )}

          <PersistentEffectsLayer tokens={tokens} events={events} />
          <AttackEffectsLayer events={events} tokens={tokens} mapId={mapId} />
          <TerrainOverlayLayers
            interaction={interaction}
            hexes={hexes}
            terrainLookup={terrainLookup}
            tacticalMapProjectionLookup={tacticalMapProjectionLookup}
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
        hoverIsometricOccluderInfo={hoverIsometricOccluderInfo}
        mpLegend={mpLegend}
        onMovementModeSelect={onMovementModeSelect}
      />
      <MapControls interaction={interaction} />
      {overlayChildren}
    </div>
  );
}

export default HexMapDisplay;
