import React from 'react';

import { TokenUnitType } from '@/types/gameplay';
import { coordToKey } from '@/utils/gameplay/hexMath';
import {
  formatTacticalProjectionRuleReferences,
  formatTacticalProjectionSourceReferences,
} from '@/utils/gameplay/tacticalMapProjection';

import type { HexMapDisplayState } from './HexMapDisplay.stateTypes';

import {
  displayPositionForSceneToken,
  formatIsometricSceneHexLabel,
  formatIsometricSceneTokenLabel,
  joinNonEmpty,
} from './HexMapDisplay.isometricSceneLabels';
import { UnitTokensLayer } from './HexMapDisplay.layers';
import { getPrimaryTerrainFeature } from './renderHelpers';

export interface IsometricSceneLayerProps {
  readonly combatProjectionValidTargetUnitIds: HexMapDisplayState['combatProjectionValidTargetUnitIds'];
  readonly events: HexMapDisplayState['events'];
  readonly isometricOcclusionUnitIds: HexMapDisplayState['isometricOcclusionUnitIds'];
  readonly items: HexMapDisplayState['isometricSceneItems'];
  readonly movementAnimationsByUnit: HexMapDisplayState['movementAnimationsByUnit'];
  readonly occlusionInfoByUnit: HexMapDisplayState['isometricTerrainOcclusionInfoByUnit'];
  readonly occlusionInfosByUnit: HexMapDisplayState['isometricTerrainOcclusionInfosByUnit'];
  readonly onTokenClick: HexMapDisplayState['handleTokenClick'];
  readonly onTokenDoubleClick: HexMapDisplayState['handleTokenDoubleClick'];
  readonly renderHexCell: HexMapDisplayState['renderHexCell'];
  readonly tacticalMapProjectionLookup: HexMapDisplayState['tacticalMapProjectionLookup'];
  readonly tokens: HexMapDisplayState['tokens'];
}

export function IsometricSceneLayer({
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
}: IsometricSceneLayerProps): React.ReactElement {
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
