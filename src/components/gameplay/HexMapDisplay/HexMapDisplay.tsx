import React from 'react';

import { AttackEffectsLayer } from '@/components/gameplay/effects/AttackEffectsLayer';
import { PersistentEffectsLayer } from '@/components/gameplay/effects/PersistentEffectsLayer';
import { FiringArcOverlay } from '@/components/gameplay/overlays/FiringArcOverlay';
import { LineOfSightOverlay } from '@/components/gameplay/overlays/LineOfSightOverlay';
import { TerrainSymbolDefs } from '@/components/gameplay/terrain/TerrainSymbolDefs';
import { GameSide, TokenUnitType } from '@/types/gameplay';
import { coordToKey } from '@/utils/gameplay/hexMath';
import {
  formatTacticalProjectionRuleReferences,
  formatTacticalProjectionSourceReferences,
} from '@/utils/gameplay/tacticalMapProjection';

import type { HexMapDisplayProps } from './HexMapDisplay.types';

import { MapControls } from './HexMapDisplay.controls';
import {
  displayPositionForSceneToken,
  formatIsometricSceneHexLabel,
  formatIsometricSceneTokenLabel,
  joinNonEmpty,
} from './HexMapDisplay.isometricSceneLabels';
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
import { getPrimaryTerrainFeature } from './renderHelpers';

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
        onWheel={interaction.handleWheel}
        onMouseDown={interaction.handleMouseDown}
        onMouseMove={interaction.handleMouseMove}
        onMouseUp={interaction.handleMouseUp}
        onMouseLeave={interaction.handleMouseUp}
        onKeyDown={interaction.handleKeyDown}
        onTouchStart={interaction.handleTouchStart}
        onTouchMove={interaction.handleTouchMove}
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

function IsometricSceneLayer({
  items,
  renderHexCell,
  occlusionInfoByUnit,
  occlusionInfosByUnit,
  movementAnimationsByUnit,
  events,
  tokens,
  onTokenClick,
  onTokenDoubleClick,
  isometricOcclusionUnitIds,
  tacticalMapProjectionLookup,
  combatProjectionValidTargetUnitIds,
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
  readonly occlusionInfosByUnit: ReturnType<
    typeof useHexMapDisplayState
  >['isometricTerrainOcclusionInfosByUnit'];
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
  readonly tacticalMapProjectionLookup: ReturnType<
    typeof useHexMapDisplayState
  >['tacticalMapProjectionLookup'];
  readonly combatProjectionValidTargetUnitIds: ReturnType<
    typeof useHexMapDisplayState
  >['combatProjectionValidTargetUnitIds'];
}): React.ReactElement {
  return (
    <g data-testid="isometric-scene-layer">
      {items.map((item) => {
        if (item.kind === 'hex') {
          const projectionKey = coordToKey(item.hex);
          const projection = tacticalMapProjectionLookup.get(projectionKey);
          const primaryTerrain = getPrimaryTerrainFeature(projection?.terrain);
          const sceneHexLabel = formatIsometricSceneHexLabel(
            item.hex,
            projection,
          );
          return (
            <g
              key={item.key}
              data-testid={`isometric-scene-hex-${item.hex.q}-${item.hex.r}`}
              data-isometric-depth-key={item.depthKey}
              data-isometric-hex-map-position={projectionKey}
              data-isometric-hex-elevation={projection?.terrain.elevation}
              data-isometric-hex-terrain-primary={primaryTerrain?.type}
              data-isometric-hex-projection-intent={projection?.intent}
              data-isometric-hex-projection-status={projection?.status}
              data-isometric-hex-movement-status={projection?.movementStatus}
              data-isometric-hex-combat-status={projection?.combatStatus}
              data-isometric-hex-blocked-reasons={joinNonEmpty(
                projection?.blockedReasons,
              )}
              data-isometric-hex-sources={
                projection
                  ? formatTacticalProjectionSourceReferences(
                      projection.sourceReferences,
                    )
                  : undefined
              }
              data-isometric-hex-rule-refs={
                projection
                  ? formatTacticalProjectionRuleReferences(
                      projection.sourceReferences,
                    )
                  : undefined
              }
              data-isometric-hex-projection-explanation={
                projection?.explanation
              }
              aria-label={sceneHexLabel}
            >
              {sceneHexLabel && <title>{sceneHexLabel}</title>}
              {renderHexCell(item.hex)}
            </g>
          );
        }

        const occlusionInfo = occlusionInfoByUnit.get(item.token.unitId);
        const occlusionInfos =
          occlusionInfosByUnit.get(item.token.unitId) ?? [];
        const displayPosition = displayPositionForSceneToken(item.token);
        const projectedTargetState =
          combatProjectionValidTargetUnitIds === undefined
            ? undefined
            : combatProjectionValidTargetUnitIds.has(item.token.unitId);
        const sceneTokenLabel = formatIsometricSceneTokenLabel({
          token: item.token,
          displayPosition,
          occlusionInfo,
          occlusionInfos,
          foregroundBoost: item.foregroundBoost,
          combatProjectionValidTarget: projectedTargetState,
        });
        return (
          <g
            key={item.key}
            data-testid={`isometric-scene-token-${item.token.unitId}`}
            data-isometric-depth-key={item.depthKey}
            data-isometric-foreground-boost={
              item.foregroundBoost ? 'true' : undefined
            }
            data-isometric-occlusion-reason={occlusionInfo?.reason}
            data-isometric-occlusion-reasons={joinNonEmpty(
              occlusionInfos.map((info) => info.reason),
            )}
            data-isometric-occlusion-rotation-step={occlusionInfo?.rotationStep}
            data-isometric-occlusion-rotation-steps={joinNonEmpty(
              occlusionInfos.map((info) => `${info.rotationStep}`),
            )}
            data-isometric-occluder-hex={
              occlusionInfo ? coordToKey(occlusionInfo.occluderHex) : undefined
            }
            data-isometric-occluder-hexes={joinNonEmpty(
              occlusionInfos.map((info) => coordToKey(info.occluderHex)),
            )}
            data-isometric-occluder-elevation={occlusionInfo?.occluderElevation}
            data-isometric-occluder-elevations={joinNonEmpty(
              occlusionInfos.map((info) => `${info.occluderElevation}`),
            )}
            data-isometric-occluder-count={
              occlusionInfos.length > 0 ? occlusionInfos.length : undefined
            }
            data-isometric-token-unit-type={item.token.unitType}
            data-isometric-token-map-position={coordToKey(displayPosition)}
            data-isometric-token-source-position={coordToKey(
              item.token.position,
            )}
            data-isometric-token-facing={item.token.facing}
            data-isometric-vehicle-motion-type={
              item.token.unitType === TokenUnitType.Vehicle
                ? item.token.vehicleMotionType
                : undefined
            }
            data-isometric-vehicle-altitude={
              item.token.unitType === TokenUnitType.Vehicle
                ? item.token.altitude
                : undefined
            }
            data-isometric-aerospace-altitude={
              item.token.unitType === TokenUnitType.Aerospace
                ? item.token.altitude
                : undefined
            }
            data-isometric-aerospace-velocity={
              item.token.unitType === TokenUnitType.Aerospace
                ? item.token.velocity
                : undefined
            }
            aria-label={sceneTokenLabel}
          >
            <title>{sceneTokenLabel}</title>
            <UnitTokensLayer
              orderedTokens={[item.token]}
              movementAnimationsByUnit={movementAnimationsByUnit}
              events={events}
              tokens={tokens}
              onTokenClick={onTokenClick}
              onTokenDoubleClick={onTokenDoubleClick}
              isIsometricView
              isometricOcclusionUnitIds={isometricOcclusionUnitIds}
              combatProjectionValidTargetUnitIds={
                combatProjectionValidTargetUnitIds
              }
              isometricOcclusionInfoByUnit={occlusionInfoByUnit}
              isometricOcclusionInfosByUnit={occlusionInfosByUnit}
            />
          </g>
        );
      })}
    </g>
  );
}

export default HexMapDisplay;
